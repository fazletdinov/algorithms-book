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

  // Версии пиннятся, ?deps форсит единый экземпляр @codemirror/state — иначе
  // StreamLanguage и basicSetup тянут разные копии и редактор падает.
  var DEPS = "@codemirror/state@6.4.1,@codemirror/view@6.26.3";
  var CM_URL = "https://esm.sh/codemirror@6.0.1?deps=" + DEPS;
  var LANG_URL = "https://esm.sh/@codemirror/language@6.10.1?deps=" + DEPS;
  var GO_URL = "https://esm.sh/@codemirror/legacy-modes@6.4.0/mode/go?deps=" + DEPS;

  var cmPromise = null;
  function loadCM() {
    if (!cmPromise) {
      cmPromise = Promise.all([
        import(/* @vite-ignore */ CM_URL),
        import(/* @vite-ignore */ LANG_URL),
        import(/* @vite-ignore */ GO_URL),
      ]).then(function (m) {
        return { cm: m[0], lang: m[1], go: m[2].go };
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
          ],
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

  // ---- рендер одного виджета ----

  function initWidget(root) {
    var pkg = root.getAttribute("data-pkg");
    if (!pkg) return;
    var race = root.getAttribute("data-race") === "true";
    root.classList.add("algo-runner--ready");
    root.innerHTML = "";

    var head = el("div", "algo-runner__head");
    head.appendChild(el("span", "algo-runner__pkg", "пакет " + pkg));
    if (race) head.appendChild(el("span", "algo-runner__race", "🏁 -race"));
    var status = el("span", "algo-runner__status", "");
    head.appendChild(status);
    root.appendChild(head);

    var editorHost = el("div", "algo-runner__editor");
    root.appendChild(editorHost);

    var bar = el("div", "algo-runner__bar");
    var runBtn = btn("▶ Прогнать тесты", "algo-runner__btn algo-runner__btn--run");
    var resetBtn = btn("Сбросить", "algo-runner__btn");
    bar.appendChild(runBtn); bar.appendChild(resetBtn);
    root.appendChild(bar);

    var out = el("div", "algo-runner__out");
    root.appendChild(out);

    var editor = null;
    var stubCode = "";
    var lsKey = "algoRunnerCode:" + pkg;

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
      })
      .catch(function (err) {
        serverDownView(out, err);
        setStatus("сервер не запущен", "err");
        runBtn.disabled = resetBtn.disabled = true;
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
        body: JSON.stringify({ pkg: pkg, code: editor.getValue(), race: race }),
      })
        .then(function (res) { renderResult(out, res); setStatus(res.ok ? "✓ всё зелёное · " + res.duration : (res.race ? "🏁 гонка данных · " : "✗ есть падения · ") + res.duration, res.ok ? "ok" : "err"); })
        .catch(function (err) { serverDownView(out, err); setStatus("ошибка связи", "err"); })
        .then(function () { runBtn.disabled = false; });
    });

    resetBtn.addEventListener("click", function () {
      if (!editor) return;
      if (!confirm("Сбросить код к условию задачи? Ваши правки будут потеряны.")) return;
      editor.setValue(stubCode);
      localStorage.removeItem(lsKey);
      out.innerHTML = "";
      setStatus("сброшено к условию", "ok");
    });
  }

  // ---- рендер результата ----

  function renderResult(out, res) {
    out.innerHTML = "";
    if (!res.build) {
      var head = el("div", "algo-runner__verdict is-err", "✗ Ошибка компиляции");
      out.appendChild(head);
      out.appendChild(pre(res.output || "(нет вывода)"));
      return;
    }
    var verdict = el("div", "algo-runner__verdict " + (res.ok ? "is-ok" : "is-err"),
      (res.ok ? "✓ Все тесты прошли" : "✗ Часть тестов упала") +
      "  ·  " + res.passed + " ok / " + res.failed + " fail  ·  " + res.duration);
    out.appendChild(verdict);

    if (res.race) {
      out.appendChild(el("div", "algo-runner__verdict is-err",
        "🏁 Обнаружена гонка данных (-race): к общему состоянию обращаются из нескольких горутин без синхронизации. Подробности — в выводе упавшего теста ниже (WARNING: DATA RACE)."));
    }

    if (res.tests && res.tests.length) {
      var list = el("ul", "algo-runner__tests");
      res.tests.forEach(function (t) {
        var li = el("li", "algo-runner__test " + (t.pass ? "is-ok" : "is-err"));
        li.appendChild(el("span", "algo-runner__test-mark", t.pass ? "✓" : "✗"));
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

  function serverDownView(out, err) {
    out.innerHTML = "";
    var box = el("div", "algo-runner__down");
    box.innerHTML =
      "<strong>Локальный runner не отвечает.</strong> Запусти его рядом с книгой:" +
      "<pre>cd exercises &amp;&amp; go run ./cmd/runner</pre>" +
      "и обнови страницу. Сервис локальный — гоняет настоящий <code>go&nbsp;test</code> на твоей машине." +
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
})();
