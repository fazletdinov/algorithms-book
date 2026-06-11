/*
 * progress.js — личный трекер прогресса по главам (сохраняется в localStorage).
 * Контейнер: <div class="algo-progress"></div>
 */
(function () {
  "use strict";

  var CHAPTERS = [
    { t: "Sliding Window", h: "sliding-window.html" },
    { t: "Two Pointers", h: "two-pointers.html" },
    { t: "Fast & Slow Pointers", h: "fast-slow-pointers.html" },
    { t: "Merge Intervals", h: "merge-intervals.html" },
    { t: "Cyclic Sort", h: "cyclic-sort.html" },
    { t: "Modified Binary Search", h: "modified-binary-search.html" },
    { t: "Bit Manipulation", h: "bit-manipulation.html" },
    { t: "Reverse Linked List", h: "reverse-linked-list.html" },
    { t: "Tree BFS", h: "tree-bfs.html" },
    { t: "Tree DFS", h: "tree-dfs.html" },
    { t: "Two Heaps", h: "two-heaps.html" },
    { t: "Top-K Elements", h: "top-k-elements.html" },
    { t: "K-way Merge", h: "k-way-merge.html" },
    { t: "Subsets", h: "subsets.html" },
    { t: "Backtracking", h: "backtracking.html" },
    { t: "Graphs (обход)", h: "graphs.html" },
    { t: "Сетки и кратчайшие пути", h: "grids-and-shortest-paths.html" },
    { t: "Графы: продвинутые", h: "advanced-graph-algorithms.html" },
    { t: "Topological Sort", h: "topological-sort.html" },
    { t: "Greedy", h: "greedy.html" },
    { t: "Dynamic Programming", h: "dynamic-programming.html" },
    { t: "Строковые алгоритмы", h: "string-algorithms.html" },
    { t: "Trie", h: "trie.html" },
    { t: "Segment Tree", h: "segment-tree.html" },
    { t: "Fenwick Tree", h: "fenwick-tree.html" }
  ];
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
    function refresh() {
      var done = CHAPTERS.reduce(function (a, c) { return a + (state[c.h] ? 1 : 0); }, 0);
      var pct = Math.round(done / CHAPTERS.length * 100);
      bar.style.width = pct + "%";
      label.textContent = "Пройдено: " + done + " / " + CHAPTERS.length + " (" + pct + "%)";
      barWrap.setAttribute("aria-valuenow", String(pct));
      barWrap.setAttribute("aria-valuetext", done + " из " + CHAPTERS.length + " глав (" + pct + "%)");
    }

    CHAPTERS.forEach(function (ch) {
      var row = document.createElement("label"); row.className = "algo-prog__item";
      var cb = document.createElement("input"); cb.type = "checkbox"; cb.checked = !!state[ch.h];
      cb.onchange = function () { state[ch.h] = cb.checked; save(state); row.classList.toggle("algo-prog__item--done", cb.checked); refresh(); };
      var a = document.createElement("a"); a.href = ch.h; a.textContent = ch.t; a.className = "algo-prog__link";
      row.appendChild(cb); row.appendChild(a);
      if (cb.checked) row.classList.add("algo-prog__item--done");
      list.appendChild(row); boxes.push(cb);
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
