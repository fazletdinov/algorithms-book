/*
 * course-map-view.js — карта курса: <div class="algo-course-map"></div>.
 *
 * Своих данных нет: колонки и главы — GROUPS из progress.js (ALGO_CHAPTERS + группы ниже по href),
 * стрелки «стоит на» — course-map.js (генерируется из «Вспомни» глав), путаемые пары — pairs.js,
 * отметки — ALGO_DONE. Узел — ссылка на главу; наведение показывает, на что глава опирается
 * (янтарь), что опирается на неё (зелёный) и с чем её путают (фиолетовый пунктир).
 */
(function () {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  var SVGNS = "http://www.w3.org/2000/svg";
  var LVL_TEXT = { core: "ядро", ext: "расширение", ref: "справочник" };

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function svg(tag, attrs) {
    var e = document.createElementNS(SVGNS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  function slugOf(h) { return h.replace(/\.html$/, ""); }
  function shortTitle(t, all) {
    var s = t.split(":")[0];
    var clash = all.some(function (c) { return c.t !== t && c.t.split(":")[0] === s; });
    return clash ? t : s;
  }

  function build(host) {
    var groups = window.ALGO_GROUPS || [];
    var chapters = window.ALGO_CHAPTERS || [];
    var leans = window.ALGO_COURSE_LEANS || {};
    var pairs = window.ALGO_PAIRS || [];
    if (!groups.length) { host.textContent = "Карта курса не загрузилась."; return; }
    var done = {};
    try { done = window.ALGO_DONE ? window.ALGO_DONE() : {}; } catch (e) { done = {}; }

    host.innerHTML = "";
    host.classList.add("cm");
    var bar = el("div", "cm-bar");
    var bAll = el("button", "cm-btn", "Показать расширение и справочник"); bAll.type = "button"; bAll.setAttribute("aria-pressed", "false");
    var bLinks = el("button", "cm-btn", "Все связи"); bLinks.type = "button"; bLinks.setAttribute("aria-pressed", "false");
    var bPairs = el("button", "cm-btn", "Путаемые пары"); bPairs.type = "button"; bPairs.setAttribute("aria-pressed", "false");
    bar.appendChild(bAll); bar.appendChild(bLinks); bar.appendChild(bPairs);
    var legend = el("span", "cm-legend");
    legend.innerHTML = '<span class="cm-lg cm-lg--lean">стоит на</span><span class="cm-lg cm-lg--dep">на неё опирается</span>' +
      '<span class="cm-lg cm-lg--pair">путают с</span><span class="cm-lg cm-lg--done">✓ пройдена</span><span class="cm-lg cm-lg--next">ты здесь</span>';
    bar.appendChild(legend);
    host.appendChild(bar);

    var board = el("div", "cm-board");
    var lines = svg("svg", { class: "cm-lines", "aria-hidden": "true" });
    board.appendChild(lines);
    var cols = el("div", "cm-cols");
    board.appendChild(cols);
    host.appendChild(board);

    var nodes = {};
    var next = null;
    chapters.forEach(function (c) { if (!next && c.lvl === "core" && !done[slugOf(c.h)]) next = slugOf(c.h); });

    groups.forEach(function (g) {
      var items = g.items.filter(function (c) { return c.lvl !== "tool"; });
      if (!items.length) return;
      var col = el("div", "cm-col");
      if (!items.some(function (c) { return c.lvl === "core"; })) col.classList.add("cm-col--noncore");
      col.appendChild(el("div", "cm-col__t", g.g.replace(/^Группа \d+:\s*/, "")));
      items.forEach(function (c) {
        var slug = slugOf(c.h);
        var a = el("a", "cm-node cm-node--" + c.lvl);
        a.href = c.h;
        a.dataset.slug = slug;
        a.appendChild(el("span", "cm-node__t", shortTitle(c.t, chapters)));
        if (done[slug]) { a.classList.add("cm-node--done"); a.appendChild(el("span", "cm-node__done", "✓")); }
        if (slug === next) { a.classList.add("cm-node--next"); a.appendChild(el("span", "cm-node__next", "ты здесь")); }
        a.title = c.t + " — " + LVL_TEXT[c.lvl];
        col.appendChild(a);
        nodes[slug] = a;
      });
      cols.appendChild(col);
    });

    // рёбра: опора → глава; пары — без направления
    var edges = [];
    Object.keys(leans).forEach(function (to) {
      leans[to].forEach(function (from) { if (nodes[from] && nodes[to]) edges.push({ from: from, to: to, kind: "lean" }); });
    });
    pairs.forEach(function (p) { if (nodes[p.use] && nodes[p.not]) edges.push({ from: p.use, to: p.not, kind: "pair" }); });

    function visible(slug) { return nodes[slug].offsetParent !== null; }

    function draw() {
      while (lines.firstChild) lines.removeChild(lines.firstChild);
      var box = board.getBoundingClientRect();
      lines.setAttribute("width", board.scrollWidth);
      lines.setAttribute("height", board.scrollHeight);
      var defs = svg("defs", {});
      ["lean", "on-lean", "on-dep"].forEach(function (k) {
        var m = svg("marker", { id: "cm-arrow-" + k + "-" + uid, viewBox: "0 0 8 8", refX: "7", refY: "4", markerWidth: "7", markerHeight: "7", orient: "auto-start-reverse" });
        m.appendChild(svg("path", { d: "M0,0 L8,4 L0,8 z", class: "cm-arrowhead cm-arrowhead--" + k }));
        defs.appendChild(m);
      });
      lines.appendChild(defs);
      edges.forEach(function (e) {
        if (!visible(e.from) || !visible(e.to)) return;
        // все рёбра сразу — каша: по умолчанию только связи главы под мышью, остальное — кнопками
        var mine = focus && (e.from === focus || e.to === focus);
        if (!mine && !host.classList.contains(e.kind === "pair" ? "cm--pairs" : "cm--links")) return;
        var a = nodes[e.from].getBoundingClientRect(), b = nodes[e.to].getBoundingClientRect();
        var ox = box.left - board.scrollLeft, oy = box.top - board.scrollTop;
        var d;
        if (Math.abs(a.left - b.left) < 4) { // одна колонка: дуга слева
          var x = a.left - ox, y1 = a.top + a.height / 2 - oy, y2 = b.top + b.height / 2 - oy;
          var bend = Math.min(60, 18 + Math.abs(y2 - y1) / 6);
          d = "M" + x + "," + y1 + " C" + (x - bend) + "," + y1 + " " + (x - bend) + "," + y2 + " " + x + "," + y2;
        } else {
          var fwd = a.left < b.left;
          var sx = (fwd ? a.right : a.left) - ox, sy = a.top + a.height / 2 - oy;
          var tx = (fwd ? b.left : b.right) - ox, ty = b.top + b.height / 2 - oy;
          var dx = Math.max(30, Math.abs(tx - sx) / 2) * (fwd ? 1 : -1);
          d = "M" + sx + "," + sy + " C" + (sx + dx) + "," + sy + " " + (tx - dx) + "," + ty + " " + tx + "," + ty;
        }
        var p = svg("path", { d: d, class: "cm-edge cm-edge--" + e.kind });
        p.dataset.from = e.from; p.dataset.to = e.to; p.dataset.kind = e.kind;
        if (e.kind === "lean") p.setAttribute("marker-end", "url(#cm-arrow-lean-" + uid + ")");
        e.path = p;
        lines.appendChild(p);
      });
      light(focus);
    }

    var focus = null;
    function light(slug) {
      focus = slug;
      host.classList.toggle("cm--focus", !!slug);
      Object.keys(nodes).forEach(function (s) { nodes[s].classList.remove("cm-on", "cm-lean", "cm-dep", "cm-pair"); });
      edges.forEach(function (e) {
        if (!e.path) return;
        e.path.classList.remove("cm-edge--onlean", "cm-edge--ondep", "cm-edge--onpair");
        e.path.removeAttribute("data-hot");
        if (e.kind === "lean") e.path.setAttribute("marker-end", "url(#cm-arrow-lean-" + uid + ")");
      });
      if (!slug) return;
      nodes[slug].classList.add("cm-on");
      edges.forEach(function (e) {
        if (!e.path) return;
        if (e.kind === "pair" && (e.from === slug || e.to === slug)) {
          nodes[e.from === slug ? e.to : e.from].classList.add("cm-pair");
          e.path.classList.add("cm-edge--onpair"); e.path.setAttribute("data-hot", "1");
        } else if (e.kind === "lean" && e.to === slug) {
          nodes[e.from].classList.add("cm-lean");
          e.path.classList.add("cm-edge--onlean"); e.path.setAttribute("data-hot", "1");
          e.path.setAttribute("marker-end", "url(#cm-arrow-on-lean-" + uid + ")");
        } else if (e.kind === "lean" && e.from === slug) {
          nodes[e.to].classList.add("cm-dep");
          e.path.classList.add("cm-edge--ondep"); e.path.setAttribute("data-hot", "1");
          e.path.setAttribute("marker-end", "url(#cm-arrow-on-dep-" + uid + ")");
        }
      });
    }
    var uid = Math.random().toString(36).slice(2, 8);

    function onNode(e) {
      var n = e.target.closest && e.target.closest(".cm-node");
      var s = n ? n.dataset.slug : null;
      if (s === focus) return;
      focus = s;
      draw(); // набор рёбер зависит от фокуса
    }
    cols.addEventListener("mouseover", onNode);
    cols.addEventListener("focusin", onNode);
    board.addEventListener("mouseleave", function () { focus = null; light(null); draw(); });
    bLinks.addEventListener("click", function () {
      var on = host.classList.toggle("cm--links");
      bLinks.setAttribute("aria-pressed", String(on));
      draw();
    });

    bAll.addEventListener("click", function () {
      var on = host.classList.toggle("cm--all");
      bAll.setAttribute("aria-pressed", String(on));
      bAll.textContent = on ? "Только ядро" : "Показать расширение и справочник";
      draw();
    });
    bPairs.addEventListener("click", function () {
      var on = host.classList.toggle("cm--pairs");
      bPairs.setAttribute("aria-pressed", String(on));
      draw();
    });

    draw();
    if (window.ResizeObserver) new ResizeObserver(function () { (window.requestAnimationFrame || setTimeout)(draw); }).observe(board);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
    host.__cm = { nodes: nodes, edges: edges, light: light, draw: draw, next: next };
  }

  function init() { Array.prototype.forEach.call(document.querySelectorAll(".algo-course-map"), build); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
