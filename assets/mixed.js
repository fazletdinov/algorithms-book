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
 * Режим собеседования (переключатель над задачей) добавляет то, чего смешанная
 * тренировка не тренирует: время, объяснение ДО кода и оценку своего решения.
 *   1) таймер на MOCK_LIMIT_MIN минут — не останавливает, но фиксирует перебор;
 *   2) после выбора шаблона — план словами (не короче PLAN_MIN символов) и EDGES_N
 *      граничных случаев (каждый не короче EDGE_MIN); редактор появляется только после них. Это единственный жёсткий гейт режима, и он
 *      намеренный: на собеседовании код без проговорённого плана — красный флаг;
 *   3) редактор гоняет ТОЛЬКО тесты этой функции (поле t банка → data-tests),
 *      открывается с чистой заготовки (data-fresh), а не с твоего решения пакета,
 *      и без подсказок и эталона (data-hints="off"); под ним — «Свой тест» (data-own-test):
 *      свой файл тестов на граничные случаи гоняется отдельно и задачу не засчитывает;
 *   4) после зелёных тестов — сложность своими словами, и только потом эталон из
 *      док-комментария (поле x банка); совпало ли — отмечаешь сам (эталоны записаны свободным
 *      текстом, «O(rows·cols)» против «O(R·C)» машинно не сравнить честно);
 *   5) итог сессии уходит в историю (algoMockLog), промах по сложности —
 *      карточкой cx:<pkg>.<fn> в движок повторений (srs.js).
 * Подсказки и ссылка на главу в этом режиме скрыты до итога: среди подсказок
 * бывает «Ожидаемая сложность: …», то есть ответ на шаг 4.
 *
 * В обычном режиме редактор открывает функцию задачи (data-func) со своим черновиком
 * (data-draft="mixed": не решение пакета из главы); единицу прогона — функция, тип или
 * пакет — выбирает runner.js, подсказки и эталон у него за кнопками. Черновик стирается
 * при выдаче новой задачи, а не при постройке редактора.
 *
 * Данные — window.ALGO_PROBLEMS (assets/problems.js, генерируется из
 * док-комментариев заготовок командой `go run ./cmd/problembank`).
 *
 * Пул — по умолчанию только пройденные главы (отметки трекера, window.ALGO_DONE из progress.js;
 * галочка «по всем главам» — общий с квизом ключ algoPracticeScope): задача входит, если её
 * глава-ответ c или одна из альтернатив a («Также решается») пройдена. Пройденных глав с задачами
 * меньше MIN_DONE — задачи нет, страница говорит, сколько их и как расширить выбор. Верным
 * вариантом показывается c, если она пройдена, иначе первая пройденная из a; засчитывается выбор
 * c или любой из a, а неверные варианты не бывают ни тем, ни другим. Собеседование берёт тот же
 * пул, только задачи со своими тестами (t) и без соседних упражнений (n): на чистой заготовке
 * тесты задачи с соседями падают на их panic("TODO").
 * Промах по выбору шаблона уходит карточкой в движок повторений (srs.js), а каждый ответ
 * оценивает карточку mix: этой задачи (ALGO_SRS.report): верно — «Помню», неверно — «Забыл».
 *
 * Задача с np: true (условие само называет приём: «алгоритм Флойда», «обход в ширину», «за O(n) без
 * памяти» на числах 1..n; список с причинами — cmd/problembank/nopick.go) в обычную смешанную не
 * попадает: вопрос «какой шаблон?» на ней проверяет, узнал ли ты слово, а это и есть вся её польза
 * здесь. Собеседование её выдаёт, но без этого шага: приём назван строкой «назван в условии» и сразу
 * идёт план — время, план словами, код и оценка сложности на такой задаче тренируются честно. Ответа
 * на «какой шаблон?» нет, поэтому нет ни промаха, ни карточки mix:, а в итоге и в истории шаблон —
 * «назван в условии» (pattern: null).
 */
