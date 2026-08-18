/*
 * mixed.js — смешанная тренировка: случайная задача из тренажёра БЕЗ контекста
 * главы. Контейнер: <div class="algo-mixed"></div> (страница mixed.md).
 *
 * Зачем. Вся остальная практика в книге блочная: читаешь главу про бинарный
 * поиск и решаешь задачи, про которые заранее известно, что это бинарный поиск.
 * Название главы, имя пакета и подсказка в заготовке отвечают за самый трудный
 * шаг — «каким приёмом это вообще решается», — и он не тренируется вовсе.
 *
 * Здесь порядок обратный: сначала условие без темы, вопрос «какой шаблон?»,
 * и только после ответа — подсказки, глава и редактор с настоящими тестами.
 * Задачи идут вперемешку (interleaving): именно смешивание, а не блоки, учит
 * выбирать приём, а не применять заранее названный.
 *
 * Данные — window.ALGO_PROBLEMS (assets/problems.js, генерируется из
 * док-комментариев заготовок командой `go run ./cmd/problembank`).
 * Промах по выбору шаблона уходит карточкой в движок повторений (srs.js).
 */
(function () {
  "use strict";

  var MISSED = "algoMixedMissed"; // {"<pkg>.<fn>": {n, chapter, fn, pkg}} — источник карточек для srs.js
  var SEEN = "algoMixedSeen"; // {"<pkg>.<fn>": ts} — чтобы не выдавать одно и то же подряд
  var OPTIONS = 4;

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
      /* приватный режим */
    }
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function chapterTitle(chapter) {
    var list = window.ALGO_CHAPTERS || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].h === chapter + ".html") return list[i].t;
    }
    return chapter;
  }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  // pick выбирает задачу: сначала те, где шаблон угадан неверно (их надо
  // добить), затем невиданные, затем всё остальное — и всегда не ту, что была
  // показана только что.
  function pick(problems, lastKey) {
    var missed = loadMap(MISSED);
    var seen = loadMap(SEEN);
    var pool = problems.filter(function (p) {
      return key(p) !== lastKey;
    });
    if (!pool.length) pool = problems;

    var wrong = pool.filter(function (p) {
      return missed[key(p)];
    });
    var fresh = pool.filter(function (p) {
      return !seen[key(p)] && !missed[key(p)];
    });
    var bucket = wrong.length && Math.random() < 0.5 ? wrong : fresh.length ? fresh : pool;
    return bucket[Math.floor(Math.random() * bucket.length)];
  }

  function key(p) {
    return p.p + "." + p.f;
  }

  // distractors — три чужие главы: берём темы ДРУГИХ задач банка, поэтому
  // варианты всегда правдоподобны и не требуют ручного ведения списка.
  function distractors(problems, correctChapter) {
    var others = {};
    problems.forEach(function (p) {
      if (p.c !== correctChapter) others[p.c] = true;
    });
    return shuffle(Object.keys(others)).slice(0, OPTIONS - 1);
  }

  function build(root) {
    var problems = window.ALGO_PROBLEMS || [];
    root.innerHTML = "";

    if (!problems.length) {
      root.appendChild(el("p", "algo-mixed__empty",
        "Банк задач не загрузился (assets/problems.js). Собери книгу заново: mdbook build."));
      return;
    }

    var lastKey = null;

    var head = el("div", "algo-mixed__head");
    var nextBtn = el("button", "algo-quiz__btn algo-mixed__next", "Дать задачу");
    nextBtn.type = "button";
    head.appendChild(nextBtn);
    var stat = el("span", "algo-mixed__stat", "");
    head.appendChild(stat);
    root.appendChild(head);

    var body = el("div", "algo-mixed__body");
    root.appendChild(body);

    refreshStat();
    function refreshStat() {
      var missed = Object.keys(loadMap(MISSED)).length;
      var seen = Object.keys(loadMap(SEEN)).length;
      stat.textContent = "в банке " + problems.length + " задач · показано " + seen +
        (missed ? " · шаблон не угадан у " + missed : "");
    }

    nextBtn.onclick = function () {
      var p = pick(problems, lastKey);
      lastKey = key(p);
      render(p);
      nextBtn.textContent = "Следующая задача";
      refreshStat();
    };

    function render(p) {
      body.innerHTML = "";

      var card = el("div", "algo-mixed__card");
      card.appendChild(el("div", "algo-mixed__label", "Условие"));
      p.s.split("\n").forEach(function (para) {
        card.appendChild(el("p", "algo-mixed__text", para));
      });
      body.appendChild(card);

      var qBox = el("div", "algo-mixed__q");
      qBox.appendChild(el("div", "algo-mixed__label", "Каким шаблоном это решается?"));
      var opts = shuffle(distractors(problems, p.c).concat([p.c]));
      var answered = false;
      var buttons = [];

      opts.forEach(function (chapter) {
        var b = el("button", "algo-challenge__opt", chapterTitle(chapter));
        b.type = "button";
        b.onclick = function () {
          if (answered) return;
          answered = true;
          var ok = chapter === p.c;
          buttons.forEach(function (x) {
            x.disabled = true;
            if (x.__chapter === p.c) x.classList.add("algo-challenge__opt--ok");
          });
          if (!ok) b.classList.add("algo-challenge__opt--no");
          record(p, ok);
          reveal(p, ok);
          refreshStat();
        };
        b.__chapter = chapter;
        buttons.push(b);
        qBox.appendChild(b);
      });
      body.appendChild(qBox);
    }

    function record(p, ok) {
      var seen = loadMap(SEEN);
      seen[key(p)] = Date.now();
      save(SEEN, seen);

      var missed = loadMap(MISSED);
      if (ok) {
        if (missed[key(p)]) {
          delete missed[key(p)];
          save(MISSED, missed);
        }
        return;
      }
      var rec = missed[key(p)] || { n: 0 };
      missed[key(p)] = { n: rec.n + 1, chapter: p.c, pkg: p.p, fn: p.f };
      save(MISSED, missed);
    }

    // reveal показывает всё, что до ответа было спрятано: тему, подсказки из
    // условия и редактор с настоящими тестами пакета.
    function reveal(p, ok) {
      var res = el("div", "algo-mixed__result");
      res.appendChild(el("div", "algo-mixed__verdict " + (ok ? "is-ok" : "is-no"),
        ok ? "✓ Да, это " + chapterTitle(p.c) : "✗ Нет. Это " + chapterTitle(p.c)));

      var link = el("a", "algo-mixed__link", "открыть главу с теорией");
      link.href = p.c + ".html";
      res.appendChild(link);

      if (p.h) {
        var hints = el("div", "algo-mixed__hints");
        hints.appendChild(el("div", "algo-mixed__label", "Что было скрыто в условии"));
        p.h.split("\n").forEach(function (h) {
          hints.appendChild(el("p", "algo-mixed__text", h));
        });
        res.appendChild(hints);
      }

      res.appendChild(el("p", "algo-mixed__solve",
        "Теперь реши её: ниже — заготовка пакета «" + p.p + "» и его настоящие тесты. " +
        "Нужная функция — " + p.f + "."));
      body.appendChild(res);

      var runner = document.createElement("div");
      runner.className = "algo-runner";
      runner.setAttribute("data-pkg", p.p);
      body.appendChild(runner);
      // runner.js инициализируется по DOMContentLoaded — виджет, созданный
      // динамически, он сам не подхватит, поэтому просит инициализацию явно.
      if (typeof window.ALGO_RUNNER_INIT === "function") window.ALGO_RUNNER_INIT();
    }
  }

  function init() {
    Array.prototype.forEach.call(
      document.querySelectorAll(".algo-mixed:not(.algo-mixed--ready)"),
      function (node) {
        node.classList.add("algo-mixed--ready");
        build(node);
      }
    );
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
