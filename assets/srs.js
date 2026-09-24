/*
 * srs.js — интервальные повторения: что повторить сегодня и когда следующий раз.
 *
 * Контейнер: <div class="algo-today"></div> (страница «Повторение», review.md).
 *
 * Зачем. Учебник фиксирует только «пройдено» — один раз и навсегда. За два-три
 * месяца пути от Big-O до дерева отрезков начало забывается быстрее, чем
 * дочитывается конец, и никакой сигнал об этом не приходит. Здесь считается
 * обратное: КОГДА пора вернуться.
 *
 * Что попадает в очередь (карточки заводятся сами, вручную ничего размечать не
 * нужно):
 *   ch:<глава>   — как только глава отмечена пройденной в трекере;
 *   expl:<глава> — как только читатель сформулировал предусловие и инвариант своими
 *                  словами в виджете «объясни сам» (explain.js);
 *   pkg:<пакет>  — как только тесты пакета позеленели в виджете «Реши прямо здесь»;
 *   task:<id>    — как только задача в тексте не далась (промах из challenge.js);
 *   quiz:<вопрос> — промах в квизе распознавания шаблонов (quiz.js);
 *   mix:<pkg>.<fn> — в смешанной тренировке шаблон выбран неверно (mixed.js);
 *   cx:<pkg>.<fn>  — в режиме собеседования сложность своего решения оценена
 *                  неверно (mixed.js): шаблон мог быть узнан, а цена кода — нет.
 *
 * Расписание — SM-2 в упрощённом виде: у карточки есть интервал (дни) и «лёгкость»
 * ease. «Помню» умножает интервал на ease, «с трудом» растит его чуть-чуть,
 * «забыл» роняет обратно в один день и снижает ease. Первые два интервала
 * фиксированы (1 и 3 дня) — до них умножать нечего.
 *
 * Ограничение, которое честно назвать: оценку ставит сам читатель, и движок
 * верит ей на слово. Для главы и пакета проверка объективная есть рядом (тесты
 * в тренажёре), для теории — только самооценка.
 */
