/* runner.js — «решай задачу прямо в книге».
 *
 * Виджет <div class="algo-runner" data-pkg="astar"></div> подтягивает заготовку
 * пакета из локального helper-сервера (cmd/runner), даёт редактор кода и кнопку
 * «Прогнать тесты», которая запускает настоящий `go test` и показывает результат.
 *
 * Сервер локальный: `cd exercises && go run ./cmd/runner` (по умолчанию :8080).
 * Без зависимостей-сборщика; CodeMirror 6 грузится по ESM с CDN, при сбое —
 * аккуратный фолбэк на textarea, так что виджет работает всегда.
 *
 * Новая заготовка открывается без подсказок (поле plain ответа /api/stub), а гоняются
 * тесты ОДНОГО упражнения — список в шапке, по умолчанию первое нерешённое. Подсказки
 * и эталон — за кнопками под редактором. Атрибуты, события и ключи — у initWidget.
 */
(function () {
  "use strict";

  // ---- хранилище ----

  // localStorage бывает недоступен (приватный режим, запрет cookies) — тогда он бросает уже на
  // обращении. Виджет при этом работает в пределах вкладки и ничего не выдаёт за сохранённое.
  function lsGet(k) {
    try { return window.localStorage.getItem(k); } catch (e) { return null; }
  }
  function lsSet(k, v) {
    try { window.localStorage.setItem(k, v); } catch (e) { /* хранилище недоступно */ }
  }
  function lsDel(k) {
    try { window.localStorage.removeItem(k); } catch (e) { /* хранилище недоступно */ }
  }
  function readMap(k) {
    try {
      var v = JSON.parse(lsGet(k) || "{}");
      return v && typeof v === "object" && !Array.isArray(v) ? v : {};
    } catch (e) {
      return {};
    }
  }

  // Адрес runner-сервера. Можно переопределить в консоли:
  //   localStorage.setItem('algoRunnerUrl','http://localhost:9000')
  var RUNNER_URL = (lsGet("algoRunnerUrl") || "http://localhost:8080").replace(/\/$/, "");

  // ---- загрузка редактора (CodeMirror 6 с фолбэком на textarea) ----

  // ?deps закрепляет ВЕСЬ граф пакетов, а не только state/view. codemirror
  // зависит от lint/search/autocomplete по «^6.0.0», и esm.sh берёт их последние
  // версии: когда закреплены были только state и view, свежий lint потребовал
  // view новее закреплённого («does not provide an export named activateHover»),
  // и редактор молча откатывался на textarea у всех. Обновлять — всем набором.
  var DEPS = [
    "@codemirror/state@6.7.6", "@codemirror/view@6.43.13", "@codemirror/language@6.12.4",
    "@codemirror/autocomplete@6.20.3", "@codemirror/lint@6.9.7", "@codemirror/search@6.7.2",
    "@codemirror/commands@6.11.1", "@lezer/common@1.5.3", "@lezer/highlight@1.2.5", "@lezer/lr@1.4.10",
  ].join(",");
  // У language — РОВНО её собственные зависимости: esm.sh кладёт список deps в
  // адрес сборки, и с полным списком получалась вторая копия модуля. StreamLanguage
  // из неё не видела подсветку из basicSetup — код в редакторе был одного цвета.
  var LANG_DEPS = "@codemirror/state@6.7.6,@codemirror/view@6.43.13,@lezer/common@1.5.3,@lezer/highlight@1.2.5,@lezer/lr@1.4.10";
  var CM_URL = "https://esm.sh/codemirror@6.0.2?deps=" + DEPS;
  var LANG_URL = "https://esm.sh/@codemirror/language@6.12.4?deps=" + LANG_DEPS;
  var GO_URL = "https://esm.sh/@codemirror/legacy-modes@6.5.4/mode/go?deps=" + DEPS;
  var DARK_URL = "https://esm.sh/@codemirror/theme-one-dark@6.1.3?deps=" + DEPS;

  // Тёмные темы mdBook (по умолчанию книга открывается в navy): светлый редактор
  // в них — белый прямоугольник посреди страницы.
  function darkBook() {
    return /\b(coal|navy|ayu)\b/.test(document.documentElement.className);
  }

  // Загрузчик модулей; window.ALGO_RUNNER_IMPORT подменяет его в проверке (runner-render-check:
  // CDN, который не отвечает, и CodeMirror, пришедший после срока).
  function importModule(url) {
    return typeof window.ALGO_RUNNER_IMPORT === "function" ? window.ALGO_RUNNER_IMPORT(url) : import(/* @vite-ignore */ url);
  }

  var cmPromise = null;
  var cmMod = null;   // CodeMirror загружен — следующие редакторы берут его сразу
  var cmSlow = false; // загрузка не уложилась в срок — следующие редакторы сразу textarea, без ожидания
  function loadCM() {
    if (!cmPromise) {
      cmPromise = Promise.all([
        importModule(CM_URL),
        importModule(LANG_URL),
        importModule(GO_URL),
        darkBook() ? importModule(DARK_URL) : null,
      ]).then(function (m) {
        cmMod = { cm: m[0], lang: m[1], go: m[2].go, dark: m[3] && m[3].oneDark };
        return cmMod;
      });
    }
    return cmPromise;
  }

  // Срок загрузки CodeMirror. Ошибка загрузки и так даёт textarea, а зависание (сеть молча
  // отбрасывает пакеты, прокси, нет выхода наружу) без срока оставляло виджет на «загрузка…»
  // навсегда: заготовка уже пришла, а кнопка прогона мертва — редактора нет.
  var CM_TIMEOUT_MS = 8000;

  // mountEditor возвращает объект { getValue, setValue } независимо от того,
  // удалось ли поднять CodeMirror. CodeMirror, пришедший после срока, этому редактору
  // уже не нужен: textarea стоит, читатель, возможно, в нём печатает.
  function mountEditor(host, initialCode) {
    if (cmMod) return Promise.resolve(editorOrTextarea(cmMod, host, initialCode));
    if (cmSlow) return Promise.resolve(textareaEditor(host, initialCode));
    return new Promise(function (resolve) {
      var settled = false;
      function settle(make) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(make());
      }
      var timer = setTimeout(function () {
        cmSlow = true;
        settle(function () { return textareaEditor(host, initialCode); });
      }, CM_TIMEOUT_MS);
      loadCM().then(
        function (mod) { settle(function () { return editorOrTextarea(mod, host, initialCode); }); },
        function () { settle(function () { return textareaEditor(host, initialCode); }); }
      );
    });
  }
  function editorOrTextarea(mod, host, initialCode) {
    try {
      return cmEditor(mod, host, initialCode);
    } catch (e) {
      console.warn("algo-runner: CodeMirror не поднялся, работаю в textarea", e);
      return textareaEditor(host, initialCode);
    }
  }
  function cmEditor(mod, host, initialCode) {
    var view = new mod.cm.EditorView({
      doc: initialCode,
      extensions: [
        mod.cm.basicSetup,
        mod.lang.StreamLanguage.define(mod.go),
        mod.cm.EditorView.theme({
          "&": { fontSize: "13px", maxHeight: "440px" },
          ".cm-scroller": { overflow: "auto", fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace" },
        }),
      ].concat(mod.dark ? [mod.dark] : []),
      parent: host,
    });
    return {
      getValue: function () { return view.state.doc.toString(); },
      setValue: function (v) {
        view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: v } });
      },
    };
  }

  // Фолбэк: textarea с поддержкой Tab.
  function textareaEditor(host, initialCode) {
    var ta = document.createElement("textarea");
    ta.className = "algo-runner__ta";
    ta.spellcheck = false;
    ta.value = initialCode;
    ta.addEventListener("keydown", function (e) {
      if (e.key === "Tab") {
        e.preventDefault();
        var s = ta.selectionStart, en = ta.selectionEnd;
        ta.value = ta.value.slice(0, s) + "\t" + ta.value.slice(en);
        ta.selectionStart = ta.selectionEnd = s + 1;
      }
    });
    host.appendChild(ta);
    return {
      getValue: function () { return ta.value; },
      setValue: function (v) { ta.value = v; },
    };
  }

  // ---- сеть ----

  // api — ответ сервера (JSON) или отказ. Отказ помечен: network — сервер не ответил вовсе (не запущен,
  // другой адрес, нет fetch), status — ответил ошибкой. Виджет показывает инструкцию «подними runner»
  // только в первом случае, а исключение без пометки — ошибка самого виджета, её видно в консоли.
  function api(path, opts) {
    return Promise.resolve()
      .then(function () { return fetch(RUNNER_URL + path, opts); })
      .then(function (r) {
        return r.json().then(function (j) {
          if (r.ok) return j;
          throw httpError(r.status, j && j.error);
        }, function () { throw httpError(r.status, r.ok ? "ответ не JSON" : ""); });
      }, function (e) {
        var err = new Error(String(e && e.message || e));
        err.network = true;
        throw err;
      });
  }
  function httpError(status, text) {
    var err = new Error(text || ("HTTP " + status));
    err.status = status;
    return err;
  }

  // markPkgSolved отмечает пакет решённым, когда тесты позеленели. Единственный
  // момент, когда это вообще известно: «прошёл ли читатель пакет» больше нигде
  // не фиксируется. Данные забирает движок повторений (srs.js) — код забывается
  // быстрее теории, поэтому решённый пакет через несколько недель имеет смысл
  // перерешать с чистой заготовки.
  var PKG_SOLVED = "algoPkgSolved";
  function markPkgSolved(pkg) {
    var s = readMap(PKG_SOLVED);
    s[pkg] = Date.now();
    lsSet(PKG_SOLVED, JSON.stringify(s));
  }

  // algoFnSolved — { "<pkg>.<имя>": ts }: упражнения, чьи тесты были зелёными (имя — как в funcs,
  // у метода с точкой: «bigo.MinStack.Push»). По нему виджет выбирает первое нерешённое и ставит «✓»
  // в списке. Запись — по свежему чтению: вторая вкладка могла отметить своё после загрузки этой.
  // fnSolvedHere — отметки этой страницы: без хранилища выбор и «✓» работают в пределах вкладки.
  var FN_SOLVED = "algoFnSolved";
  var fnSolvedHere = {};
  function fnSolved() {
    var m = readMap(FN_SOLVED);
    Object.keys(fnSolvedHere).forEach(function (k) { if (!m[k]) m[k] = fnSolvedHere[k]; });
    return m;
  }
  function markFnSolved(pkg, names) {
    if (!names.length) return;
    var m = readMap(FN_SOLVED), now = Date.now();
    names.forEach(function (n) { m[pkg + "." + n] = fnSolvedHere[pkg + "." + n] = now; });
    lsSet(FN_SOLVED, JSON.stringify(m));
  }

  function emit(root, type, detail) {
    if (typeof CustomEvent !== "function") return;
    root.dispatchEvent(new CustomEvent(type, { bubbles: true, detail: detail }));
  }

  // announce сообщает о прогоне событием на самом виджете. Так мок-интервью
  // (mixed.js) узнаёт, что тесты позеленели, не лазая во внутренности редактора
  // и не завязываясь на его разметку. stage и noTests — чтобы слушатель отличал
  // «красные тесты» от «прогон не запустился» и «ни один тест не запустился»;
  // fn, unit, draft, hints, gaveUp — что гоняли и с какой помощью (их читает оценка карточек).
  function announce(root, pkg, res, run) {
    emit(root, "algo-runner:result", {
      pkg: pkg, ok: !!res.ok, filtered: !!res.filtered, passed: res.passed || 0, failed: res.failed || 0,
      noTests: !!res.noTests, stage: res.stage || "",
      fn: run.fn, unit: run.unit, draft: run.draft, hints: run.hints, gaveUp: run.gaveUp,
    });
  }

  // runStatus — строка состояния после прогона. Отдельная функция: её проверяет смоук без сервера.
  function runStatus(res) {
    if (res.ok) return { text: "✓ всё зелёное · " + res.duration, cls: "ok" };
    if (res.memLimit) return { text: "💾 предел памяти · " + res.duration, cls: "err" };
    if (res.timeout) return { text: "⏱ не уложилось по времени · " + res.duration, cls: "err" };
    if (res.truncated) return { text: "✂ вывод обрезан · " + res.duration, cls: "err" };
    // Ни один тест не шёл — «есть падения» было бы неправдой: падать было нечему.
    if (res.noTests) return { text: "△ ни один тест не запустился · " + res.duration, cls: "err" };
    // Стадию называет сервер (stage): команда — go или ограничитель памяти перед ним — не запустилась.
    if (res.stage === "launch") return { text: "✗ прогон не запустился · " + res.duration, cls: "err" };
    if (res.race) return { text: "🏁 гонка данных · " + res.duration, cls: "err" };
    // Ни теста, ни причины, ни вывода — прогон оборвали (ушёл клиент, runner останавливается):
    // такой ответ причины не несёт по контракту, и «не засчитан» / «есть падения» были бы неправдой.
    if (cutOff(res)) return { text: "✗ прогон оборван · " + res.duration, cls: "err" };
    // До тестового бинарника не дошло — это ошибка компиляции, а не падение тестов.
    if (!res.build) return { text: "✗ не собралось · " + res.duration, cls: "err" };
    // Тесты не падали, а прогон не зелёный: бинарник упал сам либо запустились не все запрошенные тесты.
    if (!res.failed) return { text: "✗ прогон не засчитан · " + res.duration, cls: "err" };
    return { text: "✗ есть падения · " + res.duration, cls: "err" };
  }
  function cutOff(res) {
    return !(res.tests && res.tests.length) && !res.reason && !(res.output || "").trim();
  }
  // Значок перед причиной: память, срок, обрезанный вывод, «тестов не нашлось»; ✗ — любая другая причина:
  // прогон не запустился вовсе, тестовый бинарник упал сам, не запустились запрошенные тесты.
  function killMark(res) { return res.memLimit ? "💾 " : res.timeout ? "⏱ " : res.truncated ? "✂ " : res.noTests ? "△ " : "✗ "; }

  // limitsBadge — что показать в шапке про действующие пределы (ответ /api/health).
  // race — виджет с data-race: у его тестов свой срок.
  function limitsBadge(lim, race) {
    if (!lim) return null;
    // Срок — строка time.Duration: «20s» пишем как «20 с», а «1m30s» оставляем как есть
    // (parseInt дал бы «1 с»).
    var raw = String(race ? lim.raceTimeout : lim.testTimeout);
    var t = /^\d+s$/.test(raw) ? parseInt(raw, 10) + " с" : raw;
    if (lim.memory === "none") return { text: "⚠ без предела памяти · " + t, cls: "warn",
      title: "Предел памяти не действует: он выключен флагом -mem-mb 0, либо runner не нашёл ни systemd --user, ни prlimit. Бесконечный рост — например, обход без visited — может занять всю память машины. Безопасный вариант: make docker-runner." };
    if (lim.memory === "rlimit") return { text: "предел адресов " + lim.memoryText + " · " + t, cls: "",
      title: "Память ограничена через адресное пространство тестового бинарника (prlimit): грубее настоящего предела, но бесконечный рост останавливает. Тестам с -race адресов даётся больше — детектору гонок нужна теневая память." };
    return { text: "предел " + lim.memoryText + " · " + t, cls: "", title: "Прогон идёт в отдельной области с пределом памяти; тест, не уложившийся в срок, останавливается." };
  }

  // Пределы у сервера одни на все виджеты: один запрос на страницу.
  var healthPromise = null;
  function health() {
    if (!healthPromise) healthPromise = api("/api/health", {});
    return healthPromise;
  }

  // ---- рендер одного виджета ----

  // Атрибуты виджета:
  //   data-pkg          — пакет тренажёра (обязателен);
  //   data-race="true"  — тесты с -race; data-flagship — плашка «боевой мини-проект»;
  //   data-trace-calls  — JSON [{func, call}]: кнопка «🎞 Визуализировать» (см. trace-viz.js);
  //   data-tests        — JSON-массив имён тестов: гонять только их, списка выбора нет;
  //   data-func="Имя"   — упражнение задано снаружи (как в funcs: «Sum», «MinStack.Push»), списка нет;
  //   data-draft="mock|mixed|review" — свой черновик algoRunnerCode:<draft>:<pkg>, а не решение пакета
  //                       из главы (algoRunnerCode:<pkg>); data-fresh="true" — прежнее имя для mock;
  //   data-hints="off"  — без подсказок и эталона (собеседование).
  // События (на узле виджета, всплывают): algo-runner:result после каждого ответа /api/run,
  // algo-runner:giveup {pkg, fn} — показан эталон, algo-runner:state {pkg, up} — runner ответил или нет.
  //
  // Единица прогона выбранного упражнения E: свои тесты E.tests непусты — функция; иначе тип
  // (E.group, тесты E.groupTests); иначе — весь пакет. Зелёный прогон (только res.ok сервера)
  // отмечает в algoFnSolved саму функцию, упражнения типа без своих тестов или весь пакет.
  function initWidget(root) {
    var pkg = root.getAttribute("data-pkg");
    if (!pkg) return;
    var race = root.getAttribute("data-race") === "true";
    var flagship = root.getAttribute("data-flagship") === "true";
    // data-tests — гонять только эти тесты, а не весь пакет (мок-интервью: задача — одна функция,
    // а panic("TODO") в соседней иначе роняет весь тестовый бинарник раньше, чем дойдёт до нужного теста).
    var onlyTests = jsonAttr(root, "data-tests");
    // data-trace-calls — одна функция пакета — один элемент. Читатель выбирает функцию сам,
    // потому что в файле пакета их обычно несколько.
    var traceCalls = jsonAttr(root, "data-trace-calls");
    var wantFunc = root.getAttribute("data-func") || "";
    var hintsOff = root.getAttribute("data-hints") === "off";
    // Свой черновик — чтобы смешанная тренировка, собеседование и карточка повторения не открывались
    // с готовым решением пакета из главы и не затирали его своим черновиком.
    var draft = root.getAttribute("data-draft") || (root.getAttribute("data-fresh") === "true" ? "mock" : "");
    var lsKey = "algoRunnerCode:" + (draft ? draft + ":" : "") + pkg;
    root.classList.add("algo-runner--ready");
    root.innerHTML = "";

    var head = el("div", "algo-runner__head");
    head.appendChild(el("span", "algo-runner__pkg", "пакет " + pkg));
    if (flagship) head.appendChild(el("span", "algo-runner__flagship", "⚔️ боевой мини-проект"));
    if (race) head.appendChild(el("span", "algo-runner__race", "🏁 -race"));
    if (onlyTests.length) {
      var only = el("span", "algo-runner__only", "только тесты: " + onlyTests.join(", "));
      only.title = "Гоняются только тесты этой функции, а не всего пакета";
      head.appendChild(only);
    }
    var status = el("span", "algo-runner__status", "");
    head.appendChild(status);
    root.appendChild(head);

    // Строки-пояснения под шапкой: warning разбора, упражнения нет в заготовке, runner старой версии.
    var lines = el("div", "algo-runner__lines");
    root.appendChild(lines);

    var editorHost = el("div", "algo-runner__editor");
    // CodeMirror 6 — contenteditable div, а не textarea, и mdBook его за поле ввода
    // не считает: ← / → по коду листали бы главы. Клавиши редактора наружу не нужны.
    editorHost.addEventListener("keydown", function (e) { e.stopPropagation(); });
    root.appendChild(editorHost);

    // Подсказки и эталон выбранного упражнения — под редактором, код читателя они не трогают.
    var help = el("div", "algo-runner__help");
    help.hidden = true;
    help.addEventListener("keydown", stopArrows);
    root.appendChild(help);

    var bar = el("div", "algo-runner__bar");
    var runBtn = btn("▶ Прогнать тесты", "algo-runner__btn algo-runner__btn--run");
    var resetBtn = btn("Сбросить", "algo-runner__btn");
    // Что гоняет «Прогнать тесты»: тесты функции, тесты типа или весь пакет.
    var unitNote = el("span", "algo-runner__unit", "");
    bar.appendChild(runBtn); bar.appendChild(unitNote); bar.appendChild(resetBtn);
    var traceBtn = null, traceSelect = null;
    if (traceCalls.length) {
      if (traceCalls.length > 1) {
        traceSelect = document.createElement("select");
        traceSelect.className = "algo-runner__trace-select";
        traceCalls.forEach(function (t) {
          var opt = document.createElement("option");
          opt.value = t.func; opt.textContent = t.func;
          traceSelect.appendChild(opt);
        });
        traceSelect.addEventListener("keydown", stopArrows);
        bar.appendChild(traceSelect);
      }
      traceBtn = btn("🎞 Визуализировать", "algo-runner__btn algo-runner__btn--trace");
      bar.appendChild(traceBtn);
    }
    root.appendChild(bar);

    var out = el("div", "algo-runner__out");
    root.appendChild(out);
    var traceOut = el("div", "algo-runner__trace");
    if (traceCalls.length) root.appendChild(traceOut);

    var editor = null;
    var stubCode = "";    // заготовка для «Сбросить»: plain, а у сервера без него — code
    var structured = false; // ответ /api/stub разобран: есть plain и funcs, нет warning
    var funcs = [];       // упражнения в порядке файла
    var notes = [];       // [{at, text}] — то, что убрано из plain и не вошло в hint/recipe
    var sel = null;       // выбранное упражнение; null — весь пакет
    var pick = null;      // <select> упражнений (нет при data-func, data-tests, warning)
    var helpOff = hintsOff;
    var opened = {};      // открытые подсказки: «hint:<имя>», «recipe:<имя>», «note:<номер>»
    var tried = {};       // упражнения, чей прогон завершился на этой странице: после него есть «Сдаюсь»
    var gaveUp = {};      // упражнения, по которым показан эталон
    var solutions = {};   // имя → {code} или {error}
    var up = null;        // ответил ли runner; null — ещё неизвестно

    function setStatus(text, cls) {
      status.textContent = text;
      status.className = "algo-runner__status" + (cls ? " is-" + cls : "");
    }
    function line(text) { lines.appendChild(el("div", "algo-runner__line", text)); }
    // setUp сообщает соседям (карточкам повторения), можно ли сейчас вообще прогнать код.
    function setUp(v) {
      if (up === v) return;
      up = v;
      emit(root, "algo-runner:state", { pkg: pkg, up: v });
    }
    function byName(n) {
      for (var i = 0; i < funcs.length; i++) if (funcs[i].name === n) return funcs[i];
      return null;
    }
    function names(list) { return list.map(function (f) { return f.name; }); }
    function done(solved, n) { return !!solved[pkg + "." + n]; }

    // unitOf — что гонять для упражнения e (null — весь пакет) и что отметить при зелёном.
    function unitOf(e) {
      if (onlyTests.length) return { kind: "func", tests: onlyTests, members: e ? [e.name] : [] };
      if (e && e.tests.length) return { kind: "func", tests: e.tests, members: [e.name] };
      if (e && e.group && e.groupTests.length) {
        // Тесты типа проверяют его упражнения без своих тестов; конструктор со своими тестами
        // (binheap.BuildHeap) отмечается только своими.
        return { kind: "type", type: e.group, tests: e.groupTests,
          members: names(funcs.filter(function (f) { return f.group === e.group && !f.tests.length; })) };
      }
      return { kind: "pkg", tests: null, members: names(funcs) };
    }

    // pendingNeeds — соседи, которых зовут тесты или эталон единицы, а зелёными они ещё не были.
    // algoFnSolved общий для всех черновиков и значит «решал где-то»: в своём черновике (data-draft —
    // собеседование, смешанная, карточка) лист чистый, и сосед, решённый в главе, здесь — panic("TODO").
    function pendingNeeds(u, e) {
      var solved = draft ? {} : fnSolved(), seen = {}, res = [];
      var from = u.kind === "type" ? funcs.filter(function (f) { return u.members.indexOf(f.name) >= 0; })
        : u.kind === "func" && e ? [e] : [];
      from.forEach(function (f) {
        f.needs.forEach(function (n) {
          if (seen[n] || u.members.indexOf(n) >= 0 || done(solved, n)) return;
          seen[n] = true;
          res.push(n);
        });
      });
      return res;
    }

    // defaultPick — первое по порядку файла нерешённое упражнение, чьи needs уже решены; такого нет —
    // первое нерешённое; решены все — весь пакет (null).
    function defaultPick() {
      var solved = fnSolved();
      var open = funcs.filter(function (f) { return !done(solved, f.name); });
      for (var i = 0; i < open.length; i++) {
        if (open[i].needs.every(function (n) { return done(solved, n); })) return open[i];
      }
      return open[0] || null;
    }

    // buildPick — список в шапке: все упражнения в порядке файла, методы и конструктор одного
    // типа — вместе, под «тип T»; последним — весь пакет.
    function buildPick() {
      pick = document.createElement("select");
      pick.className = "algo-runner__pick";
      pick.title = "Упражнение: «Прогнать тесты» гоняет его тесты, подсказки под редактором — к нему";
      pick.setAttribute("aria-label", "упражнение");
      var groups = {};
      funcs.forEach(function (f) {
        if (!f.group) { pick.appendChild(option(f.name)); return; }
        if (groups[f.group]) return;
        var og = groups[f.group] = document.createElement("optgroup");
        og.label = "тип " + f.group;
        funcs.forEach(function (g) { if (g.group === f.group) og.appendChild(option(g.name)); });
        pick.appendChild(og);
      });
      var whole = option("");
      whole.textContent = "весь пакет";
      pick.appendChild(whole);
      labelOptions();
      pick.addEventListener("change", function () {
        sel = byName(pick.value);
        renderUnit();
        renderHelp();
      });
      // ← / → в списке меняют выбор; mdBook листал бы главы, если бы клавиша дошла до document.
      pick.addEventListener("keydown", stopArrows);
      head.insertBefore(pick, status);
    }
    function option(value) {
      var o = document.createElement("option");
      o.value = value;
      return o;
    }
    // labelOptions — «✓» у решённых и пометка «нужны: …» у упражнений, тесты которых зовут соседей.
    function labelOptions() {
      if (!pick) return;
      var solved = fnSolved();
      Array.prototype.forEach.call(pick.querySelectorAll("option"), function (o) {
        var f = byName(o.value);
        if (!f) return;
        o.textContent = f.name + (done(solved, f.name) ? " ✓" : "") + (f.needs.length ? " · нужны: " + f.needs.join(", ") : "");
      });
    }

    function renderUnit() {
      unitNote.textContent = "";
      if (onlyTests.length) return; // шапка уже говорит «только тесты: …»
      var u = unitOf(sel);
      unitNote.textContent = u.kind === "func" ? "тесты функции " + sel.name
        : u.kind === "type" ? "тесты типа " + u.type
        : sel ? "весь пакет: у " + sel.name + " нет своих тестов" : "весь пакет";
      unitNote.title = u.tests ? "гоняются: " + u.tests.join(", ") : "гоняются все тесты пакета";
    }

    // ---- подсказки и эталон ----

    // Заметки (notes) — о пакете при любом выборе, о полях типа — у его упражнений, о функции — у неё.
    function noteItems() {
      var items = [];
      notes.forEach(function (n, i) {
        var label = n.at === "package" ? "💡 О пакете"
          : sel && sel.group && n.at === "type " + sel.group ? "💡 О полях типа"
          : sel && n.at === "func " + sel.name ? "💡 Заметка к функции" : "";
        if (label) items.push({ key: "note:" + i, label: label, text: n.text });
      });
      return items;
    }
    // Подсказки упражнения идут по порядку: сначала признак и сложность, потом рецепт.
    function stepItems() {
      var items = [];
      if (!sel) return items;
      if (sel.hint) items.push({ key: "hint:" + sel.name, label: "💡 Признак и сложность", text: sel.hint });
      if (sel.recipe) items.push({ key: "recipe:" + sel.name, label: "💡 Рецепт", text: sel.recipe });
      return items;
    }
    function renderHelp() {
      help.innerHTML = "";
      if (!structured || helpOff) { help.hidden = true; return; }
      var row = el("div", "algo-runner__help-row");
      noteItems().forEach(function (it) {
        if (opened[it.key]) help.appendChild(helpText(it)); else row.appendChild(helpButton(it));
      });
      var next = true;
      stepItems().forEach(function (it) {
        if (opened[it.key]) { help.appendChild(helpText(it)); return; }
        if (next) row.appendChild(helpButton(it));
        next = false;
      });
      var sol = sel && solutions[sel.name];
      if (sel && tried[sel.name] && !(sol && sol.code != null)) row.appendChild(giveUpButton(sel.name));
      if (row.childNodes.length) help.appendChild(row);
      if (sol && sol.error) help.appendChild(el("div", "algo-runner__help-err", "Эталон не получен: " + sol.error));
      if (sol && sol.code != null) help.appendChild(solutionView(sel.name, sol.code));
      help.hidden = !help.childNodes.length;
    }
    function helpText(it) {
      var box = el("div", "algo-runner__help-text");
      box.appendChild(el("div", "algo-runner__help-label", it.label.replace(/^💡\s*/, "")));
      box.appendChild(el("div", "algo-runner__help-body", it.text));
      return box;
    }
    function helpButton(it) {
      var b = btn(it.label, "algo-runner__btn algo-runner__help-btn");
      b.addEventListener("click", function () {
        opened[it.key] = true;
        renderHelp();
      });
      return b;
    }
    function giveUpButton(name) {
      var b = btn("🏳 Сдаюсь — показать эталон", "algo-runner__btn algo-runner__help-btn algo-runner__giveup");
      b.addEventListener("click", function () {
        // srs.js (слушатель algo-runner:giveup) ставит карточке пакета «Забыл» или заводит её на завтра;
        // эталон после своих зелёных тестов этой функции на этой странице — сверка, его он не считает
        if (!confirm("Показать эталон " + name + "? Код в редакторе останется твоим. Для повторений это «Забыл»: карточка пакета " +
          pkg + " вернётся завтра (её нет — заведётся на завтра); после своих зелёных тестов этой функции здесь — просто сверка.")) return;
        b.disabled = true;
        api("/api/solution?pkg=" + encodeURIComponent(pkg) + "&func=" + encodeURIComponent(name), {})
          .then(function (r) {
            setUp(true);
            solutions[name] = { code: String(r.code || "") };
            gaveUp[name] = true;
            renderHelp();
            emit(root, "algo-runner:giveup", { pkg: pkg, fn: name });
          }, function (err) {
            if (err.network) setUp(false);
            else if (err.status) setUp(true); else console.error("algo-runner:", err);
            solutions[name] = { error: err.network ? "runner не отвечает (" + err.message + ")" : err.message };
            renderHelp();
          });
      });
      return b;
    }
    function solutionView(name, code) {
      var box = el("div", "algo-runner__solution");
      // /api/solution отдаёт объявления без import (у половины пакетов эталон зовёт sort, sync,
      // container/heap…, которых нет в заготовке) — переписанный как есть, он не соберётся.
      box.appendChild(el("div", "algo-runner__help-label", "Эталон " + name + " — только для чтения; строк import в нём нет — " +
        "нужные пакеты допиши сам. Твой код в редакторе не изменился."));
      var p = el("pre", "algo-runner__solution-code", code);
      p.tabIndex = 0; // длинные строки прокручиваются в своём блоке — и с клавиатуры тоже
      box.appendChild(p);
      return box;
    }

    // hintsFor — сколько подсказок открыто на странице к упражнениям names (участники единицы
    // прогона и само упражнение): рецепт MinStack.Push, открытый перед прогоном типа из
    // NewMinStack, — тоже помощь в этом прогоне. Заметки считаются; names пуст — все открытые.
    function hintsFor(names) {
      var n = 0;
      Object.keys(opened).forEach(function (k) {
        var m = /^(hint|recipe):(.*)$/.exec(k);
        if (m) { if (!names.length || names.indexOf(m[2]) >= 0) n++; return; }
        var note = notes[+k.slice("note:".length)];
        if (note && (!names.length || names.some(function (name) { return noteApplies(note, name); }))) n++;
      });
      return n;
    }
    function noteApplies(note, fn) {
      if (note.at === "package") return true;
      var f = byName(fn);
      return note.at === "func " + fn || !!(f && f.group && note.at === "type " + f.group);
    }

    // ---- заготовка ----

    setStatus("загрузка…", "wait");
    api("/api/stub?pkg=" + encodeURIComponent(pkg), {})
      .then(function (data) {
        setUp(true);
        structured = !data.warning && typeof data.plain === "string" && Array.isArray(data.funcs);
        funcs = structured ? data.funcs.map(exercise) : [];
        notes = structured && Array.isArray(data.notes) ? data.notes : [];
        stubCode = structured ? data.plain : data.code;
        if (data.warning) line("⚠ " + data.warning + " — работаю по файлу как есть: гоняется весь пакет, подсказок нет.");
        else if (!structured) line("Runner старой версии: нет выбора упражнения и подсказок — перезапусти его, чтобы они появились.");
        if (wantFunc) {
          sel = byName(wantFunc);
          if (!sel && structured) {
            helpOff = true;
            line("Упражнения «" + wantFunc + "» нет в заготовке на диске — похоже, оно уже решено в файле" +
              (onlyTests.length ? "." : ": гоняется весь пакет."));
          }
        } else if (structured && funcs.length && !onlyTests.length) {
          buildPick();
          sel = defaultPick();
          pick.value = sel ? sel.name : "";
        }
        renderUnit();
        renderHelp();
        var saved = lsGet(lsKey);
        return mountEditor(editorHost, saved != null ? saved : stubCode);
      })
      .then(function (ed) {
        editor = ed;
        setStatus("сервер на связи", "ok");
        editorHost.addEventListener("input", saveSoon, true);
        health().then(function (h) {
          var b = limitsBadge(h.limits, race);
          if (!b) return; // сервер старше плашки: поля limits в ответе нет
          var s = el("span", "algo-runner__limits" + (b.cls ? " is-" + b.cls : ""), b.text);
          s.title = b.title;
          head.insertBefore(s, status);
        }).catch(function () { /* плашка — справка: без неё виджет работает как раньше */ });
      })
      .catch(function (err) {
        if (err.network) {
          setUp(false);
          serverDownView(out, err);
          setStatus("сервер не запущен", "err");
        } else {
          if (err.status) setUp(true); else console.error("algo-runner:", err);
          line("Runner ответил ошибкой: " + err.message);
          setStatus("заготовка не загружена", "err");
        }
        runBtn.disabled = resetBtn.disabled = true;
        if (traceBtn) traceBtn.disabled = true; // трассу строит тот же сервер
        if (traceSelect) traceSelect.disabled = true;
      });

    var saveTimer = null;
    function saveSoon() {
      if (!editor) return;
      clearTimeout(saveTimer);
      saveTimer = setTimeout(function () {
        // Виджет уже убрали со страницы (смешанная выдала новую задачу и стёрла этот черновик) —
        // запись после удаления воскресила бы стёртый черновик для следующей задачи того же пакета.
        if (!root.isConnected) return;
        lsSet(lsKey, editor.getValue());
      }, 400);
    }

    // ---- прогон ----

    runBtn.addEventListener("click", function () {
      if (!editor) return;
      var e = sel, u = unitOf(e);
      var fn = e ? e.name : wantFunc;
      // Подсказки и «сдаюсь» — на момент нажатия и по всем участникам единицы прогона: они относятся
      // к попытке, которую сейчас проверят.
      var involved = u.members.concat(fn && u.members.indexOf(fn) < 0 ? [fn] : []);
      var run = { fn: fn, unit: u.kind, draft: draft, hints: hintsFor(involved),
        gaveUp: involved.some(function (n) { return gaveUp[n]; }) };
      var body = { pkg: pkg, code: editor.getValue(), race: race };
      if (u.tests) body.tests = u.tests;
      runBtn.disabled = true;
      out.innerHTML = "";
      setStatus(race ? "тесты с детектором гонок (-race)…" : "компиляция и тесты…", "wait");
      api("/api/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        .then(function (res) {
          setUp(true);
          involved.forEach(function (n) { tried[n] = true; });
          renderResult(out, res);
          var pending = res.ok ? [] : pendingNeeds(u, e);
          if (pending.length) {
            out.insertBefore(el("div", "algo-runner__needs", draft
              ? "Тесты зовут и соседние упражнения: " + pending.join(", ") + " — на этом листе их тоже нужно написать."
              : "Тесты зовут ещё не решённые упражнения: " + pending.join(", ") + " — начни с них."), out.firstChild);
          }
          var st = runStatus(res);
          setStatus(st.text, st.cls);
          // Отметка — только по ok сервера: он требует, чтобы запустились ВСЕ имена фильтра и ничего
          // не упало и не было остановлено. Пакет решённым — только зелёный прогон без фильтра:
          // зелёная одна функция из восьми — не повод заводить карточку «перерешай пакет».
          if (res.ok) {
            markFnSolved(pkg, u.members);
            if (!res.filtered) markPkgSolved(pkg);
            afterGreen();
          }
          announce(root, pkg, res, run);
          renderHelp();
        }, function (err) {
          if (err.network) {
            setUp(false);
            serverDownView(out, err);
            setStatus("ошибка связи", "err");
            return;
          }
          if (err.status) setUp(true); else console.error("algo-runner:", err);
          out.innerHTML = "";
          out.appendChild(el("div", "algo-runner__verdict is-err", "✗ Runner ответил ошибкой: " + err.message));
          setStatus("ошибка запроса", "err");
        })
        .then(function () { runBtn.disabled = false; });
    });

    // afterGreen — «✓» в списке; решены все упражнения по отдельности — совет прогнать пакет целиком
    // (только так пакет засчитывается решённым) и выбор переходит на «весь пакет».
    function afterGreen() {
      labelOptions();
      if (!pick || !sel) return;
      var solved = fnSolved();
      if (!funcs.every(function (f) { return done(solved, f.name); })) return;
      sel = null;
      pick.value = "";
      renderUnit();
      out.appendChild(el("div", "algo-runner__advice",
        "Все упражнения пакета зелёные по отдельности — теперь прогони пакет целиком: решённым пакет засчитывается только так."));
    }

    resetBtn.addEventListener("click", function () {
      if (!editor) return;
      if (editor.getValue() !== stubCode && !confirm("Сбросить код к заготовке? Твои правки будут потеряны.")) return;
      editor.setValue(stubCode);
      lsDel(lsKey);
      out.innerHTML = "";
      traceOut.innerHTML = "";
      setStatus("сброшено к заготовке", "ok");
    });

    if (traceBtn) {
      if (traceSelect) traceSelect.addEventListener("change", function () { traceOut.innerHTML = ""; });
      traceBtn.addEventListener("click", function () {
        if (!editor) return;
        var wantTrace = traceSelect ? traceSelect.value : traceCalls[0].func;
        var chosen = null;
        for (var i = 0; i < traceCalls.length; i++) {
          if (traceCalls[i].func === wantTrace) { chosen = traceCalls[i]; break; }
        }
        if (!chosen) return;
        traceBtn.disabled = true;
        traceOut.innerHTML = "";
        setStatus("строим трассу выполнения…", "wait");
        api("/api/trace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pkg: pkg, code: editor.getValue(), func: chosen.func, call: chosen.call }),
        })
          .then(function (res) {
            setUp(true);
            if (window.AlgoTraceViz) window.AlgoTraceViz.render(traceOut, res);
            setStatus(res.ok ? "✓ трасса построена" : (res.unsupported ? "△ форма не поддерживается" : "✗ трасса не построена"), res.ok ? "ok" : "err");
          })
          .catch(function (err) {
            if (err.network) {
              setUp(false);
              serverDownView(traceOut, err);
              setStatus("ошибка связи", "err");
              return;
            }
            if (err.status) setUp(true); else console.error("algo-runner:", err);
            traceOut.innerHTML = "";
            traceOut.appendChild(el("div", "algo-runner__verdict is-err", "✗ Runner ответил ошибкой: " + err.message));
            setStatus("ошибка запроса", "err");
          })
          .then(function () { traceBtn.disabled = false; });
      });
    }
  }

  // exercise — запись funcs с полями по умолчанию: виджет не падает на ответе, где поля нет.
  function exercise(f) {
    var arr = function (v) { return Array.isArray(v) ? v : []; };
    return { name: String(f.name || ""), tests: arr(f.tests), needs: arr(f.needs), group: f.group || "",
      groupTests: arr(f.groupTests), hint: f.hint || "", recipe: f.recipe || "" };
  }

  function jsonAttr(root, name) {
    var raw = root.getAttribute(name);
    if (!raw) return [];
    try {
      var v = JSON.parse(raw);
      return Array.isArray(v) ? v : [];
    } catch (e) {
      console.warn("algo-runner: битый " + name, e);
      return [];
    }
  }

  // ← / → mdBook листает главы обработчиком на document. В списке стрелки меняют выбор, в панели
  // подсказок прокручивают эталон — дальше виджета им идти незачем.
  function stopArrows(e) {
    if (/^Arrow/.test(e.key)) e.stopPropagation();
  }

  // ---- рендер результата ----

  // Строки, которые go test печатает сам: итог пакета без подробностей. Блок вывода из одних них
  // ничего не говорит, а «PASS» под «Прогон не засчитан» читался как зачёт.
  var GO_TEST_SUMMARY = /^(PASS|FAIL|ok\s+\S.*|FAIL\s+\S.*)$/;
  function onlySummary(text) {
    return String(text || "").split("\n").every(function (l) { return !l.trim() || GO_TEST_SUMMARY.test(l.trim()); });
  }

  function renderResult(out, res) {
    out.innerHTML = "";
    var ran = !!(res.tests && res.tests.length);
    // Остановка по времени, памяти или потолку вывода — не «упал тест»: сначала говорим, что случилось.
    if (res.reason) {
      var why = el("div", "algo-runner__verdict is-err", killMark(res) + res.reason);
      // Ниже будут зелёные строки, а прогон не засчитан (частичный фильтр, бинарник вышел с ошибкой):
      // это надо сказать здесь же, иначе «✓ TestX» читается как зачёт.
      if (ran && !res.ok && !res.failed && res.passed) {
        why.appendChild(el("div", "algo-runner__verdict-sub", "Тесты с ✓ ниже прошли, но прогон не засчитан — из-за этой причины."));
      }
      out.appendChild(why);
    }
    if (!ran) {
      // Ни один тест не шёл — счёта и списка нет: «0 ok / 0 fail» только путало бы.
      if (res.noTests) {
        // Пакет собрался, а запускать было нечего; «PASS» из вывода go test тут тоже лишний.
        if (res.filtered) {
          out.appendChild(el("div", "algo-runner__hint",
            "Прогони пакет целиком: тесты с такими именами в нём не нашлись — скорее всего, у этой функции нет отдельных тестов."));
        }
        return;
      }
      var text = (res.output || "").trim();
      if (!res.reason) {
        // Без причины несобранный пакет с выводом — это ошибка компиляции; без вывода — прогон оборвали.
        if (!res.build && text) {
          out.appendChild(el("div", "algo-runner__verdict is-err", "✗ Ошибка компиляции"));
          out.appendChild(pre(res.output));
        } else {
          out.appendChild(el("div", "algo-runner__verdict is-err",
            "✗ Прогон оборван: runner остановился или запрос отменён, тесты не дошли до конца — запусти ещё раз."));
          if (text) out.appendChild(pre(res.output));
        }
        return;
      }
      // Вывод под причиной нужен, когда в нём есть что-то сверх неё: у «не запустился»
      // причина нередко и есть его единственная строка.
      if (text && res.reason.slice(-text.length) !== text) out.appendChild(pre(res.output));
      return;
    }
    // Не зелёный прогон без упавших тестов: бинарник завершился с ошибкой сам либо
    // запустились не все запрошенные тесты — «часть тестов упала» было бы неправдой.
    var verdict = el("div", "algo-runner__verdict " + (res.ok ? "is-ok" : "is-err"),
      (res.ok ? "✓ Все тесты прошли" : res.failed ? "✗ Часть тестов упала" : "✗ Прогон не засчитан") +
      "  ·  " + res.passed + " ok / " + res.failed + " fail  ·  " + res.duration);
    out.appendChild(verdict);

    // panic("TODO") в незаписанной функции роняет ВЕСЬ тестовый бинарник: в списке
    // оказывается один упавший тест, а остальные не запускались вовсе. Без пояснения
    // «0 ok / 1 fail» читается как «остальные тесты прошли» или «тест один».
    var todo = null;
    (res.tests || []).some(function (t) { var m = !t.pass && t.output && /panic: (TODO[^\n\[]*)/.exec(t.output); if (m) todo = m[1].trim(); return !!m; });
    if (!todo && res.output) { var m2 = /panic: (TODO[^\n\[]*)/.exec(res.output); if (m2) todo = m2[1].trim(); }
    if (todo) {
      // С фильтром гонялись тесты одного упражнения: «в пакете тестов больше» и «покажет следующую»
      // были бы про другой прогон.
      out.appendChild(el("div", "algo-runner__hint", res.filtered
        ? "Упало на заглушке «" + todo + "» — эта функция ещё не написана. panic останавливает весь тестовый бинарник: " +
          "тесты после него в этом прогоне не запускались."
        : "Упало на заглушке «" + todo + "» — эта функция ещё не написана. panic останавливает весь тестовый бинарник, " +
          "поэтому тесты после него не запускались вовсе, и в списке их меньше, чем есть в пакете. " +
          "Напиши эту функцию — прогон пойдёт дальше и покажет следующую."));
    }

    if (res.race) {
      out.appendChild(el("div", "algo-runner__verdict is-err",
        "🏁 Обнаружена гонка данных (-race): к общему состоянию обращаются из нескольких горутин без синхронизации. Подробности — в выводе упавшего теста ниже (WARNING: DATA RACE)."));
    }

    var list = el("ul", "algo-runner__tests");
    res.tests.forEach(function (t) {
      var li = el("li", "algo-runner__test " + (t.pass ? "is-ok" : "is-err"));
      li.appendChild(el("span", "algo-runner__test-mark", t.pass ? "✓" : (t.killed === "timeout" ? "⏱" : t.killed === "memory" ? "💾" : "✗")));
      li.appendChild(el("span", "algo-runner__test-name", t.name));
      if (!t.pass && t.output) {
        var det = document.createElement("details");
        det.appendChild(Object.assign(document.createElement("summary"), { textContent: "подробности" }));
        det.appendChild(pre(t.output));
        li.appendChild(det);
      }
      list.appendChild(li);
    });
    out.appendChild(list);
    if (!res.ok && res.output && !onlySummary(res.output)) out.appendChild(pre(res.output));
  }

  // Виджет бесполезен без helper-сервера, а «сервер не отвечает» — самое частое
  // первое впечатление от книги (на опубликованном сайте runner'а нет в принципе:
  // он гоняет go test на машине читателя). Поэтому здесь не сообщение об ошибке,
  // а инструкция: три способа поднять runner, включая вариант без установленного Go.
  function serverDownView(out, err) {
    out.innerHTML = "";
    var hosted = /\.github\.io$/.test(location.hostname);
    var box = el("div", "algo-runner__down");
    box.innerHTML =
      "<strong>Runner не отвечает — а без него тут ничего не запустится.</strong> " +
      "Виджет гоняет НАСТОЯЩИЙ <code>go&nbsp;test</code>, поэтому ему нужен helper-сервер " +
      "на твоей машине (" + escapeHtml(RUNNER_URL) + "), а не на сайте." +
      (hosted
        ? "<p>Ты читаешь опубликованную книгу — подними её локально, тогда заработают и виджеты:</p>" +
          "<pre>git clone https://github.com/fazletdinov/algorithms-book\ncd algorithms-book\nmake serve</pre>"
        : "<p>Одной командой из корня репозитория — книга и runner вместе:</p>" +
          "<pre>make serve</pre>" +
          "<p>Или только runner:</p>" +
          "<pre>cd exercises &amp;&amp; go run ./cmd/runner</pre>") +
      "<p>Go не установлен? Тот же runner через Docker, из корня репозитория:</p>" +
      "<pre>docker run --rm --memory=2g --memory-swap=2g -p 127.0.0.1:8080:8080 \\\n  -v \"$PWD:/w\" -w /w/exercises golang:1.24 go run ./cmd/runner -listen-all</pre>" +
      "<p class='algo-runner__hint'>Публикация именно на <code>127.0.0.1</code> и <code>-listen-all</code> " +
      "только внутри контейнера — снаружи runner не должен быть доступен никому: он исполняет " +
      "присланный код.</p>" +
      "<p>Runner слушает на другом адресе (Codespaces, удалённая машина)? Укажи его явно " +
      "в консоли браузера и обнови страницу:</p>" +
      "<pre>localStorage.setItem('algoRunnerUrl', 'https://…')</pre>" +
      "<div class='algo-runner__err'>" + escapeHtml(String(err && err.message || err)) + "</div>";
    out.appendChild(box);
  }

  // ---- мелкие хелперы ----

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function btn(text, cls) { var b = el("button", cls, text); b.type = "button"; return b; }
  function pre(text) { var p = el("pre", "algo-runner__pre"); p.textContent = text; return p; }
  function escapeHtml(s) { return s.replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }

  function initAll() {
    var nodes = document.querySelectorAll(".algo-runner:not(.algo-runner--ready)");
    Array.prototype.forEach.call(nodes, initWidget);
  }

  // Смешанная тренировка (mixed.js) создаёт виджет уже после загрузки страницы —
  // DOMContentLoaded к тому моменту давно прошёл, поэтому она поднимает его явно.
  window.ALGO_RUNNER_INIT = initAll;
  // Вид результата без сервера: смоук scripts/runner-render-check.js подаёт сюда готовые ответы.
  window.ALGO_RUNNER_VIEW = { result: renderResult, status: runStatus, limits: limitsBadge };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
})();
