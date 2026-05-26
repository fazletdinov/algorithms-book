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

    // навигация с клавиатуры: ←/→ листают шаги, когда виджет в фокусе
    el.setAttribute("tabindex", "0");
    el.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { show(idx - 1); e.preventDefault(); }
      else if (e.key === "ArrowRight") { show(idx + 1); e.preventDefault(); }
      else if (e.key === "Home") { show(0); e.preventDefault(); }
      else if (e.key === "End") { show(count - 1); e.preventDefault(); }
    });
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
  // Дерево Фенвика: prefixSum(target) как сумма «зон ответственности» BIT-узлов.
  function bFenwick(arr, target) {
    var steps = [], i = target + 1, sum = 0; // 1-индексация внутри
    while (i > 0) {
      var low = i & (-i), lo0 = i - low, hi0 = i - 1, partial = 0;
      for (var k = lo0; k <= hi0; k++) partial += arr[k];
      sum += partial;
      steps.push({ lo: lo0, hi: hi0, info: "BIT-узел " + i + " покрывает [" + lo0 + ".." + hi0 + "] = " + partial + "; итог " + sum + ". Дальше i −= " + low });
      i -= low;
    }
    steps.push({ lo: 0, hi: target, done: true, info: "PrefixSum(0.." + target + ") = " + sum });
    return steps;
  }

  // Жадный Jump Game: ведём самую дальнюю достижимую позицию.
  function bJump(arr) {
    var n = arr.length, steps = [], maxReach = 0;
    for (var i = 0; i < n; i++) {
      if (i > maxReach) { steps.push({ lo: 0, hi: maxReach, mid: i, done: true, info: "Индекс " + i + " недостижим (maxReach=" + maxReach + ") → нельзя допрыгнуть" }); return steps; }
      if (i + arr[i] > maxReach) maxReach = i + arr[i];
      steps.push({ lo: 0, hi: Math.min(maxReach, n - 1), mid: i, info: "i=" + i + ", nums[i]=" + arr[i] + " → maxReach=" + maxReach + (maxReach >= n - 1 ? " (конец достижим)" : "") });
    }
    steps.push({ lo: 0, hi: n - 1, found: true, done: true, info: "Последний индекс достижим — можно!" });
    return steps;
  }

  var WINDOW = {
    "sliding-window-fixed": function (el, a) { return bSlidingWindow(a, parseInt(el.getAttribute("data-k"), 10)); },
    "two-pointers-sum": function (el, a) { return bTwoPointers(a, parseInt(el.getAttribute("data-target"), 10)); },
    "binary-search": function (el, a) { return bBinarySearch(a, parseInt(el.getAttribute("data-target"), 10)); },
    "fenwick-prefix": function (el, a) { return bFenwick(a, parseInt(el.getAttribute("data-index"), 10)); },
    "jump-game": function (el, a) { return bJump(a); }
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
  // XOR-накопление: единственное число среди пар.
  function bBitXor(arr) {
    var steps = [], x = 0;
    for (var i = 0; i < arr.length; i++) {
      x ^= arr[i];
      steps.push({ values: arr.slice(), primary: i, info: "XOR ^= " + arr[i] + " → " + x + " (bin " + (x >>> 0).toString(2) + ")" });
    }
    steps.push({ values: arr.slice(), done: true, info: "Пары взаимно уничтожились, осталось: " + x });
    return steps;
  }

  // Построение min-кучи последовательными вставками (sift-up).
  function bHeapInsert(arr) {
    var n = arr.length, heap = [], steps = [];
    function disp() { var v = heap.slice(); while (v.length < n) v.push(""); return v; }
    for (var k = 0; k < n; k++) {
      heap.push(arr[k]);
      var i = heap.length - 1;
      steps.push({ values: disp(), primary: i, info: "Вставляем " + arr[k] + " в конец и поднимаем вверх" });
      while (i > 0) {
        var p = (i - 1) >> 1;
        if (heap[i] < heap[p]) {
          var t = heap[i]; heap[i] = heap[p]; heap[p] = t;
          steps.push({ values: disp(), primary: p, secondary: i, info: heap[p] + " < родителя → обмен с индексом " + p });
          i = p;
        } else {
          steps.push({ values: disp(), primary: i, secondary: p, info: heap[i] + " ≥ родителя (" + heap[p] + ") → стоп" });
          break;
        }
      }
    }
    steps.push({ values: disp(), done: true, info: "Куча готова, на вершине минимум " + heap[0] });
    return steps;
  }

  var STATE = {
    "cyclic-sort": function (el) { return bCyclicSort(nums(el.getAttribute("data-array"))); },
    "dp-coins": function (el) { return bDpCoins(nums(el.getAttribute("data-coins")), parseInt(el.getAttribute("data-amount"), 10)); },
    "bit-xor": function (el) { return bBitXor(nums(el.getAttribute("data-array"))); },
    "heap-insert": function (el) { return bHeapInsert(nums(el.getAttribute("data-array"))); }
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

  // ===== Вспомогательное: ряд ячеек и ряд подписей ===========================
  function makeCells(values, extra) {
    var row = document.createElement("div");
    row.className = "algo-viz__row" + (extra ? " " + extra : "");
    var cells = values.map(function (v) {
      var c = document.createElement("div");
      c.className = "algo-viz__cell";
      c.innerHTML = "<span class='algo-viz__val'>" + v + "</span>";
      row.appendChild(c);
      return c;
    });
    return { row: row, cells: cells };
  }
  function makeLabelRow(n) {
    var r = document.createElement("div");
    r.className = "algo-viz__ptrrow";
    var labs = [];
    for (var i = 0; i < n; i++) {
      var s = document.createElement("div");
      s.className = "algo-viz__ptr";
      s.innerHTML = "&nbsp;";
      r.appendChild(s);
      labs.push(s);
    }
    return { row: r, labs: labs };
  }
  function ptrText(j, map) {
    var t = "";
    for (var name in map) if (map[name] === j) t = t ? t + "/" + name : name;
    return t || " ";
  }

  // ===== Разворот связного списка ============================================
  function renderListReverse(el) {
    var list = nums(el.getAttribute("data-list")), n = list.length;
    var steps = [], prev = -1, curr = 0;
    steps.push({ prev: prev, curr: curr, next: curr + 1 < n ? curr + 1 : -1, info: "prev = nil, curr = " + list[0] });
    while (curr < n) {
      var nxt = curr + 1;
      steps.push({ prev: prev, curr: curr, next: nxt < n ? nxt : -1, info: (prev < 0 ? list[curr] + ".Next → nil" : list[curr] + ".Next → " + list[prev]) + "; сдвигаем prev, curr вправо" });
      prev = curr; curr = nxt;
    }
    steps.push({ prev: prev, curr: -1, next: -1, done: true, info: "Новая голова — " + (prev >= 0 ? list[prev] : "nil") + ". Список развёрнут." });

    el.classList.add("algo-viz--ready"); el.innerHTML = "";
    var rc = makeCells(list); el.appendChild(rc.row);
    var lr = makeLabelRow(n); el.appendChild(lr.row);
    attachStepper(el, steps.length, function (i) {
      var s = steps[i];
      rc.cells.forEach(function (c, j) {
        c.classList.toggle("algo-viz__cell--found", s.prev >= 0 && j <= s.prev);
        c.classList.toggle("algo-viz__cell--active", j === s.curr);
        c.classList.toggle("algo-viz__cell--mid", j === s.next);
      });
      lr.labs.forEach(function (p, j) { p.textContent = ptrText(j, { prev: s.prev, curr: s.curr, next: s.next }); });
      return { info: s.info, done: s.done };
    });
  }

  // ===== Быстрый/медленный указатели (поиск цикла) ===========================
  function renderListCycle(el) {
    var list = nums(el.getAttribute("data-list")), n = list.length;
    var cyc = parseInt(el.getAttribute("data-cycle"), 10);
    var hasCyc = !isNaN(cyc) && cyc >= 0 && cyc < n;
    function nextIdx(i) { return i === n - 1 ? (hasCyc ? cyc : -1) : i + 1; }

    var steps = [{ slow: 0, fast: 0, info: "Старт: slow и fast на голове " + list[0] }];
    var slow = 0, fast = 0, guard = 0;
    while (guard++ < 4 * n + 4) {
      var f1 = nextIdx(fast); if (f1 < 0) { steps.push({ slow: slow, fast: -1, done: true, info: "fast дошёл до nil — цикла нет" }); break; }
      var f2 = nextIdx(f1); if (f2 < 0) { steps.push({ slow: slow, fast: -1, done: true, info: "fast дошёл до nil — цикла нет" }); break; }
      slow = nextIdx(slow); fast = f2;
      if (slow === fast) { steps.push({ slow: slow, fast: fast, meet: true, done: true, info: "slow и fast встретились на " + list[slow] + " — цикл есть!" }); break; }
      steps.push({ slow: slow, fast: fast, info: "slow → " + list[slow] + ", fast → " + list[fast] });
    }

    el.classList.add("algo-viz--ready"); el.innerHTML = "";
    if (hasCyc) { var note = document.createElement("div"); note.className = "algo-viz__info"; note.textContent = "Цикл: " + list[n - 1] + " → " + list[cyc]; el.appendChild(note); }
    var rc = makeCells(list); el.appendChild(rc.row);
    if (hasCyc) rc.cells[cyc].classList.add("algo-viz__cell--cycle");
    var lr = makeLabelRow(n); el.appendChild(lr.row);
    attachStepper(el, steps.length, function (i) {
      var s = steps[i];
      rc.cells.forEach(function (c, j) {
        c.classList.toggle("algo-viz__cell--active", j === s.slow);
        c.classList.toggle("algo-viz__cell--mid", j === s.fast);
        c.classList.toggle("algo-viz__cell--found", !!s.meet && j === s.slow);
      });
      lr.labs.forEach(function (p, j) { p.textContent = ptrText(j, { slow: s.slow, fast: s.fast }); });
      return { info: s.info, done: s.done };
    });
  }

  // ===== KMP: образец скользит под текстом ===================================
  function renderKMP(el) {
    var text = el.getAttribute("data-text") || "", pat = el.getAttribute("data-pattern") || "";
    var lps = new Array(pat.length).fill(0);
    (function () { var len = 0, i = 1; while (i < pat.length) { if (pat[i] === pat[len]) { len++; lps[i] = len; i++; } else if (len > 0) { len = lps[len - 1]; } else { lps[i] = 0; i++; } } })();

    var steps = [], i = 0, j = 0, foundAt = -1;
    while (i < text.length) {
      var match = text[i] === pat[j];
      steps.push({ i: i, j: j, shift: i - j, match: match, info: "text[" + i + "]='" + text[i] + "' vs pattern[" + j + "]='" + pat[j] + "' → " + (match ? "совпало" : "не совпало" + (j > 0 ? ", сдвиг по префикс-функции" : "")) });
      if (match) { i++; j++; if (j === pat.length) { foundAt = i - j; steps.push({ i: i - 1, j: j - 1, shift: foundAt, found: true, done: true, info: "Образец найден на позиции " + foundAt }); break; } }
      else if (j > 0) { j = lps[j - 1]; }
      else { i++; }
    }
    if (!steps.length || !steps[steps.length - 1].done) steps.push({ i: text.length, j: j, shift: text.length - j, done: true, info: "Образец не найден" });

    el.classList.add("algo-viz--ready"); el.innerHTML = "";
    var tr = makeCells(text.split(""), "algo-viz__charrow"); el.appendChild(tr.row);
    var prow = document.createElement("div"); prow.className = "algo-viz__row algo-viz__charrow"; el.appendChild(prow);
    attachStepper(el, steps.length, function (idx) {
      var s = steps[idx];
      tr.cells.forEach(function (c, k) {
        c.classList.toggle("algo-viz__cell--active", k === s.i && !s.done);
        c.classList.toggle("algo-viz__cell--found", !!s.found && k >= s.shift && k < s.shift + pat.length);
      });
      prow.innerHTML = "";
      for (var p = 0; p < s.shift; p++) { var g = document.createElement("div"); g.className = "algo-viz__cell algo-viz__cell--ghost"; g.innerHTML = "&nbsp;"; prow.appendChild(g); }
      for (var q = 0; q < pat.length; q++) {
        var pc = document.createElement("div"); pc.className = "algo-viz__cell";
        if (q === s.j && !s.done) pc.classList.add(s.match ? "algo-viz__cell--match" : "algo-viz__cell--mismatch");
        if (s.found) pc.classList.add("algo-viz__cell--found");
        pc.innerHTML = "<span class='algo-viz__val'>" + pat[q] + "</span>"; prow.appendChild(pc);
      }
      return { info: s.info, done: s.done };
    });
  }

  // ===== Слияние интервалов на числовой прямой ===============================
  function renderIntervals(el) {
    var raw = (el.getAttribute("data-intervals") || "").split(",").map(function (s) { return s.trim().split("-").map(Number); }).filter(function (p) { return p.length === 2; });
    if (!raw.length) return;
    var ivs = raw.slice().sort(function (a, b) { return a[0] - b[0]; });
    function cl(p) { return [p[0], p[1]]; }
    var steps = [{ cur: -1, merged: [], info: "Отсортировали интервалы по началу." }], merged = [];
    for (var k = 0; k < ivs.length; k++) {
      var iv = ivs[k];
      if (merged.length && iv[0] <= merged[merged.length - 1][1]) {
        var last = merged[merged.length - 1]; last[1] = Math.max(last[1], iv[1]);
        steps.push({ cur: k, merged: merged.map(cl), info: "[" + iv[0] + "," + iv[1] + "] пересекается → расширяем до " + last[1] });
      } else {
        merged.push([iv[0], iv[1]]);
        steps.push({ cur: k, merged: merged.map(cl), info: "[" + iv[0] + "," + iv[1] + "] не пересекается → новый интервал" });
      }
    }
    steps.push({ cur: -1, merged: merged.map(cl), done: true, info: "Готово: " + merged.length + " интервал(ов)." });

    var minX = Math.min.apply(null, ivs.map(function (p) { return p[0]; }));
    var maxX = Math.max.apply(null, ivs.map(function (p) { return p[1]; }));
    var W = 340, padL = 12, padR = 12, span = (maxX - minX) || 1, rowH = 20, H = 14 + ivs.length * rowH + 34;
    function X(v) { return padL + (v - minX) / span * (W - padL - padR); }

    el.classList.add("algo-viz--ready"); el.innerHTML = "";
    var svg = document.createElementNS(SVGNS, "svg"); svg.setAttribute("viewBox", "0 0 " + W + " " + H); svg.setAttribute("class", "algo-viz__intervals");
    var inputRects = ivs.map(function (iv, idx) {
      var r = document.createElementNS(SVGNS, "rect");
      r.setAttribute("x", X(iv[0])); r.setAttribute("y", 8 + idx * rowH); r.setAttribute("width", Math.max(2, X(iv[1]) - X(iv[0]))); r.setAttribute("height", 13);
      r.setAttribute("rx", 3); r.setAttribute("class", "algo-viz__ivbar"); svg.appendChild(r); return r;
    });
    var mg = document.createElementNS(SVGNS, "g"); svg.appendChild(mg);
    el.appendChild(svg);
    attachStepper(el, steps.length, function (i) {
      var s = steps[i];
      inputRects.forEach(function (r, idx) { r.classList.toggle("algo-viz__ivbar--cur", idx === s.cur); });
      while (mg.firstChild) mg.removeChild(mg.firstChild);
      s.merged.forEach(function (m) {
        var r = document.createElementNS(SVGNS, "rect");
        r.setAttribute("x", X(m[0])); r.setAttribute("y", 8 + ivs.length * rowH + 8); r.setAttribute("width", Math.max(2, X(m[1]) - X(m[0]))); r.setAttribute("height", 13);
        r.setAttribute("rx", 3); r.setAttribute("class", "algo-viz__ivbar algo-viz__ivbar--merged"); mg.appendChild(r);
      });
      return { info: s.info, done: s.done };
    });
  }

  // ===== Топологическая сортировка (алгоритм Кана) ===========================
  function renderTopoKahn(el) {
    var labels = (el.getAttribute("data-nodes") || "").split(",").map(function (x) { return x.trim(); });
    var edges = (el.getAttribute("data-edges") || "").split(",").map(function (e) { return e.trim().split("-"); })
      .map(function (p) { return [labels.indexOf(p[0]), labels.indexOf(p[1])]; }).filter(function (p) { return p[0] >= 0 && p[1] >= 0; });
    var n = labels.length; if (!n) return;
    var adj = labels.map(function () { return []; }), indeg = new Array(n).fill(0);
    edges.forEach(function (e) { adj[e[0]].push(e[1]); indeg[e[1]]++; });

    var deg = indeg.slice(), removed = new Array(n).fill(false), order = [];
    var steps = [{ removed: removed.slice(), deg: deg.slice(), cur: -1, info: "Посчитали входящие степени каждой вершины." }];
    var guard = 0;
    while (order.length < n && guard++ < n + 2) {
      var pick = -1; for (var v = 0; v < n; v++) if (!removed[v] && deg[v] === 0) { pick = v; break; }
      if (pick < 0) { steps.push({ removed: removed.slice(), deg: deg.slice(), cur: -1, done: true, info: "Нет вершины со степенью 0 → в графе цикл!" }); break; }
      removed[pick] = true; order.push(pick);
      adj[pick].forEach(function (w) { deg[w]--; });
      steps.push({ removed: removed.slice(), deg: deg.slice(), cur: pick, info: "Убираем " + labels[pick] + " (входящая 0). Порядок: " + order.map(function (x) { return labels[x]; }).join(" → ") });
    }
    if (order.length === n) steps[steps.length - 1].done = true;

    var W = 340, H = 270, cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 32;
    var pos = labels.map(function (_, i) { var a = -Math.PI / 2 + 2 * Math.PI * i / n; return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) }; });
    el.classList.add("algo-viz--ready"); el.innerHTML = "";
    var svg = document.createElementNS(SVGNS, "svg"); svg.setAttribute("viewBox", "0 0 " + W + " " + H); svg.setAttribute("class", "algo-viz__graph");
    var defs = document.createElementNS(SVGNS, "defs");
    var marker = document.createElementNS(SVGNS, "marker");
    marker.setAttribute("id", "algoarrow"); marker.setAttribute("viewBox", "0 0 10 10"); marker.setAttribute("refX", "9"); marker.setAttribute("refY", "5");
    marker.setAttribute("markerWidth", "7"); marker.setAttribute("markerHeight", "7"); marker.setAttribute("orient", "auto-start-reverse");
    var mpath = document.createElementNS(SVGNS, "path"); mpath.setAttribute("d", "M0,0 L10,5 L0,10 z"); mpath.setAttribute("fill", "#888");
    marker.appendChild(mpath); defs.appendChild(marker); svg.appendChild(defs);
    edges.forEach(function (e) {
      var a = pos[e[0]], b = pos[e[1]], dx = b.x - a.x, dy = b.y - a.y, len = Math.sqrt(dx * dx + dy * dy) || 1, ux = dx / len, uy = dy / len;
      var ln = document.createElementNS(SVGNS, "line");
      ln.setAttribute("x1", a.x + ux * 17); ln.setAttribute("y1", a.y + uy * 17);
      ln.setAttribute("x2", b.x - ux * 20); ln.setAttribute("y2", b.y - uy * 20);
      ln.setAttribute("class", "algo-viz__gedge"); ln.setAttribute("marker-end", "url(#algoarrow)"); svg.appendChild(ln);
    });
    var circles = [], badges = [];
    labels.forEach(function (lab, i) {
      var c = document.createElementNS(SVGNS, "circle"); c.setAttribute("cx", pos[i].x); c.setAttribute("cy", pos[i].y); c.setAttribute("r", 16); c.setAttribute("class", "algo-viz__gnode"); svg.appendChild(c); circles.push(c);
      var t = document.createElementNS(SVGNS, "text"); t.setAttribute("x", pos[i].x); t.setAttribute("y", pos[i].y + 4); t.setAttribute("text-anchor", "middle"); t.setAttribute("class", "algo-viz__gtext"); t.textContent = lab; svg.appendChild(t);
      var bt = document.createElementNS(SVGNS, "text"); bt.setAttribute("x", pos[i].x + 20); bt.setAttribute("y", pos[i].y - 14); bt.setAttribute("text-anchor", "middle"); bt.setAttribute("class", "algo-viz__gbadge"); svg.appendChild(bt); badges.push(bt);
    });
    el.appendChild(svg);
    attachStepper(el, steps.length, function (i) {
      var s = steps[i];
      circles.forEach(function (c, j) { c.classList.toggle("algo-viz__gnode--visited", s.removed[j]); c.classList.toggle("algo-viz__gnode--current", j === s.cur); });
      badges.forEach(function (b, j) { b.textContent = s.removed[j] ? "" : ("in:" + s.deg[j]); });
      return { info: s.info, done: s.done };
    });
  }

  // ===== BFS по сетке =========================================================
  function renderGridBfs(el) {
    var grid = (el.getAttribute("data-grid") || "").split(";").map(function (r) { return r.split(",").map(Number); });
    var R = grid.length; if (!R) return; var C = grid[0].length;
    var dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    var dist = Array.from({ length: R }, function () { return new Array(C).fill(-1); });
    var visitStep = Array.from({ length: R }, function () { return new Array(C).fill(-1); });
    var steps = [];
    function push(s) { if (s.cur) visitStep[s.cur[0]][s.cur[1]] = steps.length; steps.push(s); }

    if (grid[0][0] === 1 || grid[R - 1][C - 1] === 1) {
      push({ cur: null, done: true, info: "Старт или цель — препятствие, пути нет." });
    } else {
      var q = [[0, 0]]; dist[0][0] = 0;
      push({ cur: [0, 0], info: "Старт (0,0), расстояние 0." });
      var reached = false;
      while (q.length) {
        var cell = q.shift(), r = cell[0], c = cell[1];
        if (r === R - 1 && c === C - 1) { push({ cur: [r, c], done: true, info: "Цель достигнута за " + dist[r][c] + " шагов." }); reached = true; break; }
        for (var d = 0; d < dirs.length; d++) {
          var nr = r + dirs[d][0], nc = c + dirs[d][1];
          if (nr >= 0 && nr < R && nc >= 0 && nc < C && grid[nr][nc] === 0 && dist[nr][nc] < 0) { dist[nr][nc] = dist[r][c] + 1; q.push([nr, nc]); }
        }
        if (!(r === 0 && c === 0)) push({ cur: [r, c], info: "Обрабатываем (" + r + "," + c + "), расстояние " + dist[r][c] + "." });
      }
      if (!reached) push({ cur: null, done: true, info: "Цель недостижима." });
    }

    el.classList.add("algo-viz--ready"); el.innerHTML = "";
    var wrap = document.createElement("div"); wrap.className = "algo-viz__grid";
    wrap.style.gridTemplateColumns = "repeat(" + C + ", 2em)";
    var cells = [];
    for (var r = 0; r < R; r++) {
      cells.push([]);
      for (var c = 0; c < C; c++) {
        var cd = document.createElement("div");
        cd.className = "algo-viz__gcell" + (grid[r][c] === 1 ? " algo-viz__gcell--wall" : "");
        if (r === 0 && c === 0) cd.textContent = "S"; else if (r === R - 1 && c === C - 1) cd.textContent = "G";
        wrap.appendChild(cd); cells[r].push(cd);
      }
    }
    el.appendChild(wrap);
    attachStepper(el, steps.length, function (i) {
      var s = steps[i];
      for (var r = 0; r < R; r++) for (var c = 0; c < C; c++) {
        var vs = visitStep[r][c];
        cells[r][c].classList.toggle("algo-viz__gcell--visited", vs >= 0 && vs <= i && grid[r][c] === 0);
        cells[r][c].classList.toggle("algo-viz__gcell--current", !!s.cur && s.cur[0] === r && s.cur[1] === c);
      }
      return { info: s.info, done: s.done };
    });
  }

  // ===== Backtracking: генерация подмножеств =================================
  function renderSubsetsBt(el) {
    var set = nums(el.getAttribute("data-set")), n = set.length;
    var steps = [], result = [], current = [];
    function snap(extra) {
      var s = { current: current.slice(), results: result.map(function (x) { return x.slice(); }) };
      for (var k in extra) s[k] = extra[k];
      steps.push(s);
    }
    (function bt(start) {
      result.push(current.slice());
      snap({ action: "record", info: "Записываем подмножество [" + current.join(", ") + "]" });
      for (var i = start; i < n; i++) {
        current.push(set[i]);
        snap({ action: "choose", pick: i, info: "Берём " + set[i] + " → рекурсия" });
        bt(i + 1);
        current.pop();
        snap({ action: "back", pick: i, info: "Откат: убираем " + set[i] });
      }
    })(0);
    snap({ done: true, info: "Готово: " + result.length + " подмножеств" });

    el.classList.add("algo-viz--ready"); el.innerHTML = "";
    var inp = makeCells(set); el.appendChild(inp.row);
    var cap1 = document.createElement("div"); cap1.className = "algo-viz__cap"; cap1.textContent = "Текущее подмножество:"; el.appendChild(cap1);
    var curRow = document.createElement("div"); curRow.className = "algo-viz__row"; el.appendChild(curRow);
    var cap2 = document.createElement("div"); cap2.className = "algo-viz__cap"; cap2.textContent = "Найденные подмножества:"; el.appendChild(cap2);
    var chips = document.createElement("div"); chips.className = "algo-viz__chips"; el.appendChild(chips);

    attachStepper(el, steps.length, function (i) {
      var s = steps[i];
      inp.cells.forEach(function (c, j) {
        c.classList.toggle("algo-viz__cell--active", s.action === "choose" && s.pick === j);
        c.classList.toggle("algo-viz__cell--mid", s.action === "back" && s.pick === j);
      });
      curRow.innerHTML = "";
      if (!s.current.length) { var e = document.createElement("div"); e.className = "algo-viz__cap"; e.textContent = "∅"; curRow.appendChild(e); }
      s.current.forEach(function (v) { var c = document.createElement("div"); c.className = "algo-viz__cell algo-viz__cell--active"; c.innerHTML = "<span class='algo-viz__val'>" + v + "</span>"; curRow.appendChild(c); });
      chips.innerHTML = "";
      s.results.forEach(function (sub, k) {
        var ch = document.createElement("span"); ch.className = "algo-viz__chip";
        if (s.action === "record" && k === s.results.length - 1) ch.classList.add("algo-viz__chip--new");
        ch.textContent = "{" + sub.join(",") + "}";
        chips.appendChild(ch);
      });
      return { info: s.info, done: s.done };
    });
  }

  // ===== K-way merge: K отсортированных списков → один ========================
  function renderKwayMerge(el) {
    var lists = (el.getAttribute("data-lists") || "").split(";").map(function (s) { return s.split(",").map(Number); });
    var K = lists.length; if (!K) return;
    var ptr = lists.map(function () { return 0; }), output = [];
    var steps = [{ ptr: ptr.slice(), output: [], pick: null, info: "K отсортированных списков. Каждый раз берём минимальную «голову»." }];
    while (true) {
      var best = Infinity, bi = -1;
      for (var i = 0; i < K; i++) if (ptr[i] < lists[i].length && lists[i][ptr[i]] < best) { best = lists[i][ptr[i]]; bi = i; }
      if (bi < 0) break;
      output.push(best);
      steps.push({ ptr: ptr.slice(), output: output.slice(), pick: [bi, ptr[bi]], info: "Минимум среди голов = " + best + " (список " + (bi + 1) + ") → в результат" });
      ptr[bi]++;
    }
    steps.push({ ptr: ptr.slice(), output: output.slice(), pick: null, done: true, info: "Готово: " + output.join(", ") });

    el.classList.add("algo-viz--ready"); el.innerHTML = "";
    var rows = lists.map(function (lst, li) {
      var lab = document.createElement("div"); lab.className = "algo-viz__cap"; lab.textContent = "Список " + (li + 1) + ":"; el.appendChild(lab);
      var rc = makeCells(lst); el.appendChild(rc.row); return rc.cells;
    });
    var ocap = document.createElement("div"); ocap.className = "algo-viz__cap"; ocap.textContent = "Результат:"; el.appendChild(ocap);
    var orow = document.createElement("div"); orow.className = "algo-viz__row"; el.appendChild(orow);
    attachStepper(el, steps.length, function (s) {
      var st = steps[s];
      rows.forEach(function (cells, li) {
        cells.forEach(function (c, ci) {
          c.classList.toggle("algo-viz__cell--found", ci < st.ptr[li]);
          c.classList.toggle("algo-viz__cell--active", ci === st.ptr[li] && !st.done);
          c.classList.toggle("algo-viz__cell--mid", !!st.pick && st.pick[0] === li && st.pick[1] === ci);
        });
      });
      orow.innerHTML = "";
      st.output.forEach(function (v) { var c = document.createElement("div"); c.className = "algo-viz__cell algo-viz__cell--found"; c.innerHTML = "<span class='algo-viz__val'>" + v + "</span>"; orow.appendChild(c); });
      return { info: st.info, done: st.done };
    });
  }

  // ===== Две кучи: медиана потока ============================================
  function renderTwoHeaps(el) {
    var stream = nums(el.getAttribute("data-stream"));
    var lower = [], upper = [];
    function ins(arr, x) { var i = 0; while (i < arr.length && arr[i] < x) i++; arr.splice(i, 0, x); }
    var steps = [];
    stream.forEach(function (x) {
      if (lower.length === 0 || x <= lower[lower.length - 1]) ins(lower, x); else ins(upper, x);
      if (lower.length > upper.length + 1) ins(upper, lower.pop());
      else if (upper.length > lower.length + 1) ins(lower, upper.shift());
      var med = lower.length === upper.length ? (lower[lower.length - 1] + upper[0]) / 2 : (lower.length > upper.length ? lower[lower.length - 1] : upper[0]);
      steps.push({ lower: lower.slice(), upper: upper.slice(), info: "Добавили " + x + " → медиана = " + med });
    });
    if (steps.length) steps[steps.length - 1].done = true;

    el.classList.add("algo-viz--ready"); el.innerHTML = "";
    var c1 = document.createElement("div"); c1.className = "algo-viz__cap"; c1.textContent = "Меньшая половина (max-heap):"; el.appendChild(c1);
    var r1 = document.createElement("div"); r1.className = "algo-viz__row"; el.appendChild(r1);
    var c2 = document.createElement("div"); c2.className = "algo-viz__cap"; c2.textContent = "Большая половина (min-heap):"; el.appendChild(c2);
    var r2 = document.createElement("div"); r2.className = "algo-viz__row"; el.appendChild(r2);
    function fill(row, vals, topIdx) {
      row.innerHTML = "";
      if (!vals.length) { var e = document.createElement("div"); e.className = "algo-viz__cap"; e.textContent = "∅"; row.appendChild(e); return; }
      vals.forEach(function (v, k) { var c = document.createElement("div"); c.className = "algo-viz__cell" + (k === topIdx ? " algo-viz__cell--active" : ""); c.innerHTML = "<span class='algo-viz__val'>" + v + "</span>"; row.appendChild(c); });
    }
    attachStepper(el, steps.length, function (s) {
      var st = steps[s];
      fill(r1, st.lower, st.lower.length - 1);
      fill(r2, st.upper, 0);
      return { info: st.info, done: st.done };
    });
  }

  // ===== Дерево отрезков: запрос суммы на диапазоне ===========================
  function renderSegQuery(el) {
    var arr = nums(el.getAttribute("data-array"));
    var ql = parseInt(el.getAttribute("data-l"), 10), qr = parseInt(el.getAttribute("data-r"), 10);
    var nodes = [];
    (function build(lo, hi, depth) {
      var id = nodes.length; nodes.push({ lo: lo, hi: hi, sum: 0, left: -1, right: -1, depth: depth });
      if (lo === hi) { nodes[id].sum = arr[lo]; return id; }
      var mid = (lo + hi) >> 1;
      var L = build(lo, mid, depth + 1), Rr = build(mid + 1, hi, depth + 1);
      nodes[id].left = L; nodes[id].right = Rr; nodes[id].sum = nodes[L].sum + nodes[Rr].sum;
      return id;
    })(0, arr.length - 1, 0);

    var nodeStep = new Array(nodes.length).fill(-1), nodeState = new Array(nodes.length).fill("");
    var steps = [], total = 0;
    function mark(id, state, info) { nodeStep[id] = steps.length; nodeState[id] = state; steps.push({ info: info }); }
    (function q(id) {
      var nd = nodes[id];
      if (nd.hi < ql || qr < nd.lo) { mark(id, "skip", "[" + nd.lo + "," + nd.hi + "] вне запроса → пропускаем"); return; }
      if (ql <= nd.lo && nd.hi <= qr) { total += nd.sum; mark(id, "take", "[" + nd.lo + "," + nd.hi + "] целиком внутри → +" + nd.sum + " (итог " + total + ")"); return; }
      mark(id, "split", "[" + nd.lo + "," + nd.hi + "] частично → спускаемся к детям");
      q(nd.left); q(nd.right);
    })(0);
    steps.push({ done: true, info: "Сумма на [" + ql + "," + qr + "] = " + total });

    el.classList.add("algo-viz--ready"); el.innerHTML = "";
    var maxDepth = nodes.reduce(function (m, n) { return Math.max(m, n.depth); }, 0);
    var tree = document.createElement("div"); tree.className = "algo-viz__tree"; el.appendChild(tree);
    var byId = {};
    for (var d = 0; d <= maxDepth; d++) {
      var row = document.createElement("div"); row.className = "algo-viz__trow";
      nodes.map(function (n, idx) { return { n: n, idx: idx }; }).filter(function (o) { return o.n.depth === d; })
        .sort(function (a, b) { return a.n.lo - b.n.lo; })
        .forEach(function (o) {
          var c = document.createElement("div"); c.className = "algo-viz__tnode algo-viz__tnode--seg";
          c.textContent = o.n.sum; c.title = "[" + o.n.lo + "," + o.n.hi + "]";
          row.appendChild(c); byId[o.idx] = c;
        });
      tree.appendChild(row);
    }
    attachStepper(el, steps.length, function (i) {
      var st = steps[i];
      nodes.forEach(function (_, id) {
        var c = byId[id], shown = nodeStep[id] >= 0 && nodeStep[id] <= i;
        c.classList.toggle("algo-viz__tnode--take", shown && nodeState[id] === "take");
        c.classList.toggle("algo-viz__tnode--split", shown && nodeState[id] === "split");
        c.classList.toggle("algo-viz__tnode--skip", shown && nodeState[id] === "skip");
        c.classList.toggle("algo-viz__tnode--current", nodeStep[id] === i);
      });
      return { info: st.info, done: st.done };
    });
  }

  // ===== MST (алгоритм Краскала) =============================================
  function renderMstKruskal(el) {
    var labels = (el.getAttribute("data-nodes") || "").split(",").map(function (x) { return x.trim(); });
    var edges = (el.getAttribute("data-edges") || "").split(",").map(function (e) { return e.trim().split("-"); })
      .map(function (p) { return { u: labels.indexOf(p[0]), v: labels.indexOf(p[1]), w: Number(p[2]) }; })
      .filter(function (e) { return e.u >= 0 && e.v >= 0; });
    var n = labels.length; if (!n) return;
    var sorted = edges.slice().sort(function (a, b) { return a.w - b.w; });

    var parent = labels.map(function (_, i) { return i; });
    function find(x) { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; }
    var total = 0, edgeStep = edges.map(function () { return -1; }), edgeState = edges.map(function () { return ""; });
    var steps = [{ info: "Рёбра отсортированы по весу. Берём лёгкое ребро, если оно не создаёт цикл (Union-Find)." }];
    sorted.forEach(function (e) {
      var ei = edges.indexOf(e), ru = find(e.u), rv = find(e.v);
      if (ru !== rv) { parent[ru] = rv; total += e.w; edgeState[ei] = "add"; edgeStep[ei] = steps.length; steps.push({ info: "Ребро " + labels[e.u] + "–" + labels[e.v] + " (вес " + e.w + ") соединяет разные компоненты → берём (итог " + total + ")" }); }
      else { edgeState[ei] = "skip"; edgeStep[ei] = steps.length; steps.push({ info: "Ребро " + labels[e.u] + "–" + labels[e.v] + " (вес " + e.w + ") замкнуло бы цикл → пропускаем" }); }
    });
    steps.push({ done: true, info: "Минимальное остовное дерево, суммарный вес = " + total });

    var W = 340, H = 270, cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 30;
    var pos = labels.map(function (_, i) { var a = -Math.PI / 2 + 2 * Math.PI * i / n; return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) }; });
    el.classList.add("algo-viz--ready"); el.innerHTML = "";
    var svg = document.createElementNS(SVGNS, "svg"); svg.setAttribute("viewBox", "0 0 " + W + " " + H); svg.setAttribute("class", "algo-viz__graph");
    var lineEls = edges.map(function (e) {
      var a = pos[e.u], b = pos[e.v];
      var ln = document.createElementNS(SVGNS, "line"); ln.setAttribute("x1", a.x); ln.setAttribute("y1", a.y); ln.setAttribute("x2", b.x); ln.setAttribute("y2", b.y); ln.setAttribute("class", "algo-viz__gedge"); svg.appendChild(ln);
      var wt = document.createElementNS(SVGNS, "text"); wt.setAttribute("x", (a.x + b.x) / 2); wt.setAttribute("y", (a.y + b.y) / 2 - 3); wt.setAttribute("text-anchor", "middle"); wt.setAttribute("class", "algo-viz__gbadge"); wt.textContent = e.w; svg.appendChild(wt);
      return ln;
    });
    labels.forEach(function (lab, i) {
      var c = document.createElementNS(SVGNS, "circle"); c.setAttribute("cx", pos[i].x); c.setAttribute("cy", pos[i].y); c.setAttribute("r", 15); c.setAttribute("class", "algo-viz__gnode"); svg.appendChild(c);
      var t = document.createElementNS(SVGNS, "text"); t.setAttribute("x", pos[i].x); t.setAttribute("y", pos[i].y + 4); t.setAttribute("text-anchor", "middle"); t.setAttribute("class", "algo-viz__gtext"); t.textContent = lab; svg.appendChild(t);
    });
    el.appendChild(svg);
    attachStepper(el, steps.length, function (i) {
      lineEls.forEach(function (ln, ei) {
        var shown = edgeStep[ei] >= 0 && edgeStep[ei] <= i;
        ln.classList.toggle("algo-viz__gedge--mst", shown && edgeState[ei] === "add");
        ln.classList.toggle("algo-viz__gedge--skip", shown && edgeState[ei] === "skip");
        ln.classList.toggle("algo-viz__gedge--cur", edgeStep[ei] === i);
      });
      return { info: steps[i].info, done: steps[i].done };
    });
  }

  // ===== Trie: поиск по префиксному дереву ===================================
  function renderTrieSearch(el) {
    var words = (el.getAttribute("data-words") || "").split(",").map(function (x) { return x.trim(); }).filter(Boolean);
    var query = (el.getAttribute("data-query") || "").trim();
    var nodes = [{ ch: "•", depth: 0, end: false, children: {} }];
    words.forEach(function (w) {
      var cur = 0;
      for (var k = 0; k < w.length; k++) {
        var ch = w[k];
        if (nodes[cur].children[ch] == null) { var id = nodes.length; nodes.push({ ch: ch, depth: k + 1, end: false, children: {} }); nodes[cur].children[ch] = id; }
        cur = nodes[cur].children[ch];
      }
      nodes[cur].end = true;
    });

    var path = [0], cur = 0, broke = false;
    for (var k = 0; k < query.length; k++) {
      var ch = query[k];
      if (nodes[cur].children[ch] != null) { cur = nodes[cur].children[ch]; path.push(cur); }
      else { broke = true; break; }
    }
    var steps = [{ upto: 0, info: "Старт с корня. Ищем «" + query + "»." }];
    for (var p = 1; p < path.length; p++) steps.push({ upto: p, info: "Идём по '" + query[p - 1] + "' → узел «" + nodes[path[p]].ch + "»" });
    if (broke) steps.push({ upto: path.length - 1, done: true, info: "Нужного символа нет → «" + query + "» в дереве отсутствует." });
    else { var last = path[path.length - 1]; steps.push({ upto: path.length - 1, done: true, info: nodes[last].end ? "Путь есть и это конец слова → «" + query + "» найдено как слово ✓" : "Путь есть, но не конец слова → «" + query + "» только префикс." }); }

    el.classList.add("algo-viz--ready"); el.innerHTML = "";
    var maxDepth = nodes.reduce(function (m, n) { return Math.max(m, n.depth); }, 0);
    var tree = document.createElement("div"); tree.className = "algo-viz__tree"; el.appendChild(tree);
    var byId = {};
    for (var d = 0; d <= maxDepth; d++) {
      var row = document.createElement("div"); row.className = "algo-viz__trow";
      nodes.map(function (n, idx) { return { n: n, idx: idx }; }).filter(function (o) { return o.n.depth === d; }).forEach(function (o) {
        var c = document.createElement("div"); c.className = "algo-viz__tnode" + (o.n.end ? " algo-viz__tnode--end" : "");
        c.textContent = o.n.ch; row.appendChild(c); byId[o.idx] = c;
      });
      tree.appendChild(row);
    }
    attachStepper(el, steps.length, function (i) {
      var st = steps[i];
      nodes.forEach(function (_, id) {
        var posInPath = path.indexOf(id);
        var visited = posInPath >= 0 && posInPath <= st.upto;
        byId[id].classList.toggle("algo-viz__tnode--visited", visited);
        byId[id].classList.toggle("algo-viz__tnode--current", id === path[st.upto]);
      });
      return { info: st.info, done: st.done };
    });
  }

  // ===== Диспетчер ============================================================
  function render(el) {
    var t = el.getAttribute("data-viz") || "";
    if (WINDOW[t]) renderWindow(el);
    else if (STATE[t]) renderState(el);
    else if (t === "list-reverse") renderListReverse(el);
    else if (t === "list-cycle") renderListCycle(el);
    else if (t === "kmp") renderKMP(el);
    else if (t === "merge-intervals") renderIntervals(el);
    else if (t === "topo-kahn") renderTopoKahn(el);
    else if (t === "grid-bfs") renderGridBfs(el);
    else if (t === "subsets-bt") renderSubsetsBt(el);
    else if (t === "kway-merge") renderKwayMerge(el);
    else if (t === "two-heaps-median") renderTwoHeaps(el);
    else if (t === "segtree-query") renderSegQuery(el);
    else if (t === "mst-kruskal") renderMstKruskal(el);
    else if (t === "trie-search") renderTrieSearch(el);
    else if (t.indexOf("tree-") === 0) renderTree(el);
    else if (t === "graph-bfs") renderGraph(el);
  }
  function init() {
    Array.prototype.forEach.call(document.querySelectorAll(".algo-viz:not(.algo-viz--ready)"), render);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
