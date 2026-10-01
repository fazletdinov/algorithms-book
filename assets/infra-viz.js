/* Инфраструктурные визуализации (Postgres, Redis, Kafka). Регистрируются в движке через
 * window.ALGO_VIZ.register. Генераторы — чистые функции, экспортируются для node-теста. */
(function () {
  "use strict";
  var exportsForTest = {};

  var PAGE_HDR = 24, ITEM = 4, TUP_HDR = 24;
  function maxAlign(n) { return (n + 7) & ~7; }

  // Формат: "+имя:байты" вставка, "-N" удаление слота N (с 1), "vacuum".
  function parseOps(str, pageSize) {
    // как MaxHeapTupleSize: строка длиннее не влезет даже на пустую страницу — Postgres
    // отвечает ошибкой «row is too big: … maximum size 8160», а не уносит её на другую страницу
    var max = (pageSize || 8192) - maxAlign(PAGE_HDR + ITEM) - TUP_HDR;
    var ops = [];
    String(str || "").split(",").forEach(function (raw) {
      var t = raw.trim();
      if (!t) return;
      if (t === "vacuum") { ops.push({ op: "vacuum" }); return; }
      if (t.charAt(0) === "-") { var n = parseInt(t.slice(1), 10); if (n > 0) ops.push({ op: "del", slot: n }); return; }
      if (t.charAt(0) === "+") {
        var p = t.slice(1).split(":"), d = parseInt(p[1], 10);
        if (p[0] && d > 0 && d <= max) ops.push({ op: "ins", name: p[0], data: d });
      }
    });
    return ops;
  }

  function bPgPage(ops, pageSize) {
    // Состояния указателя: normal (lp_flags 1, строка живая), deleted (тоже lp_flags 1, но у строки
    // проставлен xmax), dead (lp_flags 3: указатель есть, байтов строки за ним нет), unused (lp_flags 0).
    var slots = [], steps = [];
    function hasTuple(s) { return s.state === "normal" || s.state === "deleted"; }
    function lower() { return PAGE_HDR + ITEM * slots.length; }
    // upper — физический факт: нижний offset среди строк, что ещё лежат на странице. Не сумма длин:
    // место удалённых строк возвращается в upper только когда compact реально их выбросил.
    function upper() {
      var u = pageSize;
      slots.forEach(function (s) { if (hasTuple(s) && s.off < u) u = s.off; });
      return u;
    }
    function compact() { // как PageRepairFragmentation: физический порядок сохраняется, строки прижаты к концу
      var off = pageSize;
      slots.filter(hasTuple)
        .sort(function (a, b) { return b.off - a.off; })
        .forEach(function (s) { off -= s.len; s.off = off; });
      slots.forEach(function (s) { if (!hasTuple(s)) { s.off = 0; s.len = 0; } }); // как lp_off/lp_len = 0 в pageinspect
    }
    function snap(extra) {
      var o = { slots: slots.map(function (s) { return { n: s.n, state: s.state, name: s.name, off: s.off, len: s.len }; }), lower: lower(), upper: upper(), reserved: null };
      for (var k in extra) o[k] = extra[k];
      return o;
    }
    function v(op, o) { var r = { op: op, size: "—", slot: "—", need: "—", lower: lower(), upper: upper() }; for (var k in o) r[k] = o[k]; return r; }
    steps.push(snap({ line: 0, vars: v("—", {}), info: "Пустая страница " + pageSize + " Б: заголовок " + PAGE_HDR + " Б, остальное свободно. Указатели растут сверху, строки — снизу, навстречу." }));

    ops.forEach(function (op) {
      if (op.op === "ins") {
        var size = maxAlign(TUP_HDR + op.data), label = "Insert(" + op.name + ")";
        steps.push(snap({ line: 1, vars: v(label, { size: size }), info: "Строка «" + op.name + "»: заголовок " + TUP_HDR + " Б + данные " + op.data + " Б, выровнено до 8 → size = " + size + " Б" }));
        var slot = -1;
        for (var i = 0; i < slots.length; i++) if (slots[i].state === "unused") { slot = i; break; }
        steps.push(snap({ line: 2, vars: v(label, { size: size, slot: slot < 0 ? -1 : slot + 1 }), info: slot < 0 ? "Свободного указателя нет (-1) — заведём новый" : "Есть свободный указатель №" + (slot + 1) + " — переиспользуем" }));
        // Запас под указатель — всегда, даже когда найдётся старый unused: так считает
        // PageGetHeapFreeSpace, и строка, которой хватило бы места без этих 4 Б, уходит на
        // другую страницу (сверено вживую: free 2080 и свободный №1, строка 2080 Б → ctid (1,1)).
        var need = size + ITEM;
        steps.push(snap({ line: 3, vars: v(label, { size: size, slot: slot < 0 ? -1 : slot + 1, need: need }), info: "need = " + size + " + " + ITEM + (slot < 0 ? " (новый указатель)" : " (запас под указатель: Postgres требует его, даже когда берёт старый №" + (slot + 1) + ")") + " = " + need + " Б; свободно " + (upper() - lower()) + " Б" }));
        if (need > upper() - lower()) {
          // кадр на самой проверке — и в этой ветке: без него режим 🎯 не спрашивал бы
          // про единственный интересный исход (одна строка листинга — один кадр)
          steps.push(snap({ line: 4, vars: v(label, { size: size, slot: slot < 0 ? -1 : slot + 1, need: need }), info: "need " + need + " > свободно " + (upper() - lower()) + " — да, места не хватает" }));
          steps.push(snap({ line: 5, hot: true, vars: v(label, { size: size, slot: slot < 0 ? -1 : slot + 1, need: need }), info: "Не влезло: страница не меняется. Postgres положит строку на другую страницу (или добавит новую)" }));
          return;
        }
        var reserveOff = upper() - size; // новая строка кладётся под нижнюю, остальные не двигаются
        var newSlot = slot < 0 ? { n: slots.length + 1, state: "normal", name: op.name, off: reserveOff, len: size } : null;
        var target = newSlot || slots[slot];
        steps.push(snap({ line: 4, vars: v(label, { size: size, slot: slot < 0 ? -1 : slot + 1, need: need }), info: "need " + need + " ≤ свободно " + (upper() - lower()) + " — нет, место есть, вставка пройдёт" }));
        // upper сдвигается ДО появления указателя и tuple: резерв места
        steps.push({ slots: snap({}).slots, lower: lower(), upper: reserveOff, reserved: { off: reserveOff, len: size }, line: 7, vars: v(label, { size: size, slot: slot < 0 ? -1 : slot + 1, need: need, upper: reserveOff }), info: "upper -= " + size + ": место под строку отрезано от свободной зоны" });
        if (newSlot) slots.push(newSlot); else { target.state = "normal"; target.name = op.name; target.len = size; target.off = reserveOff; }
        steps.push({ slots: snap({}).slots.map(function (s) { return s.n === target.n ? { n: s.n, state: s.state, name: s.name, off: s.off, len: s.len, ptrOnly: true } : s; }), lower: lower(), upper: upper(), reserved: { off: target.off, len: size }, line: 8, vars: v(label, { size: size, slot: target.n, need: need }), info: "setPointer: указатель №" + target.n + " → смещение " + target.off + (newSlot ? "; lower вырос на " + ITEM : "; lower не изменился") });
        steps.push(snap({ line: 9, vars: v(label, { size: size, slot: target.n, need: need }), info: "Данные записаны по смещению " + target.off + ". Строка «" + op.name + "» лежит в слоте №" + target.n }));
        steps.push(snap({ line: 10, vars: v(label, { size: size, slot: target.n, need: need }), info: "Готово: lower=" + lower() + ", upper=" + upper() + ", свободно " + (upper() - lower()) + " Б" }));
      } else if (op.op === "del") {
        var s = slots[op.slot - 1];
        if (!s || s.state !== "normal") {
          steps.push(snap({ line: 13, hot: true, vars: v("Delete(" + op.slot + ")", {}), info: !s ? "Слота №" + op.slot + " нет — удалять нечего" : "Слот №" + op.slot + " уже удалён" }));
          return;
        }
        s.state = "deleted";
        steps.push(snap({ line: 13, vars: v("Delete(" + op.slot + ")", { slot: op.slot }), info: "xmax проставлен: строка «" + s.name + "» невидима для новых транзакций, но её " + s.len + " Б всё ещё заняты — место вернёт очистка страницы (здесь — VACUUM)" }));
      } else {
        var dead = slots.filter(function (x) { return x.state === "deleted"; });
        if (!dead.length) {
          steps.push(snap({ line: 16, hot: true, vars: v("Vacuum", {}), info: "Удалённых строк нет — чистить нечего" }));
          return;
        }
        // Порядок как в Postgres 16 (сверено pageinspect): сначала строки выбрасываются и страница
        // сжимается, а их указатели остаются — dead (lp_flags 3); unused они становятся следующим
        // шагом. В Postgres между ними — чистка индексов; у виджета индексов нет.
        var nums = dead.map(function (x) { return "№" + x.n; }).join(", ");
        dead.forEach(function (x) { x.state = "dead"; });
        compact();
        steps.push(snap({ line: 16, hot: true, vars: v("Vacuum", {}), info: "compact: байты удалённых строк выброшены, живые сдвинуты к концу страницы — upper вырос до " + upper() + ". Указатели " + nums + " остались, но строк за ними нет — dead (lp_flags = 3)" }));
        dead.forEach(function (x) { x.state = "unused"; });
        steps.push(snap({ line: 17, vars: v("Vacuum", {}), info: "Указатели " + nums + ": dead → unused (lp_flags = 0), номера можно отдать новым строкам. В Postgres — только после чистки индексов, которые на них ссылались" }));
        var before = slots.length;
        // как PageTruncateLinePointerArray: хвост unused отрезается, но указатель №1 — никогда
        // (сверено вживую: страница, где удалено всё, после VACUUM — lower 28, №1 unused)
        while (slots.length > 1 && slots[slots.length - 1].state === "unused") slots.pop();
        var cut = slots.length < before, info18;
        if (slots.length === 1 && slots[0].state === "unused") info18 = (cut ? "Хвост unused отрезан до одного: " : "") + "указатель №1 остаётся даже на пустой странице — его Postgres не отрезает, lower = " + lower();
        else info18 = cut ? "Хвостовые unused-указатели отрезаны: lower уменьшился до " + lower() : "Хвоста из unused нет — lower не изменился (указатель в середине останется ждать новую строку)";
        steps.push(snap({ line: 18, vars: v("Vacuum", {}), info: info18 }));
      }
    });
    var alive = slots.filter(function (x) { return x.state === "normal"; }).length, m10 = alive % 10, m100 = alive % 100;
    var aliveText = alive + (m10 === 1 && m100 !== 11 ? " живая строка" : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? " живых строки" : " живых строк");
    steps.push(snap({ done: true, line: 19, vars: v("готово", {}), info: "Итог: " + aliveText + ", свободно " + (upper() - lower()) + " Б из " + pageSize }));
    return steps;
  }
  // ===== Сканы таблицы: Seq / Index / Bitmap ===================================
  // Модель: P страниц по R строк; строка r лежит на странице floor(r/R). matches — id подходящих
  // строк в порядке КЛЮЧА индекса: именно в этом порядке idx.Lookup отдаёт ctid. Планировщик и
  // стоимость не моделируются — только «сколько раз прочитали страницу таблицы».
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function shuffled(n, seed) {
    var a = [], rnd = mulberry32(seed), i, j, k, t;
    for (i = 0; i < n; i++) a.push(i);
    for (j = n - 1; j > 0; j--) { k = Math.floor(rnd() * (j + 1)); t = a[j]; a[j] = a[k]; a[k] = t; }
    return a;
  }
  // Токены через запятую: N | a-b | rK (K псевдослучайных строк в псевдослучайном порядке).
  function parseMatch(str, total) {
    var out = [], seen = {};
    function add(r) { if (r >= 0 && r < total && !seen[r]) { seen[r] = true; out.push(r); } }
    String(str || "").split(",").forEach(function (raw) {
      var t = raw.trim(), m = /^(\d+)-(\d+)$/.exec(t);
      if (m) { for (var r = +m[1]; r <= +m[2] && r < total; r++) add(r); return; }
      m = /^r(\d+)$/.exec(t);
      if (m) { shuffled(total, total * 31 + +m[1]).slice(0, +m[1]).forEach(function (x) { add(x); }); return; }
      if (/^\d+$/.test(t)) add(+t);
    });
    return out;
  }

  // Общее состояние сканирования: snap() копирует всё, что рисуется, поэтому кадры не делят ссылок.
  function scanState(P, R) {
    var st = { P: P, R: R, reads: [], bits: [], found: [], cur: -1, total: 0, steps: [] };
    for (var i = 0; i < P; i++) { st.reads.push(0); st.bits.push(false); }
    st.read = function (page) { st.reads[page]++; st.total++; };
    st.snap = function (line, vars, info, extra) {
      var s = { P: P, R: R, line: line, vars: vars, info: info, reads: st.reads.slice(), bits: st.bits.slice(), found: st.found.slice(), cur: st.cur, total: st.total, tid: null, mark: null };
      for (var k in extra) s[k] = extra[k];
      st.steps.push(s);
    };
    return st;
  }
  function tidOf(r, R) { return { page: Math.floor(r / R), slot: r % R }; }
  function tidText(t) { return "(" + t.page + "," + t.slot + ")"; }
  function rowsOnPage(page, R, matchSet) { var out = []; for (var s = 0; s < R; s++) if (matchSet[page * R + s]) out.push(page * R + s); return out; }
  function matchSetOf(matches) { var m = {}; matches.forEach(function (r) { m[r] = true; }); return m; }
  function plural(n, one, few, many) { var a = n % 100, b = n % 10; return (a >= 11 && a <= 14) ? many : b === 1 ? one : (b >= 2 && b <= 4) ? few : many; }
  function pages(n) { return n + " " + plural(n, "страница", "страницы", "страниц"); }

  function bScanSeq(P, R, matches) {
    var st = scanState(P, R), ms = matchSetOf(matches);
    st.snap(1, { page: "—" }, "Таблица: " + pages(P) + " по " + R + " строк. Подходящих строк: " + matches.length + ". Seq Scan читает ВСЕ страницы подряд — без индекса.");
    for (var p = 0; p < P; p++) {
      st.snap(2, { page: p }, "page = " + p, { mark: p });
      st.read(p); st.cur = p;
      st.snap(3, { page: p }, "ReadPage(" + p + "): страница целиком в буфере. Чтений: " + st.total + " из " + P, { mark: p });
      var here = rowsOnPage(p, R, ms);
      here.forEach(function (r) { st.found.push(r); });
      st.snap(4, { page: p }, here.length ? "Проверили " + R + " строк, подошло: " + here.length + " (всего найдено " + st.found.length + ")" : "Проверили " + R + " строк — ни одна не подошла, но страницу уже прочитали", { mark: p });
    }
    st.snap(6, { page: P - 1 }, "Итог: " + pages(st.total) + " прочитано ради " + st.found.length + " строк. Не зависит от того, сколько строк подошло.", { done: true });
    return st.steps;
  }

  function bScanIndex(P, R, matches) {
    var st = scanState(P, R);
    st.snap(1, { tid: "—", cur: "—" }, "Index Scan: индекс отдаёт ctid подходящих строк в порядке КЛЮЧА, а строки таблицы лежат как попало.");
    st.snap(2, { tid: "—", cur: -1 }, "cur = −1: в буфере пока ни одной страницы таблицы");
    matches.forEach(function (r) {
      var t = tidOf(r, R), tt = tidText(t), fresh = t.page !== st.cur;
      st.snap(3, { tid: tt, cur: st.cur }, "Следующий ctid из индекса: " + tt + " — страница " + t.page + ", слот " + t.slot, { tid: t, mark: t.page });
      st.snap(4, { tid: tt, cur: st.cur }, fresh ? "tid.Page (" + t.page + ") ≠ cur (" + st.cur + ") — страницу придётся читать" : "tid.Page = cur = " + st.cur + " — страница уже в буфере, читать не нужно", { tid: t, mark: t.page });
      if (fresh) {
        var again = st.reads[t.page] > 0;
        st.read(t.page);
        st.snap(5, { tid: tt, cur: st.cur }, "ReadPage(" + t.page + ")" + (again ? " — ПОВТОРНО (×" + st.reads[t.page] + "): к этой странице уже ходили, но между обращениями индекс уводил на другие" : "") + ". Чтений: " + st.total, { tid: t, mark: t.page });
        st.cur = t.page;
        st.snap(6, { tid: tt, cur: st.cur }, "cur = " + t.page, { tid: t, mark: t.page });
      }
      st.found.push(r);
      st.snap(8, { tid: tt, cur: st.cur }, "Строка " + tt + " добавлена в результат (" + st.found.length + " из " + matches.length + ")", { tid: t, mark: t.page });
    });
    st.snap(10, { tid: "—", cur: st.cur }, "Итог: " + pages(st.total) + " прочитано ради " + matches.length + " строк" + (st.total > P ? " — БОЛЬШЕ, чем в таблице (" + P + ")" : "") + ".", { done: true });
    return st.steps;
  }

  function bScanBitmap(P, R, matches) {
    var st = scanState(P, R), ms = matchSetOf(matches);
    st.snap(1, { tid: "—", page: "—" }, "Bitmap Scan: сначала по индексу собираем карту нужных страниц, потом читаем страницы по порядку.");
    matches.forEach(function (r) {
      var t = tidOf(r, R), tt = tidText(t), had = st.bits[t.page];
      st.snap(2, { tid: tt, page: "—" }, "Следующий ctid из индекса: " + tt, { tid: t, mark: t.page });
      st.bits[t.page] = true;
      st.snap(3, { tid: tt, page: "—" }, had ? "Бит страницы " + t.page + " уже стоит — порядок ключа забыт, повтор ничего не стоит" : "bitmap[" + t.page + "] = true: запомнили только номер страницы", { tid: t, mark: t.page });
    });
    var set = []; st.bits.forEach(function (b, i) { if (b) set.push(i); });
    st.snap(5, { tid: "—", page: "—" }, "Карта готова: нужных страниц " + set.length + " из " + P);
    set.forEach(function (p) {
      st.snap(6, { tid: "—", page: p }, "Следующая страница по возрастанию: " + p, { mark: p });
      st.read(p); st.cur = p;
      st.snap(7, { tid: "—", page: p }, "ReadPage(" + p + ") — ровно один раз. Чтений: " + st.total, { mark: p });
      var here = rowsOnPage(p, R, ms);
      here.forEach(function (r) { st.found.push(r); });
      st.snap(8, { tid: "—", page: p }, "Recheck: из " + R + " строк подошло " + here.length + " (найдено " + st.found.length + ")", { mark: p });
    });
    st.snap(10, { tid: "—", page: set.length ? set[set.length - 1] : "—" }, "Итог: " + pages(st.total) + " прочитано ради " + matches.length + " строк — каждая нужная страница по одному разу, никогда больше " + P + ".", { done: true });
    return st.steps;
  }
  exportsForTest.parseMatch = parseMatch;
  exportsForTest.bScanSeq = bScanSeq;
  exportsForTest.bScanIndex = bScanIndex;
  exportsForTest.bScanBitmap = bScanBitmap;
  exportsForTest.bPgPage = bPgPage;
  exportsForTest.parseOps = parseOps;
  exportsForTest.maxAlign = maxAlign;
  if (typeof module !== "undefined" && module.exports) module.exports = exportsForTest;
  if (typeof window === "undefined" || !window.ALGO_VIZ) return;

  function pgPageViz(panel, ctx) {
    var H = window.ALGO_VIZ, size = ctx.page;
    var wrap = H.mkEl("div", "iv-page");
    panel.appendChild(wrap);
    var MIN_SHARE = 0.008;
    return function (s) {
      wrap.innerHTML = "";
      var bar = H.mkEl("div", "iv-bar");
      var freeBytes = s.upper - s.lower;
      var specs = [{ cls: "iv-seg--hdr", bytes: PAGE_HDR, label: "hdr" }];
      var ptrCls = { unused: "iv-seg--unused", dead: "iv-seg--deadptr" };
      s.slots.forEach(function (sl) { specs.push({ cls: ptrCls[sl.state] || "iv-seg--ptr", bytes: ITEM, label: "№" + sl.n }); });
      specs.push({ cls: "iv-seg--free", bytes: Math.max(freeBytes, 0), label: freeBytes > size * 0.06 ? "свободно " + freeBytes + " Б" : "" });
      // Зона строк — от upper до конца страницы, по смещениям. Строки лежат в ней вплотную на
      // каждом кадре: удалённые занимают место до compact, а compact выбрасывает их и сжимает
      // страницу за один шаг (как в Postgres), так что «дыр» между строками не бывает.
      var zone = s.slots.filter(function (x) { return (x.state === "normal" || x.state === "deleted") && !x.ptrOnly && x.off; }).map(function (t) {
        return { off: t.off, bytes: t.len, cls: t.state === "deleted" ? "iv-seg--dead" : "iv-seg--tup", label: t.name + (t.state === "deleted" ? " ✗" : "") };
      });
      if (s.reserved && !zone.some(function (z) { return z.off === s.reserved.off; })) zone.push({ off: s.reserved.off, bytes: s.reserved.len, cls: "iv-seg--reserved", label: "резерв" });
      zone.sort(function (a, b) { return a.off - b.off; }).forEach(function (z) { specs.push(z); });
      // ширина = доля байт, но непустой сегмент не уже MIN_SHARE; затем весь набор
      // масштабируется к 100%, чтобы мелочь не вытесняла соседей за край полосы
      var weights = specs.map(function (sp) { return sp.bytes > 0 ? Math.max(sp.bytes / size, MIN_SHARE) : 0; });
      var total = weights.reduce(function (acc, w) { return acc + w; }, 0) || 1;
      specs.forEach(function (sp, i) {
        // подпись — только там, где она помещается: обрезанное «hdr» читалось как строка «d»
        var e = H.mkEl("div", "iv-seg " + sp.cls, weights[i] / total >= 0.04 ? sp.label : "");
        e.style.flexBasis = (weights[i] / total * 100) + "%";
        e.title = sp.label + " · " + sp.bytes + " Б";
        bar.appendChild(e);
      });
      wrap.appendChild(bar);
      // На телефоне «свободно 2084 Б» не влезает в свой сегмент и обрезалось с двух сторон до
      // «ободно 2084» — обрубленное число хуже никакого: убираем подпись (она есть в линейке ниже)
      Array.prototype.forEach.call(bar.children, function (e) { if (e.textContent && e.scrollWidth > e.clientWidth + 1) e.textContent = ""; });
      var ruler = H.mkEl("div", "iv-ruler");
      ruler.appendChild(H.mkEl("span", "", "lower = " + s.lower));
      ruler.appendChild(H.mkEl("span", "iv-ruler__free", "← свободно " + freeBytes + " Б →"));
      ruler.appendChild(H.mkEl("span", "", "upper = " + s.upper));
      wrap.appendChild(ruler);
      var tbl = H.mkEl("table", "iv-slots");
      // короткие заголовки — для телефона: полные не влезали в 360 px, и таблица уезжала вбок
      var head = H.mkEl("tr");
      [["указатель", "№"], ["состояние", "сост."], ["строка", "строка"], ["смещение", "смещ."], ["байт", "Б"]].forEach(function (h) {
        var th = H.mkEl("th");
        th.appendChild(H.mkEl("span", "iv-th-l", h[0]));
        th.appendChild(H.mkEl("span", "iv-th-s", h[1]));
        head.appendChild(th);
      });
      tbl.appendChild(head);
      var names = { normal: "живая", deleted: "удалена (xmax)", dead: "dead (lp_flags=3)", unused: "unused (lp_flags=0)" };
      s.slots.forEach(function (sl) {
        var r = H.mkEl("tr", "iv-slots__" + sl.state);
        var empty = sl.state === "unused" || sl.state === "dead"; // строки за указателем нет, как lp_off/lp_len = 0
        [sl.n, names[sl.state], empty ? "—" : sl.name, empty ? "—" : sl.off, empty ? "—" : sl.len].forEach(function (c) { r.appendChild(H.mkEl("td", "", String(c))); });
        tbl.appendChild(r);
      });
      if (!s.slots.length) { var er = H.mkEl("tr"); var td = H.mkEl("td", "", "указателей нет"); td.colSpan = 5; er.appendChild(td); tbl.appendChild(er); }
      wrap.appendChild(tbl);
    };
  }

  var CODE = {
    "pg-page": [
      "func (p *Page) Insert(data []byte) (int, bool) {",
      "    size := maxAlign(tupleHeader + len(data))",
      "    slot := p.firstUnused() // -1: свободного указателя нет",
      "    need := size + itemIdSize // 4 Б под указатель — даже если найдётся старый",
      "    if need > p.upper-p.lower {",
      "        return 0, false // не влезло: строка уйдёт на другую страницу",
      "    }",
      "    p.upper -= size",
      "    slot = p.setPointer(slot, p.upper) // -1 → номер нового указателя",
      "    copy(p.buf[p.upper:], data)",
      "    return slot, true",
      "}",
      "func (p *Page) Delete(slot int) {",
      "    p.tuple(slot).xmax = txid // помечена, но место НЕ освобождено",
      "}",
      "func (p *Page) Vacuum() {",
      "    p.compact() // удалённые строки выброшены, живые сдвинуты к концу; их указатели → dead",
      "    p.freeDeadPointers() // dead → unused (в Postgres — после чистки индексов)",
      "    p.truncateTrailingPointers() // хвост unused-указателей: lower уменьшается",
      "}"
    ]
  };

  var INFRA = {
    "pg-page": {
      badge: "Postgres · страница 8 КБ",
      desc: "Страница кучи Postgres: заголовок, массив указателей (растёт сверху вниз) и строки (растут снизу вверх). Между ними — свободное место. DELETE место не освобождает — его возвращает очистка страницы (VACUUM).",
      valuesLabel: "", codeKey: "pg-page", fillRange: false,
      complexity: { time: "вставка O(1)", space: "8192 Б на страницу", good: "★ 1 чтение = 1 страница" },
      varOrder: ["size", "slot", "need", "lower", "upper"],
      varDesc: { size: "Размер строки (выровнено до 8)", slot: "Слот (указатель)", need: "Сколько байт нужно", lower: "Конец массива указателей", upper: "Начало зоны строк" },
      lineNotes: { 1: "Заголовок tuple 24 Б + данные, округление вверх до кратного 8", 2: "Ищем освободившийся указатель — переиспользуем", 3: "4 байта под указатель Postgres требует всегда — даже когда переиспользует старый", 4: "Хватит ли места между lower и upper?", 5: "Нет — строка уедет на другую страницу", 7: "Зона строк растёт снизу вверх: upper уменьшается", 8: "Указатель записан; lower растёт, если слот новый", 9: "Сами байты строки — по смещению upper", 13: "DELETE лишь ставит xmax: байты остаются", 16: "Байты удалённых строк выброшены, живые сдвинуты к концу; указатели остаются — dead", 17: "dead → unused: номер можно отдать новой строке (в Postgres — только после чистки индексов)", 18: "Хвост неиспользуемых указателей отрезается (кроме №1)" },
      rules: [{ head: "указатели", body: "растут сверху", cls: "eq" }, { head: "строки", body: "растут снизу", cls: "gt" }, { head: "DELETE", body: "место не возвращает", cls: "lt" }],
      legend: [{ cls: "iv-seg--hdr", label: "заголовок страницы (24 Б)" }, { cls: "iv-seg--ptr", label: "указатель на строку (4 Б)" }, { cls: "iv-seg--tup", label: "живая строка" }, { cls: "iv-seg--dead", label: "удалена, место занято" }, { cls: "iv-seg--deadptr", label: "указатель dead — строки нет, номер ещё занят" }, { cls: "iv-seg--unused", label: "указатель unused — ждёт новую строку" }, { cls: "iv-seg--free", label: "свободное место" }],
      presets: [
        // не «пример главы»: эту кнопку движок ставит сам, и во втором виджете главы она другая
        { label: "пятая не влезла", set: { "data-ops": "+a:2000,+b:2000,+c:2000,+d:2000,+e:2000", "data-page": "8192" }, hint: "4 строки влезли, пятая — нет" },
        { label: "узкие строки", set: { "data-ops": "+a:100,+b:100,+c:100,+d:100,+e:100,+f:100", "data-page": "8192" }, hint: "указатели тоже стоят места" },
        { label: "DELETE без VACUUM", set: { "data-ops": "+a:2000,+b:2000,+c:2000,-1,-2,+d:2000,+e:2000", "data-page": "8192" }, hint: "удалённое место не вернулось" },
        { label: "DELETE + VACUUM", set: { "data-ops": "+a:2000,+b:2000,+c:2000,-1,-2,vacuum,+d:2000,+e:2000", "data-page": "8192" }, hint: "после VACUUM место снова есть" },
        { label: "впритык", set: { "data-ops": "+a:2000,+b:2000,+c:2000,+d:2056", "data-page": "8192" }, hint: "free = 0, но влезло" }
      ],
      parse: function (root) {
        var page = parseInt(root.getAttribute("data-page"), 10);
        if (!(page >= 256)) page = 8192;
        var ops = parseOps(root.getAttribute("data-ops") || "+a:2000,+b:2000,+c:2000,+d:2000,+e:2000", page);
        return { ops: ops, page: page, steps: bPgPage(ops, page) };
      },
      inputs: [{ attr: "data-ops", label: "Операции (+имя:байты, -слот, vacuum)" }, { attr: "data-page", label: "Размер страницы" }],
      values: function () { return []; },
      title: function (ctx) { return "Страница " + ctx.page + " Б, " + ctx.ops.length + " операций"; },
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Операция", "lower", "upper"],
      sumValues: function (s) { return [{ text: s.vars.op, cls: "gt" }, { text: s.vars.lower }, { text: s.vars.upper }]; },
      status: function (s, idx, total) { if (s.done) return { kind: "ok", icon: "✓", head: "Готово", text: s.info }; return { kind: "info", hot: !!s.hot, icon: idx + 1, head: s.hot ? "Внимание" : "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { return { a: s.vars.op, b: "lower " + s.vars.lower, c: "upper " + s.vars.upper, cls: "gt" }; },
      varsOf: function (s) { return { size: s.vars.size, slot: s.vars.slot, need: s.vars.need, lower: s.vars.lower, upper: s.vars.upper }; },
      customViz: pgPageViz
    }
  };

  Object.keys(INFRA).forEach(function (t) { window.ALGO_VIZ.register(t, INFRA[t], CODE[INFRA[t].codeKey]); });
})();
