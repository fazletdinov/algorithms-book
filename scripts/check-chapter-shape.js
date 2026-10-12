#!/usr/bin/env node
// Линт формы перестроенной главы (запускать из корня: node scripts/check-chapter-shape.js).
//
// Держит ту часть правил главы-шаблона (CLAUDE.md, «Структура книги»), которая
// проверяется строкой. Проверяет ТОЛЬКО главы из списка REBUILT — остальные главы
// ядра ещё не перестроены и этим правилам не отвечают; каждая задача перестройки
// сначала вносит свою главу в список (красный), потом правит текст (зелёный).
//
//   node scripts/check-chapter-shape.js              — главы из REBUILT + самопроверка
//   node scripts/check-chapter-shape.js --only graphs — одна глава вне списка (src/graphs.md)
//   node scripts/check-chapter-shape.js --only big-o --end — одна глава вне списка, только конец (R2–R4)
//
// Второй, узкий режим — список ENDED: главы, у которых проверяется ТОЛЬКО конец
// (R2, R3, R4: черта, «Что унести», порядок), без «Запомни» и «🧭» (R1, R5, R6).
// Глава не перестроена целиком, но конец у неё уже по образцу; при перестройке
// (пункт 14 плана) она переходит из ENDED в REBUILT. Слаг в обоих списках — ошибка.
//
// Самопроверка гоняется ВСЕГДА, на встроенных образцах (хорошая глава зелёная,
// каждое из правил по очереди ломается и краснеет своим сообщением): пока список
// пуст, сломанный линт иначе остался бы незамеченным. Функции экспортируются
// (checkChapter, selfTest) для тестов.
//
// Правила (номера — в сообщениях):
//  R1 «Запомни» есть: блок algo-mental с заголовком «Запомни», не больше 3 пунктов <li>,
//     не больше 60 слов (слово — токен с буквой или цифрой; заголовок не считается),
//     без <pre>, каждый <code> — голое имя (^[\p{L}\p{N}_.]+$): `visited` можно, `lo < hi` нельзя;
//  R2 черта — строка «> 🏁 **Глава сдана выше.** Дальше — …»;
//  R3 «Что унести» — блок algo-mental с иконкой 📌 и заголовком «Что унести»: ровно три <li>,
//     начинающиеся с меток «Сигнал», «Должно быть верно», «Ломается» (<b>М</b>, <b>М.</b>, <b>М</b>. или **М**), в каждом ≤ 40 слов;
//  R4 порядок: последняя строка «Не пошла…» лестницы < черта < «Что унести» < «## 🔗»
//     (если он есть); между «Что унести» и «## 🔗» других блоков algo-mental нет;
//  R5 если есть «## 🧭»: в главе нет подстроки «Задача из «📝»;
//  R6 …и первый абзац «## 📝 Разбор задачи» содержит ссылку на якорь «#-откуда-берётся…».
"use strict";
const fs = require("fs");
const path = require("path");

// Слаги перестроенных глав (src/<слаг>.md). Пополняется по мере перестройки.
const REBUILT = ["graphs", "sorting", "monotonic-stack", "modified-binary-search"];
// Слаги глав, у которых проверяется только конец (R2–R4). Пополняется задачами 3–6 этапа 3b.
const ENDED = ["big-o", "recursion", "invariants", "hash-table-structure", "linked-list-structure",
  "sliding-window", "prefix-sums", "two-pointers", "fast-slow-pointers", "merge-intervals",
  "bst-structure", "tree-bfs", "tree-dfs", "heap-structure", "top-k-elements"];

const ZAPOMNI_MAX_LI = 3;
const ZAPOMNI_MAX_WORDS = 60;
const TAKEAWAY_LABELS = ["Сигнал", "Должно быть верно", "Ломается"];
// метка: <b>Метка</b>, <b>Метка.</b>, <b>Метка</b>. или **Метка** (с точкой внутри или после)
const takeawayLabel = (label) =>
  new RegExp(`^(?:<b>${label}\\.?</b>|\\*\\*${label}\\.?\\*\\*)\\.?`, "u");
