#!/usr/bin/env node
// Headless smoke движка интервальных повторений (assets/srs.js).
//
//   node scripts/srs-check.js
//
// Проверяется не «виджет отрисовался», а арифметика расписания и правила
// заведения карточек — то, из-за чего метод либо работает, либо тихо
// вырождается в список без порядка:
//   1) карточки заводятся сами из трёх источников (главы, пакеты, промахи),
//      причём глава/пакет — со сроком «завтра», а промах — «сейчас»;
//   2) «Помню» даёт интервалы 1 → 3 → растущий геометрически, а не фиксированный;
//   3) «Забыл» роняет интервал в 1 день и снижает ease, «с трудом» — растит слабо;
//   4) ease не убегает за границы [1.3, 2.8] даже после серии одинаковых оценок;
//   5) заметка «в чём была ошибка» сохраняется и показывается при следующем повторе.
// Если jsdom не найден — мягкий пропуск (exit 0), как в остальных смоуках.
"use strict";
const fs = require("fs");
const path = require("path");

let JSDOM, VirtualConsole;
try {
  ({ JSDOM, VirtualConsole } = require("jsdom"));
} catch (e) {
  console.log("⏭  srs-check: jsdom не установлен — пропускаю (npm i jsdom).");
  process.exit(0);
}

const root = path.resolve(__dirname, "..");
const srsJs = fs.readFileSync(path.join(root, "assets", "srs.js"), "utf8");

const errors = [];
const vc = new VirtualConsole();
vc.on("jsdomError", (e) => errors.push("jsdomError: " + (e && e.message)));
vc.on("error", (...a) => errors.push("console.error: " + a.join(" ")));

const DAY = 24 * 60 * 60 * 1000;

// Сначала ждём загрузки документа, ПОТОМ кладём данные и подключаем srs.js:
// иначе скрипт видит readyState === "loading", подписывается на DOMContentLoaded
// и строит виджет уже после проверок (первая версия этого смоука так и падала —
// «карточек 0» при полном localStorage).
function newDom(seed) {
  return new Promise(function (resolve) {
    const dom = new JSDOM(`<!DOCTYPE html><html><body><div class="algo-today"></div></body></html>`, {
      runScripts: "dangerously",
      virtualConsole: vc,
      url: "https://example.test/review.html",
    });
    dom.window.addEventListener("load", function () {
      Object.keys(seed).forEach((k) => dom.window.localStorage.setItem(k, seed[k]));
      const script = dom.window.document.createElement("script");
      script.textContent = srsJs;
      dom.window.document.body.appendChild(script);
      resolve(dom);
    });
  });
}

function cards(dom) {
  return JSON.parse(dom.window.localStorage.getItem("algoSRS") || "{}");
}

function click(dom, label) {
  const btn = [...dom.window.document.querySelectorAll("button")].find((b) => b.textContent === label);
  if (!btn) {
    errors.push(`не нашлась кнопка «${label}»`);
    return false;
  }
  btn.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
  return true;
}

