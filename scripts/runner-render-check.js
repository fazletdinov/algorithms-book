#!/usr/bin/env node
// Смоук вида результата runner'а (assets/runner.js) без сервера: готовые ответы /api/run
// подаются в ALGO_RUNNER_VIEW. Зависание раньше выглядело как немое «✗ есть падения» —
// здесь закреплено, что читатель видит причину первой строкой (срок, предел памяти, обрезка,
// «не запустился», «ни один тест не запустился»), а при ошибке компиляции — строку компилятора;
// прогон, не дошедший до тестов, не выдаётся ни за неё, ни за упавшие тесты. Вторая половина — ответы
// /api/trace в AlgoTraceViz (trace-viz.js): ошибку сборки он узнаёт по build === false, и это
// поле проверяется раньше остальных веток. Третья — плашка действующих пределов из
// /api/health: сама функция и живой виджет на подставном fetch. Четвёртая — живой виджет на
// подставном /api/stub: список упражнений и единица прогона (функция, тип, пакет), выбор по
// умолчанию по algoFnSolved и needs, отметка только по ok, код из plain и черновики, подсказки по
// порядку, «Сдаюсь» и /api/solution, data-func / data-tests / data-hints="off", warning и старый
// сервер, сервер не отвечает (algo-runner:state), хранилище недоступно.
// Форму самих ответов держат Go-тесты cmd/runner (run_test.go, run_unix_test.go, mem_test.go).
// Если jsdom не найден — мягкий пропуск (exit 0), как в остальных смоуках.
"use strict";
const fs = require("fs");
const path = require("path");
let JSDOM, VirtualConsole;
try { ({ JSDOM, VirtualConsole } = require("jsdom")); } catch (e) {
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

const hang = { stage: "tests", ok: false, build: true, timeout: true, passed: 1, failed: 1, duration: "20.1s",
  reason: "тест TestFibRandom не уложился в 20s — похоже на бесконечный цикл",
  tests: [{ name: "TestFib", pass: true, output: "" }, { name: "TestFibRandom", pass: false, killed: "timeout", output: "panic: …" }] };
V.result(out, hang);
expect(/TestFibRandom не уложился в 20s/.test(out.firstChild.textContent), "зависание: причина не стоит первой строкой");
expect(/⏱/.test(out.querySelector(".algo-runner__test.is-err").textContent), "зависший тест не помечен ⏱");
expect(/^⏱/.test(V.status(hang).text), `статус зависания: «${V.status(hang).text}»`);

V.result(out, { stage: "build", ok: false, build: false, timeout: true, duration: "45s", output: "", reason: "прогон не уложился в 45s и остановлен целиком" });
expect(!/Ошибка компиляции/.test(out.textContent), "остановка по сроку показана как ошибка компиляции");

const plain = { stage: "tests", ok: false, build: true, passed: 0, failed: 1, duration: "0.4s", tests: [{ name: "TestA", pass: false, output: "got 1" }] };
V.result(out, plain);
expect(/^✗ есть падения/.test(V.status(plain).text) && /✗/.test(out.querySelector(".algo-runner__test").textContent), "обычное падение перестало выглядеть обычным");
expect(/^✓/.test(V.status({ ok: true, duration: "1s" }).text), "зелёный статус сломан");

// Упавший табличный тест — самый частый красный прогон: случаи таблицы идут подтестами (t.Run),
// и сообщение случая `go test` приписывает подтесту. Сервер раньше отбрасывал вывод подтестов, и
// в «подробностях» оставалось «=== RUN / --- FAIL» без «F(вход) = получено, ожидалось …».
// Ответ снят с живого runner'а 2026-10-07 как есть: пакет twopointers, PairWithTargetSum всегда
// отвечает «пары нет», фильтр tests — ["TestPairWithTargetSum"].
const tableFail = { stage: "tests", ok: false, build: true, race: false, passed: 0, failed: 1, duration: "228ms", filtered: true,
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
V.result(out, { stage: "build", ok: false, build: false, race: false, passed: 0, failed: 0, tests: null, duration: "62ms",
  output: "# probe/spin [probe/spin.test]\nspin/spin.go:3:26: undefined: undefinedName\nFAIL\tprobe/spin [build failed]" });
expect(/^✗ Ошибка компиляции/.test(out.firstChild.textContent), "ошибка компиляции: вердикт не стоит первой строкой");
expect(/spin\.go:3:26: undefined: undefinedName/.test(out.textContent), "ошибка компиляции: строки компилятора на экране нет");

// Упор в предел памяти — третий вид остановки, со своим значком: читатель должен отличать
// «не уложилось по времени» от «растёт без конца».
const mem = { stage: "tests", ok: false, build: true, memLimit: true, passed: 0, failed: 1, duration: "3.1s",
  reason: "TestBFSOrder: упёрлось в предел памяти 2 ГиБ — похоже на бесконечный рост (например, обход без visited)",
  tests: [{ name: "TestBFSOrder", pass: false, killed: "memory", output: "" }] };
V.result(out, mem);
expect(/^💾 TestBFSOrder: упёрлось в предел памяти 2 ГиБ/.test(out.firstChild.textContent), "упор в память: причина не первой строкой");
expect(/💾/.test(out.querySelector(".algo-runner__test").textContent) && /^💾/.test(V.status(mem).text), "упор в память не помечен 💾");

// Прогон не запустился вовсе (ограничитель памяти пропал после старта сервера): вывода нет,
// событий тестов нет — без причины это читалось бы как «Ошибка компиляции / (нет вывода)».
V.result(out, { stage: "launch", ok: false, build: false, passed: 0, failed: 0, tests: null, duration: "0s", output: "",
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
const noTests = { stage: "tests", ok: false, build: true, race: false, passed: 0, failed: 0, tests: null, duration: "149ms", filtered: true, noTests: true,
  output: "testing: warning: no tests to run\nPASS\nok  \tprobe/spin\t0.001s [no tests to run]",
  reason: "ни один тест не запустился — в пакете нет тестов с такими именами: TestNope, TestZzz" };
stopped("фильтр не совпал", noTests, "△", "△ ни один тест не запустился");
expect(/Прогони пакет целиком/.test(out.textContent), "фильтр не совпал: нет совета прогнать пакет целиком");
expect(!/0 ok|PASS|no tests to run/.test(out.textContent), `фильтр не совпал: на экране счёт или сырой вывод go test — «${out.textContent}»`);
// Без фильтра совет «прогони целиком» был бы бессмыслицей: целиком и гоняли.
V.result(out, Object.assign({}, noTests, { filtered: false, reason: "ни один тест не запустился — в пакете нет тестов" }));
expect(/^△ ни один тест не запустился — в пакете нет тестов$/.test(out.textContent), `пакет без тестов: «${out.textContent}»`);
// 2. Ограничитель памяти перед go запустился, но область не создал.
stopped("ограничитель не сработал", { stage: "launch", ok: false, build: false, race: false, passed: 0, failed: 0, tests: null, duration: "4ms",
  output: "Failed to connect to bus: No such file or directory",
  reason: "прогон не запустился: Failed to connect to bus: No such file or directory" }, "✗", "✗ прогон не запустился");
// Причина здесь и есть единственная строка вывода: показывать её второй раз под причиной незачем.
expect(out.textContent.split("Failed to connect to bus").length === 2, `ограничитель не сработал: текст systemd показан не один раз — «${out.textContent}»`);
// А вывод длиннее одной строки под причиной остаётся: в нём то, чего в причине нет.
V.result(out, { stage: "launch", ok: false, build: false, passed: 0, failed: 0, tests: null, duration: "9ms",
  output: "go: errors parsing go.mod:\ngo.mod:3: unknown directive: got", reason: "прогон не запустился: go: errors parsing go.mod:" });
expect(/unknown directive/.test(out.textContent), "прогон не запустился: вторая строка вывода потеряна");
// «Не запустился» виджет узнаёт по полю stage, а не по тому, что других признаков нет (объект составной, не снят с сервера).
expect(!/не запустился/.test(V.status({ stage: "build", ok: false, build: false, reason: "причина без признаков", duration: "1s" }).text),
  "статус «не запустился» выведен без stage: \"launch\"");
// 3. Упор в память до запуска тестов: убита сборка (runner с -mem-mb 32; ядро убило компилятор).
const starved = { stage: "build", ok: false, build: false, race: false, passed: 0, failed: 0, tests: null, duration: "116ms", memLimit: true,
  output: "github.com/fazletdinov/algorithms-book/exercises/bits: /usr/local/go/pkg/tool/linux_amd64/compile: signal: killed\nFAIL\tgithub.com/fazletdinov/algorithms-book/exercises/bits [build failed]",
  reason: "сборка упёрлась в предел памяти 32 МиБ, до тестов дело не дошло — предел мал для компилятора: перезапусти runner с -mem-mb побольше" };
stopped("память кончилась на сборке", starved, "💾", "💾 предел памяти");
expect(/compile: signal: killed/.test(out.textContent), "память кончилась на сборке: вывод go под причиной потерян");
// 4. Запасной срок вышел, пока шла сборка (пустой кэш компилятора, -race, срок 3 с).
stopped("срок вышел на сборке", { stage: "build", ok: false, build: false, race: false, passed: 0, failed: 0, tests: null, duration: "3.004s", timeout: true, output: "",
  reason: "прогон не уложился в 3s и остановлен целиком: не успела закончиться сборка — так бывает на первом запуске с -race, пока кэш компилятора пуст; запусти ещё раз — уже собранное осталось в кэше" },
  "⏱", "⏱ не уложилось по времени");
// 6. Вывод упёрся в потолок: прогон остановлен сразу — счёт и список тестов остаются, значок ✂.
// Вывод теста здесь укорочен: в настоящем ответе под этими строками ещё 1,5 МБ такой же печати.
const flood = { stage: "tests", ok: false, build: true, race: false, passed: 0, failed: 1, duration: "256ms", truncated: true, output: "",
  reason: "вывод обрезан: поток вывода тестов дорос до 4096 КиБ, прогон остановлен — похоже на печать в бесконечном цикле; убери отладочный вывод и запусти снова",
  tests: [{ name: "TestSingleNumber", pass: false, output: "=== RUN   TestSingleNumber\n=== RUN   TestSingleNumber/пример\n" + "x".repeat(100) + "\n" }] };
V.result(out, flood);
expect(/^✂ вывод обрезан: поток вывода тестов дорос до 4096 КиБ, прогон остановлен/.test(out.firstChild.textContent), `обрезка: первой строкой «${out.firstChild.textContent}»`);
expect(/0 ok \/ 1 fail/.test(out.textContent) && /✗TestSingleNumber/.test(out.textContent), `обрезка: счёт и список тестов потеряны — «${out.textContent.slice(0, 200)}»`);
expect(V.status(flood).text === "✂ вывод обрезан · 256ms", `обрезка: статус «${V.status(flood).text}» рядом с причиной «прогон остановлен»`);

// Тесты не падали, а прогон не зелёный. Ответы сняты 2026-10-07 с настоящего обработчика и runGoTest
// на крошечных модулях, как есть. Раньше первые два были зелёными (ok: true), третий — «Ошибкой компиляции».
// Причина стоит первой; если под ней есть зелёные строки, тот же блок говорит, что они не засчитаны —
// иначе «✓ TestSpin» и сырое «PASS» под «Прогон не засчитан» читались как зачёт.
const notCounted = (name, res, extra) => {
  V.result(out, res);
  const first = out.firstChild.textContent;
  expect(first.startsWith("✗ " + res.reason), `${name}: первой строкой не причина, а «${first}»`);
  expect(!res.passed || /не засчитан/.test(first), `${name}: блок причины не говорит, что зелёные строки ниже не засчитаны — «${first}»`);
  const noise = [...out.querySelectorAll("pre")].find((p) => /^\s*PASS\n/.test(p.textContent));
  expect(!noise, `${name}: под причиной сырой вывод go test с PASS — «${noise && noise.textContent}»`);
  expect(!/Ошибка компиляции|Часть тестов упала|Все тесты прошли/.test(out.textContent), `${name}: на экране чужой заголовок — «${out.textContent.slice(0, 200)}»`);
  expect(V.status(res).text === "✗ прогон не засчитан · " + res.duration, `${name}: статус «${V.status(res).text}»`);
  expect(extra.test(out.textContent), `${name}: на экране нет ${extra} — «${out.textContent.slice(0, 240)}»`);
};
// Фильтр tests = ["TestSpin", "TestNope"] на верном решении: TestSpin прошёл, TestNope в пакете нет.
notCounted("фильтр совпал частично", { stage: "tests", ok: false, build: true, race: false, passed: 1, failed: 0, duration: "146ms", filtered: true,
  tests: [{ name: "TestSpin", pass: true, output: "=== RUN   TestSpin\n--- PASS: TestSpin (0.00s)\n" }], output: "PASS\nok  \tprobe/spin\t0.001s",
  reason: "не запустились запрошенные тесты: TestNope — в пакете нет тестов с такими именами" }, /Прогон не засчитан\s+·\s+1 ok \/ 0 fail/);
// Единственный тест прошёл, а тестовый бинарник вышел с ошибкой (os.Exit(1) в TestMain после прогона).
notCounted("бинарник вышел с ошибкой после тестов", { stage: "tests", ok: false, build: true, race: false, passed: 1, failed: 0, duration: "150ms",
  tests: [{ name: "TestDone", pass: true, output: "=== RUN   TestDone\n--- PASS: TestDone (0.00s)\n" }], output: "PASS\nFAIL\tprobe/late\t0.001s",
  reason: "тестовый бинарник завершился с ошибкой, хотя тесты не падали" }, /Прогон не засчитан\s+·\s+1 ok \/ 0 fail/);
// Решение паникует в переменной уровня пакета: бинарник собран, запущен и упал до первого теста.
notCounted("бинарник упал до первого теста", { stage: "tests", ok: false, build: true, race: false, passed: 0, failed: 0, tests: null, duration: "148ms",
  output: "panic: boom at init\n\ngoroutine 1 [running]:\nprobe/spin.init.func1(...)\n\t/tmp/algorunner-737340176/spin/spin.go:3\nprobe/spin.init()\n\t/tmp/algorunner-737340176/spin/spin.go:3 +0x25\nFAIL\tprobe/spin\t0.003s",
  reason: "тестовый бинарник упал до первого теста: panic: boom at init" }, /goroutine 1 \[running\]/);
expect(!/0 ok/.test(out.textContent), `бинарник упал до первого теста: счёт без единого теста — «${out.textContent.slice(0, 120)}»`);

// Прогон оборван (ушёл клиент, runner останавливается): причины у такого ответа нет по контракту, тестов
// и вывода тоже. Раньше на экране стояло одно голое «(нет вывода)», а статус говорил «не засчитан».
for (const cut of [
  { stage: "tests", ok: false, build: true, race: false, passed: 0, failed: 0, tests: null, duration: "1.2s", output: "" },
  { stage: "build", ok: false, build: false, race: false, passed: 0, failed: 0, tests: null, duration: "0.3s", output: "" },
]) {
  V.result(out, cut);
  expect(/^✗ Прогон оборван/.test(out.firstChild.textContent) && !/нет вывода|Ошибка компиляции/.test(out.textContent),
    `оборванный прогон (${cut.stage}): «${out.textContent.slice(0, 160)}»`);
  expect(V.status(cut).text === "✗ прогон оборван · " + cut.duration, `оборванный прогон (${cut.stage}): статус «${V.status(cut).text}»`);
}
// Ошибка компиляции — в шапке «не собралось», а не «есть падения»: падать было нечему.
const compileErr = { stage: "build", ok: false, build: false, race: false, passed: 0, failed: 0, tests: null, duration: "62ms",
  output: "# probe/spin [probe/spin.test]\nspin/spin.go:3:26: undefined: undefinedName\nFAIL\tprobe/spin [build failed]" };
expect(V.status(compileErr).text === "✗ не собралось · 62ms", `ошибка компиляции: статус «${V.status(compileErr).text}»`);

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
// Функция при этом не запускалась вовсе: «не сделала ни шага» под причиной было бы неправдой.
expect(!/Трасса пуста/.test(trace.textContent), `трасса: срок сборки, а на экране «${trace.textContent}»`);
T.render(trace, { ok: false, build: true, steps: [], source: "package p\n", reason: "сборка трассы прервана: runner останавливается или запрос отменён" });
expect(/^✗\s*сборка трассы прервана/.test(trace.textContent) && !/⏱|Паника|не скомпилировался/.test(trace.textContent),
  `трасса: отмена сборки показана как «${trace.textContent.slice(0, 80)}»`);

// ---- Единица прогона, подсказки, «Сдаюсь» — живой виджет на подставном сервере ----
// Заготовка из шести упражнений, как их отдаёт /api/stub: A и B — функции со своими тестами, C — без
// тестов и без типа (единица — пакет), M.X и M.Y — методы типа M (единица — тип, тесты TestM), D — функция,
// чьи тесты зовут A (needs). Порядок — порядок файла.
const ex = (name, o) => Object.assign({ name, tests: [], needs: [], group: "", groupTests: [], hint: "", recipe: "" }, o);
const FUNCS = [
  ex("A", { tests: ["TestA"], hint: "Признак: окно.\nОжидаемая сложность: O(n).", recipe: "двигайте окно" }),
  ex("B", { tests: ["TestB"], recipe: "рецепт B" }),
  ex("C"),
  ex("M.X", { group: "M", groupTests: ["TestM"], recipe: "рецепт X" }),
  ex("M.Y", { group: "M", groupTests: ["TestM"] }),
  ex("D", { tests: ["TestD"], needs: ["A"] }),
];
const STUB = { pkg: "p", code: "package p\n\n// A считает.\n// Подсказка: окно.\nfunc A() int { panic(\"TODO: A\") }\n",
  plain: "package p\n\n// A считает.\nfunc A() int { panic(\"TODO: A\") }\n", funcs: FUNCS,
  notes: [{ at: "type M", text: "поля M: стек и минимумы" }, { at: "package", text: "о пакете целиком" }] };
const GREEN = { stage: "tests", ok: true, build: true, race: false, passed: 1, failed: 0, duration: "0.2s", filtered: true,
  tests: [{ name: "TestA", pass: true, output: "" }], output: "PASS\nok  \tp\t0.001s" };
const RED = { stage: "tests", ok: false, build: true, race: false, passed: 0, failed: 1, duration: "0.2s", filtered: true,
  tests: [{ name: "TestD", pass: false, output: "panic: TODO: A [recovered]" }], output: "FAIL\nFAIL\tp\t0.001s" };
const tick = (ms = 40) => new Promise((r) => setTimeout(r, ms));
const unhandled = [];
process.on("unhandledRejection", (e) => unhandled.push(String(e && e.stack || e)));

// page поднимает один виджет. run — ответ /api/run (объект или функция от тела запроса), solution — ответ
// /api/solution ({status, error} — ошибка), down — сервер не отвечает, noStorage — localStorage бросает,
// stubStatus — код ответа /api/stub, importer — подмена загрузки модулей CodeMirror
// (window.ALGO_RUNNER_IMPORT), holdSlow — управляемые часы: таймеры от 5 с не идут сами, их
// запускает held[i]() (срок загрузки CodeMirror — 8 с), goWords — словари hlGo (window.ALGO_VIZ.goWords).
async function page({ attrs = 'data-pkg="p"', stub = STUB, run = GREEN, solution, seed = {}, down = false, noStorage = false,
  stubStatus = 200, importer, holdSlow = false, goWords } = {}) {
  const calls = [], events = [], errors = [], confirms = [], held = [];
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => errors.push("jsdomError: " + (e && e.message)));
  vc.on("error", (...a) => errors.push("console.error: " + a.join(" ")));
  const dom = new JSDOM(`<!DOCTYPE html><html><body><div class="algo-runner" ${attrs}></div><script>${js}</script></body></html>`, {
    runScripts: "dangerously", url: "http://localhost:3000/x.html", virtualConsole: vc,
    beforeParse(w) {
      Object.keys(seed).forEach((k) => w.localStorage.setItem(k, seed[k]));
      if (noStorage) Object.defineProperty(w, "localStorage", { get() { throw new w.DOMException("denied", "SecurityError"); } });
      w.confirm = (m) => { confirms.push(m); return true; };
      if (importer) w.ALGO_RUNNER_IMPORT = importer;
      if (goWords) w.ALGO_VIZ = { goWords };
      if (holdSlow) {
        const realSetTimeout = w.setTimeout.bind(w);
        w.setTimeout = (fn, ms, ...args) => {
          if (ms >= 5000) { held.push(() => fn(...args)); return -held.length; }
          return realSetTimeout(fn, ms, ...args);
        };
      }
      w.addEventListener("error", (e) => errors.push("window error: " + e.message));
      for (const t of ["algo-runner:result", "algo-runner:giveup", "algo-runner:state"]) {
        w.document.addEventListener(t, (e) => events.push(Object.assign({ type: t }, e.detail)));
      }
      const reply = (body, status = 200) => Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });
      w.fetch = (url, opts) => {
        const body = opts && opts.body ? JSON.parse(opts.body) : null;
        calls.push({ url, body });
        if (down) return Promise.reject(new w.TypeError("Failed to fetch"));
        if (/\/api\/health$/.test(url)) return reply({ ok: true });
        if (/\/api\/stub\?/.test(url)) return reply(stub, stubStatus);
        if (/\/api\/run$/.test(url)) {
          try { return reply(typeof run === "function" ? run(body) : run); } catch (e) { return Promise.reject(new w.TypeError("Failed to fetch")); }
        }
        if (/\/api\/solution\?/.test(url)) {
          if (solution && solution.status) return reply({ error: solution.error }, solution.status);
          const fn = decodeURIComponent(url.split("func=")[1]);
          return reply(solution || { pkg: "p", func: fn, code: "func " + fn + "() int {\n\treturn 42 // эталон " + fn + "\n}\n" });
        }
        return reply({ error: "нет такого" }, 404);
      };
    },
  });
  await tick(100);
  const doc = dom.window.document;
  const root = doc.querySelector(".algo-runner");
  const q = (s) => root.querySelector(s);
  const pick = () => q(".algo-runner__pick");
  const code = () => (q(".algo-runner__ta") || {}).value;
  // Помощники терпят отсутствие списка и кнопок: на прежнем виджете проверка должна перечислить провалы, а не упасть.
  const pv = () => (pick() || {}).value;
  const optText = (v) => { const o = pick() && pick().querySelector(`option[value="${v}"]`); return o ? o.textContent : ""; };
  const choose = (v) => { if (!pick()) return; pick().value = v; pick().dispatchEvent(new dom.window.Event("change", { bubbles: true })); };
  const runOnce = async () => {
    const b = q(".algo-runner__btn--run");
    if (!b) return undefined;
    b.click();
    await tick();
    return calls.filter((c) => /\/api\/run$/.test(c.url)).pop();
  };
  const lines = () => (q(".algo-runner__lines") || {}).textContent || "";
  const helpBtn = (re) => [...root.querySelectorAll(".algo-runner__help button")].find((b) => re.test(b.textContent));
  const press = (re) => { const b = helpBtn(re); if (b) b.click(); return !!b; };
  const solved = () => { try { return JSON.parse(dom.window.localStorage.getItem("algoFnSolved") || "{}"); } catch (e) { return "хранилище недоступно"; } };
  return { dom, doc, root, q, pick, pv, optText, code, choose, runOnce, helpBtn, press, solved, lines, calls, events, errors, confirms, held };
}

async function unitsAndHints() {
  // (a) Список — ВСЕ упражнения в порядке файла плюс «весь пакет»; методы типа стоят вместе.
  let w = await page();
  const opts = w.pick() ? [...w.pick().querySelectorAll("option")] : [];
  expect(opts.map((o) => o.value).join(",") === "A,B,C,M.X,M.Y,D,", `список: ${opts.map((o) => o.value + "=" + o.textContent).join(" | ")}`);
  const og = w.pick() && w.pick().querySelector("optgroup");
  expect(og && og.label === "тип M" && [...og.querySelectorAll("option")].map((o) => o.value).join() === "M.X,M.Y", "методы типа M не собраны в «тип M»");
  expect(/весь пакет/.test((opts[opts.length - 1] || {}).textContent || ""), "последний пункт — не «весь пакет»");
  expect(/нужны: A/.test((opts.find((o) => o.value === "D") || {}).textContent || ""), "у D нет пометки «нужны: A»");
  expect(w.pick() && w.pick().value === "A", `по умолчанию выбрано «${w.pick() && w.pick().value}», а не A`);
  expect(/тесты функции/.test((w.q(".algo-runner__unit") || {}).textContent || ""), "у строки запуска не видно «тесты функции»");
  let r = await w.runOnce();
  expect(r && JSON.stringify(r.body.tests) === '["TestA"]', `прогон A: ${r && JSON.stringify(r.body)}`);
  w.choose("M.X");
  expect(/тесты типа M/.test((w.q(".algo-runner__unit") || {}).textContent || ""), "M.X: у строки запуска не видно «тесты типа M»");
  r = await w.runOnce();
  expect(r && JSON.stringify(r.body.tests) === '["TestM"]', `прогон M.X: ${r && JSON.stringify(r.body)}`);
  expect(w.solved()["p.M.X"] && w.solved()["p.M.Y"], `зелёный прогон типа не отметил M.X и M.Y: ${JSON.stringify(w.solved())}`);
  expect(/✓/.test(w.optText("M.Y")), "после зелёного типа у M.Y нет ✓ в списке");
  w.choose("C");
  expect(/весь пакет/.test((w.q(".algo-runner__unit") || {}).textContent || ""), "C: у строки запуска не видно «весь пакет»");
  r = await w.runOnce();
  expect(r && !("tests" in r.body), `прогон C ушёл с фильтром: ${r && JSON.stringify(r.body)}`);
  const res = w.events.filter((e) => e.type === "algo-runner:result");
  expect(res.length === 3 && res[0].fn === "A" && res[0].unit === "func" && res[1].fn === "M.X" && res[1].unit === "type" && res[2].fn === "C" && res[2].unit === "pkg",
    `событие: fn и unit — ${JSON.stringify(res.map((e) => [e.fn, e.unit]))}`);
  expect(res.every((e) => e.draft === "" && e.hints === 0 && e.gaveUp === false && e.pkg === "p" && "stage" in e && "noTests" in e),
    `событие: прежние поля и draft/hints/gaveUp — ${JSON.stringify(res[0])}`);
  // Пакет решённым, как раньше, — только зелёный прогон без фильтра.
  expect(!w.dom.window.localStorage.getItem("algoPkgSolved"), "зелёный прогон с фильтром отметил пакет решённым");
  // Смена упражнения код не меняет.
  const before = w.code();
  w.choose("B");
  expect(w.code() === before, "смена упражнения поменяла код в редакторе");
  expect(w.events.filter((e) => e.type === "algo-runner:state").map((e) => e.up).join() === "true", "сервер ответил, а события state up: true нет");
  expect(!w.errors.length, `ошибки в консоли: ${w.errors.join(" | ")}`);

  // (b) Выбор по умолчанию — первое неотмеченное, у которого отмечены все needs.
  const S = (...names) => ({ algoFnSolved: JSON.stringify(Object.fromEntries(names.map((n) => ["p." + n, 1]))) });
  w = await page({ seed: S("A") });
  expect(w.pick() && w.pick().value === "B", `A отмечена — выбрано «${w.pick() && w.pick().value}», а не B`);
  w = await page({ seed: S("A", "B", "C", "M.X", "M.Y", "D") });
  expect(w.pick() && w.pick().value === "", `все отмечены — выбрано «${w.pick() && w.pick().value}», а не «весь пакет»`);
  r = await w.runOnce();
  expect(r && !("tests" in r.body), `все отмечены — запрос с фильтром: ${r && JSON.stringify(r.body)}`);
  w = await page({ stub: Object.assign({}, STUB, { funcs: [FUNCS[5], FUNCS[0]] }) });
  expect(w.pick() && w.pick().value === "A", `D (нужна A) стоит первой — выбрано «${w.pick() && w.pick().value}», а не A`);
  const P = ex("P", { tests: ["TestP"], needs: ["Q"] }), Qx = ex("Q", { tests: ["TestQ"], needs: ["P"] });
  w = await page({ stub: Object.assign({}, STUB, { funcs: [P, Qx] }) });
  expect(w.pick() && w.pick().value === "P", `у всех неотмеченных needs не отмечены — выбрано «${w.pick() && w.pick().value}», а не первое`);
  w = await page({ stub: Object.assign({}, STUB, { funcs: [] }) });
  expect(!w.pick(), "funcs пуст, а список выбора нарисован");
  // Зелёный прогон последнего неотмеченного — совет прогнать пакет целиком, выбор переходит на «весь пакет».
  w = await page({ seed: S("A", "C", "M.X", "M.Y", "D") });
  expect(w.pv() === "B", "B — единственная неотмеченная");
  await w.runOnce();
  expect(w.pv() === "" && /пакет целиком/.test(w.root.textContent), `все отмечены после зелёного: выбор «${w.pv()}», совета нет`);
  // Запись по свежему чтению: другая вкладка отметила своё уже после загрузки этой — отметка не теряется.
  w = await page();
  w.dom.window.localStorage.setItem("algoFnSolved", JSON.stringify({ "q.Other": 5 }));
  await w.runOnce();
  expect(w.solved()["q.Other"] === 5 && w.solved()["p.A"], `две вкладки: запись algoFnSolved затёрла чужую отметку — ${JSON.stringify(w.solved())}`);
  // Конструктор типа со своими тестами (как binheap.BuildHeap): тесты типа его не проверяют, и зелёный
  // прогон типа его не отмечает; его собственный зелёный — отмечает только его.
  const K = ex("K", { tests: ["TestK"], group: "M", groupTests: ["TestM"] });
  w = await page({ stub: Object.assign({}, STUB, { funcs: [K, FUNCS[3], FUNCS[4]] }) });
  w.choose("M.X");
  await w.runOnce();
  expect(w.solved()["p.M.X"] && w.solved()["p.M.Y"] && !w.solved()["p.K"], `зелёный прогон типа отметил конструктор со своими тестами: ${JSON.stringify(w.solved())}`);
  w.choose("K");
  r = await w.runOnce();
  expect(r && JSON.stringify(r.body.tests) === '["TestK"]' && w.solved()["p.K"], `K со своими тестами: ${r && JSON.stringify(r.body)}`);
  // Отметка — только по ok.
  for (const bad of [
    Object.assign({}, RED),
    { stage: "tests", ok: false, build: true, noTests: true, passed: 0, failed: 0, tests: null, filtered: true, output: "", duration: "1s", reason: "ни один тест не запустился — в пакете нет тестов с такими именами: TestA" },
    { stage: "tests", ok: false, build: true, timeout: true, passed: 1, failed: 1, filtered: true, output: "", duration: "20s", reason: "тест TestA не уложился в 20s", tests: [{ name: "TestA", pass: false, killed: "timeout", output: "" }] },
    { stage: "tests", ok: false, build: true, passed: 1, failed: 0, filtered: true, output: "", duration: "1s", reason: "не запустились запрошенные тесты: TestA2 — в пакете нет тестов с такими именами", tests: [{ name: "TestA", pass: true, output: "" }] },
  ]) {
    w = await page({ run: bad });
    await w.runOnce();
    expect(!w.solved()["p.A"], `отметка без ok: ${JSON.stringify(bad).slice(0, 90)}`);
  }

  // needs: после красного прогона D при неотмеченной A — строка над выводом, вывод на месте.
  w = await page({ run: RED });
  w.choose("D");
  await w.runOnce();
  const needs = w.q(".algo-runner__out").firstChild;
  expect(needs && /тесты зовут ещё не решённые упражнения: A — начни с них/i.test(needs.textContent), `строки про needs нет: «${w.q(".algo-runner__out").textContent.slice(0, 160)}»`);
  expect(/Часть тестов упала/.test(w.q(".algo-runner__out").textContent), "строка про needs заменила вывод");
  w = await page({ run: RED, seed: S("A") });
  w.choose("D");
  await w.runOnce();
  expect(!/тесты зовут/i.test(w.root.textContent), "A отмечена, а строка про needs всё равно есть");

  // (c) Код: без черновика — plain, с черновиком — черновик; «Сбросить» спрашивает, только если код отличается.
  const reset = (w) => [...w.root.querySelectorAll(".algo-runner__bar button")].find((b) => b.textContent === "Сбросить").click();
  w = await page();
  expect(w.code() === STUB.plain, `без черновика в редакторе не plain: «${w.code()}»`);
  reset(w);
  expect(w.confirms.length === 0 && w.code() === STUB.plain, "«Сбросить» на нетронутой заготовке спросил подтверждение");
  w = await page({ seed: { "algoRunnerCode:p": "мой черновик" } });
  expect(w.code() === "мой черновик", `сохранённый черновик подменён: «${w.code()}»`);
  reset(w);
  expect(w.confirms.length === 1 && w.code() === STUB.plain && w.dom.window.localStorage.getItem("algoRunnerCode:p") === null, "«Сбросить» с правками: нет подтверждения или не вернул plain");
  w = await page({ attrs: 'data-pkg="p" data-draft="mixed"', seed: { "algoRunnerCode:p": "решение главы", "algoRunnerCode:mixed:p": "черновик смешанной" } });
  expect(w.code() === "черновик смешанной", `data-draft="mixed": в редакторе «${w.code()}»`);
  w = await page({ attrs: 'data-pkg="p" data-fresh="true"', seed: { "algoRunnerCode:p": "решение главы" } });
  expect(w.code() === STUB.plain, `data-fresh: подсунуто решение главы — «${w.code()}»`);

  // Подсказки — по порядку, к выбранному упражнению; заметки типа и пакета — своими кнопками.
  w = await page();
  expect(w.helpBtn(/Признак и сложность/) && !w.helpBtn(/Рецепт/), "A: до «Признака» уже видна кнопка «Рецепт» или нет кнопки «Признак и сложность»");
  expect(w.helpBtn(/О пакете/) && !w.helpBtn(/О полях типа/), "A: нет «О пакете» или есть «О полях типа»");
  const helpText = () => (w.q(".algo-runner__help") || {}).textContent || "";
  w.press(/Признак и сложность/);
  expect(/Ожидаемая сложность: O\(n\)/.test(helpText()) && w.helpBtn(/Рецепт/), "после «Признака» нет текста подсказки или кнопки «Рецепт»");
  w.press(/Рецепт/);
  expect(/двигайте окно/.test(helpText()), "рецепт не открылся");
  expect(w.code() === STUB.plain, "подсказка поменяла код читателя");
  w.choose("M.X");
  expect(w.helpBtn(/О полях типа/) && w.helpBtn(/Рецепт/) && !/двигайте окно/.test(helpText()), "M.X: панель не перешла на выбранное упражнение");
  w.choose("M.Y");
  expect(!w.helpBtn(/Рецепт|Признак/), "M.Y: кнопки без содержимого нарисованы");
  w.choose("A");
  expect(!w.helpBtn(/Сдаюсь/), "«Сдаюсь» видна до прогона");
  // Заметка о пакете относится к любому упражнению и считается вместе с подсказками.
  w.press(/О пакете/);
  expect(/о пакете целиком/.test(helpText()), "заметка о пакете не открылась");
  await w.runOnce();
  let last = w.events.filter((e) => e.type === "algo-runner:result").pop();
  expect(last && last.hints === 3, `hints в событии после двух подсказок A и заметки о пакете: ${last && last.hints}`);

  // (d) «Сдаюсь»: после завершившегося прогона, с подтверждением; эталон — отдельно, код читателя цел.
  const give = w.helpBtn(/Сдаюсь/);
  expect(!!give, "после прогона нет «Сдаюсь — показать эталон»");
  if (give) {
    give.click();
    await tick();
    expect(w.confirms.length === 1, "«Сдаюсь» без подтверждения");
    // подтверждение говорит, чем «Сдаюсь» обернётся в повторениях (srs.js: «Забыл» или карточка на завтра)
    expect(/«Забыл»/.test(w.confirms[0] || "") && /карточка пакета p вернётся завтра/.test(w.confirms[0] || "") && /заведётся на завтра/.test(w.confirms[0] || ""),
      `подтверждение «Сдаюсь» не говорит, что это «Забыл»: «${w.confirms[0]}»`);
    expect(w.calls.some((c) => /\/api\/solution\?pkg=p&func=A$/.test(c.url)), `запрос эталона: ${w.calls.map((c) => c.url).join(" ")}`);
    const sol = w.q(".algo-runner__solution");
    expect(sol && /эталон A/.test(sol.textContent), "эталон не показан в отдельной панели");
    expect(w.code() === STUB.plain, "эталон поменял код в редакторе");
    const g = w.events.filter((e) => e.type === "algo-runner:giveup");
    expect(g.length === 1 && g[0].pkg === "p" && g[0].fn === "A", `событие giveup: ${JSON.stringify(g)}`);
    await w.runOnce();
    last = w.events.filter((e) => e.type === "algo-runner:result").pop();
    expect(last.fn === "A" && last.gaveUp === true, `после «Сдаюсь» событие по A без gaveUp: ${JSON.stringify(last)}`);
    expect(w.solved()["p.A"], "после «Сдаюсь» зелёный прогон не отметил A (отметка ставится как обычно)");
  }
  w = await page({ solution: { status: 404, error: "эталона этой функции нет" } });
  await w.runOnce();
  w.press(/Сдаюсь/);
  await tick();
  expect(/эталона этой функции нет/.test((w.q(".algo-runner__help") || {}).textContent || ""), "ошибка эталона не показана строкой в панели");
  expect(!w.events.some((e) => e.type === "algo-runner:giveup"), "ошибка эталона, а событие giveup ушло");
  // Сервер не ответил на прогон — «Сдаюсь» не появляется: прогон не завершился.
  w = await page({ run: () => { throw new Error("сеть"); } });
  await w.runOnce();
  expect(!w.helpBtn(/Сдаюсь/), "прогон не завершился, а «Сдаюсь» появилась");

  // (e) data-hints="off": панели нет, код — plain, «Сдаюсь» нет и после прогона.
  w = await page({ attrs: 'data-pkg="p" data-hints="off"' });
  await w.runOnce();
  expect(!w.root.querySelector(".algo-runner__help button") && w.code() === STUB.plain, "data-hints=off: есть кнопки панели или код не plain");

  // data-func: выбор снаружи, списка нет; имени нет в funcs — пакет целиком, без панели, строка-пояснение.
  w = await page({ attrs: 'data-pkg="p" data-func="M.Y"' });
  expect(!w.pick(), "data-func: список выбора нарисован");
  r = await w.runOnce();
  expect(r && JSON.stringify(r.body.tests) === '["TestM"]', `data-func=M.Y: ${r && JSON.stringify(r.body)}`);
  w = await page({ attrs: 'data-pkg="p" data-func="Gone"' });
  r = await w.runOnce();
  expect(r && !("tests" in r.body) && !w.root.querySelector(".algo-runner__help button") && /Gone/.test(w.lines()),
    `data-func нет в funcs: ${r && JSON.stringify(r.body)}, строка «${w.lines()}»`);
  // data-tests + data-func (собеседование): гоняются data-tests, событие несёт fn.
  w = await page({ attrs: `data-pkg="p" data-func="D" data-tests='["TestD"]' data-fresh="true" data-hints="off"`, run: RED });
  r = await w.runOnce();
  last = w.events.filter((e) => e.type === "algo-runner:result").pop();
  expect(r && JSON.stringify(r.body.tests) === '["TestD"]' && last.fn === "D" && last.draft === "mock" && !w.pick(), `собеседование: ${r && JSON.stringify(r.body)} ${JSON.stringify(last)}`);
  // В своём черновике лист чистый: сосед называется словами «на этом листе их тоже нужно написать».
  expect(/Тесты зовут и соседние упражнения: A — на этом листе их тоже нужно написать/.test(w.root.textContent), "собеседование: нет строки про needs");

  // warning и сервер прежней версии: работаем по code, пакет целиком, без панели; warning — одной строкой.
  w = await page({ stub: { pkg: "p", code: "package p\nfunc (", plain: "package p\nfunc (", funcs: [], notes: [], warning: "разбор заготовки: stub.go:2:7: expected ')'" } });
  r = await w.runOnce();
  expect(w.code() === "package p\nfunc (" && !w.pick() && !w.root.querySelector(".algo-runner__help button") && r && !("tests" in r.body) &&
    /разбор заготовки/.test(w.lines()), "warning: не по code, есть список/панель или нет строки");
  w = await page({ stub: { pkg: "p", code: "package p // старый сервер\n" } });
  r = await w.runOnce();
  expect(w.code() === "package p // старый сервер\n" && !w.pick() && r && !("tests" in r.body) && !w.errors.length, `старый сервер: ${w.errors.join(" | ")}`);

  // (g) Сервер не отвечает: прежняя инструкция, state up: false, ни списка, ни панели, ни исключений.
  w = await page({ down: true });
  expect(/Runner не отвечает/.test(w.root.textContent) && !w.pick() && !w.root.querySelector(".algo-runner__help button"), "сервер не отвечает: нет инструкции или нарисованы список/панель");
  expect(w.events.filter((e) => e.type === "algo-runner:state").map((e) => e.up).join() === "false", `сервер не отвечает: события state — ${JSON.stringify(w.events)}`);
  expect(!w.errors.length, `сервер не отвечает: ошибки — ${w.errors.join(" | ")}`);

  // Хранилище недоступно: виджет работает, отметка живёт в пределах вкладки.
  w = await page({ noStorage: true });
  expect(w.code() === STUB.plain && w.pv() === "A", "без хранилища виджет не поднялся");
  if (w.q(".algo-runner__btn--run")) await w.runOnce();
  expect(/✓/.test(w.optText("A")) && !w.errors.length, `без хранилища: ✓ нет или ошибки — ${w.errors.join(" | ")}`);

  await fixRoundOne(S);
  expect(!unhandled.length, `необработанные отказы промисов: ${unhandled.join(" | ")}`);
}

// Заход правок 1: каждый случай ловит свой мутант (список — в отчёте Task 5).
async function fixRoundOne(S) {
  const lastResult = (w) => w.events.filter((e) => e.type === "algo-runner:result").pop() || {};
  const outText = (w) => (w.q(".algo-runner__out") || {}).textContent || "";

  // gaveUp — по участникам единицы: эталон M.X, затем прогон типа с выбранным M.Y — тоже списанный.
  let w = await page();
  w.choose("M.X");
  await w.runOnce();
  w.press(/Сдаюсь/);
  await tick();
  w.choose("M.Y");
  await w.runOnce();
  let last = lastResult(w);
  expect(last.fn === "M.Y" && last.unit === "type" && last.gaveUp === true, `эталон M.X, прогон типа из M.Y без gaveUp: ${JSON.stringify(last)}`);

  // hints — тоже по участникам: рецепт M.X, открытый перед прогоном типа из M.Y, считается; подсказка A — нет.
  w = await page();
  w.press(/Признак и сложность/); // подсказка A — не участник единицы M
  w.choose("M.X");
  w.press(/Рецепт/);
  w.choose("M.Y");
  await w.runOnce();
  last = lastResult(w);
  expect(last.fn === "M.Y" && last.hints === 1, `рецепт M.X перед прогоном типа из M.Y: hints = ${last.hints}, ожидалось 1`);

  // /api/stub ответил ошибкой — runner на связи: state up: true, инструкции «Runner не отвечает» нет.
  for (const status of [404, 500]) {
    w = await page({ stub: { error: "заготовка не найдена" }, stubStatus: status });
    const states = w.events.filter((e) => e.type === "algo-runner:state").map((e) => e.up).join();
    expect(states === "true" && !/Runner не отвечает/.test(w.root.textContent) && /Runner ответил ошибкой: заготовка не найдена/.test(w.lines()) && !w.errors.length,
      `/api/stub → ${status}: state «${states}», текст «${w.root.textContent.slice(0, 120)}», ошибки ${w.errors.join(" | ")}`);
  }

  // Черновик не пишется после того, как виджет убрали со страницы (смешанная выдала новую задачу и
  // стёрла его); контроль — без удаления пишется.
  const typeDraft = (w, text) => {
    const ta = w.q(".algo-runner__ta");
    ta.value = text;
    ta.dispatchEvent(new w.dom.window.Event("input", { bubbles: true }));
  };
  w = await page({ attrs: 'data-pkg="p" data-draft="mixed"' });
  typeDraft(w, "набрано за миг до следующей задачи");
  w.root.remove();
  await tick(600);
  expect(w.dom.window.localStorage.getItem("algoRunnerCode:mixed:p") === null, "черновик записан после удаления виджета — стёртое воскреснет у следующей задачи");
  w = await page({ attrs: 'data-pkg="p" data-draft="mixed"' });
  typeDraft(w, "набрано");
  await tick(600);
  expect(w.dom.window.localStorage.getItem("algoRunnerCode:mixed:p") === "набрано", "контроль: черновик на странице не сохранился");
  {
    const at = JSON.parse(w.dom.window.localStorage.getItem("algoRunnerCodeAt") || "{}");
    const ts = at["algoRunnerCode:mixed:p"];
    expect(typeof ts === "number" && Math.abs(Date.now() - ts) < 60000, `сохранение черновика не записало время в algoRunnerCodeAt (${JSON.stringify(at)}) — импорт не отличит свежий черновик от старого`);
  }

  // В своём черновике сосед, отмеченный в algoFnSolved (решал в главе), всё равно не написан.
  w = await page({ attrs: 'data-pkg="p" data-func="D" data-draft="review"', run: RED, seed: S("A") });
  await w.runOnce();
  expect(/Тесты зовут и соседние упражнения: A — на этом листе их тоже нужно написать/.test(outText(w)),
    `черновик review, A отмечена в главе: строки про соседа нет — «${outText(w).slice(0, 120)}»`);

  // Подпись эталона говорит, что строк import в нём нет.
  w = await page();
  await w.runOnce();
  w.press(/Сдаюсь/);
  await tick();
  expect(/строк import в нём нет — нужные пакеты допиши сам/.test((w.q(".algo-runner__solution") || {}).textContent || ""), "в подписи эталона нет пометки про import");

  // CodeMirror: подставной загрузчик. Контроль — ответил сразу: редактор CodeMirror (textarea нет).
  // Подставные модули повторяют форму настоящих: lang-go отдаёт go(), one-dark — теги своей
  // HighlightStyle (у тега есть имя, как у @lezer/highlight), language — HighlightStyle и
  // syntaxHighlighting. По ним runner собирает цвета книги — тем же путём, что живая книга.
  let built = 0, langGo = 0, styled = null, oneDarkUsed = 0, matcher = null;
  const tag = (name) => ({ toString: () => name });
  const nodeAt = {}; // позиция → имя узла разбора для syntaxTree().resolveInner
  const modules = (url) => {
    if (/^https:\/\/esm\.sh\/@codemirror\/language@/.test(url)) return {
      HighlightStyle: { define: (specs) => ({ specs }) },
      syntaxHighlighting: (hs) => { styled = hs; return {}; },
      syntaxTree: () => ({ resolveInner: (pos) => ({ name: nodeAt[pos] || "VariableName" }) }),
    };
    if (/^https:\/\/esm\.sh\/@codemirror\/view@/.test(url)) return {
      MatchDecorator: function (cfg) { matcher = cfg; },
      ViewPlugin: { fromClass: () => ({}) },
      Decoration: { mark: (spec) => spec },
    };
    if (/^https:\/\/esm\.sh\/@codemirror\/lang-go@/.test(url)) return { go: () => { langGo++; return {}; } };
    if (/^https:\/\/esm\.sh\/@codemirror\/theme-one-dark@/.test(url)) return {
      get oneDark() { oneDarkUsed++; return {}; },
      oneDarkTheme: {},
      oneDarkHighlightStyle: { specs: [
        { tag: tag("keyword"), color: "#c678dd" },
        { tag: [tag("typeName"), tag("number")], color: "#e5c07b" },
        { tag: [tag("function(variableName)")], color: "#61afef" },
        { tag: [tag("atom"), tag("bool")], color: "#d19a66" },
        { tag: tag("strong"), fontWeight: "bold" },
      ] },
    };
    const EditorView = function () { built++; this.state = { doc: { toString: () => "", length: 0 } }; };
    EditorView.theme = () => ({});
    return { EditorView, basicSetup: [] };
  };
  const goWords = { kw: { func: 1, nil: 1, true: 1, iota: 1 }, type: { int: 1 }, fn: { len: 1, append: 1 } };
  w = await page({ importer: (url) => Promise.resolve(modules(url)), goWords });
  expect(built === 1 && !w.q(".algo-runner__ta") && /сервер на связи/.test(w.q(".algo-runner__status").textContent),
    `контроль: CodeMirror ответил сразу, а построено ${built}, textarea ${!!w.q(".algo-runner__ta")}`);
  // Докраска словарями hlGo: nil — константа, len — встроенная функция, ключевое слово func — не
  // её дело (его красит грамматика); в комментарии — ничего.
  const deco = (word, pos = 0) => { matcher.regexp.lastIndex = 0; const m = matcher.regexp.exec(word); return m && m[0] === word ? matcher.decoration(m, { state: {} }, pos) : null; };
  nodeAt[7] = "LineComment";
  expect(matcher && (deco("nil") || {}).class === "algo-tp__tok--kw" && (deco("len") || {}).class === "algo-tp__tok--fn" &&
    deco("func") === null && deco("lens") === null && deco("nil", 7) === null,
    `докраска predeclared: nil ${JSON.stringify(deco("nil"))}, len ${JSON.stringify(deco("len"))}, func ${JSON.stringify(deco("func"))}, в комментарии ${JSON.stringify(deco("nil", 7))}`);
  // Цвета книги: язык — из lang-go, теги — на токенах --hl-* (типы синие, как у hlGo, числа свои,
  // вызов — цвет функции, bool — ключевого слова), запасной oneDark не взят.
  const colorOf = (name) => ((styled && styled.specs) || []).filter((s) => String(s.tag) === name).map((s) => s.color)[0];
  expect(langGo === 1 && styled && oneDarkUsed === 0, `путь цветов книги: go() ${langGo}, HighlightStyle ${!!styled}, oneDark взят ${oneDarkUsed}`);
  expect(colorOf("typeName") === "var(--hl-type)" && colorOf("number") === "var(--hl-number)" &&
    colorOf("function(variableName)") === "var(--hl-function)" && colorOf("bool") === "var(--hl-keyword)" &&
    colorOf("keyword") === "var(--hl-keyword)" && colorOf("strong") === undefined,
    `теги не на токенах книги: ${JSON.stringify(((styled && styled.specs) || []).map((s) => String(s.tag) + "=" + s.color))}`);
  // lang-go без go() (другая версия модуля) — не CodeMirror без языка, а textarea.
  built = 0;
  w = await page({ importer: (url) => Promise.resolve(/lang-go@/.test(url) ? {} : modules(url)) });
  await tick();
  expect(built === 0 && w.root.querySelectorAll(".algo-runner__ta").length === 1, `lang-go без go(): построено ${built}, textarea ${w.root.querySelectorAll(".algo-runner__ta").length}`);
  // CDN не отвечает: до срока — ожидание, по сроку (8 с, управляемые часы) — textarea, прогон работает.
  built = 0;
  w = await page({ importer: () => new Promise(() => {}), holdSlow: true });
  expect(!w.q(".algo-runner__ta") && w.held.length === 1, `CDN молчит: до срока textarea ${!!w.q(".algo-runner__ta")}, отложенных таймеров ${w.held.length}`);
  w.held.forEach((fire) => fire());
  await tick();
  expect(w.code() === STUB.plain && /сервер на связи/.test(w.q(".algo-runner__status").textContent), `CDN молчит: по сроку нет textarea с заготовкой — «${w.q(".algo-runner__status").textContent}»`);
  const r = await w.runOnce();
  expect(r && JSON.stringify(r.body.tests) === '["TestA"]', "CDN молчит: после срока прогон не ушёл");
  // CodeMirror пришёл после срока — игнорируется: textarea остаётся одна, CodeMirror не строится.
  let release;
  const gate = new Promise((res) => { release = res; });
  built = 0;
  w = await page({ importer: (url) => gate.then(() => modules(url)), holdSlow: true });
  w.held.forEach((fire) => fire());
  await tick();
  release();
  await tick();
  expect(built === 0 && w.root.querySelectorAll(".algo-runner__ta").length === 1, `CodeMirror после срока: построено ${built}, textarea ${w.root.querySelectorAll(".algo-runner__ta").length}`);
}

// Живой виджет на подставном сервере: плашка пределов встаёт в шапку перед статусом, а
// /api/health запрашивается один раз на страницу, сколько бы виджетов на ней ни было.
function widgetPage(limits, runResponse) {
  const calls = { health: 0 };
  const page = new JSDOM(`<!DOCTYPE html><html><body><div class="algo-runner" data-pkg="dp"></div>` +
    `<div class="algo-runner" data-pkg="graphs" data-race="true"></div><script>${js}</script></body></html>`, {
    runScripts: "dangerously", url: "http://localhost:3000/x.html",
    beforeParse(w) {
      w.fetch = (url) => {
        const health = /\/api\/health$/.test(url);
        if (health) calls.health++;
        const body = health ? { ok: true, limits } : /\/api\/run$/.test(url) ? runResponse : { pkg: "dp", code: "package dp\n" };
        return Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
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

  // Событие algo-runner:result несёт stage и noTests: по ним соседи (смешанная тренировка, карточки)
  // отличают «ни один тест не запустился» и «не запустился прогон» от красных тестов.
  const ran = await widgetPage(undefined, noTests);
  const seen = [];
  ran.doc.addEventListener("algo-runner:result", (e) => seen.push(e.detail));
  ran.doc.querySelector(".algo-runner__btn--run").click();
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(seen.length === 1 && seen[0].pkg === "dp" && seen[0].ok === false && seen[0].filtered === true && seen[0].noTests === true && seen[0].stage === "tests",
    `событие algo-runner:result: ${JSON.stringify(seen)}`);

  await unitsAndHints();

  if (fails.length) { console.error("❌ runner-render-check:\n  - " + fails.join("\n  - ")); process.exit(1); }
  console.log("✅ runner-render-check: остановка показана причиной (срок ⏱, память 💾, обрезка ✂), прогон без единого теста — тоже (фильтр не совпал △, не запустился ✗, сборке не хватило памяти или срока), ошибка компиляции — строкой компилятора (и в трассе), упавший табличный тест — сообщением случая, прогон без упавших тестов, но не зелёный — «не засчитан» (зелёные строки названы незасчитанными), оборванный — «оборван», событие результата несёт stage, noTests, fn, unit, draft, hints, gaveUp, плашка пределов в шапке, обычное падение и зелёный прогон — как раньше; виджет гоняет выбранное упражнение (функция / тип / пакет), отмечает algoFnSolved только по ok, открывается с plain, подсказки и эталон — за кнопками");
})().catch((e) => {
  // Исключение в самой проверке — провал, а не тихий выход с кодом 0.
  console.error("❌ runner-render-check: проверка упала —", e && e.stack || e);
  process.exit(1);
});
