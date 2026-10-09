#!/usr/bin/env node
// Линт «лестницы задач» (запускать из корня: node scripts/check-ladder.js).
//
// Лестница — это три ступени (разогрев → основа → добивка) плюс строка «не пошло»
// с конкретной подсказкой. Она заменила плоский список ссылок на LeetCode, потому
// что список не отвечал на два вопроса: в каком порядке решать и что делать, когда
// застрял. Проверяем ровно то, что ломается молча:
//
//  1) у главы ЯДРА со списком задач лестница есть (иначе новая глава ядра тихо
//     приедет с плоским списком, и маршрут снова станет «прорешай всё подряд»);
//  2) ступени идут в правильном порядке и ни одна не потерялась;
//  3) в каждой ступени есть хотя бы одна задача — ссылка на LeetCode или пункт
//     «в тренажёре: `пакет.Функция`» (пустая ступень — опечатка);
//  4) есть строка «не пошло» — та самая стрелка «вернись сюда», ради которой
//     всё и затевалось. Без неё лестница вырождается в тот же список, но с
//     заголовками;
//  5) каждый хвост «в тренажёре: `пакет.Функция`» называет экспортированную функцию
//     заготовки exercises/<пакет>/<пакет>.go, у которой есть СВОИ тесты: README обещает,
//     что задачу основы с двойником засчитывают зелёные тесты этой функции, а у функции
//     без своих тестов (метод, конструктор) виджет гоняет тип или пакет целиком. Если
//     функция в банке задач (assets/problems.js) зовёт соседей (поле n), хвост обязан
//     их назвать — иначе виджет предложит её последней, а читатель не поймёт почему;
//  6) у главы ЯДРА абзац «Эта глава стоит на главе <a href="X.md">…» (первое
//     предложение «Вспомни») ведёт только на главы ядра: «Введение» обещает, что ядро
//     на главы расширения не опирается.
//
// Уровень главы (core/ext/ref/tool) берётся из ЕДИНОГО реестра — assets/progress.js,
// того же, что питает трекер и плашку на странице.
"use strict";
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const srcDir = path.join(root, "src");
const exDir = path.join(root, "exercises");
const errors = [];

const read = (p) => fs.readFileSync(p, "utf8");

// уровни глав из реестра трекера
const progressJs = read(path.join(root, "assets", "progress.js"));
const levelOf = new Map(
  [...progressJs.matchAll(/h:\s*"([\w-]+)\.html",\s*lvl:\s*"(\w+)"/g)].map((m) => [m[1], m[2]])
);

// соседи функций из банка задач: «pkg.F» → [имена]
const bankNeeds = new Map();
{
  const win = {};
  new Function("window", read(path.join(root, "assets", "problems.js")))(win);
  for (const p of win.ALGO_PROBLEMS || []) bankNeeds.set(`${p.p}.${p.f}`, p.n || []);
}

