#!/usr/bin/env node
// Проверка infra-core.js + infra-pg.js: хук регистрации (jsdom) и генераторы (чистый node).
"use strict";
const fs = require("fs");
const path = require("path");
let JSDOM;
try { ({ JSDOM } = require("jsdom")); } catch (e) { console.log("✗ infra-viz-check: нужен jsdom (npm i --no-save jsdom) — проверка не выполнена"); process.exit(1); }
const root = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, "assets", f), "utf8");
// порядок и состав файлов — из общего места, как у остальных скриптов проверок
const infraLib = require("./lib/infra-files.js");
const infraFiles = () => infraLib.infraFiles(root);
const readInfra = () => infraLib.readInfra(root).map((f) => f.src).join("\n");
const infraScripts = () => infraLib.infraScriptTags(root);
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
    <script>${read("algo-viz.js")}</script>${infraScripts()}</body></html>`;
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
  const src = readInfra();
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
const infra = require(path.join(root, "assets", "infra-pg.js"));
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
    const dom = new JSDOM(`<!DOCTYPE html><html><body>${div}<script>${read("algo-viz.js")}</script>${infraScripts()}</body></html>`, { runScripts: "dangerously", pretendToBeVisual: true });
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
  const src = readInfra();
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
// --- разделение на ядро и тему ---
{
  eq("файлы: ядро и pg есть, старого infra-viz.js нет", [fs.existsSync(path.join(root, "assets", "infra-core.js")), fs.existsSync(path.join(root, "assets", "infra-pg.js")), fs.existsSync(path.join(root, "assets", "infra-viz.js"))], [true, true, false]);
  const core = require(path.join(root, "assets", "infra-core.js"));
  eq("core: экспорт в node", Object.keys(core).sort(), ["clampInt", "mulberry32", "plural", "shuffled"]);
  eq("core.plural: 1/2/5/11/21", [1, 2, 5, 11, 21].map((n) => core.plural(n, "а", "б", "в")), ["а", "б", "в", "в", "а"]);
  eq("core.clampInt: мусор, границы", [core.clampInt("abc", 1, 24, 12), core.clampInt("0", 1, 24, 12), core.clampInt("999", 1, 24, 12), core.clampInt("7", 1, 24, 12)], [12, 1, 24, 7]);
  eq("core.shuffled: перестановка 0..n-1, детерминирована", [core.shuffled(10, 5).slice().sort((a, b) => a - b), core.shuffled(10, 5)], [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9], core.shuffled(10, 5)]);
  const html = `<!DOCTYPE html><html><body><div id="w" class="algo-viz" data-viz="pg-page" data-ops="+a:100"></div><script>${read("algo-viz.js")}</script>${infraScripts()}</body></html>`;
  const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true });
  eq("браузер: ядро доступно как window.ALGO_VIZ_INFRA", typeof dom.window.ALGO_VIZ_INFRA.plural, "function");
  const book = fs.readFileSync(path.join(root, "book.toml"), "utf8");
  // Скрипты находят файлы тем по маске сами, а книга — только по списку в book.toml: файл темы, который
  // забыли туда вписать, проверки видят, а читатель — нет. Поэтому ожидание выводится из той же маски.
  const js = ((book.match(/additional-js\s*=\s*\[([^\]]*)\]/) || [])[1] || "").match(/"[^"]+"/g) || [];
  const list = js.map((x) => x.slice(1, -1)), at = list.indexOf("assets/algo-viz.js"), want = infraFiles().map((f) => "assets/" + f);
  eq(`book.toml: сразу за algo-viz.js — все файлы маски assets/infra-*.js в порядке загрузки (${want.join(", ")})`, [at >= 0, list.slice(at + 1, at + 1 + want.length), want.filter((f) => !list.includes(f))], [true, want, []]);
}
// --- соединения ---
{
  const mk = (us, os) => ({ users: us, orders: os.map((u, i) => ({ n: i + 1, u })) });
  const key = (ps) => ps.map((p) => p.u + ":" + p.n).sort().join(",");
  const brute = (users, orders) => infra.joinPairs(users, orders);
  const cases = {
    plain: mk([1, 2, 3], [2, 2, 9]),
    noOrders: mk([1, 2], []),
    noUsers: mk([], [1, 2]),
    manyOne: mk([1, 2, 3, 4], [2, 2, 2, 2, 2, 2, 2, 3]),
    orphans: mk([1, 2, 3], [1, 2, 3, 7, 8, 9]),
    shuffled: mk([1, 2, 3, 4, 5], [5, 1, 3, 3, 9, 2, 5, 1])
  };
  const gens = { NL: infra.bJoinNL, Hash: infra.bJoinHash, Merge: infra.bJoinMerge };
  Object.keys(cases).forEach((name) => Object.keys(gens).forEach((g) => {
    const c = cases[name], st = gens[g](c.users, c.orders), l = last(st);
    eq(`join ${g}(${name}): те же пары, что у перебора`, key(l.out), key(brute(c.users, c.orders)));
    eq(`join ${g}(${name}): последний кадр done, line в листинге`, [!!l.done, st.every((s) => s.line >= 0 && s.line <= (g === "NL" ? 8 : g === "Hash" ? 12 : 14))], [true, true]);
  }));
  // точные последовательности строк
  const seq = (st) => st.map((s) => s.line).join(",");
  eq("NL: кадры на users [1,2,3], orders [u2,u2,u9]", seq(infra.bJoinNL([1, 2, 3], [{ n: 1, u: 2 }, { n: 2, u: 2 }, { n: 3, u: 9 }])), "1,2,3,2,3,4,3,4,2,3,7");
  eq("Hash: кадры на users [1,2], orders [u2,u5]", seq(infra.bJoinHash([1, 2], [{ n: 1, u: 2 }, { n: 2, u: 5 }])), "1,2,3,2,3,5,6,7,8,6,7,11");
  eq("Merge: кадры на users [1,2], orders [u2,u1]", seq(infra.bJoinMerge([1, 2], [{ n: 1, u: 2 }, { n: 2, u: 1 }])), "1,2,4,6,9,10,4,5,4,6,9,10,13");
  // счётчики: фокус обзора
  const plain = cases.plain;
  eq("NL: одно обращение к индексу на каждую внешнюю строку (и у пустых)", last(infra.bJoinNL(plain.users, plain.orders)).metric.value, 3);
  eq("NL: прочитано заказов = число совпавших", last(infra.bJoinNL(plain.users, plain.orders)).oRead, 2);
  eq("Hash: прочитаны ВСЕ заказы независимо от совпадений", [last(infra.bJoinHash(plain.users, plain.orders)).oRead, last(infra.bJoinHash(cases.orphans.users, cases.orphans.orders)).oRead], [3, 6]);
  eq("Hash: в хеш-таблице все внешние строки", last(infra.bJoinHash(plain.users, plain.orders)).built, [1, 2, 3]);
  const early = infra.bJoinMerge([1, 2], [{ n: 1, u: 1 }, { n: 2, u: 2 }, { n: 3, u: 5 }, { n: 4, u: 6 }, { n: 5, u: 7 }]);
  eq("Merge: остановился, когда кончились пользователи — заказов прочитано 3 из 5", [last(early).uRead, last(early).oRead], [2, 3]);
  eq("Merge: пустой вход — только старт и итог", seq(infra.bJoinMerge([], [{ n: 1, u: 1 }])), "1,2,13");
  // Сверка с живым Postgres 16 (pglab, 2026-10-02): j_users(id PK), j_orders(id PK, user_id) + индекс по
  // user_id, данные — из тех же parseIds. Алгоритм навязан флагами enable_*; у NL ещё и LATERAL … OFFSET 0,
  // чтобы внешней была users, как в модели (на крошечных таблицах планировщик иногда ставит наружу orders).
  // NL: loops внутреннего Index Scan / actual rows узла Nested Loop; Hash: rows узла Hash / actual rows
  // Seq Scan по заказам; Merge: actual rows обоих дочерних узлов. «never executed» — 0.
  const liveJoin = [
    ["1-8", "r14", 0, [8, 12], [8, 14], [8, 13]],
    ["1-12", "r24", 0, [12, 24], [12, 24], [12, 24]],
    ["1-12", "r24", 4, [3, 6], [3, 24], [3, 7]],
    ["1-6", "1,1,2,2,5,5", 0, [6, 6], [6, 6], [6, 6]],
    ["2-4", "1,2,3,7,8,9", 0, [3, 2], [3, 6], [3, 4]],
    ["1-4", "2,2,2,2,2,2,2,3", 0, [4, 8], [4, 8], [4, 8]],
    ["1-12", "r24", 1, [0, 0], [0, 1], [0, 0]],
    ["1-3", "", 0, [3, 0], [0, 0], [1, 0]]
  ];
  liveJoin.forEach(([u, o, f, nl, h, m]) => {
    const us = infra.parseIds(u, 1, 12, false).filter((id) => !f || id < f), os = infra.parseIds(o, 1, 12, true).map((x, i) => ({ n: i + 1, u: x }));
    const a = last(infra.bJoinNL(us, os)), b = last(infra.bJoinHash(us, os)), c = last(infra.bJoinMerge(us, os));
    eq(`живой Postgres, users ${u}, заказы ${o || "нет"}, фильтр ${f}: NL ${nl.join("/")} · Hash ${h.join("/")} · Merge ${m.join("/")}`, [[a.metric.value, a.oRead], [b.built.length, b.oRead], [c.uRead, c.oRead]], [nl, h, m]);
  });
  // Merge: заказы кончились сразу после пары — следующую строку users Postgres всё же читает, и это видно
  // на том же кадре j++ (line 10), а не только в итоге; кончились по ветке «больше» — не читает
  {
    const st = infra.bJoinMerge([1, 2, 3, 4, 5, 6], [1, 1, 2, 2, 5, 5].map((x, i) => ({ n: i + 1, u: x })));
    const lastJ = st.filter((s) => s.line === 10).pop();
    eq("Merge: кадр j++ на конце заказов — прочитана ещё одна строка users, текст это объясняет", [lastJ.uRead, /id 6/.test(lastJ.info), lastJ.cu], [6, true, 4]);
    const skip = last(infra.bJoinMerge([5, 6], [{ n: 1, u: 1 }, { n: 2, u: 2 }]));
    eq("Merge: заказы кончились по ветке «больше» — лишней строки users нет", [skip.uRead, skip.oRead], [1, 2]);
  }
  // Merge: пресет «заказы без пользователя» доходит до ветки else if (line 7: j++), а подпись под кодом
  // на строках if (4) и else if (6) — от ветки, взятой на ЭТОМ кадре (s.note), а не одна на все кадры
  {
    const src = readInfra(), body = src.slice(src.indexOf(`    "pg-join-merge": {`));
    const block = (body.match(/presets: \[\n([\s\S]*?)\n      \],/) || [])[1] || "";
    const line = block.split("\n").find((l) => /label: "заказы без пользователя"/.test(l)) || "";
    const uAttr = (line.match(/"data-users": "([^"]*)"/) || [])[1], oAttr = (line.match(/"data-orders": "([^"]*)"/) || [])[1];
    const st = infra.bJoinMerge(infra.parseIds(uAttr, 1, 12, false), infra.parseIds(oAttr, 1, 12, true).map((x, i) => ({ n: i + 1, u: x })));
    eq("Merge, пресет «заказы без пользователя»: ветка else if (line 7) выполняется", st.some((s) => s.line === 7), true);
    let bad = 0, n4 = 0, n6 = 0;
    const all = [st, infra.bJoinMerge([1, 2, 3, 4, 5, 6], [1, 1, 2, 2, 5, 5].map((x, i) => ({ n: i + 1, u: x }))), infra.bJoinMerge([2, 5], [1, 2, 3, 5, 5, 9].map((x, i) => ({ n: i + 1, u: x })))];
    all.forEach((frames) => frames.forEach((s, k) => {
      const next = frames[k + 1] && frames[k + 1].line;
      if (s.line === 4) { n4++; if (!s.note || /^Да/.test(s.note) !== (next === 5)) bad++; }
      if (s.line === 6) { n6++; if (!s.note || /^Да/.test(s.note) !== (next === 7) || (next === 9 && /без пользователя/.test(s.note))) bad++; }
    }));
    eq(`Merge: подпись под кодом на if/else if совпадает с веткой кадра (кадров line 4: ${n4}, line 6: ${n6})`, [bad, n4 > 0, n6 > 0], [0, true, true]);
    eq("Merge: users пуста — «текущего» заказа нет ни на одном кадре", infra.bJoinMerge([], [{ n: 1, u: 1 }, { n: 2, u: 3 }]).map((s) => s.co), [-1, -1, -1]);
  }
  // Merge, строка 10 (j++): подпись под кодом — по ситуации кадра, а не одна статичная
  {
    const l10 = (us, os) => infra.bJoinMerge(us, os.map((x, i) => ({ n: i + 1, u: x }))).filter((s) => s.line === 10);
    const extra = l10([1, 2, 3, 4, 5, 6], [1, 1, 2, 2, 5, 5]).pop();
    const end = l10([1, 2], [1, 2]).pop();
    const mid = l10([1, 2], [1, 1, 2])[0];
    eq("Merge line 10: лишнее чтение users — подпись про users[i+1]", extra.note, "Заказов больше нет; Postgres ещё читает users[i+1] — сверить с ключом группы");
    eq("Merge line 10: заказы кончились без лишнего чтения — статус и подпись про конец", [end.info, end.note, end.co], ["j++: заказов больше нет", "Заказов больше нет — цикл закончится", -1]);
    eq("Merge line 10: обычный j++ — подпись «следующий заказ»", [mid.note, /следующий заказ/.test(mid.info)], ["Следующий заказ: тот же пользователь или уже другой", true]);
  }
  // Hash: короткие пути без лишних кадров probe
  eq("Hash: заказов нет — хеш не строится, только старт и итог", [seq(infra.bJoinHash([1, 2], [])), last(infra.bJoinHash([1, 2], [])).built.length], ["1,11", 0]);
  eq("Hash: хеш пуст — старт, кадр line 5 и итог", seq(infra.bJoinHash([], [{ n: 1, u: 1 }, { n: 2, u: 3 }])), "1,5,11");
  eq("Hash: users больше заказов — честная оговорка про сторону хеша", [/мог бы построить хеш по заказам/.test(infra.bJoinHash([1, 2, 3], [{ n: 1, u: 1 }])[0].info), /мог бы/.test(infra.bJoinHash([1], [{ n: 1, u: 1 }, { n: 2, u: 1 }])[0].info)], [true, false]);
  eq("NL по порядку индекса: O отсортирован по (user_id, n)", infra.bJoinNL([1, 2, 3, 4, 5], cases.shuffled.orders)[0].O.map((o) => o.u + ":" + o.n), cases.shuffled.orders.slice().sort((a, b) => a.u - b.u || a.n - b.n).map((o) => o.u + ":" + o.n));
  eq("Hash по порядку таблицы: O как в таблице", infra.bJoinHash([1, 2, 3, 4, 5], cases.shuffled.orders)[0].O.map((o) => o.n), cases.shuffled.orders.map((o) => o.n));
  // чипы: вне области видимости — «—»
  eq("Merge: на done чипы i и j — «—»", [last(early).vars.i, last(early).vars.j], ["—", "—"]);
  eq("NL: на done чип o — «—»", last(infra.bJoinNL(plain.users, plain.orders)).vars.o, "—");
  eq("Hash: на done чипы u и o — «—»", [last(infra.bJoinHash(plain.users, plain.orders)).vars.u, last(infra.bJoinHash(plain.users, plain.orders)).vars.o], ["—", "—"]);
  // разбор токенов
  eq("parseIds: пользователи — диапазон, дубликаты, сортировка, границы", infra.parseIds("3-5,4,1,99,x", 1, 12, false), [1, 3, 4, 5]);
  eq("parseIds: заказы — порядок и повторы сохраняются", infra.parseIds("2,2,1,2", 1, 12, true), [2, 2, 1, 2]);
  eq("parseIds: rK детерминирован, в границах, нужной длины", [infra.parseIds("r14", 1, 8, true).length, infra.parseIds("r14", 1, 8, true).every((v) => v >= 1 && v <= 8), JSON.stringify(infra.parseIds("r14", 1, 8, true)) === JSON.stringify(infra.parseIds("r14", 1, 8, true))], [14, true, true]);
  eq("parseIds: пусто и не больше 40", [infra.parseIds("", 1, 8, true), infra.parseIds("r999", 1, 8, true).length], [[], 40]);
  // фаззинг: три алгоритма дают те же пары, что перебор; кадры не делят ссылок
  let seed = 12345; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  let bad = 0;
  for (let t = 0; t < 300; t++) {
    const nu = Math.floor(rnd() * 8), no = Math.floor(rnd() * 14);
    const us = [...new Set(Array.from({ length: nu }, () => 1 + Math.floor(rnd() * 10)))].sort((a, b) => a - b);
    const os = Array.from({ length: no }, (_, i) => ({ n: i + 1, u: 1 + Math.floor(rnd() * 10) }));
    Object.keys(gens).forEach((g) => {
      const st = gens[g](us, os);
      if (key(last(st).out) !== key(brute(us, os)) || !last(st).done || st.filter((s) => s.done).length !== 1) bad++;
      if (st.length > 1 && st[0].out === st[1].out) bad++;
    });
  }
  // тексты: согласование и стороны соединения
  {
    const forms = { 1: "пара", 2: "пары", 5: "пар", 11: "пар", 21: "пара" };
    [1, 2, 5, 11, 21].forEach((n) => {
      const us = [1], os = Array.from({ length: n }, (_, i) => ({ n: i + 1, u: 1 }));
      Object.keys(gens).forEach((g) => eq(`текст ${g}: итог на ${n} пар согласован`, last(gens[g](us, os)).info.indexOf("Итог: " + n + " " + forms[n] + ";") === 0, true));
    });
    const wrong = /(^|[^\d])(1 (пар|строк|заказов|пользователей)|[234] (пар|строк|заказов|пользователей)|[05-9] (пара|пары)|1 (пары)|[234] пара)(?![а-я])/;
    let badText = 0, internal = 0;
    for (let nu = 0; nu <= 5; nu++) for (let no = 0; no <= 5; no++) {
      const us = Array.from({ length: nu }, (_, i) => i + 1), os = Array.from({ length: no }, (_, i) => ({ n: i + 1, u: 1 + (i % 3) }));
      Object.keys(gens).forEach((g) => gens[g](us, os).forEach((s) => {
        if (wrong.test(s.info)) badText++;
        if (g !== "NL" && /внешн/i.test(s.info)) internal++;
      }));
    }
    eq("тексты: нет «1 пар», «2 заказов» и т.п. ни на одном кадре", badText, 0);
    eq("тексты: в Hash/Merge нет слова «внешн-» (там сторона — по таблице)", internal, 0);
  }
  eq("фаззинг 300 случаев × 3 алгоритма: пары = перебор, один done, кадры не делят out", bad, 0);
}
{
  const types = { "pg-join-nl": infra.bJoinNL, "pg-join-hash": infra.bJoinHash, "pg-join-merge": infra.bJoinMerge };
  const run = (type, attrs, steps = 500) => {
    const div = `<div class="algo-viz" id="w" tabindex="0" data-viz="${type}" ${attrs}></div>`;
    const dom = new JSDOM(`<!DOCTYPE html><html><body>${div}<script>${read("algo-viz.js")}</script>${infraScripts()}</body></html>`, { runScripts: "dangerously", pretendToBeVisual: true });
    dom.window.document.dispatchEvent(new dom.window.Event("DOMContentLoaded"));
    const el = dom.window.document.getElementById("w");
    for (let i = 0; i < steps; i++) el.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    return el;
  };
  const attrs = 'data-users="1-6" data-orders="r14" data-filter="0"';
  const us = infra.parseIds("1-6", 1, 12, false), os = infra.parseIds("r14", 1, 12, true).map((u, i) => ({ n: i + 1, u }));
  Object.keys(types).forEach((t) => {
    const el = run(t, attrs), fin = last(types[t](us, os));
    eq(`${t}: построен без ошибок и дошёл до итога`, [el.classList.contains("algo-viz--ready") && !/Ошибка визуализации|Неизвестный тип/.test(el.textContent), /Итог:/.test(el.textContent)], [true, true]);
    eq(`${t}: ячейки таблицы users и заказов`, [el.querySelectorAll(".iv-join__row--users .iv-join__cell").length, el.querySelectorAll(".iv-join__row--orders .iv-join__cell").length], [us.length, os.length]);
    eq(`${t}: пар в результате на экране = модель`, +el.querySelector(".iv-join__metrics").getAttribute("data-pairs"), fin.out.length);
    eq(`${t}: прочитано заказов на экране = модель`, +el.querySelector(".iv-join__metrics").getAttribute("data-oread"), fin.oRead);
    const bad = run(t, 'data-users="abc" data-orders="" data-filter="zzz"');
    eq(`${t}: мусорные атрибуты — без ошибок`, bad.classList.contains("algo-viz--ready") && !/Ошибка визуализации/.test(bad.textContent), true);
    const src = readInfra(), body = src.slice(src.indexOf(`    "${t}": {`));
    const block = (body.match(/presets: \[\n([\s\S]*?)\n      \],/) || [])[1] || "";
    const presets = [...block.matchAll(/set: \{([^}]*)\}/g)].map((m) => Object.fromEntries([...m[1].matchAll(/"(data-[a-z-]+)":\s*"([^"]*)"/g)].map((x) => [x[1], x[2]])));
    eq(`${t}: 4 пресета, ровно три поля, нет дубля «пример главы»`, [presets.length, presets.every((p) => Object.keys(p).sort().join() === "data-filter,data-orders,data-users"), /label: "пример главы/.test(block)], [4, true, false]);
    presets.forEach((p, i) => {
      const e = run(t, Object.keys(p).map((k) => `${k}="${p[k]}"`).join(" "));
      eq(`${t}: пресет ${i + 1} строится`, e.classList.contains("algo-viz--ready") && !/Ошибка визуализации/.test(e.textContent) && /Итог:/.test(e.textContent), true);
    });
  });
  // легенда: правило legdot с цветом для КАЖДОГО класса из легенды в исходнике (урок плана 2)
  const src = readInfra(), css = read("infra-viz.css");
  const legBlock = (src.match(/var joinLegendAll = \[([\s\S]*?)\n  \];/) || [])[1] || "";
  const classes = [...legBlock.matchAll(/cls: "([^"]+)"/g)].map((m) => m[1]);
  eq("join: легенда содержит 5 классов", classes.length, 5);
  classes.forEach((c) => eq(`join: legdot-правило с цветом для ${c}`, new RegExp("\\.algo-tp__legdot--" + c.replace(/[-_]/g, (x) => "\\" + x) + "\\s*\\{[^}]*#[0-9a-fA-F]{6}").test(css), true));
  // легенда по типам, ряд хеш-таблицы, видимый текст метрик, прочитанные пользователи у NL
  {
    const want = { "pg-join-nl": 4, "pg-join-hash": 5, "pg-join-merge": 4 };
    const us2 = infra.parseIds("1-6", 1, 12, false), os2 = infra.parseIds("r14", 1, 12, true).map((u, i) => ({ n: i + 1, u }));
    Object.keys(want).forEach((t) => {
      const fin = last(types[t](us2, os2));
      [500, 3].forEach((n) => {
        const el = run(t, 'data-users="1-6" data-orders="r14" data-filter="0"', n);
        const dots = el.querySelectorAll(".algo-tp__legdot").length;
        const labels = [...el.querySelectorAll(".algo-tp__leglabel")].map((x) => x.textContent);
        eq(`${t} (шагов ${n}): точек легенды ${want[t]}, «лежит в хеш-таблице» только у Hash`, [dots, labels.includes("лежит в хеш-таблице")], [want[t], t === "pg-join-hash"]);
        eq(`${t} (шагов ${n}): ряд хеш-таблицы только у Hash`, el.querySelectorAll(".iv-join__row--hash").length, t === "pg-join-hash" ? 1 : 0);
      });
      const txt = run(t, 'data-users="1-6" data-orders="r14" data-filter="0"').querySelector(".iv-join__metrics").textContent;
      eq(`${t}: видимая строка метрик называет прочитанное и пары по модели`, [txt.includes("заказов прочитано: " + fin.oRead + " "), txt.includes("пар в результате: " + fin.out.length)], [true, true]);
    });
    const nl = run("pg-join-nl", 'data-users="1-4" data-orders="2,2,3,7" data-filter="0"');
    const cells = [...nl.querySelectorAll(".iv-join__row--users .iv-join__cell")].map((c) => c.className.replace("iv-join__cell", "").trim());
    eq("pg-join-nl: на итоге пользователи без заказов (1, 4) «прочитаны», 2 и 3 — в результате", cells, ["iv-join__cell--read", "iv-join__cell--match", "iv-join__cell--match", "iv-join__cell--read"]);
    // Merge, users пуста: на кадре line 2 первая ячейка заказов не «текущая» — заказы не читаются
    const mEmpty = run("pg-join-merge", 'data-users="1-12" data-orders="r24" data-filter="1"', 1);
    eq("pg-join-merge: users пуста — у заказов нет «текущей» ячейки, прочитано 0", [mEmpty.querySelectorAll(".iv-join__row--orders .iv-join__cell--cur").length, +mEmpty.querySelector(".iv-join__metrics").getAttribute("data-oread")], [0, 0]);
    // подпись под кодом на кадре лишнего чтения (пресет «у части пользователей нет заказов»)
    {
      const ms = infra.bJoinMerge(infra.parseIds("1-6", 1, 12, false), infra.parseIds("1,1,2,2,5,5", 1, 12, true).map((x, i) => ({ n: i + 1, u: x })));
      const k = ms.map((s) => s.line === 10 && /не останавливается/.test(s.info)).lastIndexOf(true);
      const el = run("pg-join-merge", 'data-users="1-6" data-orders="1,1,2,2,5,5" data-filter="0"', k);
      eq("pg-join-merge: на кадре лишнего чтения подпись под кодом — про users[i+1], а не «следующий заказ»", [k > 0, el.querySelector(".algo-tp__codenotetx").textContent], [true, "Заказов больше нет; Postgres ещё читает users[i+1] — сверить с ключом группы"]);
    }
    // «текущая» — рамка поверх состояния, а не вместо него: пользователь уже в результате не сереет
    {
      const us = infra.parseIds("1-4", 1, 12, false), os = infra.parseIds("2,2,2,2,2,2,2,3", 1, 12, true).map((x, i) => ({ n: i + 1, u: x }));
      const hs = infra.bJoinHash(us, os);
      const k = hs.findIndex((s) => s.cu === 1 && s.out.some((p) => p.u === 2) && s.line === 7);
      const el = run("pg-join-hash", 'data-users="1-4" data-orders="2,2,2,2,2,2,2,3" data-filter="0"', k);
      const u2 = el.querySelectorAll(".iv-join__row--users .iv-join__cell")[1].className;
      eq("pg-join-hash «много заказов у одного»: user 2 текущий и уже в результате — и --match, и --cur", [k > 0, /--match\b/.test(u2), /--cur\b/.test(u2), /--idle\b/.test(u2)], [true, true, true, false]);
      const k8 = hs.findIndex((s) => s.line === 8);
      const el8 = run("pg-join-hash", 'data-users="1-4" data-orders="2,2,2,2,2,2,2,3" data-filter="0"', k8);
      const o = el8.querySelectorAll(".iv-join__row--orders .iv-join__cell")[hs[k8].co].className;
      eq("pg-join-hash: текущий заказ, только что давший пару, — и --match, и --cur", [/--match\b/.test(o), /--cur\b/.test(o)], [true, true]);
    }
    // пустое соединение: «пока» — только до итога (хеш пуст при u.id < 1 — сверено с живым Postgres)
    const empty = run("pg-join-hash", 'data-users="1-12" data-orders="r24" data-filter="1"');
    eq("pg-join-hash: пустой хеш — на итоге «Пар нет», прочитан 1 заказ", [empty.querySelector(".iv-join__pairs").textContent, +empty.querySelector(".iv-join__metrics").getAttribute("data-oread")], ["Пар нет", 1]);
    const mid = run("pg-join-nl", 'data-users="1-4" data-orders="2,2,3,7" data-filter="0"', 4);
    const mc = [...mid.querySelectorAll(".iv-join__row--users .iv-join__cell")].map((c) => c.className.replace("iv-join__cell", "").trim());
    eq("pg-join-nl: в середине прогона пользователи после текущего ещё не читались", mc.slice(2).every((c) => c === "iv-join__cell--idle"), true);
  }
}
// --- Redis: эталон из настоящего кода (golden) ---
{
  const redis = require(path.join(root, "assets", "infra-redis.js"));
  const golden = JSON.parse(fs.readFileSync(path.join(root, "scripts", "fixtures", "redis-golden.json"), "utf8"));
  golden.parse.forEach((c) => {
    const r = redis.respParse(c.raw);
    eq(`resp golden «${c.name}»`, { args: r.args, err: !!r.err, eof: !!r.eof, consumed: r.consumed }, { args: c.args, err: c.err, eof: c.eof, consumed: c.consumed });
  });
  golden.reply.forEach((sc) => {
    const store = { data: Object.assign({}, sc.preload) };
    sc.steps.forEach((s) => {
      const r = redis.respReply(s.args, store);
      eq(`reply golden «${sc.name}»: ${s.args.join(" ")}`, r && r.raw, s.reply);
    });
  });
  eq("golden: есть разбор, ответы и TTL", [golden.parse.length > 20, golden.reply.length >= 2, golden.ttl.length >= 10], [true, true, true]);
  eq("unescapeWire/escapeWire обратимы", redis.unescapeWire(redis.escapeWire("a\r\nb\t\\x")), "a\r\nb\t\\x");
  eq("encodeCommand собирает multibulk", redis.encodeCommand(["SET", "foo", "bar"]), "*3\r\n$3\r\nSET\r\n$3\r\nfoo\r\n$3\r\nbar\r\n");
  eq("encodeCommand считает байты, а не символы", redis.encodeCommand(["ECHO", "привет"]), "*2\r\n$4\r\nECHO\r\n$12\r\nпривет\r\n");
  // кадры: точные последовательности строк листинга
  const seq = (raw) => redis.bRespParse(raw).map((s) => s.line).join(",");
  eq("кадры inline PING", seq("PING\r\n"), "1,2,5,8,9");
  eq("кадры пустой строки", seq("\r\n"), "1,2,5,6");
  eq("кадры EOF без \\n", seq("*2"), "1,2,3");
  eq("кадры *x", seq("*x\r\n"), "1,2,5,8,11,12,13");
  eq("кадры GET foo", seq("*2\r\n$3\r\nGET\r\n$3\r\nfoo\r\n"), "1,2,5,8,11,12,15,16,17,18,21,24,25,28,29,32,16,17,18,21,24,25,28,29,32,34");
  eq("кадры оборвано внутри строки", seq("*1\r\n$3\r\nGE"), "1,2,5,8,11,12,15,16,17,18,21,24,25,28,29,30");
  eq("кадры *0", seq("*0\r\n"), "1,2,5,8,11,12,15,34");
  eq("кадры нет $", seq("*1\r\nGET\r\n"), "1,2,5,8,11,12,15,16,17,18,21,22");
  // чипы: «—» вне области видимости и на done; значения живые
  const st = redis.bRespParse("*1\r\n$3\r\nGET\r\n");
  eq("чипы: до объявления n и после done", [st[0].vars.n, st[st.length - 1].vars.line, st[st.length - 1].vars.blen], ["—", "—", "—"]);
  eq("чип line после readLine", st[0].vars.line, "\"*1\"");
  eq("последние два байта не проверяются: кадр hot", redis.bRespParse("*1\r\n$3\r\nGETxx").some((s) => s.line === 29 && s.hot), true);
  eq("конвейер: остаток не съеден", (() => { const r = redis.respParse("*1\r\n$4\r\nPING\r\n*1\r\n$4\r\nPING\r\n"); return r.consumed < 28; })(), true);
  // фаззинг: модель на случайных входах не падает, один done, pos монотонен
  let seed = 4242; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const alpha = ["*", "$", "\r", "\n", "1", "2", "3", "x", "-", "+", "A", " "];
  let bad = 0;
  for (let t = 0; t < 500; t++) {
    let raw = ""; const len = Math.floor(rnd() * 24);
    for (let i = 0; i < len; i++) raw += alpha[Math.floor(rnd() * alpha.length)];
    const steps = redis.bRespParse(raw);
    const fin = steps[steps.length - 1];
    if (!fin.done || steps.filter((s) => s.done).length !== 1) bad++;
    for (let i = 1; i < steps.length; i++) if (steps[i].pos < steps[i - 1].pos) bad++;
    if (fin.res.consumed > raw.length) bad++;
    if (steps.some((s) => s.line < 0 || s.line > 35)) bad++;
  }
  eq("фаззинг 500 входов: один done, pos монотонен, строки в листинге", bad, 0);
}
{
  const redis = require(path.join(root, "assets", "infra-redis.js"));
  const run = (attrs) => {
    const div = `<div class="algo-viz" id="w" tabindex="0" data-viz="redis-resp" ${attrs}></div>`;
    const dom = new JSDOM(`<!DOCTYPE html><html><body>${div}<script>${read("algo-viz.js")}</script>${infraScripts()}</body></html>`, { runScripts: "dangerously", pretendToBeVisual: true });
    dom.window.document.dispatchEvent(new dom.window.Event("DOMContentLoaded"));
    const el = dom.window.document.getElementById("w");
    for (let i = 0; i < 300; i++) el.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    return el;
  };
  const wire = "*3\\r\\n$3\\r\\nSET\\r\\n$3\\r\\nfoo\\r\\n$3\\r\\nbar\\r\\n";
  const el = run(`data-wire="${wire}" data-store="foo=bar"`);
  eq("redis-resp: построен без ошибок и дошёл до итога", [el.classList.contains("algo-viz--ready") && !/Ошибка визуализации|Неизвестный тип/.test(el.textContent), /Итог:/.test(el.textContent)], [true, true]);
  eq("redis-resp: байтовая лента — по ячейке на символ", el.querySelectorAll(".iv-redis__strip .iv-redis__ch").length, redis.unescapeWire(wire).length);
  // чипы hdr/blen — только в своей области видимости (внутри тела for), в том числе на кадре заголовка for
  {
    const st2 = redis.bRespParse("*2\r\n$3\r\nGET\r\n$3\r\nfoo\r\n");
    const at = (line, iter) => st2.filter((s) => s.line === line)[iter];
    eq("чипы: заголовок for 2-го круга — hdr и blen «—»", [at(16, 1).vars.hdr, at(16, 1).vars.blen, at(16, 1).vars.i], ["—", "—", "1"]);
    eq("чипы: строки 17/18/21 2-го круга — blen «—»", [17, 18, 21].map((l) => at(l, 1).vars.blen), ["—", "—", "—"]);
    eq("чипы: строка 17 — hdr уже есть", at(17, 1).vars.hdr, "\"$3\"");
    eq("чипы: строка 24 — blen задан", at(24, 1).vars.blen, "3");
    let leak = 0;
    ["*2\r\n$3\r\nGET\r\n$3\r\nfoo\r\n", "*3\r\n$1\r\na\r\n$x\r\n", "*2\r\n$2\r\nab\r\n$"].forEach((raw) => redis.bRespParse(raw).forEach((s, k, all) => {
      if (s.done) return;
      // blen живёт с строки 24 до конца круга, на 16–21 его быть не должно (hdr — с 17)
      if (s.line >= 16 && s.line <= 21 && s.vars.blen !== "—") leak++;
      if (s.line === 16 && s.vars.hdr !== "—") leak++;
    }));
    eq("чипы: blen не виден на строках 16–21, hdr — на 16", leak, 0);
  }
  // окончания: число слов согласовано
  {
    const pick = (n) => { const e = run(`data-wire="${"A".repeat(n)}" data-store=""`); return (e.textContent.match(/Разбор запроса: \d+ символ\S* на проводе/) || [""])[0]; };
    eq("заголовок: 1/2/5/11/21 символов", [1, 2, 5, 11, 21].map(pick), ["Разбор запроса: 1 символ на проводе", "Разбор запроса: 2 символа на проводе", "Разбор запроса: 5 символов на проводе", "Разбор запроса: 11 символов на проводе", "Разбор запроса: 21 символ на проводе"]);
    eq("chars(): формы", [1, 2, 5, 11, 21, 22, 25].map(redis.chars), ["1 символ", "2 символа", "5 символов", "11 символов", "21 символ", "22 символа", "25 символов"]);
    const rest = (k) => redis.bRespParse("*1\r\n$4\r\nPING\r\n" + "x".repeat(k)).slice(-1)[0].info;
    eq("остаток конвейера: 1/2/5 символов", [1, 2, 5].map((k) => (rest(k).match(/Остаток \(([^)]*)\)/) || [])[1]), ["1 символ", "2 символа", "5 символов"]);
  }
  eq("redis-resp: ответ показан (+OK)", /\+OK/.test(el.querySelector(".iv-redis__reply").textContent), true);
  const bad = run('data-wire="*x\\r\\n" data-store=""');
  eq("redis-resp: ошибка протокола — без падения и с итогом", bad.classList.contains("algo-viz--ready") && /Итог:/.test(bad.textContent) && !/Ошибка визуализации/.test(bad.textContent), true);
  const hostile = run('data-wire="<img src=x onerror=alert(1)>\\r\\n" data-store=""');
  eq("redis-resp: HTML во вводе не создаёт элементов", hostile.querySelectorAll("img").length, 0);
  const empty = run('data-wire="" data-store=""');
  eq("redis-resp: пустой ввод — без падения", empty.classList.contains("algo-viz--ready") && !/Ошибка визуализации/.test(empty.textContent), true);
  // легенда: правило legdot с цветом для каждого класса (урок плана 2), 4 пункта
  const src = readInfra(), css = read("infra-viz.css");
  const legBlock = (src.match(/var respLegend = \[([\s\S]*?)\n  \];/) || [])[1] || "";
  const classes = [...legBlock.matchAll(/cls: "([^"]+)"/g)].map((m) => m[1]);
  eq("redis-resp: в легенде 4 класса", classes.length, 4);
  classes.forEach((c) => eq(`redis-resp: legdot-правило с цветом для ${c}`, new RegExp("\\.algo-tp__legdot--" + c.replace(/[-_]/g, (x) => "\\" + x) + "\\s*\\{[^}]*#[0-9a-fA-F]{6}").test(css), true));
  // пресеты: ровно два поля, нет дубля «пример главы», каждый строится
  const body = src.slice(src.indexOf('    "redis-resp": {'));
  const block = (body.match(/presets: \[\n([\s\S]*?)\n      \],/) || [])[1] || "";
  // значения — литералы JS-строк: раскодируем, чтобы в атрибут попал тот же текст, что увидит движок
  const presets = [...block.matchAll(/set: \{([^}]*)\}/g)].map((m) => Object.fromEntries([...m[1].matchAll(/"(data-[a-z-]+)":\s*"((?:[^"\\]|\\.)*)"/g)].map((x) => [x[1], JSON.parse('"' + x[2] + '"')])));
  eq("redis-resp: 6 пресетов, ровно два поля, нет дубля «пример главы»", [presets.length, presets.every((p) => Object.keys(p).sort().join() === "data-store,data-wire"), /label: "пример главы/.test(block)], [6, true, false]);
  presets.forEach((p, i) => {
    const e = run(Object.keys(p).map((k) => `${k}="${p[k]}"`).join(" "));
    eq(`redis-resp: пресет ${i + 1} строится`, e.classList.contains("algo-viz--ready") && !/Ошибка визуализации/.test(e.textContent) && /Итог:/.test(e.textContent), true);
  });
}
// --- Redis TTL: модель против настоящего кода (golden) и кадры ---
{
  const redis = require(path.join(root, "assets", "infra-redis.js"));
  const golden = JSON.parse(fs.readFileSync(path.join(root, "scripts", "fixtures", "redis-golden.json"), "utf8"));
  // Go сериализует карты с отсортированными ключами, модель хранит порядок вставки: сравниваем как множества
  const canon = (o) => Object.keys(o).sort().map((k) => [k, o[k]]);
  golden.ttl.forEach((sc) => {
    const ps = redis.parseScript(sc.script);
    eq(`ttl golden «${sc.name}»: скрипт разобран без остатка`, ps.bad, []);
    const sim = redis.ttlSim(ps.tokens);
    eq(`ttl golden «${sc.name}»: ответ/data/expire на каждом токене`, sim.map((r) => ({ reply: r.reply, data: canon(r.data), expire: canon(r.expire) })), sc.steps.map((s) => ({ reply: s.reply, data: canon(s.data), expire: canon(s.expire) })));
    const st = redis.bTtl(ps.tokens), fin = st[st.length - 1];
    eq(`ttl «${sc.name}»: один done, последним`, [!!fin.done, st.filter((s) => s.done).length], [true, 1]);
    eq(`ttl «${sc.name}»: строки в пределах листинга`, st.every((s) => s.line >= 0 && s.line <= 59), true);
    eq(`ttl «${sc.name}»: итог совпадает с golden`, fin.rows.map((r) => r.key).sort(), Object.keys(sc.steps[sc.steps.length - 1].data).sort());
  });
  const seq = (script) => redis.bTtl(redis.parseScript(script).tokens).filter((s) => !s.done).map((s) => s.line).join(",");
  eq("кадры SET", seq("SET a 1"), "16,17");
  eq("кадры GET отсутствующего", seq("GET a"), "21,2,3,4,22");
  eq("кадры GET живого без TTL", seq("SET a 1; GET a").split(",").slice(2).join(","), "21,2,3,6,7,12,22");
  eq("кадры GET просроченного (ленивое удаление)", seq("SET a 1; EXPIRE a 1; +2; GET a").split(",").slice(12).join(","), "21,2,3,6,7,8,9,10,22");
  eq("кадры EXPIRE на отсутствующем", seq("EXPIRE a 5"), "26,2,3,4,27,28");
  eq("кадры EXPIRE 0", seq("SET a 1; EXPIRE a 0").split(",").slice(2).join(","), "26,2,3,6,7,12,27,30,31,32,33");
  eq("кадры TTL без срока", seq("SET a 1; TTL a").split(",").slice(2).join(","), "40,2,3,6,7,12,41,44,45,46");
  eq("кадры DEL живого", seq("SET a 1; DEL a").split(",").slice(2).join(","), "52,2,3,6,7,12,53,56,57,58");
  // главное свойство: просроченный ключ лежит в памяти до обращения
  const st = redis.bTtl(redis.parseScript("SET a 1; EXPIRE a 1; +5; SET b 2; DEL b").tokens);
  const lastRows = st[st.length - 1].rows;
  eq("просрочен, но лежит в памяти и никто не тронул", [lastRows.map((r) => r.key + ":" + r.state).join(","), st[st.length - 1].mem], ["a:stale", { keys: 1, stale: 1 }]);
  const lazy = redis.bTtl(redis.parseScript("SET a 1; EXPIRE a 1; +5; GET a").tokens);
  const first = lazy.find((s) => s.line === 21);
  eq("перед ленивым удалением ключ виден как «просрочен»", [first.rows[0].state, first.t], ["stale", 5000]);
  eq("после GET ключа в памяти нет", lazy[lazy.length - 1].mem, { keys: 0, stale: 0 });
  // чипы: «—» вне области видимости
  const sg = redis.bTtl(redis.parseScript("SET a 1; GET a").tokens);
  eq("чипы: в set живы key/value, остальные «—»", [sg[0].vars.key, sg[0].vars.value, sg[0].vars.ok, sg[0].vars.exists], ["a", "\"1\"", "—", "—"]);
  eq("чипы: на итоговом кадре всё «—»", Object.values(sg[sg.length - 1].vars).every((v) => v === "—"), true);
  // чипы по областям видимости Go — на конкретных кадрах, а не общим инвариантом
  {
    const frames = redis.bTtl(redis.parseScript("SET a 1; EXPIRE a 3; GET a; TTL a; EXPIRE a 5; EXPIRE a 0; SET b 2; DEL b; TTL zz").tokens);
    const order = ["key", "v", "exists", "exp", "hasTTL", "ok", "sec", "value"];
    const live = (s) => order.filter((k) => s.vars[k] !== "—").join(",");
    const nth = (line, n, from) => frames.filter((s) => s.line === line)[n || 0];
    // кадры GET: первая команда GET — после двух EXPIRE; берём по номеру вхождения строки внутри нужной команды
    const getStart = frames.findIndex((s) => s.line === 21);
    const inGet = (line) => frames.slice(getStart).find((s) => s.line === line);
    eq("set (16): key,value", live(nth(16, 0)), "key,value");
    eq("get (21): только key — результат live ещё не вернулся", live(frames[getStart]), "key");
    eq("live (2) из get: key,v,exists", live(inGet(2)), "key,v,exists");
    eq("live (4) из get-промаха — ключа нет", live(frames.find((s, i) => i > getStart && s.line === 3)), "key,v,exists");
    eq("live (6): появились exp,hasTTL", live(inGet(6)), "key,v,exists,exp,hasTTL");
    eq("live (12): те же", live(inGet(12)), "key,v,exists,exp,hasTTL");
    eq("get (22): key,v,ok — exists/exp/hasTTL уже вне области", live(inGet(22)), "key,v,ok");
    eq("expire (26): key,sec — ok ещё нет", live(nth(26, 0)), "key,sec");
    eq("expire (27): ok появился", live(nth(27, 0)), "key,ok,sec");
    eq("expire (35): key,ok,sec", live(nth(35, 0)), "key,ok,sec");
    eq("expire (31) при sec<=0: key,ok,sec", live(nth(31, 0)), "key,ok,sec");
    const ttlStart = frames.findIndex((s) => s.line === 40);
    eq("ttl (40): только key", live(frames[ttlStart]), "key");
    eq("ttl (41): key,ok", live(frames.slice(ttlStart).find((s) => s.line === 41)), "key,ok");
    eq("ttl (44): появились exp,hasTTL", live(frames.slice(ttlStart).find((s) => s.line === 44)), "key,exp,hasTTL,ok");
    eq("ttl (48): key,exp,hasTTL,ok", live(frames.slice(ttlStart).find((s) => s.line === 48)), "key,exp,hasTTL,ok");
    eq("ttl (42) на промахе: key,ok", live(frames.find((s) => s.line === 42)), "key,ok");
    const delStart = frames.findIndex((s) => s.line === 52);
    eq("del (52): только key", live(frames[delStart]), "key");
    eq("del (53): key,ok", live(frames[delStart + frames.slice(delStart).findIndex((s) => s.line === 53)]), "key,ok");
    eq("del (58): key,ok", live(frames.find((s) => s.line === 58)), "key,ok");
    eq("chip hasTTL — строка true/false, не булево", [inGet(6).vars.hasTTL, typeof inGet(6).vars.exists], ["true", "string"]);
  }
  // 🎯: на каждой строке-условии следующий кадр — L+1 ровно когда условие истинно (тексты «— да/— нет»)
  const IF_LINES = [3, 7, 27, 30, 41, 45, 53];
  function ifCoherence(script) {
    const fr = redis.bTtl(redis.parseScript(script).tokens); let n = 0, badc = 0;
    fr.forEach((s, i) => {
      if (IF_LINES.indexOf(s.line) < 0 || s.done) return;
      n++;
      const yes = /— да/.test(s.info), no = /— нет/.test(s.info);
      if (yes === no) badc++;
      if (yes !== (fr[i + 1].line === s.line + 1)) badc++;
    });
    return [n > 0, badc];
  }
  eq("🎯: условия согласованы с переходом на L+1", ifCoherence("SET a 1; EXPIRE a 1; +2; GET a; EXPIRE a 0; EXPIRE a 3; SET a 1; EXPIRE a 0; TTL a; SET a 1; TTL a; EXPIRE a 3; TTL a; +1; TTL a; DEL a; DEL a; DEL b"), [true, 0]);
  // ключ __proto__ — обычный ключ (модель не должна падать на прототипе)
  {
    const f = redis.bTtl(redis.parseScript("SET __proto__ x; GET __proto__; TTL __proto__; EXPIRE __proto__ 5; DEL __proto__; GET __proto__").tokens);
    const afterGet = f.filter((s) => s.line === 22)[0];
    eq("__proto__: SET/GET — ключ в rows, ответ GET — значение", [f[1].rows.map((r) => r.key + "=" + r.value).join(), afterGet.vars.ok, afterGet.vars.v, redis.ttlSim(redis.parseScript("SET __proto__ x; GET __proto__").tokens)[1].reply], ["__proto__=x", "true", "\"x\"", "$1\r\nx\r\n"]);
    const sim = redis.ttlSim(redis.parseScript("SET __proto__ x; EXPIRE __proto__ 5; DEL __proto__; GET __proto__").tokens);
    eq("__proto__: EXPIRE/DEL/GET как у любого ключа, прототип цел", [sim[1].reply, sim[2].reply, sim[3].reply, Object.keys(sim[1].expire), ({}).x], [":1\r\n", ":1\r\n", "$-1\r\n", ["__proto__"], undefined]);
    eq("__proto__: к концу ключей нет", f[f.length - 1].mem, { keys: 0, stale: 0 });
  }
  // разбор скрипта
  eq("parseScript: плохие токены отделены, остальное разобрано", (() => { const r = redis.parseScript("SET a 1; FOO; +x; GET a; EXPIRE a q; +0; +4000"); return [r.tokens.length, r.bad.length]; })(), [2, 5]);
  eq("parseScript: не больше 14 токенов", redis.parseScript(Array.from({ length: 30 }, () => "GET a").join("; ")).tokens.length, 14);
  eq("parseScript: дробные секунды в мс", redis.parseScript("+0.5; +1.25").tokens.map((t) => t.ms), [500, 1250]);
  eq("parseScript: пусто", redis.parseScript(""), { tokens: [], bad: [] });
  eq("только +N: единственный кадр — итоговый, сдвиг виден", (() => { const f = redis.bTtl(redis.parseScript("+2").tokens); return [f.length, f[0].done, f[0].t, /Прошло 2 с/.test(f[0].info)]; })(), [1, true, 2000, true]);
  eq("+N виден в первом кадре следующей команды", (() => { const f = redis.bTtl(redis.parseScript("SET a 1; +2; GET a").tokens); const g = f.find((s) => s.line === 21); return [g.t, /^Прошло 2 с, часы: 2 с\./.test(g.info)]; })(), [2000, true]);
  // фаззинг
  let seed = 777; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const cmds = ["SET a 1", "SET b 2", "GET a", "GET b", "DEL a", "DEL b", "EXPIRE a 2", "EXPIRE b 1", "EXPIRE a 0", "TTL a", "TTL b", "+1", "+0.5", "+3"];
  let bad = 0, badIf = 0;
  for (let t = 0; t < 300; t++) {
    const n = 1 + Math.floor(rnd() * 12);
    const script = Array.from({ length: n }, () => cmds[Math.floor(rnd() * cmds.length)]).join("; ");
    const st2 = redis.bTtl(redis.parseScript(script).tokens), fin = st2[st2.length - 1];
    if (!fin.done || st2.filter((s) => s.done).length !== 1) bad++;
    if (st2.some((s) => s.line < 0 || s.line > 58)) bad++;
    if (st2.some((s) => s.mem.keys !== s.rows.length || s.mem.stale !== s.rows.filter((r) => r.state === "stale").length)) bad++;
    for (let i = 1; i < st2.length; i++) if (st2[i].t < st2[i - 1].t) bad++;
    badIf += ifCoherence(script)[1];
  }
  eq("фаззинг 300 скриптов: один done, строки в листинге, счётчики согласованы, часы не идут назад", bad, 0);
  eq("фаззинг 300 скриптов: переходы на условиях согласованы с текстом", badIf, 0);
}
{
  const redis = require(path.join(root, "assets", "infra-redis.js"));
  const run = (attrs, steps) => {
    const div = `<div class="algo-viz" id="w" tabindex="0" data-viz="redis-ttl" ${attrs}></div>`;
    const dom = new JSDOM(`<!DOCTYPE html><html><body>${div}<script>${read("algo-viz.js")}</script>${infraScripts()}</body></html>`, { runScripts: "dangerously", pretendToBeVisual: true });
    dom.window.document.dispatchEvent(new dom.window.Event("DOMContentLoaded"));
    const el = dom.window.document.getElementById("w");
    for (let i = 0; i < (steps == null ? 400 : steps); i++) el.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    return el;
  };
  const ok = (e) => e.classList.contains("algo-viz--ready") && !/Ошибка визуализации|Неизвестный тип/.test(e.textContent);
  const script = "SET a 1; EXPIRE a 1; +5; SET b 2; DEL b";
  const el = run(`data-script="${script}"`);
  const fin = redis.bTtl(redis.parseScript(script).tokens).slice(-1)[0];
  eq("redis-ttl: построен без ошибок и дошёл до итога", [ok(el), /Итог:/.test(el.textContent)], [true, true]);
  eq("redis-ttl: рядов таблицы = ключей в памяти итога", el.querySelectorAll(".iv-redis__rows .iv-redis__row").length, fin.mem.keys);
  eq("redis-ttl: видимая строка про память", /ключей в памяти: 1, просрочено: 1/.test(el.textContent), true);
  eq("redis-ttl: на итоге есть просроченный ряд и пункт легенды про него", [el.querySelectorAll(".iv-redis__row--stale").length, /срок вышел, но лежит в памяти/.test(el.textContent)], [1, true]);
  eq("redis-ttl: журнал — по строке на команду", el.querySelectorAll(".iv-redis__log .iv-redis__logrow").length, 4);
  const def = run("");
  eq("redis-ttl: без атрибута — сценарий по умолчанию", [ok(def), /Итог:/.test(def.textContent)], [true, true]);
  const junk = run('data-script="FOO; ;;"');
  eq("redis-ttl: мусорный ввод не падает, заметка «не понял»", [ok(junk), /не понял: FOO/.test(junk.textContent)], [true, true]);
  const hostile = run('data-script="SET &lt;img src=x onerror=alert(1)&gt; 1"');
  eq("redis-ttl: HTML во вводе не создаёт элементов", hostile.querySelectorAll("img").length, 0);
  const emptyScript = run('data-script=""');
  eq("redis-ttl: пустой ввод — без падения", ok(emptyScript), true);
  const src = readInfra(), css = read("infra-viz.css");
  const legBlock = (src.match(/var ttlLegend = \[([\s\S]*?)\n  \];/) || [])[1] || "";
  const classes = [...legBlock.matchAll(/cls: "([^"]+)"/g)].map((m) => m[1]);
  eq("redis-ttl: в легенде 3 класса", classes.length, 3);
  classes.forEach((c) => eq(`redis-ttl: legdot-правило с цветом для ${c}`, new RegExp("\\.algo-tp__legdot--" + c.replace(/[-_]/g, (x) => "\\" + x) + "\\s*\\{[^}]*#[0-9a-fA-F]{6}").test(css), true));
  const body = src.slice(src.indexOf('    "redis-ttl": {'));
  const block = (body.match(/presets: \[\n([\s\S]*?)\n      \],/) || [])[1] || "";
  const presets = [...block.matchAll(/set: \{([^}]*)\}/g)].map((m) => Object.fromEntries([...m[1].matchAll(/"(data-[a-z-]+)":\s*"((?:[^"\\]|\\.)*)"/g)].map((x) => [x[1], JSON.parse('"' + x[2] + '"')])));
  eq("redis-ttl: 5 пресетов, ровно поле data-script, нет дубля «пример главы»", [presets.length, presets.every((p) => Object.keys(p).join() === "data-script"), /label: "пример главы/.test(block)], [5, true, false]);
  presets.forEach((p, i) => {
    const e = run(`data-script="${p["data-script"]}"`);
    eq(`redis-ttl: пресет ${i + 1} строится`, ok(e) && /Итог:/.test(e.textContent), true);
  });
  // подписи пресетов — правда для их данных (посчитано моделью)
  const reply = (s) => redis.ttlSim(redis.parseScript(s).tokens).map((r) => r.reply);
  eq("пресет «SET снимает TTL»: TTL → -1, GET → значение", reply("SET a 1; EXPIRE a 2; SET a 2; +5; TTL a; GET a").slice(4), [":-1\r\n", "$1\r\n2\r\n"]);
  eq("пресет «дробная часть»: осталось 2.5 с, ответ 2", [redis.bTtl(redis.parseScript("SET a 1; EXPIRE a 3; +0.5; TTL a").tokens).find((s) => s.line === 48).info.indexOf("осталось 2.5 с") >= 0, reply("SET a 1; EXPIRE a 3; +0.5; TTL a")[3]], [true, ":2\r\n"]);
  eq("пресет «EXPIRE 0»: ключ исчез сразу", reply("SET a 1; EXPIRE a 0; GET a").slice(1), [":1\r\n", "$-1\r\n"]);
  eq("пресет «DEL считает только живые»: оба DEL — 0", reply("SET a 1; EXPIRE a 1; +2; DEL a; DEL a").slice(3), [":0\r\n", ":0\r\n"]);
}
process.exit(failed ? 1 : 0);
