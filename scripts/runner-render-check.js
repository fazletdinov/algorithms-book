#!/usr/bin/env node
// Смоук вида результата runner'а (assets/runner.js) без сервера: готовые ответы /api/run
// подаются в ALGO_RUNNER_VIEW. Зависание раньше выглядело как немое «✗ есть падения» —
// здесь закреплено, что читатель видит причину первой строкой (срок, предел памяти, обрезка,
// «не запустился», «ни один тест не запустился»), а при ошибке компиляции — строку компилятора;
// прогон, не дошедший до тестов, не выдаётся ни за неё, ни за упавшие тесты. Вторая половина — ответы
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

// Упавший табличный тест — самый частый красный прогон: случаи таблицы идут подтестами (t.Run),
// и сообщение случая `go test` приписывает подтесту. Сервер раньше отбрасывал вывод подтестов, и
// в «подробностях» оставалось «=== RUN / --- FAIL» без «F(вход) = получено, ожидалось …».
// Ответ снят с живого runner'а 2026-10-07 как есть: пакет twopointers, PairWithTargetSum всегда
// отвечает «пары нет», фильтр tests — ["TestPairWithTargetSum"].
const tableFail = { ok: false, build: true, race: false, passed: 0, failed: 1, duration: "228ms", filtered: true,
  output: "FAIL\nFAIL\tgithub.com/fazletdinov/algorithms-book/exercises/twopointers\t0.001s",
  tests: [{ name: "TestPairWithTargetSum", pass: false,
    output: "=== RUN   TestPairWithTargetSum\n=== RUN   TestPairWithTargetSum/пара_в_середине\n" +
      "    twopointers_test.go:39: PairWithTargetSum([1 2 3 4 6], 6) = [-1 -1], ожидалось [1 3]\n--- FAIL: TestPairWithTargetSum/пара_в_середине (0.00s)\n" +
      "=== RUN   TestPairWithTargetSum/крайние_элементы\n" +
      "    twopointers_test.go:39: PairWithTargetSum([2 5 9 11], 11) = [-1 -1], ожидалось [0 2]\n--- FAIL: TestPairWithTargetSum/крайние_элементы (0.00s)\n" +
      "--- FAIL: TestPairWithTargetSum (0.00s)\n" }] };
V.result(out, tableFail);
const caseDetails = out.querySelector(".algo-runner__test.is-err details pre");
expect(caseDetails && caseDetails.textContent.includes("PairWithTargetSum([1 2 3 4 6], 6) = [-1 -1], ожидалось [1 3]") &&
  caseDetails.textContent.includes("--- FAIL: TestPairWithTargetSum/крайние_элементы"),
  `табличный тест: в подробностях нет сообщения и имени упавшего случая — «${caseDetails && caseDetails.textContent.slice(0, 160)}»`);
expect(out.querySelectorAll(".algo-runner__test").length === 1 && /0 ok \/ 1 fail/.test(out.textContent),
  "табличный тест: в списке должен остаться один тест верхнего уровня, счёт — по тестам, а не по случаям");

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

// Прогон кончился без единого события теста. Раньше каждый из этих ответов шёл под
// заголовком «✗ Ошибка компиляции» либо «✗ Часть тестов упала», а статус говорил «есть падения».
// Ответы сняты с настоящего сервера 2026-10-07 как есть: 1 и 4 — обработчик и runGoTest на крошечном
// модуле, 2, 3 и 6 — живой runner на пакете bits; путь к каталогу Go укорочен.
const NOT_THE_CAUSE = /Ошибка компиляции|Часть тестов упала|Паника|нет вывода/;
const stopped = (name, res, mark, status) => {
  V.result(out, res);
  const first = out.firstChild.textContent;
  expect(first === mark + " " + res.reason, `${name}: первой строкой не причина, а «${first}»`);
  expect(!NOT_THE_CAUSE.test(out.textContent), `${name}: на экране чужой заголовок — «${out.textContent.slice(0, 160)}»`);
  expect(V.status(res).text === status + " · " + res.duration, `${name}: статус «${V.status(res).text}»`);
};
// 1. Фильтр tests не совпал ни с одним тестом: пакет собрался, запускать нечего.
const noTests = { ok: false, build: true, race: false, passed: 0, failed: 0, tests: null, duration: "149ms", filtered: true, noTests: true,
  output: "testing: warning: no tests to run\nPASS\nok  \tprobe/spin\t0.001s [no tests to run]",
  reason: "ни один тест не запустился — в пакете нет тестов с такими именами: TestNope, TestZzz" };
stopped("фильтр не совпал", noTests, "△", "△ ни один тест не запустился");
expect(/Прогони пакет целиком/.test(out.textContent), "фильтр не совпал: нет совета прогнать пакет целиком");
expect(!/0 ok|PASS|no tests to run/.test(out.textContent), `фильтр не совпал: на экране счёт или сырой вывод go test — «${out.textContent}»`);
// Без фильтра совет «прогони целиком» был бы бессмыслицей: целиком и гоняли.
V.result(out, Object.assign({}, noTests, { filtered: false, reason: "ни один тест не запустился — в пакете нет тестов" }));
expect(/^△ ни один тест не запустился — в пакете нет тестов$/.test(out.textContent), `пакет без тестов: «${out.textContent}»`);
// 2. Ограничитель памяти перед go запустился, но область не создал.
stopped("ограничитель не сработал", { ok: false, build: false, race: false, passed: 0, failed: 0, tests: null, duration: "4ms",
  output: "Failed to connect to bus: No such file or directory",
  reason: "прогон не запустился: Failed to connect to bus: No such file or directory" }, "✗", "✗ прогон не запустился");