// Функции заготовки пакета и то, у каких из них есть свои тесты. Владелец теста — как в
// cmd/internal/stubdoc.OwnerOf: функция с самым длинным совпавшим именем, продолжение
// имени со строчной буквы — уже другое слово (TestSubsetsWithDup — не Subsets).
const pkgCache = new Map();
function pkgInfo(pkg) {
  if (pkgCache.has(pkg)) return pkgCache.get(pkg);
  const dir = path.join(exDir, pkg);
  const stubPath = path.join(dir, `${pkg}.go`);
  let info = null;
  if (fs.existsSync(stubPath)) {
    const stub = read(stubPath);
    const exported = new Set(
      [...stub.matchAll(/^func ([A-Z]\w*)\s*[[(]/gm)].map((m) => m[1])
    );
    const all = [...stub.matchAll(/^func (?:\([^)]*\)\s*)?(\w+)\s*[[(]/gm)].map((m) => m[1]);
    const tested = new Set();
    for (const f of fs.readdirSync(dir).filter((f) => f.endsWith("_test.go"))) {
      for (const m of read(path.join(dir, f)).matchAll(/^func (Test\w+)\(/gm)) {
        const rest = m[1].slice(4);
        let best = "";
        for (const name of all) {
          if (!rest.startsWith(name) || name.length <= best.length) continue;
          const tail = rest.slice(name.length);
          if (tail === "" || !/^[a-z]/.test(tail)) best = name;
        }
        if (best) tested.add(best);
      }
    }
    info = { exported, tested };
  }
  pkgCache.set(pkg, info);
  return info;
}

const TIERS = [
  { emoji: "🟢", name: "Разогрев" },
  { emoji: "🔵", name: "Основа" },
  { emoji: "🔴", name: "Добивка" },
];
const TASK_RE = /leetcode\.com\/problems|в тренажёре: `/g;
const TRAINER_RE = /в тренажёре:([^\n]*)/g;

let withLadder = 0;
let coreSkipped = 0;
let trainerTails = 0;
let coreLeans = 0;

for (const file of fs.readdirSync(srcDir).filter((f) => f.endsWith(".md") && f !== "SUMMARY.md")) {
  const slug = file.replace(/\.md$/, "");
  const text = read(path.join(srcDir, file));
  const where = `src/${file}`;
  const isCore = levelOf.get(slug) === "core";

  // 6) «Вспомни» главы ядра стоит только на ядре
  if (isCore) {
    const lean = text.match(/Эта глава стоит на глав[еах]+ ([\s\S]*?)\.(?:\s|<)/);
    if (lean) {
      coreLeans++;
      for (const m of lean[1].matchAll(/href="([\w-]+)\.md"/g)) {
        const lvl = levelOf.get(m[1]);
        if (lvl !== "core") {
          errors.push(
            `${where}: «Вспомни» главы ядра стоит на главе ${m[1]}.md уровня «${lvl || "нет в реестре"}» — ` +
              `ядро не должно опираться на расширение (опора — глава ядра, расширение — ссылка «подробнее»)`
          );
        }
      }
    }
  }

  const positions = TIERS.map((t) => text.indexOf(`**${t.emoji} ${t.name}**`));
  const present = positions.filter((p) => p !== -1).length;
  const hasProblems = /leetcode\.com\/problems/.test(text);

  if (present === 0) {
    // Ядро со списком задач обязано иметь лестницу; всё остальное — по желанию.
    if (isCore && hasProblems) {
      errors.push(
        `${where}: глава ЯДРА со списком задач, но без лестницы ` +
          `(нужны ступени ${TIERS.map((t) => t.emoji + " " + t.name).join(" → ")})`
      );
    } else if (isCore) {
      coreSkipped++;
    }
    continue;
  }

  withLadder++;

  // 2) все три ступени на месте и в правильном порядке
  const missing = TIERS.filter((t, i) => positions[i] === -1);
  if (missing.length) {
    errors.push(`${where}: в лестнице нет ступени ${missing.map((t) => `«${t.name}»`).join(", ")}`);
    continue;
  }
  for (let i = 1; i < positions.length; i++) {
    if (positions[i] < positions[i - 1]) {
      errors.push(
        `${where}: ступень «${TIERS[i].name}» стоит выше «${TIERS[i - 1].name}» — ` +
          `лестница читается снизу вверх, порядок важен`
      );
    }
  }

  // Конец лестницы — следующий заголовок или блок «Тренажёр» после «Добивки».
  const afterTop = text.slice(positions[2] + 1);
  const endRel = afterTop.search(/^(#{2,4} |\*\*Тренажёр\*\*)/m);
  const end = endRel === -1 ? text.length : positions[2] + 1 + endRel;

  // 3) в каждой ступени есть задачи
  const bounds = positions.concat(end);
  TIERS.forEach((t, i) => {
    const block = text.slice(bounds[i], bounds[i + 1]);
    if (!(block.match(TASK_RE) || []).length) {
      errors.push(`${where}: в ступени «${t.name}» нет ни одной задачи (ни LeetCode, ни «в тренажёре: …»)`);
    }
  });

  // 4) стрелка «не пошло — вернись сюда»
  if (!/не пошл/i.test(text.slice(positions[2], end))) {
    errors.push(
      `${where}: после лестницы нет строки «Не пошла задача…» — ` +
        `без подсказки, куда вернуться, лестница это просто список с заголовками`
    );
  }

  // 5) хвосты «в тренажёре: `пакет.Функция`»
  for (const m of text.slice(positions[0], end).matchAll(TRAINER_RE)) {
    const ref = m[1].match(/^\s*`([a-z]\w*)\.(\w+)`/);
    if (!ref) {
      errors.push(`${where}: «в тренажёре:${m[1].slice(0, 40)}» — нужен формат «в тренажёре: \`пакет.Функция\`»`);
      continue;
    }
    trainerTails++;
    const [, pkg, fn] = ref;
    const info = pkgInfo(pkg);
    if (!info) {
      errors.push(`${where}: «в тренажёре: ${pkg}.${fn}» — нет заготовки exercises/${pkg}/${pkg}.go`);
      continue;
    }
    if (!info.exported.has(fn)) {
      errors.push(`${where}: «в тренажёре: ${pkg}.${fn}» — в exercises/${pkg}/${pkg}.go нет экспортированной функции ${fn}`);
      continue;
    }
    if (!info.tested.has(fn)) {
      errors.push(
        `${where}: «в тренажёре: ${pkg}.${fn}» — у функции нет своих тестов, ` +
          `зелёный прогон её одной невозможен`
      );
    }
    for (const need of bankNeeds.get(`${pkg}.${fn}`) || []) {
      if (!m[1].includes(need)) {
        errors.push(
          `${where}: «в тренажёре: ${pkg}.${fn}» — эталон и тесты зовут ${need} (поле n банка), ` +
            `а хвост об этом молчит`
        );
      }
    }
  }
}

if (errors.length) {
  console.error(`❌ check-ladder: ${errors.length} проблем(ы):`);
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
console.log(
  `✅ check-ladder: лестница задач в ${withLadder} главах — три ступени по порядку, ` +
    `каждая непустая, подсказка «не пошло» на месте; хвостов «в тренажёре»: ${trainerTails}, ` +
    `у каждого — функция заготовки со своими тестами; «Вспомни» ${coreLeans} глав ядра стоит только на ядре ` +
    `(глав ядра без списка задач: ${coreSkipped} — практика там в пакете тренажёра или в задачах самой главы)`
);
