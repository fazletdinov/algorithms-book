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
// Поведение — на каждом узле и слове, ожидание из своего разбора дерева: наведение отмечает
// ровно свой отрезок ряда и путь к корню (одно дерево), ту же метку во всех деревьях
// (последовательность), путь до ★ (слово бора); рёбра «не было на прошлом шаге» (только с
// data-diff) — по сравнению родителей, у LR AVL ещё и списком из учебника; путь «~» — ровно его
// узлы и рёбра, легенда с data-path-label; подсказка «Наведи…» — только у первого рисунка страницы;
// три цвета со смыслом (наведение, изменилось, путь) — разные токены; фокус, Esc (не доходит до
// document), касание; выноски на рамке 521px и откат к номерам и списку на 520px (по стилям
// algo-viz.css). Текст каждого узла — метка своего разбора; пустое место «_» держит сторону
// ребёнка; соседи в ряду не наезжают (ширина по метке); лес (data-forest) — без стрелок, подсветка
// своего дерева. Возможности формата, которых нет в главах, гоняются на образцах.
// Ряды (data-fig="array"), списки ("list"), графы ("graph") и ряд под деревом (data-array +
// data-link) — тем же способом: свой разбор атрибутов, раскладка по grid-row/grid-column (ряды),
// по порядку узлов и стрелок (списки), по центрам вершин (граф); наведение на каждый указатель,
// отрезок, ячейку, узел, подпись, вершину и строку adj — ровно ожидаемые отметки.
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
// Стили нужны выноскам: какие из них видны на узкой рамке, решает CSS по классу --narrow.
const css = fs.readFileSync(path.join(root, "assets", "algo-viz.css"), "utf8");
const srcDir = path.join(root, "src");

