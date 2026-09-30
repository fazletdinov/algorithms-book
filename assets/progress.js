/*
 * progress.js — личный трекер прогресса по главам (сохраняется в localStorage).
 * Контейнер: <div class="algo-progress"></div>
 */
(function () {
  "use strict";

  // Список глав ведётся вручную, но НЕ на честном слове: scripts/check-registries.js
  // (запускается в CI) сверяет его с src/SUMMARY.md и падает, если в книге появилась
  // глава, которой тут нет. Иначе «100%» в трекере переставало бы значить
  // «прочитал всю книгу» — а именно это с ним однажды и случилось.
  // Порядок и разбивка по группам повторяют оглавление книги.
  //
  // Поле lvl — МАРШРУТ, а не оценка важности главы:
  //   core — ядро: 23 главы, скелет курса, читается подряд. Только оно идёт в процент;
  //   ext  — расширение: широко полезно, но после ядра;
  //   ref  — справочник: открыть, когда встретишь в жизни или захочешь полноты
  //          (AVL/RB-деревья, потоки, теория чисел — их не пишут руками на работе);
  //   tool — не глава, а инструмент (квиз, шпаргалка): нигде не считается.
  // Смысл в том, что 60 глав в оглавлении выглядят одинаково обязательными, и от
  // этого курс бросают. Ядра — двадцать три главы, и это видно.
  var GROUPS = [
    { g: "Ориентиры", items: [
      { t: "Руководство по выбору шаблона", h: "pattern-selection-guide.html", lvl: "tool" },
      { t: "Шпаргалка", h: "cheatsheet.html", lvl: "tool" },
      { t: "Тренажёр распознавания (квиз)", h: "quiz.html", lvl: "tool" }
    ] },
    { g: "Группа 1: Фундамент", items: [
      { t: "Big-O и амортизированный анализ", h: "big-o.html", lvl: "core" },
      { t: "Рекурсия и мастер-теорема", h: "recursion.html", lvl: "core" },
      { t: "Инварианты и индукция", h: "invariants.html", lvl: "core" },
      { t: "Хеш-таблица: устройство", h: "hash-table-structure.html", lvl: "core" },
      { t: "Связный список: устройство", h: "linked-list-structure.html", lvl: "core" },
      { t: "Дек: устройство", h: "deque-structure.html", lvl: "ext" },
      { t: "Сортировки и порядковые статистики", h: "sorting.html", lvl: "core" }
    ] },
    { g: "Группа 2: Базовые паттерны", items: [
      { t: "Скользящее окно", h: "sliding-window.html", lvl: "core" },
      { t: "Префиксные суммы", h: "prefix-sums.html", lvl: "core" },
      { t: "Два указателя", h: "two-pointers.html", lvl: "core" },
      { t: "Монотонный стек", h: "monotonic-stack.html", lvl: "core" },
      { t: "Быстрый и медленный указатели", h: "fast-slow-pointers.html", lvl: "core" },
      { t: "Reverse Linked List", h: "reverse-linked-list.html", lvl: "ext" },
      { t: "Слияние интервалов", h: "merge-intervals.html", lvl: "core" },
      { t: "Cyclic Sort", h: "cyclic-sort.html", lvl: "ext" },
      { t: "Бинарный поиск", h: "modified-binary-search.html", lvl: "core" },
      { t: "Bit Manipulation", h: "bit-manipulation.html", lvl: "ext" }
    ] },
    { g: "Группа 3: Деревья и кучи", items: [
      { t: "BST: устройство", h: "bst-structure.html", lvl: "core" },
      { t: "AVL-дерево: балансировка", h: "avl-tree-structure.html", lvl: "ref" },
      { t: "Красно-чёрное дерево", h: "red-black-tree-structure.html", lvl: "ref" },
      { t: "Обход дерева в ширину", h: "tree-bfs.html", lvl: "core" },
      { t: "Обход дерева в глубину", h: "tree-dfs.html", lvl: "core" },
      { t: "Куча: устройство", h: "heap-structure.html", lvl: "core" },
      { t: "Two Heaps", h: "two-heaps.html", lvl: "ext" },
      { t: "Топ K элементов", h: "top-k-elements.html", lvl: "core" },
      { t: "K-way Merge", h: "k-way-merge.html", lvl: "ext" }
    ] },
    { g: "Группа 4: Комбинаторика и графы", items: [
      { t: "Subsets", h: "subsets.html", lvl: "ext" },
      { t: "Поиск с возвратом", h: "backtracking.html", lvl: "core" },
      { t: "Обход графов", h: "graphs.html", lvl: "core" },
      { t: "Union-Find (DSU): устройство", h: "union-find-structure.html", lvl: "ext" },
      { t: "Топологическая сортировка", h: "topological-sort.html", lvl: "core" },
      { t: "Сетки и кратчайшие пути", h: "grids-and-shortest-paths.html", lvl: "ext" },
      { t: "Графы: продвинутые", h: "advanced-graph-algorithms.html", lvl: "ref" },
      { t: "Графы: связность (SCC, мосты)", h: "graph-connectivity.html", lvl: "ref" },
      { t: "Потоки в сетях", h: "max-flow.html", lvl: "ref" }
    ] },
    { g: "Группа 5: Оптимизация и границы", items: [
      { t: "Жадные алгоритмы", h: "greedy.html", lvl: "core" },
      { t: "Динамическое программирование", h: "dynamic-programming.html", lvl: "core" },
      { t: "Классы сложности: P и NP", h: "complexity-classes.html", lvl: "ref" }
    ] },
    { g: "Группа 6: Строки и продвинутые структуры", items: [
      { t: "Строковые алгоритмы", h: "string-algorithms.html", lvl: "ext" },
      { t: "Trie: устройство", h: "trie-structure.html", lvl: "ext" },
      { t: "Trie: разбор задач", h: "trie.html", lvl: "ext" },
      { t: "Ахо — Корасик", h: "aho-corasick.html", lvl: "ext" },
      { t: "Дерево отрезков: устройство", h: "segment-tree-structure.html", lvl: "ref" },
      { t: "Дерево отрезков: задачи", h: "segment-tree.html", lvl: "ref" },
      { t: "Дерево Фенвика: устройство", h: "fenwick-tree-structure.html", lvl: "ref" },
      { t: "Дерево Фенвика: задачи", h: "fenwick-tree.html", lvl: "ref" },
      { t: "Sparse Table: устройство", h: "sparse-table-structure.html", lvl: "ref" },
      { t: "B-дерево: устройство", h: "btree-structure.html", lvl: "ref" },
      { t: "Вероятностные структуры", h: "probabilistic-structures.html", lvl: "ref" }
    ] },
    { g: "Группа 7: Дискретная математика", items: [
      { t: "Комбинаторика счёта", h: "combinatorics.html", lvl: "ref" },
      { t: "Дискретная вероятность", h: "probability.html", lvl: "ref" },
      { t: "Теория чисел", h: "number-theory.html", lvl: "ref" },
      { t: "Криптография: модульная арифметика", h: "cryptography.html", lvl: "ref" }
    ] },
    { g: "Группа 8: Синтез", items: [
      { t: "Комбинации паттернов", h: "pattern-combinations.html", lvl: "ext" },
      { t: "Карта: структуры в реальных системах", h: "real-world-map.html", lvl: "ext" },
      { t: "Postgres: EXPLAIN как pprof", h: "postgres-plans.html", lvl: "ext" },
      { t: "Консистентное хеширование", h: "consistent-hashing.html", lvl: "ext" },
      { t: "Капстоун: мини-Redis", h: "miniredis.html", lvl: "ext" },
      { t: "Ревью чужого кода", h: "code-review.html", lvl: "ext" },
      { t: "Параллельные алгоритмы", h: "parallel-algorithms.html", lvl: "ext" },
      { t: "Когда алгоритм не нужен", h: "skip-the-work.html", lvl: "ext" }
    ] },
    { g: "Дополнительные материалы", items: [
      { t: "Go-рантайм: планировщик, GC", h: "go-runtime.html", lvl: "ext" },
      { t: "Структуры в экосистеме Go", h: "go-stdlib-structures.html", lvl: "ext" },
      { t: "Криптография: библиотеки Go", h: "go-crypto-libraries.html", lvl: "ref" },
      { t: "Приложение: память, GC, профилирование", h: "appendix-go-memory.html", lvl: "ext" },
      { t: "Заключение", h: "conclusion.html", lvl: "ext" }
    ] }
  ];

  // Подписи уровней — используются и в трекере, и в плашке на самой странице главы.
  var LEVELS = {
    core: { badge: "Ядро", hint: "Скелет курса: эти главы читаются подряд." },
    ext: { badge: "Расширение", hint: "Не на основном пути. Стоит прочесть, но после ядра — ничего в ядре на этой главе не держится." },
    ref: { badge: "Справочник", hint: "Не на пути: открой, когда встретишь в работе или захочешь полноты. Пропустить сейчас — нормально." },
    tool: { badge: "Инструмент", hint: "Не глава, а инструмент: сюда возвращаются, а не «проходят»." }
  };

  // Плоский список — для процента и для остального кода: состояние в localStorage
  // ключуется по href главы, поэтому перегруппировка не сбрасывает отметки.
  var CHAPTERS = GROUPS.reduce(function (acc, grp) { return acc.concat(grp.items); }, []);
  function ofLevel(lvl) {
    return CHAPTERS.filter(function (c) { return c.lvl === lvl; });
  }

  var KEY = "algoProgress";

  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* недоступно — работаем в рамках сессии */ } }

  function build(el) {
    var state = load();

    var barWrap = document.createElement("div"); barWrap.className = "algo-prog__barwrap";
    // Полоса прогресса передаёт долю и шириной, и ARIA-значением (для скринридеров).
    barWrap.setAttribute("role", "progressbar");
    barWrap.setAttribute("aria-label", "Прогресс прохождения глав");
    barWrap.setAttribute("aria-valuemin", "0");
    barWrap.setAttribute("aria-valuemax", "100");
    var bar = document.createElement("div"); bar.className = "algo-prog__bar"; barWrap.appendChild(bar);
    var label = document.createElement("div"); label.className = "algo-prog__label";
    el.appendChild(label); el.appendChild(barWrap);

    // Вторая строка — расширение и справочник отдельным счётом. Намеренно НЕ в
    // проценте: смешать их с ядром значит снова получить «пройдено 12 из 60» и
    // ощущение, что конца не видно.
    var aside = document.createElement("div"); aside.className = "algo-prog__aside";
    el.appendChild(aside);

    var list = document.createElement("div"); list.className = "algo-prog__list"; el.appendChild(list);

    var CORE = ofLevel("core"), EXT = ofLevel("ext"), REF = ofLevel("ref");
    var boxes = [];
    var groupCounters = [];
    function countDone(items) {
      return items.reduce(function (a, c) { return a + (state[c.h] ? 1 : 0); }, 0);
    }
    function refresh() {
      var done = countDone(CORE);
      var pct = Math.round(done / CORE.length * 100);
      bar.style.width = pct + "%";
      label.textContent = "Ядро пройдено: " + done + " / " + CORE.length + " (" + pct + "%)";
      barWrap.setAttribute("aria-valuenow", String(pct));
      barWrap.setAttribute("aria-valuetext", done + " из " + CORE.length + " глав ядра (" + pct + "%)");
      aside.textContent =
        "Расширение: " + countDone(EXT) + " / " + EXT.length +
        " · Справочник: " + countDone(REF) + " / " + REF.length +
        " — идут сверх ядра и в процент не входят";
      groupCounters.forEach(function (gc) {
        gc.el.textContent = countDone(gc.items) + " / " + gc.items.length;
      });
    }

    GROUPS.forEach(function (grp) {
      var head = document.createElement("div"); head.className = "algo-prog__group";
      var title = document.createElement("span"); title.textContent = grp.g; head.appendChild(title);
      var counter = document.createElement("span"); counter.className = "algo-prog__groupcount"; head.appendChild(counter);
      list.appendChild(head);
      groupCounters.push({ items: grp.items, el: counter });

      grp.items.forEach(function (ch) {
        var row = document.createElement("label"); row.className = "algo-prog__item";
        var cb = document.createElement("input"); cb.type = "checkbox"; cb.checked = !!state[ch.h];
        cb.setAttribute("aria-label", "Отметить главу пройденной: " + ch.t);
        cb.onchange = function () { state[ch.h] = cb.checked; save(state); row.classList.toggle("algo-prog__item--done", cb.checked); refresh(); };
        var a = document.createElement("a"); a.href = ch.h; a.textContent = ch.t; a.className = "algo-prog__link";
        row.appendChild(cb); row.appendChild(a);
        // Ядро не помечаем: метка на четырёх пятых списка — это шум. Значок
        // стоит там, где он что-то сообщает: «эту можно отложить».
        if (ch.lvl !== "core") {
          var tag = document.createElement("span");
          tag.className = "algo-lvl algo-lvl--" + ch.lvl;
          tag.textContent = LEVELS[ch.lvl].badge;
          tag.title = LEVELS[ch.lvl].hint;
          row.appendChild(tag);
        }
        if (cb.checked) row.classList.add("algo-prog__item--done");
        list.appendChild(row); boxes.push(cb);
      });
    });

    // Экспорт/импорт: весь прогресс живёт в localStorage одного браузера —
    // чистка кэша или переход на другую машину стирали два-три месяца работы
    // без единого способа это перенести. Забираем ВСЕ ключи книги (главы,
    // решённые задачи, промахи, рекорд квиза и код, написанный в виджетах),
    // а не только этот трекер.
    var PREFIXES = ["algoProgress", "algoChallengeSolved", "algoChallengeMissed", "algoQuizBest", "algoRunnerCode:", "algoPkgSolved", "algoSRS",
      "algoExplain", "algoExplainDone", "algoQuizMissed", "algoMixedMissed", "algoMixedSeen",
      "algoMockLog", "algoMockCxMissed"];
    function isOurs(key) {
      return PREFIXES.some(function (p) { return key === p || key.indexOf(p) === 0; });
    }

    var exportBtn = document.createElement("button"); exportBtn.type = "button"; exportBtn.className = "algo-quiz__btn"; exportBtn.textContent = "Экспорт прогресса";
    exportBtn.onclick = function () {
      var dump = { kind: "algorithms-book-progress", version: 1, data: {} };
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (isOurs(k)) dump.data[k] = localStorage.getItem(k);
      }
      var blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "algorithms-book-progress.json";
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    };

    var importInput = document.createElement("input");
    importInput.type = "file"; importInput.accept = "application/json,.json"; importInput.style.display = "none";
    importInput.onchange = function () {
      var file = importInput.files && importInput.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        var dump;
        try { dump = JSON.parse(String(reader.result)); } catch (e) { dump = null; }
        if (!dump || dump.kind !== "algorithms-book-progress" || !dump.data) {
          alert("Это не файл прогресса книги.");
          return;
        }
        // Слияние, а не замена: импорт с другой машины не должен стирать то,
        // что уже пройдено здесь. Для карт-объектов объединяем ключи.
        Object.keys(dump.data).forEach(function (k) {
          if (!isOurs(k)) return;
          var incoming = dump.data[k];
          var current = localStorage.getItem(k);
          if (current && k !== "algoQuizBest" && k.indexOf("algoRunnerCode:") !== 0) {
            try {
              incoming = JSON.stringify(mergeStored(JSON.parse(current), JSON.parse(incoming)));
            } catch (e) { /* не JSON — берём как есть */ }
          }
          try { localStorage.setItem(k, incoming); } catch (e) { /* приватный режим */ }
        });
        state = load();
        boxes.forEach(function (cb) {
          var href = cb.parentNode.querySelector(".algo-prog__link").getAttribute("href");
          cb.checked = !!state[href];
          cb.parentNode.classList.toggle("algo-prog__item--done", cb.checked);
        });
        refresh();
        importInput.value = "";
      };
      reader.readAsText(file);
    };
    var importBtn = document.createElement("button"); importBtn.type = "button"; importBtn.className = "algo-quiz__btn"; importBtn.textContent = "Импорт";
    importBtn.onclick = function () { importInput.click(); };

    var reset = document.createElement("button"); reset.type = "button"; reset.className = "algo-quiz__btn"; reset.textContent = "Сбросить прогресс";
    reset.onclick = function () {
      state = {}; save(state);
      boxes.forEach(function (cb) { cb.checked = false; cb.parentNode.classList.remove("algo-prog__item--done"); });
      refresh();
    };
    // Имя не bar: так уже названа сама полоса прогресса выше, и повторный var
    // в той же функции молча перетирал бы её — refresh() тогда красит ширину
    // не тому элементу.
    var actions = document.createElement("div"); actions.className = "algo-prog__bar-actions";
    actions.appendChild(exportBtn); actions.appendChild(importBtn); actions.appendChild(reset);
    actions.appendChild(importInput);
    el.appendChild(actions);

    refresh();
  }

  // mergeStored сливает сохранённое здесь с импортированным. Карты-объекты —
  // объединением ключей (пришедшее побеждает). Массивы — объединением записей
  // без дублей: история собеседований (algoMockLog) — список, и слияние «по
  // ключам» перезаписало бы его по индексу — [a,b,c] + [x,y] дало бы [x,y,c],
  // и два собеседования пропали бы молча.
  function mergeStored(current, add) {
    if (Array.isArray(current) && Array.isArray(add)) {
      var seen = {};
      var out = [];
      current.concat(add).forEach(function (item) {
        var id = JSON.stringify(item);
        if (seen[id]) return;
        seen[id] = true;
        out.push(item);
      });
      return out.sort(function (a, b) { return ((a && a.ts) || 0) - ((b && b.ts) || 0); });
    }
    Object.keys(add).forEach(function (id) { current[id] = add[id]; });
    return current;
  }

  // Список глав нужен и движку повторений (srs.js) — чтобы показывать название
  // главы, а не слаг из адреса. Отдельного модуля ради одной константы не
  // заводим: оглавление и так живёт здесь.
  window.ALGO_CHAPTERS = CHAPTERS;

  // Плашка уровня на самой странице главы. Ставится ИЗ ЭТОГО ЖЕ реестра, а не
  // руками в сорока файлах: разметка в двух местах гарантированно разъедется,
  // и тогда трекер будет считать одно, а глава утверждать другое.
  // Ядро и инструменты не помечаем — молчание и означает «ты на пути».
  function markPage() {
    var file = (location.pathname.split("/").pop() || "index.html").split("#")[0];
    var ch = null;
    for (var i = 0; i < CHAPTERS.length; i++) {
      if (CHAPTERS[i].h === file) { ch = CHAPTERS[i]; break; }
    }
    if (!ch || ch.lvl === "core" || ch.lvl === "tool") return;
    var main = document.querySelector("main");
    if (!main || main.querySelector(".algo-lvlnote")) return;
    var h1 = main.querySelector("h1");
    if (!h1) return;
    var note = document.createElement("div");
    note.className = "algo-lvlnote algo-lvlnote--" + ch.lvl;
    var badge = document.createElement("b");
    badge.className = "algo-lvl algo-lvl--" + ch.lvl;
    badge.textContent = LEVELS[ch.lvl].badge;
    note.appendChild(badge);
    note.appendChild(document.createTextNode(" " + LEVELS[ch.lvl].hint));
    h1.parentNode.insertBefore(note, h1.nextSibling);
  }

  function init() {
    markPage();
    Array.prototype.forEach.call(document.querySelectorAll(".algo-progress:not(.algo-progress--ready)"), function (el) {
      el.classList.add("algo-progress--ready"); build(el);
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
