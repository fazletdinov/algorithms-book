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
 *   predict  — свободный ввод ответа (data-answer; несколько вариантов через «;»)
 *   choice   — выбор из вариантов (data-options="A|B|C", data-answer=индекс с 0;
 *              виджет ПЕРЕМЕШИВАЕТ кнопки, поэтому индекс — про исходный порядок
 *              в data-options, а не про позицию на экране; сами варианты не должны
 *              содержать символ «|» — он разделитель)
 *   cloze    — впиши пропущенное выражение в код; сравнение БЕЗ учёта пробелов,
 *              поэтому "right-left+1" и "right - left + 1" считаются равными
 *              (data-answer; варианты через «;»)
 *   ordering — расставь шаги алгоритма по порядку; data-items="Шаг1|Шаг2|Шаг3"
 *              перечислены в ПРАВИЛЬНОМ порядке, виджет их перемешивает
 *
 * Доп. атрибуты: data-explain (разбор), data-hint (подсказка),
 *   data-placeholder (подсказка в поле ввода).
 *
 * Принцип «реши сам»: при верном ответе разбор показывается сразу; при неверном —
 * НЕ показывается (иначе первая же ошибка спойлерит ответ). После второй неудачной
 * попытки появляется кнопка «Показать разбор» — читатель открывает его осознанно.
 * У choice попытка одна (правильная кнопка всё равно подсвечивается), поэтому там
 * разбор виден сразу после ответа.
 */
