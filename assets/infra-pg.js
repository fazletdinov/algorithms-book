/* Инфраструктурные визуализации темы Postgres. Регистрируются в движке через
 * window.ALGO_VIZ.register; общие помощники — в infra-core.js. Генераторы — чистые функции,
 * экспортируются для node-теста. */
(function () {
  "use strict";
  var exportsForTest = {};
  var core = (typeof module !== "undefined" && module.exports) ? require("./infra-core.js") : window.ALGO_VIZ_INFRA;

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
  // Токены через запятую: N | a-b | rK (K псевдослучайных строк в псевдослучайном порядке).
  function parseMatch(str, total) {
    var out = [], seen = {};
    function add(r) { if (r >= 0 && r < total && !seen[r]) { seen[r] = true; out.push(r); } }
    String(str || "").split(",").forEach(function (raw) {
      var t = raw.trim(), m = /^(\d+)-(\d+)$/.exec(t);
      if (m) { for (var r = +m[1]; r <= +m[2] && r < total; r++) add(r); return; }
      m = /^r(\d+)$/.exec(t);
      if (m) { core.shuffled(total, total * 31 + +m[1]).slice(0, +m[1]).forEach(function (x) { add(x); }); return; }
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
  // В ctid Postgres указатели нумеруются с 1 — «(0,1)» — первая строка страницы (вживую: SELECT ctid).
  // slot внутри модели — индекс ячейки сетки с 0, поэтому в тексте +1.
  function tidText(t) { return "(" + t.page + "," + (t.slot + 1) + ")"; }
  function rowsOnPage(page, R, matchSet) { var out = []; for (var s = 0; s < R; s++) if (matchSet[page * R + s]) out.push(page * R + s); return out; }
  function matchSetOf(matches) { var m = {}; matches.forEach(function (r) { m[r] = true; }); return m; }
  function pages(n) { return n + " " + core.plural(n, "страница", "страницы", "страниц"); }
  // Падеж зависит от фразы («ради 1 строки», «Проверили 1 строку», «по 1 строке»), поэтому формы 1 и 2–4 передаёт вызывающий.
  function rows(n, one, few) { return n + " " + core.plural(n, one, few, "строк"); }

  function bScanSeq(P, R, matches) {
    var st = scanState(P, R), ms = matchSetOf(matches);
    st.snap(1, { page: "—" }, "Таблица: " + pages(P) + " по " + rows(R, "строке", "строки") + ". Подходящих строк: " + matches.length + ". Seq Scan читает ВСЕ страницы подряд — без индекса.");
    for (var p = 0; p < P; p++) {
      st.snap(2, { page: p }, "page = " + p, { mark: p });
      st.read(p); st.cur = p;
      st.snap(3, { page: p }, "ReadPage(" + p + "): страница целиком в буфере. Чтений: " + st.total + " из " + P, { mark: p });
      var here = rowsOnPage(p, R, ms);
      here.forEach(function (r) { st.found.push(r); });
      st.snap(4, { page: p }, here.length ? "Проверили " + rows(R, "строку", "строки") + ", подошло: " + here.length + " (всего найдено " + st.found.length + ")" : "Проверили " + rows(R, "строку", "строки") + " — ни одна не подошла, но страницу уже прочитали", { mark: p });
    }
    st.snap(6, { page: "—" }, "Итог: " + pages(st.total) + " прочитано ради " + rows(st.found.length, "строки", "строк") + ". Не зависит от того, сколько строк подошло.", { done: true });
    return st.steps;
  }

  function bScanIndex(P, R, matches) {
    var st = scanState(P, R);
    st.snap(1, { tid: "—", cur: "—" }, "Index Scan: индекс отдаёт ctid подходящих строк в порядке КЛЮЧА, а строки таблицы лежат как попало.");
    st.snap(2, { tid: "—", cur: -1 }, "cur = −1: в буфере пока ни одной страницы таблицы");
    matches.forEach(function (r) {
      var t = tidOf(r, R), tt = tidText(t), fresh = t.page !== st.cur;
      st.snap(3, { tid: tt, cur: st.cur }, "Следующий ctid из индекса: " + tt + " — страница " + t.page + ", указатель №" + (t.slot + 1), { tid: t, mark: t.page });
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
    st.snap(10, { tid: "—", cur: st.cur }, "Итог: " + pages(st.total) + " прочитано ради " + rows(matches.length, "строки", "строк") + (st.total > P ? " — БОЛЬШЕ, чем в таблице (" + P + ")" : "") + ".", { done: true });
    return st.steps;
  }

  // Карта ТОЧНАЯ, как у Postgres при обычном work_mem («Heap Blocks: exact=N»): помнит страницу И
  // номера строк на ней, поэтому со страницы берутся только они — остальные строки не проверяются.
  // Перепроверка всех строк страницы (Recheck) бывает лишь у «lossy»-страниц, когда карта не
  // влезла в work_mem; число прочитанных страниц от этого не меняется (сверено вживую).
  function bScanBitmap(P, R, matches) {
    var st = scanState(P, R), ms = matchSetOf(matches);
    st.snap(1, { tid: "—", page: "—" }, "Bitmap Scan: сначала по индексу собираем карту — какие страницы нужны и какие строки на каждой. Потом читаем страницы по порядку.");
    matches.forEach(function (r) {
      var t = tidOf(r, R), tt = tidText(t), had = st.bits[t.page];
      st.snap(2, { tid: tt, page: "—" }, "Следующий ctid из индекса: " + tt, { tid: t, mark: t.page });
      st.bits[t.page] = true;
      st.snap(3, { tid: tt, page: "—" }, had ? "Страница " + t.page + " уже в карте — дописали к ней указатель №" + (t.slot + 1) + ". Читать её второй раз не придётся" : "bitmap[" + t.page + "] ← №" + (t.slot + 1) + ": страница " + t.page + " попала в карту. Порядок ключа дальше не нужен", { tid: t, mark: t.page });
    });
    var set = []; st.bits.forEach(function (b, i) { if (b) set.push(i); });
    st.snap(5, { tid: "—", page: "—" }, "Карта готова: нужных страниц " + set.length + " из " + P);
    set.forEach(function (p) {
      st.snap(6, { tid: "—", page: p }, "Следующая страница по возрастанию: " + p, { mark: p });
      st.read(p); st.cur = p;
      st.snap(7, { tid: "—", page: p }, "ReadPage(" + p + ") — ровно один раз. Чтений: " + st.total, { mark: p });
      var here = rowsOnPage(p, R, ms);
      here.forEach(function (r) { st.found.push(r); });
      st.snap(8, { tid: "—", page: p }, "Взяли со страницы " + rows(here.length, "строку", "строки") + " по запомненным номерам" + (here.length < R ? ", остальные строки страницы не проверяли" : "") + " (найдено " + st.found.length + ")", { mark: p });
    });
    st.snap(10, { tid: "—", page: "—" }, "Итог: " + pages(st.total) + " прочитано ради " + rows(matches.length, "строки", "строк") + " — каждая нужная страница по одному разу, никогда больше " + P + ".", { done: true });
    return st.steps;
  }
  // ===== Соединения: Nested Loop / Hash / Merge ================================
  // Внутреннее соединение users.id = orders.user_id на маленьких таблицах. Модель считает работу
  // строками и обращениями, а не временем: на 20 строках время ничего не показывает.
  function parseIds(str, lo, hi, dups) {
    var out = [];
    function add(v) { if (v >= lo && v <= hi && out.length < 40) out.push(v); }
    String(str || "").split(",").forEach(function (raw) {
      var t = raw.trim(), m = /^(\d+)-(\d+)$/.exec(t);
      if (m) { for (var v = Math.max(+m[1], lo); v <= Math.min(+m[2], hi); v++) add(v); return; }
      m = /^r(\d+)$/.exec(t);
      if (m) { var rnd = core.mulberry32(+m[1] * 7919 + hi), k = Math.min(+m[1], 40); for (var i = 0; i < k; i++) add(lo + Math.floor(rnd() * (hi - lo + 1))); return; }
      if (/^\d+$/.test(t)) add(+t);
    });
    if (dups) return out;
    var seen = {}, uniq = [];
    out.forEach(function (v) { if (!seen[v]) { seen[v] = true; uniq.push(v); } });
    return uniq.sort(function (a, b) { return a - b; });
  }
  function joinPairs(users, orders) {
    var ps = [];
    users.forEach(function (u) { orders.forEach(function (o) { if (o.u === u) ps.push({ u: u, n: o.n }); }); });
    return ps.sort(function (a, b) { return a.u - b.u || a.n - b.n; });
  }
  function byIndexOrder(orders) { return orders.slice().sort(function (a, b) { return a.u - b.u || a.n - b.n; }); }
  // Число в «Итог» стоит перед существительным, поэтому согласуем; в остальных фразах число идёт после двоеточия.
  function pairsText(n) { return n + " " + core.plural(n, "пара", "пары", "пар"); }
  function orderText(o) { return "№" + o.n + "·user " + o.u; }

  function joinState(users, orders, metricLabel) {
    var st = { out: [], uRead: 0, oRead: 0, metric: 0, built: [], cu: -1, co: -1, steps: [] };
    st.snap = function (line, vars, info, extra) {
      var s = { line: line, vars: vars, info: info, U: users.slice(), O: orders.slice(), cu: st.cu, co: st.co, out: st.out.slice(), uRead: st.uRead, oRead: st.oRead, built: st.built.slice(), metric: { label: metricLabel, value: st.metric } };
      for (var k in extra) s[k] = extra[k];
      st.steps.push(s);
    };
    return st;
  }

  function bJoinNL(users, orders) {
    var O = byIndexOrder(orders), st = joinState(users, O, "обращений к индексу");
    st.snap(1, { u: "—", o: "—" }, "Nested Loop: для КАЖДОЙ внешней строки идём в индекс по заказам. Внешних строк: " + users.length + ", заказов в таблице: " + orders.length + ".");
    users.forEach(function (u, ui) {
      st.cu = ui; st.co = -1;
      st.snap(2, { u: u, o: "—" }, "u = " + u + ": следующая строка внешней таблицы", {});
      var mine = []; O.forEach(function (o, oi) { if (o.u === u) mine.push(oi); });
      if (!mine.length) {
        st.metric++;
        st.snap(3, { u: u, o: "—" }, "Lookup(" + u + "): обращение к индексу — заказов у пользователя " + u + " нет, внутренний цикл не выполнится", { hot: true, branch: false });
        return;
      }
      mine.forEach(function (oi, k) {
        if (k === 0) st.metric++;
        st.co = oi; st.oRead++;
        st.snap(3, { u: u, o: orderText(O[oi]) }, (k === 0 ? "Lookup(" + u + "): обращение к индексу. " : "") + "Нашли заказ " + orderText(O[oi]), { branch: true });
        st.out.push({ u: u, n: O[oi].n });
        st.snap(4, { u: u, o: orderText(O[oi]) }, "Пара (user " + u + ", заказ №" + O[oi].n + ") в результате: " + st.out.length, {});
      });
    });
    st.cu = -1; st.co = -1;
    st.snap(7, { u: "—", o: "—" }, "Итог: " + pairsText(st.out.length) + "; обращений к индексу: " + st.metric + " — по одному на каждую внешнюю строку, нашлись ли у неё заказы или нет.", { done: true });
    return st.steps;
  }

  // Два коротких пути сверены с живым Postgres 16 (и с nodeHashjoin.c): первый заказ он берёт ЕЩЁ ДО
  // build — проверить, что заказы вообще есть. Нет заказов — хеш не строится, users не читается
  // («never executed» у Hash). Хеш пуст — заказы дальше не читаются (Seq Scan по заказам: rows=1).
  function bJoinHash(users, orders) {
    var st = joinState(users, orders, "строк в хеш-таблице");
    if (!orders.length) {
      st.snap(1, { u: "—", o: "—" }, "Hash Join: хеш строится по users, потом по нему прогоняются заказы. Но заказов нет: Postgres ещё до build пробует взять первый заказ, не находит его — и хеш по users не строит вовсе.");
      st.snap(11, { u: "—", o: "—" }, "Итог: 0 пар; заказов нет — хеш не строился, таблица users не читалась.", { done: true });
      return st.steps;
    }
    // Сторону для хеша Postgres выбирает по стоимости, а не по одному числу строк (вживую: 12 users и
    // 11 заказов — хеш по users, 12 users и 3 заказа — по заказам). Виджет хеширует users всегда.
    var side = users.length > orders.length ? " Здесь users больше, чем заказов, и Postgres мог бы построить хеш по заказам: сторону он выбирает по стоимости. Виджет строит хеш по users всегда." : "";
    st.snap(1, { u: "—", o: "—" }, !users.length ? "Hash Join: хеш строится по users, потом по нему прогоняются заказы (строк: " + orders.length + "). Но в users после фильтра не осталось ни одной строки." : "Hash Join: сначала строим хеш-таблицу по users (меньшая сторона, после фильтра; строк: " + users.length + "), потом ОДНИМ проходом читаем ВСЕ заказы (orders; строк: " + orders.length + ")." + side);
    if (!users.length) {
      st.oRead = 1;
      st.snap(5, { u: "—", o: "—" }, "Хеш-таблица пуста: в users нет ни одной строки, и ни один заказ пары не найдёт — проход по заказам Postgres не делает. Прочитан только первый заказ: его Postgres берёт ещё до build, проверить, что заказы вообще есть.", { hot: true });
      st.snap(11, { u: "—", o: "—" }, "Итог: 0 пар; хеш-таблица пуста, поэтому заказов прочитано: 1 из " + orders.length + " — только тот, что взят до build.", { done: true });
      return st.steps;
    }
    users.forEach(function (u, ui) {
      st.cu = ui;
      st.snap(2, { u: u, o: "—" }, "build: хеш по users, u = " + u, {});
      st.built.push(u); st.uRead++; st.metric = st.built.length;
      st.snap(3, { u: u, o: "—" }, "h[" + u + "] = [user " + u + "]: в хеш-таблице строк: " + st.built.length, {});
    });
    st.cu = -1;
    st.snap(5, { u: "—", o: "—" }, "Хеш-таблица готова. Теперь probe: проход по ВСЕМ заказам (orders), каждый — один поиск по хешу.");
    var inHash = {}; users.forEach(function (u, ui) { inHash[u] = ui; });
    orders.forEach(function (o, oi) {
      st.co = oi; st.cu = -1; st.oRead++;
      st.snap(6, { u: "—", o: orderText(o) }, "probe: заказ " + orderText(o) + ". Прочитано заказов: " + st.oRead + " из " + orders.length, {});
      if (inHash[o.u] === undefined) {
        st.snap(7, { u: "—", o: orderText(o) }, "h[" + o.u + "]: в хеш-таблице такого пользователя нет — заказ пропускаем, но прочитать его всё равно пришлось", { hot: true, branch: false });
        return;
      }
      st.cu = inHash[o.u];
      st.snap(7, { u: o.u, o: orderText(o) }, "h[" + o.u + "] → user " + o.u, { branch: true });
      st.out.push({ u: o.u, n: o.n });
      st.snap(8, { u: o.u, o: orderText(o) }, "Пара (user " + o.u + ", заказ №" + o.n + ") в результате: " + st.out.length, {});
    });
    st.cu = -1; st.co = -1;
    st.snap(11, { u: "—", o: "—" }, "Итог: " + pairsText(st.out.length) + "; прочитаны все заказы (orders), всего " + orders.length + " — сколько бы совпадений ни нашлось.", { done: true });
    return st.steps;
  }

  // Счётчики — сколько строк слияние вытянуло из каждого входа, как actual rows у дочерних узлов
  // Merge Join (сверено с живым Postgres 16 и nodeMergejoin.c). Первой читается users: она пуста —
  // заказы не читаются вовсе («never executed»). Кончились заказы сразу после пары — Postgres
  // читает ещё одну строку users (extraU): сверяет её с ключом только что пройденной группы заказов.
  function bJoinMerge(users, orders) {
    var O = byIndexOrder(orders), st = joinState(users, O, "сравнений");
    var i = 0, j = 0, extraU = 0;
    function reads() { st.uRead = Math.min(i + 1 + extraU, users.length); st.oRead = users.length ? Math.min(j + 1, O.length) : 0; st.cu = i < users.length ? i : -1; st.co = users.length && j < O.length ? j : -1; } // users пуста — заказ не читается, «текущего» нет
    st.snap(1, { i: "—", j: "—" }, "Merge Join: оба входа отсортированы по ключу (users — по первичному ключу, заказы — по индексу user_id); идём по ним двумя указателями.");
    reads();
    st.snap(2, { i: i, j: j }, !users.length ? "i = 0, j = 0. В users нет ни одной строки — Postgres видит это на первом же чтении и заказы не трогает" : !O.length ? "i = 0, j = 0: прочитана первая строка users, а заказов нет — сравнивать не с чем" : "i = 0, j = 0: стоим на первых строках обеих сторон", {});
    while (i < users.length && j < O.length) {
      st.metric++;
      // s.note — подпись под кодом ИМЕННО этого кадра: статичная lineNotes на строках if/else if
      // описывала бы одну ветку и спорила со статусом на другой
      st.snap(4, { i: i, j: j }, "users[" + i + "] = " + users[i] + ", orders[" + j + "].user_id = " + O[j].u + ": " + users[i] + (users[i] < O[j].u ? " < " : users[i] > O[j].u ? " > " : " = ") + O[j].u, { note: users[i] < O[j].u ? "Да, меньше: у этого пользователя заказов больше не будет — сдвинем i" : "Нет, не меньше — дальше проверка else if" });
      if (users[i] < O[j].u) {
        i++; reads();
        st.snap(5, { i: i, j: j }, "Пользователь " + users[i - 1] + " меньше — заказов у него больше не будет, i++", {});
      } else {
        st.metric++;
        st.snap(6, { i: i, j: j }, users[i] > O[j].u ? "users[i] > orders[j].user_id — заказ без пользователя" : "Не больше и не меньше — значит равны", { note: users[i] > O[j].u ? "Да, больше: у заказа нет пользователя — сдвинем j" : "Нет, не больше: ключи равны — пара, ветка else" });
        if (users[i] > O[j].u) {
          j++; reads();
          st.snap(7, { i: i, j: j }, "Заказ пропускаем, j++", {});
        } else {
          st.out.push({ u: users[i], n: O[j].n });
          st.snap(9, { i: i, j: j }, "Пара (user " + users[i] + ", заказ №" + O[j].n + ") в результате: " + st.out.length, {});
          j++;
          if (j === O.length && i + 1 < users.length) extraU = 1;
          reads();
          // подпись под кодом — по ситуации кадра: статичная «следующий заказ» спорила бы со статусом
          // на конце заказов (и с лишним чтением users, и без него)
          var endO = j === O.length;
          st.snap(10, { i: i, j: j }, extraU ? "j++: заказов больше нет. Но Postgres не останавливается сразу: он читает следующую строку users (id " + users[i + 1] + ") — в общем случае у неё мог бы оказаться тот же ключ, и только что пройденные заказы пришлось бы пройти заново. Ключ другой — соединение закончено" : endO ? "j++: заказов больше нет" : "j++: следующий заказ того же пользователя (или другого)", { note: extraU ? "Заказов больше нет; Postgres ещё читает users[i+1] — сверить с ключом группы" : endO ? "Заказов больше нет — цикл закончится" : "Следующий заказ: тот же пользователь или уже другой" });
        }
      }
    }
    st.cu = -1; st.co = -1;
    var note = !users.length ? " — в users ни одной строки, заказы не читались вовсе"
      : !O.length ? " — заказов нет, хватило первой строки users"
      : st.uRead < users.length || st.oRead < O.length ? " — одна из сторон кончилась, и остаток другой читать не пришлось" : "";
    if (extraU) note += (note ? "; " : " — ") + "одну строку users Postgres прочитал уже после того, как кончились заказы";
    st.snap(13, { i: "—", j: "—" }, "Итог: " + pairsText(st.out.length) + "; прочитано пользователей: " + st.uRead + " из " + users.length + ", заказов: " + st.oRead + " из " + O.length + note + ".", { done: true });
    return st.steps;
  }
  exportsForTest.parseIds = parseIds;
  exportsForTest.joinPairs = joinPairs;
  exportsForTest.bJoinNL = bJoinNL;
  exportsForTest.bJoinHash = bJoinHash;
  exportsForTest.bJoinMerge = bJoinMerge;
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

  // Три скана делят парсинг, итоги, статус и легенду: различаются только генератор, листинг и тексты.
  var scanCommon = {
    parse: function (kind) {
      return function (root) {
        var P = core.clampInt(root.getAttribute("data-pages"), 1, 24, 12), R = core.clampInt(root.getAttribute("data-rows"), 1, 16, 8);
        var m = parseMatch(root.getAttribute("data-match") == null ? "r5" : root.getAttribute("data-match"), P * R);
        var gen = { seq: bScanSeq, index: bScanIndex, bitmap: bScanBitmap }[kind];
        return { P: P, R: R, matches: m, steps: gen(P, R, m) };
      };
    },
    values: function () { return []; },
    pointers: function () { return { lo: -1, hi: -1 }; },
    sumCells: ["Чтений страницы", "Страниц в таблице", "Найдено строк"],
    sumValues: function (s) { return [{ text: s.total, cls: "gt" }, { text: s.P }, { text: s.found.length }]; },
    status: function (s, idx, total) { if (s.done) return { kind: "ok", icon: "✓", head: "Готово", text: s.info }; return { kind: "info", hot: !!s.hot, icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
    stepCard: function (s) { return { a: "чтений " + s.total, b: "из " + s.P, c: "найдено " + s.found.length, cls: "gt" }; },
    legend: [{ cls: "iv-scan__page--unread", label: "страница ещё не читалась" }, { cls: "iv-scan__page--read", label: "страница прочитана (×N — сколько раз)" }, { cls: "iv-scan__page--cur", label: "страница, к которой относится шаг" }, { cls: "iv-scan__cell--match", label: "строка подходит под условие" }, { cls: "iv-scan__cell--found", label: "строка уже в результате" }, { cls: "iv-scan__page--bit", label: "страница в карте" }]
  };
  // У Seq и Index карты нет: пункт легенды, которого никогда не будет на холсте, читатель ищет зря.
  scanCommon.legendNoMap = scanCommon.legend.filter(function (l) { return l.cls !== "iv-scan__page--bit"; });

  // Сетка «страницы × строки»: все данные идут через textContent (mkEl), разметка из данных не строится.
  function scanViz(panel, ctx) {
    var H = window.ALGO_VIZ, ms = {};
    ctx.matches.forEach(function (r) { ms[r] = true; });
    var wrap = H.mkEl("div", "iv-scan");
    panel.appendChild(wrap);
    return function (s) {
      wrap.innerHTML = "";
      // «62 из 12 страниц» читалось как дробь — а у Index Scan чтений и правда бывает больше, чем страниц.
      // Неразрывные пробелы: на телефоне строка переносится после «·», а не посреди «в таблице».
      var head = H.mkEl("div", "iv-scan__reads", "Чтений страницы таблицы: " + s.total + " · в\u00a0таблице\u00a0" + pages(s.P).replace(" ", "\u00a0"));
      head.setAttribute("data-reads", String(s.total));
      wrap.appendChild(head);
      var foundSet = {}; s.found.forEach(function (r) { foundSet[r] = true; });
      var grid = H.mkEl("div", "iv-scan__grid");
      for (var p = 0; p < s.P; p++) {
        var cls = "iv-scan__page " + (s.reads[p] ? "iv-scan__page--read" : "iv-scan__page--unread") + (s.mark === p ? " iv-scan__page--cur" : "") + (s.bits[p] ? " iv-scan__page--bit" : "");
        var card = H.mkEl("div", cls);
        card.appendChild(H.mkEl("div", "iv-scan__label", "стр. " + p + (s.reads[p] > 1 ? " ×" + s.reads[p] : s.reads[p] ? " ✓" : "")));
        var cells = H.mkEl("div", "iv-scan__cells");
        for (var c = 0; c < s.R; c++) {
          var id = p * s.R + c;
          var cc = "iv-scan__cell" + (ms[id] ? " iv-scan__cell--match" : "") + (foundSet[id] ? " iv-scan__cell--found" : "") + (s.tid && s.tid.page === p && s.tid.slot === c ? " iv-scan__cell--tid" : "");
          cells.appendChild(H.mkEl("div", cc));
        }
        card.appendChild(cells);
        grid.appendChild(card);
      }
      wrap.appendChild(grid);
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
    ],
    "pg-scan-seq": [
      "func SeqScan(t *Table, pred Pred) []Row {",
      "    var out []Row",
      "    for page := 0; page < t.Pages; page++ { // ВСЕ страницы подряд",
      "        buf := t.ReadPage(page) // +1 чтение страницы",
      "        out = append(out, buf.Match(pred)...) // проверяем все строки страницы",
      "    }",
      "    return out",
      "}"
    ],
    "pg-scan-index": [
      "func IndexScan(idx *Index, t *Table, key Range) []Row {",
      "    var out []Row",
      "    cur := -1 // страница, закреплённая в буфере",
      "    for _, tid := range idx.Lookup(key) { // ctid в порядке КЛЮЧА, не страниц",
      "        if tid.Page != cur {",
      "            t.ReadPage(tid.Page) // +1 чтение",
      "            cur = tid.Page",
      "        }",
      "        out = append(out, t.Row(tid))",
      "    }",
      "    return out",
      "}"
    ],
    "pg-scan-bitmap": [
      "func BitmapScan(idx *Index, t *Table, key Range) []Row {",
      "    bitmap := map[int][]int{} // страница → номера нужных строк на ней",
      "    for _, tid := range idx.Lookup(key) {",
      "        bitmap[tid.Page] = append(bitmap[tid.Page], tid.Slot) // порядок ключа забыт",
      "    }",
      "    var out []Row",
      "    for _, page := range sortedKeys(bitmap) { // страницы по возрастанию",
      "        buf := t.ReadPage(page) // каждая страница ровно один раз",
      "        out = append(out, buf.Rows(bitmap[page])...) // только запомненные строки",
      "    }",
      "    return out",
      "}"
    ],
    "pg-join-nl": [
      "func NestedLoop(users []User, idx *Index) []Pair {",
      "    var out []Pair",
      "    for _, u := range users { // внешняя таблица (после фильтра)",
      "        for _, o := range idx.Lookup(u.ID) { // поиск по индексу orders(user_id)",
      "            out = append(out, Pair{u, o})",
      "        }",
      "    }",
      "    return out",
      "}"
    ],
    "pg-join-hash": [
      "func HashJoin(users []User, orders []Order) []Pair {",
      "    h := map[int][]User{}",
      "    for _, u := range users { // build: хеш по users (меньшая сторона, после фильтра)",
      "        h[u.ID] = append(h[u.ID], u)",
      "    }",
      "    var out []Pair",
      "    for _, o := range orders { // probe: ВСЕ заказы (Postgres: при пустом хеше — только первый)",
      "        for _, u := range h[o.UserID] {",
      "            out = append(out, Pair{u, o})",
      "        }",
      "    }",
      "    return out",
      "}"
    ],
    "pg-join-merge": [
      "func MergeJoin(users []User, orders []Order) []Pair { // оба входа отсортированы по ключу",
      "    var out []Pair",
      "    i, j := 0, 0",
      "    for i < len(users) && j < len(orders) {",
      "        if users[i].ID < orders[j].UserID {",
      "            i++",
      "        } else if users[i].ID > orders[j].UserID {",
      "            j++",
      "        } else {",
      "            out = append(out, Pair{users[i], orders[j]})",
      "            j++ // следующий заказ; на конце заказов Postgres ещё заглянет в users[i+1]",
      "        }",
      "    }",
      "    return out",
      "}"
    ]
  };

  // ===== Соединения: рисунок и общие части трёх типов ==========================
  // Легенда ПО ТИПАМ: «лежит в хеш-таблице» бывает только у Hash, у остальных читатель искал бы её зря.
  var joinLegendAll = [
    { cls: "iv-join__cell--idle", label: "ещё не читалась" },
    { cls: "iv-join__cell--cur", label: "текущая строка" },
    { cls: "iv-join__cell--read", label: "уже прочитана" },
    { cls: "iv-join__cell--match", label: "вошла в результат" },
    { cls: "iv-join__cell--hash", label: "лежит в хеш-таблице" }
  ];
  var joinLegend = joinLegendAll;
  var joinLegendNoHash = joinLegendAll.filter(function (e) { return e.cls !== "iv-join__cell--hash"; });

  function joinCommonParse(kind) {
    return function (root) {
      var uAttr = root.getAttribute("data-users"), oAttr = root.getAttribute("data-orders");
      var users = parseIds(uAttr == null ? "1-8" : uAttr, 1, 12, false);
      var K = core.clampInt(root.getAttribute("data-filter"), 0, 13, 0);
      if (K > 0) users = users.filter(function (id) { return id < K; });
      var orders = parseIds(oAttr == null ? "r14" : oAttr, 1, 12, true).map(function (u, i) { return { n: i + 1, u: u }; });
      var gen = { nl: bJoinNL, hash: bJoinHash, merge: bJoinMerge }[kind];
      return { users: users, orders: orders, filter: K, steps: gen(users, orders) };
    };
  }
  var joinCommon = {
    values: function () { return []; },
    pointers: function () { return { lo: -1, hi: -1 }; },
    sumCells: ["Пар в результате", "Заказов прочитано"],
    sumValues: function (s) { return [{ text: s.out.length, cls: "gt" }, { text: s.oRead }]; },
    status: function (s, idx, total) { if (s.done) return { kind: "ok", icon: "✓", head: "Готово", text: s.info }; return { kind: "info", hot: !!s.hot, icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
    stepCard: function (s) { return { a: s.metric.label + ": " + s.metric.value, b: "пар " + s.out.length, c: "заказов прочитано " + s.oRead, cls: "gt" }; }
  };

  // Всё идёт через mkEl/textContent. «Внешняя» — только у Nested Loop (ведущая таблица); у Hash и Merge
  // то же слово означало бы другую сторону, чем в Postgres, поэтому там просто «таблица users».
  function joinViz(panel, ctx, kind) {
    var H = window.ALGO_VIZ;
    var wrap = H.mkEl("div", "iv-join");
    panel.appendChild(wrap);
    return function (s) {
      wrap.innerHTML = "";
      var m = H.mkEl("div", "iv-join__metrics", (kind === "nl" ? "Внешних строк: " : "Строк users: ") + s.U.length + " · заказов прочитано: " + s.oRead + " (в таблице заказов: " + s.O.length + ") · " + s.metric.label + ": " + s.metric.value + " · пар в результате: " + s.out.length);
      m.setAttribute("data-pairs", String(s.out.length));
      m.setAttribute("data-oread", String(s.oRead));
      wrap.appendChild(m);
      var matchedU = {}, matchedN = {};
      s.out.forEach(function (p) { matchedU[p.u] = true; matchedN[p.n] = true; });
      // Генератор NL не двигает uRead: внешняя строка «прочитана», когда по ней уже сходили в индекс
      // (индекс меньше текущего) или алгоритм закончил — иначе пользователь без заказов выглядит нетронутым.
      function userRead(i) { return kind === "nl" ? (i < s.cu || !!s.done) : i < s.uRead; }
      var rowU = H.mkEl("div", "iv-join__row iv-join__row--users");
      rowU.appendChild(H.mkEl("div", "iv-join__label", (kind === "nl" ? "внешняя таблица" : "таблица") + " users (id)"));
      s.U.forEach(function (id, i) {
        // состояние и «текущая» независимы: --cur — только рамка, иначе пользователь уже в результате сереет
        var cls = "iv-join__cell" + (matchedU[id] ? " iv-join__cell--match" : userRead(i) ? " iv-join__cell--read" : " iv-join__cell--idle") + (i === s.cu ? " iv-join__cell--cur" : "");
        rowU.appendChild(H.mkEl("div", cls, String(id)));
      });
      if (!s.U.length) rowU.appendChild(H.mkEl("div", "iv-join__empty", "пусто"));
      wrap.appendChild(rowU);
      if (kind === "hash") {
        var rowH = H.mkEl("div", "iv-join__row iv-join__row--hash");
        rowH.appendChild(H.mkEl("div", "iv-join__label", "хеш-таблица (ключи)"));
        s.built.forEach(function (id) { rowH.appendChild(H.mkEl("div", "iv-join__cell iv-join__cell--hash", String(id))); });
        if (!s.built.length) rowH.appendChild(H.mkEl("div", "iv-join__empty", "пока пуста"));
        wrap.appendChild(rowH);
      }
      var rowO = H.mkEl("div", "iv-join__row iv-join__row--orders");
      rowO.appendChild(H.mkEl("div", "iv-join__label", kind === "hash" ? "заказы (user_id), порядок таблицы" : "заказы (user_id), порядок индекса"));
      s.O.forEach(function (o, i) {
        var cls = "iv-join__cell" + (matchedN[o.n] ? " iv-join__cell--match" : i < s.oRead ? " iv-join__cell--read" : " iv-join__cell--idle") + (i === s.co ? " iv-join__cell--cur" : "");
        var cell = H.mkEl("div", cls, String(o.u));
        cell.title = "заказ №" + o.n + ", user_id " + o.u;
        rowO.appendChild(cell);
      });
      if (!s.O.length) rowO.appendChild(H.mkEl("div", "iv-join__empty", "пусто"));
      wrap.appendChild(rowO);
      // «пока» — только до итога: на последнем кадре пустого соединения пар уже не будет
      wrap.appendChild(H.mkEl("div", "iv-join__pairs", s.out.length ? "Пары: " + s.out.map(function (p) { return "(" + p.u + ", №" + p.n + ")"; }).join(" ") : s.done ? "Пар нет" : "Пар пока нет"));
    };
  }

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
    },
    "pg-scan-seq": {
      badge: "Postgres · Seq Scan",
      desc: "Последовательное чтение: все страницы таблицы подряд, на каждой проверяем все строки. Стоимость не зависит от того, сколько строк подошло.",
      valuesLabel: "", codeKey: "pg-scan-seq", fillRange: false,
      complexity: { time: "O(страниц)", space: "O(1)", good: "★ читает подряд — дёшево на странице" },
      varOrder: ["page"],
      varDesc: { page: "Текущая страница" },
      lineNotes: { 2: "Страницы идут по порядку — никаких прыжков", 3: "Читаем страницу целиком — одно чтение, сколько бы на ней строк ни подошло", 4: "Проверяем ВСЕ строки страницы, даже ненужные" },
      rules: [{ head: "чтений", body: "= страниц в таблице", cls: "eq" }, { head: "порядок", body: "физический, подряд", cls: "gt" }],
      legend: scanCommon.legendNoMap,
      presets: [
        // не «пример главы»: эту кнопку движок ставит сам с атрибутами главы — второй такой же была бы дубликатом
        { label: "те же строки подряд", set: { "data-pages": "12", "data-rows": "8", "data-match": "0-4" }, hint: "стоимость не изменилась" },
        { label: "70% строк", set: { "data-pages": "12", "data-rows": "8", "data-match": "r67" }, hint: "тут Seq выигрывает" },
        { label: "ничего не подошло", set: { "data-pages": "12", "data-rows": "8", "data-match": "" }, hint: "всё равно читает всё" }
      ],
      parse: scanCommon.parse("seq"),
      inputs: [{ attr: "data-pages", label: "Страниц в таблице" }, { attr: "data-rows", label: "Строк на странице" }, { attr: "data-match", label: "Подходящие строки (N, a-b, rK)" }],
      values: scanCommon.values,
      title: function (ctx) { return "Seq Scan: " + ctx.P + " стр. × " + ctx.R + " строк, подходит " + ctx.matches.length; },
      pointers: scanCommon.pointers,
      sumCells: scanCommon.sumCells,
      sumValues: scanCommon.sumValues,
      status: scanCommon.status,
      stepCard: scanCommon.stepCard,
      varsOf: function (s) { return { page: s.vars.page }; },
      customViz: scanViz
    },
    "pg-scan-index": {
      badge: "Postgres · Index Scan",
      desc: "Чтение по индексу: индекс отдаёт ctid строк в порядке ключа, а строки таблицы лежат как попало. Страница перечитывается, когда индекс возвращается к ней после чужих.",
      valuesLabel: "", codeKey: "pg-scan-index", fillRange: false,
      complexity: { time: "O(найдено) чтений", space: "O(1)", good: "★ выигрывает, когда строк мало" },
      varOrder: ["tid", "cur"],
      varDesc: { tid: "ctid строки из индекса", cur: "Страница, что сейчас в буфере" },
      lineNotes: { 3: "Индекс отдаёт ctid в порядке КЛЮЧА — страницы идут вразнобой", 4: "Та же страница, что и в прошлый раз? Тогда читать не надо", 5: "Новая страница — чтение; к уже виденной странице после чужих — снова чтение (×2)", 8: "Строка берётся со страницы, что уже в буфере" },
      rules: [{ head: "чтений", body: "= смен страницы подряд", cls: "eq" }, { head: "порядок", body: "по ключу, а не по страницам", cls: "lt" }],
      legend: scanCommon.legendNoMap,
      presets: [
        // не «пример главы»: эту кнопку движок ставит сам с атрибутами главы — второй такой же была бы дубликатом
        { label: "те же строки подряд", set: { "data-pages": "12", "data-rows": "8", "data-match": "0-4" }, hint: "подряд — 1 чтение" },
        { label: "70% строк", set: { "data-pages": "12", "data-rows": "8", "data-match": "r67" }, hint: "70% строк — больше, чем в таблице!" },
        { label: "ничего не подошло", set: { "data-pages": "12", "data-rows": "8", "data-match": "" }, hint: "ничего — ноль чтений" }
      ],
      parse: scanCommon.parse("index"),
      inputs: [{ attr: "data-pages", label: "Страниц в таблице" }, { attr: "data-rows", label: "Строк на странице" }, { attr: "data-match", label: "Подходящие строки (N, a-b, rK)" }],
      values: scanCommon.values,
      title: function (ctx) { return "Index Scan: " + ctx.P + " стр. × " + ctx.R + " строк, подходит " + ctx.matches.length; },
      pointers: scanCommon.pointers,
      sumCells: scanCommon.sumCells,
      sumValues: scanCommon.sumValues,
      status: scanCommon.status,
      stepCard: scanCommon.stepCard,
      varsOf: function (s) { return { tid: s.vars.tid, cur: s.vars.cur }; },
      customViz: scanViz
    },
    "pg-scan-bitmap": {
      badge: "Postgres · Bitmap Scan",
      desc: "Сначала по индексу собирается карта: какие страницы нужны и какие строки на каждой. Потом страницы читаются по возрастанию, каждая один раз. Порядок ключа забывается, зато повторных чтений нет.",
      valuesLabel: "", codeKey: "pg-scan-bitmap", fillRange: false,
      complexity: { time: "O(различных страниц)", space: "O(страниц) на карту", good: "★ не больше страниц, чем в таблице" },
      varOrder: ["tid", "page"],
      varDesc: { tid: "ctid строки из индекса", page: "Страница, которую читаем" },
      lineNotes: { 3: "Запоминаем страницу и номер строки на ней — порядок ключа больше не нужен", 6: "Страницы по возрастанию — читаем почти подряд", 7: "Каждая нужная страница — ровно один раз", 8: "Берём только запомненные строки: карта точная (в плане — Heap Blocks: exact)" },
      rules: [{ head: "чтений", body: "= различных страниц", cls: "eq" }, { head: "потолок", body: "страниц в таблице", cls: "gt" }],
      legend: scanCommon.legend,
      presets: [
        // не «пример главы»: эту кнопку движок ставит сам с атрибутами главы — второй такой же была бы дубликатом
        { label: "те же строки подряд", set: { "data-pages": "12", "data-rows": "8", "data-match": "0-4" }, hint: "подряд — 1 страница" },
        { label: "70% строк", set: { "data-pages": "12", "data-rows": "8", "data-match": "r67" }, hint: "70% строк — не больше 12" },
        { label: "ничего не подошло", set: { "data-pages": "12", "data-rows": "8", "data-match": "" }, hint: "ничего — ноль" }
      ],
      parse: scanCommon.parse("bitmap"),
      inputs: [{ attr: "data-pages", label: "Страниц в таблице" }, { attr: "data-rows", label: "Строк на странице" }, { attr: "data-match", label: "Подходящие строки (N, a-b, rK)" }],
      values: scanCommon.values,
      title: function (ctx) { return "Bitmap Scan: " + ctx.P + " стр. × " + ctx.R + " строк, подходит " + ctx.matches.length; },
      pointers: scanCommon.pointers,
      sumCells: scanCommon.sumCells,
      sumValues: scanCommon.sumValues,
      status: scanCommon.status,
      stepCard: scanCommon.stepCard,
      varsOf: function (s) { return { tid: s.vars.tid, page: s.vars.page }; },
      customViz: scanViz
    },
    "pg-join-nl": {
      badge: "Postgres · Nested Loop",
      desc: "Для каждой строки внешней таблицы — поиск подходящих заказов по индексу. Цена — одно обращение к индексу на внешнюю строку.",
      valuesLabel: "", codeKey: "pg-join-nl", fillRange: false,
      complexity: { time: "O(внешних · log заказов)", space: "O(1)", good: "★ выигрывает, когда внешних строк мало" },
      varOrder: ["u", "o"],
      varDesc: { u: "Текущая внешняя строка", o: "Найденный заказ" },
      lineNotes: { 2: "Внешняя таблица — только строки, прошедшие фильтр", 3: "Одно обращение к индексу на КАЖДУЮ внешнюю строку, даже если заказов нет", 4: "Каждая найденная пара сразу в результат" },
      rules: [{ head: "обращений", body: "= внешних строк", cls: "eq" }, { head: "хеш и сортировка", body: "не нужны", cls: "gt" }],
      legend: joinLegendNoHash,
      presets: [
        { label: "в users всего 3 строки", set: { "data-users": "1-12", "data-orders": "r24", "data-filter": "4" }, hint: "3 обращения к индексу" },
        { label: "у части пользователей нет заказов", set: { "data-users": "1-6", "data-orders": "1,1,2,2,5,5", "data-filter": "0" }, hint: "обращение и у тех, у кого пусто" },
        { label: "заказы без пользователя", set: { "data-users": "2-4", "data-orders": "1,2,3,7,8,9", "data-filter": "0" }, hint: "заказы 1, 7, 8, 9 индекс не трогает" },
        { label: "много заказов у одного", set: { "data-users": "1-4", "data-orders": "2,2,2,2,2,2,2,3", "data-filter": "0" }, hint: "все заказы одного — подряд по индексу" }
      ],
      parse: joinCommonParse("nl"),
      inputs: [{ attr: "data-users", label: "Таблица users, id (N, a-b, rK)" }, { attr: "data-orders", label: "Заказы, user_id (N, a-b, rK)" }, { attr: "data-filter", label: "Фильтр u.id < K (0 — без)" }],
      values: joinCommon.values,
      title: function (ctx) { return "Nested Loop · внешних строк: " + ctx.users.length + " · заказов: " + ctx.orders.length; },
      pointers: joinCommon.pointers,
      sumCells: joinCommon.sumCells,
      sumValues: joinCommon.sumValues,
      status: joinCommon.status,
      stepCard: joinCommon.stepCard,
      varsOf: function (s) { return { u: s.vars.u, o: s.vars.o }; },
      customViz: function (panel, ctx) { return joinViz(panel, ctx, "nl"); }
    },
    "pg-join-hash": {
      badge: "Postgres · Hash Join",
      desc: "Сначала хеш-таблица по users (меньшая сторона, build), потом один проход по ВСЕМ заказам с поиском по хешу (probe).",
      valuesLabel: "", codeKey: "pg-join-hash", fillRange: false,
      complexity: { time: "O(users + заказов)", space: "O(users)", good: "★ один проход по каждой стороне" },
      varOrder: ["u", "o"],
      varDesc: { u: "Пользователь из хеш-таблицы", o: "Текущий заказ (probe)" },
      lineNotes: { 2: "build: хеш по users (после фильтра)", 3: "Положили строку в хеш по ключу user id", 6: "probe: читаем ВСЕ заказы, сколько бы ни совпало", 7: "Один поиск по хешу на заказ; нет в хеше — заказ пропускаем, но он уже прочитан", 8: "Совпадение — пара в результат" },
      rules: [{ head: "прочитано заказов", body: "= все заказы", cls: "eq" }, { head: "память", body: "хеш по users", cls: "lt" }],
      legend: joinLegend,
      presets: [
        { label: "в users всего 3 строки", set: { "data-users": "1-12", "data-orders": "r24", "data-filter": "4" }, hint: "заказов прочитано все 24, хеш — 3 строки" },
        { label: "у части пользователей нет заказов", set: { "data-users": "1-6", "data-orders": "1,1,2,2,5,5", "data-filter": "0" }, hint: "читает все 6 заказов; у пользователей 3, 4, 6 заказов нет — хешу это не мешает" },
        { label: "заказы без пользователя", set: { "data-users": "2-4", "data-orders": "1,2,3,7,8,9", "data-filter": "0" }, hint: "заказы 1, 7, 8, 9 без пары: читает и пропускает" },
        { label: "много заказов у одного", set: { "data-users": "1-4", "data-orders": "2,2,2,2,2,2,2,3", "data-filter": "0" }, hint: "семь заказов подряд ищут одного и того же пользователя" }
      ],
      parse: joinCommonParse("hash"),
      inputs: [{ attr: "data-users", label: "Таблица users, id (N, a-b, rK)" }, { attr: "data-orders", label: "Заказы, user_id (N, a-b, rK)" }, { attr: "data-filter", label: "Фильтр u.id < K (0 — без)" }],
      values: joinCommon.values,
      title: function (ctx) { return "Hash Join · users: " + ctx.users.length + " · заказов: " + ctx.orders.length; },
      pointers: joinCommon.pointers,
      sumCells: joinCommon.sumCells,
      sumValues: joinCommon.sumValues,
      status: joinCommon.status,
      stepCard: joinCommon.stepCard,
      varsOf: function (s) { return { u: s.vars.u, o: s.vars.o }; },
      customViz: function (panel, ctx) { return joinViz(panel, ctx, "hash"); }
    },
    "pg-join-merge": {
      badge: "Postgres · Merge Join",
      desc: "Оба входа отсортированы по ключу; по каждому идём вперёд своим указателем, пока одна из сторон не кончится.",
      valuesLabel: "", codeKey: "pg-join-merge", fillRange: false,
      complexity: { time: "O(users + заказов)", space: "O(1)", good: "★ без хеша; входы уже отсортированы индексами" },
      varOrder: ["i", "j"],
      varDesc: { i: "Позиция в users", j: "Позиция в заказах" },
      lineNotes: { 3: "Идём, пока не кончилась хотя бы одна из сторон", 4: "Сравниваем ключи: меньше ли id пользователя, чем user_id заказа", 5: "Меньше — у пользователя заказов больше нет, сдвигаем i", 6: "Сравниваем ключи: больше ли id пользователя, чем user_id заказа", 7: "Больше — заказ без пользователя, сдвигаем j", 9: "Равны — пара в результат", 10: "Следующий заказ: тот же пользователь или уже другой" },
      rules: [{ head: "остановка", body: "кончилась любая сторона", cls: "gt" }, { head: "вход", body: "уже отсортирован", cls: "eq" }],
      legend: joinLegendNoHash,
      presets: [
        { label: "в users всего 3 строки", set: { "data-users": "1-12", "data-orders": "r24", "data-filter": "4" }, hint: "читает, пока не кончится сторона" },
        { label: "у части пользователей нет заказов", set: { "data-users": "1-6", "data-orders": "1,1,2,2,5,5", "data-filter": "0" }, hint: "у пользователей 3 и 4 заказов нет — i просто сдвигается" },
        { label: "заказы без пользователя", set: { "data-users": "2-4", "data-orders": "1,2,3,7,8,9", "data-filter": "0" }, hint: "заказ 1 без пользователя — j++; 8 и 9 не прочитаны: пользователи кончились раньше" },
        { label: "много заказов у одного", set: { "data-users": "1-4", "data-orders": "2,2,2,2,2,2,2,3", "data-filter": "0" }, hint: "один пользователь — j идёт подряд" }
      ],
      parse: joinCommonParse("merge"),
      inputs: [{ attr: "data-users", label: "Таблица users, id (N, a-b, rK)" }, { attr: "data-orders", label: "Заказы, user_id (N, a-b, rK)" }, { attr: "data-filter", label: "Фильтр u.id < K (0 — без)" }],
      values: joinCommon.values,
      title: function (ctx) { return "Merge Join · users: " + ctx.users.length + " · заказов: " + ctx.orders.length; },
      pointers: joinCommon.pointers,
      sumCells: joinCommon.sumCells,
      sumValues: joinCommon.sumValues,
      status: joinCommon.status,
      stepCard: joinCommon.stepCard,
      varsOf: function (s) { return { i: s.vars.i, j: s.vars.j }; },
      customViz: function (panel, ctx) { return joinViz(panel, ctx, "merge"); }
    }
  };

  Object.keys(INFRA).forEach(function (t) { window.ALGO_VIZ.register(t, INFRA[t], CODE[INFRA[t].codeKey]); });
})();
