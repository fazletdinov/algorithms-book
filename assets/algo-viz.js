/*
 * algo-viz.js — интерактивные пошаговые визуализации алгоритмов для mdBook.
 *
 * Использование в markdown (raw HTML):
 *   <div class="algo-viz" data-viz="sliding-window-fixed"
 *        data-array="2,1,5,1,3,2" data-k="3"></div>
 *   <div class="algo-viz" data-viz="two-pointers-sum"
 *        data-array="1,2,3,4,6" data-target="6"></div>
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

  // --- Построители шагов: каждый шаг = { lo, hi, info, done } ----------------

  function buildSlidingWindowFixed(arr, k) {
    var steps = [];
    if (k <= 0 || k > arr.length) {
      steps.push({ lo: 0, hi: -1, info: "Некорректное k = " + k, done: true });
      return steps;
    }
    var sum = 0;
    for (var i = 0; i < k; i++) sum += arr[i];
    var maxSum = sum;
    var bestLo = 0;
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
    steps.push({
      lo: bestLo, hi: bestLo + k - 1, done: true,
      info: "Готово. Максимальная сумма окна = " + maxSum
    });
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
        steps.push({ lo: lo, hi: hi,
          info: arr[lo] + " + " + arr[hi] + " = " + sum + " < " + target + " → left++" });
        lo++;
      } else {
        steps.push({ lo: lo, hi: hi,
          info: arr[lo] + " + " + arr[hi] + " = " + sum + " > " + target + " → right--" });
        hi--;
      }
    }
    steps.push({ lo: lo, hi: hi, done: true, info: "Пара с суммой " + target + " не найдена" });
    return steps;
  }

  var BUILDERS = {
    "sliding-window-fixed": function (el, arr) {
      return buildSlidingWindowFixed(arr, parseInt(el.getAttribute("data-k"), 10));
    },
    "two-pointers-sum": function (el, arr) {
      return buildTwoPointersSum(arr, parseInt(el.getAttribute("data-target"), 10));
    }
  };

  // --- Рендеринг -------------------------------------------------------------

  function render(el) {
    var type = el.getAttribute("data-viz");
    var builder = BUILDERS[type];
    if (!builder) return;
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
      idx = Math.max(0, Math.min(steps.length - 1, i));
      var s = steps[idx];
      cells.forEach(function (c, j) {
        var inWin = j >= s.lo && j <= s.hi;
        c.classList.toggle("algo-viz__cell--active", inWin);
        c.classList.toggle("algo-viz__cell--edge", j === s.lo || j === s.hi);
        c.classList.toggle("algo-viz__cell--found", !!s.found && inWin);
      });
      info.textContent = s.info || "";
      info.classList.toggle("algo-viz__info--done", !!s.done);
      counter.textContent = (idx + 1) + " / " + steps.length;
      btnFirst.disabled = btnPrev.disabled = idx === 0;
      btnNext.disabled = btnLast.disabled = idx === steps.length - 1;
    }
    btnFirst.onclick = function () { show(0); };
    btnPrev.onclick = function () { show(idx - 1); };
    btnNext.onclick = function () { show(idx + 1); };
    btnLast.onclick = function () { show(steps.length - 1); };
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