(function () {
  "use strict";

  var MISSED = "algoMixedMissed"; // {"<pkg>.<fn>": {n, chapter, fn, pkg}} — источник карточек для srs.js
  var SEEN = "algoMixedSeen"; // {"<pkg>.<fn>": ts} — чтобы не выдавать одно и то же подряд
  var MOCK_LOG = "algoMockLog"; // [{k, ts, secs, limit, pattern, plan, edges, green, cx, own}] — история собеседований (pattern: null — приём назван в условии)
  var CX_MISSED = "algoMockCxMissed"; // {"<pkg>.<fn>": {n, chapter, fn, pkg}} — источник карточек cx: для srs.js
  var MIXED_DRAFT = "algoRunnerCode:mixed:"; // черновик обычного режима — ключ виджета runner'а с data-draft="mixed"
  var OPTIONS = 4;
  // Меньше трёх пройденных глав с задачами — выбирать «какой шаблон» почти не из чего: верный вариант
  // угадывается по тому, что остальные главы читатель ещё не открывал.
  var MIN_DONE = 3;
  var MOCK_LIMIT_MIN = 35;
  var PLAN_MIN = 80;
  var EDGES_N = 3; // граничных случаев до кода
  var EDGE_MIN = 3; // символов в каждом: «n=0» — уже случай
  var LOG_MAX = 100;

  function loadMap(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || "{}") || {};
    } catch (e) {
      return {};
    }
  }
  function loadList(key) {
    try {
      var v = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(v) ? v : [];
    } catch (e) {
      return [];
    }
  }
  function save(key, obj) {
    try {
      localStorage.setItem(key, JSON.stringify(obj));
    } catch (e) {
      /* приватный режим */
    }
  }
  function drop(key) {
    try {
      localStorage.removeItem(key);
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

  function shuffle(a, rnd) {
    rnd = rnd || Math.random;
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function mmss(secs) {
    var m = Math.floor(secs / 60);
    var s = Math.floor(secs % 60);
    return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
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

  // isType — задача на проектирование класса: f — имя типа, m — его конструктор и методы.
  function isType(p) { return !!(p.m && p.m.length); }

  function key(p) {
    return p.p + "." + p.f;
  }

  // Шаблоны, которые путают по условию. Неверные варианты берутся сначала отсюда:
  // отличить окно от префиксных сумм — это и есть навык, а случайная глава
  // («теория чисел» против задачи на подмассив) отсеивается сама и ничему не учит.
  // Польза чередования растёт именно со сходством категорий (мета-анализ Brunmair &
  // Richter, 2019). Имена — слаги глав; опечатку ловит mixed-check.
  var CONFUSABLE = [
    ["sliding-window", "prefix-sums", "two-pointers", "monotonic-stack"],
    ["two-pointers", "modified-binary-search", "sorting", "cyclic-sort"],
    ["top-k-elements", "two-heaps", "k-way-merge", "sorting"],
    ["graphs", "topological-sort", "graph-connectivity", "grids-and-shortest-paths", "advanced-graph-algorithms", "max-flow"],
    ["tree-bfs", "tree-dfs", "graphs", "recursion"],
    ["backtracking", "subsets", "combinatorics", "dynamic-programming", "complexity-classes"],
    ["greedy", "dynamic-programming", "merge-intervals", "complexity-classes"],
    ["fast-slow-pointers", "reverse-linked-list", "linked-list-structure", "hash-table-structure"],
    ["number-theory", "cryptography", "bit-manipulation", "combinatorics", "probability"],
    ["string-algorithms", "aho-corasick", "sliding-window"],
    ["fenwick-tree", "prefix-sums"],
    ["hash-table-structure", "two-pointers", "prefix-sums", "sorting"],
  ];
  window.ALGO_CONFUSABLE = CONFUSABLE; // для mixed-check: имена групп — настоящие главы
  // Соседей — не больше двух: один вариант остаётся случайным. Три соседа сразу
  // превращают вопрос в экзамен на тонкие различия, и чаще попадался бы шаблон,
  // которым задача тоже решается (окно фиксированного размера — и префиксами).
  var NEAR = 2;

  // answers — главы, чей ответ верен: глава-ответ c и альтернативы a («Также решается»).
  function answers(p) {
    return [p.c].concat(Array.isArray(p.a) ? p.a : []);
  }
  // done — { слаг: true } пройденных глав; null — режим «по всем главам», пройдено всё.
  function isDone(done, chapter) {
    return !done || !!done[chapter];
  }
  // pairFor — ряд таблицы путаемых пар (assets/pairs.js) для промаха: верный приём задачи p (c или одна из a) —
  // use, выбранный — not. Только точное направление; задача в notFor ряда (ряд противоречил бы её условию),
  // ряда нет или реестр не загрузился — null.
  function pairFor(p, picked) {
    var rows = window.ALGO_PAIRS || [];
    var right = answers(p);
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].not !== picked || right.indexOf(rows[i].use) < 0) continue;
      if ((rows[i].notFor || []).indexOf(key(p)) >= 0) continue;
      return rows[i];
    }
    return null;
  }
  function inScope(p, done) {
    return answers(p).some(function (c) { return isDone(done, c); });
  }

  // choices — варианты ответа на задачу p: { shown, options }. shown — верный вариант на экране: c, если
  // она пройдена, иначе первая пройденная из a. Три неверных — темы ДРУГИХ задач банка, поэтому варианты
  // всегда правдоподобны и не требуют ручного ведения списка; ни одна не c и не из a. Порядок выбора:
  // пройденные соседи shown из путаемых групп (не больше NEAR), затем прочие пройденные, затем любые —
  // вариант из главы, которую читатель ещё не открывал, угадывается как «точно не то».
  function choices(p, problems, done, rnd) {
    var right = answers(p);
    var shown = isDone(done, p.c) ? p.c : right.filter(function (c) { return isDone(done, c); })[0] || p.c;
    var others = {};
    problems.forEach(function (q) {
      if (right.indexOf(q.c) < 0) others[q.c] = true;
    });
    var near = {};
    CONFUSABLE.forEach(function (group) {
      if (group.indexOf(shown) < 0) return;
      group.forEach(function (c) { if (others[c] && isDone(done, c)) near[c] = true; });
    });
    var picked = shuffle(Object.keys(near), rnd).slice(0, NEAR);
    var rest = Object.keys(others).filter(function (c) { return picked.indexOf(c) < 0; });
    var doneRest = shuffle(rest.filter(function (c) { return isDone(done, c); }), rnd);
    var anyRest = shuffle(rest.filter(function (c) { return !isDone(done, c); }), rnd);
    var wrong = picked.concat(doneRest, anyRest).slice(0, OPTIONS - 1);
    return { shown: shown, options: shuffle(wrong.concat([shown]), rnd) };
  }

  // scopeOf — что выдавать сейчас: done (null — по всем главам), пул задач base в этом режиме и сколько
  // пройденных глав вообще отвечают на задачи base (по ним решается, хватает ли выбора). Отметки — по
  // свежему чтению: главу могли отметить в другой вкладке.
  function scopeOf(base) {
    var api = typeof window.ALGO_DONE === "function" ? window.ALGO_DONE : null;
    var done = !api || api.scope() === "all" ? null : api();
    var pool = base.filter(function (p) { return inScope(p, done); });
    var chapters = {};
    if (done) {
      base.forEach(function (p) {
        answers(p).forEach(function (c) { if (done[c]) chapters[c] = true; });
      });
    }
    var count = Object.keys(chapters).length;
    return { api: api, done: done, pool: pool, chapters: count, short: !!done && count < MIN_DONE };
  }
  // servable — выдаёт ли режим задачу p: обычная смешанная — любую без np, собеседование — только со
  // своими тестами (t) и без соседних упражнений (n), а np ему не помеха (шаг «какой шаблон?» пропускается).
  function servable(p, mock) {
    if (mock) return !!(p.t && p.t.length) && !(p.n && p.n.length);
    return !p.np;
  }
  window.ALGO_MIXED = { choices: choices, answers: answers, servable: servable };

  // Карточка промаха по сложности (cx:) заводится сразу, со сроком на начало завтрашних суток (srs.js,
  // missDue). Карточку mix: оценивает сам ответ на «какой шаблон?» (record).
  function syncSRS() {
    if (window.ALGO_SRS) window.ALGO_SRS.sync();
  }

  // race — тесты пакета с -race, как у его виджета в главе: список один, у движка повторений (srs.js,
  // ALGO_SRS.racePkgs); без детектора гоночное решение зеленело бы и здесь.
  function race(node, pkg) {
    var list = (window.ALGO_SRS && window.ALGO_SRS.racePkgs) || [];
    if (list.indexOf(pkg) >= 0) node.setAttribute("data-race", "true");
  }

  function build(root) {
    var problems = window.ALGO_PROBLEMS || [];
    root.innerHTML = "";

    if (!problems.length) {
      root.appendChild(el("p", "algo-mixed__empty",
        "Банк задач не загрузился (assets/problems.js). Собери книгу заново: mdbook build."));
      return;
    }
    // В собеседовании гоняются только тесты самой функции на чистой заготовке: задачу без своих тестов
    // проверить нечем, а тесты задачи с соседними упражнениями (n) упадут на их panic("TODO").
    var mockable = problems.filter(function (p) { return servable(p, true); });
    // Обычной смешанной — всё, кроме задач, чьё условие само называет приём (np).
    var pickable = problems.filter(function (p) { return servable(p, false); });

    var lastKey = null;
    var lastPkg = null;
    var mock = false;
    var session = null; // текущее собеседование: {p, start, timer, pattern, picked, plan, green, cx}

    // Режим выдачи: «только пройденные главы» (по умолчанию) или «по всем главам» — общий с квизом.
    // Без progress.js выбора нет: пул — весь банк.
    var scope = el("div", "algo-scope");
    var scopeText = el("span", "algo-scope__text", "");
    var scopeLabel = el("label", "algo-scope__label");
    var scopeBox = document.createElement("input");
    scopeBox.type = "checkbox";
    scopeBox.className = "algo-scope__box";
    scopeLabel.appendChild(scopeBox);
    scopeLabel.appendChild(document.createTextNode(" по всем главам"));
    scope.appendChild(scopeText);
    scope.appendChild(scopeLabel);
    if (typeof window.ALGO_DONE === "function") root.appendChild(scope);

    var head = el("div", "algo-mixed__head");
    var nextBtn = el("button", "algo-quiz__btn algo-mixed__next", "Дать задачу");
    nextBtn.type = "button";
    head.appendChild(nextBtn);

    var modeLabel = el("label", "algo-mixed__mode");
    var modeBox = document.createElement("input");
    modeBox.type = "checkbox";
    modeBox.className = "algo-mixed__mode-box";
    modeLabel.appendChild(modeBox);
    modeLabel.appendChild(el("span", null, " 🎙 Режим собеседования"));
    head.appendChild(modeLabel);

    var stat = el("span", "algo-mixed__stat", "");
    head.appendChild(stat);
    root.appendChild(head);

    var mockStat = el("div", "algo-mixed__mockstat", "");
    mockStat.hidden = true;
    root.appendChild(mockStat);

    var body = el("div", "algo-mixed__body");
    root.appendChild(body);

    refreshStat();
    showScope();
    function refreshStat() {
      var missed = Object.keys(loadMap(MISSED)).length;
      var seen = Object.keys(loadMap(SEEN)).length;
      var st = scopeOf(mock ? mockable : pickable);
      stat.textContent = (st.done ? "задач по пройденным главам: " + st.pool.length + " из " + problems.length : "в банке " + problems.length + " задач") +
        " · показано " + seen + (missed ? " · шаблон не угадан у " + missed : "");

      var log = loadList(MOCK_LOG);
      if (!log.length) {
        mockStat.textContent = "Собеседований ещё не было. Лимит — " + MOCK_LIMIT_MIN +
          " минут на задачу: условие → шаблон → план словами → код → сложность.";
        return;
      }
      var inTime = 0, green = 0, cxOk = 0, cxAll = 0;
      log.forEach(function (r) {
        if (r.green && r.secs <= r.limit * 60) inTime++;
        if (r.green) green++;
        if (r.cx === "ok" || r.cx === "miss") cxAll++;
        if (r.cx === "ok") cxOk++;
      });
      mockStat.textContent = "Собеседований: " + log.length +
        " · тесты зелёные: " + green +
        " · решено в срок: " + inTime +
        " · сложность оценена верно: " + cxOk + " из " + cxAll;
    }

    function stopSession() {
      if (session && session.timer) clearInterval(session.timer);
      session = null;
    }

    // showScope — подпись режима и, если задач в нём не хватает, объяснение вместо задачи: пустой экран
    // после «Дать задачу» выглядел бы поломкой. Зовётся при сборке, смене режима выдачи и собеседования.
    function showScope() {
      var st = scopeOf(mock ? mockable : pickable);
      scopeBox.checked = !st.done;
      scopeText.textContent = st.done
        ? "Задачи только по пройденным главам (с задачами в банке: " + st.chapters + ")."
        : "Задачи по всем главам.";
      nextBtn.disabled = st.short;
      if (st.short) shortScope(st);
      return st;
    }

    // shortScope — «только пройденные», а глав с задачами меньше MIN_DONE (или хранилище не читается).
    function shortScope(st) {
      body.innerHTML = "";
      body.appendChild(el("p", "algo-mixed__empty", st.api.readable()
        ? "Смешанная берёт задачи только из глав, отмеченных пройденными, а пройдено глав с задачами в банке: " + st.chapters +
          ". Нужно хотя бы " + MIN_DONE + " — иначе выбирать шаблон почти не из чего. Отметь главу галочкой «Глава пройдена» в её конце " +
          "(или в трекере на странице шпаргалки) — или поставь «по всем главам» выше."
        : "Хранилище браузера недоступно, поэтому отметки пройденных глав не прочитать. Поставь «по всем главам» выше: " +
          "выбор продержится, пока открыта эта страница."));
    }

    scopeBox.onchange = function () {
      window.ALGO_DONE.setScope(scopeBox.checked ? "all" : "done");
      stopSession();
      body.innerHTML = "";
      nextBtn.textContent = "Дать задачу";
      lastKey = null;
      showScope();
      refreshStat();
    };

    modeBox.onchange = function () {
      mock = modeBox.checked;
      stopSession();
      body.innerHTML = "";
      mockStat.hidden = !mock;
      nextBtn.textContent = "Дать задачу";
      lastKey = null;
      showScope();
      refreshStat();
    };

    nextBtn.onclick = function () {
      stopSession();
      // отметки — свежие: главу могли отметить в другой вкладке, пока эта была открыта
      var st = showScope();
      if (st.short) return;
      var p = pick(st.pool, lastKey);
      // Черновик обычного режима живёт, пока задача на экране: новая задача стирает и черновик
      // прошлой (он уже мусор), и прежний черновик своего пакета — она начинается с чистой заготовки.
      if (lastPkg) drop(MIXED_DRAFT + lastPkg);
      drop(MIXED_DRAFT + p.p);
      lastKey = key(p);
      lastPkg = p.p;
      render(p, st.done);
      nextBtn.textContent = "Следующая задача";
      refreshStat();
    };

    function render(p, done) {
      body.innerHTML = "";

      if (mock) startSession(p);

      var card = el("div", "algo-mixed__card");
      card.appendChild(el("div", "algo-mixed__label", "Условие"));
      p.s.split("\n").forEach(function (para) {
        card.appendChild(el("p", "algo-mixed__text", para));
      });
      body.appendChild(card);

      // Условие само называет приём: в собеседовании вопрос «какой шаблон?» пропускается (в обычный
      // пул такая задача не попадает вовсе — pickable).
      if (mock && p.np) {
        markSeen(p);
        mockPlan(p, null, isDone(done, p.c) ? p.c : answers(p).filter(function (c) { return isDone(done, c); })[0] || p.c, null);
        refreshStat();
        return;
      }

      var qBox = el("div", "algo-mixed__q");
      qBox.appendChild(el("div", "algo-mixed__label", "Каким шаблоном это решается?"));
      var pickOf = choices(p, problems, done);
      var right = answers(p);
      var answered = false;
      var buttons = [];

      pickOf.options.forEach(function (chapter) {
        var b = el("button", "algo-challenge__opt", chapterTitle(chapter));
        b.type = "button";
        b.onclick = function () {
          if (answered) return;
          answered = true;
          // верен выбор главы-ответа и любой альтернативы; на экране из них ровно одна — pickOf.shown
          var ok = right.indexOf(chapter) >= 0;
          buttons.forEach(function (x) {
            x.disabled = true;
            if (right.indexOf(x.__chapter) >= 0) x.classList.add("algo-challenge__opt--ok");
          });
          if (!ok) b.classList.add("algo-challenge__opt--no");
          record(p, ok);
          var named = ok ? chapter : pickOf.shown;
          if (mock) mockPlan(p, ok, named, chapter);
          else reveal(p, ok, named, chapter);
          refreshStat();
        };
        b.__chapter = chapter;
        buttons.push(b);
        qBox.appendChild(b);
      });
      body.appendChild(qBox);
    }

    function markSeen(p) {
      var seen = loadMap(SEEN);
      seen[key(p)] = Date.now();
      save(SEEN, seen);
    }

    function record(p, ok) {
      markSeen(p);

      var missed = loadMap(MISSED);
      if (ok) {
        if (missed[key(p)]) {
          delete missed[key(p)];
          save(MISSED, missed);
        }
      } else {
        var rec = missed[key(p)] || { n: 0 };
        missed[key(p)] = { n: rec.n + 1, chapter: p.c, pkg: p.p, fn: p.f };
        save(MISSED, missed);
      }
      // Ответ — исход карточки mix: этой задачи: верно — «Помню», неверно — «Забыл». После записи промаха:
      // новую карточку заводит sync внутри report (на начало завтрашних суток, без оценки); та же задача,
      // снова выпавшая в тот же день, получит early. Нет карточки и ответ верный — report ничего не делает.
      if (window.ALGO_SRS && window.ALGO_SRS.report) window.ALGO_SRS.report("mix:" + key(p), ok ? "good" : "again");
    }

    // verdictText — вердикт и альтернативы: named — глава, которую он называет (выбранная верная или
    // показанная верная), остальные из c и a идут как «также решается».
    function verdictText(p, ok, named, yes, no) {
      var also = answers(p).filter(function (c) { return c !== named; }).map(chapterTitle);
      return (ok ? yes : no) + chapterTitle(named) + (also.length ? " — также решается: " + also.join(", ") : "");
    }
    // namedText — вердикт задачи, чьё условие само называет приём (np): шага «какой шаблон?» не было.
    function namedText(p, named) {
      return verdictText(p, true, named, "Приём назван в самом условии — шаг «какой шаблон?» пропущен: ", "");
    }

    // signLine — признак g под вердиктом после неверного ответа: «по чему это было видно» стоит раньше
    // подсказок, которые называют уже сам способ.
    function signLine(p, into) {
      if (!p.g) return;
      into.appendChild(el("p", "algo-mixed__sign", "Как это было узнать: " + p.g));
    }

    // pairLine — после промаха: чем верный приём отличается от выбранного соседа (ряд таблицы пар). Ряд —
    // о главах, а не о задаче, поэтому и строка — сравнение приёмов, а не «здесь обязано быть верно».
    // Ряда нет — ничего: CONFUSABLE даёт неверные варианты, но объяснение есть не у каждой пары.
    function pairLine(p, picked, into) {
      var row = pairFor(p, picked);
      if (!row) return;
      into.appendChild(el("p", "algo-mixed__pair",
        "Как отличать эти приёмы: если " + row.must + " — " + chapterTitle(row.use) +
        ", а не «" + chapterTitle(row.not) + "»: " + row.why + "."));
    }

    // hintsBlock — всё, что было скрыто в условии, и ссылка на главу. withSign — признак g первой строкой
    // подсказок (после неверного ответа он уже стоит под вердиктом).
    function hintsBlock(p, into, withSign) {
      var link = el("a", "algo-mixed__link", "открыть главу с теорией");
      link.href = p.c + ".html";
      into.appendChild(link);

      var lines = (withSign && p.g ? ["Признак: " + p.g] : []).concat(p.h ? p.h.split("\n") : []);
      if (lines.length) {
        var hints = el("div", "algo-mixed__hints");
        hints.appendChild(el("div", "algo-mixed__label", "Что было скрыто в условии"));
        lines.forEach(function (h) {
          hints.appendChild(el("p", "algo-mixed__text", h));
        });
        into.appendChild(hints);
      }
    }

    // reveal показывает всё, что до ответа было спрятано: тему, подсказки из
    // условия и редактор с настоящими тестами пакета.
    function reveal(p, ok, named, picked) {
      var res = el("div", "algo-mixed__result");
      res.appendChild(el("div", "algo-mixed__verdict " + (ok ? "is-ok" : "is-no"),
        verdictText(p, ok, named, "✓ Да, это ", "✗ Нет. Это ")));
      if (!ok) {
        signLine(p, res);
        pairLine(p, picked, res);
      }
      hintsBlock(p, res, ok);

      res.appendChild(el("p", "algo-mixed__solve",
        "Теперь реши её: ниже — заготовка пакета «" + p.p + "» без подсказок и его настоящие тесты. " +
        (isType(p)
          ? "Нужен тип " + p.f + " целиком — " + p.m.join(", ") + ": «Прогнать тесты» гоняет тесты типа, "
          : "Нужная функция — " + p.f + ": «Прогнать тесты» гоняет её тесты (у функции без своих тестов — тесты типа или весь пакет), ") +
        "подсказки и эталон — за кнопками под редактором."));
      body.appendChild(res);

      var runner = document.createElement("div");
      runner.className = "algo-runner";
      runner.setAttribute("data-pkg", p.p);
      runner.setAttribute("data-func", p.f);
      // Свой черновик: решение пакета из главы не подсовывается готовым ответом и не затирается.
      runner.setAttribute("data-draft", "mixed");
      race(runner, p.p);
      body.appendChild(runner);
      // runner.js инициализируется по DOMContentLoaded — виджет, созданный
      // динамически, он сам не подхватит, поэтому просит инициализацию явно.
      if (typeof window.ALGO_RUNNER_INIT === "function") window.ALGO_RUNNER_INIT();
    }

    // ---------------- режим собеседования ----------------

    function elapsed() {
      return session ? (Date.now() - session.start) / 1000 : 0;
    }

    function startSession(p) {
      // Черновик прошлого собеседования по этому пакету — не подсказка, а мусор:
      // каждая сессия начинается с чистой заготовки.
      drop("algoRunnerCode:mock:" + p.p);

      var bar = el("div", "algo-mixed__timer");
      var clock = el("span", "algo-mixed__clock", "⏱ 00:00 / " + mmss(MOCK_LIMIT_MIN * 60));
      bar.appendChild(clock);
      bar.appendChild(el("span", "algo-mixed__steps",
        "условие → шаблон → план словами → код → сложность"));
      body.appendChild(bar);

      session = { p: p, start: Date.now(), clock: clock, pattern: null, plan: 0, green: null, cx: null, done: false };
      session.timer = setInterval(tick, 1000);
    }

    function tick() {
      if (!session) return;
      var s = elapsed();
      session.clock.textContent = "⏱ " + mmss(s) + " / " + mmss(MOCK_LIMIT_MIN * 60);
      session.clock.classList.toggle("is-over", s > MOCK_LIMIT_MIN * 60);
    }

    // mockPlan — шаг после шаблона: план словами. Тему называем (продолжать с
    // неверным приёмом — потерянная сессия), но ни подсказок, ни главы. Строка пары после промаха — тоже
    // только в итоге: в рядах бывает сложность приёма («куча размера k — O(n log k)»), а её режим спрашивает.
    // ok === null — задача np: приём назван в условии, шага выбора не было.
    function mockPlan(p, ok, named, picked) {
      if (!session) return;
      session.pattern = ok;
      session.picked = ok ? null : picked;

      var res = el("div", "algo-mixed__result algo-mixed__mock");
      res.appendChild(ok === null
        ? el("div", "algo-mixed__verdict algo-mixed__verdict--named", namedText(p, named))
        : el("div", "algo-mixed__verdict " + (ok ? "is-ok" : "is-no"),
          verdictText(p, ok, named, "✓ Шаблон угадан: ", "✗ Шаблон не угадан. Это ")));

      var planBox = el("div", "algo-mixed__plan");
      planBox.appendChild(el("div", "algo-mixed__label", "План — как сказал бы вслух интервьюеру"));
      planBox.appendChild(el("p", "algo-mixed__text",
        "Идея, какая структура данных и почему, что держишь инвариантом. " +
        "Код появится после плана и трёх граничных случаев."));
      var ta = document.createElement("textarea");
      ta.className = "algo-mixed__plan-text";
      ta.rows = 5;
      planBox.appendChild(ta);
      // Граничные случаи — отдельно от плана: в общем тексте их легко пропустить, а на собеседовании
      // «а если массив пустой?» спрашивают первым. Машина их не проверяет — в итоге они стоят рядом с
      // тем, что получилось, и сверяешь ты сам.
      planBox.appendChild(el("div", "algo-mixed__label", "Три граничных случая, на которых решение легко сломать"));
      var edges = [];
      for (var i = 0; i < EDGES_N; i++) {
        var e = document.createElement("input");
        e.type = "text";
        e.className = "algo-mixed__edge";
        e.placeholder = ["например: пустой вход", "например: все элементы равны", "например: ответ на самой границе"][i];
        planBox.appendChild(e);
        edges.push(e);
      }
      var planBar = el("div", "algo-mixed__planbar");
      var counter = el("span", "algo-mixed__counter", "0 / " + PLAN_MIN);
      var go = el("button", "algo-quiz__btn algo-mixed__to-code", "К коду →");
      go.type = "button";
      go.disabled = true;
      planBar.appendChild(counter);
      planBar.appendChild(go);
      planBox.appendChild(planBar);
      res.appendChild(planBox);
      body.appendChild(res);

      function edgesFilled() {
        return edges.every(function (e) { return e.value.trim().length >= EDGE_MIN; });
      }
      function refresh() {
        var n = ta.value.trim().length;
        counter.textContent = n + " / " + PLAN_MIN;
        go.disabled = n < PLAN_MIN || !edgesFilled();
      }
      ta.addEventListener("input", refresh);
      edges.forEach(function (e) { e.addEventListener("input", refresh); });
      go.onclick = function () {
        // Длину проверяем здесь, а не только через disabled: флаг кнопки — это
        // подсказка интерфейсу, а гейт должен держаться сам по себе.
        if (!session || ta.value.trim().length < PLAN_MIN || !edgesFilled()) return;
        session.plan = ta.value.trim().length;
        session.edges = edges.map(function (e) { e.readOnly = true; return e.value.trim(); });
        ta.readOnly = true;
        go.hidden = true;
        counter.textContent = "план записан за " + mmss(elapsed());
        mockEditor(p, res);
      };
    }

    function mockEditor(p, res) {
      res.appendChild(el("p", "algo-mixed__solve",
        (isType(p)
          ? "Спроектируй и напиши тип " + p.f + " в пакете «" + p.p + "»: " + p.m.join(", ") + ". Гоняются только тесты типа ("
          : "Реши " + p.f + " в пакете «" + p.p + "». Гоняются только её тесты (") + p.t.join(", ") +
        "); соседние упражнения пакета им не нужны."));

      var runner = document.createElement("div");
      runner.className = "algo-runner";
      runner.setAttribute("data-pkg", p.p);
      runner.setAttribute("data-tests", JSON.stringify(p.t));
      runner.setAttribute("data-fresh", "true");
      race(runner, p.p);
      // Имя функции — для события прогона и строки «тесты зовут ещё не решённые упражнения»; подсказок
      // и эталона в собеседовании нет: среди подсказок — «Ожидаемая сложность», ответ на шаг 4.
      runner.setAttribute("data-func", p.f);
      runner.setAttribute("data-hints", "off");
      // Свой тест на граничные случаи из плана: гоняется отдельно и задачу не засчитывает (algo-runner:own).
      runner.setAttribute("data-own-test", "on");
      runner.setAttribute("data-own-cases", JSON.stringify(session.edges || []));
      runner.addEventListener("algo-runner:own", function (e) {
        var d = e.detail || {};
        if (!session || session.done) return;
        session.own = { runs: ((session.own || {}).runs || 0) + 1, ok: !!d.ok, n: (d.tests || []).length };
      });
      res.appendChild(runner);

      var giveUp = el("button", "algo-quiz__btn algo-mixed__giveup", "Завершить без решения");
      giveUp.type = "button";
      res.appendChild(giveUp);
      giveUp.onclick = function () {
        if (!session || session.done) return;
        session.green = null;
        giveUp.hidden = true;
        finish(p, res);
      };

      runner.addEventListener("algo-runner:result", function (e) {
        var d = e.detail || {};
        if (!session || session.done || session.green != null || !d.ok) return;
        session.green = elapsed();
        giveUp.hidden = true;
        mockComplexity(p, res);
      });

      if (typeof window.ALGO_RUNNER_INIT === "function") window.ALGO_RUNNER_INIT();
    }

    // mockComplexity — после зелёных тестов: сначала своя оценка, потом эталон.
    function mockComplexity(p, res) {
      var box = el("div", "algo-mixed__cx");
      box.appendChild(el("div", "algo-mixed__label",
        "✓ Тесты зелёные за " + mmss(session.green) + ". Какая сложность у ТВОЕГО решения — по времени и по памяти?"));
      var input = document.createElement("input");
      input.type = "text";
      input.className = "algo-mixed__cx-input";
      input.placeholder = "например: O(n) по времени, O(1) по памяти";
      box.appendChild(input);
      var check = el("button", "algo-quiz__btn algo-mixed__cx-check", "Сверить с эталоном");
      check.type = "button";
      check.disabled = true;
      box.appendChild(check);
      res.appendChild(box);

      input.addEventListener("input", function () {
        check.disabled = input.value.trim().length < 3;
      });
      check.onclick = function () {
        if (check.disabled || !session) return;
        input.readOnly = true;
        check.hidden = true;
        session.cxAnswer = input.value.trim();
        // Эталон — поле x банка (абзац «Ожидаемая сложность» заготовки, его выделяет генератор).
        // У части задач его нет — тогда сверять не с чем, и режим так и говорит.
        var ref = p.x || "";
        if (!ref) {
          box.appendChild(el("p", "algo-mixed__text",
            "Эталонной оценки у этой задачи в условии нет — сверься с главой после итога."));
          session.cx = "none";
          finish(p, res);
          return;
        }
        box.appendChild(el("p", "algo-mixed__cx-ref", "Эталон: " + ref));
        box.appendChild(el("p", "algo-mixed__text",
          "Совпадает по сути — не по записи? «O(R·C)» и «O(rows · cols)» — одно и то же."));
        var yes = el("button", "algo-challenge__opt algo-mixed__cx-yes", "✓ Совпало");
        var no = el("button", "algo-challenge__opt algo-mixed__cx-no", "✗ Не совпало");
        yes.type = no.type = "button";
        box.appendChild(yes);
        box.appendChild(no);
        function grade(ok) {
          if (!session || session.done) return;
          yes.disabled = no.disabled = true;
          (ok ? yes : no).classList.add(ok ? "algo-challenge__opt--ok" : "algo-challenge__opt--no");
          session.cx = ok ? "ok" : "miss";
          finish(p, res);
        }
        yes.onclick = function () { grade(true); };
        no.onclick = function () { grade(false); };
      };
    }

    // finish — итог сессии: сводка, история, промах по сложности в повторения,
    // и только теперь — подсказки и глава.
    function finish(p, res) {
      if (!session || session.done) return;
      session.done = true;
      clearInterval(session.timer);
      var secs = Math.round(elapsed());
      var limit = MOCK_LIMIT_MIN * 60;

      var sum = el("div", "algo-mixed__summary");
      sum.appendChild(el("div", "algo-mixed__label", "Итог собеседования"));
      var rows = [
        ["Время", mmss(secs) + " из " + mmss(limit) + (secs <= limit ? " — в срок" : " — перебор")],
        ["Шаблон", session.pattern === null ? "назван в условии" : session.pattern ? "угадан" : "не угадан"],
        ["План словами", session.plan + " символов"],
        ["Граничные случаи", (session.edges || []).join(" · ") || "—"],
        ["Тесты", session.green != null ? "зелёные за " + mmss(session.green) : "не доведены"],
        ["Свой тест", !session.own ? "не писал" : (session.own.ok ? "зелёный" : "красный") + " (тестов " + session.own.n +
          ", прогонов " + session.own.runs + ")"],
        ["Сложность", session.cx === "ok" ? "оценена верно" : session.cx === "miss" ? "оценена неверно" :
          session.cx === "none" ? "эталона нет" : "не оценивалась"],
      ];
      var table = el("table", "algo-mixed__summary-table");
      rows.forEach(function (r) {
        var tr = document.createElement("tr");
        tr.appendChild(el("td", null, r[0]));
        tr.appendChild(el("td", null, r[1]));
        table.appendChild(tr);
      });
      sum.appendChild(table);
      if (session.edges && session.edges.length) {
        sum.appendChild(el("p", "algo-mixed__text",
          "Сверь граничные случаи со своим кодом: на каждый ответь, что вернёт функция и почему. " +
          "Случай, которого нет в тестах (" + p.t.join(", ") + "), — тот, что спросил бы интервьюер."));
      }
      if (session.picked) pairLine(p, session.picked, sum);
      hintsBlock(p, sum, true);
      res.appendChild(sum);

      var log = loadList(MOCK_LOG);
      log.push({
        k: key(p), ts: Date.now(), secs: secs, limit: MOCK_LIMIT_MIN,
        pattern: session.pattern === null ? null : !!session.pattern, plan: session.plan, edges: (session.edges || []).length,
        green: session.green != null, cx: session.cx, own: session.own ? (session.own.ok ? "ok" : "fail") : "",
      });
      save(MOCK_LOG, log.slice(-LOG_MAX));

      // Промах по сложности — отдельный вид карточки: шаблон ты мог узнать
      // верно, а стоимость своего кода — нет. Верная оценка снимает промах.
      var cxMissed = loadMap(CX_MISSED);
      if (session.cx === "miss") {
        var rec = cxMissed[key(p)] || { n: 0 };
        cxMissed[key(p)] = { n: rec.n + 1, chapter: p.c, pkg: p.p, fn: p.f };
        save(CX_MISSED, cxMissed);
        syncSRS();
      } else if (session.cx === "ok" && cxMissed[key(p)]) {
        delete cxMissed[key(p)];
        save(CX_MISSED, cxMissed);
      }
      refreshStat();
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