(function () {
  "use strict";

  var KEY = "algoSRS";
  var PROGRESS = "algoProgress";
  var PKG_SOLVED = "algoPkgSolved";
  var MISSED = "algoChallengeMissed";
  var SOLVED = "algoChallengeSolved";
  var EXPLAINED = "algoExplainDone";
  var QUIZ_MISSED = "algoQuizMissed";
  var MIXED_MISSED = "algoMixedMissed";
  var CX_MISSED = "algoMockCxMissed";

  var DAY = 24 * 60 * 60 * 1000;
  var EASE_START = 2.5;
  var EASE_MIN = 1.3;
  var EASE_MAX = 2.8;

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

  function chapterTitle(href) {
    var list = window.ALGO_CHAPTERS || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].h === href) return list[i].t;
    }
    return href.replace(/\.html$/, "");
  }

  // sync заводит карточки для всего, что читатель уже прошёл или провалил, и
  // ничего не удаляет: снятая в трекере галочка — не повод забывать историю
  // повторений этой главы.
  //
  // Новая карточка главы/пакета получает срок «завтра», а не «сейчас»: повторять
  // в день прохождения бессмысленно, материал ещё в голове. Промах — наоборот,
  // сразу в очередь: он и есть сигнал, что не понято именно сейчас.
  function sync(now) {
    var cards = loadMap(KEY);
    var changed = false;

    var progress = loadMap(PROGRESS);
    Object.keys(progress).forEach(function (href) {
      if (!progress[href]) return;
      var id = "ch:" + href;
      if (cards[id]) return;
      cards[id] = newCard(now + DAY, { href: href });
      changed = true;
    });

    var pkgs = loadMap(PKG_SOLVED);
    Object.keys(pkgs).forEach(function (pkg) {
      var id = "pkg:" + pkg;
      if (cards[id]) return;
      cards[id] = newCard(now + DAY, { pkg: pkg });
      changed = true;
    });

    var explained = loadMap(EXPLAINED);
    Object.keys(explained).forEach(function (chapKey) {
      var id = "expl:" + chapKey;
      if (cards[id]) return;
      cards[id] = newCard(now + DAY, { chapter: chapKey });
      changed = true;
    });

    // Промахи квиза и смешанной тренировки — это «не узнал шаблон», то есть
    // ровно то, что надо возвращать; поэтому они, как и промахи задач, встают
    // в очередь СЕГОДНЯ, а не завтра.
    var quizMissed = loadMap(QUIZ_MISSED);
    Object.keys(quizMissed).forEach(function (q) {
      var id = "quiz:" + q;
      if (cards[id]) return;
      cards[id] = newCard(now, quizMissed[q]);
      changed = true;
    });

    var mixMissed = loadMap(MIXED_MISSED);
    Object.keys(mixMissed).forEach(function (k) {
      var id = "mix:" + k;
      if (cards[id]) return;
      cards[id] = newCard(now, mixMissed[k]);
      changed = true;
    });

    // Промах по сложности тоже встаёт СЕГОДНЯ: оценить цену своего кода — навык,
    // который на собеседовании проверяют сразу после зелёных тестов.
    var cxMissed = loadMap(CX_MISSED);
    Object.keys(cxMissed).forEach(function (k) {
      var id = "cx:" + k;
      if (cards[id]) return;
      cards[id] = newCard(now, cxMissed[k]);
      changed = true;
    });

    var missed = loadMap(MISSED);
    var solved = loadMap(SOLVED);
    Object.keys(missed).forEach(function (taskId) {
      if (solved[taskId]) return;
      var id = "task:" + taskId;
      if (cards[id]) return;
      var m = missed[taskId] || {};
      cards[id] = newCard(now, { page: m.page, anchor: m.anchor, q: m.q });
      changed = true;
    });

    if (changed) save(KEY, cards);
    return cards;
  }

  function newCard(due, meta) {
    return { due: due, iv: 0, ease: EASE_START, reps: 0, meta: meta };
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  // grade: "again" | "hard" | "good". Возвращает новый интервал в днях.
  function schedule(card, grade, now) {
    if (grade === "again") {
      card.ease = clamp(card.ease - 0.2, EASE_MIN, EASE_MAX);
      card.iv = 1;
      card.reps = 0;
    } else if (grade === "hard") {
      card.ease = clamp(card.ease - 0.05, EASE_MIN, EASE_MAX);
      card.iv = Math.max(1, Math.round((card.iv || 1) * 1.2));
      card.reps++;
    } else {
      card.ease = clamp(card.ease + 0.05, EASE_MIN, EASE_MAX);
      if (card.reps === 0) card.iv = 1;
      else if (card.reps === 1) card.iv = 3;
      else card.iv = Math.max(1, Math.round(card.iv * card.ease));
      card.reps++;
    }
    card.due = now + card.iv * DAY;
    card.seen = now;
    return card.iv;
  }

  function kindOf(id) {
    return id.slice(0, id.indexOf(":"));
  }

  function describe(id, card) {
    var meta = card.meta || {};
    if (kindOf(id) === "ch") {
      return { kind: "Глава", title: chapterTitle(meta.href || ""), href: meta.href || "", what: "Вспомни предусловие и инвариант, не заглядывая в текст, — потом сверься." };
    }
    if (kindOf(id) === "quiz") {
      return {
        kind: "Квиз: распознать шаблон",
        title: meta.q || id.slice(5),
        href: "quiz.html",
        what: "Назови шаблон и, главное, триггер в условии, по которому ты его узнал — правильный ответ без триггера не считается.",
      };
    }
    if (kindOf(id) === "mix") {
      return {
        kind: "Смешанная тренировка",
        title: (meta.pkg || "") + "." + (meta.fn || "") + " — шаблон был выбран неверно",
        href: "mixed.html",
        what: "Здесь ты не узнал приём по условию. Открой смешанную тренировку — задача выпадет снова, такие показываются чаще.",
      };
    }
    if (kindOf(id) === "cx") {
      return {
        kind: "Собеседование: сложность",
        title: (meta.pkg || "") + "." + (meta.fn || "") + " — сложность своего решения оценена неверно",
        href: "mixed.html",
        what: "Не открывая решение, выведи время и память: сколько раз выполняется каждый цикл, что растёт вместе с входом. Потом сверься с условием задачи.",
      };
    }
    if (kindOf(id) === "expl") {
      var href = (meta.chapter || "") + ".html";
      return {
        kind: "Формулировка",
        title: chapterTitle(href),
        href: href + "#explain",
        what: "Скажи вслух предусловие и инвариант этого шаблона — и только потом открывай разбор.",
      };
    }
    if (kindOf(id) === "pkg") {
      return { kind: "Пакет тренажёра", title: meta.pkg || id.slice(4), href: "", what: "Открой пакет и перереши с чистой заготовки: код забывается быстрее теории." };
    }
    return {
      kind: "Задача",
      title: meta.q || id.slice(5),
      href: meta.page ? meta.page + ".html" + (meta.anchor ? "#" + meta.anchor : "") : "",
      what: "Эта задача когда-то не далась. Ответь снова — не вспоминая ответ, а выводя его.",
    };
  }

  function due(cards, now) {
    return Object.keys(cards)
      .filter(function (id) {
        return (cards[id].due || 0) <= now;
      })
      .sort(function (a, b) {
        return (cards[a].due || 0) - (cards[b].due || 0);
      });
  }

  function nextDueIn(cards, now) {
    var min = Infinity;
    Object.keys(cards).forEach(function (id) {
      var d = cards[id].due || 0;
      if (d > now && d < min) min = d;
    });
    return min === Infinity ? null : Math.max(1, Math.ceil((min - now) / DAY));
  }

  function plural(n, one, few, many) {
    var n10 = n % 10, n100 = n % 100;
    if (n10 === 1 && n100 !== 11) return one;
    if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return few;
    return many;
  }

  function build(root) {
    var now = Date.now();
    var cards = sync(now);
    var queue = due(cards, now);

    function render() {
      root.innerHTML = "";
      var total = Object.keys(cards).length;

      var head = el("div", "algo-today__head");
      head.appendChild(el("strong", null, queue.length
        ? "К повторению сегодня: " + queue.length
        : "На сегодня всё"));
      var sub = el("span", "algo-today__sub");
      var nd = nextDueIn(cards, now);
      sub.textContent = total
        ? "всего карточек " + total + (nd ? " · следующая через " + nd + " " + plural(nd, "день", "дня", "дней") : "")
        : "карточек пока нет";
      head.appendChild(sub);
      root.appendChild(head);

      if (!queue.length) {
        root.appendChild(el("p", "algo-today__empty", total
          ? "Ничего не просрочено — возвращайся завтра. Карточки заводятся сами: отметил главу пройденной, позеленел пакет в тренажёре, промахнулся в задаче."
          : "Отметь пройденную главу в трекере, реши пакет в тренажёре или промахнись в задаче — и здесь появится первая карточка."));
        return;
      }

      var id = queue[0];
      var card = cards[id];
      var info = describe(id, card);

      var box = el("div", "algo-today__card");
      box.appendChild(el("div", "algo-today__kind", info.kind));
      if (info.href) {
        var a = el("a", "algo-today__title", info.title);
        a.href = info.href;
        box.appendChild(a);
      } else {
        box.appendChild(el("div", "algo-today__title", info.title));
      }
      box.appendChild(el("p", "algo-today__what", info.what));

      if (card.note) {
        box.appendChild(el("p", "algo-today__note", "В прошлый раз: " + card.note));
      }

      var bar = el("div", "algo-today__grades");
      [
        ["again", "Забыл", "снова через день"],
        ["hard", "С трудом", "интервал почти не растёт"],
        ["good", "Помню", "интервал растёт"],
      ].forEach(function (g) {
        var b = el("button", "algo-quiz__btn algo-today__grade", g[1]);
        b.type = "button";
        b.title = g[2];
        b.onclick = function () {
          if (g[0] === "again") {
            askNote(card, function () { apply(g[0]); });
            return;
          }
          apply(g[0]);
        };
        bar.appendChild(b);
      });
      box.appendChild(bar);
      root.appendChild(box);

      function apply(grade) {
        var iv = schedule(card, grade, now);
        save(KEY, cards);
        queue.shift();
        render();
        var toast = el("div", "algo-today__toast",
          "Следующее повторение через " + iv + " " + plural(iv, "день", "дня", "дней"));
        root.appendChild(toast);
      }

      // Дневник ошибок: «забыл» — единственный момент, когда причина ещё в
      // голове. Формулировка своими словами и есть то, что превращает промах в
      // знание, поэтому её показываем при следующем повторе этой же карточки.
      function askNote(card, done) {
        var wrap = el("div", "algo-today__noteform");
        wrap.appendChild(el("label", "algo-today__notelabel", "В чём была ошибка? (необязательно, но полезно)"));
        var input = document.createElement("input");
        input.type = "text";
        input.className = "algo-challenge__input";
        input.placeholder = "например: перепутал границу — right включительно, а не исключительно";
        input.value = card.note || "";
        wrap.appendChild(input);
        var ok = el("button", "algo-quiz__btn", "Сохранить и отложить");
        ok.type = "button";
        ok.onclick = function () {
          var v = input.value.trim();
          if (v) card.note = v;
          done();
        };
        wrap.appendChild(ok);
        box.appendChild(wrap);
        input.focus();
        input.addEventListener("keydown", function (e) {
          if (e.key === "Enter") { e.preventDefault(); ok.click(); }
        });
      }
    }

    render();
  }

  function init() {
    Array.prototype.forEach.call(
      document.querySelectorAll(".algo-today:not(.algo-today--ready)"),
      function (node) {
        node.classList.add("algo-today--ready");
        build(node);
      }
    );
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
