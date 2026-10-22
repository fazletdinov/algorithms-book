#!/usr/bin/env node
// Смоук карты курса (assets/course-map-view.js) на СОБРАННОЙ странице введения.
//
//   mdbook build && node scripts/course-map-check.js
//
// Проверяет:
//   1) узлов столько, сколько глав в progress.js без инструментов, каждый ведёт на свою главу,
//      рамка — уровень главы;
//   2) стрелок «стоит на» столько, сколько опор в course-map.js (у обоих концов есть узел);
//   3) ✓ — только у отмеченной главы, «ты здесь» — у первой непройденной главы ядра по маршруту;
//   4) наведение на главу метит её опоры (cm-lean), главы, что на ней стоят (cm-dep), и пары;
//   5) кнопки включают режимы «все главы», «все связи», «путаемые пары».
// В jsdom нет вёрстки: offsetParent подменён «узел в документе», иначе стрелки не рисуются вовсе.
// Если jsdom не найден — мягкий пропуск (exit 0), как у остальных смоуков.
"use strict";
const fs = require("fs");
const path = require("path");

let JSDOM, VirtualConsole;
try {
  ({ JSDOM, VirtualConsole } = require("jsdom"));
} catch (e) {
  console.log("⏭  course-map-check: jsdom не установлен — пропускаю (npm i jsdom).");
  process.exit(0);
}

const root = path.resolve(__dirname, "..");
const page = path.join(root, "book", "index.html");
if (!fs.existsSync(page)) { console.error("✗ course-map-check: нет book/index.html — сначала mdbook build"); process.exit(1); }
const html = fs.readFileSync(page, "utf8").replace(/<script[\s\S]*?<\/script>/g, "");
const read = (f) => fs.readFileSync(path.join(root, "assets", f), "utf8");
const LEANS = require(path.join(root, "assets", "course-map.js"));

const errors = [];
const fail = (m) => errors.push(m);
const vc = new VirtualConsole();
vc.on("jsdomError", (e) => fail("jsdomError: " + (e && e.message)));
vc.on("error", (...a) => fail("console.error: " + a.join(" ")));

const dom = new JSDOM(html, { runScripts: "outside-only", virtualConsole: vc, url: "http://localhost/index.html" });
const w = dom.window;
Object.defineProperty(w.HTMLElement.prototype, "offsetParent", { get() { return this.isConnected ? this.parentNode : null; } });
w.localStorage.setItem("algoProgress", JSON.stringify({ "big-o.html": true }));
w.eval(read("progress.js"));
w.eval(read("pairs.js"));
w.eval(read("course-map.js"));
w.eval(read("course-map-view.js"));
const d = w.document;
d.dispatchEvent(new w.Event("DOMContentLoaded")); // jsdom держит readyState «loading»: виджеты ждут это событие

const host = d.querySelector(".algo-course-map");
if (!host || !host.classList.contains("cm") || !host.__cm) { console.error("✗ course-map-check: карта не построена"); process.exit(1); }
const cm = host.__cm;

const chapters = w.ALGO_CHAPTERS.filter((c) => c.lvl !== "tool");
const nodes = [...host.querySelectorAll(".cm-node")];
if (nodes.length !== chapters.length) fail(`узлов ${nodes.length}, глав без инструментов ${chapters.length}`);
const byHref = new Map(chapters.map((c) => [c.h, c]));
nodes.forEach((a) => {
  const c = byHref.get(a.getAttribute("href"));
  if (!c) return fail(`узел «${a.textContent}» ведёт на ${a.getAttribute("href")} — такой главы нет`);
  if (!a.classList.contains("cm-node--" + c.lvl)) fail(`узел «${a.textContent}»: рамка не уровня ${c.lvl}`);
});

const want = Object.values(LEANS).reduce((n, l) => n + l.length, 0);
const leanEdges = cm.edges.filter((e) => e.kind === "lean");
if (want < 30) fail(`в course-map.js только ${want} опор`);
if (leanEdges.length !== want) fail(`стрелок «стоит на» ${leanEdges.length}, опор в course-map.js ${want}`);
if (!cm.edges.some((e) => e.kind === "pair")) fail("нет ни одной путаемой пары");

const done = nodes.filter((a) => a.classList.contains("cm-node--done"));
if (done.length !== 1 || done[0].dataset.slug !== "big-o") fail("✓ стоит не только у отмеченной «big-o»");
const firstUndone = w.ALGO_CHAPTERS.find((c) => c.lvl === "core" && c.h !== "big-o.html").h.replace(/\.html$/, "");
const here = nodes.filter((a) => a.classList.contains("cm-node--next"));
if (here.length !== 1 || here[0].dataset.slug !== firstUndone) fail(`«ты здесь» не у первой непройденной главы ядра (${firstUndone})`);

// по умолчанию стрелок нет — только у главы под мышью
if (host.querySelectorAll(".cm-edge").length) fail("стрелки нарисованы без наведения");
const slug = "graphs";
nodes.find((a) => a.dataset.slug === slug).dispatchEvent(new w.MouseEvent("mouseover", { bubbles: true }));
const leanOf = LEANS[slug] || [];
const depOf = Object.keys(LEANS).filter((k) => LEANS[k].includes(slug));
leanOf.forEach((s) => { if (!cm.nodes[s].classList.contains("cm-lean")) fail(`опора «${s}» главы ${slug} не подсвечена`); });
depOf.forEach((s) => { if (!cm.nodes[s].classList.contains("cm-dep")) fail(`«${s}» стоит на ${slug}, но не подсвечена`); });
const hot = host.querySelectorAll(".cm-edge[data-hot]").length;
const pairsOf = cm.edges.filter((e) => e.kind === "pair" && (e.from === slug || e.to === slug)).length;
if (hot !== leanOf.length + depOf.length + pairsOf) fail(`у ${slug} горит ${hot} стрелок, ждали ${leanOf.length + depOf.length + pairsOf}`);
host.querySelector(".cm-board").dispatchEvent(new w.MouseEvent("mouseleave"));
if (host.querySelectorAll(".cm-edge").length) fail("после ухода мыши стрелки остались");

const btn = (re) => [...host.querySelectorAll(".cm-btn")].find((b) => re.test(b.textContent));
[[/расширение/, "cm--all"], [/Все связи/, "cm--links"], [/пары/, "cm--pairs"]].forEach(([re, cls]) => {
  const b = btn(re);
  if (!b) return fail(`нет кнопки ${re}`);
  b.click();
  if (!host.classList.contains(cls) || b.getAttribute("aria-pressed") !== "true") fail(`кнопка ${re} не включила ${cls}`);
});
if (host.querySelectorAll(".cm-edge--lean").length !== want) fail("«Все связи» нарисовали не все стрелки");

if (errors.length) {
  console.error("✗ course-map-check:\n  " + errors.join("\n  "));
  process.exit(1);
}
console.log(`✅ course-map-check: ${nodes.length} глав, ${want} стрелок «стоит на» из course-map.js, ✓ и «ты здесь» на местах, наведение на ${slug} — ${hot} связей, кнопки работают`);
