#!/usr/bin/env node
// Смоук вида результата runner'а (assets/runner.js) без сервера: готовые ответы /api/run
// подаются в ALGO_RUNNER_VIEW. Зависание раньше выглядело как немое «✗ есть падения» —
// здесь закреплено, что читатель видит причину первой строкой, а при ошибке компиляции —
// строку компилятора. Вторая половина — ответы /api/trace в AlgoTraceViz (trace-viz.js):
// ошибку сборки он узнаёт по build === false, и это поле проверяется раньше остальных веток.
// Форму самих ответов держат Go-тесты cmd/runner (run_test.go, run_unix_test.go).
// Если jsdom не найден — мягкий пропуск (exit 0), как в остальных смоуках.
"use strict";
const fs = require("fs");
const path = require("path");
let JSDOM;
try { ({ JSDOM } = require("jsdom")); } catch (e) {
  console.log("⏭  runner-render-check: jsdom не установлен — пропускаю (npm i jsdom).");
  process.exit(0);
}
const js = fs.readFileSync(path.join(__dirname, "..", "assets", "runner.js"), "utf8");
const traceJs = fs.readFileSync(path.join(__dirname, "..", "assets", "trace-viz.js"), "utf8");
const dom = new JSDOM(`<!DOCTYPE html><html><body><div id="out"></div><div id="trace"></div>` +
  `<script>${js}</script><script>${traceJs}</script></body></html>`,
  { runScripts: "dangerously", url: "http://localhost:3000/x.html" });
const V = dom.window.ALGO_RUNNER_VIEW, out = dom.window.document.getElementById("out");
if (!V) { console.error("❌ runner-render-check: runner.js не отдаёт ALGO_RUNNER_VIEW"); process.exit(1); }
const fails = [];
const expect = (ok, msg) => { if (!ok) fails.push(msg); };

const hang = { ok: false, build: true, timeout: true, passed: 1, failed: 1, duration: "20.1s",
  reason: "тест TestFibRandom не уложился в 20s — похоже на бесконечный цикл",
  tests: [{ name: "TestFib", pass: true, output: "" }, { name: "TestFibRandom", pass: false, killed: "timeout", output: "panic: …" }] };
V.result(out, hang);
expect(/TestFibRandom не уложился в 20s/.test(out.firstChild.textContent), "зависание: причина не стоит первой строкой");
expect(/⏱/.test(out.querySelector(".algo-runner__test.is-err").textContent), "зависший тест не помечен ⏱");
expect(/^⏱/.test(V.status(hang).text), `статус зависания: «${V.status(hang).text}»`);

V.result(out, { ok: false, build: false, timeout: true, duration: "45s", output: "", reason: "прогон не уложился в 45s и остановлен целиком" });
expect(!/Ошибка компиляции/.test(out.textContent), "остановка по сроку показана как ошибка компиляции");

const plain = { ok: false, build: true, passed: 0, failed: 1, duration: "0.4s", tests: [{ name: "TestA", pass: false, output: "got 1" }] };
V.result(out, plain);
expect(/^✗ есть падения/.test(V.status(plain).text) && /✗/.test(out.querySelector(".algo-runner__test").textContent), "обычное падение перестало выглядеть обычным");
expect(/^✓/.test(V.status({ ok: true, duration: "1s" }).text), "зелёный статус сломан");

// Ошибка компиляции: вердикта мало — читатель должен видеть, ЧТО не так. Текст ответа снят с
// настоящего обработчика (TestHandleRunShowsCompileError).
V.result(out, { ok: false, build: false, race: false, passed: 0, failed: 0, tests: null, duration: "62ms",
  output: "# probe/spin [probe/spin.test]\nspin/spin.go:3:26: undefined: undefinedName\nFAIL\tprobe/spin [build failed]" });
expect(/^✗ Ошибка компиляции/.test(out.firstChild.textContent), "ошибка компиляции: вердикт не стоит первой строкой");
expect(/spin\.go:3:26: undefined: undefinedName/.test(out.textContent), "ошибка компиляции: строки компилятора на экране нет");

// Трасса. Ответы — в том виде, в каком их отдаёт /api/trace: build есть всегда.
const T = dom.window.AlgoTraceViz, trace = dom.window.document.getElementById("trace");
if (!T) { console.error("❌ runner-render-check: trace-viz.js не отдаёт AlgoTraceViz"); process.exit(1); }
T.render(trace, { ok: false, build: false, output: "# probe/tracecmd\ntracecmd/main.go:3:15: undefined: undefinedName", steps: [], source: "package p\n" });
expect(/не скомпилировался/.test(trace.textContent) && /main\.go:3:15: undefined: undefinedName/.test(trace.textContent),
  "трасса: при ошибке сборки нет вывода компилятора");
T.render(trace, { ok: false, build: true, timeout: true, reason: "выполнение не уложилось в 5s — похоже на бесконечный цикл", steps: [], duration: "5s", source: "package p\n" });
expect(/не уложилось в 5s/.test(trace.textContent) && !/не скомпилировался/.test(trace.textContent),
  "трасса: остановка по сроку показана как ошибка сборки");
// У неподдерживаемой формы харнесс не собирался вовсе, build у неё тоже false — но это не ошибка компиляции.
T.render(trace, { ok: false, build: false, unsupported: true, reason: "рекурсия не поддерживается", steps: [], source: "package p\n" });
expect(/рекурсия не поддерживается/.test(trace.textContent) && !/не скомпилировался/.test(trace.textContent),
  "трасса: неподдерживаемая форма показана как ошибка сборки");

if (fails.length) { console.error("❌ runner-render-check:\n  - " + fails.join("\n  - ")); process.exit(1); }
console.log("✅ runner-render-check: остановка показана причиной, ошибка компиляции — строкой компилятора (и в трассе), обычное падение и зелёный прогон — как раньше");