// 3. Упор в память до запуска тестов: убита сборка (runner с -mem-mb 32; ядро убило компилятор).
const starved = { ok: false, build: false, race: false, passed: 0, failed: 0, tests: null, duration: "116ms", memLimit: true,
  output: "github.com/fazletdinov/algorithms-book/exercises/bits: /usr/local/go/pkg/tool/linux_amd64/compile: signal: killed\nFAIL\tgithub.com/fazletdinov/algorithms-book/exercises/bits [build failed]",
  reason: "сборка упёрлась в предел памяти 32 МиБ, до тестов дело не дошло — предел мал для компилятора: перезапусти runner с -mem-mb побольше" };
stopped("память кончилась на сборке", starved, "💾", "💾 предел памяти");
expect(/compile: signal: killed/.test(out.textContent), "память кончилась на сборке: вывод go под причиной потерян");
// 4. Запасной срок вышел, пока шла сборка (пустой кэш компилятора, -race, срок 3 с).
stopped("срок вышел на сборке", { ok: false, build: false, race: false, passed: 0, failed: 0, tests: null, duration: "3.004s", timeout: true, output: "",
  reason: "прогон не уложился в 3s и остановлен целиком: не успела закончиться сборка — так бывает на первом запуске с -race, пока кэш компилятора пуст; запусти ещё раз — уже собранное осталось в кэше" },
  "⏱", "⏱ не уложилось по времени");
// 6. Вывод упёрся в потолок: прогон остановлен сразу — счёт и список тестов остаются, значок ✂.
// Вывод теста здесь укорочен: в настоящем ответе под этими строками ещё 1,5 МБ такой же печати.
const flood = { ok: false, build: true, race: false, passed: 0, failed: 1, duration: "256ms", truncated: true, output: "",
  reason: "вывод обрезан на 4096 КиБ, прогон остановлен — похоже на печать в бесконечном цикле; убери отладочный вывод и запусти снова",
  tests: [{ name: "TestSingleNumber", pass: false, output: "=== RUN   TestSingleNumber\n=== RUN   TestSingleNumber/пример\n" + "x".repeat(100) + "\n" }] };
V.result(out, flood);
expect(/^✂ вывод обрезан на 4096 КиБ, прогон остановлен/.test(out.firstChild.textContent), `обрезка: первой строкой «${out.firstChild.textContent}»`);
expect(/0 ok \/ 1 fail/.test(out.textContent) && /✗TestSingleNumber/.test(out.textContent), `обрезка: счёт и список тестов потеряны — «${out.textContent.slice(0, 200)}»`);

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
// 2. Ограничитель перед харнессом запустился, но область не создал: раньше текст systemd шёл как «Паника во время выполнения».
T.render(trace, { ok: false, build: true, steps: [], duration: "2ms", source: "package p\n",
  reason: "трасса не запустилась: Failed to connect to bus: No such file or directory" });
expect(/^✗\s*трасса не запустилась: Failed to connect to bus/.test(trace.textContent) && !/Паника|не скомпилировался/.test(trace.textContent),
  `трасса: ограничитель не сработал, а на экране «${trace.textContent.slice(0, 80)}»`);
// 5. Срок вышел на сборке харнесса: раньше — build: false, то есть «Код не скомпилировался» с пустым выводом.
T.render(trace, { ok: false, build: true, timeout: true, steps: [], source: "package p\n",
  reason: "сборка трассы не уложилась в 20s — так бывает на первом запуске, пока кэш компилятора пуст; запусти ещё раз — уже собранное осталось в кэше" });
expect(/⏱/.test(trace.textContent) && /сборка трассы не уложилась в 20s/.test(trace.textContent) && !/Паника|не скомпилировался/.test(trace.textContent),
  `трасса: срок сборки показан как «${trace.textContent.slice(0, 80)}»`);
T.render(trace, { ok: false, build: true, steps: [], source: "package p\n", reason: "сборка трассы прервана: runner останавливается или запрос отменён" });
expect(/^✗\s*сборка трассы прервана/.test(trace.textContent) && !/⏱|Паника|не скомпилировался/.test(trace.textContent),
  `трасса: отмена сборки показана как «${trace.textContent.slice(0, 80)}»`);

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
  console.log("✅ runner-render-check: остановка показана причиной (срок ⏱, память 💾, обрезка ✂), прогон без единого теста — тоже (фильтр не совпал △, не запустился ✗, сборке не хватило памяти или срока), ошибка компиляции — строкой компилятора (и в трассе), упавший табличный тест — сообщением случая, плашка пределов в шапке, обычное падение и зелёный прогон — как раньше");
})();
