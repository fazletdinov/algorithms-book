/* trace-viz.js — рендер трассы РЕАЛЬНОГО выполнения кода читателя, в стиле
 * пошагового отладчика IDE: код читателя с подсветкой текущей строки +
 * панель переменных/массива рядом, автопроигрывание, скраббинг.
 *
 * Отдельная и намеренно простая система от algo-viz.js: тот рисует ~130
 * канонических примеров через bespoke-конфиги DASH/buildDashboard, а этот —
 * один универсальный рендер, который работает для ЛЮБОЙ инструментированной
 * функции без ручной настройки под конкретный паттерн. Данные приходят от
 * /api/trace (см. cmd/runner/trace.go): { ok, unsupported?, build,
 * timeout?, memLimit?, panic?, reason?, message?, output?, result?, source,
 * steps: [{step, line, tag, vars}], duration }. source — код читателя ПОСЛЕ
 * stripBuildTag: steps[].line нумерует строки именно в нём.
 *
 * Точка входа для runner.js: window.AlgoTraceViz.render(container, resp).
 * Без зависимостей; сам не обращается к сети — это забота runner.js.
 */
(function () {
  "use strict";

  var AUTOPLAY_MS = 700;

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function isNumArray(v) {
    return Array.isArray(v) && v.every(function (x) { return typeof x === "number"; });
  }

  // Среди vars по всем шагам — самый длинный числовой массив: это и есть
  // «главный» вход, который стоит рисовать ячейками с индексами.
  function pickArrayVar(steps) {
    var best = null, bestLen = -1;
    steps.forEach(function (s) {
      Object.keys(s.vars || {}).forEach(function (name) {
        var v = s.vars[name];
        if (isNumArray(v) && v.length > bestLen) { best = name; bestLen = v.length; }
      });
    });
    return best;
  }

  // Стабильный порядок строк таблицы переменных: в порядке первого появления
  // имени по шагам (примерно совпадает с порядком объявления в коде).
  function collectVarNames(steps) {
    var seen = {}, order = [];
    steps.forEach(function (s) {
      Object.keys(s.vars || {}).forEach(function (name) {
        if (!seen[name]) { seen[name] = true; order.push(name); }
      });
    });
    return order;
  }

  // Структуры вида {Val, Next} / {Val, Left, Right} — устойчивое соглашение
  // книги для связного списка и бинарного дерева (см. ListNode/TreeNode во
  // всех пакетах). Показываем их читаемо (цепочка / скобочная запись), а не
  // как json-объект — но это ОБЩАЯ эвристика по форме полей, не привязка к
  // конкретному пакету.
  function hasOwnKeys(v, keys) {
    return v && typeof v === "object" && !Array.isArray(v) &&
      Object.keys(v).length === keys.length &&
      keys.every(function (k) { return Object.prototype.hasOwnProperty.call(v, k); });
  }
  function isListNode(v) { return hasOwnKeys(v, ["Val", "Next"]); }
  function isTreeNode(v) { return hasOwnKeys(v, ["Val", "Left", "Right"]); }

  function fmtListChain(v) {
    var parts = [], guard = 0;
    while (v && guard < 200) { parts.push(String(v.Val)); v = v.Next; guard++; }
    parts.push(v ? "…" : "nil");
    return parts.join(" → ");
  }
  function fmtTree(v, depth) {
    depth = depth || 0;
    if (v === null || v === undefined) return "nil";
    if (depth > 6) return "…";
    var left = fmtTree(v.Left, depth + 1);
    var right = fmtTree(v.Right, depth + 1);
    if (left === "nil" && right === "nil") return String(v.Val);
    return v.Val + "(" + left + ", " + right + ")";
  }

  function fmtValue(v) {
    if (v === undefined) return "—";
    if (v === null) return "nil";
    if (Array.isArray(v)) return "[" + v.map(fmtValue).join(", ") + "]";
    if (typeof v === "object") {
      if (isListNode(v)) return fmtListChain(v);
      if (isTreeNode(v)) return fmtTree(v);
      try { return JSON.stringify(v); } catch (e) { return String(v); }
    }
    return String(v);
  }

  function banner(cls, icon, text) {
    var b = el("div", "algo-trace__banner is-" + cls);
    b.appendChild(el("span", "algo-trace__banner-icon", icon));
    b.appendChild(el("span", "algo-trace__banner-text", text));
    return b;
  }

  // ---- панель кода читателя с подсветкой текущей строки ----

  function buildCodePanel(source) {
    var panel = el("div", "algo-trace__code");
    var rows = []; // rows[lineNumber] = DOM-элемент строки (1-индексация)
    // Подсветка — та же, что у листингов визуализаций (algo-viz.js грузится раньше): своей копии
    // нет. Без algo-viz.js (отдельная проверка) строки идут простым текстом.
    var hl = window.ALGO_VIZ && window.ALGO_VIZ.hlGo;
    if (!source) {
      panel.appendChild(el("div", "algo-trace__code-line", "(сервер не прислал исходник — обновите страницу)"));
      return { panel: panel, rows: rows };
    }
    source.split("\n").forEach(function (text, idx) {
      var lineNo = idx + 1;
      var row = el("div", "algo-trace__code-line");
      var gutter = el("span", "algo-trace__code-no");
      gutter.appendChild(el("span", "algo-trace__code-arrow", "▶"));
      gutter.appendChild(document.createTextNode(String(lineNo)));
      row.appendChild(gutter);
      var code = el("span", "algo-trace__code-text");
      if (text.length && hl) code.appendChild(hl(text));
      else code.textContent = text.length ? text : " ";
      row.appendChild(code);
      panel.appendChild(row);
      rows[lineNo] = row;
    });
    return { panel: panel, rows: rows };
  }

  // ---- таймлайн: код + массив + переменные + управление ----

  function renderTimeline(container, resp, extraBanner) {
    var steps = resp.steps || [];
    var arrName = pickArrayVar(steps);
    var varNames = collectVarNames(steps);

    var wrap = el("div", "algo-trace");
    wrap.tabIndex = 0; // клавиши работают, только когда фокус внутри ЭТОГО виджета
    if (extraBanner) wrap.appendChild(extraBanner);

    if (!steps.length) {
      wrap.appendChild(el("div", "algo-trace__empty", "Трасса пуста — функция не сделала ни шага."));
      container.appendChild(wrap);
      return;
    }

    // --- контролы ---
    var posLabel = el("span", "algo-trace__pos");
    var prevBtn = el("button", "algo-trace__nav", "◀");
    var playBtn = el("button", "algo-trace__nav algo-trace__nav--play", "▶");
    var nextBtn = el("button", "algo-trace__nav", "▶");
    var slider = document.createElement("input");
    slider.type = "range";
    slider.className = "algo-trace__slider";
    slider.min = "0";
    slider.max = String(steps.length - 1);
    slider.step = "1";
    slider.disabled = steps.length <= 1;
    playBtn.disabled = steps.length <= 1;

    var controls = el("div", "algo-trace__controls");
    controls.appendChild(prevBtn);
    controls.appendChild(playBtn);
    controls.appendChild(nextBtn);
    controls.appendChild(slider);
    controls.appendChild(posLabel);
    wrap.appendChild(controls);

    // --- код слева, массив+переменные справа ---
    var main = el("div", "algo-trace__main");
    var code = buildCodePanel(resp.source);
    var side = el("div", "algo-trace__side");
    var arrayRow = el("div", "algo-trace__array");
    var varsTable = el("table", "algo-trace__vars");
    side.appendChild(arrayRow);
    side.appendChild(varsTable);
    main.appendChild(code.panel);
    main.appendChild(side);
    wrap.appendChild(main);

    container.appendChild(wrap);

    var cur = 0;
    var timer = null;

    function stopPlay() {
      if (timer) { clearInterval(timer); timer = null; playBtn.textContent = "▶"; playBtn.classList.remove("is-playing"); }
    }

    function draw() {
      slider.value = String(cur);
      var step = steps[cur];
      var prevVars = cur > 0 ? (steps[cur - 1].vars || {}) : {};

      posLabel.textContent = "шаг " + (cur + 1) + " / " + steps.length + " — " + step.tag + ", строка " + step.line;
      prevBtn.disabled = cur === 0;
      nextBtn.disabled = cur === steps.length - 1;

      // подсветка текущей строки в коде
      code.rows.forEach(function (row) { if (row) row.classList.remove("is-current"); });
      var activeRow = code.rows[step.line];
      if (activeRow) {
        activeRow.classList.add("is-current");
        activeRow.scrollIntoView({ block: "center", behavior: "smooth" });
      }

      // ряд массива + метки-указатели других int-переменных, попавших в диапазон
      arrayRow.innerHTML = "";
      if (arrName && isNumArray(step.vars[arrName])) {
        var arr = step.vars[arrName];
        var pointersByIdx = {};
        Object.keys(step.vars).forEach(function (name) {
          if (name === arrName) return;
          var v = step.vars[name];
          if (typeof v === "number" && Number.isInteger(v) && v >= 0 && v < arr.length) {
            (pointersByIdx[v] = pointersByIdx[v] || []).push(name);
          }
        });
        arr.forEach(function (val, idx) {
          var cell = el("div", "algo-trace__cell");
          cell.appendChild(el("div", "algo-trace__cell-idx", String(idx)));
          cell.appendChild(el("div", "algo-trace__cell-val", String(val)));
          if (pointersByIdx[idx]) {
            var ptrs = el("div", "algo-trace__cell-ptrs");
            pointersByIdx[idx].forEach(function (name) {
              ptrs.appendChild(el("span", "algo-trace__ptr", name));
            });
            cell.appendChild(ptrs);
            cell.classList.add("is-pointed");
          }
          arrayRow.appendChild(cell);
        });
      }

      // таблица переменных с подсветкой изменившихся
      varsTable.innerHTML = "";
      varNames.forEach(function (name) {
        if (name === arrName) return; // массив уже нарисован выше ячейками
        var row = el("tr");
        row.appendChild(el("td", "algo-trace__var-name", name));
        var val = step.vars[name];
        var td = el("td", "algo-trace__var-val", fmtValue(val));
        if (JSON.stringify(val) !== JSON.stringify(prevVars[name])) td.classList.add("is-changed");
        row.appendChild(td);
        varsTable.appendChild(row);
      });
    }

    function goTo(i, opts) {
      cur = Math.max(0, Math.min(steps.length - 1, i));
      draw();
      if (!(opts && opts.keepPlaying)) stopPlay();
    }

    prevBtn.addEventListener("click", function () { goTo(cur - 1); });
    nextBtn.addEventListener("click", function () { goTo(cur + 1); });
    slider.addEventListener("input", function () { goTo(parseInt(slider.value, 10)); });
    playBtn.addEventListener("click", function () {
      if (timer) { stopPlay(); return; }
      if (cur >= steps.length - 1) cur = -1; // доиграли — начинаем сначала
      playBtn.textContent = "⏸";
      playBtn.classList.add("is-playing");
      timer = setInterval(function () {
        if (cur >= steps.length - 1) { stopPlay(); return; }
        goTo(cur + 1, { keepPlaying: true });
      }, AUTOPLAY_MS);
    });
    wrap.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { goTo(cur - 1); }
      else if (e.key === "ArrowRight") { goTo(cur + 1); }
      else if (e.key === "Home") { goTo(0); }
      else if (e.key === "End") { goTo(steps.length - 1); }
      else if (e.key === " ") { playBtn.click(); }
      else return;
      // stopPropagation — иначе ←/→ ловит ещё и mdBook на document и листает главу
      e.preventDefault(); e.stopPropagation();
    });

    draw();
  }

  // ---- диспетчер по веткам ответа /api/trace ----

  function render(container, resp) {
    container.innerHTML = "";
    if (!resp) return;

    if (resp.unsupported) {
      container.appendChild(banner("warn", "△", resp.reason || "эта форма кода пока не поддерживает визуализацию"));
      return;
    }
    // build сервер шлёт всегда. У неподдерживаемой формы он тоже false (харнесс не
    // собирался вовсе) — поэтому unsupported проверяется выше, а не здесь.
    if (resp.build === false) {
      var box = el("div");
      box.appendChild(banner("err", "✗", "Код не скомпилировался для визуализации"));
      box.appendChild(el("pre", "algo-trace__pre", resp.output || "(нет вывода)"));
      container.appendChild(box);
      return;
    }
    // Остановка по сроку или по пределу памяти: шаги до остановки показываем, причина — в reason.
    // Без шагов ленты нет: срок мог выйти ещё на сборке, и «функция не сделала ни шага» было бы неправдой.
    if (resp.timeout || resp.memLimit) {
      var stopped = banner("err", resp.memLimit ? "💾" : "⏱", resp.reason || "не уложились в таймаут");
      if (resp.steps && resp.steps.length) renderTimeline(container, resp, stopped);
      else container.appendChild(stopped);
      return;
    }
    if (resp.panic) {
      renderTimeline(container, resp, banner("err", "💥", "Паника во время выполнения: " + (resp.message || "")));
      return;
    }
    if (resp.ok) {
      // resp.result — JSON-строка (см. cmd/runner/trace.go): парсим и гоним
      // через тот же fmtValue, что и переменные шагов — тогда *ListNode
      // отрисуется цепочкой, а не сырым указателем.
      var resultText = resp.result;
      try {
        var parsed = JSON.parse(resp.result);
        resultText = parsed === null ? "(без возврата — итог виден по последнему шагу трассы)" : fmtValue(parsed);
      } catch (e) { /* оставляем как есть */ }
      var head = "Результат: " + resultText + "  ·  " + resp.steps.length + " шагов  ·  " + resp.duration;
      renderTimeline(container, resp, banner("ok", "✓", head));
      return;
    }
    // reason без других признаков — харнесс не запустился либо его сборку прервали (сервер пишет, что именно).
    container.appendChild(banner("err", "✗", resp.reason || "Не удалось построить трассу"));
  }

  window.AlgoTraceViz = { render: render };
})();
