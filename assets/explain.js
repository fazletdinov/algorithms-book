/*
 * explain.js — режим «объясни сам»: сформулировать предусловие и инвариант СВОИМИ
 * словами до того, как прочитан разбор.
 *
 * Встраивание — в начало раздела «🧠 Почему это корректно», перед самим разбором:
 *
 *   <div class="algo-explain" data-key="sliding-window">
 *     <div class="algo-explain__item">
 *       <div class="algo-explain__q">Вопрос читателю</div>
 *       <div class="algo-explain__ref">Формулировка книги — показывается ПОСЛЕ ответа</div>
 *     </div>
 *     ...
 *   </div>
 *
 * Зачем. Всё остальное в книге проверяет узнавание: выбрать вариант, вписать число,
 * прогнать тесты. Узнавание — не воспроизведение, и именно на этой подмене держится
 * ощущение «я понял», которое рассыпается на собеседовании и на новой задаче.
 * Здесь проверка одна: можешь ли ты СКАЗАТЬ, почему алгоритм корректен, не подглядывая.
 *
 * Поэтому кнопка «показать формулировку книги» заблокирована, пока не написан
 * собственный ответ на каждый вопрос. Это единственный жёсткий гейт во всей книге, и
 * он намеренный: разбор лежит абзацем ниже, обойти его тривиально — но обойти придётся
 * СОЗНАТЕЛЬНО, а не по инерции чтения.
 *
 * Оценка «насколько сошлось» ставится читателем и уходит в движок повторений
 * (srs.js): формулировка — такой же материал для интервального повторения, как глава
 * или пакет. При повторном заходе прошлый ответ спрятан за «показать мою прошлую
 * формулировку»: иначе поле с готовым текстом убивает то самое воспроизведение.
 */
