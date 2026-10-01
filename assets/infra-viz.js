/* Инфраструктурные визуализации (Postgres, Redis, Kafka). Регистрируются в движке через
 * window.ALGO_VIZ.register. Генераторы — чистые функции, экспортируются для node-теста. */
(function () {
  "use strict";
  var exportsForTest = {};

  var PAGE_HDR = 24, ITEM = 4, TUP_HDR = 24;
  function maxAlign(n) { return (n + 7) & ~7; }

  // Формат: "+имя:байты" вставка, "-N" удаление слота N (с 1), "vacuum".
  function parseOps(str, pageSize) {
    var max = (pageSize || 8192) - PAGE_HDR - ITEM - TUP_HDR;
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
    var slots = [], steps = [];
    function lower() { return PAGE_HDR + ITEM * slots.length; }
    // upper — физический факт: нижний offset среди tuple, что ещё лежат на странице. Не сумма длин:
    // освобождённое место возвращается в upper только когда compact реально сдвинул строки.
    function upper() {
      var u = pageSize;
      slots.forEach(function (s) { if (s.state !== "unused" && s.off < u) u = s.off; });
      return u;
    }
    function compact() { // как PageRepairFragmentation: физический порядок сохраняется, строки прижаты к концу
      var off = pageSize;
      slots.filter(function (s) { return s.state !== "unused"; })
        .sort(function (a, b) { return b.off - a.off; })
        .forEach(function (s) { off -= s.len; s.off = off; });
      slots.forEach(function (s) { if (s.state === "unused") s.off = 0; });
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
        var need = size + (slot < 0 ? ITEM : 0);
        steps.push(snap({ line: 3, vars: v(label, { size: size, slot: slot < 0 ? -1 : slot + 1, need: need }), info: "need = " + size + (slot < 0 ? " + " + ITEM + " (новый указатель)" : " (указатель уже есть)") + " = " + need + " Б; свободно " + (upper() - lower()) + " Б" }));
        if (need > upper() - lower()) {
          steps.push(snap({ line: 5, hot: true, vars: v(label, { size: size, slot: slot < 0 ? -1 : slot + 1, need: need }), info: "need " + need + " > свободно " + (upper() - lower()) + " → не влезло. Postgres положит строку на другую страницу (или добавит новую)" }));
          return;
        }
        var reserveOff = upper() - size; // новая строка кладётся под нижнюю, остальные не двигаются
        var newSlot = slot < 0 ? { n: slots.length + 1, state: "normal", name: op.name, off: reserveOff, len: size } : null;
        var target = newSlot || slots[slot];
        steps.push(snap({ line: 4, vars: v(label, { size: size, slot: target.n, need: need }), info: "need ≤ свободно → вставка пройдёт" }));
        // upper сдвигается ДО появления указателя и tuple: резерв места
        steps.push({ slots: snap({}).slots, lower: lower(), upper: reserveOff, reserved: { off: reserveOff, len: size }, line: 7, vars: v(label, { size: size, slot: target.n, need: need, upper: reserveOff }), info: "upper -= " + size + ": место под строку отрезано от свободной зоны" });
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
        steps.push(snap({ line: 13, vars: v("Delete(" + op.slot + ")", { slot: op.slot }), info: "xmax проставлен: строка «" + s.name + "» невидима для новых транзакций, но её " + s.len + " Б всё ещё заняты — место вернёт только VACUUM" }));
      } else {
        var dead = slots.filter(function (x) { return x.state === "deleted"; });
        if (!dead.length) {
          steps.push(snap({ line: 16, hot: true, vars: v("Vacuum", {}), info: "Удалённых строк нет — чистить нечего" }));
          return;
        }
        dead.forEach(function (x) { x.state = "unused"; });
        steps.push(snap({ line: 16, vars: v("Vacuum", {}), info: "Указатели удалённых строк (" + dead.map(function (x) { return "№" + x.n; }).join(", ") + ") → unused" }));
        compact();
        steps.push(snap({ line: 17, hot: true, vars: v("Vacuum", {}), info: "compact: живые строки сдвинуты к концу страницы — upper вырос до " + upper() }));
        var before = slots.length;
        while (slots.length && slots[slots.length - 1].state === "unused") slots.pop();
        steps.push(snap({ line: 18, vars: v("Vacuum", {}), info: slots.length < before ? "Хвостовые unused-указатели отрезаны: lower уменьшился до " + lower() : "Хвоста из unused нет — lower не изменился (указатель в середине останется ждать новую строку)" }));
      }
    });
    steps.push(snap({ done: true, line: 19, vars: v("готово", {}), info: "Итог: " + slots.filter(function (x) { return x.state === "normal"; }).length + " живых строк, свободно " + (upper() - lower()) + " Б из " + pageSize }));
    return steps;
  }
  exportsForTest.bPgPage = bPgPage;
  exportsForTest.parseOps = parseOps;
  exportsForTest.maxAlign = maxAlign;
  if (typeof module !== "undefined" && module.exports) module.exports = exportsForTest;
  if (typeof window === "undefined" || !window.ALGO_VIZ) return;

  function pgPageViz(panel, ctx) {
    var H = window.ALGO_VIZ, size = ctx.page;
    var wrap = H.mkEl("div", "iv-page");
    panel.appendChild(wrap);
    function pct(b) { return Math.max(b / size * 100, 0.8) + "%"; }
    function seg(cls, bytes, label) { var e = H.mkEl("div", "iv-seg " + cls, label); e.style.flexBasis = pct(bytes); e.title = label + " · " + bytes + " Б"; return e; }
    return function (s) {
      wrap.innerHTML = "";
      var bar = H.mkEl("div", "iv-bar");
      bar.appendChild(seg("iv-seg--hdr", PAGE_HDR, "hdr"));
      s.slots.forEach(function (sl) { bar.appendChild(seg(sl.state === "unused" ? "iv-seg--unused" : "iv-seg--ptr", ITEM, "№" + sl.n)); });
      var freeBytes = s.upper - s.lower;
      bar.appendChild(seg("iv-seg--free", Math.max(freeBytes, 0), freeBytes > size * 0.06 ? "свободно " + freeBytes + " Б" : ""));
      var tuples = s.slots.filter(function (x) { return x.state !== "unused" && !x.ptrOnly && x.off; }).sort(function (a, b) { return a.off - b.off; });
      if (s.reserved && !tuples.some(function (t) { return t.off === s.reserved.off; })) bar.appendChild(seg("iv-seg--reserved", s.reserved.len, "резерв"));
      tuples.forEach(function (t) { bar.appendChild(seg(t.state === "deleted" ? "iv-seg--dead" : "iv-seg--tup", t.len, t.name + (t.state === "deleted" ? " ✗" : ""))); });
      wrap.appendChild(bar);
      var ruler = H.mkEl("div", "iv-ruler");
      ruler.appendChild(H.mkEl("span", "", "lower = " + s.lower));
      ruler.appendChild(H.mkEl("span", "iv-ruler__free", "← свободно " + freeBytes + " Б →"));
      ruler.appendChild(H.mkEl("span", "", "upper = " + s.upper));
      wrap.appendChild(ruler);
      var tbl = H.mkEl("table", "iv-slots");
      var head = H.mkEl("tr"); ["указатель", "состояние", "строка", "смещение", "байт"].forEach(function (h) { head.appendChild(H.mkEl("th", "", h)); });
      tbl.appendChild(head);
      var names = { normal: "живая", deleted: "удалена (xmax)", unused: "unused" };
      s.slots.forEach(function (sl) {
        var r = H.mkEl("tr", "iv-slots__" + sl.state);
        [sl.n, names[sl.state], sl.state === "unused" ? "—" : sl.name, sl.state === "unused" ? "—" : sl.off, sl.state === "unused" ? "—" : sl.len].forEach(function (c) { r.appendChild(H.mkEl("td", "", String(c))); });
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
      "    need := size + p.pointerCost(slot) // 4 байта, если слот новый",
      "    if need > p.upper-p.lower {",
      "        return 0, false // не влезло: строка уйдёт на другую страницу",
      "    }",
      "    p.upper -= size",
      "    p.setPointer(slot, p.upper)",
      "    copy(p.buf[p.upper:], data)",
      "    return slot, true",
      "}",
      "func (p *Page) Delete(slot int) {",
      "    p.tuple(slot).xmax = txid // помечена, но место НЕ освобождено",
      "}",
      "func (p *Page) Vacuum() {",
      "    p.freeDeadPointers() // указатель удалённой строки → unused",
      "    p.compact() // живые tuple сдвигаются к концу, upper растёт",
      "    p.truncateTrailingPointers() // хвост unused-указателей: lower уменьшается",
      "}"
    ]
  };

  var INFRA = {
    "pg-page": {
      badge: "Postgres · страница 8 КБ",
      desc: "Страница кучи Postgres: заголовок, массив указателей (растёт сверху вниз) и строки (растут снизу вверх). Между ними — свободное место. DELETE место не освобождает — это делает VACUUM.",
      valuesLabel: "", codeKey: "pg-page", fillRange: false,
      complexity: { time: "вставка O(1)", space: "8192 Б на страницу", good: "★ 1 чтение = 1 страница" },
      varOrder: ["op", "size", "slot", "need", "lower", "upper"],
      varDesc: { op: "Операция", size: "Размер строки (выровнено до 8)", slot: "Слот (указатель)", need: "Сколько байт нужно", lower: "Конец массива указателей", upper: "Начало зоны строк" },
      lineNotes: { 1: "Заголовок tuple 24 Б + данные, округление вверх до кратного 8", 2: "Ищем освободившийся указатель — переиспользуем", 3: "Новый указатель стоит ещё 4 байта", 4: "Хватит ли места между lower и upper?", 5: "Нет — строка уедет на другую страницу", 7: "Зона строк растёт вниз-вверх: upper уменьшается", 8: "Указатель записан; lower растёт, если слот новый", 9: "Сами байты строки — по смещению upper", 13: "DELETE лишь ставит xmax: байты остаются", 16: "Указатель удалённой строки освобождается", 17: "Живые строки сдвигаются, место объединяется", 18: "Хвост неиспользуемых указателей отрезается" },
      rules: [{ head: "указатели", body: "растут сверху", cls: "eq" }, { head: "строки", body: "растут снизу", cls: "gt" }, { head: "DELETE", body: "место не возвращает", cls: "lt" }],
      legend: [{ cls: "iv-seg--hdr", label: "заголовок страницы (24 Б)" }, { cls: "iv-seg--ptr", label: "указатель на строку (4 Б)" }, { cls: "iv-seg--tup", label: "живая строка" }, { cls: "iv-seg--dead", label: "удалена, место занято" }, { cls: "iv-seg--free", label: "свободное место" }],
      presets: [
        { label: "пример главы", set: { "data-ops": "+a:2000,+b:2000,+c:2000,+d:2000,+e:2000", "data-page": "8192" }, hint: "4 строки влезли, пятая — нет" },
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
      varsOf: function (s) { return { op: s.vars.op, size: s.vars.size, slot: s.vars.slot, need: s.vars.need, lower: s.vars.lower, upper: s.vars.upper }; },
      customViz: pgPageViz
    }
  };

  Object.keys(INFRA).forEach(function (t) { window.ALGO_VIZ.register(t, INFRA[t], CODE[INFRA[t].codeKey]); });
})();
