#!/usr/bin/env node
// Headless smoke статических рисунков: каждый <div class="algo-fig"> из src/*.md строится
// в jsdom без ошибки и рисует столько узлов, сколько записано в его data-tree.
//
//   node scripts/fig-check.js
//
// Рисунок заменяет ASCII-схему, и сломанный рисунок — это дыра посреди главы: движок
// показывает «⚠️ Ошибка рисунка», но читатель увидит её только на той странице. Число узлов
// считается здесь НЕЗАВИСИМО от разборщика движка (метки — куски между «(», «,», «)», «;»
// вне квадратных скобок), так что потерянное поддерево или склеенные метки ловятся.
// Заодно сверяются ряд под листьями, сноски, заголовки, стрелки, выделенные узлы и подпись,
// а заведомо кривые данные обязаны дать видимую ошибку, а не пустой блок.
// Если jsdom не найден — мягкий пропуск (exit 0), как в остальных смоуках.
"use strict";
const fs = require("fs");
const path = require("path");

let JSDOM, VirtualConsole;
try {
  ({ JSDOM, VirtualConsole } = require("jsdom"));
} catch (e) {
  console.log("⏭  fig-check: jsdom не установлен — пропускаю (npm i jsdom).");
  process.exit(0);
}

const root = path.resolve(__dirname, "..");
const engine = fs.readFileSync(path.join(root, "assets", "algo-viz.js"), "utf8");
const srcDir = path.join(root, "src");

// Все рисунки глав. Тег целиком в одной строке — иначе регэксп его не увидит, и это
// само по себе ошибка: счётчик class="algo-fig" должен совпасть с найденными тегами.
const figs = [];
let mentioned = 0;
for (const f of fs.readdirSync(srcDir).filter((f) => f.endsWith(".md")).sort()) {
  const text = fs.readFileSync(path.join(srcDir, f), "utf8");
  mentioned += (text.match(/class="algo-fig"/g) || []).length;
  for (const m of text.matchAll(/<div class="algo-fig"[^>]*><\/div>/g)) {
    const line = text.slice(0, m.index).split("\n").length;
    figs.push({ where: f + ":" + line, tag: m[0] });
  }
}

const fails = [];
if (figs.length !== mentioned) fails.push(`class="algo-fig" встречается ${mentioned} раз, а разобранных тегов ${figs.length}: тег должен быть одной строкой <div …></div>`);

