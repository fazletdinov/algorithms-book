#!/usr/bin/env node
// Генератор assets/takeaways.js (запускать из корня: node scripts/gen-takeaways.js).
//
// Источник правды — сами главы: три строки блока «📌 Что унести» (тем же разбором, что
// правило R3 линта check-chapter-shape.js) и разметка <div class="algo-explain" data-key>.
// Результат читает srs.js: из строк строится карточка `ch:`, список «объясни сам» говорит,
// каким главам новых `ch:` не заводить. Руками файл не правится.
//
//   node scripts/gen-takeaways.js          — записать assets/takeaways.js
//   node scripts/gen-takeaways.js --check  — сверить с диском (CI): расхождение — выход 1
//
// Самопроверка (selfTest) идёт всегда, на встроенных образцах.
"use strict";
const fs = require("fs");
const path = require("path");
const { mentalBlocks, titleOf, bodyOf, itemsOf, decode, TAKEAWAY_LABELS } = require("./check-chapter-shape.js");

const root = path.resolve(__dirname, "..");
const OUT = path.join(root, "assets", "takeaways.js");

const HEADER = `/*
 * takeaways.js — три строки «📌 Что унести» глав и главы с «объясни сам» (читает srs.js).
 * СГЕНЕРИРОВАНО: node scripts/gen-takeaways.js. Руками не редактировать: источник правды —
 * блоки «Что унести» и <div class="algo-explain"> в src/*.md. CI: --check.
 */
`;

// HTML или разметка пункта -> простой текст в одну строку
function plain(s) {
  return decode(
    s
      .replace(/<[^>]*>/g, "")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/\*\*|`/g, "")
  )
    .replace(/\s+/g, " ")
    .trim();
}

// Метка с точкой (<b>Сигнал.</b>, <b>Ломается</b>., **Сигнал.**) -> «Метка: остаток»;
// без точки (<b>Ломается</b>, когда…) метка остаётся частью предложения.
function lineText(item, label) {
  const m = item.match(new RegExp(`^(?:<b>${label}(\\.?)</b>|\\*\\*${label}(\\.?)\\*\\*)(\\.?)`, "u"));
  if (!m) throw new Error(`пункт не начинается с метки «${label}»: ${item.slice(0, 40)}`);
  const rest = plain(item.slice(m[0].length));
  if (m[1] || m[2] || m[3]) return `${label}: ${rest}`;
  return `${label}${rest.startsWith(",") ? "" : " "}${rest}`;
}

function takeawaysOf(text) {
  const clean = text.replace(/^```[\s\S]*?^```/gm, (b) => b.replace(/[^\n]/g, " "));
  const take = mentalBlocks(clean).find(
    (b) => /<div class="algo-mental__icon">📌<\/div>/.test(b.html) && titleOf(b.html) === "Что унести"
  );
  if (!take) return null;
  const items = itemsOf(bodyOf(take.html));
  if (items.length !== TAKEAWAY_LABELS.length) throw new Error(`пунктов ${items.length}, нужно ${TAKEAWAY_LABELS.length}`);
  return items.map((it, i) => lineText(it, TAKEAWAY_LABELS[i]));
}

const hasExplain = (text) => /<div class="algo-explain"\s+data-key="[^"]+"/.test(text);

function render(chapters, explain) {
  const body = Object.keys(chapters)
    .sort()
    .map((k) => `    ${JSON.stringify(k)}: [\n${chapters[k].map((l) => "      " + JSON.stringify(l)).join(",\n")}\n    ],\n`)
    .join("");
  return `${HEADER}window.ALGO_TAKEAWAYS = {\n  chapters: {\n${body}  },\n  explain: ${JSON.stringify([...explain].sort())},\n};\n`;
}

function generate() {
  const chapters = {};
  const explain = [];
  const dir = path.join(root, "src");
  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith(".md")).sort()) {
    const text = fs.readFileSync(path.join(dir, f), "utf8");
    const page = f.replace(/\.md$/, ".html");
    let lines;
    try {
      lines = takeawaysOf(text);
    } catch (e) {
      throw new Error(`src/${f}: ${e.message}`);
    }
    if (lines) chapters[page] = lines;
    if (hasExplain(text)) explain.push(page);
  }
  return { out: render(chapters, explain), chapters: Object.keys(chapters).length, explain: explain.length };
}

function selfTest() {
  const errs = [];
  const li = (a, b, c) => `<div class="algo-mental"><div class="algo-mental__icon">📌</div><div class="algo-mental__body">
<div class="algo-mental__title">Что унести</div><ul>
<li>${a}</li><li>${b}</li><li>${c}</li></ul></div></div>`;
  const same = (got, want, what) => {
    if (JSON.stringify(got) !== JSON.stringify(want)) errs.push(`самопроверка (${what}): ${JSON.stringify(got)} вместо ${JSON.stringify(want)}`);
  };
  same(
    takeawaysOf(
      li(
        '<b>Сигнал.</b> Есть <a href="x.md">Дейкстра</a>\n  и <code>visited</code>.',
        "**Должно быть верно.** Если a &lt; b, то &amp; всё.",
        "<b>Ломается</b>, когда веса."
      )
    ),
    ["Сигнал: Есть Дейкстра и visited.", "Должно быть верно: Если a < b, то & всё.", "Ломается, когда веса."],
    "теги, сущности, метки"
  );
  same(
    takeawaysOf(li("<b>Сигнал</b>. а", "<b>Должно быть верно</b> б", "<b>Ломается</b>. в")),
    ["Сигнал: а", "Должно быть верно б", "Ломается: в"],
    "точка после метки"
  );
  if (!hasExplain('<div class="algo-explain" data-key="x"></div>') || hasExplain("<div>")) errs.push("самопроверка: hasExplain");
  return errs;
}

function main() {
  const errs = selfTest();
  if (errs.length) {
    console.error(errs.map((e) => "❌ " + e).join("\n"));
    process.exit(1);
  }
  const { out, chapters, explain } = generate();
  if (process.argv.includes("--check")) {
    const disk = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : null;
    if (disk !== out) {
      console.error("❌ assets/takeaways.js устарел — запусти node scripts/gen-takeaways.js");
      process.exit(1);
    }
    console.log(`✅ gen-takeaways: assets/takeaways.js совпадает с главами (со строками ${chapters}, «объясни сам» ${explain}), самопроверка зелёная`);
    return;
  }
  fs.writeFileSync(OUT, out);
  console.log(`gen-takeaways: assets/takeaways.js записан (глав со строками ${chapters}, «объясни сам» ${explain})`);
}

if (require.main === module) main();
module.exports = { takeawaysOf, hasExplain, render, generate, selfTest };