const TAKEAWAY_MAX_WORDS = 40;
const FINISH_LINE = /^> 🏁 \*\*Глава сдана выше\.\*\* Дальше — /;

const ENTITIES = { "&lt;": "<", "&gt;": ">", "&amp;": "&", "&quot;": '"', "&nbsp;": " ", "&#39;": "'" };
const decode = (s) => s.replace(/&(?:lt|gt|amp|quot|nbsp|#39);/g, (e) => ENTITIES[e]);
const wordCount = (html) =>
  decode(html.replace(/<[^>]*>/g, " "))
    .split(/\s+/)
    .filter((t) => /[\p{L}\p{N}]/u.test(t)).length;

// Блоки <div class="algo-mental">…</div> с учётом вложенных div: [{start, end, html}],
// start/end — смещения в тексте.
function mentalBlocks(text) {
  const blocks = [];
  const open = /<div class="algo-mental">/g;
  let m;
  while ((m = open.exec(text))) {
    const tag = /<(\/?)div\b[^>]*>/g;
    tag.lastIndex = m.index;
    let depth = 0;
    let t;
    while ((t = tag.exec(text))) {
      depth += t[1] ? -1 : 1;
      if (depth === 0) {
        blocks.push({ start: m.index, end: tag.lastIndex, html: text.slice(m.index, tag.lastIndex) });
        break;
      }
    }
  }
  return blocks;
}

const titleOf = (html) => {
  const t = html.match(/<div class="algo-mental__title">([\s\S]*?)<\/div>/);
  return t ? decode(t[1].replace(/<[^>]*>/g, "")).trim() : "";
};
const bodyOf = (html) =>
  html
    .replace(/<div class="algo-mental__icon">[\s\S]*?<\/div>/, "")
    .replace(/<div class="algo-mental__title">[\s\S]*?<\/div>/, "");
const itemsOf = (html) => [...html.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => m[1].trim());
// пункты «Запомни»: <li> и отдельные абзацы <p> — абзац рядом со списком это тот же пункт
const pointsOf = (html) => [...html.matchAll(/<(?:li|p)>/g)].length;

// Возвращает список сообщений об ошибках для текста одной главы.
// opts.mode: "full" (по умолчанию, R1–R6) или "end" (только R2, R3, R4).
function checkChapter(rawText, file, opts = {}) {
  const full = (opts.mode ?? "full") !== "end";
  const errs = [];
  const fail = (rule, msg) => errs.push(`${file}: ${rule}: ${msg}`);

  // ограждённый код не должен ни давать, ни скрывать разметку: заменяем пробелами, смещения сохраняются
  const text = rawText.replace(/^```[\s\S]*?^```/gm, (b) => b.replace(/[^\n]/g, " "));
  const lineOf = (offset) => text.slice(0, offset).split("\n").length - 1;
  const blocks = mentalBlocks(text);
  const lines = text.split("\n");

  // R1
  const zap = blocks.find((b) => titleOf(b.html) === "Запомни");
  if (!full) {
    // режим «только конец»: «Запомни» не проверяется
  } else if (!zap) fail("R1 «Запомни»", "блока «Запомни» нет");
  else {
    const body = bodyOf(zap.html);
    const li = pointsOf(body);
    const words = wordCount(body);
    if (li > ZAPOMNI_MAX_LI) fail("R1 «Запомни»", `пунктов ${li}, допустимо не больше ${ZAPOMNI_MAX_LI}`);
    if (words > ZAPOMNI_MAX_WORDS) fail("R1 «Запомни»", `слов ${words}, допустимо не больше ${ZAPOMNI_MAX_WORDS}`);
    if (/<pre\b/.test(body)) fail("R1 «Запомни»", "внутри есть <pre> — кода в «Запомни» нет");
    for (const c of body.matchAll(/<code>([\s\S]*?)<\/code>/g)) {
      const code = decode(c[1].replace(/<[^>]*>/g, ""));
      if (!/^[\p{L}\p{N}_.]+$/u.test(code)) fail("R1 «Запомни»", `<code> «${code}» — выражение, а не имя`);
    }
  }

  // R2
  const finish = lines.findIndex((l) => FINISH_LINE.test(l));
  if (finish < 0) fail("R2 черта", "нет строки «> 🏁 **Глава сдана выше.** Дальше — …»");

  // R3
  const take = blocks.find(
    (b) => /<div class="algo-mental__icon">📌<\/div>/.test(b.html) && titleOf(b.html) === "Что унести"
  );
  if (!take) fail("R3 «Что унести»", "нет блока algo-mental с иконкой 📌 и заголовком «Что унести»");
  const items = take ? itemsOf(bodyOf(take.html)) : null;
  if (items) {
    if (items.length !== 3) fail("R3 «Что унести»", `пунктов ${items.length}, нужно ровно 3`);
    else
      items.forEach((it, i) => {
        if (!takeawayLabel(TAKEAWAY_LABELS[i]).test(it))
          fail("R3 «Что унести»", `пункт ${i + 1} должен начинаться с метки «${TAKEAWAY_LABELS[i]}» (<b>…</b> или **…**)`);
        const w = wordCount(it);
        if (w > TAKEAWAY_MAX_WORDS)
          fail("R3 «Что унести»", `в пункте ${i + 1} слов ${w}, допустимо не больше ${TAKEAWAY_MAX_WORDS}`);
      });
  }

  // R4
  const takeLine = take ? lineOf(take.start) : -1;
  const linksLine = lines.findIndex((l) => /^## 🔗/.test(l));
  const ladderLine = lines.reduce((acc, l, i) => (/^>.*Не пошла/.test(l) ? i : acc), -1);
  const chain = [
    ["последняя строка «Не пошла…»", ladderLine],
    ["черта 🏁", finish],
    ["«Что унести»", takeLine],
    ["«## 🔗»", linksLine],
  ].filter(([, i]) => i >= 0);
  for (let i = 1; i < chain.length; i++)
    if (chain[i][1] <= chain[i - 1][1])
      fail(
        "R4 порядок",
        `${chain[i][0]} (строка ${chain[i][1] + 1}) не после ${chain[i - 1][0]} (строка ${chain[i - 1][1] + 1})`
      );
  if (take && linksLine >= 0) {
    const extra = blocks.filter((b) => b.start > take.end && lineOf(b.start) < linksLine);
    if (extra.length)
      fail("R4 порядок", `между «Что унести» и «## 🔗» есть ещё блок algo-mental («${titleOf(extra[0].html)}»)`);
  }

  // R5, R6
  if (full && lines.some((l) => /^## 🧭/.test(l))) {
    if (text.includes("Задача из «📝"))
      fail("R5 «🧭»", "в главе есть «Задача из «📝» — «🧭» выводит приём на задаче первого виджета");
    const h = lines.findIndex((l) => /^## 📝 Разбор задачи/.test(l));
    if (h < 0) fail("R6 «📝»", "нет раздела «## 📝 Разбор задачи»");
    else {
      let i = h + 1;
      while (i < lines.length && !lines[i].trim()) i++;
      const para = [];
      for (; i < lines.length && lines[i].trim(); i++) para.push(lines[i]);
      if (!/\]\(#-откуда-берётся[^)]*\)|href="#-откуда-берётся/.test(para.join("\n")))
        fail("R6 «📝»", "первый абзац «Разбора задачи» не ссылается на «🧭» (якорь #-откуда-берётся…)");
    }
  }
  return errs;
}

// ── самопроверка на встроенных образцах ──────────────────────────────────────

const block = (icon, title, inner) =>
  `<div class="algo-mental">\n  <div class="algo-mental__icon">${icon}</div>\n  <div class="algo-mental__body">\n    <div class="algo-mental__title">${title}</div>\n${inner}\n  </div>\n</div>\n`;

const FINISH = "> 🏁 **Глава сдана выше.** Дальше — расширение.\n\n";

function sampleChapter(o = {}) {
  const zapomni =
    o.zapomni ??
    "    <ul>\n      <li>положи <code>visited</code> при добавлении;</li>\n      <li>слой — это расстояние.</li>\n    </ul>";
  const takeaway =
    o.takeaway ??
    "    <ul>\n      <li><b>Сигнал.</b> «Можно ли дойти».</li>\n      <li><b>Должно быть верно.</b> Вершина помечена до очереди.</li>\n      <li><b>Ломается</b> на весах — тогда Дейкстра.</li>\n    </ul>";
  const first = o.first ?? "Идём по [перебору из «🧭»](#-откуда-берётся-обход-графа-выведем-его-сами) дальше.";
  const intro = o.taskFrom ? "Задача из «📝 Разбора задачи» ниже." : "Текст.";
  const finish = o.noFinish || o.swapOrder || o.finishFirst ? "" : FINISH;
  return [
    "# Граф\n\n",
    o.noZapomni ? "" : block("💡", "Запомни", zapomni) + "\n",
    `## 🧭 Откуда берётся обход: выведем его сами\n\n${intro}\n\n`,
    `## 📝 Разбор задачи\n\n${first}\n\n\`\`\`go\nfunc f() {}\n\`\`\`\n\n`,
    "## 🧩 Задачи\n\n" + (o.finishFirst ? FINISH : "") + "> 🧭 **Не пошла задача из основы?** Проверь пометку.\n\n",
    finish,
    o.noTakeaway ? "" : block("📌", "Что унести", takeaway) + "\n",
    o.extraBlock ? block("🔁", "Вспомни", "    <p>ещё</p>") + "\n" : "",
    o.swapOrder ? FINISH : "",
    "## 🔗 Связанные шаблоны\n\nссылки\n",
  ].join("");
}

function selfTest() {
  const errs = [];
  const good = checkChapter(sampleChapter(), "образец");
  if (good.length) errs.push(`самопроверка: хороший образец покраснел: ${good.join("; ")}`);
  // режим «end»: плохое «Запомни» и нет «🧭»-ссылки, но конец правильный — зелёный; R1 в полном режиме красный
  const endOnly = sampleChapter({ zapomni: "    <ul>" + "<li>а</li>".repeat(4) + "</ul>", first: "Своего перебора здесь нет." });
  const endGood = checkChapter(endOnly, "образец", { mode: "end" });
  if (endGood.length) errs.push(`самопроверка: образец конца в режиме end покраснел: ${endGood.join("; ")}`);
  if (!checkChapter(endOnly, "образец", { mode: "full" }).some((e) => e.includes("R1 «Запомни»")))
    errs.push("самопроверка: плохое «Запомни» в режиме full не поймано правилом R1 «Запомни»");
  const endBad = [
    ["R2 черта", { noFinish: true }],
    ["R3 «Что унести»", { noTakeaway: true }],
    ["R4 порядок", { swapOrder: true }],
  ];
  for (const [rule, opts] of endBad) {
    const got = checkChapter(sampleChapter(opts), "образец", { mode: "end" });
    if (!got.some((e) => e.includes(rule)))
      errs.push(`самопроверка: в режиме end поломка ${JSON.stringify(opts)} не поймана правилом ${rule}`);
  }
  const li3 = "<li><b>Сигнал.</b> а</li><li><b>Должно быть верно.</b> б</li>";
  const lab = (l3) => `    <ul><li><b>Сигнал.</b> а</li><li><b>Должно быть верно.</b> б</li><li>${l3} в</li></ul>`;
  for (const l3 of ["**Ломается**", "<b>Ломается.</b>", "<b>Ломается</b>.", "<b>Ломается</b>"]) {
    const got = checkChapter(sampleChapter({ takeaway: lab(l3) }), "образец");
    if (got.length) errs.push(`самопроверка: метка ${l3} не принята: ${got.join("; ")}`);
  }
  const bad = [
    ["R1 «Запомни»", { zapomni: "    <ul>" + "<li>а</li>".repeat(4) + "</ul>" }],
    ["R1 «Запомни»", { zapomni: "    <ul><li>" + "слово ".repeat(61) + "</li></ul>" }],
    ["R1 «Запомни»", { zapomni: "    <ul><li>условие <code>lo &lt; hi</code></li></ul>" }],
    ["R1 «Запомни»", { zapomni: "    <ul><li>код</li></ul><pre>x</pre>" }],
    ["R1 «Запомни»", { zapomni: "    <ul><li>а</li><li>б</li><li>в</li></ul><p>четвёртое</p>" }],
    ["R1 «Запомни»", { noZapomni: true }],
    ["R2 черта", { noFinish: true }],
    ["R3 «Что унести»", { noTakeaway: true }],
    ["R3 «Что унести»", { takeaway: `    <ul>${li3}</ul>` }],
    ["R3 «Что унести»", { takeaway: `    <ul>${li3}<li><b>Что-то.</b> в</li></ul>` }],
    ["R3 «Что унести»", { takeaway: lab("Ломается") }],
    ["R3 «Что унести»", { takeaway: `    <ul>${li3}<li><b>Ломается</b> ${"слово ".repeat(41)}</li></ul>` }],
    ["R4 порядок", { swapOrder: true }],
    ["R4 порядок", { finishFirst: true }],
    ["R4 порядок", { extraBlock: true }],
    ["R5 «🧭»", { taskFrom: true }],
    ["R6 «📝»", { first: "Своего перебора здесь нет." }],
  ];
  for (const [rule, opts] of bad) {
    const got = checkChapter(sampleChapter(opts), "образец");
    if (!got.some((e) => e.includes(rule)))
      errs.push(`самопроверка: поломка ${JSON.stringify(opts).slice(0, 60)} не поймана правилом ${rule}`);
  }
  return errs;
}

function main() {
  const root = path.resolve(__dirname, "..");
  const args = process.argv.slice(2);
  const oi = args.indexOf("--only");
  const only = oi >= 0 ? args[oi + 1] : null;
  if (oi >= 0 && !only) {
    console.error("check-chapter-shape: после --only нужен слаг главы");
    process.exit(2);
  }
  const endFlag = args.includes("--end");
  if (endFlag && !only) {
    console.error("check-chapter-shape: --end работает только вместе с --only <слаг>");
    process.exit(2);
  }
  const errors = selfTest();
  for (const slug of REBUILT.filter((s) => ENDED.includes(s)))
    errors.push(`src/${slug}.md: слаг «${slug}» одновременно в REBUILT и в ENDED — глава в одном списке`);
  const jobs = only
    ? [[only, endFlag ? "end" : "full"]]
    : [...REBUILT.map((s) => [s, "full"]), ...ENDED.map((s) => [s, "end"])];
  for (const [slug, mode] of jobs) {
    const file = path.join(root, "src", slug + ".md");
    if (!fs.existsSync(file)) {
      errors.push(`src/${slug}.md: файла нет`);
      continue;
    }
    errors.push(...checkChapter(fs.readFileSync(file, "utf8"), `src/${slug}.md`, { mode }));
  }
  if (errors.length) {
    console.error(errors.map((e) => "❌ " + e).join("\n"));
    console.error(`\ncheck-chapter-shape: нарушений ${errors.length}`);
    process.exit(1);
  }
  const rebuilt = jobs.filter(([, m]) => m === "full").map(([s]) => s);
  const ended = jobs.filter(([, m]) => m === "end").map(([s]) => s);
  const list = (a) => (a.length ? " (" + a.join(", ") + ")" : "");
  console.log(
    `✅ check-chapter-shape: перестроенных глав ${rebuilt.length}${list(rebuilt)}, с концом ${ended.length}${list(ended)}, самопроверка на образцах зелёная`
  );
}

module.exports = { REBUILT, ENDED, checkChapter, selfTest, mentalBlocks, titleOf, bodyOf, itemsOf, decode, TAKEAWAY_LABELS, takeawayLabel };
if (require.main === module) main();