(function () {
  "use strict";

  // foldHomoglyphs — кириллические двойники латиницы приводим к латинице.
  // Русскоязычный читатель в ответе «O(1)» почти наверняка наберёт кириллическую
  // «О» — визуально она неотличима, и без свёртки честный ответ не засчитается.
  // Применяется к ОБЕИМ сторонам сравнения (и к data-answer, и к вводу), поэтому
  // русские слова в ответах («минимум») продолжают сравниваться корректно.
  var HOMOGLYPHS = {
    "а": "a", "е": "e", "ё": "e", "о": "o", "с": "c",
    "р": "p", "х": "x", "у": "y", "к": "k", "м": "m", "т": "t",
  };
  function foldHomoglyphs(s) {
    return s.replace(/[аеёосрхукмт]/g, function (ch) { return HOMOGLYPHS[ch]; });
  }

  // Пробелы-разделители разрядов внутри чисел убираем: «1 048 576» == «1048576»
  // (\s в JS покрывает и NBSP/узкий NBSP, которыми числа форматируют в тексте).
  function joinDigits(s) {
    return s.replace(/(\d)\s+(?=\d)/g, "$1");
  }

  function norm(s) {
    return joinDigits(
      foldHomoglyphs(String(s == null ? "" : s).trim().toLowerCase())
    ).replace(/\s+/g, " ");
  }

  // normCode — нормализация для cloze: сравниваем код без учёта пробелов вообще,
  // чтобы "right-left+1" и "right - left + 1" считались одинаковыми.
  function normCode(s) {
    return foldHomoglyphs(String(s == null ? "" : s).toLowerCase()).replace(/\s+/g, "");
  }

  // shuffle — перемешивание на месте (Фишер — Йейтс).
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }

  // Прогресс задач в localStorage (необязательный, мягкий).
  //
  // Идентификатор задачи раньше брался из data-id — атрибута, которого нет НИ В
  // ОДНОЙ главе, поэтому markSolved молча не сохранял ничего. Теперь id
  // выводится сам: «страница#порядковый-номер задачи на ней». Он стабилен,
  // пока в главу не вставили новую задачу в середину, — для личного трекера
  // этого достаточно (в худшем случае устареет одна запись), а платить за
  // стабильность ручной разметкой 672 задач никто не станет. Явный data-id,
  // если он появится, по-прежнему главнее.
  var STORE = "algoChallengeSolved";
  var MISSED = "algoChallengeMissed";

  function pageKey() {
    var m = /([^/]+)\.html?$/.exec(location.pathname);
    return m ? m[1] : (location.pathname || "page");
  }
  function challengeId(root, index) {
    return root.getAttribute("data-id") || pageKey() + "#" + index;
  }

  function loadMap(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || "{}") || {};
    } catch (e) {
      return {};
    }
  }
  function loadSolved() { return loadMap(STORE); }

  function save(key, obj) {
    try {
      localStorage.setItem(key, JSON.stringify(obj));
    } catch (e) {
      /* приватный режим — молча игнорируем */
    }
  }

  function markSolved(root) {
    var id = root && root.__algoId;
    if (!id) return;
    var s = loadSolved();
    s[id] = true;
    save(STORE, s);
    // Решённая задача уходит из списка «повторить»: смысл списка — то, что
    // ещё НЕ далось, а не журнал всех когда-либо сделанных ошибок.
    var m = loadMap(MISSED);
    if (m[id]) {
      delete m[id];
      save(MISSED, m);
    }
  }

  // markMissed копит промахи для режима «повторить» (см. review.js): что за
  // задача, в какой главе и сколько раз не далась.
  function markMissed(root) {
    var id = root && root.__algoId;
    if (!id) return;
    if (loadSolved()[id]) return; // уже решена — промах не в счёт
    var m = loadMap(MISSED);
    var q = root.querySelector(".algo-challenge__q");
    m[id] = {
      n: ((m[id] && m[id].n) || 0) + 1,
      page: pageKey(),
      anchor: root.id || "",
      q: (q ? q.textContent : "").trim().slice(0, 120),
    };
    save(MISSED, m);
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

  // addReveal — кнопка «Показать разбор» после повторной неудачи. Разбор при
  // неверном ответе не спойлерим автоматически (принцип «реши сам»), но и не
  // бросаем читателя без выхода: после двух промахов он может открыть его сам.
  function addReveal(fb, explain) {
    if (!explain) return;
    var btn = el("button", "algo-challenge__reveal", "Показать разбор");
    btn.type = "button";
    btn.addEventListener("click", function () {
      btn.remove();
      fb.appendChild(el("span", "algo-challenge__explain", explain));
    });
    fb.appendChild(document.createTextNode(" "));
    fb.appendChild(btn);
  }

  function attachHint(root, hint) {
    if (!hint) return;
    var box = el("details", "algo-challenge__hint");
    var sum = el("summary", null, "Подсказка");
    box.appendChild(sum);
    box.appendChild(el("div", null, hint));
    root.appendChild(box);
  }

  // setupInput — общий движок для predict и cloze; отличаются лишь нормализатором
  // сравнения (norm — по словам, normCode — код без пробелов).
  function setupInput(root, normalizer, defaultPlaceholder) {
    var answers = String(root.getAttribute("data-answer") || "").split(";").map(normalizer);
    var explain = root.getAttribute("data-explain") || "";
    var hint = root.getAttribute("data-hint") || "";
    var placeholder = root.getAttribute("data-placeholder") || defaultPlaceholder;

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

    var fails = 0;
    function check() {
      var val = normalizer(input.value);
      if (val === "") {
        fb.className = "algo-challenge__fb algo-challenge__fb--no";
        fb.textContent = "Введите ответ.";
        return;
      }
      var ok = answers.indexOf(val) !== -1;
      // Разбор — только при верном ответе; при промахе он раскрыл бы ответ.
      showResult(fb, ok, ok ? explain : "");
      if (ok) {
        input.classList.add("algo-challenge__input--ok");
        markSolved(root);
      } else {
        markMissed(root);
        fails++;
        if (fails >= 2) addReveal(fb, explain);
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
    var correctBtn = null;

    // Кнопки перемешиваем: иначе позиция правильного варианта в data-options
    // становится подсказкой (а исторически он почти всегда шёл первым).
    var order = shuffle(opts.map(function (_, i) { return i; }));

    order.forEach(function (orig) {
      var b = el("button", "algo-challenge__opt", opts[orig].trim());
      b.type = "button";
      b.setAttribute("aria-pressed", "false");
      if (orig === correct) correctBtn = b;
      b.addEventListener("click", function () {
        if (answered) return;
        answered = true;
        var ok = orig === correct;
        b.classList.add(ok ? "algo-challenge__opt--ok" : "algo-challenge__opt--no");
        b.setAttribute("aria-pressed", "true");
        if (!ok && correctBtn) {
          correctBtn.classList.add("algo-challenge__opt--reveal");
        }
        buttons.forEach(function (x) {
          x.disabled = true;
        });
        showResult(fb, ok, explain);
        if (ok) markSolved(root); else markMissed(root);
      });
      buttons.push(b);
      list.appendChild(b);
    });
    root.appendChild(list);
    attachHint(root, hint);
    var fb = buildFeedback(root);
  }

  // setupOrdering — расставь шаги алгоритма по порядку. data-items перечислены в
  // ПРАВИЛЬНОМ порядке; виджет перемешивает их в пул, читатель кликами собирает
  // последовательность (клик по выбранному шагу возвращает его в пул).
  function setupOrdering(root) {
    var items = String(root.getAttribute("data-items") || "")
      .split("|")
      .map(function (s) { return s.trim(); })
      .filter(Boolean);
    var explain = root.getAttribute("data-explain") || "";
    var hint = root.getAttribute("data-hint") || "";

    var correct = items.slice();
    var chosen = [];
    var remaining = shuffle(items.slice());
    // если перемешивание случайно совпало с правильным — сдвигаем.
    if (items.length > 1 && remaining.join("") === correct.join("")) {
      remaining.push(remaining.shift());
    }

    var seq = el("div", "algo-challenge__seq");
    seq.setAttribute("aria-label", "Ваш порядок шагов");
    var pool = el("div", "algo-challenge__pool");
    pool.setAttribute("aria-label", "Доступные шаги");
    root.appendChild(seq);
    root.appendChild(el("div", "algo-challenge__seq-sep", "↑ ваш порядок · доступные шаги ↓"));
    root.appendChild(pool);

    var row = el("div", "algo-challenge__row");
    var checkBtn = el("button", "algo-challenge__btn", "Проверить порядок");
    checkBtn.type = "button";
    var resetBtn = el("button", "algo-challenge__btn algo-challenge__btn--ghost", "Сбросить");
    resetBtn.type = "button";
    row.appendChild(checkBtn);
    row.appendChild(resetBtn);
    root.appendChild(row);
    attachHint(root, hint);
    var fb = buildFeedback(root);

    function clearFb() {
      fb.className = "algo-challenge__fb";
      fb.textContent = "";
    }

    function chip(text, chosenFlag, index) {
      var b = el("button", "algo-challenge__chip" + (chosenFlag ? " is-chosen" : ""));
      b.type = "button";
      if (chosenFlag) {
        var num = el("span", "algo-challenge__num", String(index + 1));
        b.appendChild(num);
      }
      b.appendChild(document.createTextNode(text));
      b.addEventListener("click", function () {
        if (chosenFlag) {
          chosen.splice(index, 1);
          remaining.push(text);
        } else {
          remaining.splice(index, 1);
          chosen.push(text);
        }
        clearFb();
        draw();
      });
      return b;
    }

    function draw() {
      seq.innerHTML = "";
      pool.innerHTML = "";
      if (chosen.length === 0) {
        seq.appendChild(el("span", "algo-challenge__seq-empty", "нажимайте шаги ниже в нужном порядке"));
      }
      chosen.forEach(function (t, i) { seq.appendChild(chip(t, true, i)); });
      remaining.forEach(function (t, i) { pool.appendChild(chip(t, false, i)); });
    }

    var fails = 0;
    checkBtn.addEventListener("click", function () {
      if (chosen.length !== correct.length) {
        fb.className = "algo-challenge__fb algo-challenge__fb--no";
        fb.textContent = "Расставьте все шаги.";
        return;
      }
      var ok = chosen.join("") === correct.join("");
      showResult(fb, ok, ok ? explain : "");
      if (ok) {
        markSolved(root);
        seq.classList.add("is-ok");
      } else {
        markMissed(root);
        fails++;
        if (fails >= 2) addReveal(fb, explain);
        seq.classList.remove("is-ok");
      }
    });

    resetBtn.addEventListener("click", function () {
      remaining = shuffle(correct.concat(chosen));
      chosen = [];
      seq.classList.remove("is-ok");
      clearFb();
      draw();
    });

    draw();
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
    } else if (type === "cloze") {
      setupInput(root, normCode, "выражение");
    } else if (type === "ordering") {
      setupOrdering(root);
    } else {
      setupInput(root, norm, "ваш ответ");
    }
  }

  function init() {
    var nodes = document.querySelectorAll(".algo-challenge");
    for (var i = 0; i < nodes.length; i++) {
      try {
        // id для хранилища и якорь для ссылки «повторить» из списка промахов
        nodes[i].__algoId = challengeId(nodes[i], i);
        if (!nodes[i].id) nodes[i].id = "task-" + i;
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
