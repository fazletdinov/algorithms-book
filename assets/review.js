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

  function init() {
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
