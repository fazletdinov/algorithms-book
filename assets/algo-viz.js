/*
 * algo-viz.js — интерактивные пошаговые визуализации алгоритмов для mdBook.
 *
 * Использование в markdown (raw HTML):
 *   <div class="algo-viz" data-viz="sliding-window-fixed" data-array="2,1,5,1,3,2" data-k="3"></div>
 *   <div class="algo-viz" data-viz="two-pointers-sum"     data-array="1,2,3,4,6" data-target="6"></div>
 *   <div class="algo-viz" data-viz="binary-search"        data-array="1,3,5,7,9,11" data-target="9"></div>
 *   <div class="algo-viz" data-viz="tree-bfs"             data-tree="1,2,3,4,5,null,7"></div>
 *
 * Без внешних зависимостей. Скрипт сам находит все .algo-viz на странице.
 */
(function () {
  "use strict";

  function parseArray(s) {
    return (s || "")
      .split(",")
      .map(function (x) { return x.trim(); })
      .filter(function (x) { return x.length > 0; })
      .map(Number);
  }

  // Уровневое представление дерева: "null" / пусто = отсутствующий узел.
  function parseTree(s) {
    return (s || "").split(",").map(function (x) {
      x = x.trim();
      return x === "" || x === "null" ? null : Number(x);
    });
  }

  // --- Построители шагов для МАССИВНЫХ визуализаций ---------------------------
  // Каждый шаг: { lo, hi, mid?, info, done?, found? }

  function buildSlidingWindowFixed(arr, k) {
    var steps = [];
    if (k <= 0 || k > arr.length) {
      return [{ lo: 0, hi: -1, info: "Некорректное k = " + k, done: true }];
    }
    var sum = 0;
    for (var i = 0; i < k; i++) sum += arr[i];
    var maxSum = sum, bestLo = 0;
    steps.push({ lo: 0, hi: k - 1, info: "Первое окно: сумма = " + sum + ", максимум = " + maxSum });
    for (var r = k; r < arr.length; r++) {
      sum += arr[r] - arr[r - k];
      var lo = r - k + 1;
      var improved = sum > maxSum;
      if (improved) { maxSum = sum; bestLo = lo; }
      steps.push({
        lo: lo, hi: r,
        info: "Сдвиг: +" + arr[r] + " −" + arr[r - k] + " → сумма = " + sum +
              (improved ? ", новый максимум = " + maxSum : ", максимум = " + maxSum)
      });
    }
    steps.push({ lo: bestLo, hi: bestLo + k - 1, done: true, info: "Готово. Максимальная сумма окна = " + maxSum });
    return steps;
  }

  function buildTwoPointersSum(arr, target) {
    var steps = [];
    var lo = 0, hi = arr.length - 1;
    while (lo < hi) {
      var sum = arr[lo] + arr[hi];
      if (sum === target) {
        steps.push({ lo: lo, hi: hi, done: true, found: true,
          info: arr[lo] + " + " + arr[hi] + " = " + target + " — пара найдена!" });
        return steps;
      }
      if (sum < target) {
        steps.push({ lo: lo, hi: hi, info: arr[lo] + " + " + arr[hi] + " = " + sum + " < " + target + " → left++" });
        lo++;
      } else {
        steps.push({ lo: lo, hi: hi, info: arr[lo] + " + " + arr[hi] + " = " + sum + " > " + target + " → right--" });
        hi--;
      }
    }
    steps.push({ lo: lo, hi: hi, done: true, info: "Пара с суммой " + target + " не найдена" });
    return steps;
  }

  function buildBinarySearch(arr, target) {
    var steps = [];
    var lo = 0, hi = arr.length - 1;
    while (lo <= hi) {
      var mid = (lo + hi) >> 1;
      var base = "lo=" + lo + ", hi=" + hi + ", mid=" + mid + " → arr[" + mid + "]=" + arr[mid];
      if (arr[mid] === target) {
        steps.push({ lo: lo, hi: hi, mid: mid, info: base + " = " + target + " ✓" });
        steps.push({ lo: mid, hi: mid, mid: mid, found: true, done: true, info: "Найдено на индексе " + mid });
        return steps;
      }
      if (arr[mid] < target) {
        steps.push({ lo: lo, hi: hi, mid: mid, info: base + " < " + target + " → правее (lo = mid+1)" });
        lo = mid + 1;
      } else {
        steps.push({ lo: lo, hi: hi, mid: mid, info: base + " > " + target + " → левее (hi = mid-1)" });
        hi = mid - 1;
      }
    }
    steps.push({ lo: 0, hi: -1, done: true, info: target + " не найдено" });
    return steps;
  }

  var ARRAY_BUILDERS = {
    "sliding-window-fixed": function (el, arr) { return buildSlidingWindowFixed(arr, parseInt(el.getAttribute("data-k"), 10)); },
    "two-pointers-sum": function (el, arr) { return buildTwoPointersSum(arr, parseInt(el.getAttribute("data-target"), 10)); },
    "binary-search": function (el, arr) { return buildBinarySearch(arr, parseInt(el.getAttribute("data-target"), 10)); }
  };

  // --- Общий степпер (кнопки + счётчик + строка инфо) -------------------------
  // render(idx) -> { info, done } и попутно перерисовывает состояние.
  function attachStepper(el, count, render) {
    var info = document.createElement("div");
    info.className = "algo-viz__info";
    el.appendChild(info);

    var ctrl = document.createElement("div");
    ctrl.className = "algo-viz__ctrl";
    var btnFirst = mkBtn("⏮", "В начало");
    var btnPrev = mkBtn("◀", "Назад");
    var counter = document.createElement("span");
    counter.className = "algo-viz__counter";
    var btnNext = mkBtn("▶", "Вперёд");
    var btnLast = mkBtn("⏭", "В конец");
    [btnFirst, btnPrev, counter, btnNext, btnLast].forEach(function (n) { ctrl.appendChild(n); });
    el.appendChild(ctrl);

    var idx = 0;
    function show(i) {
      idx = Math.max(0, Math.min(count - 1, i));
      var r = render(idx);
      info.textContent = r.info || "";
      info.classList.toggle("algo-viz__info--done", !!r.done);
      counter.textContent = (idx + 1) + " / " + count;
      btnFirst.disabled = btnPrev.disabled = idx === 0;
      btnNext.disabled = btnLast.disabled = idx === count - 1;
    }
    btnFirst.onclick = function () { show(0); };
    btnPrev.onclick = function () { show(idx - 1); };
    btnNext.onclick = function () { show(idx + 1); };
    btnLast.onclick = function () { show(count - 1); };
    show(0);
  }

  function mkBtn(label, title) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "algo-viz__btn";
    b.textContent = label;
    b.title = title;
    return b;
  }

  // --- Рендер массивных визуализаций -----------------------------------------
  function renderArray(el) {
    var builder = ARRAY_BUILDERS[el.getAttribute("data-viz")];
    var arr = parseArray(el.getAttribute("data-array"));
    var steps = builder(el, arr);
    if (!steps.length) return;

    el.classList.add("algo-viz--ready");
    el.innerHTML = "";
    var row = document.createElement("div");
    row.className = "algo-viz__row";
    var cells = arr.map(function (val) {
      var c = document.createElement("div");
      c.className = "algo-viz__cell";
      c.innerHTML = "<span class='algo-viz__val'>" + val + "</span>";
      row.appendChild(c);
      return c;
    });
    el.appendChild(row);

    attachStepper(el, steps.length, function (idx) {
      var s = steps[idx];
      cells.forEach(function (c, j) {
        var inWin = j >= s.lo && j <= s.hi;
        c.classList.toggle("algo-viz__cell--active", inWin);
        c.classList.toggle("algo-viz__cell--edge", j === s.lo || j === s.hi);
        c.classList.toggle("algo-viz__cell--mid", s.mid === j);
        c.classList.toggle("algo-viz__cell--found", !!s.found && inWin);
      });
      return { info: s.info, done: s.done };
    });
  }

  // --- Рендер обхода дерева (BFS по уровням) ----------------------------------
  function renderTree(el) {
    var levelOrder = parseTree(el.getAttribute("data-tree"));
    var nodes = [];
    for (var i = 0; i < levelOrder.length; i++) {
      if (levelOrder[i] === null) continue;
      nodes.push({ idx: i, val: levelOrder[i], depth: Math.floor(Math.log(i + 1) / Math.LN2) });
    }
    if (!nodes.length) return;

    el.classList.add("algo-viz--ready");
    el.innerHTML = "";
    var maxDepth = nodes.reduce(function (m, n) { return Math.max(m, n.depth); }, 0);
    var cellByIdx = {};
    var wrap = document.createElement("div");
    wrap.className = "algo-viz__tree";
    for (var d = 0; d <= maxDepth; d++) {
      var trow = document.createElement("div");
      trow.className = "algo-viz__trow";
      nodes.filter(function (n) { return n.depth === d; }).forEach(function (n) {
        var c = document.createElement("div");
        c.className = "algo-viz__tnode";
        c.textContent = n.val;
        trow.appendChild(c);
        cellByIdx[n.idx] = c;
      });
      wrap.appendChild(trow);
    }
    el.appendChild(wrap);

    var order = nodes.map(function (n) { return n.idx; }); // BFS = порядок по уровням
    attachStepper(el, order.length, function (idx) {
      var cur = order[idx];
      order.forEach(function (id, pos) {
        cellByIdx[id].classList.toggle("algo-viz__tnode--visited", pos <= idx);
        cellByIdx[id].classList.toggle("algo-viz__tnode--current", id === cur);
      });
      var seq = order.slice(0, idx + 1).map(function (id) { return levelOrder[id]; }).join(" → ");
      var done = idx === order.length - 1;
      return { info: "Посещаем " + levelOrder[cur] + ". Порядок BFS: " + seq, done: done };
    });
  }

  function render(el) {
    var type = el.getAttribute("data-viz") || "";
    if (type.indexOf("tree-") === 0) {
      renderTree(el);
    } else if (ARRAY_BUILDERS[type]) {
      renderArray(el);
    }
  }

  function init() {
    var nodes = document.querySelectorAll(".algo-viz:not(.algo-viz--ready)");
    Array.prototype.forEach.call(nodes, render);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
