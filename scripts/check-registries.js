#!/usr/bin/env node
// Сверка РУЧНЫХ реестров проекта с реальностью (из корня: node scripts/check-registries.js).
// Работает по исходникам, mdbook build не нужен.
//
// В проекте несколько списков, которые ведутся руками и обязаны совпадать с тем,
// что есть на самом деле. Забыть их — не «сломать сборку», а тихо ухудшить книгу:
// трекер перестаёт считать реальные главы, виджет молча не находит пакет,
// «🎞 Визуализировать» отвечает 403. Именно так трекер прогресса однажды и отстал
// от книги на 19 глав. Проверяем пять связей:
//
//  1) assets/progress.js  <-> src/SUMMARY.md      — трекер знает все главы книги;
//  2) exercises/README.md <-> exercises/*/        — таблица пакетов полна;
//  3) data-trace-calls в главах <-> traceTargets  — бэкенд разрешает то, что предлагает глава;
//  4) data-pkg у algo-runner   <-> exercises/*/   — виджет ссылается на существующий пакет;
//  5) число пакетов в CLAUDE.md <-> exercises/*/  — счётчик в документации не протух.
"use strict";
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const srcDir = path.join(root, "src");
const exDir = path.join(root, "exercises");
const errors = [];

const read = (p) => fs.readFileSync(p, "utf8");
const chapterFiles = fs
  .readdirSync(srcDir)
  .filter((f) => f.endsWith(".md") && f !== "SUMMARY.md");

// Страницы книги, которых в трекере намеренно нет: точка входа, справочник и
// страница повторений — их не «проходят» главу за главой (страница повторений
// вообще про уже пройденное).
const TRACKER_EXEMPT = new Set(["README", "glossary", "review", "mixed"]);

// ---------- 1. трекер прогресса <-> оглавление ----------
const summary = read(path.join(srcDir, "SUMMARY.md"));
const summaryChapters = [...summary.matchAll(/\]\(([\w-]+)\.md\)/g)].map((m) => m[1]);
const progressJs = read(path.join(root, "assets", "progress.js"));
const trackerChapters = new Set(
  [...progressJs.matchAll(/h:\s*"([\w-]+)\.html"/g)].map((m) => m[1])
);

for (const ch of summaryChapters) {
  if (TRACKER_EXEMPT.has(ch)) continue;
  if (!trackerChapters.has(ch)) {
    errors.push(
      `трекер прогресса: главы «${ch}» нет в GROUPS (assets/progress.js) — ` +
        `«100%» в трекере перестанет означать «прочитал всю книгу»`
    );
  }
}
const summarySet = new Set(summaryChapters);
for (const ch of trackerChapters) {
  if (!summarySet.has(ch)) {
    errors.push(`трекер прогресса: «${ch}» есть в GROUPS, но такой главы нет в src/SUMMARY.md`);
  }
}

// ---------- 1b. уровни маршрута (lvl) у каждой главы ----------
// Процент в трекере считается ТОЛЬКО по ядру, а плашку «Расширение/Справочник»
// на странице главы ставит тот же реестр. Глава без lvl выпадает из обоих
// механизмов молча: в счёт ядра не попадёт, плашку не получит.
const LEVELS = new Set(["core", "ext", "ref", "tool"]);
const levelled = [...progressJs.matchAll(/h:\s*"([\w-]+)\.html",\s*lvl:\s*"(\w+)"/g)];
const levelOf = new Map(levelled.map((m) => [m[1], m[2]]));
for (const ch of trackerChapters) {
  if (!levelOf.has(ch)) {
    errors.push(
      `трекер прогресса: у главы «${ch}» нет поля lvl — она не попадёт ни в счёт ядра, ` +
        `ни в плашку уровня на странице`
    );
  } else if (!LEVELS.has(levelOf.get(ch))) {
    errors.push(
      `трекер прогресса: у главы «${ch}» неизвестный lvl="${levelOf.get(ch)}" ` +
        `(допустимы: ${[...LEVELS].join(", ")})`
    );
  }
}
const coreCount = [...levelOf.values()].filter((v) => v === "core").length;
if (!coreCount) {
  errors.push("трекер прогресса: ни одной главы с lvl=\"core\" — процент будет делиться на ноль");
}

// ---------- 2. таблица пакетов в exercises/README.md <-> каталоги ----------
const packages = fs
  .readdirSync(exDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== "cmd" && !d.name.startsWith("."))
  .map((d) => d.name)
  .sort();