async function main() {
// --- 1. карточки заводятся из трёх источников с правильным сроком ---
{
  const now = Date.now();
  const dom = await newDom({
    algoProgress: JSON.stringify({ "sliding-window.html": true, "big-o.html": false }),
    algoPkgSolved: JSON.stringify({ slidingwindow: now - 5 * DAY }),
    algoChallengeMissed: JSON.stringify({
      "big-o#2": { n: 2, page: "big-o", anchor: "task-2", q: "Сколько копий сделает append?" },
    }),
    algoChallengeSolved: JSON.stringify({}),
  });
  const c = cards(dom);
  const ids = Object.keys(c).sort();
  const want = ["ch:sliding-window.html", "pkg:slidingwindow", "task:big-o#2"];
  if (JSON.stringify(ids) !== JSON.stringify(want)) {
    errors.push(`заведены карточки ${JSON.stringify(ids)}, ожидались ${JSON.stringify(want)}`);
  }
  if (c["ch:sliding-window.html"] && c["ch:sliding-window.html"].due - now < DAY * 0.9) {
    errors.push("карточка главы заведена со сроком «сегодня», ожидалось «завтра»");
  }
  if (c["task:big-o#2"] && c["task:big-o#2"].due - now > DAY * 0.1) {
    errors.push("карточка промаха заведена не на сегодня — промах должен попадать в очередь сразу");
  }
  const text = dom.window.document.querySelector(".algo-today").textContent;
  if (!/К повторению сегодня: 1/.test(text)) {
    errors.push(`в очереди на сегодня не одна карточка: «${text.slice(0, 80)}»`);
  }
  if (!/append/.test(text)) errors.push("в очереди показана не та карточка (ожидался промах)");
}

// --- 2. «Помню»: 1 → 3 → геометрический рост ---
{
  const now = Date.now();
  const seedCards = {};
  for (let i = 0; i < 4; i++) {
    seedCards["task:t#" + i] = { due: now - DAY, iv: 0, ease: 2.5, reps: 0, meta: { page: "big-o", q: "задача " + i } };
  }
  const dom = await newDom({ algoSRS: JSON.stringify(seedCards) });
  const ivs = [];
  for (let i = 0; i < 3; i++) {
    // повторяем ОДНУ и ту же карточку: заново поднимаем виджет, чтобы она снова была первой
    const c = cards(dom);
    const id = "task:t#0";
    c[id].due = now - DAY;
    dom.window.localStorage.setItem("algoSRS", JSON.stringify({ [id]: c[id] }));
    const d2 = await newDom({ algoSRS: dom.window.localStorage.getItem("algoSRS") });
    click(d2, "Помню");
    const after = cards(d2)[id];
    ivs.push(after.iv);
    dom.window.localStorage.setItem("algoSRS", JSON.stringify({ [id]: after }));
  }
  if (ivs[0] !== 1 || ivs[1] !== 3) {
    errors.push(`первые интервалы после «Помню» = ${ivs.slice(0, 2)}, ожидались [1, 3]`);
  }
  if (!(ivs[2] > ivs[1])) {
    errors.push(`третий интервал ${ivs[2]} не больше второго ${ivs[1]} — рост не геометрический`);
  }
}

// --- 3. «Забыл» и «С трудом» ---
{
  const now = Date.now();
  const id = "ch:sliding-window.html";
  const base = { due: now - DAY, iv: 20, ease: 2.5, reps: 5, meta: { href: "sliding-window.html" } };

  const forgot = await newDom({ algoSRS: JSON.stringify({ [id]: base }) });
  click(forgot, "Забыл");
  // «Забыл» сначала спрашивает про ошибку — сохраняем заметку и откладываем
  const input = forgot.window.document.querySelector("input");
  if (!input) {
    errors.push("после «Забыл» не появилось поле «в чём была ошибка»");
  } else {
    input.value = "перепутал границу окна";
    click(forgot, "Сохранить и отложить");
  }
  const afterForgot = cards(forgot)[id];
  if (afterForgot.iv !== 1) errors.push(`после «Забыл» интервал = ${afterForgot.iv}, ожидался 1`);
  if (!(afterForgot.ease < 2.5)) errors.push(`после «Забыл» ease = ${afterForgot.ease}, ожидалось снижение`);
  if (afterForgot.note !== "перепутал границу окна") {
    errors.push(`заметка не сохранилась: ${JSON.stringify(afterForgot.note)}`);
  }
  if (Math.abs(afterForgot.due - (Date.now() + DAY)) > 5 * 60 * 1000) {
    errors.push("после «Забыл» срок не сдвинулся ровно на день");
  }

  // заметка показывается при следующем повторе
  const again = await newDom({ algoSRS: JSON.stringify({ [id]: Object.assign({}, afterForgot, { due: now - DAY }) }) });
  if (!/перепутал границу окна/.test(again.window.document.querySelector(".algo-today").textContent)) {
    errors.push("сохранённая заметка не показана при следующем повторении");
  }

  const hard = await newDom({ algoSRS: JSON.stringify({ [id]: base }) });
  click(hard, "С трудом");
  const afterHard = cards(hard)[id];
  if (afterHard.iv !== 24) errors.push(`после «С трудом» интервал = ${afterHard.iv}, ожидался 24 (20 × 1.2)`);
}

// --- 4. ease не убегает за границы ---
{
  const now = Date.now();
  const id = "task:x#1";
  let card = { due: now - DAY, iv: 1, ease: 2.5, reps: 0, meta: { page: "big-o", q: "задача" } };
  for (let i = 0; i < 15; i++) {
    const dom = await newDom({ algoSRS: JSON.stringify({ [id]: Object.assign({}, card, { due: now - DAY }) }) });
    click(dom, "Помню");
    card = cards(dom)[id];
  }
  if (card.ease > 2.8 + 1e-9) errors.push(`ease вырос до ${card.ease}, потолок 2.8`);

  card = { due: now - DAY, iv: 30, ease: 2.5, reps: 8, meta: { page: "big-o", q: "задача" } };
  for (let i = 0; i < 15; i++) {
    const dom = await newDom({ algoSRS: JSON.stringify({ [id]: Object.assign({}, card, { due: now - DAY }) }) });
    click(dom, "Забыл");
    click(dom, "Сохранить и отложить");
    card = cards(dom)[id];
  }
  if (card.ease < 1.3 - 1e-9) errors.push(`ease упал до ${card.ease}, пол 1.3`);
}

if (errors.length) {
  console.error(`❌ srs-check: ${errors.length} проблем(ы):`);
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
console.log(
  "✅ srs-check: карточки заводятся из глав/пакетов/промахов с верным сроком, интервалы 1→3→геометрия, " +
    "«забыл» роняет в день и пишет заметку, ease держится в [1.3, 2.8]"
);
}

main().catch(function (e) {
  console.error("❌ srs-check: неожиданная ошибка:", e);
  process.exit(1);
});
