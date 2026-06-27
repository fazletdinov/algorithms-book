/*
 * challenge.js — интерактивные задачи «реши прямо в книге».
 * Читатель отвечает в браузере и сразу видит проверку. Готового решения НЕТ.
 *
 * Встраивание в главу:
 *   <div class="algo-challenge" data-type="predict" data-answer="12"
 *        data-explain="48→36→12→0, НОД = 12.">
 *     <div class="algo-challenge__q">Что вернёт <code>gcd(48, 36)</code>?</div>
 *     <pre class="algo-challenge__code">for b != 0 { a, b = b, a%b }</pre>
 *   </div>
 *
 * Типы (data-type):
 *   predict — свободный ввод ответа (data-answer; несколько вариантов через «;»)
 *   choice  — выбор из вариантов (data-options="A|B|C", data-answer=индекс с 0)
 *
 * Доп. атрибуты: data-explain (разбор после проверки), data-hint (подсказка),
 *   data-placeholder (подсказка в поле ввода).
 */
(function () {
  "use strict";

  function norm(s) {
    return String(s == null ? "" : s).trim().toLowerCase().replace(/\s+/g, " ");
  }

  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }

  // Прогресс решённых задач в localStorage (необязательный, мягкий).
  var STORE = "algoChallengeSolved";
  function loadSolved() {
    try {
      return JSON.parse(localStorage.getItem(STORE) || "{}") || {};
    } catch (e) {
      return {};
    }
  }
  function markSolved(id) {
    if (!id) return;
    try {
      var s = loadSolved();
      s[id] = true;
      localStorage.setItem(STORE, JSON.stringify(s));
    } catch (e) {
      /* приватный режим — молча игнорируем */
    }
  }

  function buildFeedback(root) {
    var fb = el("div", "algo-challenge__fb");
    fb.setAttribute("role", "status");
    fb.setAttribute("aria-live", "polite");
    root.appendChild(fb);
    return fb;
  }

  function showResult(fb, ok, explain) {
    fb.className = "algo-challenge__fb algo-challenge__fb--" + (ok ? "ok" : "no");
    fb.innerHTML = "";
    var head = el("span", "algo-challenge__fbicon", ok ? "✓ " : "✗ ");
    head.setAttribute("aria-hidden", "true");
    fb.appendChild(head);
    fb.appendChild(document.createTextNode(ok ? "Верно. " : "Не то. "));
    if (explain) {
      var ex = el("span", "algo-challenge__explain", explain);
      fb.appendChild(ex);
    }
  }

  function attachHint(root, hint) {
    if (!hint) return;
    var box = el("details", "algo-challenge__hint");
    var sum = el("summary", null, "Подсказка");
    box.appendChild(sum);
    box.appendChild(el("div", null, hint));
    root.appendChild(box);
  }

  function setupPredict(root) {
    var answers = String(root.getAttribute("data-answer") || "").split(";").map(norm);
    var explain = root.getAttribute("data-explain") || "";
    var hint = root.getAttribute("data-hint") || "";
    var placeholder = root.getAttribute("data-placeholder") || "ваш ответ";

    var row = el("div", "algo-challenge__row");
    var input = el("input", "algo-challenge__input");
    input.type = "text";
    input.setAttribute("aria-label", "Ваш ответ");
    input.setAttribute("autocomplete", "off");
    input.setAttribute("autocapitalize", "off");
    input.setAttribute("spellcheck", "false");
    input.placeholder = placeholder;
    var btn = el("button", "algo-challenge__btn", "Проверить");
    btn.type = "button";
    row.appendChild(input);
    row.appendChild(btn);
    root.appendChild(row);
    attachHint(root, hint);
    var fb = buildFeedback(root);

    function check() {
      var val = norm(input.value);
      if (val === "") {
        fb.className = "algo-challenge__fb algo-challenge__fb--no";
        fb.textContent = "Введите ответ.";
        return;
      }
      var ok = answers.indexOf(val) !== -1;
      showResult(fb, ok, explain);
      if (ok) {
        input.classList.add("algo-challenge__input--ok");
        markSolved(root.getAttribute("data-id"));
      } else {
        input.classList.remove("algo-challenge__input--ok");
      }
    }

    btn.addEventListener("click", check);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        check();
      }
      if (input.classList.contains("algo-challenge__input--ok")) {
        input.classList.remove("algo-challenge__input--ok");
      }
    });
  }

  function setupChoice(root) {
    var opts = String(root.getAttribute("data-options") || "").split("|");
    var correct = parseInt(root.getAttribute("data-answer"), 10);
    var explain = root.getAttribute("data-explain") || "";
    var hint = root.getAttribute("data-hint") || "";

    var list = el("div", "algo-challenge__opts");
    list.setAttribute("role", "group");
    var answered = false;
    var buttons = [];

    opts.forEach(function (text, i) {
      var b = el("button", "algo-challenge__opt", text.trim());
      b.type = "button";
      b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", function () {
        if (answered) return;
        answered = true;
        var ok = i === correct;
        b.classList.add(ok ? "algo-challenge__opt--ok" : "algo-challenge__opt--no");
        b.setAttribute("aria-pressed", "true");
        if (!ok && buttons[correct]) {
          buttons[correct].classList.add("algo-challenge__opt--reveal");
        }
        buttons.forEach(function (x) {
          x.disabled = true;
        });
        showResult(fb, ok, explain);
        if (ok) markSolved(root.getAttribute("data-id"));
      });
      buttons.push(b);
      list.appendChild(b);
    });
    root.appendChild(list);
    attachHint(root, hint);
    var fb = buildFeedback(root);
  }

  function render(root) {
    if (root.getAttribute("data-ready") === "1") return;
    root.setAttribute("data-ready", "1");
    root.setAttribute("role", "group");
    root.setAttribute("aria-roledescription", "Интерактивная задача");
    var badge = el("div", "algo-challenge__badge", "Задача — реши сам");
    badge.setAttribute("aria-hidden", "true");
    root.insertBefore(badge, root.firstChild);

    var type = root.getAttribute("data-type") || "predict";
    if (type === "choice") {
      setupChoice(root);
    } else {
      setupPredict(root);
    }
  }

  function init() {
    var nodes = document.querySelectorAll(".algo-challenge");
    for (var i = 0; i < nodes.length; i++) {
      try {
        render(nodes[i]);
      } catch (e) {
        if (window.console && console.warn) console.warn("challenge render error", e);
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
