#!/usr/bin/env node
// Проверка infra-viz: хук регистрации (jsdom) и генераторы (чистый node).
"use strict";
const fs = require("fs");
const path = require("path");
let JSDOM;
try { ({ JSDOM } = require("jsdom")); } catch (e) { console.log("✗ infra-viz-check: нужен jsdom (npm i --no-save jsdom) — проверка не выполнена"); process.exit(1); }
const root = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, "assets", f), "utf8");
let failed = 0;
const eq = (name, got, want) => { if (JSON.stringify(got) !== JSON.stringify(want)) { failed++; console.error(`✗ ${name}\n  got:  ${JSON.stringify(got)}\n  want: ${JSON.stringify(want)}`); } else console.log(`✓ ${name}`); };

// --- хук ---
{
  const html = `<!DOCTYPE html><html><body><div class="algo-viz" id="a" data-viz="x-test"></div><div class="algo-viz" id="b" data-viz="x-missing"></div>
    <script>${read("algo-viz.js")}</script>
    <script>
      window.ALGO_VIZ.register("x-test", {
        badge: "t", desc: "t", valuesLabel: "", codeKey: "x-test", fillRange: false,
        complexity: { time: "O(1)", space: "O(1)", good: "" }, varOrder: ["a"], varDesc: { a: "a" }, lineNotes: {}, rules: [],
        parse: function () { return { steps: [{ line: 0, vars: { a: 1 }, info: "один" }, { done: true, line: 0, vars: { a: 2 }, info: "два" }] }; },
        inputs: [], values: function () { return []; }, title: function () { return "T"; }, pointers: function () { return { lo: -1, hi: -1 }; },
        sumCells: ["a"], sumValues: function (s) { return [{ text: s.vars.a }]; },
        status: function (s) { return { kind: "info", icon: "i", head: "h", text: s.info }; },
        stepCard: function (s) { return { a: s.vars.a, b: "", c: "", cls: "eq" }; }, varsOf: function (s) { return { a: s.vars.a }; },
        customViz: function (panel) { return function (s) { panel.textContent = "viz:" + s.info; }; }
      }, ["// x"]);
    </script></body></html>`;
  const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true });
  dom.window.document.dispatchEvent(new dom.window.Event("DOMContentLoaded"));
  const a = dom.window.document.getElementById("a"), b = dom.window.document.getElementById("b");
  eq("register: тип отрисован", a.classList.contains("algo-viz--ready") && /viz:один/.test(a.textContent), true);
  eq("register: чужой тип по-прежнему «Неизвестный»", /Неизвестный тип/.test(b.textContent), true);
}
// --- register: дубликаты и кривые вызовы падают громко ---
{
  const dom = new JSDOM(`<!DOCTYPE html><html><body><script>${read("algo-viz.js")}</script></body></html>`, { runScripts: "dangerously" });
  const R = dom.window.ALGO_VIZ.register;
  const throws = (f) => { try { f(); return false; } catch (e) { return true; } };
  eq("register: встроенный тип (lsm-put) не перезаписывается", throws(() => R("lsm-put", { codeKey: "x-lsm-put" }, ["//"])), true);
  eq("register: чужой листинг (codeKey встроенного) не перезаписывается", throws(() => R("x-new-1", { codeKey: "lsm-put" }, ["//"])), true);
  R("x-twice", { codeKey: "x-twice" }, ["//"]);
  eq("register: повтор того же нового типа бросает", throws(() => R("x-twice", { codeKey: "x-twice-2" }, ["//"])), true);
  eq("register: без codeKey бросает", throws(() => R("x-nokey", {}, ["//"])), true);
  eq("register: без листинга бросает", throws(() => R("x-nocode", { codeKey: "x-nocode" })), true);
}
// --- виджет pg-page (jsdom) ---
function buildPg(attrs) {
  const at = Object.keys(attrs).map((k) => `${k}="${attrs[k]}"`).join(" ");
  const html = `<!DOCTYPE html><html><body><div class="algo-viz" id="w" tabindex="0" data-viz="pg-page" ${at}></div>
    <script>${read("algo-viz.js")}</script><script>${read("infra-viz.js")}</script></body></html>`;
  const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true });
  dom.window.document.dispatchEvent(new dom.window.Event("DOMContentLoaded"));
  const el = dom.window.document.getElementById("w");
  const key = () => el.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
  return { el, key, win: dom.window };
}
{
  const { el, key } = buildPg({ "data-ops": "+a:2000,+b:2000,-1,vacuum" });
  let sawTup = false, sawDead = false, sawDeadPtr = false, sawDeadRow = false, sawUnused = false, sawHole = false;
  for (let i = 0; i < 60; i++) {
    key();
    if (el.querySelector(".iv-seg--tup")) sawTup = true;
    if (el.querySelector(".iv-seg--dead")) sawDead = true;
    if (el.querySelector(".iv-seg--deadptr")) sawDeadPtr = true;
    if (el.querySelector(".iv-slots__dead")) sawDeadRow = true;
    if (el.querySelector(".iv-seg--unused")) sawUnused = true;
    if (el.querySelector(".iv-seg--hole")) sawHole = true;
  }
  eq("pg-page: построен без ошибок", el.classList.contains("algo-viz--ready") && !/Ошибка визуализации/.test(el.textContent), true);
  eq("pg-page: дошёл до итога", /Итог:/.test(el.textContent), true);
  eq("pg-page: рисунок страницы на месте", !!el.querySelector(".iv-page"), true);
  eq("pg-page: по ходу рисовались живая и удалённая строки", [sawTup, sawDead], [true, true]);
  // VACUUM как в Postgres: dead-указатель (полоса и строка таблицы), потом unused; «дыр» не бывает
  eq("pg-page: рисовались dead-указатель (полоса и таблица) и unused, дыры — нет", [sawDeadPtr, sawDeadRow, sawUnused, sawHole], [true, true, true, false]);
}
{
  const { el, key } = buildPg({ "data-ops": "+a:2000,+b:2000,+c:2000,-1,-2,vacuum,+d:2000,+e:2000", "data-page": "8192" });
  for (let i = 0; i < 120; i++) key();
  eq("pg-page: DELETE+VACUUM заканчивается 3 живыми строками", /Итог: 3 живых/.test(el.textContent), true);
  eq("pg-page: в финале нарисованы 3 живых tuple", el.querySelectorAll(".iv-seg--tup").length, 3);
}
{
  // каждый пресет из конфига строится и доходит до итога без ошибок
  const src = read("infra-viz.js");
  const re = /\{ label: "([^"]+)", set: \{ "data-ops": "([^"]+)", "data-page": "(\d+)" \}/g;
  let m, n = 0;
  while ((m = re.exec(src))) {
    n++;
    const { el, key } = buildPg({ "data-ops": m[2], "data-page": m[3] });
    for (let i = 0; i < 200; i++) key();
    eq("pg-page пресет «" + m[1] + "»: без ошибок, до итога", el.classList.contains("algo-viz--ready") && !/Ошибка визуализации/.test(el.textContent) && /Итог:/.test(el.textContent), true);
  }
  eq("pg-page: найдено 5 пресетов", n, 5);
}
{
  // полоса страницы: сумма flex-basis сегментов не больше 100% на КАЖДОМ шаге, а в конце ≈ 100%
  const sums = (opsStr) => {
    const { el, key } = buildPg({ "data-ops": opsStr, "data-page": "8192" });
    const out = [];
    const read1 = () => {
      const segs = Array.from(el.querySelectorAll(".iv-bar > .iv-seg"));
      const w = (e) => parseFloat(e.style.flexBasis);
      const free = el.querySelector(".iv-seg--free");
      out.push({ sum: segs.reduce((a, e) => a + w(e), 0), free: free ? w(free) : null });
    };
    read1();
    for (let i = 0; i < 120; i++) { key(); read1(); }
    return out;
  };
  const tight = sums("+a:2000,+b:2000,+c:2000,+d:2056");
  eq("pg-page впритык: сумма сегментов ≤ 100% на каждом шаге", tight.every((x) => x.sum <= 100.0001), true);
  eq("pg-page впритык: в конце сумма ≈ 100%", Math.abs(tight[tight.length - 1].sum - 100) < 0.01, true);
  eq("pg-page впритык: free = 0 даёт сегмент нулевой ширины", tight[tight.length - 1].free, 0);
  const vac = sums("+a:2000,+b:2000,+c:2000,-1,-2,vacuum,+d:2000,+e:2000");
  eq("pg-page DELETE+VACUUM: сумма сегментов ≤ 100% на каждом шаге", vac.every((x) => x.sum <= 100.0001), true);
  eq("pg-page DELETE+VACUUM: в конце сумма ≈ 100%", Math.abs(vac[vac.length - 1].sum - 100) < 0.01, true);
  const narrow = sums("+a:1,+b:1,+c:1,+d:1,+e:1,+f:1,+g:1,+h:1,+i:1,+j:1,+k:1,+l:1,+m:1,+n:1,+o:1,+p:1,+q:1,+r:1,+s:1,+t:1");
  eq("pg-page: много узких строк — сумма ≤ 100%", narrow.every((x) => x.sum <= 100.0001), true);
}
// --- генератор pg-page ---
const infra = require(path.join(root, "assets", "infra-viz.js"));
const last = (steps) => steps[steps.length - 1];
const run = (s, size) => infra.bPgPage(infra.parseOps(s), size || 8192);
{
  // 4 строки по 2000 байт данных: tuple = 24+2000 = 2024; lower 24+4*4=40, upper 8192-4*2024=96
  const st = run("+a:2000,+b:2000,+c:2000,+d:2000");
  eq("4 строки влезают: lower/upper", [last(st).lower, last(st).upper], [40, 96]);
  // 5-я: нужно 2024+4=2028 > 96-40=56 — не влезает
  const st5 = run("+a:2000,+b:2000,+c:2000,+d:2000,+e:2000");
  eq("5-я не влезает, состояние не меняется", [last(st5).lower, last(st5).upper, last(st5).slots.length], [40, 96, 4]);
  // режим 🎯 спрашивает про `if need > …` по паре кадров (строка 4, следующий кадр): у вставок,
  // что влезли, за 4 идёт 7 («нет»), у пятой — 5 («да»). Без кадра 4 в этой ветке вопрос пропадал.
  const after4 = st5.map((s, i) => (s.line === 4 ? st5[i + 1].line : null)).filter((x) => x !== null);
  eq("кадр на проверке if есть у каждой вставки: 4 раза «нет» (→7), 1 раз «да» (→5)", after4, [7, 7, 7, 7, 5]);
}
{
  // чип slot = значение переменной листинга (правило 3): до `slot = p.setPointer(...)` (строка 8)
  // это -1 или номер переиспользуемого указателя; номер нового появляется только с кадра строки 8.
  // Две вставки, а не одна: номер №2 отличает «номер нового указателя» от константы 1.
  const slotAt = (steps, n) => steps.filter((s) => s.line === n).map((s) => s.vars.slot);
  const fresh = run("+a:100,+b:100");
  eq("slot: новый указатель — на кадрах 4 и 7 ещё -1", [slotAt(fresh, 4), slotAt(fresh, 7)], [[-1, -1], [-1, -1]]);
  eq("slot: новый указатель — на кадре 8 уже №1, №2", slotAt(fresh, 8), [1, 2]);
  // освобождён №2 из середины (хвост живой — VACUUM его не отрежет): вставка берёт именно его
  const reuse = run("+a:100,+b:100,+c:100,-2,vacuum,+d:100");
  const tail = reuse.slice(reuse.map((s) => s.line).lastIndexOf(2));
  eq("slot: переиспользуемый указатель — на кадрах 4, 7, 8 это №2", [slotAt(tail, 4), slotAt(tail, 7), slotAt(tail, 8)], [[2], [2], [2]]);
}
{
  // граница: после 3 строк свободно 8192-24-3*(2024+4)=2084; строка с need=2084 влезает: 4+maxAlign(24+d)=2084 → d=2056
  const edge = run("+a:2000,+b:2000,+c:2000,+d:2056");
  eq("ровно впритык влезает (free=0)", last(edge).upper - last(edge).lower, 0);
  const over = run("+a:2000,+b:2000,+c:2000,+d:2057");
  eq("на 1 байт больше — не влезает (maxAlign округляет до 2088, need=2092)", last(over).slots.length, 3);
}
{
  const st = run("+a:100,+b:100,-1");
  eq("delete: tuple остаётся, место не освобождено", [last(st).upper, last(st).slots[0].state], [8192 - 2 * 128, "deleted"]);
  const v = run("+a:100,+b:100,-1,vacuum");
  eq("vacuum: место возвращено, указатель unused", [last(v).upper, last(v).slots[0].state], [8192 - 128, "unused"]);
  const v2 = run("+a:100,+b:100,-2,vacuum");
  eq("vacuum: хвостовой unused-указатель отрезан (lower уменьшился)", last(v2).lower, 24 + 4);
  const re = run("+a:100,+b:100,-1,vacuum,+c:100");
  eq("новая строка берёт освободившийся слот 1 без роста lower", [last(re).slots[0].name, last(re).lower], ["c", 24 + 2 * 4]);
}
{
  const bad = run("-9,-1,vacuum");
  eq("delete несуществующего слота и vacuum на пустой — не падают", last(bad).slots.length, 0);
  eq("парсер отбрасывает размер 0 и больше страницы", infra.parseOps("+a:0,+b:99999,+c:10").map((o) => o.name), ["c"]);
}
{
  // finding 1: вставка в переиспользованный слот не двигает остальные строки.
  // a@8064 b@7936 c@7808; -1+vacuum: compact сохраняет физический порядок b,c у конца страницы → b@8064 c@7936; d → 7936-128=7808
  const st = run("+a:100,+b:100,+c:100,-1,vacuum,+d:100");
  const L = last(st);
  eq("reuse: d кладётся под compact-нутые b,c, они не двигаются", L.slots.map((s) => [s.name, s.off]), [["d", 7808], ["b", 8064], ["c", 7936]]);
  const l7 = st.filter((s) => s.line === 7).pop(), l8 = st.filter((s) => s.line === 8).pop();
  eq("reuse: reserved.off на строке 8 = на строке 7", l8.reserved.off, l7.reserved.off);
  // порядок VACUUM как в Postgres 16 (pageinspect): строка 16 — compact: байты удалённых строк
  // выброшены, живые сжаты к концу, upper вырос, а указатели удалённых — dead (lp_flags 3);
  // строка 17 — dead → unused (lp_flags 0), upper уже не меняется; строка 18 — хвост unused.
  const v = run("+a:100,+b:100,+c:100,-1,vacuum");
  const f16 = v.filter((s) => s.line === 16)[0], f17 = v.filter((s) => s.line === 17)[0], f18 = v.filter((s) => s.line === 18)[0];
  eq("vacuum 16 (compact): upper вырос, №1 dead без байтов, b/c сжаты к концу", [f16.upper, f16.slots.map((s) => [s.state, s.off, s.len])],
    [7936, [["dead", 0, 0], ["normal", 8064, 128], ["normal", 7936, 128]]]);
  eq("vacuum 16: удалённых (deleted) строк на странице не осталось", f16.slots.some((s) => s.state === "deleted"), false);
  eq("vacuum 17 (freeDeadPointers): №1 dead → unused, upper тот же", [f17.upper, f17.slots[0].state], [7936, "unused"]);
  eq("vacuum 18: хвост живой — lower не изменился", [f18.lower, f18.slots.length], [36, 3]);
  // то же на числах главы: 4 строки по 2024, удалены 1 и 2 — как «Посмотри сам» после SELECT (dead) и VACUUM (unused)
  const g = run("+a:2000,+b:2000,+c:2000,+d:2000,-1,-2,vacuum");
  const g16 = g.filter((s) => s.line === 16)[0], g17 = g.filter((s) => s.line === 17)[0];
  eq("live: compact — upper 4144, №1/№2 dead, c/d на 6168/4144", [g16.lower, g16.upper, g16.slots.map((s) => [s.state, s.off])],
    [40, 4144, [["dead", 0], ["dead", 0], ["normal", 6168], ["normal", 4144]]]);
  eq("live: freeDeadPointers — №1/№2 unused, lower 40, upper 4144", [g17.lower, g17.upper, g17.slots.map((s) => s.state)],
    [40, 4144, ["unused", "unused", "normal", "normal"]]);
  // finding 3: compact сохраняет физический порядок, а не порядок слотов
  const o = run("+a:100,+b:100,+c:100,-2,vacuum,+d:100,-1,vacuum");
  eq("compact: физический порядок (c выше d), не слотовый", last(o).slots.map((s) => [s.name, s.off]), [["a", 0], ["d", 7936], ["c", 8064]]);
}
{
  // Сверка с живым Postgres 16 (pglab, pageinspect). Таблица (id int, pad text), STORAGE PLAIN,
  // pad = repeat('x', N): данные = 4 (int) + 4 (заголовок text) + N, то есть "+a:2000" — это N = 1992.
  // Числа ниже — вывод page_header/heap_page_items, а не пересчёт модели.
  const slotsOf = (L) => L.slots.map((s) => [s.n, s.state, s.off]);
  const ex = last(run("+a:2000,+b:2000,+c:2000,+d:2000,+e:2000"));
  eq("live: пример главы — lower 40, upper 96, смещения 6168/4144/2120/96", [ex.lower, ex.upper, slotsOf(ex)],
    [40, 96, [[1, "normal", 6168], [2, "normal", 4144], [3, "normal", 2120], [4, "normal", 96]]]);
  const al = last(run("+a:2004,+b:2004,+c:2004,+d:2004"));
  eq("live: lp_len 2028 занимает 2032 (смещения через 2032), upper 64", [al.upper, al.slots.map((s) => s.off)], [64, [6160, 4128, 2096, 64]]);
  const dv = last(run("+a:2000,+b:2000,+c:2000,-1,-2,vacuum,+d:2000,+e:2000"));
  eq("live: DELETE + VACUUM — lower 36, upper 2120, d/e в слотах 1/2, c переехала на 6168", [dv.lower, dv.upper, dv.slots.map((s) => [s.name, s.off])],
    [36, 2120, [["d", 4144], ["e", 2120], ["c", 6168]]]);
  const dn = last(run("+a:2000,+b:2000,+c:2000,-1,-2,+d:2000,+e:2000"));
  eq("live: DELETE без VACUUM — lower 40, upper 96, e не влезла", [dn.lower, dn.upper, dn.slots.length], [40, 96, 4]);
  const ti = last(run("+a:2000,+b:2000,+c:2000,+d:2056"));
  eq("live: впритык — lower 40 = upper 40", [ti.lower, ti.upper], [40, 40]);
  const nr = last(run("+a:100,+b:100,+c:100,+d:100,+e:100,+f:100"));
  eq("live: узкие строки — lower 48, upper 7424", [nr.lower, nr.upper], [48, 7424]);
  // запас под указатель нужен и при переиспользовании: free 2080, свободен №1 → строка 2080 Б ушла на (1,1)
  const r1 = last(run("+a:2000,+b:2000,+c:2000,+d:2000,-1,vacuum,+e:2056"));
  eq("live: старый указатель свободен, но 2080 Б при free 2080 не влезают", [r1.lower, r1.upper, r1.slots[0].state], [40, 2120, "unused"]);
  const r2 = last(run("+a:2000,+b:2000,+c:2000,+d:2000,-1,vacuum,+e:2048"));
  eq("live: 2072 Б при free 2080 встают в №1 — lower 40, upper 48", [r2.lower, r2.upper, r2.slots[0].name], [40, 48, "e"]);
  // VACUUM отрезает хвост unused, но не указатель №1
  const tr = last(run("+a:2000,+b:2000,+c:2000,+d:2000,-3,-4,vacuum"));
  eq("live: удалены 3 и 4 → lower 32, upper 4144", [tr.lower, tr.upper], [32, 4144]);
  const em = last(run("+a:2000,+b:2000,+c:2000,+d:2000,-1,-2,-3,-4,vacuum"));
  eq("live: удалено всё → lower 28, upper 8192, №1 unused остался", [em.lower, em.upper, slotsOf(em)], [28, 8192, [[1, "unused", 0]]]);
  // предел строки: 8160 Б с заголовком (MaxHeapTupleSize), больше — ошибка «row is too big»
  eq("live: парсер принимает 8136 Б данных и отбрасывает 8137", infra.parseOps("+a:8136,+b:8137").map((o) => o.name), ["a"]);
  const mx = last(run("+a:8136"));
  eq("live: строка 8160 Б — lower 28, upper 32", [mx.lower, mx.upper], [28, 32]);
}
{
  // инварианты на случайных последовательностях (детерминированный PRNG)
  let seed = 12345;
  const rnd = (n) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
  let bad = null;
  for (let it = 0; it < 500 && !bad; it++) {
    const ops = [];
    for (let k = 0, n = 3 + rnd(12); k < n; k++) {
      const r = rnd(10);
      ops.push(r < 6 ? "+r" + k + ":" + (1 + rnd(1500)) : r < 9 ? "-" + (1 + rnd(5)) : "vacuum");
    }
    const steps = run(ops.join(","));
    steps.forEach((s, i) => {
      if (bad) return;
      // строки на странице — у normal и deleted; у dead и unused байтов нет (lp_off = lp_len = 0)
      const live = s.slots.filter((x) => x.state === "normal" || x.state === "deleted");
      const empty = s.slots.filter((x) => x.state === "dead" || x.state === "unused");
      const minOff = live.length ? Math.min.apply(null, live.map((x) => x.off)) : 8192;
      const rs = live.map((x) => [x.off, x.off + x.len]).sort((a, b) => a[0] - b[0]);
      let overlap = false;
      for (let j = 1; j < rs.length; j++) if (rs[j][0] < rs[j - 1][1]) overlap = true;
      const reservedUp = s.reserved && s.line === 7;
      // строки лежат вплотную от upper до конца страницы — «дыр» нет ни на одном кадре
      const packed = reservedUp || live.reduce((a, x) => a + x.len, 0) === 8192 - s.upper;
      // dead живёт только на кадре compact (16): до него — deleted, после — unused
      const deadOk = s.slots.every((x) => x.state !== "dead" || s.line === 16) && (s.line !== 16 || s.slots.every((x) => x.state !== "deleted"));
      const emptyOk = empty.every((x) => x.off === 0 || s.line < 16);
      if (s.lower !== 24 + 4 * s.slots.length || (!reservedUp && s.upper !== minOff) || s.lower > s.upper || overlap || rs.some((r) => r[1] > 8192) || !packed || !deadOk || !emptyOk)
        bad = { ops: ops.join(","), step: i, line: s.line, lower: s.lower, upper: s.upper, minOff, overlap, packed, deadOk, emptyOk };
    });
  }
  eq("инварианты lower/upper/пересечения/плотность/dead на 500 случайных последовательностях", bad, null);
}
// --- сканы таблицы ---
{
  const P = 12, R = 8, total = P * R;
  const pg = (r) => Math.floor(r / R);
  const transitions = (list) => list.reduce((n, r, i) => n + (i === 0 || pg(r) !== pg(list[i - 1]) ? 1 : 0), 0);
  const distinct = (list) => new Set(list.map(pg)).size;
  const cases = {
    scattered: infra.parseMatch("r5", total),
    clustered: infra.parseMatch("0-4", total),
    many: infra.parseMatch("r67", total),
    revisit: [3, 40, 4, 41]       // страница 0, страница 5, снова 0 (перечитывается), снова 5
  };
  eq("parseMatch: r5 — 5 различных строк в пределах таблицы", [cases.scattered.length, new Set(cases.scattered).size, cases.scattered.every((r) => r >= 0 && r < total)], [5, 5, true]);
  eq("parseMatch: r5 детерминирован", infra.parseMatch("r5", total), cases.scattered);
  eq("parseMatch: диапазон, дубликаты и выход за таблицу", infra.parseMatch("2-4,3,999,x,2", total), [2, 3, 4]);
  eq("parseMatch: пусто", infra.parseMatch("", total), []);
  Object.keys(cases).forEach((name) => {
    const m = cases[name];
    eq(`seq(${name}): читает все ${P} страниц`, last(infra.bScanSeq(P, R, m)).total, P);
    eq(`seq(${name}): находит все подходящие строки`, last(infra.bScanSeq(P, R, m)).found.slice().sort((a, b) => a - b), m.slice().sort((a, b) => a - b));
    eq(`index(${name}): чтений = число смен страницы подряд`, last(infra.bScanIndex(P, R, m)).total, transitions(m));
    eq(`index(${name}): строки в порядке ключа`, last(infra.bScanIndex(P, R, m)).found, m);
    eq(`bitmap(${name}): чтений = число различных страниц`, last(infra.bScanBitmap(P, R, m)).total, distinct(m));
    eq(`bitmap(${name}): каждая страница не больше одного раза`, Math.max.apply(null, last(infra.bScanBitmap(P, R, m)).reads), Math.min(1, distinct(m)));
  });
  eq("index(revisit): возврат на ту же страницу позже — перечитывание ×2", last(infra.bScanIndex(P, R, cases.revisit)).reads[0], 2);
  eq("index(revisit): подряд на одной странице не перечитывается", infra.bScanIndex(P, R, [0, 1, 2]).filter((s) => s.line === 5).length, 1);
  eq("пустой набор: seq читает всё, index/bitmap — ничего", [last(infra.bScanSeq(P, R, [])).total, last(infra.bScanIndex(P, R, [])).total, last(infra.bScanBitmap(P, R, [])).total], [P, 0, 0]);
  eq("все кадры index: line из листинга 0–11, последний done", [infra.bScanIndex(P, R, cases.many).every((s) => s.line >= 0 && s.line <= 11), !!last(infra.bScanIndex(P, R, cases.many)).done], [true, true]);
  eq("index: кадр if (line 4) после выбора tid (line 3) всегда", infra.bScanIndex(P, R, cases.scattered).every((s, i, a) => s.line !== 4 || a[i - 1].line === 3), true);
  eq("bitmap: страницы читаются по возрастанию", infra.bScanBitmap(P, R, cases.many).filter((s) => s.line === 7).map((s) => s.mark), infra.bScanBitmap(P, R, cases.many).filter((s) => s.line === 7).map((s) => s.mark).slice().sort((a, b) => a - b));
  // Сверка с живым Postgres 16 (pglab, 2026-10-01): scan_demo — 12 страниц по 8 строк, физический
  // порядок = id, k = (id·37) mod 96. Списки id — в порядке ключа (SELECT id … ORDER BY k), числа —
  // страницы ТАБЛИЦЫ: Seq — Buffers целиком, Index — Buffers минус 1 страница индекса (её же
  // показывает Bitmap Index Scan), Bitmap — Heap Blocks: exact; Index ещё и по pg_statio_user_tables.
  const live = {
    "k < 5": { ids: [0, 13, 26, 39, 52], pg: [12, 5, 5] },
    "id < 5": { ids: [0, 1, 2, 3, 4], pg: [12, 1, 1] },
    "k < 67": { ids: Array.from({ length: 67 }, (_, k) => (k * 13) % 96), pg: [12, 67, 12] },
    "k < 0": { ids: [], pg: [12, 0, 0] }
  };
  Object.keys(live).forEach((q) => {
    const l = live[q].ids;
    eq(`живой Postgres, ${q}: Seq / Index / Bitmap = ${live[q].pg.join(" / ")}`, [last(infra.bScanSeq(P, R, l)).total, last(infra.bScanIndex(P, R, l)).total, last(infra.bScanBitmap(P, R, l)).total], live[q].pg);
  });
  // ctid в Postgres нумерует указатели с 1: строки k < 5 вживую — (0,1) (1,6) (3,3) (4,8) (6,5)
  eq("ctid в тексте — как у Postgres, указатели с 1", infra.bScanIndex(P, R, live["k < 5"].ids).filter((s) => s.line === 3).map((s) => s.vars.tid), ["(0,1)", "(1,6)", "(3,3)", "(4,8)", "(6,5)"]);
  // карта точная (Heap Blocks: exact): со страницы берутся запомненные строки, всех R не перепроверяем
  const takes = infra.bScanBitmap(P, R, [0, 13, 1]).filter((s) => s.line === 8).map((s) => s.info);
  eq("bitmap: точная карта — берёт запомненные строки, без Recheck всей страницы", [takes.every((t) => /по запомненным номерам/.test(t) && !/Recheck/.test(t)), /2 строки/.test(takes[0]), /1 строку/.test(takes[1])], [true, true, true]);
}
// --- виджеты сканов: рисунок, счётчик, пресеты ---
{
  const types = ["pg-scan-seq", "pg-scan-index", "pg-scan-bitmap"];
  const P = 12, R = 8, pg = (r) => Math.floor(r / R);
  const run = (type, attrs) => {
    const div = `<div class="algo-viz" id="w" tabindex="0" data-viz="${type}" ${attrs}></div>`;
    const dom = new JSDOM(`<!DOCTYPE html><html><body>${div}<script>${read("algo-viz.js")}</script><script>${read("infra-viz.js")}</script></body></html>`, { runScripts: "dangerously", pretendToBeVisual: true });
    dom.window.document.dispatchEvent(new dom.window.Event("DOMContentLoaded"));
    const el = dom.window.document.getElementById("w");
    for (let i = 0; i < 400; i++) el.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    return el;
  };
  const list = infra.parseMatch("r5", P * R);
  types.forEach((t) => {
    const el = run(t, 'data-pages="12" data-rows="8" data-match="r5"');
    eq(`${t}: построен без ошибок`, el.classList.contains("algo-viz--ready") && !/Ошибка визуализации|Неизвестный тип/.test(el.textContent), true);
    eq(`${t}: сетка ${P} страниц и ${P * R} ячеек`, [el.querySelectorAll(".iv-scan__page").length, el.querySelectorAll(".iv-scan__cell").length], [P, P * R]);
    eq(`${t}: дошёл до итога`, /Итог:/.test(el.textContent), true);
  });
  const want = { "pg-scan-seq": P, "pg-scan-index": last(infra.bScanIndex(P, R, list)).total, "pg-scan-bitmap": new Set(list.map(pg)).size };
  types.forEach((t) => {
    const el = run(t, 'data-pages="12" data-rows="8" data-match="r5"');
    eq(`${t}: счётчик чтений на экране = модель`, +el.querySelector(".iv-scan__reads").getAttribute("data-reads"), want[t]);
    // «62 из 12 страниц» читалось как дробь: число чтений и размер таблицы — две разные величины
    eq(`${t}: заголовок — «N · в таблице 12 страниц», без «из»`, /^Чтений страницы таблицы: \d+ · в\sтаблице\s12\sстраниц$/.test(el.querySelector(".iv-scan__reads").textContent), true);
  });
  // граница: пустой набор и нечисловые размеры не ломают
  types.forEach((t) => {
    const el = run(t, 'data-pages="abc" data-rows="0" data-match=""');
    eq(`${t}: пустой набор и мусорные размеры — без ошибок`, el.classList.contains("algo-viz--ready") && !/Ошибка визуализации/.test(el.textContent), true);
  });
  // пресеты: каждый строится без ошибок у каждого типа
  const src = read("infra-viz.js");
  types.forEach((t) => {
    const body = src.slice(src.indexOf(`    "${t}": {`));
    const block = (body.match(/presets: \[\n([\s\S]*?)\n      \],/) || [])[1] || "";
    const presets = [...block.matchAll(/set: \{([^}]*)\}/g)].map((m) => Object.fromEntries([...m[1].matchAll(/"(data-[a-z-]+)":\s*"([^"]*)"/g)].map((x) => [x[1], x[2]])));
    // «пример главы» движок ставит сам; свой пресет с теми же атрибутами был бы второй одинаковой кнопкой
    eq(`${t}: 3 пресета с ровно тремя полями, ни один не «пример главы»`, [presets.length, presets.every((p) => Object.keys(p).sort().join() === "data-match,data-pages,data-rows"), /label: "пример главы/.test(block)], [3, true, false]);
    presets.forEach((p, i) => {
      const el = run(t, Object.keys(p).map((k) => `${k}="${p[k]}"`).join(" "));
      eq(`${t}: пресет ${i + 1} строится`, el.classList.contains("algo-viz--ready") && !/Ошибка визуализации/.test(el.textContent) && /Итог:/.test(el.textContent), true);
    });
  });
  // точки легенды: движок рисует их классом algo-tp__legdot--<cls>; без правила в CSS все шесть — одинаковые пустые кружки
  {
    const css = read("infra-viz.css");
    const legend = src.slice(src.indexOf("var scanCommon"));
    const classes = [...legend.slice(legend.indexOf("legend: ["), legend.indexOf("\n  };")).matchAll(/cls: "([^"]+)"/g)].map((m) => m[1]);
    eq("легенда сканов: найдено 6 классов", classes.length, 6);
    classes.forEach((c) => {
      const rule = (css.match(new RegExp("\\.algo-tp__legdot--" + c.replace(/[-_]/g, "\\$&") + "\\s*\\{([^}]*)\\}")) || [])[1] || "";
      eq(`легенда сканов: у точки ${c} есть правило с цветом`, /#[0-9a-f]{6}/i.test(rule), true);
    });
  }
  // пункт «страница в карте» — только у Bitmap: у Seq и Index карты нет, и искать её на холсте незачем
  eq("легенда: «страница в карте» есть только у Bitmap", types.map((t) => !!run(t, 'data-pages="12" data-rows="8" data-match="r5"').querySelector(".algo-tp__legdot--iv-scan__page--bit")), [false, false, true]);
  // чип page вне цикла — «—» (итоговый кадр Seq и Bitmap)
  eq("seq: на итоговом кадре чип page — «—»", last(infra.bScanSeq(P, R, list)).vars.page, "—");
  eq("bitmap: на итоговом кадре чип page — «—»", last(infra.bScanBitmap(P, R, list)).vars.page, "—");
  // падежи: «ради 1 строки», «Проверили 1 строку», «по 1 строке»
  eq("index: «ради 1 строки» и «ради 5 строк»", [/ради 1 строки/.test(last(infra.bScanIndex(P, R, [3])).info), /ради 5 строк/.test(last(infra.bScanIndex(P, R, list)).info)], [true, true]);
  eq("seq: R=1 — «по 1 строке» и «Проверили 1 строку»", [/по 1 строке/.test(infra.bScanSeq(3, 1, [0])[0].info), /Проверили 1 строку/.test(infra.bScanSeq(3, 1, [0])[3].info)], [true, true]);
  eq("seq: R=3 — «Проверили 3 строки»", /Проверили 3 строки/.test(infra.bScanSeq(2, 3, [0])[3].info), true);
}
process.exit(failed ? 1 : 0);