// Все рисунки глав. Рисунок узнаётся по классу-токену algo-fig (class="algo-fig wide" — тоже он;
// algo-fig-что-то — нет), где бы class ни стоял в теге. Тег целиком в одной строке — иначе регэксп
// его не увидит, и это само по себе ошибка: счётчик классов должен совпасть с найденными тегами.
const FIG_CLASS = /\bclass="(?:[^"]*\s)?algo-fig(?:\s[^"]*)?"/;
const figs = [];
let mentioned = 0;
for (const f of fs.readdirSync(srcDir).filter((f) => f.endsWith(".md")).sort()) {
  const text = fs.readFileSync(path.join(srcDir, f), "utf8");
  mentioned += (text.match(new RegExp(FIG_CLASS.source, "g")) || []).length;
  for (const m of text.matchAll(/<div\s[^>]*><\/div>/g)) {
    if (!FIG_CLASS.test(m[0])) continue;
    const line = text.slice(0, m.index).split("\n").length;
    figs.push({ where: f + ":" + line, tag: m[0] });
  }
}

const fails = [];
if (figs.length !== mentioned) fails.push(`класс algo-fig встречается ${mentioned} раз, а разобранных тегов ${figs.length}: тег должен быть одной строкой <div …></div>`);
const inChapters = figs.length;
// Цвета со смыслом (решение автора): наведение — зелёный акцент, «изменилось» — янтарь,
// путь «~» — голубой. Три разных токена; правила рёбер берут каждый свой.
{
  const tok = (n) => (new RegExp(`\\.algo-fig \\{[^}]*--${n}:\\s*([^;]+);`).exec(css) || [])[1];
  const ruleUses = (cls, n) => new RegExp(`\\.algo-tp__bstedge\\.${cls} \\{[^}]*stroke: var\\(--${n}\\)`).test(css);
  const [acc, chg, trl] = ["fig-accent", "fig-changed", "fig-trail"].map(tok);
  if (!acc || !chg || !trl || new Set([acc, chg, trl]).size !== 3) fails.push(`токены цвета рисунка: accent ${acc}, changed ${chg}, trail ${trl} — должны быть заданы и различны`);
  if (!/^#fbbf24$/i.test(chg || "")) fails.push(`--fig-changed = ${chg}, ждали янтарь #fbbf24 (как --nn-amber виджетов)`);
  if (!ruleUses("algo-fig__edge--changed", "fig-changed")) fails.push("изменённое ребро красится не --fig-changed");
  if (!ruleUses("algo-fig__edge--trail", "fig-trail")) fails.push("ребро пути «~» красится не --fig-trail");
  if (!ruleUses("algo-fig__edge--path", "fig-accent")) fails.push("ребро подсвеченного пути красится не --fig-accent");
}
// Образцы возможностей формата, которые главы пока не используют (или используют не везде), —
// те же проверки, что у рисунков глав.
[
  ['<div class="algo-fig" data-fig="tree" data-tree="8~(3~(1,6~(4~,7)),10(14))" data-path-label="путь поиска 4" data-caption="образец: путь «~»"></div>', "путь «~»"],
  ['<div class="algo-fig" data-fig="tree" data-tree="y(x,C); x(A,y)" data-caption="образец: последовательность без data-diff"></div>', "последовательность без data-diff"],
  ['<div class="algo-fig" data-fig="list" data-list="a,b!; ; c" data-rows="x; y; z" data-ptrs="p@2:0" data-caption="образец: списки, пустой без nil, указатель в третьем, выделенный узел"></div>', "списки"],
  ['<div class="algo-fig" data-fig="array" data-array="_,4,5!,6" data-index="1" data-ptrs-top="t@2" data-ptrs="b@2,c@4" data-ranges="r@2-3;s@3-4" data-caption="образец: пустое место, плашки сверху и снизу, наложение отрезков"></div>', "ряд"],
  ['<div class="algo-fig" data-fig="tree" data-tree="n\\!(a\\*,[x,y],b!,c\\@1)" data-caption="образец: буквальные ! * @ и метка со скобками"></div>', "экранирование в дереве"],
  ['<div class="algo-fig" data-fig="array" data-array="[1,2],n\\!,x!; \\_@0,a\\@1@1-2,_" data-caption="образец: ячейка [1,2], буквальные ! _ @"></div>', "экранирование в ряду"],
  ['<div class="algo-fig" data-fig="list" data-list="∅; a\\!,b!,[c,d]; \\∅" data-caption="образец: ∅ — пустой список, \\∅ — узел, буквальный !, узел [c,d]"></div>', "экранирование в списке"],
].forEach(([tag, what]) => figs.push({ where: "образец (" + what + ")", tag }));

const attr = (tag, name) => {
  const m = new RegExp(`\\s${name}="([^"]*)"`).exec(tag);
  return m ? m[1].replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&") : null;
};
const list = (v, sep) => (v ? v.split(sep).map((x) => x.trim()) : []);
// «\X» — буквальный знак X: разбор идёт по «единицам» { c, e } (e — экранирован), служебными
// бывают только неэкранированные знаки.
const units = (s) => { const u = []; for (let i = 0; i < s.length; i++) u.push(s[i] === "\\" ? { c: s[++i], e: true } : { c: s[i], e: false }); return u; };
const raw = (u) => u.map((x) => (x.e ? "\\" : "") + x.c).join("");
const txt = (u) => u.map((x) => x.c).join("");
const is = (x, c) => x && !x.e && c.includes(x.c);
function trimU(u) { let a = 0, b = u.length; while (a < b && is(u[a], " ")) a++; while (b > a && is(u[b - 1], " ")) b--; return u.slice(a, b); }
// деление по sep вне «[…]» (экранированный sep и скобки не в счёт); куски — в исходной записи
function splitTop(s, sep) {
  if (s == null || s === "") return [];
  const out = [], u = units(s);
  let cur = [], d = 0;
  for (const x of u) {
    if (is(x, "[")) d++;
    if (is(x, "]")) d--;
    if (is(x, sep) && !d) { out.push(raw(trimU(cur))); cur = []; continue; }
    cur.push(x);
  }
  out.push(raw(trimU(cur)));
  return out;
}
// метка дерева → { base, sfx, stub, note, sub, gap }: «^» спереди, суффиксы «*!~», «@N», подпись
// после первого «|» вне «[…]»; база — хотя бы один знак (как «.+?» разбора движка)
function parseLabel(s) {
  const u = trimU(units(s));
  let bar = -1, d = 0;
  u.forEach((x, k) => { if (is(x, "[")) d++; else if (is(x, "]")) d--; else if (bar < 0 && is(x, "|") && !d) bar = k; });
  const head = trimU(bar < 0 ? u : u.slice(0, bar)), sub = bar < 0 ? null : txt(trimU(u.slice(bar + 1)));
  const gap = head.length === 1 && is(head[0], "_");
  let a = 0, b = head.length, note = 0, sfx = "";
  const stub = is(head[0], "^");
  if (stub) a = 1;
  let j = b;
  while (j > a && !head[j - 1].e && /\d/.test(head[j - 1].c)) j--;
  if (j < b && j - 1 > a && is(head[j - 1], "@")) { note = +txt(head.slice(j, b)); b = j - 1; }
  while (b > a + 1 && is(head[b - 1], "*!~")) { sfx = head[b - 1].c + sfx; b--; }
  return { base: txt(head.slice(a, b)), sfx, stub, note, sub, gap };
}
// атрибут без значения (data-diff, data-forest)
const flag = (tag, name) => new RegExp(`\\s${name}[\\s=>]`).test(tag);
// Метки дерева: куски между разделителями вне [...]. Скобки «(» после метки не делают
// новой метки, поэтому пустые куски (после «)») пропускаются. «_» — пустое место, не узел.
function labels(tree) {
  const out = [];
  let cur = [], sq = 0;
  for (const x of units(tree)) {
    if (is(x, "[")) sq++;
    if (is(x, "]")) sq--;
    if (sq === 0 && is(x, "(),")) { const r = raw(trimU(cur)); if (r) out.push(r); cur = []; continue; }
    cur.push(x);
  }
  const r = raw(trimU(cur));
  if (r) out.push(r);
  return out.filter((l) => !parseLabel(l).gap);
}
// Дерево целиком — свой разбор, не движка: [{ parent, base, end, trail, gap, sub }] в прямом обходе
// (в нём же движок ставит узлы в DOM; пустых мест «_» в DOM нет). base — метка без «^», «*», «!»,
// «~», «@N» и подписи; подпись — после первого «|» вне «[…]».
function treeOf(src) {
  const out = [];
  let i = 0;
  (function rd(parent) {
    let lbl = "", sq = 0;
    for (; i < src.length; i++) {
      const c = src[i];
      if (c === "\\") { lbl += c + src[++i]; continue; }
      if (c === "[") sq++;
      if (c === "]") sq--;
      if (!sq && "(),".includes(c)) break;
      lbl += c;
    }
    const L = parseLabel(lbl), me = out.length;
    out.push({ parent, base: L.base, gap: L.gap, end: L.sfx.includes("*"), mark: L.sfx.includes("!"), trail: L.sfx.includes("~"), sub: L.sub });
    if (src[i] !== "(") return;
    i++;
    for (;;) { rd(me); if (src[i++] === ")") return; }
  })(-1);
  return out;
}
const ancestors = (t, i) => { const a = []; for (let p = t[i].parent; p >= 0; p = t[p].parent) a.push(p); return a; };
const sameSet = (a, b) => a.length === b.length && [...a].sort().join("|") === [...b].sort().join("|");

function render(tags) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => errors.push("jsdomError: " + (e && e.message)));
  vc.on("error", (...a) => errors.push("console.error: " + a.map(String).join(" ")));
  const dom = new JSDOM(
    `<!DOCTYPE html><html><head><style>${css}</style></head><body>${tags.map((t, i) => t.replace("<div ", `<div id="fig${i}" `)).join("\n")}<script>${engine}</script></body></html>`,
    { runScripts: "dangerously", virtualConsole: vc, pretendToBeVisual: true, url: "http://localhost:3000/x.html" }
  );
  const w = dom.window;
  // init() движка ждёт DOMContentLoaded, а в jsdom оно приходит асинхронно.
  return new Promise((done) => {
    const ready = () => setTimeout(() => done({ w, doc: w.document, errors, close: () => w.close() }), 0);
    if (w.document.readyState === "loading") w.document.addEventListener("DOMContentLoaded", ready);
    else ready();
  });
}

(async () => {
// --- рисунки глав ---
const { w, doc, errors, close } = await render(figs.map((f) => f.tag));
errors.forEach((e) => fails.push("рендер: " + e));
// подсказка «Наведи на узел…» — только у первого рисунка страницы (здесь все рисунки на одной)
const hints = [...doc.querySelectorAll(".algo-fig__hint")];
if (hints.length !== 1 || !doc.getElementById("fig0").contains(hints[0])) fails.push(`подсказок «Наведи…» ${hints.length}, ждали одну — у первого рисунка страницы`);
figs.forEach((f, i) => {
  const el = doc.getElementById("fig" + i), bad = (msg) => fails.push(`${f.where}: ${msg}`);
  if (!el.classList.contains("algo-fig--ready")) return bad("рисунок не построен (нет algo-fig--ready)");
  const note = el.querySelector(".algo-tp__note");
  if (note) return bad("движок показал ошибку: " + note.textContent);
  const cap = attr(f.tag, "data-caption");
  const shownCap = el.querySelector(".algo-fig__caption");
  if (!cap) bad("нет data-caption: у рисунка в книге должна быть подпись");
  else if (!shownCap || shownCap.textContent !== cap) bad("подпись не из data-caption");
  const kind = attr(f.tag, "data-fig");
  if (kind === "array") checkArray(f, el, bad);
  else if (kind === "list") checkList(f, el, bad);
  else if (kind === "graph") checkGraph(f, el, bad);
  else if (kind !== "tree") bad(`вид «${kind}» проверкой не покрыт`);
  if (kind !== "tree") return keyboard(el, bad, false);
  const trees = splitTop(attr(f.tag, "data-tree"), ";").filter(Boolean);
  const want = trees.reduce((s, t) => s + labels(t).length, 0);
  const nodes = el.querySelectorAll(".algo-tp__tfignode");
  if (nodes.length !== want) bad(`узлов ${nodes.length}, а в data-tree меток ${want}`);
  // у каждого узла кроме корней — ребро
  const edges = el.querySelectorAll(".algo-tp__bstedge").length;
  if (edges !== want - trees.length) bad(`рёбер ${edges}, ждали ${want - trees.length}`);
  if (el.querySelectorAll(".algo-tp__tfig").length !== trees.length) bad("число деревьев не совпало с data-tree");
  const forest = flag(f.tag, "data-forest");
  if (el.querySelectorAll(".algo-fig__arrow").length !== (forest ? 0 : trees.length - 1)) bad(forest ? "у леса есть стрелки" : "стрелок между деревьями не trees−1");
  const marks = trees.reduce((s, t) => s + labels(t).filter((l) => parseLabel(l).sfx.includes("!")).length, 0);
  if (el.querySelectorAll(".algo-tp__tnode--current").length !== marks) bad(`выделенных узлов не ${marks}`);
  const ends = trees.reduce((s, t) => s + labels(t).filter((l) => parseLabel(l).sfx.includes("*")).length, 0);
  if (el.querySelectorAll(".algo-tp__tnode--end").length !== ends) bad(`узлов-концов не ${ends}`);
  const titles = list(attr(f.tag, "data-titles"), ";");
  const shownTitles = [...el.querySelectorAll(".algo-fig__title")].map((t) => t.textContent);
  if (shownTitles.join("|") !== titles.join("|")) bad(`заголовки «${shownTitles.join("; ")}», ждали «${titles.join("; ")}»`);
  const row = list(attr(f.tag, "data-row"), ",");
  const cells = [...el.querySelectorAll(".algo-fig__cell")].map((c) => c.textContent);
  if (cells.join(",") !== row.join(",")) bad(`ряд «${cells}», ждали «${row}»`);
  const notes = list(attr(f.tag, "data-notes"), "||");
  if (el.querySelectorAll(".algo-fig__notes li").length !== notes.length) bad("число сносок не совпало с data-notes");
  behaviour(f, el, trees, bad);
});

// --- подсветка, изменённые рёбра, выноски ---
// Ожидание везде считается по treeOf (свой разбор), а отметки читаются из DOM по классам.
// Ребро опознаётся по геометрии: конец линии — под центром узла-ребёнка (x2 = left, y2 = top − 16).
function behaviour(f, el, trees, bad) {
  const figs = [...el.querySelectorAll(".algo-tp__tfig")];
  const all = [...el.querySelectorAll(".algo-tp__tfignode")];
  const T = trees.map(treeOf), forest = flag(f.tag, "data-forest"), multi = trees.length > 1 && !forest;
  // узлы DOM по индексам своего разбора; у пустого места «_» узла нет (null)
  const nodesOf = figs.map((fg, k) => {
    const dom = [...fg.querySelectorAll(".algo-tp__tfignode")];
    return T[k].map((n) => (n.gap ? null : dom.shift()));
  });
  // линия → «k:родитель-ребёнок» по меткам
  const edgeName = (ln) => {
    const k = figs.findIndex((fg) => fg.contains(ln)), ns = nodesOf[k];
    const c = ns.findIndex((n) => n && parseFloat(n.style.left) === +ln.getAttribute("x2") && parseFloat(n.style.top) - 16 === +ln.getAttribute("y2"));
    return c < 0 ? `${k}:?` : `${k}:${T[k][T[k][c].parent].base}-${T[k][c].base}`;
  };
  // пустое место держит сторону: «a(_,b)» — b правее a, «a(b,_)» — левее
  T.forEach((t, k) => t.forEach((n, i) => {
    if (!n.gap) return;
    const sib = t.findIndex((m, j) => j !== i && m.parent === n.parent && !m.gap);
    if (sib < 0) return;
    const px = parseFloat(nodesOf[k][n.parent].style.left), sx = parseFloat(nodesOf[k][sib].style.left);
    if (sib > i ? !(sx > px) : !(sx < px)) bad(`«_» не удержал сторону: «${t[sib].base}» ${sib > i ? "правый" : "левый"} ребёнок «${t[n.parent].base}», а стоит ${sx > px ? "правее" : sx < px ? "левее" : "под ним"}`);
    // на целую колонку (узкая колонка — 52px), а не на половину: сторону видно сразу
    else if (Math.abs(sx - px) < 52) bad(`«_»: «${t[sib].base}» отстоит от «${t[n.parent].base}» на ${Math.abs(sx - px)}px — меньше колонки`);
  }));
  // текст узла — метка своего разбора (★ у конца слова): «|» внутри «[…]» — часть метки
  T.forEach((t, k) => t.forEach((n, i) => {
    if (n.gap) return;
    const want = n.base + (n.end ? " ★" : ""), shown = nodesOf[k][i].firstChild ? nodesOf[k][i].firstChild.textContent : "";
    if (shown !== want) bad(`узел «${shown}», ждали «${want}»`);
  }));
  // соседи в ряду не наезжают: у jsdom нет вёрстки — ширину узла считаем по метке, как замерено в
  // Chrome на собранной книге: «[3,2,1]» в выделенном узле — 98px, то есть до 11px на символ
  // вместе с полями и рамкой (берём 11 на символ + 21); зазор между узлами — хотя бы 4px
  T.forEach((t, k) => {
    const rows = {};
    t.forEach((n, i) => { if (!n.gap) { const el2 = nodesOf[k][i]; (rows[el2.style.top] = rows[el2.style.top] || []).push({ x: parseFloat(el2.style.left), w: (n.base.length + (n.end ? 2 : 0)) * 11 + 21, n }); } });
    Object.values(rows).forEach((r) => {
      r.sort((a, b) => a.x - b.x);
      for (let q = 1; q < r.length; q++) {
        if (r[q].x - r[q - 1].x < (r[q].w + r[q - 1].w) / 2 + 4) bad(`узлы «${r[q - 1].n.base}» и «${r[q].n.base}» наезжают: центры в ${r[q].x - r[q - 1].x}px`);
      }
    });
  });
  const ix = (xs) => xs.map((x) => all.indexOf(x));
  const got = () => ({
    hl: ix([...el.querySelectorAll(".algo-fig__hl")]),
    path: ix([...el.querySelectorAll(".algo-fig__onpath")]),
    edges: [...el.querySelectorAll(".algo-fig__edge--path")].map(edgeName),
    cells: [...el.querySelectorAll(".algo-fig__cell")].map((c, i) => (c.classList.contains("algo-fig__cell--on") ? i : -1)).filter((i) => i >= 0),
    words: [...el.querySelectorAll(".algo-fig__word")].map((x, i) => (x.classList.contains("algo-fig__word--on") ? i : -1)).filter((i) => i >= 0),
    acells: [...el.querySelectorAll(".algo-fig__acell")].map((x, i) => (x.classList.contains("algo-fig__cell--on") ? i : -1)).filter((i) => i >= 0),
    aux: [...el.querySelectorAll(".algo-fig__aux--on")].map(descOf(el)),
  });
  // ряд массива под деревом (data-array + data-link): ячейка c — узел с подписью «[c]» или меткой «c»
  const arr = attr(f.tag, "data-array"), link = attr(f.tag, "data-link"), linkOf = {};
  if (arr != null) {
    const vals = list(arr, ","), acells = [...el.querySelectorAll(".algo-fig__acell")];
    if (acells.map((x) => x.textContent).join(",") !== vals.join(",")) bad(`ряд под деревом «${acells.map((x) => x.textContent)}», ждали «${vals}»`);
    const idx = [...el.querySelectorAll(".algo-fig__idx")].map((x) => x.textContent).join(",");
    if (idx !== vals.map((v, c) => c).join(",")) bad(`номера ряда «${idx}»`);
    const lab = [...el.querySelectorAll(".algo-fig__rowlab")].map((x) => x.textContent).join("|");
    if (lab !== (attr(f.tag, "data-array-label") || "")) bad(`подпись ряда «${lab}»`);
    vals.forEach((v, c) => T.forEach((t, k) => t.forEach((n, i) => {
      if (!n.gap && (link === "index" ? n.sub === `[${c}]` : n.base === String(c))) linkOf[k + ":" + i] = c;
    })));
    if (Object.keys(linkOf).length !== vals.length) bad(`связей узел—ячейка ${Object.keys(linkOf).length}, ячеек ${vals.length}`);
  }
  const over = (x) => x.dispatchEvent(new w.MouseEvent("mouseover", { bubbles: true }));
  const out = (x) => x.dispatchEvent(new w.MouseEvent("mouseout", { bubbles: true, relatedTarget: doc.body }));
  const expectMarks = (what, want) => {
    const g = got();
    for (const key of Object.keys(g)) {
      const a = g[key].map(String), b = (want[key] || []).map(String);
      if (!sameSet(a, b)) bad(`${what}: ${key} = [${a}], ждали [${b}]`);
    }
    if (!el.classList.contains("algo-fig--lit")) bad(`${what}: рисунок не помечен --lit`);
  };
  const expectClear = (what) => {
    const g = got();
    if (Object.values(g).some((v) => v.length) || el.classList.contains("algo-fig--lit")) bad(`${what}: подсветка не снята`);
  };

  if (multi) {
    // узел — та же метка во всех деревьях
    T.forEach((t, k) => t.forEach((n, i) => {
      if (n.gap) return;
      const want = [];
      T.forEach((t2, k2) => t2.forEach((m, j) => { if (!m.gap && m.base === n.base) want.push(all.indexOf(nodesOf[k2][j])); }));
      over(nodesOf[k][i]);
      expectMarks(`наведение на «${n.base}» дерева ${k + 1}`, { hl: want });
      out(nodesOf[k][i]);
      expectClear(`уход с «${n.base}» дерева ${k + 1}`);
    }));
    // изменённые рёбра (только с data-diff): у ребёнка другой родитель, чем в прошлом дереве
    const want = [], diff = flag(f.tag, "data-diff");
    for (let k = 1; diff && k < T.length; k++) {
      const was = {};
      T[k - 1].forEach((n) => { if (n.parent >= 0 && !n.gap) was[n.base] = T[k - 1][n.parent].base; });
      T[k].forEach((n) => { if (n.parent >= 0 && !n.gap && was[n.base] !== T[k][n.parent].base) want.push(`${k}:${T[k][n.parent].base}-${n.base}`); });
    }
    const shown = [...el.querySelectorAll(".algo-fig__edge--changed")].map(edgeName);
    if (!sameSet(shown, want)) bad(`изменённые рёбра [${shown}], ждали [${want}]`);
    if (f.tag.includes("data-titles=\"начало; 1) левый поворот x") && !sameSet(shown, ["1:z-y", "1:y-x", "1:x-B", "2:y-z", "2:z-C"])) bad(`LR: изменённые рёбра [${shown}], по учебнику z-y, y-x, x-B; y-z, z-C`);
    if (!!want.length !== !!el.querySelector(".algo-fig__legline--changed")) bad("легенда изменённых рёбер не совпала с их наличием");
  } else {
    // одно дерево или лес: каждое дерево подсвечивается само по себе
    if (forest) {
      const seen = {};
      T.forEach((t) => t.forEach((n) => { if (!n.gap) { if (seen[n.base]) bad(`лес: «${n.base}» в двух деревьях`); seen[n.base] = 1; } }));
    }
    // слова — от корня до каждого ★, по деревьям подряд
    const words = [];
    T.forEach((t, k) => t.forEach((n, i) => { if (n.end) words.push({ k, i, word: [...ancestors(t, i)].reverse().slice(1).map((j) => t[j].base).join("") + n.base }); }));
    const shownWords = [...el.querySelectorAll(".algo-fig__word")].map((x) => x.textContent);
    if (shownWords.join(",") !== words.map((x) => x.word).join(",")) bad(`слова [${shownWords}], ждали [${words.map((x) => x.word)}]`);
    if (f.where.startsWith("trie-structure") && shownWords.join(",") !== "cat,car,card,do,dog") bad(`бор: слова [${shownWords}], ждали cat, car, card, do, dog`);
    const rowLen = el.querySelectorAll(".algo-fig__cell").length;
    const want = (k, i) => {
      const t = T[k], ns = nodesOf[k], anc = ancestors(t, i), m = k === 0 && rowLen && /^\[(\d+),\s*(\d+)\]$/.exec(t[i].sub || "");
      const cells = [];
      if (m) for (let c = +m[1]; c <= +m[2]; c++) cells.push(c);
      return {
        hl: [all.indexOf(ns[i])], path: anc.map((j) => all.indexOf(ns[j])), cells,
        edges: [i, ...anc].filter((j) => t[j].parent >= 0).map((j) => `${k}:${t[t[j].parent].base}-${t[j].base}`),
        words: words.map((x, q) => (x.k === k && x.i === i ? q : -1)).filter((q) => q >= 0),
        acells: linkOf[k + ":" + i] != null ? [linkOf[k + ":" + i]] : [],
      };
    };
    T.forEach((t, k) => t.forEach((n, i) => {
      if (n.gap) return;
      over(nodesOf[k][i]);
      expectMarks(`наведение на «${n.base}»${n.sub ? " " + n.sub : ""}${forest ? " дерева " + (k + 1) : ""}`, want(k, i));
      out(nodesOf[k][i]);
      expectClear(`уход с «${n.base}»`);
    }));
    [...el.querySelectorAll(".algo-fig__word")].forEach((x, q) => {
      over(x);
      expectMarks(`наведение на слово «${x.textContent}»`, want(words[q].k, words[q].i));
      out(x);
      expectClear(`уход со слова «${x.textContent}»`);
    });
    // ячейка ряда — та же подсветка, что у её узла
    const acells = [...el.querySelectorAll(".algo-fig__acell")];
    Object.entries(linkOf).forEach(([ki, c]) => {
      const [k, i] = ki.split(":").map(Number);
      over(acells[c]);
      expectMarks(`наведение на ячейку ${c} ряда под деревом`, want(k, i));
      out(acells[c]);
      expectClear(`уход с ячейки ${c}`);
    });
  }

  // путь «~»: узлы с «~» и рёбра в них — ровно они; легенда — с подписью data-path-label
  const trailWant = [], trailNodes = [];
  T.forEach((t, k) => t.forEach((n, i) => {
    if (!n.trail) return;
    trailNodes.push(all.indexOf(nodesOf[k][i]));
    if (n.parent >= 0) trailWant.push(`${k}:${t[n.parent].base}-${n.base}`);
  }));
  const trailShown = [...el.querySelectorAll(".algo-fig__edge--trail")].map(edgeName);
  if (!sameSet(trailShown, trailWant)) bad(`рёбра пути [${trailShown}], ждали [${trailWant}]`);
  if (!sameSet(ix([...el.querySelectorAll(".algo-fig__trail")]).map(String), trailNodes.map(String))) bad("узлы пути «~» не совпали с разметкой");
  const trailLeg = el.querySelector(".algo-fig__legline--trail");
  if (!!trailNodes.length !== !!trailLeg) bad("легенда пути не совпала с наличием «~»");
  else if (trailLeg && trailLeg.nextSibling.textContent !== (attr(f.tag, "data-path-label") || "путь поиска")) bad(`подпись пути «${trailLeg.nextSibling.textContent}»`);

  keyboard(el, bad, true);

  // выноски: широко — выноска с линией, номер и пункт списка скрыты; узко — наоборот
  const calls = [...el.querySelectorAll(".algo-fig__callout")];
  const noted = trees.reduce((n, t) => n + labels(t).filter((l) => parseLabel(l).note > 0).length, 0); // «\\@1» — не сноска
  if (calls.length !== noted) bad(`выносок ${calls.length}, а ссылок @N ${noted}`);
  if (!calls.length) return;
  const scroll = el.querySelector(".algo-fig__scroll"), shown = (x) => w.getComputedStyle(x).display !== "none";
  const at = (px) => { Object.defineProperty(scroll, "clientWidth", { value: px, configurable: true }); el.__algoFigLayout(); };
  const marks = [...el.querySelectorAll(".algo-fig__mark")], items = [...el.querySelectorAll(".algo-fig__notes li")];
  at(521);
  if (el.classList.contains("algo-fig--narrow")) bad("рамка 521px считается узкой");
  if (!calls.every(shown) || marks.some(shown) || items.some(shown)) bad("широко: видны не выноски, а номера/список");
  if (el.querySelectorAll(".algo-fig__leaders line").length !== calls.length) bad("широко: линий выносок не столько, сколько выносок");
  at(520);
  if (!el.classList.contains("algo-fig--narrow")) bad("рамка 520px не считается узкой");
  if (calls.some(shown) || !marks.every(shown) || !items.every(shown)) bad("узко (≤ 520px): выноски не уступили номерам и списку под рисунком");
  at(0); // скрытая рамка режим не меняет
  if (!el.classList.contains("algo-fig--narrow")) bad("рамка шириной 0 сбросила режим");
}

// --- общее для всех видов: имена элементов, отметки, клавиатура ---
// Элемент рисунка → «вид:номер» среди элементов своего вида (номер — порядок в документе).
function descOf(el) {
  const kinds = [["node", ".algo-tp__tfignode"], ["acell", ".algo-fig__acell"], ["lnode", ".algo-fig__lnode"], ["v", "circle.algo-viz__gnode"],
    ["e", "line.algo-viz__gedge"], ["ptr", ".algo-fig__ptr"], ["range", ".algo-fig__range"], ["row", ".algo-fig__rowlab"], ["idx", ".algo-fig__idx"],
    ["arrow", ".algo-fig__larrow"], ["adj", ".algo-fig__adjrow"], ["word", ".algo-fig__word"], ["cell", ".algo-fig__cell"]];
  const map = new Map();
  kinds.forEach(([p, sel]) => [...el.querySelectorAll(sel)].forEach((x, i) => map.set(x, p + ":" + i)));
  return (x) => map.get(x) || "?" + (x && x.getAttribute ? x.getAttribute("class") : x);
}
// функция, а не константа: объявления ниже цикла по рисункам, а зовутся из него
function marks() { return { hl: "algo-fig__hl", path: "algo-fig__onpath", edges: "algo-fig__edge--path", cells: "algo-fig__cell--on", aux: "algo-fig__aux--on", words: "algo-fig__word--on" }; }
function marksOf(el) {
  const d = descOf(el), g = {};
  Object.entries(marks()).forEach(([k, c]) => { g[k] = [...el.querySelectorAll("." + c)].map(d); });
  return g;
}
function hover(x) { x.dispatchEvent(new w.MouseEvent("mouseover", { bubbles: true })); }
function unhover(x) { x.dispatchEvent(new w.MouseEvent("mouseout", { bubbles: true, relatedTarget: doc.body })); }
// Наведение на x зажигает ровно want (по видам отметок, имена — descOf), уход — снимает всё.
function expectHover(el, bad, x, what, want) {
  const d = descOf(el), W = {};
  Object.keys(marks()).forEach((k) => { W[k] = (want[k] || []).map((y) => (typeof y === "string" ? y : d(y))); });
  hover(x);
  const g = marksOf(el);
  Object.keys(marks()).forEach((k) => { if (!sameSet(g[k], W[k])) bad(`${what}: ${k} = [${g[k]}], ждали [${W[k]}]`); });
  if (!el.classList.contains("algo-fig--lit")) bad(`${what}: рисунок не помечен --lit`);
  unhover(x);
  if (Object.values(marksOf(el)).some((v) => v.length) || el.classList.contains("algo-fig--lit")) bad(`${what}: уход не снял подсветку`);
}
// Клавиатура, касание и имя — одинаковы для всех видов. У рисунка одна остановка Tab — сам рисунок
// (role="figure", tabindex 0, имя — подпись через aria-labelledby); его узлы до входа вне обхода
// (tabindex −1). Enter на рисунке — вход: узлы data-fig-tab встают в обход, фокус — на первом и
// подсвечивает его; у каждого ключа подсветки есть такой узел (у дерева — ровно один на ключ).
// ←/→ ни на рисунке, ни на узле не перехватываются (их листает mdBook). Esc на узле — выход:
// подсветка снята, фокус на рисунке, узлы снова вне обхода, до document не доходит. Касание
// закрепляет, касание мимо и повтор — снимают. Подсказка «Наведи…» — aria-hidden.
function keyboard(el, bad, isTree) {
  const hot = [...el.querySelectorAll(".algo-fig__hot")];
  const key = (x) => x.getAttribute("data-fig-key"), isTabbed = (x) => x.getAttribute("tabindex") === "0";
  const tabs = hot.filter((x) => x.hasAttribute("data-fig-tab"));
  const press = (x, k) => { let leaked = 0; const spy = () => leaked++; doc.addEventListener("keydown", spy); x.dispatchEvent(new w.KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true })); doc.removeEventListener("keydown", spy); return leaked > 0; };
  if (!hot.length) return bad("на рисунке нечего наводить");
  // имя и одна остановка Tab
  if (el.getAttribute("role") !== "figure") bad("нет role=figure");
  if (el.getAttribute("tabindex") !== "0") bad("рисунок не встаёт в обход Tab");
  const cap = el.querySelector(".algo-fig__caption");
  if (!cap || !cap.id || el.getAttribute("aria-labelledby") !== cap.id) bad("имя рисунка (aria-labelledby) — не его подпись");
  if (hot.some(isTabbed)) bad("узлы рисунка в обходе Tab до входа: остановка должна быть одна — сам рисунок");
  if (!tabs.every((x) => x.getAttribute("tabindex") === "-1")) bad("узел обхода внутри рисунка не фокусируем (tabindex −1)");
  if (!sameSet([...new Set(hot.map(key))], [...new Set(tabs.map(key))])) bad("не у каждого ключа подсветки есть узел для клавиатуры");
  const hint = el.querySelector(".algo-fig__hint");
  if (hint && hint.getAttribute("aria-hidden") !== "true") bad("подсказка «Наведи…» не aria-hidden");
  [...el.querySelectorAll("circle.algo-viz__gnode")].forEach((c, i) => { if (!/^вершина /.test(c.getAttribute("aria-label") || "")) bad(`у вершины ${i} нет aria-label`); });
  if (isTree) {
    const isNode = (x) => x.classList.contains("algo-tp__tfignode"), nodes = el.querySelectorAll(".algo-tp__tfignode");
    if (hot.filter(isNode).length !== nodes.length) bad("не каждый узел реагирует на наведение");
    const tabNodes = tabs.filter(isNode);
    if (tabNodes.length !== new Set(hot.filter(isNode).map(key)).size || new Set(tabNodes.map(key)).size !== tabNodes.length) bad("в обходе не ровно по одному узлу на ключ подсветки");
    if (!hot.filter((x) => x.classList.contains("algo-fig__word")).every((x) => x.hasAttribute("data-fig-tab"))) bad("слово не в обходе клавиатуры");
  }
  const first = tabs[0];
  if (!first) return bad("в рисунок не войти с клавиатуры");
  el.focus();
  if (!press(el, "ArrowRight") || !press(el, "ArrowLeft")) bad("←/→ на рисунке перехвачены — mdBook не перелистнёт главу");
  if (press(el, "Enter")) bad("Enter (вход в рисунок) доплыл до document");
  if (doc.activeElement !== first) bad("Enter не перевёл фокус на первый узел");
  if (!tabs.every(isTabbed)) bad("после входа узлы не встали в обход Tab");
  if (!el.classList.contains("algo-fig--lit")) bad("фокус на узле не подсветил его");
  if (!press(first, "ArrowRight") || !press(first, "ArrowLeft")) bad("←/→ на узле перехвачены — mdBook не перелистнёт главу");
  if (press(first, "Escape")) bad("Esc с узла доплыл до document");
  if (el.classList.contains("algo-fig--lit")) bad("Esc не снял подсветку");
  if (doc.activeElement !== el) bad("Esc не вернул фокус на рисунок");
  if (tabs.some(isTabbed)) bad("после выхода узлы остались в обходе Tab");
  if (!press(el, "Escape")) bad("контроль: Esc без подсветки и без входа должен идти дальше");
  // уход фокуса из рисунка — тоже выход
  press(el, "Enter");
  el.dispatchEvent(new w.FocusEvent("focusout", { bubbles: true, relatedTarget: doc.body }));
  if (tabs.some(isTabbed)) bad("фокус ушёл из рисунка, а узлы остались в обходе Tab");
  first.blur(); el.blur();
  first.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
  unhover(first);
  if (!el.classList.contains("algo-fig--lit")) bad("касание не закрепило подсветку");
  doc.body.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
  if (el.classList.contains("algo-fig--lit")) bad("касание мимо рисунка не сняло подсветку");
  first.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
  first.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
  if (el.classList.contains("algo-fig--lit")) bad("повторное касание не сняло подсветку");
}

// --- ряд / таблица (data-fig="array") ---
// Свой разбор атрибутов, раскладка сверяется по grid-row/grid-column элементов: ячейки, номера,
// плашки и отрезки стоят в колонке своей позиции; ряды по порядку; отрезки одного уровня не
// наезжают; столбики — высотой по значению (180px у самого высокого).
function parseArray(tag) {
  const ix = attr(tag, "data-index"), base = ix === "none" ? null : ix ? +ix : 0, b0 = base || 0;
  // ячейка: «_» — пусто; неэкранированные «!» и «@a-b» в конце; «[1,2]» — одна ячейка
  const rows = splitTop(attr(tag, "data-array"), ";").map((r) => splitTop(r, ",").map((t) => {
    const u = units(t);
    if (u.length === 1 && is(u[0], "_")) return { gap: true };
    let b = u.length, lo = null, hi = null;
    const tail = /@(\d+)(?:-(\d+))?$/.exec(t);
    if (tail && is(u[u.length - tail[0].length], "@")) { lo = +tail[1] - b0; hi = (tail[2] != null ? +tail[2] : +tail[1]) - b0; b -= tail[0].length; }
    const mark = b > 1 && is(u[b - 1], "!");
    if (mark) b--;
    return { v: txt(u.slice(0, b)), mark, lo, hi };
  }));
  const ptr = (v, top) => list(v, ",").filter(Boolean).map((s) => ({ name: s.slice(0, s.lastIndexOf("@")).trim(), c: +s.slice(s.lastIndexOf("@") + 1) - b0, top }));
  const ranges = list(attr(tag, "data-ranges"), ";").filter(Boolean).map((s) => {
    const at = s.lastIndexOf("@"), m = /^(\d+)(?:-(\d+))?$/.exec(s.slice(at + 1));
    return { label: s.slice(0, at).trim(), a: +m[1] - b0, b: (m[2] != null ? +m[2] : +m[1]) - b0 };
  });
  return { base, b0, rows, n: Math.max(...rows.map((r) => r.length)), rowLabels: list(attr(tag, "data-rows"), ";"), idxLabel: attr(tag, "data-index-label") || "",
    tops: ptr(attr(tag, "data-ptrs-top"), true), bots: ptr(attr(tag, "data-ptrs"), false), ranges, bars: flag(tag, "data-bars") };
}
function checkArray(f, el, bad) {
  const A = parseArray(f.tag), R = A.rows.length;
  const lab = A.rowLabels.some(Boolean) || !!A.idxLabel, off = lab ? 2 : 1;
  let line = 1;
  const topRow = A.tops.length ? line++ : null;
  let idxRow = R > 1 && A.base !== null ? line++ : null;
  const dataRow = A.rows.map(() => line++);
  if (R === 1 && A.base !== null) idxRow = line++;
  const botRow = A.bots.length ? line++ : null, rangeRow0 = line;
  const at = (x) => [x.style.gridRow, x.style.gridColumn].join(" | ");
  // колонки позиций — равной ширины (широкая плашка не делает ряд неровным)
  const cols = el.querySelector(".algo-fig__grid").style.gridTemplateColumns, wantCols = (lab ? "auto " : "") + `repeat(${A.n}, minmax(var(--fig-col), 1fr))`;
  if (cols !== wantCols) bad(`колонки сетки «${cols}», ждали «${wantCols}»`);
  // ячейки: в документе — по рядам, пустые места «_» пропущены
  const dom = [...el.querySelectorAll(".algo-fig__acell")], cellAt = A.rows.map(() => []);
  let q = 0;
  const max = Math.max(...A.rows[0].filter((t) => !t.gap).map((t) => parseFloat(t.v)));
  A.rows.forEach((r, ri) => r.forEach((t, c) => {
    if (t.gap) { cellAt[ri][c] = null; return; }
    const x = dom[q++];
    cellAt[ri][c] = x;
    if (!x) return bad(`ячейки ${ri}:${c} нет`);
    if (x.textContent !== t.v) bad(`ячейка ${ri}:${c} «${x.textContent}», ждали «${t.v}»`);
    if (at(x) !== `${dataRow[ri]} | ${off + c}`) bad(`ячейка «${t.v}» (${ri}:${c}) стоит в ${at(x)}, ждали ${dataRow[ri]} | ${off + c}`);
    if (x.classList.contains("algo-tp__big--found") !== t.mark) bad(`ячейка «${t.v}» (${ri}:${c}): выделение «!» не совпало`);
    if (A.bars && Math.abs(parseFloat(x.style.height) - parseFloat(t.v) / max * 180) > 0.01) bad(`столбик «${t.v}» высотой ${x.style.height}, ждали ${parseFloat(t.v) / max * 180}px`);
  }));
  if (q !== dom.length) bad(`ячеек ${dom.length}, а непустых в data-array ${q}`);
  // подписи рядов и номера позиций
  const labs = [...el.querySelectorAll(".algo-fig__rowlab:not(.algo-fig__rowlab--idx)")];
  const wantLabs = A.rowLabels.map((l, ri) => (l ? `${l} @ ${dataRow[ri]} | 1` : null)).filter(Boolean);
  if (labs.map((x) => `${x.textContent} @ ${at(x)}`).join(" ; ") !== wantLabs.join(" ; ")) bad(`подписи рядов [${labs.map((x) => x.textContent + " @ " + at(x))}], ждали [${wantLabs}]`);
  const idx = [...el.querySelectorAll(".algo-fig__idx")];
  const wantIdx = A.base === null ? [] : Array.from({ length: A.n }, (_, c) => `${c + A.base} @ ${idxRow} | ${off + c}`);
  if (idx.map((x) => `${x.textContent} @ ${at(x)}`).join(" ; ") !== wantIdx.join(" ; ")) bad(`номера [${idx.map((x) => x.textContent + " @ " + at(x))}], ждали [${wantIdx}]`);
  const idxLab = el.querySelector(".algo-fig__rowlab--idx");
  if ((idxLab ? idxLab.textContent : "") !== (A.base === null ? "" : A.idxLabel)) bad("подпись номеров не из data-index-label");
  // плашки: в колонке своей позиции, над рядом (сверху) или под номерами (снизу)
  const ptrEls = [...el.querySelectorAll(".algo-fig__ptr")], ptrEl = {};
  const all = A.tops.concat(A.bots);
  if (ptrEls.length !== all.length) bad(`плашек ${ptrEls.length}, а указателей ${all.length}`);
  all.forEach((p) => {
    const x = ptrEls.find((y) => y.textContent === p.name && y.classList.contains(p.top ? "algo-nn__tag--hi" : "algo-nn__tag--lo"));
    if (!x) return bad(`нет плашки «${p.name}»`);
    ptrEl[p.name + (p.top ? "^" : "_")] = x;
    if (at(x.parentNode) !== `${p.top ? topRow : botRow} | ${off + p.c}`) bad(`плашка «${p.name}» стоит в ${at(x.parentNode)}, ждали ${p.top ? topRow : botRow} | ${off + p.c}`);
  });
  // отрезки: колонка a, ширина b−a+1, под всем; на одном уровне не наезжают
  const rgEls = [...el.querySelectorAll(".algo-fig__range")];
  if (rgEls.length !== A.ranges.length) bad(`отрезков ${rgEls.length}, ждали ${A.ranges.length}`);
  const byRow = {};
  A.ranges.forEach((r, k) => {
    const x = rgEls[k];
    if (!x) return;
    if (x.textContent !== r.label) bad(`отрезок «${x.textContent}», ждали «${r.label}»`);
    if (x.style.gridColumn !== `${off + r.a} / span ${r.b - r.a + 1}`) bad(`отрезок «${r.label}» по колонкам ${x.style.gridColumn}, ждали ${off + r.a} / span ${r.b - r.a + 1}`);
    if (+x.style.gridRow < rangeRow0) bad(`отрезок «${r.label}» в ряду ${x.style.gridRow} — выше рядов данных и плашек`);
    (byRow[x.style.gridRow] = byRow[x.style.gridRow] || []).forEach((o) => { if (!(r.b < o.a || r.a > o.b)) bad(`отрезки «${o.label}» и «${r.label}» на одном уровне наезжают`); });
    byRow[x.style.gridRow].push(r);
  });
  // подсветка: указатель → своя ячейка; отрезок → его ячейки; ячейка → свои плашки, отрезки,
  // подпись ряда, номер и (при «@a-b») ячейки первого ряда
  all.forEach((p) => {
    const x = ptrEl[p.name + (p.top ? "^" : "_")];
    if (x) expectHover(el, bad, x, `наведение на указатель «${p.name}»`, { cells: [cellAt[0][p.c]], aux: [x] });
  });
  A.ranges.forEach((r, k) => {
    const cells = [];
    for (let c = r.a; c <= r.b; c++) if (cellAt[0][c]) cells.push(cellAt[0][c]);
    if (rgEls[k]) expectHover(el, bad, rgEls[k], `наведение на отрезок «${r.label}»`, { cells, aux: [rgEls[k]] });
  });
  A.rows.forEach((r, ri) => r.forEach((t, c) => {
    const x = cellAt[ri][c];
    if (!x) return;
    const cells = [x], aux = [];
    if (t.lo != null) for (let y = t.lo; y <= t.hi; y++) cells.push(cellAt[0][y]);
    const rl = A.rowLabels[ri] ? labs[A.rowLabels.slice(0, ri + 1).filter(Boolean).length - 1] : null;
    if (rl) aux.push(rl);
    if (A.base !== null) aux.push(idx[c]);
    if (ri === 0) {
      all.forEach((p) => { if (p.c === c) aux.push(ptrEl[p.name + (p.top ? "^" : "_")]); });
      A.ranges.forEach((rg, k) => { if (rg.a <= c && c <= rg.b) aux.push(rgEls[k]); });
    }
    expectHover(el, bad, x, `наведение на ячейку «${t.v}» (${ri}:${c})`, { cells, aux });
  }));
}

// --- список (data-fig="list") ---
function checkList(f, el, bad) {
  // пусто или неэкранированное «∅» — пустой список; «\!» в конце — буквальный знак, не выделение
  const lists = splitTop(attr(f.tag, "data-list"), ";").map((s) => (s && s !== "∅" ? splitTop(s, ",") : []));
  const labels = list(attr(f.tag, "data-rows"), ";"), end = /\sdata-end[\s=>]/.test(f.tag) ? attr(f.tag, "data-end") || "" : "nil";
  const ptrs = list(attr(f.tag, "data-ptrs"), ",").filter(Boolean).map((s) => { const m = /^(.+)@(?:(\d+):)?(\d+)$/.exec(s); return { name: m[1].trim(), r: m[2] != null ? +m[2] : 0, i: +m[3] }; });
  const rows = [...el.querySelectorAll(".algo-fig__lrow")];
  if (rows.length !== lists.length) return bad(`списков ${rows.length}, ждали ${lists.length}`);
  const nodeAt = [], arrowAt = [], labAt = [];
  lists.forEach((vals, r) => {
    const row = rows[r], nodes = [...row.querySelectorAll(".algo-fig__lnode")], arrows = [...row.querySelectorAll(".algo-fig__larrow")];
    nodeAt.push(nodes); arrowAt.push(arrows);
    const node = (v) => { const u = units(v), m = u.length > 1 && is(u[u.length - 1], "!"); return { t: txt(m ? u.slice(0, -1) : u), mark: m }; };
    const want = vals.map((v) => node(v).t);
    if (nodes.map((x) => x.textContent).join("|") !== want.join("|")) bad(`список ${r + 1}: узлы «${nodes.map((x) => x.textContent)}», ждали «${want}»`);
    vals.forEach((v, i) => { if (nodes[i] && nodes[i].classList.contains("algo-tp__llnode--found") !== node(v).mark) bad(`список ${r + 1}, узел ${i}: выделение «!» не совпало`); });
    const wantArrows = vals.length ? vals.length - 1 + (end ? 1 : 0) : 0;
    if (arrows.length !== wantArrows) bad(`список ${r + 1}: стрелок ${arrows.length}, ждали ${wantArrows}`);
    // стрелка i стоит сразу за узлом i
    arrows.forEach((a, i) => { const prev = a.previousElementSibling; if (!prev || !prev.contains(nodes[i])) bad(`список ${r + 1}: стрелка ${i} не за узлом ${i}`); });
    const endEl = row.querySelector(".algo-fig__lend");
    if ((endEl ? endEl.textContent : "") !== (vals.length ? end : "")) bad(`список ${r + 1}: конец «${endEl ? endEl.textContent : ""}», ждали «${vals.length ? end : ""}»`);
    if (!!row.querySelector(".algo-fig__empty") !== !vals.length) bad(`список ${r + 1}: пометка пустого списка ∅ не совпала`);
    const lab = row.querySelector(".algo-fig__rowlab");
    labAt.push(lab);
    if ((lab ? lab.textContent : "") !== (labels[r] || "")) bad(`список ${r + 1}: подпись «${lab ? lab.textContent : ""}», ждали «${labels[r] || ""}»`);
  });
  const ptrEls = [...el.querySelectorAll(".algo-fig__ptr")];
  if (ptrEls.length !== ptrs.length) bad(`плашек ${ptrEls.length}, ждали ${ptrs.length}`);
  ptrs.forEach((p) => {
    const x = ptrEls.find((y) => y.textContent === p.name), node = nodeAt[p.r] && nodeAt[p.r][p.i];
    if (!x || !node) return bad(`указатель «${p.name}» не нарисован над узлом ${p.r}:${p.i}`);
    if (!x.closest(".algo-fig__lslot") || !x.closest(".algo-fig__lslot").contains(node)) bad(`плашка «${p.name}» не над узлом ${p.r}:${p.i}`);
    expectHover(el, bad, x, `наведение на указатель «${p.name}»`, { cells: [node], aux: [x] });
  });
  // узел — путь до него от головы: узлы 0…i и стрелки между ними; подпись — весь список
  nodeAt.forEach((nodes, r) => {
    nodes.forEach((x, i) => expectHover(el, bad, x, `наведение на узел ${r}:${i}`, { cells: nodes.slice(0, i + 1), aux: arrowAt[r].slice(0, i) }));
    if (labAt[r]) expectHover(el, bad, labAt[r], `наведение на подпись «${labAt[r].textContent}»`, { cells: nodes, aux: [labAt[r]] });
  });
}

// --- граф (data-fig="graph") ---
// Вершины и рёбра — против своего разбора; ребро — отрезок между центрами своих вершин; список
// смежности — в порядке главы (по рёбрам, в обе стороны); наведение — вершина, её рёбра, соседи.
function checkGraph(f, el, bad) {
  const labelsG = list(attr(f.tag, "data-nodes"), ","), at = {};
  labelsG.forEach((l, i) => (at[l] = i));
  const edges = list(attr(f.tag, "data-edges"), ",").filter(Boolean).map((e) => e.split("-").map((x) => at[x.trim()]));
  const circles = [...el.querySelectorAll("circle.algo-viz__gnode")], lines = [...el.querySelectorAll("line.algo-viz__gedge")];
  const texts = [...el.querySelectorAll("text.algo-viz__gtext")].map((t) => t.textContent);
  if (texts.join(",") !== labelsG.join(",")) bad(`вершины «${texts}», ждали «${labelsG}»`);
  if (circles.length !== labelsG.length) bad(`кругов ${circles.length}, вершин ${labelsG.length}`);
  if (lines.length !== edges.length) return bad(`линий ${lines.length}, рёбер ${edges.length}`);
  edges.forEach(([a, b], k) => {
    const ln = lines[k], ca = circles[a], cb = circles[b];
    if (!ca || !cb) return bad(`ребро ${k}: нет вершины`);
    if (ln.getAttribute("x1") !== ca.getAttribute("cx") || ln.getAttribute("y1") !== ca.getAttribute("cy") || ln.getAttribute("x2") !== cb.getAttribute("cx") || ln.getAttribute("y2") !== cb.getAttribute("cy")) bad(`ребро ${labelsG[a]}-${labelsG[b]} не соединяет свои вершины`);
  });
  const adj = labelsG.map(() => []);
  edges.forEach(([a, b]) => { adj[a].push(b); adj[b].push(a); });
  const rows = [...el.querySelectorAll(".algo-fig__adjrow")], withAdj = flag(f.tag, "data-adj");
  const wantRows = withAdj ? labelsG.map((l, i) => `adj[${l}] = [${adj[i].map((j) => labelsG[j]).join(", ")}]`) : [];
  if (rows.map((x) => x.textContent).join(" ; ") !== wantRows.join(" ; ")) bad(`список смежности [${rows.map((x) => x.textContent)}], ждали [${wantRows}]`);
  labelsG.forEach((l, i) => {
    const want = { hl: [circles[i]], path: [...new Set(adj[i])].map((j) => circles[j]), edges: lines.filter((_, k) => edges[k].includes(i)), aux: withAdj ? [rows[i]] : [] };
    expectHover(el, bad, circles[i], `наведение на вершину ${l}`, want);
    if (withAdj) expectHover(el, bad, rows[i], `наведение на строку adj[${l}]`, want);
  });
}
close();

// --- заведомо кривые данные: видимая ошибка вместо пустого блока ---
const broken = [
  ['<div class="algo-fig" data-fig="tree" data-tree="a(b,c"></div>', "незакрытая скобка"],
  ['<div class="algo-fig" data-fig="tree" data-tree="a(b,,c)"></div>', "пустая метка"],
  ['<div class="algo-fig" data-fig="tree" data-tree="a(b,c)" data-row="1,2,3"></div>', "ряд длиннее листьев"],
  ['<div class="algo-fig" data-fig="tree" data-tree="a(b@2,c)" data-notes="одна"></div>', "сноска без текста"],
  ['<div class="algo-fig" data-fig="table" data-tree="a"></div>', "неизвестный data-fig"],
  ['<div class="algo-fig" data-fig="tree" data-tree="a(b,b); a(b)"></div>', "метка дважды в дереве последовательности"],
  ['<div class="algo-fig" data-fig="tree" data-tree="3|[0,2](1|[0,0],2|[1,1])" data-row="1,2"></div>', "отрезок вне ряда"],
  ['<div class="algo-fig" data-fig="tree" data-tree="a(b(c~))"></div>', "путь «~» с разрывом"],
  ['<div class="algo-fig" data-fig="tree" data-tree="a(b,c)" data-diff></div>', "data-diff у одного дерева"],
  ['<div class="algo-fig" data-fig="tree" data-tree="a(_(b),c)"></div>', "у пустого места «_» есть дети"],
  ['<div class="algo-fig" data-fig="tree" data-tree="_"></div>', "корень — пустое место"],
  ['<div class="algo-fig" data-fig="tree" data-tree="a(b)" data-forest></div>', "лес из одного дерева"],
  ['<div class="algo-fig" data-fig="tree" data-tree="a(b); c(b)" data-forest></div>', "элемент дважды в лесу"],
  ['<div class="algo-fig" data-fig="array" data-array="1,2; 3@0-5"></div>', "ряд: «@a-b» вне первого ряда"],
  ['<div class="algo-fig" data-fig="array" data-array="1,2" data-ptrs="i@9"></div>', "ряд: указатель вне ряда"],
  ['<div class="algo-fig" data-fig="array" data-array="_,1" data-ptrs="i@0"></div>', "ряд: указатель на пустое место"],
  ['<div class="algo-fig" data-fig="array" data-array="1@0"></div>', "ряд: «@» в первом ряду"],
  ['<div class="algo-fig" data-fig="array" data-array="1,2; 3,4" data-bars></div>', "ряд: столбики в два ряда"],
  ['<div class="algo-fig" data-fig="array" data-array="a,2" data-bars></div>', "ряд: столбик не числом"],
  ['<div class="algo-fig" data-fig="array" data-array="1,2" data-ranges="r@1-0"></div>', "ряд: отрезок задом наперёд"],
  ['<div class="algo-fig" data-fig="tree" data-tree="a(b)" data-array="1,2"></div>', "ряд под деревом без data-link"],
  ['<div class="algo-fig" data-fig="tree" data-tree="1|[0](2|[1])" data-array="5,6,7" data-link="index"></div>', "ряд под деревом: ячейке нет узла"],
  ['<div class="algo-fig" data-fig="tree" data-tree="0(1,2)" data-array="0,0" data-link="label"></div>', "ряд под деревом: узлов больше ячеек"],
  ['<div class="algo-fig" data-fig="list" data-list="1,2" data-ptrs="h@5"></div>', "список: указатель мимо узлов"],
  ['<div class="algo-fig" data-fig="list" data-list="1,,2"></div>', "список: пустой узел"],
  ['<div class="algo-fig" data-fig="graph" data-nodes="a,b" data-edges="a-c"></div>', "граф: ребро к несуществующей вершине"],
  ['<div class="algo-fig" data-fig="graph" data-nodes="a,a" data-edges=""></div>', "граф: вершина дважды"],
  ['<div class="algo-fig" data-fig="tree" data-tree="a!!"></div>', "дерево: суффикс «!!»"],
  ['<div class="algo-fig" data-fig="tree" data-tree="r(^^a)"></div>', "дерево: «^» дважды"],
  ['<div class="algo-fig" data-fig="tree" data-tree="a[b(c)"></div>', "дерево: незакрытая «[»"],
  ['<div class="algo-fig" data-fig="tree" data-tree="a(b\\x)"></div>', "дерево: экранирован обычный знак"],
  ['<div class="algo-fig" data-fig="array" data-array="x!!"></div>', "ряд: «!!»"],
  ['<div class="algo-fig" data-fig="array" data-array="1,[2"></div>', "ряд: незакрытая «[»"],
  ['<div class="algo-fig" data-fig="array" data-array="1,2]"></div>', "ряд: лишняя «]»"],
  ['<div class="algo-fig" data-fig="list" data-list="a!!"></div>', "список: «!!»"],
];
const b = await render(broken.map((x) => x[0]));
broken.forEach(([, what], i) => {
  const el = b.doc.getElementById("fig" + i);
  if (!el.querySelector(".algo-tp__note")) fails.push(`кривые данные (${what}) не дали видимой ошибки`);
  if (el.querySelector(".algo-tp__tfig")) fails.push(`кривые данные (${what}) оставили недорисованное дерево`);
});
if (b.errors.length !== broken.length) fails.push(`кривые данные: console.error ${b.errors.length} раз, ждали ${broken.length}`);
b.close();

// --- подсказка «Наведи…»: у первого построенного и видимого рисунка страницы ---
// Кривой рисунок и рисунок в свёрнутом <details> её не забирают; свёрнуто всё — у первого построенного.
{
  const t = (tree) => `<div class="algo-fig" data-fig="tree" data-tree="${tree}" data-caption="${tree}"></div>`;
  const where = async (tags, want, what) => {
    const h = await render(tags);
    const hints = [...h.doc.querySelectorAll(".algo-fig__hint")];
    if (hints.length !== 1 || !h.doc.getElementById("fig" + want).contains(hints[0])) fails.push(`подсказка (${what}): ${hints.length} шт., ждали одну у рисунка ${want}`);
    h.close();
  };
  await where([t("a(b"), "<details><summary>s</summary>" + t("c(d)") + "</details>", t("e(f)")], 2, "кривой первый, второй в свёрнутом details");
  await where(["<details><summary>s</summary>" + t("a(b)") + "</details>", "<details><summary>s</summary>" + t("c(d)") + "</details>"], 0, "все в свёрнутых details");
  await where(["<details open><summary>s</summary>" + t("a(b)") + "</details>", t("c(d)")], 0, "открытый details");
}

// --- повторная раскладка (ширина рамки, догруженный шрифт) падает — видимая ошибка, а не тишина ---
{
  const r2 = await render(['<div class="algo-fig" data-fig="tree" data-tree="a(b)" data-caption="x"></div>']);
  const el = r2.doc.getElementById("fig0");
  Object.defineProperty(el.querySelector(".algo-fig__scroll"), "clientWidth", { get() { throw new Error("сбой раскладки"); }, configurable: true });
  el.__algoFigLayout();
  if (!el.querySelector(".algo-tp__note") || el.querySelector(".algo-tp__tfig")) fails.push("сбой повторной раскладки не дал видимой ошибки");
  if (el.hasAttribute("role") || el.hasAttribute("tabindex")) fails.push("рисунок с ошибкой раскладки остался в обходе Tab с role=figure");
  if (r2.errors.length !== 1) fails.push(`сбой повторной раскладки: console.error ${r2.errors.length} раз, ждали 1`);
  el.__algoFigLayout(); // второй раз — уже ничего не делает
  if (r2.errors.length !== 1) fails.push("после ошибки раскладки рисунок пытается раскладываться снова");
  r2.close();
}

if (fails.length) {
  console.error("✗ fig-check:\n  " + fails.join("\n  "));
  process.exit(1);
}
console.log(`✓ fig-check: ${inChapters} рисунков глав и ${figs.length - inChapters} образца построены, узлы, рёбра, ряды, сноски и подписи сходятся; подсветка (отрезок, путь, слово, та же метка), изменённые рёбра (data-diff), путь «~», лес, сторона у «_» на целую колонку, тексты узлов и зазоры в рядах; ряды, таблицы, столбики, списки и графы — раскладка и подсветка каждого элемента; подсказка у первого рисунка, фокус/Esc/касание и выноски с откатом ≤ 520px верны; ${broken.length} кривых входа дают видимую ошибку`);
})().catch((e) => { console.error("✗ fig-check упал:", e); process.exit(1); });
