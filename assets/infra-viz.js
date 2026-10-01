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
    function used() { return slots.reduce(function (a, s) { return a + (s.state === "unused" ? 0 : s.len); }, 0); }
    function upper() { return pageSize - used(); }
    function pack() { // offset каждого tuple: упаковка от конца страницы по порядку слотов
      var off = pageSize;
      slots.forEach(function (s) { if (s.state === "unused") { s.off = 0; return; } off -= s.len; s.off = off; });
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
        var newSlot = slot < 0 ? { n: slots.length + 1, state: "normal", name: op.name, off: 0, len: size } : null;
        var target = newSlot || slots[slot];
        steps.push(snap({ line: 4, vars: v(label, { size: size, slot: target.n, need: need }), info: "need ≤ свободно → вставка пройдёт" }));
        // upper сдвигается ДО появления указателя и tuple: резерв места
        var reserveOff = upper() - size;
        steps.push({ slots: snap({}).slots, lower: lower(), upper: reserveOff, reserved: { off: reserveOff, len: size }, line: 7, vars: v(label, { size: size, slot: target.n, need: need, upper: reserveOff }), info: "upper -= " + size + ": место под строку отрезано от свободной зоны" });
        if (newSlot) slots.push(newSlot); else { target.state = "normal"; target.name = op.name; target.len = size; }
        pack();
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
        pack();
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
})();
