#!/usr/bin/env node
// Проверка «гонки на большом входе» (assets/race.js).
//
//   node scripts/race-check.js
//
// Проверяет:
//   1) каждый data-race в src/*.md есть в RACES, и каждая гонка стоит хотя бы в одной главе;
//   2) на каждом размере обе версии дают один ответ, перебор делает больше работы, и разрыв растёт с n —
//      иначе гонка показывала бы не то, ради чего стоит в главе;
//   3) виджет строится, «Запустить» (без анимации, prefers-reduced-motion) пишет вердикт и строку таблицы,
//      выбор другого n добавляет вторую строку.
// Если jsdom не найден — пункт 3 мягко пропускается, как у остальных смоуков.
"use strict";
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const raceJs = path.join(root, "assets", "race.js");
const { RACES, runRace } = require(raceJs);
const errors = [];
const fail = (m) => errors.push(m);

const used = new Set();
for (const f of fs.readdirSync(path.join(root, "src")).filter((f) => f.endsWith(".md"))) {
  const s = fs.readFileSync(path.join(root, "src", f), "utf8");
  for (const m of s.matchAll(/class="algo-race" data-race="([^"]+)"/g)) {
    used.add(m[1]);
    if (!RACES[m[1]]) fail(`${f}: гонки «${m[1]}» нет в RACES`);
  }
}
Object.keys(RACES).forEach((k) => { if (!used.has(k)) fail(`гонка «${k}» не стоит ни в одной главе`); });

let runs = 0;
for (const [key, race] of Object.entries(RACES)) {
  let prev = 0;
  for (const n of race.sizes) {
    const r = runRace(key, n);
    runs++;
    if (!r.same) fail(`${key}, n=${n}: ответы разошлись (${r.naive.answer} против ${r.fast.answer})`);
    const k = r.naive.ops / r.fast.ops;
    if (!(k > 1)) fail(`${key}, n=${n}: перебор не сделал больше работы (${r.naive.ops} против ${r.fast.ops})`);
    if (!(k > prev * 2)) fail(`${key}, n=${n}: разрыв ×${k.toFixed(1)} не вырос вдвое против прошлого размера (×${prev.toFixed(1)})`);
    prev = k;
    const again = runRace(key, n);
    if (again.naive.ops !== r.naive.ops || again.input !== r.input) fail(`${key}, n=${n}: вход не повторяется от запуска к запуску`);
  }
}

let dom = "jsdom не установлен — виджет не проверен";
let JSDOM = null;
try { ({ JSDOM } = require("jsdom")); } catch (e) { /* мягкий пропуск */ }
if (JSDOM) {
  const d = new JSDOM('<div class="algo-race" data-race="jump-game"></div>', { runScripts: "outside-only", url: "http://localhost/greedy.html" });
  const w = d.window;
  w.matchMedia = () => ({ matches: true }); // prefers-reduced-motion: сразу итог, без кадров
  w.eval(fs.readFileSync(raceJs, "utf8"));
  w.document.dispatchEvent(new w.Event("DOMContentLoaded"));
  const host = w.document.querySelector(".algo-race");
  const sizes = [...host.querySelectorAll(".rc-size")];
  if (sizes.length !== RACES["jump-game"].sizes.length) fail("виджет: кнопок размера не столько, сколько sizes");
  const go = host.querySelector(".rc-go");
  const tick = () => new Promise((r) => w.setTimeout(r, 60));
  dom = (async () => {
    go.click();
    await tick();
    const v = host.querySelector(".rc-verdict").textContent;
    if (!/в [\d\s ,]+ раза? больше работы/.test(v)) fail(`виджет: вердикт «${v}»`);
    if (host.querySelectorAll(".rc-table tbody tr").length !== 1) fail("виджет: после запуска нет строки в таблице");
    if (!host.querySelector(".rc-lane--naive").classList.contains("rc-lane--done")) fail("виджет: полоса перебора не дошла до конца");
    sizes[2].click(); go.click();
    await tick();
    if (host.querySelectorAll(".rc-table tbody tr").length !== 2) fail("виджет: второй размер не добавил строку");
    return "виджет строится, вердикт и таблица по n на месте";
  })();
}

Promise.resolve(dom).then((msg) => {
  if (errors.length) {
    console.error("✗ race-check:\n  " + errors.join("\n  "));
    process.exit(1);
  }
  console.log(`✅ race-check: ${Object.keys(RACES).length} гонок в главах, ${runs} прогонов — ответы совпали, перебор дороже, разрыв растёт с n; ${msg}`);
});
