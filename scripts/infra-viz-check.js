#!/usr/bin/env node
// Проверка infra-viz: хук регистрации (jsdom) и генераторы (чистый node).
"use strict";
const fs = require("fs");
const path = require("path");
let JSDOM;
try { ({ JSDOM } = require("jsdom")); } catch (e) { console.log("⏭  infra-viz-check: jsdom не установлен (npm i --no-save jsdom)"); process.exit(1); }
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
process.exit(failed ? 1 : 0);
