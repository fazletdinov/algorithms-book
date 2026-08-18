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
  var GROUPS = [
    { g: "Ориентиры", items: [
      { t: "Руководство по выбору шаблона", h: "pattern-selection-guide.html" },
      { t: "Шпаргалка", h: "cheatsheet.html" },
      { t: "Тренажёр распознавания (квиз)", h: "quiz.html" }
    ] },
    { g: "Группа 1: Фундамент", items: [
      { t: "Big-O и амортизированный анализ", h: "big-o.html" },
      { t: "Рекурсия и мастер-теорема", h: "recursion.html" },
      { t: "Инварианты и индукция", h: "invariants.html" },
      { t: "Хеш-таблица: устройство", h: "hash-table-structure.html" },
      { t: "Связный список: устройство", h: "linked-list-structure.html" },
      { t: "Дек: устройство", h: "deque-structure.html" },
      { t: "Сортировки и порядковые статистики", h: "sorting.html" }
    ] },
    { g: "Группа 2: Базовые паттерны", items: [
      { t: "Sliding Window", h: "sliding-window.html" },
      { t: "Two Pointers", h: "two-pointers.html" },
      { t: "Fast & Slow Pointers", h: "fast-slow-pointers.html" },
      { t: "Reverse Linked List", h: "reverse-linked-list.html" },
      { t: "Merge Intervals", h: "merge-intervals.html" },
      { t: "Cyclic Sort", h: "cyclic-sort.html" },
      { t: "Modified Binary Search", h: "modified-binary-search.html" },
      { t: "Bit Manipulation", h: "bit-manipulation.html" }
    ] },
    { g: "Группа 3: Деревья и кучи", items: [
      { t: "BST: устройство", h: "bst-structure.html" },
      { t: "AVL-дерево: балансировка", h: "avl-tree-structure.html" },
      { t: "Красно-чёрное дерево", h: "red-black-tree-structure.html" },
      { t: "Tree BFS", h: "tree-bfs.html" },
      { t: "Tree DFS", h: "tree-dfs.html" },
      { t: "Куча: устройство", h: "heap-structure.html" },
      { t: "Two Heaps", h: "two-heaps.html" },
      { t: "Top-K Elements", h: "top-k-elements.html" },
      { t: "K-way Merge", h: "k-way-merge.html" }
    ] },
    { g: "Группа 4: Комбинаторика и графы", items: [
      { t: "Subsets", h: "subsets.html" },
      { t: "Backtracking", h: "backtracking.html" },
      { t: "Graphs (обход)", h: "graphs.html" },
      { t: "Union-Find (DSU): устройство", h: "union-find-structure.html" },
      { t: "Topological Sort", h: "topological-sort.html" },
      { t: "Сетки и кратчайшие пути", h: "grids-and-shortest-paths.html" },
      { t: "Графы: продвинутые", h: "advanced-graph-algorithms.html" },
      { t: "Графы: связность (SCC, мосты)", h: "graph-connectivity.html" },
      { t: "Потоки в сетях", h: "max-flow.html" }
    ] },
    { g: "Группа 5: Оптимизация и границы", items: [
      { t: "Greedy", h: "greedy.html" },
      { t: "Dynamic Programming", h: "dynamic-programming.html" },
      { t: "Классы сложности: P и NP", h: "complexity-classes.html" }
    ] },
    { g: "Группа 6: Строки и продвинутые структуры", items: [
      { t: "Строковые алгоритмы", h: "string-algorithms.html" },
      { t: "Trie: устройство", h: "trie-structure.html" },
      { t: "Trie: разбор задач", h: "trie.html" },
      { t: "Дерево отрезков: устройство", h: "segment-tree-structure.html" },
      { t: "Дерево отрезков: задачи", h: "segment-tree.html" },
      { t: "Дерево Фенвика: устройство", h: "fenwick-tree-structure.html" },
      { t: "Дерево Фенвика: задачи", h: "fenwick-tree.html" },
      { t: "Sparse Table: устройство", h: "sparse-table-structure.html" },
      { t: "B-дерево: устройство", h: "btree-structure.html" },
      { t: "Вероятностные структуры", h: "probabilistic-structures.html" }
    ] },
    { g: "Группа 7: Дискретная математика", items: [
      { t: "Комбинаторика счёта", h: "combinatorics.html" },
      { t: "Дискретная вероятность", h: "probability.html" },
      { t: "Теория чисел", h: "number-theory.html" },
      { t: "Криптография: модульная арифметика", h: "cryptography.html" }
    ] },
    { g: "Группа 8: Синтез", items: [
      { t: "Комбинации паттернов", h: "pattern-combinations.html" },
      { t: "Карта: структуры в реальных системах", h: "real-world-map.html" },
      { t: "Капстоун: мини-Redis", h: "miniredis.html" },
      { t: "Ревью чужого кода", h: "code-review.html" }
    ] },
    { g: "Дополнительные материалы", items: [
      { t: "Go-рантайм: планировщик, GC", h: "go-runtime.html" },
      { t: "Структуры в экосистеме Go", h: "go-stdlib-structures.html" },
      { t: "Криптография: библиотеки Go", h: "go-crypto-libraries.html" },
      { t: "Приложение: память, GC, профилирование", h: "appendix-go-memory.html" },
      { t: "Заключение", h: "conclusion.html" }
    ] }
  ];

  // Плоский список — для процента и для остального кода: состояние в localStorage
  // ключуется по href главы, поэтому перегруппировка не сбрасывает отметки.
  var CHAPTERS = GROUPS.reduce(function (acc, grp) { return acc.concat(grp.items); }, []);

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

    var list = document.createElement("div"); list.className = "algo-prog__list"; el.appendChild(list);

    var boxes = [];
    var groupCounters = [];
    function refresh() {
      var done = CHAPTERS.reduce(function (a, c) { return a + (state[c.h] ? 1 : 0); }, 0);
      var pct = Math.round(done / CHAPTERS.length * 100);
      bar.style.width = pct + "%";
      label.textContent = "Пройдено: " + done + " / " + CHAPTERS.length + " (" + pct + "%)";
      barWrap.setAttribute("aria-valuenow", String(pct));
      barWrap.setAttribute("aria-valuetext", done + " из " + CHAPTERS.length + " разделов (" + pct + "%)");
      groupCounters.forEach(function (gc) {
        var d = gc.items.reduce(function (a, c) { return a + (state[c.h] ? 1 : 0); }, 0);
        gc.el.textContent = d + " / " + gc.items.length;
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
        if (cb.checked) row.classList.add("algo-prog__item--done");
        list.appendChild(row); boxes.push(cb);
      });
    });

    var reset = document.createElement("button"); reset.type = "button"; reset.className = "algo-quiz__btn"; reset.textContent = "Сбросить прогресс";
    reset.onclick = function () {
      state = {}; save(state);
      boxes.forEach(function (cb) { cb.checked = false; cb.parentNode.classList.remove("algo-prog__item--done"); });
      refresh();
    };
    el.appendChild(reset);

    refresh();
  }

  function init() {
    Array.prototype.forEach.call(document.querySelectorAll(".algo-progress:not(.algo-progress--ready)"), function (el) {
      el.classList.add("algo-progress--ready"); build(el);
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
