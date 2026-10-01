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
  // finding 2: на кадре 16 tuple ещё не сдвинуты — upper не растёт; растёт на 17
  const v = run("+a:100,+b:100,+c:100,-1,vacuum");
  const f16 = v.filter((s) => s.line === 16)[0], f17 = v.filter((s) => s.line === 17)[0];
  eq("vacuum: на строке 16 upper = min off живых", f16.upper, 7808);
  eq("vacuum: на строке 17 upper вырос", f17.upper, 7936);
  // finding 3: compact сохраняет физический порядок, а не порядок слотов
  const o = run("+a:100,+b:100,+c:100,-2,vacuum,+d:100,-1,vacuum");
  eq("compact: физический порядок (c выше d), не слотовый", last(o).slots.map((s) => [s.name, s.off]), [["a", 0], ["d", 7936], ["c", 8064]]);
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
      const live = s.slots.filter((x) => x.state !== "unused");
      const minOff = live.length ? Math.min.apply(null, live.map((x) => x.off)) : 8192;
      const rs = live.map((x) => [x.off, x.off + x.len]).sort((a, b) => a[0] - b[0]);
      let overlap = false;
      for (let j = 1; j < rs.length; j++) if (rs[j][0] < rs[j - 1][1]) overlap = true;
      const reservedUp = s.reserved && s.line === 7;
      if (s.lower !== 24 + 4 * s.slots.length || (!reservedUp && s.upper !== minOff) || s.lower > s.upper || overlap || rs.some((r) => r[1] > 8192))
        bad = { ops: ops.join(","), step: i, line: s.line, lower: s.lower, upper: s.upper, minOff, overlap };
    });
  }
  eq("инварианты lower/upper/пересечения на 500 случайных последовательностях", bad, null);
}
process.exit(failed ? 1 : 0);
