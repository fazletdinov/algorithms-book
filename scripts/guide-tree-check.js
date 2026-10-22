#!/usr/bin/env node
// Смоук дерева решений картинкой (assets/guide-tree.js) на СОБРАННОЙ странице руководства.
//
//   mdbook build && node scripts/guide-tree-check.js
//
// Проверяет:
//   1) число плашек = число названий-листьев в текстовом дереве (тот же разбор, что держит
//      метки в check-registries.js), каждая ведёт на существующую главу из progress.js;
//   2) уровень плашки (рамка) — уровень главы в progress.js;
//   3) группы подвопросов свёрнуты сначала, клик раскрывает, «Развернуть всё» раскрывает все;
//   4) отмеченная пройденной глава получает ✓; наведение на плашку подсвечивает путь к ней;
//   5) «Только ядро» включает режим, где бледнеют главы вне ядра.
// Если jsdom не найден — мягкий пропуск (exit 0), как у остальных смоуков.
"use strict";
const fs = require("fs");
const path = require("path");

let JSDOM, VirtualConsole;
try {
  ({ JSDOM, VirtualConsole } = require("jsdom"));
} catch (e) {
  console.log("⏭  guide-tree-check: jsdom не установлен — пропускаю (npm i jsdom).");
  process.exit(0);
}

const root = path.resolve(__dirname, "..");
const page = path.join(root, "book", "pattern-selection-guide.html");
if (!fs.existsSync(page)) { console.error("✗ guide-tree-check: нет book/pattern-selection-guide.html — сначала mdbook build"); process.exit(1); }
const html = fs.readFileSync(page, "utf8").replace(/<script[\s\S]*?<\/script>/g, "");
const progressJs = fs.readFileSync(path.join(root, "assets", "progress.js"), "utf8");
const treeJs = fs.readFileSync(path.join(root, "assets", "guide-tree.js"), "utf8");
const { parseTree } = require(path.join(root, "assets", "guide-tree.js"));

const errors = [];
const fail = (m) => errors.push(m);
const vc = new VirtualConsole();
vc.on("jsdomError", (e) => fail("jsdomError: " + (e && e.message)));
vc.on("error", (...a) => fail("console.error: " + a.join(" ")));

const dom = new JSDOM(html, { runScripts: "outside-only", virtualConsole: vc, url: "http://localhost/pattern-selection-guide.html" });
const w = dom.window;
w.localStorage.setItem("algoProgress", JSON.stringify({ "sliding-window.html": true }));
w.eval(progressJs);
w.eval(treeJs);
const d = w.document;
d.dispatchEvent(new w.Event("DOMContentLoaded")); // jsdom держит readyState «loading»: виджеты ждут это событие

const host = d.querySelector(".algo-guide-tree");
if (!host || !host.classList.contains("gt")) fail("виджет .algo-guide-tree не построен");
const pre = d.querySelector(".algo-guide-tree ~ details pre, details pre");
const tree = parseTree(pre ? pre.textContent : "");
const want = (function count(n) { return n.kids.reduce((a, k) => a + count(k), n.leaves.length); })(tree);
const leaves = [...host.querySelectorAll(".gt-leaf")];
if (want < 30) fail(`в текстовом дереве разобрано только ${want} листьев`);
if (leaves.length !== want) fail(`плашек ${leaves.length}, листьев в тексте ${want}`);

const chapters = new Map(w.ALGO_CHAPTERS.map((c) => [c.h, c]));
leaves.forEach((a) => {
  const c = chapters.get(a.getAttribute("href"));
  if (!c) return fail(`плашка «${a.textContent}» ведёт на ${a.getAttribute("href")} — такой главы нет`);
  if (!a.classList.contains("gt-leaf--" + c.lvl)) fail(`плашка «${a.textContent}»: рамка не уровня ${c.lvl}`);
});

const groups = [...host.querySelectorAll(".gt-node")].filter((n) => n.querySelector(":scope > .gt-kids > .gt-item > .gt-node"));
if (!groups.length) fail("нет ни одной группы подвопросов");
if (!groups.every((g) => g.classList.contains("gt-node--closed"))) fail("группы подвопросов не свёрнуты сначала");
const gq = groups[0].querySelector(":scope > .gt-q");
if (!/глав/.test(gq.dataset.n || "")) fail(`у свёрнутой группы нет счётчика глав: «${gq.dataset.n}»`);
gq.click();
if (groups[0].classList.contains("gt-node--closed")) fail("клик по группе её не раскрыл");
gq.click();
const fold = [...host.querySelectorAll(".gt-btn")].find((b) => /Развернуть всё/.test(b.textContent));
if (!fold) fail("нет кнопки «Развернуть всё»");
else {
  fold.click();
  if (groups.some((g) => g.classList.contains("gt-node--closed"))) fail("«Развернуть всё» раскрыло не все группы");
  if (fold.textContent !== "Свернуть всё") fail("кнопка не сменилась на «Свернуть всё»");
}

const sw = leaves.find((a) => a.getAttribute("href") === "sliding-window.html");
if (!sw || !sw.classList.contains("gt-leaf--done")) fail("отмеченная глава «Скользящее окно» без ✓");
if (leaves.filter((a) => a.classList.contains("gt-leaf--done")).length !== 1) fail("✓ стоит не только у отмеченной главы");

const deep = leaves.find((a) => a.closest(".gt-kids .gt-kids"));
deep.dispatchEvent(new w.MouseEvent("mouseover", { bubbles: true }));
const lit = host.querySelectorAll(".gt-q.gt-on").length;
if (lit < 2) fail(`наведение на вложенную плашку подсветило ${lit} вопросов, ждали путь из 2`);

const core = [...host.querySelectorAll(".gt-btn")].find((b) => /Только ядро/.test(b.textContent));
core.click();
if (!host.classList.contains("gt--core") || core.getAttribute("aria-pressed") !== "true") fail("«Только ядро» не включилось");

if (errors.length) {
  console.error("✗ guide-tree-check:\n  " + errors.join("\n  "));
  process.exit(1);
}
console.log(`✅ guide-tree-check: ${leaves.length} плашек глав = листьям текстового дерева, уровни из progress.js, ${groups.length} групп свёрнуты и раскрываются, ✓ у пройденной, путь подсвечивается, «Только ядро» работает`);
