#!/usr/bin/env node
// Сверка РУЧНЫХ реестров проекта с реальностью (из корня: node scripts/check-registries.js).
// Работает по исходникам, mdbook build не нужен.
//
// В проекте несколько списков, которые ведутся руками и обязаны совпадать с тем,
// что есть на самом деле. Забыть их — не «сломать сборку», а тихо ухудшить книгу:
// трекер перестаёт считать реальные главы, виджет молча не находит пакет,
// «🎞 Визуализировать» отвечает 403. Именно так трекер прогресса однажды и отстал
// от книги на 19 глав. Проверяем семь связей:
//
//  1) assets/progress.js  <-> src/SUMMARY.md      — трекер знает все главы книги;
//  1a) там же: порядок глав в GROUPS = порядок в оглавлении (это маршрут для check-ladder.js);
//  1b') листья дерева в pattern-selection-guide.md <-> lvl в progress.js — метки уровня верны;
//  2) exercises/README.md <-> exercises/*/        — таблица пакетов полна;
//  3) data-trace-calls в главах <-> traceTargets  — бэкенд разрешает то, что предлагает глава;
//  4) data-pkg у algo-runner   <-> exercises/*/   — виджет ссылается на существующий пакет;
//  4b) RACE_PKGS в assets/srs.js <-> data-race="true" в главах — карточка и смешанная гоняют -race там же;
//  4c) additional-js в book.toml: assets/takeaways.js раньше assets/srs.js;
//  4d) там же: assets/pairs.js раньше assets/mixed.js;
//  5) число пакетов в CLAUDE.md <-> exercises/*/  — счётчик в документации не протух;
//  6) имена файлов случайных тестов               — они идут после табличных.
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
const trackerList = [...progressJs.matchAll(/h:\s*"([\w-]+)\.html"/g)].map((m) => m[1]);
const trackerChapters = new Set(trackerList);

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

