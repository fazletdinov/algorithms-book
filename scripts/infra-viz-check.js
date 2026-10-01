#!/usr/bin/env node
// Проверка infra-viz: хук регистрации (jsdom) и генераторы (чистый node).
"use strict";
const fs = require("fs");
const path = require("path");
let JSDOM;
try { ({ JSDOM } = require("jsdom")); } catch (e) { console.log("⏭  infra-viz-check: jsdom не установлен (npm i --no-save jsdom)"); process.exit(1); }
const root = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, "assets", f), "utf8");
let failed = 0;
const eq = (name, got, want) => { if (JSON.stringify(got) !== JSON.stringify(want)) { failed++; console.error(`✗ ${name}\n  got:  ${JSON.stringify(got)}\n  want: ${JSON.stringify(want)}`); } else console.log(`✓ ${name}`); };

// --- хук ---
{
  const html = `<!DOCTYPE html><html><body><div class="algo-viz" id="a" data-viz="x-test"></div><div class="algo-viz" id="b" data-viz="x-missing"></div>
    <script>${read("algo-viz.js")}</script>
    <script>
      window.ALGO_VIZ.register("x-test", {
        badge: "t", desc: "t", valuesLabel: "", codeKey: "x-test", fillRange: false,
        complexity: { time: "O(1)", space: "O(1)", good: "" }, varOrder: ["a"], varDesc: { a: "a" }, lineNotes: {}, rules: [],
        parse: function () { return { steps: [{ line: 0, vars: { a: 1 }, info: "один" }, { done: true, line: 0, vars: { a: 2 }, info: "два" }] }; },
        inputs: [], values: function () { return []; }, title: function () { return "T"; }, pointers: function () { return { lo: -1, hi: -1 }; },
        sumCells: ["a"], sumValues: function (s) { return [{ text: s.vars.a }]; },
        status: function (s) { return { kind: "info", icon: "i", head: "h", text: s.info }; },
        stepCard: function (s) { return { a: s.vars.a, b: "", c: "", cls: "eq" }; }, varsOf: function (s) { return { a: s.vars.a }; },
        customViz: function (panel) { return function (s) { panel.textContent = "viz:" + s.info; }; }
      }, ["// x"]);
    </script></body></html>`;
  const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true });
  dom.window.document.dispatchEvent(new dom.window.Event("DOMContentLoaded"));
  const a = dom.window.document.getElementById("a"), b = dom.window.document.getElementById("b");
  eq("register: тип отрисован", a.classList.contains("algo-viz--ready") && /viz:один/.test(a.textContent), true);
  eq("register: чужой тип по-прежнему «Неизвестный»", /Неизвестный тип/.test(b.textContent), true);
}
process.exit(failed ? 1 : 0);