const exReadme = read(path.join(exDir, "README.md"));
// строки таблицы вида: | `slidingwindow` | `MaxSumSubarray`, ... |
const documented = new Set(
  [...exReadme.matchAll(/^\|\s*`([a-z0-9]+)`\s*\|/gm)].map((m) => m[1])
);
for (const pkg of packages) {
  if (!documented.has(pkg)) {
    errors.push(`exercises/README.md: пакета \`${pkg}\` нет в таблице «Пакет | Функции»`);
  }
}
for (const pkg of documented) {
  if (!packages.includes(pkg)) {
    errors.push(`exercises/README.md: в таблице описан \`${pkg}\`, но каталога exercises/${pkg}/ нет`);
  }
}

// ---------- 3+4. виджеты algo-runner в главах <-> пакеты и traceTargets ----------
const traceGo = read(path.join(exDir, "cmd", "runner", "trace.go"));
// вырезаем литерал map traceTargets и собираем "pkg" -> набор функций
const targetsBlock = traceGo.slice(
  traceGo.indexOf("var traceTargets = map[string][]string{")
);
const allowed = new Map();
{
  const re = /"([a-z0-9]+)":\s*\{([^}]*)\}/g;
  let m;
  while ((m = re.exec(targetsBlock))) {
    if (m.index > targetsBlock.indexOf("\n}\n")) break; // вышли за пределы литерала
    allowed.set(m[1], new Set([...m[2].matchAll(/"([A-Za-z0-9_.]+)"/g)].map((x) => x[1])));
  }
}
if (allowed.size === 0) {
  errors.push("cmd/runner/trace.go: не удалось разобрать traceTargets — проверка трассировки не выполнена");
}

for (const file of chapterFiles) {
  const text = read(path.join(srcDir, file));
  const re = /<div class="algo-runner"([^>]*)>/g;
  let m;
  while ((m = re.exec(text))) {
    const tag = m[1];
    const pkg = (tag.match(/data-pkg="([^"]*)"/) || [])[1];
    const where = `src/${file}`;
    if (!pkg) {
      errors.push(`${where}: виджет algo-runner без data-pkg`);
      continue;
    }
    if (!packages.includes(pkg)) {
      errors.push(`${where}: algo-runner data-pkg="${pkg}" — такого пакета в exercises/ нет`);
      continue;
    }
    const rawCalls = (tag.match(/data-trace-calls='([^']*)'/) || [])[1];
    if (!rawCalls) continue;
    let calls;
    try {
      calls = JSON.parse(rawCalls);
    } catch (e) {
      errors.push(`${where}: data-trace-calls пакета ${pkg} — невалидный JSON (${e.message})`);
      continue;
    }
    for (const c of calls) {
      const fn = c && c.func;
      if (!fn || !c.call) {
        errors.push(`${where}: элемент data-trace-calls пакета ${pkg} без "func"/"call"`);
        continue;
      }
      if (!allowed.has(pkg) || !allowed.get(pkg).has(fn)) {
        errors.push(
          `${where}: глава предлагает трассировать ${pkg}.${fn}, но его нет в traceTargets ` +
            `(exercises/cmd/runner/trace.go) — кнопка «🎞 Визуализировать» получит отказ`
        );
      }
    }
  }
}

// ---------- 5. счётчик пакетов в CLAUDE.md ----------
const claude = read(path.join(root, "CLAUDE.md"));
const counted = (claude.match(/wc -l`,\s*сейчас\s+(\d+)\)/) || [])[1];
if (!counted) {
  errors.push("CLAUDE.md: не найден счётчик пакетов «…wc -l`, сейчас N)» — проверка не выполнена");
} else if (Number(counted) !== packages.length) {
  errors.push(
    `CLAUDE.md: заявлено ${counted} пакетов тренажёра, фактически ${packages.length}`
  );
}

if (errors.length) {
  console.error(`❌ check-registries: ${errors.length} расхождений:`);
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
console.log(
  `✅ check-registries: трекер (${trackerChapters.size} глав: ядро ${coreCount}, ` +
    `остальные ${trackerChapters.size - coreCount}), таблица пакетов (${packages.length}), ` +
    `traceTargets (${allowed.size} пакетов) и счётчик в CLAUDE.md согласованы`
);
