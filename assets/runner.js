/* runner.js — «решай задачу прямо в книге».
 *
 * Виджет <div class="algo-runner" data-pkg="astar"></div> подтягивает заготовку
 * пакета из локального helper-сервера (cmd/runner), даёт редактор кода и кнопку
 * «Прогнать тесты», которая запускает настоящий `go test` и показывает результат.
 *
 * Сервер локальный: `cd exercises && go run ./cmd/runner` (по умолчанию :8080).
 * Без зависимостей-сборщика; CodeMirror 6 грузится по ESM с CDN, при сбое —
 * аккуратный фолбэк на textarea, так что виджет работает всегда.
 */
(function () {
  "use strict";

  // Адрес runner-сервера. Можно переопределить в консоли:
  //   localStorage.setItem('algoRunnerUrl','http://localhost:9000')
  var RUNNER_URL = (localStorage.getItem("algoRunnerUrl") || "http://localhost:8080").replace(/\/$/, "");

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

  var cmPromise = null;
  function loadCM() {
    if (!cmPromise) {
      cmPromise = Promise.all([
        import(/* @vite-ignore */ CM_URL),
        import(/* @vite-ignore */ LANG_URL),
        import(/* @vite-ignore */ GO_URL),
        darkBook() ? import(/* @vite-ignore */ DARK_URL) : null,
      ]).then(function (m) {
        return { cm: m[0], lang: m[1], go: m[2].go, dark: m[3] && m[3].oneDark };
      });
    }
    return cmPromise;
  }

  // mountEditor возвращает объект { getValue, setValue } независимо от того,
  // удалось ли поднять CodeMirror.
  function mountEditor(host, initialCode) {
    return loadCM().then(
      function (mod) {
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
      },
      function () { return textareaEditor(host, initialCode); }
    );
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

  function api(path, opts) {
    return fetch(RUNNER_URL + path, opts).then(function (r) {
      if (!r.ok) return r.json().then(function (j) { throw new Error(j.error || ("HTTP " + r.status)); });
      return r.json();
    });
  }

  // markPkgSolved отмечает пакет решённым, когда тесты позеленели. Единственный
  // момент, когда это вообще известно: «прошёл ли читатель пакет» больше нигде
  // не фиксируется. Данные забирает движок повторений (srs.js) — код забывается
  // быстрее теории, поэтому решённый пакет через несколько недель имеет смысл
  // перерешать с чистой заготовки.
  var PKG_SOLVED = "algoPkgSolved";
  function markPkgSolved(pkg) {
    try {
      var s = JSON.parse(localStorage.getItem(PKG_SOLVED) || "{}") || {};
      s[pkg] = Date.now();
      localStorage.setItem(PKG_SOLVED, JSON.stringify(s));
    } catch (e) {
      /* приватный режим — молча игнорируем */
    }
  }

  // announce сообщает о прогоне событием на самом виджете. Так мок-интервью
  // (mixed.js) узнаёт, что тесты позеленели, не лазая во внутренности редактора
  // и не завязываясь на его разметку. stage и noTests — чтобы слушатель отличал
  // «красные тесты» от «прогон не запустился» и «ни один тест не запустился».
  function announce(root, pkg, res) {
    if (typeof CustomEvent !== "function") return;
    root.dispatchEvent(new CustomEvent("algo-runner:result", {
      bubbles: true,
      detail: { pkg: pkg, ok: !!res.ok, filtered: !!res.filtered, passed: res.passed || 0, failed: res.failed || 0,
        noTests: !!res.noTests, stage: res.stage || "" },
    }));
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
    // Тесты не падали, а прогон не зелёный: бинарник упал сам либо запустились не все запрошенные тесты.
    if (res.build && !res.failed) return { text: "✗ прогон не засчитан · " + res.duration, cls: "err" };
    return { text: "✗ есть падения · " + res.duration, cls: "err" };
  }
  // Значок перед причиной: память, срок, обрезанный вывод, «тестов не нашлось»; ✗ — прогон не запустился вовсе.
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

  function initWidget(root) {
    var pkg = root.getAttribute("data-pkg");
    if (!pkg) return;
    var race = root.getAttribute("data-race") === "true";
    var flagship = root.getAttribute("data-flagship") === "true";
    // data-tests — JSON-массив имён тестов: гонять только их, а не весь пакет
    // (мок-интервью: задача — одна функция, а panic("TODO") в соседней иначе
    // роняет весь тестовый бинарник раньше, чем дойдёт до нужного теста).
    var onlyTests = [];
    var testsAttr = root.getAttribute("data-tests");
    if (testsAttr) {
      try { onlyTests = JSON.parse(testsAttr) || []; } catch (e) { console.warn("algo-runner: битый data-tests", e); }
    }
    // data-trace-calls — JSON-массив [{"func":"Имя","call":"Имя(...)"}, ...]:
    // одна функция пакета — один элемент. Читатель выбирает функцию сам,
    // потому что в файле пакета их обычно несколько.
    var traceCalls = [];
    var traceCallsAttr = root.getAttribute("data-trace-calls");
    if (traceCallsAttr) {
      try { traceCalls = JSON.parse(traceCallsAttr); } catch (e) { console.warn("algo-runner: битый data-trace-calls", e); }
    }
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

    var editorHost = el("div", "algo-runner__editor");
    // CodeMirror 6 — contenteditable div, а не textarea, и mdBook его за поле ввода
    // не считает: ← / → по коду листали бы главы. Клавиши редактора наружу не нужны.
    editorHost.addEventListener("keydown", function (e) { e.stopPropagation(); });
    root.appendChild(editorHost);

    var bar = el("div", "algo-runner__bar");
    var runBtn = btn("▶ Прогнать тесты", "algo-runner__btn algo-runner__btn--run");
    var resetBtn = btn("Сбросить", "algo-runner__btn");
    bar.appendChild(runBtn); bar.appendChild(resetBtn);
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
    var stubCode = "";
    // data-fresh — начать с чистой заготовки и хранить код отдельно от обычного
    // решения пакета. Иначе мок-интервью по уже решённому пакету открылось бы
    // с готовым ответом, а черновик интервью затёр бы настоящее решение.
    var fresh = root.getAttribute("data-fresh") === "true";
    var lsKey = (fresh ? "algoRunnerCode:mock:" : "algoRunnerCode:") + pkg;

    function setStatus(text, cls) {
      status.textContent = text;
      status.className = "algo-runner__status" + (cls ? " is-" + cls : "");
    }

    // Загружаем заготовку, потом монтируем редактор.
    setStatus("загрузка…", "wait");
    api("/api/stub?pkg=" + encodeURIComponent(pkg), {})
      .then(function (data) {
        stubCode = data.code;
        var saved = localStorage.getItem(lsKey);
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
        serverDownView(out, err);
        setStatus("сервер не запущен", "err");
        runBtn.disabled = resetBtn.disabled = true;
        if (traceBtn) traceBtn.disabled = true; // трассу строит тот же сервер
        if (traceSelect) traceSelect.disabled = true;
      });

    var saveTimer = null;
    function saveSoon() {
      if (!editor) return;
      clearTimeout(saveTimer);
      saveTimer = setTimeout(function () { localStorage.setItem(lsKey, editor.getValue()); }, 400);
    }

    runBtn.addEventListener("click", function () {
      if (!editor) return;
      runBtn.disabled = true;
      out.innerHTML = "";
      setStatus(race ? "тесты с детектором гонок (-race)…" : "компиляция и тесты…", "wait");
      api("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(onlyTests.length
          ? { pkg: pkg, code: editor.getValue(), race: race, tests: onlyTests }
          : { pkg: pkg, code: editor.getValue(), race: race }),
      })
        .then(function (res) {
          renderResult(out, res);
          var st = runStatus(res);
          setStatus(st.text, st.cls);
          // Решённым пакет считается, только если зелёными были ВСЕ его тесты:
          // зелёная одна функция из восьми — не повод заводить карточку
          // «перерешай пакет» в движке повторений. Признак берём у сервера.
          if (res.ok && !res.filtered) markPkgSolved(pkg);
          announce(root, pkg, res);
        })
        .catch(function (err) { serverDownView(out, err); setStatus("ошибка связи", "err"); })
        .then(function () { runBtn.disabled = false; });
    });

    resetBtn.addEventListener("click", function () {
      if (!editor) return;
      if (!confirm("Сбросить код к условию задачи? Ваши правки будут потеряны.")) return;
      editor.setValue(stubCode);
      localStorage.removeItem(lsKey);
      out.innerHTML = "";
      traceOut.innerHTML = "";
      setStatus("сброшено к условию", "ok");
    });

    if (traceBtn) {
      if (traceSelect) traceSelect.addEventListener("change", function () { traceOut.innerHTML = ""; });
      traceBtn.addEventListener("click", function () {
        if (!editor) return;
        var wantFunc = traceSelect ? traceSelect.value : traceCalls[0].func;
        var chosen = null;
        for (var i = 0; i < traceCalls.length; i++) {
          if (traceCalls[i].func === wantFunc) { chosen = traceCalls[i]; break; }
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
            if (window.AlgoTraceViz) window.AlgoTraceViz.render(traceOut, res);
            setStatus(res.ok ? "✓ трасса построена" : (res.unsupported ? "△ форма не поддерживается" : "✗ трасса не построена"), res.ok ? "ok" : "err");
          })
          .catch(function (err) { serverDownView(traceOut, err); setStatus("ошибка связи", "err"); })
          .then(function () { traceBtn.disabled = false; });
      });
    }
  }

  // ---- рендер результата ----

  function renderResult(out, res) {
    out.innerHTML = "";
    // Остановка по времени, памяти или потолку вывода — не «упал тест»: сначала говорим, что случилось.
    if (res.reason) out.appendChild(el("div", "algo-runner__verdict is-err", killMark(res) + res.reason));
    if (!(res.tests && res.tests.length)) {
      // Ни один тест не шёл — счёта и списка нет: «0 ok / 0 fail» только путало бы.
      if (res.noTests) {
        // Пакет собрался, а запускать было нечего; «PASS» из вывода go test тут тоже лишний.
        if (res.filtered) {
          out.appendChild(el("div", "algo-runner__hint",
            "Прогони пакет целиком: тесты с такими именами в нём не нашлись — скорее всего, у этой функции нет отдельных тестов."));
        }
        return;
      }
      // Причину сервер называет сам; без неё несобранный пакет — это ошибка компиляции.
      if (!res.reason && !res.build) out.appendChild(el("div", "algo-runner__verdict is-err", "✗ Ошибка компиляции"));
      // Вывод под причиной нужен, когда в нём есть что-то сверх неё: у «не запустился»
      // причина нередко и есть его единственная строка.
      var text = (res.output || "").trim();
      var repeats = !!res.reason && res.reason.slice(-text.length) === text;
      if (!res.reason || (text && !repeats)) out.appendChild(pre(res.output || "(нет вывода)"));
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
      out.appendChild(el("div", "algo-runner__hint",
        "Упало на заглушке «" + todo + "» — эта функция ещё не написана. panic останавливает весь тестовый бинарник, " +
        "поэтому тесты после него не запускались вовсе, и в списке их меньше, чем есть в пакете. " +
        "Напиши эту функцию — прогон пойдёт дальше и покажет следующую."));
    }

    if (res.race) {
      out.appendChild(el("div", "algo-runner__verdict is-err",
        "🏁 Обнаружена гонка данных (-race): к общему состоянию обращаются из нескольких горутин без синхронизации. Подробности — в выводе упавшего теста ниже (WARNING: DATA RACE)."));
    }

    if (res.tests && res.tests.length) {
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
    }
    if (!res.ok && res.output) out.appendChild(pre(res.output));
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
