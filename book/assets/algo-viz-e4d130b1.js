/*
 * algo-viz.js — интерактивные пошаговые визуализации алгоритмов для mdBook.
 *
 * Типы (атрибут data-viz):
 *   sliding-window-fixed  data-array, data-k
 *   two-pointers-sum      data-array, data-target
 *   binary-search         data-array, data-target
 *   cyclic-sort           data-array            (числа 1..n)
 *   dp-coins              data-coins, data-amount
 *   tree-bfs / tree-dfs   data-tree             (уровневое представление, null=пусто)
 *   graph-bfs             data-nodes, data-edges (a-b,...), data-start
 *
 * Пример: <div class="algo-viz" data-viz="cyclic-sort" data-array="3,1,5,4,2"></div>
 * Без внешних зависимостей; скрипт сам находит все .algo-viz.
 */
(function () {
  "use strict";

  var SVGNS = "http://www.w3.org/2000/svg";

  function nums(s) {
    return (s || "").split(",").map(function (x) { return x.trim(); })
      .filter(function (x) { return x.length > 0; }).map(Number);
  }
  function parseTree(s) {
    return (s || "").split(",").map(function (x) {
      x = x.trim();
      return x === "" || x === "null" ? null : Number(x);
    });
  }
  function parseEdges(s) {
    return (s || "").split(",").map(function (e) {
      return e.trim().split("-").map(Number);
    }).filter(function (e) { return e.length === 2; });
  }

  // ===== Общий степпер ========================================================
  // render(idx) -> { info, done }; попутно перерисовывает состояние.
  function attachStepper(el, count, render) {
    var info = document.createElement("div");
    info.className = "algo-viz__info";
    el.appendChild(info);

    var ctrl = document.createElement("div");
    ctrl.className = "algo-viz__ctrl";
    var bFirst = mkBtn("⏮", "В начало"), bPrev = mkBtn("◀", "Назад");
    var counter = document.createElement("span");
    counter.className = "algo-viz__counter";
    var bNext = mkBtn("▶", "Вперёд"), bLast = mkBtn("⏭", "В конец");
    [bFirst, bPrev, counter, bNext, bLast].forEach(function (n) { ctrl.appendChild(n); });
    el.appendChild(ctrl);

    var idx = 0;
    function show(i) {
      idx = Math.max(0, Math.min(count - 1, i));
      var r = render(idx);
      info.textContent = r.info || "";
      info.classList.toggle("algo-viz__info--done", !!r.done);
      counter.textContent = (idx + 1) + " / " + count;
      bFirst.disabled = bPrev.disabled = idx === 0;
      bNext.disabled = bLast.disabled = idx === count - 1;
    }
    bFirst.onclick = function () { show(0); };
    bPrev.onclick = function () { show(idx - 1); };
    bNext.onclick = function () { show(idx + 1); };
    bLast.onclick = function () { show(count - 1); };
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

  // ===== Построители «оконных» шагов (значения массива фиксированы) ===========
  // шаг: { lo, hi, mid?, info, done?, found? }
  function bSlidingWindow(arr, k) {
    var steps = [];
    if (k <= 0 || k > arr.length) return [{ lo: 0, hi: -1, info: "Некорректное k = " + k, done: true }];
    var sum = 0;
    for (var i = 0; i < k; i++) sum += arr[i];
    var maxSum = sum, bestLo = 0;
    steps.push({ lo: 0, hi: k - 1, info: "Первое окно: сумма = " + sum + ", максимум = " + maxSum });
    for (var r = k; r < arr.length; r++) {
      sum += arr[r] - arr[r - k];
      var lo = r - k + 1, improved = sum > maxSum;
      if (improved) { maxSum = sum; bestLo = lo; }
      steps.push({ lo: lo, hi: r, info: "Сдвиг: +" + arr[r] + " −" + arr[r - k] + " → сумма = " + sum + (improved ? ", новый максимум = " + maxSum : ", максимум = " + maxSum) });
    }
    steps.push({ lo: bestLo, hi: bestLo + k - 1, done: true, info: "Готово. Максимальная сумма окна = " + maxSum });
    return steps;
  }
  function bTwoPointers(arr, target) {
    var steps = [], lo = 0, hi = arr.length - 1;
    while (lo < hi) {
      var sum = arr[lo] + arr[hi];
      if (sum === target) { steps.push({ lo: lo, hi: hi, done: true, found: true, info: arr[lo] + " + " + arr[hi] + " = " + target + " — пара найдена!" }); return steps; }
      if (sum < target) { steps.push({ lo: lo, hi: hi, info: arr[lo] + " + " + arr[hi] + " = " + sum + " < " + target + " → left++" }); lo++; }
      else { steps.push({ lo: lo, hi: hi, info: arr[lo] + " + " + arr[hi] + " = " + sum + " > " + target + " → right--" }); hi--; }
    }
    steps.push({ lo: lo, hi: hi, done: true, info: "Пара с суммой " + target + " не найдена" });
    return steps;
  }
  function bBinarySearch(arr, target) {
    var steps = [], lo = 0, hi = arr.length - 1;
    while (lo <= hi) {
      var mid = (lo + hi) >> 1;
      var base = "lo=" + lo + ", hi=" + hi + ", mid=" + mid + " → arr[" + mid + "]=" + arr[mid];
      if (arr[mid] === target) { steps.push({ lo: lo, hi: hi, mid: mid, info: base + " = " + target + " ✓" }); steps.push({ lo: mid, hi: mid, mid: mid, found: true, done: true, info: "Найдено на индексе " + mid }); return steps; }
      if (arr[mid] < target) { steps.push({ lo: lo, hi: hi, mid: mid, info: base + " < " + target + " → правее (lo = mid+1)" }); lo = mid + 1; }
      else { steps.push({ lo: lo, hi: hi, mid: mid, info: base + " > " + target + " → левее (hi = mid-1)" }); hi = mid - 1; }
    }
    steps.push({ lo: 0, hi: -1, done: true, info: target + " не найдено" });
    return steps;
  }
  var WINDOW = {
    "sliding-window-fixed": function (el, a) { return bSlidingWindow(a, parseInt(el.getAttribute("data-k"), 10)); },
    "two-pointers-sum": function (el, a) { return bTwoPointers(a, parseInt(el.getAttribute("data-target"), 10)); },
    "binary-search": function (el, a) { return bBinarySearch(a, parseInt(el.getAttribute("data-target"), 10)); }
  };

  function renderWindow(el) {
    var steps = WINDOW[el.getAttribute("data-viz")](el, nums(el.getAttribute("data-array")));
    var cells = buildRow(el, nums(el.getAttribute("data-array")));
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

  // ===== Построители шагов с изменяющимися значениями =========================
  // шаг: { values:[...], primary?, secondary?, info, done?, found? }
  function bCyclicSort(arr) {
    var a = arr.slice(), steps = [], i = 0;
    steps.push({ values: a.slice(), info: "Старт. Значение v должно стоять на индексе v−1." });
    while (i < a.length) {
      var correct = a[i] - 1;
      if (a[i] !== a[correct]) {
        steps.push({ values: a.slice(), primary: i, secondary: correct, info: "a[" + i + "]=" + a[i] + " → его место — индекс " + correct + ". Меняем местами." });
        var t = a[i]; a[i] = a[correct]; a[correct] = t;
      } else {
        steps.push({ values: a.slice(), primary: i, info: "a[" + i + "]=" + a[i] + " уже на месте → i++" });
        i++;
      }
    }
    steps.push({ values: a.slice(), done: true, info: "Отсортировано за O(n)." });
    return steps;
  }
  function bDpCoins(coins, amount) {
    var INF = Infinity, dp = new Array(amount + 1).fill(INF);
    dp[0] = 0;
    var disp = function (v) { return v === INF ? "∞" : v; };
    var steps = [{ values: dp.map(disp), primary: 0, info: "dp[0]=0 — на сумму 0 нужно 0 монет." }];
    for (var a = 1; a <= amount; a++) {
      var best = INF, src = -1, used = -1;
      for (var ci = 0; ci < coins.length; ci++) {
        var c = coins[ci];
        if (c <= a && dp[a - c] + 1 < best) { best = dp[a - c] + 1; src = a - c; used = c; }
      }
      dp[a] = best;
      steps.push({
        values: dp.map(disp), primary: a, secondary: src >= 0 ? src : undefined,
        info: best === INF ? ("dp[" + a + "] недостижимо ни одной монетой") : ("dp[" + a + "] = dp[" + src + "]+1 = " + best + " (взяли монету " + used + ")")
      });
    }
    steps.push({ values: dp.map(disp), primary: amount, done: true, info: dp[amount] === INF ? "Сумму набрать нельзя (−1)." : ("Ответ: минимум " + dp[amount] + " монет.") });
    return steps;
  }
  var STATE = {
    "cyclic-sort": function (el) { return bCyclicSort(nums(el.getAttribute("data-array"))); },
    "dp-coins": function (el) { return bDpCoins(nums(el.getAttribute("data-coins")), parseInt(el.getAttribute("data-amount"), 10)); }
  };

  function renderState(el) {
    var steps = STATE[el.getAttribute("data-viz")](el);
    if (!steps.length) return;
    var idxRow = null;
    var cells = buildRow(el, steps[0].values, true);
    // подпись индексов под ячейками
    idxRow = document.createElement("div");
    idxRow.className = "algo-viz__idxrow";
    steps[0].values.forEach(function (_, j) {
      var s = document.createElement("div");
      s.className = "algo-viz__idx";
      s.textContent = j;
      idxRow.appendChild(s);
    });
    el.insertBefore(idxRow, el.firstChild.nextSibling);

    attachStepper(el, steps.length, function (i) {
      var s = steps[i];
      cells.forEach(function (c, j) {
        c.querySelector(".algo-viz__val").textContent = s.values[j];
        c.classList.toggle("algo-viz__cell--active", s.primary === j);
        c.classList.toggle("algo-viz__cell--edge", s.primary === j);
        c.classList.toggle("algo-viz__cell--mid", s.secondary === j);
        c.classList.toggle("algo-viz__cell--found", !!s.done);
      });
      return { info: s.info, done: s.done };
    });
  }

  function buildRow(el, values, keepFirst) {
    el.classList.add("algo-viz--ready");
    if (!keepFirst) el.innerHTML = "";
    else el.innerHTML = "";
    var row = document.createElement("div");
    row.className = "algo-viz__row";
    var cells = values.map(function (v) {
      var c = document.createElement("div");
      c.className = "algo-viz__cell";
      c.innerHTML = "<span class='algo-viz__val'>" + v + "</span>";
      row.appendChild(c);
      return c;
    });
    el.appendChild(row);
    return cells;
  }

  // ===== Деревья (BFS / DFS) ==================================================
  function renderTree(el) {
    var lo = parseTree(el.getAttribute("data-tree"));
    var nodes = [];
    for (var i = 0; i < lo.length; i++) if (lo[i] !== null) nodes.push({ idx: i, val: lo[i], depth: Math.floor(Math.log(i + 1) / Math.LN2) });
    if (!nodes.length) return;

    el.classList.add("algo-viz--ready");
    el.innerHTML = "";
    var maxD = nodes.reduce(function (m, n) { return Math.max(m, n.depth); }, 0);
    var byIdx = {};
    var wrap = document.createElement("div");
    wrap.className = "algo-viz__tree";
    for (var d = 0; d <= maxD; d++) {
      var trow = document.createElement("div");
      trow.className = "algo-viz__trow";
      nodes.filter(function (n) { return n.depth === d; }).forEach(function (n) {
        var c = document.createElement("div");
        c.className = "algo-viz__tnode";
        c.textContent = n.val;
        trow.appendChild(c);
        byIdx[n.idx] = c;
      });
      wrap.appendChild(trow);
    }
    el.appendChild(wrap);

    var order;
    if (el.getAttribute("data-viz") === "tree-dfs") {
      order = [];
      (function dfs(i) {
        if (i >= lo.length || lo[i] === null) return;
        order.push(i); dfs(2 * i + 1); dfs(2 * i + 2);
      })(0);
    } else {
      order = nodes.map(function (n) { return n.idx; }); // BFS = по уровням
    }
    var kind = el.getAttribute("data-viz") === "tree-dfs" ? "DFS (preorder)" : "BFS";
    attachStepper(el, order.length, function (i) {
      var cur = order[i];
      order.forEach(function (id, pos) {
        byIdx[id].classList.toggle("algo-viz__tnode--visited", pos <= i);
        byIdx[id].classList.toggle("algo-viz__tnode--current", id === cur);
      });
      var seq = order.slice(0, i + 1).map(function (id) { return lo[id]; }).join(" → ");
      return { info: "Посещаем " + lo[cur] + ". Порядок " + kind + ": " + seq, done: i === order.length - 1 };
    });
  }

  // ===== Граф (BFS) ===========================================================
  function renderGraph(el) {
    var labels = (el.getAttribute("data-nodes") || "").split(",").map(function (x) { return x.trim(); });
    var edges = parseEdges(el.getAttribute("data-edges"));
    var start = parseInt(el.getAttribute("data-start") || "0", 10);
    var n = labels.length;
    if (!n) return;

    var W = 340, H = 240, cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 28;
    var pos = labels.map(function (_, i) {
      var ang = -Math.PI / 2 + 2 * Math.PI * i / n;
      return { x: cx + R * Math.cos(ang), y: cy + R * Math.sin(ang) };
    });
    var adj = labels.map(function () { return []; });
    edges.forEach(function (e) { adj[e[0]].push(e[1]); adj[e[1]].push(e[0]); });

    el.classList.add("algo-viz--ready");
    el.innerHTML = "";
    var svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("class", "algo-viz__graph");
    edges.forEach(function (e) {
      var ln = document.createElementNS(SVGNS, "line");
      ln.setAttribute("x1", pos[e[0]].x); ln.setAttribute("y1", pos[e[0]].y);
      ln.setAttribute("x2", pos[e[1]].x); ln.setAttribute("y2", pos[e[1]].y);
      ln.setAttribute("class", "algo-viz__gedge");
      svg.appendChild(ln);
    });
    var circles = [];
    labels.forEach(function (lab, i) {
      var c = document.createElementNS(SVGNS, "circle");
      c.setAttribute("cx", pos[i].x); c.setAttribute("cy", pos[i].y); c.setAttribute("r", 16);
      c.setAttribute("class", "algo-viz__gnode");
      svg.appendChild(c);
      var t = document.createElementNS(SVGNS, "text");
      t.setAttribute("x", pos[i].x); t.setAttribute("y", pos[i].y + 4);
      t.setAttribute("text-anchor", "middle"); t.setAttribute("class", "algo-viz__gtext");
      t.textContent = lab;
      svg.appendChild(t);
      circles.push(c);
    });
    el.appendChild(svg);

    // шаги BFS
    var visited = new Array(n).fill(false), queue = [start], order = [];
    visited[start] = true;
    var steps = [{ current: -1, visited: visited.slice(), info: "Старт с вершины " + labels[start] + " (помечена, в очереди)." }];
    while (queue.length) {
      var node = queue.shift();
      order.push(node);
      adj[node].forEach(function (nb) { if (!visited[nb]) { visited[nb] = true; queue.push(nb); } });
      steps.push({ current: node, visited: visited.slice(), info: "Извлекаем " + labels[node] + ". Порядок BFS: " + order.map(function (x) { return labels[x]; }).join(" → ") });
    }
    steps[steps.length - 1].done = true;

    attachStepper(el, steps.length, function (i) {
      var s = steps[i];
      circles.forEach(function (c, j) {
        c.classList.toggle("algo-viz__gnode--visited", s.visited[j]);
        c.classList.toggle("algo-viz__gnode--current", j === s.current);
      });
      return { info: s.info, done: s.done };
    });
  }

  // ===== Диспетчер ============================================================
  function render(el) {
    var t = el.getAttribute("data-viz") || "";
    if (WINDOW[t]) renderWindow(el);
    else if (STATE[t]) renderState(el);
    else if (t.indexOf("tree-") === 0) renderTree(el);
    else if (t.indexOf("graph-") === 0) renderGraph(el);
  }
  function init() {
    Array.prototype.forEach.call(document.querySelectorAll(".algo-viz:not(.algo-viz--ready)"), render);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
