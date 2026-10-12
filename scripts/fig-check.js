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
// algo-viz.css). Возможности формата, которых нет в главах, гоняются на образцах.
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
].forEach(([tag, what]) => figs.push({ where: "образец (" + what + ")", tag }));

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
// Дерево целиком — свой разбор, не движка: [{ parent, base, end, sub }] в прямом обходе (в нём же
// движок ставит узлы в DOM). base — метка без «^», «*», «!», «@N» и подписи.
function treeOf(src) {
  const out = [];
  let i = 0;
  (function rd(parent) {
    let lbl = "", sq = 0;
    for (; i < src.length; i++) {
      const c = src[i];
      if (c === "[") sq++;
      if (c === "]") sq--;
      if (!sq && "(),".includes(c)) break;
      lbl += c;
    }
    const raw = lbl.trim(), head = raw.split("|")[0].trim(), me = out.length;
    const sfx = /[*!~]*(@\d+)?$/.exec(head)[0];
    out.push({ parent, base: head.replace(/^\^/, "").slice(0, head.replace(/^\^/, "").length - sfx.length), end: sfx.includes("*"), trail: sfx.includes("~"), sub: raw.includes("|") ? raw.slice(raw.indexOf("|") + 1).trim() : null });
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
  if (!note) behaviour(f, el, trees, bad);
});

// --- подсветка, изменённые рёбра, выноски ---
// Ожидание везде считается по treeOf (свой разбор), а отметки читаются из DOM по классам.
// Ребро опознаётся по геометрии: конец линии — под центром узла-ребёнка (x2 = left, y2 = top − 16).
function behaviour(f, el, trees, bad) {
  const figs = [...el.querySelectorAll(".algo-tp__tfig")];
  const all = [...el.querySelectorAll(".algo-tp__tfignode")];
  const T = trees.map(treeOf), multi = trees.length > 1;
  const nodesOf = figs.map((fg) => [...fg.querySelectorAll(".algo-tp__tfignode")]);
  // линия → «k:родитель-ребёнок» по меткам
  const edgeName = (ln) => {
    const k = figs.findIndex((fg) => fg.contains(ln)), ns = nodesOf[k];
    const c = ns.findIndex((n) => parseFloat(n.style.left) === +ln.getAttribute("x2") && parseFloat(n.style.top) - 16 === +ln.getAttribute("y2"));
    return c < 0 ? `${k}:?` : `${k}:${T[k][T[k][c].parent].base}-${T[k][c].base}`;
  };
  const ix = (xs) => xs.map((x) => all.indexOf(x));
  const got = () => ({
    hl: ix([...el.querySelectorAll(".algo-fig__hl")]),
    path: ix([...el.querySelectorAll(".algo-fig__onpath")]),
    edges: [...el.querySelectorAll(".algo-fig__edge--path")].map(edgeName),
    cells: [...el.querySelectorAll(".algo-fig__cell")].map((c, i) => (c.classList.contains("algo-fig__cell--on") ? i : -1)).filter((i) => i >= 0),
    words: [...el.querySelectorAll(".algo-fig__word")].map((x, i) => (x.classList.contains("algo-fig__word--on") ? i : -1)).filter((i) => i >= 0),
  });
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
      const want = [];
      T.forEach((t2, k2) => t2.forEach((m, j) => { if (m.base === n.base) want.push(all.indexOf(nodesOf[k2][j])); }));
      over(nodesOf[k][i]);
      expectMarks(`наведение на «${n.base}» дерева ${k + 1}`, { hl: want });
      out(nodesOf[k][i]);
      expectClear(`уход с «${n.base}» дерева ${k + 1}`);
    }));
    // изменённые рёбра (только с data-diff): у ребёнка другой родитель, чем в прошлом дереве
    const want = [], diff = /\sdata-diff[\s=>]/.test(f.tag);
    for (let k = 1; diff && k < T.length; k++) {
      const was = {};
      T[k - 1].forEach((n) => { if (n.parent >= 0) was[n.base] = T[k - 1][n.parent].base; });
      T[k].forEach((n) => { if (n.parent >= 0 && was[n.base] !== T[k][n.parent].base) want.push(`${k}:${T[k][n.parent].base}-${n.base}`); });
    }
    const shown = [...el.querySelectorAll(".algo-fig__edge--changed")].map(edgeName);
    if (!sameSet(shown, want)) bad(`изменённые рёбра [${shown}], ждали [${want}]`);
    if (f.tag.includes("data-titles=\"начало; 1) левый поворот x") && !sameSet(shown, ["1:z-y", "1:y-x", "1:x-B", "2:y-z", "2:z-C"])) bad(`LR: изменённые рёбра [${shown}], по учебнику z-y, y-x, x-B; y-z, z-C`);
    if (!!want.length !== !!el.querySelector(".algo-fig__legline--changed")) bad("легенда изменённых рёбер не совпала с их наличием");
  } else {
    const t = T[0], ns = nodesOf[0];
    // слова — от корня до каждого ★
    const words = [];
    t.forEach((n, i) => { if (n.end) words.push({ i, word: [...ancestors(t, i)].reverse().slice(1).map((j) => t[j].base).join("") + n.base }); });
    const shownWords = [...el.querySelectorAll(".algo-fig__word")].map((x) => x.textContent);
    if (shownWords.join(",") !== words.map((x) => x.word).join(",")) bad(`слова [${shownWords}], ждали [${words.map((x) => x.word)}]`);
    if (f.where.startsWith("trie-structure") && shownWords.join(",") !== "cat,car,card,do,dog") bad(`бор: слова [${shownWords}], ждали cat, car, card, do, dog`);
    const rowLen = el.querySelectorAll(".algo-fig__cell").length;
    const want = (i) => {
      const anc = ancestors(t, i), m = rowLen && /^\[(\d+),\s*(\d+)\]$/.exec(t[i].sub || "");
      const cells = [];
      if (m) for (let c = +m[1]; c <= +m[2]; c++) cells.push(c);
      return {
        hl: [all.indexOf(ns[i])], path: anc.map((j) => all.indexOf(ns[j])), cells,
        edges: [i, ...anc].filter((j) => t[j].parent >= 0).map((j) => `0:${t[t[j].parent].base}-${t[j].base}`),
        words: words.map((x, k) => (x.i === i ? k : -1)).filter((k) => k >= 0),
      };
    };
    t.forEach((n, i) => {
      over(ns[i]);
      expectMarks(`наведение на «${n.base}»${n.sub ? " " + n.sub : ""}`, want(i));
      out(ns[i]);
      expectClear(`уход с «${n.base}»`);
    });
    [...el.querySelectorAll(".algo-fig__word")].forEach((x, k) => {
      over(x);
      expectMarks(`наведение на слово «${x.textContent}»`, want(words[k].i));
      out(x);
      expectClear(`уход со слова «${x.textContent}»`);
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

  // клавиатура: в фокусе — по узлу на ключ; фокус = наведение; Esc снимает и дальше не идёт
  const hot = [...el.querySelectorAll(".algo-fig__hot")];
  const key = (x) => x.getAttribute("data-fig-key"), isNode = (x) => x.classList.contains("algo-tp__tfignode");
  if (hot.filter(isNode).length !== all.length) bad("не каждый узел реагирует на наведение");
  const tabs = hot.filter((x) => x.tabIndex === 0), tabNodes = tabs.filter(isNode);
  if (tabNodes.length !== new Set(hot.filter(isNode).map(key)).size || new Set(tabNodes.map(key)).size !== tabNodes.length) bad("в фокус встаёт не ровно по одному узлу на ключ подсветки");
  if (!hot.filter((x) => !isNode(x)).every((x) => x.tabIndex === 0)) bad("слово не встаёт в фокус");
  const first = tabs[0];
  if (!first) return bad("ни один узел не встаёт в фокус");
  first.focus();
  if (!el.classList.contains("algo-fig--lit")) bad("фокус на узле не подсветил его");
  let leaked = 0;
  const spy = () => leaked++;
  doc.addEventListener("keydown", spy);
  first.dispatchEvent(new w.KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
  doc.removeEventListener("keydown", spy);
  if (el.classList.contains("algo-fig--lit")) bad("Esc не снял подсветку");
  if (leaked) bad("Esc с подсвеченного рисунка доплыл до document");
  // касание: закрепляет, уход мыши не снимает, касание мимо — снимает, повтор — снимает
  first.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
  out(first);
  if (!el.classList.contains("algo-fig--lit")) bad("касание не закрепило подсветку");
  doc.body.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
  if (el.classList.contains("algo-fig--lit")) bad("касание мимо рисунка не сняло подсветку");
  first.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
  first.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
  if (el.classList.contains("algo-fig--lit")) bad("повторное касание не сняло подсветку");

  // выноски: широко — выноска с линией, номер и пункт списка скрыты; узко — наоборот
  const calls = [...el.querySelectorAll(".algo-fig__callout")];
  const noted = (trees.join(";").match(/@\d+/g) || []).length;
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
close();

// --- заведомо кривые данные: видимая ошибка вместо пустого блока ---
const broken = [
  ['<div class="algo-fig" data-fig="tree" data-tree="a(b,c"></div>', "незакрытая скобка"],
  ['<div class="algo-fig" data-fig="tree" data-tree="a(b,,c)"></div>', "пустая метка"],
  ['<div class="algo-fig" data-fig="tree" data-tree="a(b,c)" data-row="1,2,3"></div>', "ряд длиннее листьев"],
  ['<div class="algo-fig" data-fig="tree" data-tree="a(b@2,c)" data-notes="одна"></div>', "сноска без текста"],
  ['<div class="algo-fig" data-fig="graph" data-tree="a"></div>', "неизвестный data-fig"],
  ['<div class="algo-fig" data-fig="tree" data-tree="a(b,b); a(b)"></div>', "метка дважды в дереве последовательности"],
  ['<div class="algo-fig" data-fig="tree" data-tree="3|[0,2](1|[0,0],2|[1,1])" data-row="1,2"></div>', "отрезок вне ряда"],
  ['<div class="algo-fig" data-fig="tree" data-tree="a(b(c~))"></div>', "путь «~» с разрывом"],
  ['<div class="algo-fig" data-fig="tree" data-tree="a(b,c)" data-diff></div>', "data-diff у одного дерева"],
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
console.log(`✓ fig-check: ${inChapters} рисунков глав и ${figs.length - inChapters} образца построены, узлы, рёбра, ряды, сноски и подписи сходятся; подсветка (отрезок, путь, слово, та же метка), изменённые рёбра (data-diff), путь «~», подсказка у первого рисунка, фокус/Esc/касание и выноски с откатом ≤ 520px верны; ${broken.length} кривых входа дают видимую ошибку`);
})().catch((e) => { console.error("✗ fig-check упал:", e); process.exit(1); });