(function () {
  "use strict";

  var ANSWERS = "algoExplain"; // {key: {a: [строки], ts}}
  var DONE = "algoExplainDone"; // {key: {ts, grade}} — источник карточек для srs.js
  var MIN_CHARS = 15;

  function loadMap(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || "{}") || {};
    } catch (e) {
      return {};
    }
  }
  function save(key, obj) {
    try {
      localStorage.setItem(key, JSON.stringify(obj));
    } catch (e) {
      /* приватный режим — работаем в рамках сессии */
    }
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function build(root) {
    var key = root.getAttribute("data-key");
    if (!key) return;
    if (!root.id) root.id = "explain";

    // Вопросы и эталоны лежат в разметке главы — забираем их до перерисовки.
    var items = [];
    Array.prototype.forEach.call(root.querySelectorAll(".algo-explain__item"), function (node) {
      var q = node.querySelector(".algo-explain__q");
      var ref = node.querySelector(".algo-explain__ref");
      if (q && ref) items.push({ q: q.textContent.trim(), ref: ref.innerHTML });
    });
    if (!items.length) return;

    var store = loadMap(ANSWERS);
    var done = loadMap(DONE);
    var previous = (store[key] && store[key].a) || [];
    var repeat = !!done[key];

    root.innerHTML = "";

    var head = el("div", "algo-explain__head");
    head.appendChild(el("strong", null, repeat ? "✍️ Сформулируй снова" : "✍️ Сначала сформулируй сам"));
    head.appendChild(
      el(
        "p",
        "algo-explain__intro",
        repeat
          ? "Ты уже отвечал на это раньше. Не подглядывая ни в разбор ниже, ни в свой прошлый ответ — скажи заново."
          : "Ниже — разбор. Но сначала ответь своими словами: понимание проверяется воспроизведением, а не узнаванием. Кнопка сверки откроется, когда будут заполнены все поля."
      )
    );
    root.appendChild(head);

    var fields = [];
    items.forEach(function (item, i) {
      var box = el("div", "algo-explain__item algo-explain__item--live");
      box.appendChild(el("div", "algo-explain__q", item.q));

      var ta = document.createElement("textarea");
      ta.className = "algo-explain__input";
      ta.rows = 3;
      ta.spellcheck = false;
      ta.placeholder = "своими словами, без терминов из главы";
      box.appendChild(ta);

      if (repeat && previous[i]) {
        var toggle = el("button", "algo-explain__prevbtn", "показать мою прошлую формулировку");
        toggle.type = "button";
        var prev = el("div", "algo-explain__prev", previous[i]);
        prev.hidden = true;
        toggle.onclick = function () {
          prev.hidden = !prev.hidden;
          toggle.textContent = prev.hidden ? "показать мою прошлую формулировку" : "скрыть прошлую формулировку";
        };
        box.appendChild(toggle);
        box.appendChild(prev);
      } else if (previous[i]) {
        ta.value = previous[i];
      }

      var refBox = el("div", "algo-explain__refbox");
      refBox.hidden = true;
      refBox.appendChild(el("div", "algo-explain__reflabel", "Как это формулирует книга"));
      var refText = el("div", "algo-explain__ref");
      refText.innerHTML = item.ref;
      refBox.appendChild(refText);
      box.appendChild(refBox);

      root.appendChild(box);
      fields.push({ ta: ta, refBox: refBox });
    });

    var revealBtn = el("button", "algo-quiz__btn algo-explain__reveal", "Сверить с книгой");
    revealBtn.type = "button";
    revealBtn.disabled = true;
    var hint = el("div", "algo-explain__hint", "");
    root.appendChild(revealBtn);
    root.appendChild(hint);

    function answers() {
      return fields.map(function (f) {
        return f.ta.value.trim();
      });
    }
    function refresh() {
      var a = answers();
      var short = a.filter(function (s) {
        return s.length < MIN_CHARS;
      }).length;
      revealBtn.disabled = short > 0;
      hint.textContent = short
        ? "осталось ответить: " + short + " из " + a.length
        : "";
    }

    var timer = null;
    fields.forEach(function (f) {
      f.ta.addEventListener("input", function () {
        refresh();
        clearTimeout(timer);
        timer = setTimeout(function () {
          var s = loadMap(ANSWERS);
          s[key] = { a: answers(), ts: Date.now() };
          save(ANSWERS, s);
        }, 400);
      });
    });
    refresh();

    revealBtn.onclick = function () {
      var s = loadMap(ANSWERS);
      s[key] = { a: answers(), ts: Date.now() };
      save(ANSWERS, s);

      fields.forEach(function (f) {
        f.refBox.hidden = false;
      });
      revealBtn.disabled = true;
      hint.textContent = "";

      var grades = el("div", "algo-explain__grades");
      grades.appendChild(
        el(
          "p",
          "algo-explain__compare",
          "Сравнивай не по словам, а по существу: назвал ли ты то же условие и тот же инвариант. " +
            "Оценка уйдёт в очередь повторений — к этой формулировке стоит вернуться."
        )
      );
      [
        ["again", "Не сошлось"],
        ["hard", "Частично"],
        ["good", "Сошлось"],
      ].forEach(function (g) {
        var b = el("button", "algo-quiz__btn", g[1]);
        b.type = "button";
        b.onclick = function () {
          var d = loadMap(DONE);
          d[key] = { ts: Date.now(), grade: g[0] };
          save(DONE, d);
          grades.innerHTML = "";
          grades.appendChild(
            el(
              "p",
              "algo-explain__saved",
              "Записано. Формулировка встанет в очередь на странице «Повторение» — там она вернётся через несколько дней."
            )
          );
        };
        grades.appendChild(b);
      });
      root.appendChild(grades);
    };
  }

  function init() {
    Array.prototype.forEach.call(
      document.querySelectorAll(".algo-explain:not(.algo-explain--ready)"),
      function (node) {
        node.classList.add("algo-explain--ready");
        try {
          build(node);
        } catch (e) {
          if (window.console && console.warn) console.warn("algo-explain render error", e);
        }
      }
    );
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