const attr = (tag, name) => {
  const m = new RegExp(`\\s${name}="([^"]*)"`).exec(tag);
  return m ? m[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&") : null;
};
const list = (v, sep) => (v ? v.split(sep).map((x) => x.trim()) : []);
// Метки дерева: куски между разделителями вне [...]. Скобки «(» после метки не делают
// новой метки, поэтому пустые куски (после «)») пропускаются.
function labels(tree) {
  const out = [];
  let cur = "", sq = 0;
  for (const c of tree) {
    if (c === "[") sq++;
    if (c === "]") sq--;
    if (sq === 0 && "(),".includes(c)) { if (cur.trim()) out.push(cur.trim()); cur = ""; continue; }
    cur += c;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function render(tags) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => errors.push("jsdomError: " + (e && e.message)));
  vc.on("error", (...a) => errors.push("console.error: " + a.map(String).join(" ")));
  const dom = new JSDOM(
    `<!DOCTYPE html><html><body>${tags.map((t, i) => t.replace("<div ", `<div id="fig${i}" `)).join("\n")}<script>${engine}</script></body></html>`,
    { runScripts: "dangerously", virtualConsole: vc, pretendToBeVisual: true, url: "http://localhost:3000/x.html" }
  );
  const w = dom.window;
  // init() движка ждёт DOMContentLoaded, а в jsdom оно приходит асинхронно.
  return new Promise((done) => {
    const ready = () => setTimeout(() => done({ doc: w.document, errors, close: () => w.close() }), 0);
    if (w.document.readyState === "loading") w.document.addEventListener("DOMContentLoaded", ready);
    else ready();
  });
}

(async () => {
// --- рисунки глав ---
const { doc, errors, close } = await render(figs.map((f) => f.tag));
errors.forEach((e) => fails.push("рендер: " + e));
figs.forEach((f, i) => {
  const el = doc.getElementById("fig" + i), bad = (msg) => fails.push(`${f.where}: ${msg}`);
  if (!el.classList.contains("algo-fig--ready")) return bad("рисунок не построен (нет algo-fig--ready)");
  const note = el.querySelector(".algo-tp__note");
  if (note) return bad("движок показал ошибку: " + note.textContent);
  const trees = list(attr(f.tag, "data-tree"), ";");
  const want = trees.reduce((s, t) => s + labels(t).length, 0);
  const nodes = el.querySelectorAll(".algo-tp__tfignode");
  if (nodes.length !== want) bad(`узлов ${nodes.length}, а в data-tree меток ${want}`);
  // у каждого узла кроме корней — ребро
  const edges = el.querySelectorAll(".algo-tp__bstedge").length;
  if (edges !== want - trees.length) bad(`рёбер ${edges}, ждали ${want - trees.length}`);
  if (el.querySelectorAll(".algo-tp__tfig").length !== trees.length) bad("число деревьев не совпало с data-tree");
  if (el.querySelectorAll(".algo-fig__arrow").length !== trees.length - 1) bad("стрелок между деревьями не trees−1");
  const marks = trees.reduce((s, t) => s + labels(t).filter((l) => /^[^|]*!/.test(l)).length, 0);
  if (el.querySelectorAll(".algo-tp__tnode--current").length !== marks) bad(`выделенных узлов не ${marks}`);
  const ends = trees.reduce((s, t) => s + labels(t).filter((l) => /^[^|]*\*/.test(l)).length, 0);
  if (el.querySelectorAll(".algo-tp__tnode--end").length !== ends) bad(`узлов-концов не ${ends}`);
  const titles = list(attr(f.tag, "data-titles"), ";");
  const shownTitles = [...el.querySelectorAll(".algo-fig__title")].map((t) => t.textContent);
  if (shownTitles.join("|") !== titles.join("|")) bad(`заголовки «${shownTitles.join("; ")}», ждали «${titles.join("; ")}»`);
  const row = list(attr(f.tag, "data-row"), ",");
  const cells = [...el.querySelectorAll(".algo-fig__cell")].map((c) => c.textContent);
  if (cells.join(",") !== row.join(",")) bad(`ряд «${cells}», ждали «${row}»`);
  const notes = list(attr(f.tag, "data-notes"), "||");
  if (el.querySelectorAll(".algo-fig__notes li").length !== notes.length) bad("число сносок не совпало с data-notes");
  const cap = attr(f.tag, "data-caption");
  const shownCap = el.querySelector(".algo-fig__caption");
  if (!cap) bad("нет data-caption: у рисунка в книге должна быть подпись");
  else if (!shownCap || shownCap.textContent !== cap) bad("подпись не из data-caption");
});
close();

// --- заведомо кривые данные: видимая ошибка вместо пустого блока ---
const broken = [
  ['<div class="algo-fig" data-fig="tree" data-tree="a(b,c"></div>', "незакрытая скобка"],
  ['<div class="algo-fig" data-fig="tree" data-tree="a(b,,c)"></div>', "пустая метка"],
  ['<div class="algo-fig" data-fig="tree" data-tree="a(b,c)" data-row="1,2,3"></div>', "ряд длиннее листьев"],
  ['<div class="algo-fig" data-fig="tree" data-tree="a(b@2,c)" data-notes="одна"></div>', "сноска без текста"],
  ['<div class="algo-fig" data-fig="graph" data-tree="a"></div>', "неизвестный data-fig"],
];
const b = await render(broken.map((x) => x[0]));
broken.forEach(([, what], i) => {
  const el = b.doc.getElementById("fig" + i);
  if (!el.querySelector(".algo-tp__note")) fails.push(`кривые данные (${what}) не дали видимой ошибки`);
  if (el.querySelector(".algo-tp__tfig")) fails.push(`кривые данные (${what}) оставили недорисованное дерево`);
});
if (b.errors.length !== broken.length) fails.push(`кривые данные: console.error ${b.errors.length} раз, ждали ${broken.length}`);
b.close();

if (fails.length) {
  console.error("✗ fig-check:\n  " + fails.join("\n  "));
  process.exit(1);
}
console.log(`✓ fig-check: ${figs.length} рисунков построены, узлы, рёбра, ряды, сноски и подписи сходятся; ${broken.length} кривых входа дают видимую ошибку`);
})().catch((e) => { console.error("✗ fig-check упал:", e); process.exit(1); });
