/*
 * review.js — «Повторить промахи»: список задач, которые не дались, с ссылкой
 * на конкретную задачу в главе.
 *
 * Контейнер: <div class="algo-review"></div> (см. cheatsheet.md).
 *
 * Данные копит challenge.js в localStorage: algoChallengeMissed — {id: {n, page,
 * anchor, q}}, algoChallengeSolved — {id: true}. Задача уходит из списка, как
 * только читатель её решил, поэтому список — это «что осталось», а не журнал
 * всех ошибок за всё время. Сервер не нужен: и книга, и данные локальные.
 */
(function () {
  "use strict";

  var MISSED = "algoChallengeMissed";
  var SOLVED = "algoChallengeSolved";

  function load(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || "{}") || {};
    } catch (e) {
      return {};
    }
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  // byChapter группирует промахи по главам и сортирует главы по числу
  // непройденных задач: сверху то, где буксует сильнее всего.
  function byChapter(missed, solved) {
    var map = {};
    Object.keys(missed).forEach(function (id) {
      if (solved[id]) return;
      var item = missed[id] || {};
      var page = item.page || String(id).split("#")[0];
      (map[page] = map[page] || []).push({ id: id, item: item });
    });
    return Object.keys(map)
      .map(function (page) {
        return { page: page, items: map[page] };
      })
      .sort(function (a, b) {
        return b.items.length - a.items.length || a.page.localeCompare(b.page);
      });
  }

  function build(root) {
    root.innerHTML = "";
    var missed = load(MISSED);
    var solved = load(SOLVED);
    var groups = byChapter(missed, solved);
    var total = groups.reduce(function (a, g) {
      return a + g.items.length;
    }, 0);

    var head = el("div", "algo-review__head");
    head.appendChild(
      el(
        "strong",
        null,
        total ? "Осталось повторить: " + total : "Непройденных задач нет"
      )
    );
    root.appendChild(head);

    if (!total) {
      root.appendChild(
        el(
          "p",
          "algo-review__empty",
          Object.keys(solved).length
            ? "Всё, что не давалось, ты добил. Задачи попадают сюда автоматически, когда ответ не сошёлся, и уходят, как только решены."
            : "Задача попадает сюда автоматически, когда ответ не сошёлся, и уходит, как только решена. Реши что-нибудь в главах — и увидишь список."
        )
      );
      return;
    }

    groups.forEach(function (g) {
      var box = el("div", "algo-review__chapter");
      var title = el("div", "algo-review__ch");
      var link = el("a", "algo-review__chlink", g.page);
      link.href = g.page + ".html";
      title.appendChild(link);
      title.appendChild(el("span", "algo-review__count", g.items.length + " шт."));
      box.appendChild(title);

      var list = el("ul", "algo-review__list");
      g.items
        .sort(function (a, b) {
          return (b.item.n || 0) - (a.item.n || 0);
        })
        .forEach(function (rec) {
          var li = el("li", "algo-review__item");
          var a = el("a", "algo-review__q", rec.item.q || "задача " + rec.id);
          a.href = g.page + ".html" + (rec.item.anchor ? "#" + rec.item.anchor : "");
          li.appendChild(a);
          if ((rec.item.n || 0) > 1) {
            li.appendChild(el("span", "algo-review__n", "×" + rec.item.n));
          }
          list.appendChild(li);
        });
      box.appendChild(list);
      root.appendChild(box);
    });

    var clear = el("button", "algo-quiz__btn", "Очистить список");
    clear.type = "button";
    clear.onclick = function () {
      if (!confirm("Убрать все задачи из списка «повторить»?")) return;
      try {
        localStorage.removeItem(MISSED);
      } catch (e) {
        /* приватный режим */
      }
      build(root);
    };
    root.appendChild(clear);
  }

  // ---- слабые места: где буксует РАСПОЗНАВАНИЕ, а не реализация ----
  //
  // Список промахов выше сгруппирован по главам — он отвечает на вопрос «где я
  // ошибался». Этот виджет отвечает на другой: «какой ПРИЁМ я не узнаю в
  // условии». Данные — промахи квиза (там ответ и есть название шаблона) и
  // смешанной тренировки (там шаблон выбирается по условию без темы). Это две
  // независимые проверки одного навыка, поэтому и считаются вместе.
  var QUIZ_MISSED = "algoQuizMissed";
  var MIXED_MISSED = "algoMixedMissed";

  // Строка — одна на главу, ключ — href главы. По имени сливать нельзя: квиз и смешанная называли один
  // приём по-разному («Sliding Window» в старых записях квиза, «Скользящее окно» у смешанной), и у главы
  // выходило две строки; у одной главы бывает и несколько ответов квиза («Комбинации паттернов»).
  // Запись без главы — строка по своему названию (pattern), без ссылки.
  function weakSpots() {
    var byChapter = {};
    function spot(href, fallback) {
      var key = href || "?" + fallback;
      return (byChapter[key] = byChapter[key] || {
        name: (href && chapterName(href)) || fallback,
        quiz: 0,
        mixed: 0,
        href: href
      });
    }
    var quiz = load(QUIZ_MISSED);
    Object.keys(quiz).forEach(function (q) {
      var rec = quiz[q] || {};
      // ответ и глава — из банка квиза: у вопроса они могли смениться после промаха (снимок — вне банка)
      var cur = quizQuestion(rec.q || q);
      var href = pageHref(cur ? cur.href : rec.href);
      spot(href, (cur ? cur.correct : rec.pattern) || "?").quiz += rec.n || 1;
    });
    var mixed = load(MIXED_MISSED);
    Object.keys(mixed).forEach(function (k) {
      var rec = mixed[k] || {};
      var chapter = bankChapter(rec.pkg, rec.fn) || rec.chapter;
      spot(chapter ? chapter + ".html" : "", chapter || "?").mixed += rec.n || 1;
    });
    return Object.keys(byChapter)
      .map(function (k) { return byChapter[k]; })
      .sort(function (a, b) { return b.quiz + b.mixed - (a.quiz + a.mixed); });
  }

  // pageHref — файл главы из href записи: без «./», якоря и запроса ("" — главы нет).
  function pageHref(href) {
    return String(href || "").replace(/^\.\//, "").split("#")[0].split("?")[0];
  }

  // chapterName — название главы по реестру (progress.js) без приписки после двоеточия, как в блоках
  // «Не спутай с соседом». Если без приписки название совпало бы с другой главой («Графы: продвинутые» и
  // «Графы: связность»), остаётся полным. "" — главы нет в реестре.
  function chapterName(href) {
    var list = window.ALGO_CHAPTERS || [];
    var short = function (t) { return String(t).split(":")[0].trim(); };
    for (var i = 0; i < list.length; i++) {
      if (list[i].h !== href) continue;
      var name = short(list[i].t);
      var twin = list.some(function (c) { return c.h !== href && short(c.t) === name; });
      return twin ? list[i].t : name;
    }
    return "";
  }

  // quizQuestion — вопрос банка квиза (window.ALGO_QUIZ из quiz.js) по тексту; null — вопроса больше нет.
  function quizQuestion(q) {
    var list = (window.ALGO_QUIZ && window.ALGO_QUIZ.questions) || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].q === q) return list[i];
    }
    return null;
  }

  // bankChapter — глава-ответ задачи по банку (assets/problems.js). Промах хранит главу на момент
  // ответа, а она могла смениться: bigo-задачи «следующего большего» теперь отвечают главой монотонного
  // стека. Запись — только для задачи, которой в банке больше нет ("" — не нашлась).
  function bankChapter(pkg, fn) {
    var list = window.ALGO_PROBLEMS || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].p === pkg && list[i].f === fn) return list[i].c;
    }
    return "";
  }

  function buildWeak(root) {
    root.innerHTML = "";
    var spots = weakSpots();
    if (!spots.length) {
      root.appendChild(el("p", "algo-review__empty",
        "Пока пусто. Сюда попадают шаблоны, которые не удалось УЗНАТЬ по условию: " +
        "промахи в квизе распознавания и в смешанной тренировке."));
      return;
    }
    var list = el("table", "algo-weak__table");
    var head = el("tr");
    ["Глава", "Квиз", "Смешанная", "Всего"].forEach(function (h) {
      head.appendChild(el("th", null, h));
    });
    list.appendChild(head);
    spots.forEach(function (s) {
      var tr = el("tr");
      var td = el("td");
      if (s.href) {
        var a = el("a", null, s.name);
        a.href = s.href;
        td.appendChild(a);
      } else {
        td.textContent = s.name;
      }
      tr.appendChild(td);
      tr.appendChild(el("td", "algo-weak__n", String(s.quiz || "—")));
      tr.appendChild(el("td", "algo-weak__n", String(s.mixed || "—")));
      tr.appendChild(el("td", "algo-weak__n", String(s.quiz + s.mixed)));
      list.appendChild(tr);
    });
    root.appendChild(list);
  }

  function init() {
    Array.prototype.forEach.call(
      document.querySelectorAll(".algo-weakspots:not(.algo-weakspots--ready)"),
      function (el) {
        el.classList.add("algo-weakspots--ready");
        buildWeak(el);
      }
    );
    Array.prototype.forEach.call(
      document.querySelectorAll(".algo-review:not(.algo-review--ready)"),
      function (el) {
        el.classList.add("algo-review--ready");
        build(el);
      }
    );
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
