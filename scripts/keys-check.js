#!/usr/bin/env node
// Headless smoke: клавиши, которые обработал виджет, не должны доходить до mdBook.
//
//   node scripts/keys-check.js
//
// mdBook листает главы по ← / → обработчиком на document и НЕ смотрит
// defaultPrevented (chapterNavigation в его book.js). Поэтому виджет, который
// только вызывал preventDefault, делал шаг И уводил на соседнюю главу — с первого
// же естественного нажатия. Мышью это не видно, и обычный рендер-смоук этого не
// ловил: он проверяет, что шаг сделан, а не куда ещё ушло событие.
//
// Здесь роль mdBook играет слушатель на document, который, как и mdBook,
// реагирует на всё, что до него доплыло. Проверяются три места, где ← / →
// нужны самому виджету: пошаговая визуализация (algo-viz.js), трасса кода
// читателя (trace-viz.js) и редактор runner'а (runner.js — CodeMirror 6 это
// contenteditable div, и mdBook не считает его полем ввода).
// Если jsdom не найден — мягкий пропуск (exit 0), как в остальных смоуках.
"use strict";
const fs = require("fs");
const path = require("path");

let JSDOM, VirtualConsole;
try {
  ({ JSDOM, VirtualConsole } = require("jsdom"));
} catch (e) {
  console.log("⏭  keys-check: jsdom не установлен — пропускаю (npm i jsdom).");
  process.exit(0);
}

const root = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, "assets", f), "utf8");

const errors = [];
const vc = new VirtualConsole();
vc.on("jsdomError", (e) => errors.push("jsdomError: " + (e && e.message)));
vc.on("error", (...a) => errors.push("console.error: " + a.join(" ")));

// Реальные атрибуты виджета из главы, а не выдуманные: если глава поменяется,
// смоук проверит то, что читатель увидит.
const chapter = fs.readFileSync(path.join(root, "src", "sliding-window.md"), "utf8");
const vizTag = (chapter.match(/<div class="algo-viz" data-viz="sliding-window-fixed"[^>]*><\/div>/) || [])[0];
if (!vizTag) { console.error("✗ keys-check: в sliding-window.md не найден виджет sliding-window-fixed"); process.exit(1); }

const dom = new JSDOM(
  `<!DOCTYPE html><html><body>
     ${vizTag.replace("<div ", '<div id="viz" ')}
     <div id="trace"></div>
     <div class="algo-runner" data-pkg="slidingwindow"></div>
     <script>${read("algo-viz.js")}</script>
     <script>${read("trace-viz.js")}</script>
     <script>${read("runner.js")}</script>
   </body></html>`,
  { runScripts: "dangerously", virtualConsole: vc, pretendToBeVisual: true, url: "http://localhost:3000/sliding-window.html" }
);
const w = dom.window, doc = w.document;
// jsdom не прокручивает; трасса зовёт scrollIntoView на активной строке кода.
if (!w.Element.prototype.scrollIntoView) w.Element.prototype.scrollIntoView = function () {};

// Двойник chapterNavigation из mdBook: всё, что доплыло до document, — «листание».
const leaked = [];
doc.addEventListener("keydown", (e) => leaked.push(e.key));

function press(target, key) {
  leaked.length = 0;
  target.dispatchEvent(new w.KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
  return leaked.length > 0;
}

setTimeout(() => {
  const fails = [];
  const expect = (ok, msg) => { if (!ok) fails.push(msg); };

  // 1. Пошаговая визуализация.
  const viz = doc.getElementById("viz");
  const counter = () => (viz.querySelector(".algo-viz__counter") || {}).textContent;
  expect(viz.classList.contains("algo-viz--ready"), "algo-viz: виджет не построился");
  const c0 = counter();
  expect(!press(viz, "ArrowRight"), "algo-viz: → доплыла до document — mdBook перелистнёт главу");
  expect(counter() !== c0, `algo-viz: → не сделала шаг (счётчик «${c0}» не изменился)`);
  for (const k of ["ArrowLeft", "Home", "End", " ", "f", "Escape"]) {
    expect(!press(viz, k), `algo-viz: «${k}» доплыла до document`);
  }
  // Контроль самой проверки: необработанная клавиша ОБЯЗАНА доплыть — иначе
  // слушатель-двойник ничего не ловит и все проверки выше пусты.
  expect(press(viz, "x"), "algo-viz: контроль — необработанная «x» не доплыла, проверка ничего не видит");

  // 2. Трасса кода читателя — фиктивный ответ /api/trace через публичную точку входа.
  const trace = doc.getElementById("trace");
  w.AlgoTraceViz.render(trace, {
    ok: true, result: "2", duration: "1ms",
    source: "func F() int {\n\tx := 1\n\tx++\n\treturn x\n}",
    steps: [
      { step: 1, line: 2, tag: "", vars: { x: "1" } },
      { step: 2, line: 3, tag: "", vars: { x: "2" } },
      { step: 3, line: 4, tag: "", vars: { x: "2" } },
    ],
  });
  const wrap = trace.querySelector(".algo-trace");
  expect(!!wrap, "trace-viz: трасса не построилась");
  if (wrap) {
    const label = () => wrap.textContent.match(/шаг \d+ \/ \d+/);
    const l0 = String(label());
    expect(!press(wrap, "ArrowRight"), "trace-viz: → доплыла до document — mdBook перелистнёт главу");
    expect(String(label()) !== l0, `trace-viz: → не сделала шаг («${l0}»)`);
    for (const k of ["ArrowLeft", "Home", "End"]) expect(!press(wrap, k), `trace-viz: «${k}» доплыла до document`);
    expect(press(wrap, "x"), "trace-viz: контроль — необработанная «x» не доплыла");
  }

  // 3. Редактор runner'а. Сервера нет — но хост редактора строится сразу, и
  //    именно на нём стоит защита (CodeMirror монтируется внутрь него).
  const host = doc.querySelector(".algo-runner .algo-runner__editor");
  expect(!!host, "runner: нет .algo-runner__editor");
  if (host) {
    const inner = doc.createElement("div"); // стоит на месте contenteditable CodeMirror
    host.appendChild(inner);
    expect(!press(inner, "ArrowRight"), "runner: → из редактора доплыла до document — mdBook перелистнёт главу");
    expect(!press(inner, "ArrowLeft"), "runner: ← из редактора доплыла до document");
  }

  const noise = errors.filter((e) => !/fetch|Failed to fetch|ECONNREFUSED|network/i.test(e));
  if (noise.length) fails.push(...noise.map((e) => "ошибка рантайма: " + e));
  if (fails.length) {
    console.error("✗ keys-check:\n  - " + fails.join("\n  - "));
    process.exit(1);
  }
  console.log("✓ keys-check: ←/→/Home/End/Space/F/Esc в виджете, трассе и редакторе runner'а не доходят до навигации mdBook");
  process.exit(0);
}, 300);
