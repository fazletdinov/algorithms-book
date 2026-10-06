#!/usr/bin/env node
// Смоук вида результата runner'а (assets/runner.js) без сервера: готовые ответы /api/run
// подаются в ALGO_RUNNER_VIEW. Зависание раньше выглядело как немое «✗ есть падения» —
// здесь закреплено, что читатель видит причину первой строкой (срок, предел памяти, обрезка,
// «не запустился»), а при ошибке компиляции — строку компилятора. Вторая половина — ответы
// /api/trace в AlgoTraceViz (trace-viz.js): ошибку сборки он узнаёт по build === false, и это
// поле проверяется раньше остальных веток. Третья — плашка действующих пределов из
// /api/health: сама функция и живой виджет на подставном fetch.
// Форму самих ответов держат Go-тесты cmd/runner (run_test.go, run_unix_test.go, mem_test.go).
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

// Упор в предел памяти — третий вид остановки, со своим значком: читатель должен отличать
// «не уложилось по времени» от «растёт без конца».
const mem = { ok: false, build: true, memLimit: true, passed: 0, failed: 1, duration: "3.1s",
  reason: "TestBFSOrder: упёрлось в предел памяти 2 ГиБ — похоже на бесконечный рост (например, обход без visited)",
  tests: [{ name: "TestBFSOrder", pass: false, killed: "memory", output: "" }] };
V.result(out, mem);
expect(/^💾 TestBFSOrder: упёрлось в предел памяти 2 ГиБ/.test(out.firstChild.textContent), "упор в память: причина не первой строкой");
expect(/💾/.test(out.querySelector(".algo-runner__test").textContent) && /^💾/.test(V.status(mem).text), "упор в память не помечен 💾");

// Прогон не запустился вовсе (ограничитель памяти пропал после старта сервера): вывода нет,
// событий тестов нет — без причины это читалось бы как «Ошибка компиляции / (нет вывода)».
V.result(out, { ok: false, build: false, passed: 0, failed: 0, tests: null, duration: "0s", output: "",
  reason: "прогон не запустился: exec: \"systemd-run\": executable file not found in $PATH" });
expect(/^✗ прогон не запустился: exec: "systemd-run"/.test(out.firstChild.textContent), `прогон не запустился: «${out.firstChild.textContent}»`);
expect(!/Ошибка компиляции|нет вывода/.test(out.textContent), "прогон не запустился, а показана ошибка компиляции");

// Плашка действующих пределов в шапке — из ответа /api/health.
const L = (memory, memoryText, race) => V.limits({ memory, memoryText, testTimeout: "20s", raceTimeout: "45s" }, race);
expect(L("cgroup", "2 ГиБ").text === "предел 2 ГиБ · 20 с", `предел cgroup: «${L("cgroup", "2 ГиБ").text}»`);
expect(L("cgroup", "2 ГиБ", true).text === "предел 2 ГиБ · 45 с", `предел cgroup у виджета с -race: «${L("cgroup", "2 ГиБ", true).text}»`);
expect(/адресов 2 ГиБ/.test(L("rlimit", "2 ГиБ").text), "предел адресов не назван адресами");
expect(/без предела памяти/.test(L("none", "0 МиБ").text) && L("none", "0 МиБ").cls === "warn", "отсутствие предела не показано предупреждением");
expect(V.limits(undefined) === null, "старый сервер без limits должен давать null");
// Срок приходит строкой Go (time.Duration): «20s» читается как «20 с», а «1m30s» нельзя
// молча превращать в «1 с» — тогда уж показать как есть.
const slow = V.limits({ memory: "cgroup", memoryText: "2 ГиБ", testTimeout: "1m30s", raceTimeout: "3m0s" }).text;
expect(slow === "предел 2 ГиБ · 1m30s", `срок длиннее минуты: «${slow}»`);

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
T.render(trace, { ok: false, build: true, memLimit: true, steps: [], duration: "0.4s", source: "package p\n",
  reason: "выполнение упёрлось в предел памяти 2 ГиБ — похоже на бесконечный рост (например, обход без visited)" });
expect(/💾/.test(trace.textContent) && /упёрлось в предел памяти 2 ГиБ/.test(trace.textContent) && !/⏱|Не удалось/.test(trace.textContent),
  `трасса: упор в память показан как «${trace.textContent.slice(0, 80)}»`);
T.render(trace, { ok: false, build: true, steps: [], duration: "0s", source: "package p\n",
  reason: "трасса не запустилась: exec: \"prlimit\": executable file not found in $PATH" });
expect(/трасса не запустилась: exec: "prlimit"/.test(trace.textContent) && !/Паника/.test(trace.textContent),
  `трасса не запустилась, а на экране «${trace.textContent.slice(0, 80)}»`);

// Живой виджет на подставном сервере: плашка пределов встаёт в шапку перед статусом, а
// /api/health запрашивается один раз на страницу, сколько бы виджетов на ней ни было.
function widgetPage(limits) {
  const calls = { health: 0 };
  const page = new JSDOM(`<!DOCTYPE html><html><body><div class="algo-runner" data-pkg="dp"></div>` +
    `<div class="algo-runner" data-pkg="graphs" data-race="true"></div><script>${js}</script></body></html>`, {
    runScripts: "dangerously", url: "http://localhost:3000/x.html",
    beforeParse(w) {
      w.fetch = (url) => {
        const health = /\/api\/health$/.test(url);
        if (health) calls.health++;
        return Promise.resolve({ ok: true, json: () => Promise.resolve(health ? { ok: true, limits } : { pkg: "dp", code: "package dp\n" }) });
      };
    },
  });
  // редактор в jsdom не грузится (CodeMirror — ESM с CDN) и падает в textarea: ждём, пока цепочка промисов дойдёт до статуса
  return new Promise((resolve) => setTimeout(() => resolve({ doc: page.window.document, calls }), 100));
}

(async () => {
  const live = await widgetPage({ memory: "cgroup", memoryBytes: 2147483648, memoryText: "2 ГиБ", testTimeout: "20s", raceTimeout: "45s" });
  const badges = Array.from(live.doc.querySelectorAll(".algo-runner__limits"), (b) => b.textContent);
  expect(badges.join(" | ") === "предел 2 ГиБ · 20 с | предел 2 ГиБ · 45 с", `плашки пределов в шапках: «${badges.join(" | ")}»`);
  const badge = live.doc.querySelector(".algo-runner__limits");
  expect(badge && badge.title && badge.nextSibling === live.doc.querySelector(".algo-runner__status"), "плашка пределов не стоит перед статусом или без подсказки");
  expect(live.calls.health === 1, `/api/health запрошен ${live.calls.health} раз на два виджета`);

  const bare = await widgetPage({ memory: "none", memoryBytes: 0, memoryText: "0 МиБ", testTimeout: "20s", raceTimeout: "45s" });
  expect(/is-warn/.test((bare.doc.querySelector(".algo-runner__limits") || {}).className || ""), "без предела памяти плашка не предупреждает");
  const old = await widgetPage(undefined);
  expect(!old.doc.querySelector(".algo-runner__limits") && /сервер на связи/.test(old.doc.querySelector(".algo-runner__status").textContent),
    "старый сервер без limits: плашки быть не должно, виджет при этом работает");

  if (fails.length) { console.error("❌ runner-render-check:\n  - " + fails.join("\n  - ")); process.exit(1); }
  console.log("✅ runner-render-check: остановка показана причиной (срок ⏱, память 💾, обрезка ✂), ошибка компиляции — строкой компилятора (и в трассе), плашка пределов в шапке, обычное падение и зелёный прогон — как раньше");
})();