// ---------- 1a. порядок глав: GROUPS <-> оглавление ----------
// Порядок GROUPS — это маршрут: по нему check-ladder.js решает, какая глава «раньше».
// Разойдись он с оглавлением, читатель шёл бы одним путём, а линты считали бы другой.
const trackerOrder = trackerList.filter((ch) => summarySet.has(ch));
const summaryOrder = summaryChapters.filter((ch) => trackerChapters.has(ch));
const orderLen = Math.min(trackerOrder.length, summaryOrder.length);
for (let i = 0; i < orderLen; i++) {
  if (trackerOrder[i] !== summaryOrder[i]) {
    errors.push(
      `порядок глав: на месте ${i + 1} в GROUPS (assets/progress.js) стоит «${trackerOrder[i]}», ` +
        `а в src/SUMMARY.md — «${summaryOrder[i]}»: первая расходящаяся пара, порядок GROUPS ` +
        `обязан повторять оглавление`
    );
    break;
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

// ---------- 1b'. метки уровня у листьев дерева решений ----------
// В дереве руководства по выбору каждое название главы в листе «└─ → …» несёт сразу после
// себя метку уровня: шестьдесят глав в дереве иначе выглядят одинаково обязательными.
// Здесь — только соответствие «название в дереве → слаг»; уровни берутся из progress.js.
const GUIDE_LEAVES = {
  "Хеш-таблица": "hash-table-structure",
  "Sliding Window": "sliding-window",
  "Prefix Sums": "prefix-sums",
  "Monotonic Stack": "monotonic-stack",
  "Two Pointers": "two-pointers",
  "Cyclic Sort": "cyclic-sort",
  "Modified Binary Search": "modified-binary-search",
  "Bit Manipulation": "bit-manipulation",
  "Fast & Slow Pointers": "fast-slow-pointers",
  "Reverse Linked List": "reverse-linked-list",
  "Tree BFS": "tree-bfs",
  "Tree DFS": "tree-dfs",
  "Merge Intervals": "merge-intervals",
  "Top K Elements": "top-k-elements",
  "Две кучи": "two-heaps",
  "K-way Merge": "k-way-merge",
  "Subsets": "subsets",
  "Backtracking": "backtracking",
  "Graphs": "graphs",
  "Topological Sort": "topological-sort",
  "Union-Find": "union-find-structure",
  "Grids & Shortest Paths": "grids-and-shortest-paths",
  "Advanced Graphs": "advanced-graph-algorithms",
  "Graph Connectivity": "graph-connectivity",
  "Max Flow / Min Cut": "max-flow",
  "Greedy": "greedy",
  "Dynamic Programming": "dynamic-programming",
  "Классы сложности": "complexity-classes",
  "Строковые алгоритмы": "string-algorithms",
  "Trie": "trie",
  "Sparse Table": "sparse-table-structure",
  "Дерево отрезков": "segment-tree",
  "Дерево Фенвика": "fenwick-tree",
  "B-дерево": "btree-structure",
  "Вероятностные структуры": "probabilistic-structures",
  "Комбинаторика счёта": "combinatorics",
  "Дискретная вероятность": "probability",
  "Теория чисел": "number-theory",
  "Криптография": "cryptography",
  "Сортировки и порядковые статистики": "sorting",
};
let guideLeavesCount = 0;
const LEVEL_TAG = { core: "ядро", ext: "расширение", ref: "справочник" };

// Ошибки меток одной строки листа (текст после «→ »); used — множество встреченных названий.
function guideLeafErrors(leaf, used) {
  const errs = [];
  const taken = []; // занятые участки строки: «Graphs» внутри «Advanced Graphs» не считается
  const names = Object.keys(GUIDE_LEAVES).sort((a, b) => b.length - a.length);
  const found = [];
  for (const name of names) {
    let from = 0;
    for (;;) {
      const at = leaf.indexOf(name, from);
      if (at < 0) break;
      from = at + name.length;
      if (taken.some(([a, b]) => at < b && from > a)) continue;
      taken.push([at, from]);
      found.push({ name, at, end: from });
    }
  }
  if (!found.length) return [`лист «${leaf}» — ни одного названия из GUIDE_LEAVES`];
  for (const f of found) {
    used.add(f.name);
    const lvl = levelOf.get(GUIDE_LEAVES[f.name]);
    const want = LEVEL_TAG[lvl];
    const tag = leaf.slice(f.end).match(/^ \[([^\]]+)\]/);
    if (!want) errs.push(`лист «${leaf}»: у главы ${GUIDE_LEAVES[f.name]} нет уровня ядро/расширение/справочник в progress.js`);
    else if (!tag) errs.push(`лист «${leaf}»: после «${f.name}» нет метки [${want}]`);
    else if (tag[1] !== want) errs.push(`лист «${leaf}»: у «${f.name}» метка [${tag[1]}], а уровень главы — [${want}]`);
  }
  const tags = (leaf.match(/\[(ядро|расширение|справочник)\]/g) || []).length;
  if (tags > found.length) errs.push(`лист «${leaf}»: метка уровня без названия из GUIDE_LEAVES`);
  // Несколько глав в листе разделены « / »; каждая часть обязана начинаться с известного названия —
  // иначе вторая, незнакомая глава без метки прошла бы молча. Найденные названия сначала маскируются:
  // в самих названиях тоже бывает « / » («Max Flow / Min Cut»).
  let masked = leaf;
  for (const f of [...found].sort((a, b) => b.at - a.at)) masked = masked.slice(0, f.at) + "\u0000" + masked.slice(f.end);
  for (const part of masked.split(" / ")) {
    if (!part.startsWith("\u0000")) errs.push(`лист «${leaf}»: часть «${part.replace(/\u0000/g, "…")}» не начинается с названия из GUIDE_LEAVES`);
  }
  return errs;
}
{
  const guide = read(path.join(srcDir, "pattern-selection-guide.md"));
  const tree = guide.match(/## Decision Tree[^\n]*\n[\s\S]*?\n```\n([\s\S]*?)\n```/);
  if (!tree) {
    errors.push("src/pattern-selection-guide.md: не нашёл блок дерева решений после «## Decision Tree»");
  } else {
    const used = new Set();
    const leaves = tree[1].split("\n").filter((l) => /└─ →/.test(l)).map((l) => l.replace(/^.*└─ → /, ""));
    for (const leaf of leaves) for (const e of guideLeafErrors(leaf, used)) errors.push(`src/pattern-selection-guide.md: ${e}`);
    for (const name of Object.keys(GUIDE_LEAVES)) {
      if (!used.has(name)) errors.push(`check-registries.js: GUIDE_LEAVES «${name}» — такого листа в дереве решений нет`);
      if (!levelOf.has(GUIDE_LEAVES[name])) errors.push(`check-registries.js: GUIDE_LEAVES «${name}» → ${GUIDE_LEAVES[name]} — такой главы нет в progress.js`);
    }
    guideLeavesCount = leaves.length;
  }
}

// ---------- 1c. числа уровней в тексте <-> реестр ----------
// README, шпаргалка и CLAUDE.md называют, сколько глав в ядре, расширении и
// справочнике. Добавил главу — число в тексте тихо протухло (так и случилось:
// «расширение — 21 глава» пережило появление двадцать второй).
const countOf = (lvl) => [...levelOf.values()].filter((v) => v === lvl).length;
const statedCounts = [
  { file: "src/README.md", re: /\|\s*\*\*Ядро\*\*\s*\|\s*(\d+)\s+глав/, lvl: "core" },
  { file: "src/README.md", re: /\|\s*\*\*Расширение\*\*\s*\|\s*(\d+)\s+глав/, lvl: "ext" },
  { file: "src/README.md", re: /\|\s*\*\*Справочник\*\*\s*\|\s*(\d+)\s+глав/, lvl: "ref" },
  { file: "src/cheatsheet.md", re: /по ядру — (\d+) глав/, lvl: "core" },
  { file: "CLAUDE.md", re: /`core` \(ядро, (\d+)/, lvl: "core" },
  { file: "CLAUDE.md", re: /`ext` \(расширение, (\d+)/, lvl: "ext" },
  { file: "CLAUDE.md", re: /`ref` \(справочник, (\d+)/, lvl: "ref" },
];
for (const { file, re, lvl } of statedCounts) {
  const m = read(path.join(root, file)).match(re);
  if (!m) {
    errors.push(`${file}: не нашёл упоминания числа глав уровня «${lvl}» (шаблон ${re})`);
  } else if (Number(m[1]) !== countOf(lvl)) {
    errors.push(
      `${file}: сказано, что глав уровня «${lvl}» — ${m[1]}, а в реестре трекера их ${countOf(lvl)}`
    );
  }
}

// ---------- 1d. числа банка задач на странице смешанной тренировки ----------
// Банк генерируется (cmd/problembank), а страница называет его размер руками:
// сколько всего задач и сколько из них годится для собеседования (со своими
// тестами). Новый пакет тренажёра — и оба числа тихо устаревают.
{
  const sandbox = {};
  new Function("window", read(path.join(root, "assets", "problems.js")))(sandbox);
  const bank = sandbox.ALGO_PROBLEMS || [];
  // собеседованию годится задача со своими тестами и без соседних упражнений (n): на чистой заготовке
  // тесты задачи с соседями падают на их panic("TODO") — так фильтрует mixed.js
  const withTests = bank.filter((p) => p.t && p.t.length && !(p.n && p.n.length)).length;
  const mixedMd = read(path.join(srcDir, "mixed.md"));
  const total = mixedMd.match(/(\d+) услови[йяе] собран[оы]/); // «163 условия собраны», «181 условие собрано»
  const mock = mixedMd.match(/собственные тесты, — (\d+) из (\d+)/);
  if (!total || Number(total[1]) !== bank.length) {
    errors.push(`src/mixed.md: в банке ${bank.length} задач, а на странице — ${total ? total[1] : "(не нашёл «N условий собраны/собрано»)"}`);
  }
  // То же число названо в CLAUDE.md, в описании режима собеседования; однажды оно
  // уже пережило добавление пакета незамеченным.
  const claudeMock = read(path.join(root, "CLAUDE.md")).match(/непустым `t` \((\d+) из (\d+)\)/);
  if (!claudeMock || Number(claudeMock[1]) !== withTests || Number(claudeMock[2]) !== bank.length) {
    errors.push(
      `CLAUDE.md: для собеседования годится ${withTests} из ${bank.length}, а в описании режима — ` +
        (claudeMock ? `${claudeMock[1]} из ${claudeMock[2]}` : "(не нашёл «непустым `t` (N из M)»)")
    );
  }
  if (!mock || Number(mock[1]) !== withTests || Number(mock[2]) !== bank.length) {
    errors.push(
      `src/mixed.md: для собеседования годится ${withTests} из ${bank.length}, а на странице — ` +
        (mock ? `${mock[1]} из ${mock[2]}` : "(не нашёл «— N из M»)")
    );
  }
  // Почему не годятся остальные: «у N проверить … нечем» — без своих тестов, «а у M тесты зовут
  // соседние» — с непустым n.
  const noTests = bank.filter((p) => !(p.t && p.t.length)).length;
  const withNeeds = bank.filter((p) => p.t && p.t.length && p.n && p.n.length).length;
  const why = mixedMd.match(/у (\d+) проверить функцию отдельно от пакета нечем, а у\s+(\d+) тесты зовут/);
  if (!why || Number(why[1]) !== noTests || Number(why[2]) !== withNeeds) {
    errors.push(`src/mixed.md: без своих тестов ${noTests}, с соседями ${withNeeds}, а на странице — ${why ? why[1] + " и " + why[2] : "(не нашёл «у N проверить … а у M тесты зовут»)"}`);
  }
  // Пример пула «только пройденные»: окно, два указателя и префиксные суммы — задачи, чей ответ (c или
  // из a) среди этих глав; у собеседования — из годных ему.
  const three = ["sliding-window", "two-pointers", "prefix-sums"];
  const inThree = (p) => [p.c].concat(p.a || []).some((c) => three.includes(c));
  const poolAll = bank.filter(inThree).length;
  const poolMock = bank.filter((p) => inThree(p) && p.t && p.t.length && !(p.n && p.n.length)).length;
  const exAll = mixedMd.match(/окно, два указателя и префиксные суммы дают (\d+) задач/);
  const exMock = mixedMd.match(/на окне, двух указателях и префиксных суммах их (\d+)/);
  if (!exAll || Number(exAll[1]) !== poolAll) errors.push(`src/mixed.md: на окне, двух указателях и префиксах в пуле ${poolAll} задач, а на странице — ${exAll ? exAll[1] : "(не нашёл «… дают N задач»)"}`);
  if (!exMock || Number(exMock[1]) !== poolMock) errors.push(`src/mixed.md: у собеседования на тех же главах ${poolMock} задач, а на странице — ${exMock ? exMock[1] : "(не нашёл «… их N»)"}`);
}

// ---------- 1e. числа квиза на его странице ----------
// Порция и число вопросов зашиты в quiz.js; страница называет их словами.
{
  const quizJs = read(path.join(root, "assets", "quiz.js"));
  const questions = (quizJs.match(/^\s+q: "/gm) || []).length;
  const portion = (quizJs.match(/var PORTION = (\d+);/) || [])[1];
  const quizMd = read(path.join(srcDir, "quiz.md"));
  const mdAll = quizMd.match(/берёт все (\d+) вопрос/);
  const mdPortion = quizMd.match(/порциями по (\d+)/);
  const mdRecord = quizMd.match(/полной порции из (\d+) вопрос/);
  if (!mdAll || Number(mdAll[1]) !== questions) errors.push(`src/quiz.md: в квизе ${questions} вопросов, а на странице — ${mdAll ? mdAll[1] : "(не нашёл «берёт все N вопросов»)"}`);
  for (const [m, what] of [[mdPortion, "«порциями по N»"], [mdRecord, "«полной порции из N вопросов»"]]) {
    if (!m || m[1] !== portion) errors.push(`src/quiz.md: порция в quiz.js — ${portion}, а на странице ${what} — ${m ? m[1] : "(не нашёл)"}`);
  }
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

// ---------- 4b. пакеты с -race: список srs.js (RACE_PKGS) <-> data-race="true" виджетов в главах ----------
// Карточка пакета и смешанная тренировка ставят data-race по списку из srs.js; разойдись он с главами —
// гоночное решение зеленело бы на карточке (и «Помню»), а лишний пакет гонялся бы с -race без нужды.
{
  const srsSrc = read(path.join(root, "assets", "srs.js"));
  const lit = srsSrc.match(/var RACE_PKGS = \[([^\]]*)\];/);
  if (!lit) {
    errors.push("assets/srs.js: не найден список RACE_PKGS — проверка -race не выполнена");
  } else {
    const listed = new Set([...lit[1].matchAll(/"([a-z0-9]+)"/g)].map((x) => x[1]));
    const inChapters = new Set();
    for (const file of chapterFiles) {
      for (const m of read(path.join(srcDir, file)).matchAll(/<div class="algo-runner"([^>]*)>/g)) {
        const pkg = (m[1].match(/data-pkg="([^"]*)"/) || [])[1];
        if (pkg && /data-race="true"/.test(m[1])) inChapters.add(pkg);
      }
    }
    for (const p of inChapters) if (!listed.has(p)) errors.push(`assets/srs.js: RACE_PKGS без «${p}», а в главах его тесты гоняются с -race — на карточке и в смешанной гонка не ловится`);
    for (const p of listed) if (!inChapters.has(p)) errors.push(`assets/srs.js: RACE_PKGS содержит «${p}», но ни одна глава не гоняет его с -race`);
  }
}

// ---------- 4c. порядок подключения: takeaways.js раньше srs.js ----------
// srs.js читает window.ALGO_TAKEAWAYS при загрузке; подключённый позже реестр он не увидит,
// и карточки ch: молча останутся прежними (без трёх вопросов главы).
{
  const bookToml = read(path.join(root, "book.toml"));
  const js = (bookToml.match(/additional-js\s*=\s*\[([^\]]*)\]/) || [])[1];
  if (!js) {
    errors.push("book.toml: не найден additional-js — порядок takeaways.js и srs.js не проверен");
  } else {
    const list = [...js.matchAll(/"([^"]+)"/g)].map((x) => x[1]);
    const iT = list.indexOf("assets/takeaways.js");
    const iS = list.indexOf("assets/srs.js");
    if (iT < 0) errors.push("book.toml: в additional-js нет assets/takeaways.js");
    else if (iS >= 0 && iT > iS) errors.push("book.toml: в additional-js assets/takeaways.js стоит после assets/srs.js — должен быть раньше");
    // 4d. pairs.js раньше mixed.js: строка пары после промаха читает window.ALGO_PAIRS.
    const iP = list.indexOf("assets/pairs.js");
    const iM = list.indexOf("assets/mixed.js");
    if (iP < 0) errors.push("book.toml: в additional-js нет assets/pairs.js — после промаха в смешанной не будет строки пары");
    else if (iM >= 0 && iP > iM) errors.push("book.toml: в additional-js assets/pairs.js стоит после assets/mixed.js — должен быть раньше");
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

// ---------- 6. случайные тесты идут после табличных ----------
// go test исполняет тесты в порядке файлов: «_rand_test.go» шёл раньше «_test.go»,
// и первым падал тест самой трудной функции пакета. Имя «_zrand_test.go»
// сортируется после.
for (const pkg of fs.readdirSync(exDir)) {
  const dir = path.join(exDir, pkg);
  if (pkg === "cmd" || !fs.statSync(dir).isDirectory()) continue;
  for (const f of fs.readdirSync(dir)) {
    if (f.endsWith("_rand_test.go")) {
      errors.push(
        `exercises/${pkg}/${f}: случайные тесты называются <пакет>_zrand_test.go — ` +
          `иначе они исполняются раньше табличных`
      );
    }
  }
}

if (errors.length) {
  console.error(`❌ check-registries: ${errors.length} расхождений:`);
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
console.log(
  `✅ check-registries: трекер (${trackerChapters.size} глав: ядро ${coreCount}, ` +
    `остальные ${trackerChapters.size - coreCount}; порядок совпал с оглавлением у ${orderLen} глав), таблица пакетов (${packages.length}), ` +
    `traceTargets (${allowed.size} пакетов), метки уровня у ${guideLeavesCount} листьев дерева решений ` +
    `и счётчик в CLAUDE.md согласованы`
);
