#!/usr/bin/env node
// Линтер «имя на холсте = имя в коде» (jsdom): чипы переменных и плашки указателей
// каждого типа виджета называются так же, как переменные его листинга.
//
//   node scripts/check-viz-names.js            # проверка (CI)
//   node scripts/check-viz-names.js --report   # полный список нарушений, без сравнения со списком
//
// Зачем. Правила 2–3 из CLAUDE.md («чип — только переменная листинга», «плашка = значение
// одноимённой переменной») держались на внимании автора и массово разъехались: плашки
// left/right над листингом, где есть только i; чип action, которого нет в коде. Читатель
// сопоставляет холст с кодом по именам — чужое имя рвёт эту связь.
//
// Каждый тип строится движком с атрибутами из глав и проходится по ВСЕМ шагам; имя
// считается верным, если все идентификаторы в нём есть в листинге (комментарии и строки
// листинга не в счёт: «// dp[i-2]» не объявляет i). Числа и выражения из них (0, m−1)
// допустимы — это не переменные. Русские подписи — нарушение: чип подписывает переменную.
// Исключение — счётчики для наглядности («копий», «обменов»), объявленные в cfg.metrics:
// движок рисует их другим чипом, и имя у них обязано быть русским, без идентификаторов.
//
// Известные нарушения перечислены в scripts/viz-names-allow.json — это «храповик»: новое
// нарушение роняет проверку, а запись, которая больше не нарушается, тоже (список обязан
// сокращаться вместе с правками, а не копить мёртвые строки).
// Если jsdom не найден — мягкий пропуск (exit 0), как в остальных смоуках.
"use strict";
const fs = require("fs");
const path = require("path");

let JSDOM, VirtualConsole;
try {
  ({ JSDOM, VirtualConsole } = require("jsdom"));
} catch (e) {
  console.log("⏭  check-viz-names: jsdom не установлен — пропускаю (npm i jsdom).");
  process.exit(0);
}

const root = path.resolve(__dirname, "..");
const report = process.argv.includes("--report");
const allowPath = path.join(__dirname, "viz-names-allow.json");
const allow = JSON.parse(fs.readFileSync(allowPath, "utf8"));
const js = fs.readFileSync(path.join(root, "assets", "algo-viz.js"), "utf8");
const infraJs = fs.readFileSync(path.join(root, "assets", "infra-viz.js"), "utf8");

const seen = new Set(), divs = [];
for (const f of fs.readdirSync(path.join(root, "src")).filter((n) => n.endsWith(".md")).sort()) {
  const text = fs.readFileSync(path.join(root, "src", f), "utf8");
  for (const m of text.matchAll(/<div class="algo-viz"[^>]*><\/div>/g)) {
    const tm = m[0].match(/data-viz="([^"]+)"/);
    if (!tm || seen.has(tm[1])) continue;
    seen.add(tm[1]);
    divs.push({ type: tm[1], tag: m[0] });
  }
}

const errors = [];
const vc = new VirtualConsole();
vc.on("jsdomError", (e) => errors.push("jsdomError: " + (e && e.message)));
const body = divs.map((d, i) => d.tag.replace("<div ", `<div id="w${i}" `)).join("\n");
const dom = new JSDOM(`<!DOCTYPE html><html><body>${body}<script>${js}</script><script>${infraJs}</script></body></html>`, {
  runScripts: "dangerously", virtualConsole: vc, pretendToBeVisual: true,
  beforeParse(w) {
    // в jsdom нет раскладки: без ширины движок не расставляет плашки указателей
    Object.defineProperty(w.HTMLElement.prototype, "offsetWidth", { get() { return 40; } });
    Object.defineProperty(w.HTMLElement.prototype, "offsetHeight", { get() { return 40; } });
  },
});
const doc = dom.window.document;

const idents = (s) => String(s).replace(/−/g, "-").match(/[A-Za-z_][A-Za-z0-9_]*/g) || [];
// Листинг без комментариев и строковых литералов: имя в них переменную не объявляет.
const codeIdents = (code) => new Set(idents(code.split("\n")
  .map((l) => l.replace(/\/\/.*$/, "").replace(/"(?:[^"\\]|\\.)*"/g, "").replace(/'(?:[^'\\]|\\.)*'/g, ""))
  .join("\n")));

setTimeout(() => {
  const found = {}; // тип -> ["chip:имя", "tag:имя"]
  divs.forEach((d, i) => {
    const el = doc.getElementById("w" + i);
    const ids = codeIdents([...el.querySelectorAll(".algo-tp__linetext")].map((x) => x.textContent).join("\n"));
    const names = new Set();
    const counter = el.querySelector(".algo-viz__counter");
    for (let guard = 0; guard < 500; guard++) {
      el.querySelectorAll(".algo-tp__vchipk").forEach((x) => names.add("chip:" + x.textContent.trim()));
      // метрика («копий», «обменов») честно помечена как не-переменная, но и выдавать себя
      // за переменную не должна: латинское имя в метрике — это спрятанный чип-переменная
      el.querySelectorAll(".algo-tp__vchipm").forEach((x) => { if (idents(x.textContent).length) names.add("metric:" + x.textContent.trim()); });
      el.querySelectorAll(".algo-nn__tag:not(.algo-nn__tag--off) .algo-nn__tagtx").forEach((x) => {
        const t = x.textContent.trim();
        if (t) names.add("tag:" + t);
      });
      const m = counter && counter.textContent.match(/(\d+)\s*\/\s*(\d+)/);
      if (!m || +m[1] >= +m[2]) break;
      el.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    }
    const bad = [...names].filter((n) => {
      if (n.startsWith("metric:")) return true;
      const name = n.slice(n.indexOf(":") + 1);
      const words = idents(name);
      if (!words.length) return !/^[\d\s+\-−*/().]+$/.test(name); // русская подпись — нарушение, число — нет
      return words.some((w) => !ids.has(w));
    }).sort();
    if (bad.length) found[d.type] = bad;
  });

  if (report) {
    const n = Object.values(found).reduce((a, b) => a + b.length, 0);
    Object.keys(found).sort().forEach((t) => console.log(t.padEnd(26), found[t].join(", ")));
    console.log(`\nвсего: ${n} нарушений в ${Object.keys(found).length} типах из ${divs.length}`);
    process.exit(0);
  }

  const fails = [];
  for (const [type, bad] of Object.entries(found)) {
    const ok = new Set(allow[type] || []);
    bad.filter((b) => !ok.has(b)).forEach((b) => fails.push(b.startsWith("metric:")
      ? `${type}: метрика «${b.slice(7)}» названа как переменная — метрике нужна русская подпись`
      : `${type}: «${b.replace(/^chip:/, "чип ").replace(/^tag:/, "плашка ")}» — такого имени нет в листинге`));
  }
  for (const [type, list] of Object.entries(allow)) {
    const now = new Set(found[type] || []);
    list.filter((b) => !now.has(b)).forEach((b) => fails.push(`${type}: «${b}» больше не нарушает правило — убери из viz-names-allow.json`));
  }
  if (errors.length) fails.push(...[...new Set(errors)].slice(0, 10));
  if (fails.length) {
    console.error("❌ check-viz-names:\n  - " + fails.join("\n  - "));
    process.exit(1);
  }
  const left = Object.values(allow).reduce((a, b) => a + b.length, 0);
  console.log(`✅ check-viz-names: ${divs.length} типов — новых расхождений «имя на холсте ≠ имя в коде» нет (в списке известных осталось ${left})`);
  process.exit(0);
}, 800);
