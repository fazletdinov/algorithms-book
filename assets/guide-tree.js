/*
 * guide-tree.js — дерево решений руководства по выбору картинкой: <div class="algo-guide-tree"></div>.
 *
 * Данных своих нет: виджет разбирает текстовое дерево (первый <pre> после него на странице) —
 * тот самый блок, метки уровня которого сверяет scripts/check-registries.js. Вопросы — карточки,
 * листья — плашки глав (название и уровень из progress.js, ✓ — глава отмечена пройденной),
 * клик по вопросу сворачивает ветку, наведение на плашку подсвечивает путь от корня.
 *
 * LEAVES — «название в дереве → слаг главы»: единственная копия, её же читает check-registries.js.
 */
(function () {
  var LEAVES = {
    "Хеш-таблица": "hash-table-structure",
    "Sliding Window": "sliding-window",
    "Prefix Sums": "prefix-sums",
    "Monotonic Stack": "monotonic-stack",
    "Two Pointers": "two-pointers",
    "Cyclic Sort": "cyclic-sort",
    "Modified Binary Search": "modified-binary-search",
    "Bit Manipulation": "bit-manipulation",
    "Fast & Slow Pointers": "fast-slow-pointers",
    "Reverse Linked List": "reverse-linked-list",
    "Tree BFS": "tree-bfs",
    "Tree DFS": "tree-dfs",
    "Merge Intervals": "merge-intervals",
    "Top K Elements": "top-k-elements",
    "Две кучи": "two-heaps",
    "K-way Merge": "k-way-merge",
    "Subsets": "subsets",
    "Backtracking": "backtracking",
    "Graphs": "graphs",
    "Topological Sort": "topological-sort",
    "Union-Find": "union-find-structure",
    "Grids & Shortest Paths": "grids-and-shortest-paths",
    "Advanced Graphs": "advanced-graph-algorithms",
    "Graph Connectivity": "graph-connectivity",
    "Max Flow / Min Cut": "max-flow",
    "Greedy": "greedy",
    "Dynamic Programming": "dynamic-programming",
    "Классы сложности": "complexity-classes",
    "Строковые алгоритмы": "string-algorithms",
    "Trie": "trie",
    "Sparse Table": "sparse-table-structure",
    "Дерево отрезков": "segment-tree",
    "Дерево Фенвика": "fenwick-tree",
    "B-дерево": "btree-structure",
    "Вероятностные структуры": "probabilistic-structures",
    "Комбинаторика счёта": "combinatorics",
    "Дискретная вероятность": "probability",
    "Теория чисел": "number-theory",
    "Криптография": "cryptography",
    "Сортировки и порядковые статистики": "sorting",
  };

  // Разбор листа «→ Name [метка] (пояснение) / Name2 [метка]»: названия ищутся длинные первыми,
  // чтобы «Graphs» внутри «Advanced Graphs» не считался отдельным листом.
  function parseLeaf(s) {
    var names = Object.keys(LEAVES).sort(function (a, b) { return b.length - a.length; });
    var hits = [];
    names.forEach(function (n) {
      var from = 0, i;
      while ((i = s.indexOf(n, from)) >= 0) {
        var free = hits.every(function (h) { return i + n.length <= h.at || i >= h.at + h.name.length; });
        if (free) hits.push({ name: n, at: i });
        from = i + n.length;
      }
    });
    hits.sort(function (a, b) { return a.at - b.at; });
    return hits.map(function (h, k) {
      var end = k + 1 < hits.length ? hits[k + 1].at : s.length;
      var tail = s.slice(h.at + h.name.length, end).replace(/\s*\/\s*$/, "");
      var note = (tail.match(/\(([^)]*)\)/) || [])[1] || "";
      var extra = tail.replace(/\[[^\]]*\]/, "").replace(/\([^)]*\)/, "").replace(/^[\s:]+|[\s:]+$/g, "");
      return { name: h.name, slug: LEAVES[h.name], note: note, extra: extra };
    });
  }

  // Текст дерева → { text, kids[], leaves[] }. Глубину задаёт столбец «├─»/«└─»; строка без них,
  // но с текстом — продолжение предыдущего вопроса.
  function parseTree(src) {
    var root = { text: "", kids: [], leaves: [] };
    var stack = [{ col: -1, node: root }], last = null;
    src.split("\n").forEach(function (line) {
      var m = line.match(/^([\s│]*)[├└]─\s*(.*)$/);
      if (!m) {
        var rest = line.replace(/[│]/g, "").trim();
        if (last && rest && !/^Начало$|^Метки:/.test(rest)) last.text += " " + rest;
        return;
      }
      var col = m[1].length, body = m[2].trim();
      while (stack.length > 1 && stack[stack.length - 1].col >= col) stack.pop();
      var parent = stack[stack.length - 1].node;
      if (body.indexOf("→") === 0) {
        parent.leaves = parent.leaves.concat(parseLeaf(body.slice(1)));
        last = null;
        return;
      }
      var node = { text: body, kids: [], leaves: [] };
      parent.kids.push(node);
      stack.push({ col: col, node: node });
      last = node;
    });
    return root;
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function chapterInfo(slug) {
    var list = window.ALGO_CHAPTERS || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].h !== slug + ".html") continue;
      // название без приписки после двоеточия, как в квизе; совпало бы с другой главой
      // («Графы» и «Графы: продвинутые») — полное
      var short = list[i].t.split(":")[0];
      var clash = list.some(function (c, j) { return j !== i && c.t.split(":")[0] === short; });
      return { title: clash ? list[i].t : short, lvl: list[i].lvl };
    }
    return { title: slug, lvl: "" };
  }

  var LVL_TEXT = { core: "ядро", ext: "расширение", ref: "справочник" };

  function renderLeaf(leaf, done) {
    var info = chapterInfo(leaf.slug);
    var a = el("a", "gt-leaf gt-leaf--" + (info.lvl || "none"));
    a.href = leaf.slug + ".html";
    a.dataset.lvl = info.lvl;
    var title = el("span", "gt-leaf__t", info.title);
    a.appendChild(title);
    if (done[leaf.slug]) { a.classList.add("gt-leaf--done"); a.appendChild(el("span", "gt-leaf__done", "✓")); }
    var sub = [LVL_TEXT[info.lvl], leaf.note || leaf.extra].filter(Boolean).join(" · ");
    if (sub) a.appendChild(el("span", "gt-leaf__s", sub));
    a.title = leaf.name + (info.lvl ? " — " + LVL_TEXT[info.lvl] : "");
    return a;
  }

  function plural(n) {
    var d = n % 10, h = n % 100;
    return d === 1 && h !== 11 ? "глава" : d >= 2 && d <= 4 && (h < 12 || h > 14) ? "главы" : "глав";
  }

  function countLeaves(node) {
    return node.kids.reduce(function (n, k) { return n + countLeaves(k); }, node.leaves.length);
  }

  function renderNode(node, done) {
    var row = el("div", "gt-node");
    var q = el("button", "gt-q", node.text);
    q.type = "button";
    q.setAttribute("aria-expanded", "true");
    if (node.kids.length) q.dataset.n = countLeaves(node) + " " + plural(countLeaves(node)); // видно у свёрнутой группы
    row.appendChild(q);
    var kids = el("div", "gt-kids");
    node.leaves.forEach(function (lf) {
      var item = el("div", "gt-item");
      item.appendChild(renderLeaf(lf, done));
      kids.appendChild(item);
    });
    node.kids.forEach(function (k) {
      var item = el("div", "gt-item");
      item.appendChild(renderNode(k, done));
      kids.appendChild(item);
    });
    if (node.leaves.length && !node.kids.length) kids.classList.add("gt-kids--leaves");
    row.appendChild(kids);
    // группа подвопросов («Работа с графом?») свёрнута сначала: дерево помещается в пару экранов,
    // а одиночный вопрос сразу показывает ответ
    if (node.kids.length) { row.classList.add("gt-node--closed"); q.setAttribute("aria-expanded", "false"); }
    q.addEventListener("click", function () {
      var closed = row.classList.toggle("gt-node--closed");
      q.setAttribute("aria-expanded", String(!closed));
    });
    return row;
  }

  function build(host) {
    var pre = null;
    // первый <pre> после виджета в порядке документа (текстовое дерево может лежать в <details>)
    var all = document.querySelectorAll("pre");
    for (var i = 0; i < all.length; i++) {
      if (host.compareDocumentPosition(all[i]) & Node.DOCUMENT_POSITION_FOLLOWING) { pre = all[i]; break; }
    }
    if (!pre) { host.textContent = "Дерево решений не найдено."; return; }
    var tree = parseTree(pre.textContent);
    var done = {};
    try { done = window.ALGO_DONE ? window.ALGO_DONE() : {}; } catch (e) { done = {}; }

    host.innerHTML = "";
    host.classList.add("gt");
    var bar = el("div", "gt-bar");
    var bCore = el("button", "gt-btn", "Только ядро"); bCore.type = "button"; bCore.setAttribute("aria-pressed", "false");
    var bFold = el("button", "gt-btn", "Развернуть всё"); bFold.type = "button";
    bar.appendChild(bCore); bar.appendChild(bFold);
    var legend = el("span", "gt-legend");
    ["core", "ext", "ref"].forEach(function (l) {
      var s = el("span", "gt-legend__i gt-legend__i--" + l, LVL_TEXT[l]);
      legend.appendChild(s);
    });
    legend.appendChild(el("span", "gt-legend__i gt-legend__i--done", "✓ пройдена"));
    bar.appendChild(legend);
    host.appendChild(bar);

    var canvas = el("div", "gt-canvas");
    var kids = el("div", "gt-kids");
    tree.kids.forEach(function (k) {
      var item = el("div", "gt-item");
      item.appendChild(renderNode(k, done));
      kids.appendChild(item);
    });
    canvas.appendChild(kids);
    host.appendChild(canvas);

    bCore.addEventListener("click", function () {
      var on = host.classList.toggle("gt--core");
      bCore.setAttribute("aria-pressed", String(on));
    });
    bFold.addEventListener("click", function () {
      var nodes = host.querySelectorAll(".gt-kids .gt-node");
      var anyOpen = bFold.textContent === "Свернуть всё";
      Array.prototype.forEach.call(nodes, function (x) {
        if (!x.querySelector(":scope > .gt-kids > .gt-item > .gt-node")) return; // сворачиваются только группы
        x.classList.toggle("gt-node--closed", anyOpen);
        var b = x.querySelector(":scope > .gt-q");
        if (b) b.setAttribute("aria-expanded", String(!anyOpen));
      });
      bFold.textContent = anyOpen ? "Развернуть всё" : "Свернуть всё";
    });
    // путь от корня до плашки — вопросы, которые к ней привели
    canvas.addEventListener("mouseover", function (e) {
      var leaf = e.target.closest && e.target.closest(".gt-leaf");
      mark(leaf);
    });
    canvas.addEventListener("focusin", function (e) { mark(e.target.closest && e.target.closest(".gt-leaf")); });
    canvas.addEventListener("mouseleave", function () { mark(null); });
    function mark(leaf) {
      Array.prototype.forEach.call(host.querySelectorAll(".gt-on"), function (x) { x.classList.remove("gt-on"); });
      if (!leaf) return;
      leaf.classList.add("gt-on");
      for (var p = leaf.parentNode; p && p !== canvas; p = p.parentNode) {
        if (p.classList.contains("gt-item")) p.classList.add("gt-on");
        if (p.classList.contains("gt-node")) { var q = p.querySelector(":scope > .gt-q"); if (q) q.classList.add("gt-on"); }
      }
    }
  }

  if (typeof module !== "undefined" && module.exports) module.exports = { LEAVES: LEAVES, parseTree: parseTree, parseLeaf: parseLeaf };
  if (typeof window === "undefined" || typeof document === "undefined") return;
  window.ALGO_GUIDE_LEAVES = LEAVES;
  function init() { Array.prototype.forEach.call(document.querySelectorAll(".algo-guide-tree"), build); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
