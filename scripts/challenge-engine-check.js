#!/usr/bin/env node
// Смоук-тест ПОВЕДЕНИЯ challenge.js в jsdom (запускать из корня):
//  - choice перемешивает варианты (позиция правильного не подсказывает ответ);
//  - promах у predict/cloze/ordering НЕ спойлерит разбор; после 2-й неудачи
//    появляется кнопка «Показать разбор»;
//  - нормализация: кириллические двойники латиницы (О в O(1)), пробелы-разряды
//    в числах («1 048 576»), русские слова-ответы.
// Требует jsdom (в CI ставится npm install --no-save jsdom).
// Если его нет — мягкий пропуск (exit 0), как в остальных смоуках: локальное
// отсутствие jsdom не должно валить прогон проверок.
const fs = require("fs");
const path = require("path");

let JSDOM;
try {
  ({ JSDOM } = require("jsdom"));
} catch (e) {
  console.log("⏭  challenge-engine-check: jsdom не установлен — пропускаю (npm i jsdom).");
  process.exit(0);
}

const src = fs.readFileSync(
  path.join(__dirname, "..", "assets", "challenge.js"),
  "utf8"
);

async function makeDom(bodyHtml, mathRandom) {
  const dom = new JSDOM(`<body>${bodyHtml}</body>`, { runScripts: "outside-only" });
  if (mathRandom) dom.window.Math.random = mathRandom;
  dom.window.eval(src);
  // jsdom стартует в readyState=loading — init() ждёт DOMContentLoaded
  if (dom.window.document.readyState === "loading") {
    await new Promise((r) => dom.window.document.addEventListener("DOMContentLoaded", r));
  }
  return dom;
}

let failures = 0;
function assert(cond, msg) {
  if (cond) {
    console.log("  ok:", msg);
  } else {
    failures++;
    console.error("  FAIL:", msg);
  }
}

async function main() {
// ---- 1. choice: перемешивание вариантов ----
console.log("choice shuffle:");
{
  // Math.random = 0 → Фишер-Йейтс с j=0 каждый шаг реверсирует порядок [0,1,2] → [1,2,0]
  const dom = await makeDom(
    `<div class="algo-challenge" data-type="choice" data-options="ПРАВИЛЬНЫЙ|второй|третий" data-answer="0" data-explain="разбор"></div>`,
    () => 0
  );
  const btns = [...dom.window.document.querySelectorAll(".algo-challenge__opt")];
  assert(btns.length === 3, "3 кнопки отрисованы");
  assert(btns[0].textContent !== "ПРАВИЛЬНЫЙ", "правильный вариант НЕ первый после шаффла (при Math.random=0)");
  // клик по неверной кнопке → правильная подсвечивается, разбор виден (у choice попытка одна)
  const wrong = btns.find((b) => b.textContent !== "ПРАВИЛЬНЫЙ");
  wrong.click();
  const revealed = btns.find((b) => b.classList.contains("algo-challenge__opt--reveal"));
  assert(revealed && revealed.textContent === "ПРАВИЛЬНЫЙ", "после промаха подсвечен правильный");
  assert(dom.window.document.querySelector(".algo-challenge__explain"), "у choice разбор показан после ответа");
}

// ---- 2. predict: промах не спойлерит, после 2-й попытки — кнопка разбора ----
console.log("predict no-spoiler:");
{
  const dom = await makeDom(
    `<div class="algo-challenge" data-type="predict" data-answer="42" data-explain="СЕКРЕТ: ответ 42"></div>`
  );
  const doc = dom.window.document;
  const input = doc.querySelector(".algo-challenge__input");
  const btn = doc.querySelector(".algo-challenge__btn");
  input.value = "7";
  btn.click();
  assert(!doc.querySelector(".algo-challenge__explain"), "1-й промах: разбора нет");
  assert(!doc.querySelector(".algo-challenge__reveal"), "1-й промах: кнопки разбора ещё нет");
  btn.click();
  assert(!doc.querySelector(".algo-challenge__explain"), "2-й промах: разбор всё ещё скрыт");
  const reveal = doc.querySelector(".algo-challenge__reveal");
  assert(!!reveal, "2-й промах: появилась кнопка «Показать разбор»");
  reveal.click();
  assert(
    doc.querySelector(".algo-challenge__explain") &&
      doc.querySelector(".algo-challenge__explain").textContent.includes("СЕКРЕТ"),
    "по кнопке разбор открылся"
  );
  input.value = "42";
  btn.click();
  assert(doc.querySelector(".algo-challenge__fb--ok"), "верный ответ засчитан");
  assert(doc.querySelector(".algo-challenge__explain"), "при верном ответе разбор показан");
}

// ---- 3. нормализация: кириллица и пробелы в числах ----
console.log("normalization:");
{
  const dom = await makeDom(
    `<div class="algo-challenge" data-type="cloze" data-answer="O(1)" data-explain="e"></div>
     <div class="algo-challenge" data-type="predict" data-answer="1048576" data-explain="e"></div>
     <div class="algo-challenge" data-type="predict" data-answer="минимум;min" data-explain="e"></div>`
  );
  const doc = dom.window.document;
  const widgets = [...doc.querySelectorAll(".algo-challenge")];

  // кириллическая О в O(1)
  let input = widgets[0].querySelector(".algo-challenge__input");
  input.value = "О(1)"; // кириллическая О
  widgets[0].querySelector(".algo-challenge__btn").click();
  assert(widgets[0].querySelector(".algo-challenge__fb--ok"), "cloze: кириллическая О(1) засчитана");

  // число с пробелами-разрядами
  input = widgets[1].querySelector(".algo-challenge__input");
  input.value = "1 048 576";
  widgets[1].querySelector(".algo-challenge__btn").click();
  assert(widgets[1].querySelector(".algo-challenge__fb--ok"), "predict: «1 048 576» == 1048576");

  // русское слово-ответ по-прежнему работает (свёртка симметрична)
  input = widgets[2].querySelector(".algo-challenge__input");
  input.value = "  Минимум ";
  widgets[2].querySelector(".algo-challenge__btn").click();
  assert(widgets[2].querySelector(".algo-challenge__fb--ok"), "predict: русское слово «минимум» засчитано");
}

// ---- 4. ordering: промах без спойлера ----
console.log("ordering no-spoiler:");
{
  const dom = await makeDom(
    `<div class="algo-challenge" data-type="ordering" data-items="альфа|бета|гамма" data-explain="СЕКРЕТ порядка"></div>`
  );
  const doc = dom.window.document;
  const clickChip = (text) => {
    [...doc.querySelectorAll(".algo-challenge__pool .algo-challenge__chip")]
      .find((c) => c.textContent.includes(text))
      .click();
  };
  const check = () =>
    [...doc.querySelectorAll(".algo-challenge__btn")].find((b) => b.textContent === "Проверить порядок").click();

  // неверный порядок дважды
  clickChip("гамма"); clickChip("бета"); clickChip("альфа");
  check();
  assert(!doc.querySelector(".algo-challenge__explain"), "ordering 1-й промах: разбора нет");
  check();
  assert(!!doc.querySelector(".algo-challenge__reveal"), "ordering 2-й промах: кнопка разбора");
}

// ---- 5. исход задачи идёт в расписание её карточки (ALGO_SRS.report, настоящий srs.js) ----
// Первая проверка за загрузку страницы оценивает карточку task:<страница>#<номер>: верно — «Помню»,
// неверно — «Забыл», и у уже решённой задачи тоже; дальнейшие попытки той же загрузки карточку не трогают.
// Новый промах заводит карточку на начало завтрашних суток: ответ в тот же день её не оценивает, назавтра — да.
console.log("report → srs:");
{
  const DAY = 24 * 60 * 60 * 1000;
  const NOW = new Date(2026, 0, 14, 12, 0, 0).getTime();
  const TASK = `<div class="algo-challenge" data-type="predict" data-answer="42" data-explain="разбор"><div class="algo-challenge__q">Сколько?</div></div>`;
  const CHOICE = `<div class="algo-challenge" data-type="choice" data-options="верный|второй|третий" data-answer="0" data-explain="разбор"></div>`;
  const ORDER = `<div class="algo-challenge" data-type="ordering" data-items="альфа|бета|гамма" data-explain="разбор"></div>`;
  const srcSrs = fs.readFileSync(path.join(__dirname, "..", "assets", "srs.js"), "utf8");
  const mature = () => ({ due: NOW - DAY, iv: 8, ease: 2.5, reps: 3, meta: { page: "big-o", anchor: "task-0", q: "Сколько?" }, seen: NOW - 9 * DAY });
  async function page(body, seed) {
    const dom = new JSDOM(`<body>${body}</body>`, { runScripts: "outside-only", url: "https://example.test/big-o.html" });
    Object.keys(seed).forEach((k) => dom.window.localStorage.setItem(k, seed[k]));
    dom.window.eval(`window.__now = ${NOW}; Date.now = function () { return window.__now; };`);
    dom.window.eval(srcSrs);
    dom.window.eval(src);
    if (dom.window.document.readyState === "loading") {
      await new Promise((r) => dom.window.document.addEventListener("DOMContentLoaded", r));
    }
    return dom;
  }
  const cardOf = (dom) => JSON.parse(dom.window.localStorage.getItem("algoSRS") || "{}")["task:big-o#0"];
  const answer = (dom, v) => {
    const doc = dom.window.document;
    doc.querySelector(".algo-challenge__input").value = v;
    doc.querySelector(".algo-challenge__btn").click();
  };
  const solvedSeed = () => ({ algoChallengeSolved: JSON.stringify({ "big-o#0": true }), algoSRS: JSON.stringify({ "task:big-o#0": mature() }) });

  // решённая задача, карточка в сроке: неверный ответ — «Забыл»; вторая попытка в ту же загрузку — без оценки
  let dom = await page(TASK, solvedSeed());
  answer(dom, "7");
  let c = cardOf(dom);
  assert(c && c.iv === 1 && c.back === 3 && c.reps === 0, `решённая задача, неверно: «Забыл» (iv 1, back 3) — ${JSON.stringify(c)}`);
  const snap = dom.window.localStorage.getItem("algoSRS");
  answer(dom, "42");
  assert(dom.window.localStorage.getItem("algoSRS") === snap, "вторая попытка в ту же загрузку карточку не трогает");
  assert(!JSON.parse(dom.window.localStorage.getItem("algoChallengeMissed") || "{}")["big-o#0"], "промах по решённой задаче в список промахов не пишется (как раньше)");
  // та же задача, верный ответ — «Помню»
  dom = await page(TASK, solvedSeed());
  answer(dom, "42");
  c = cardOf(dom);
  assert(c && c.iv === 20 && c.reps === 4, `решённая задача, верно: «Помню» (iv 8 → 20) — ${JSON.stringify(c)}`);
  answer(dom, "7");
  assert(cardOf(dom).iv === 20 && !cardOf(dom).back, "неверный ответ после верного в ту же загрузку не роняет карточку");
  // новый промах: карточка заводится на начало завтрашних суток (report отвечает created), второй промах той
  // же загрузки — без оценки
  const TOMORROW = new Date(2026, 0, 15).getTime();
  dom = await page(TASK, {});
  answer(dom, "7");
  c = cardOf(dom);
  assert(c && c.iv === 0 && c.due === TOMORROW, `первый промах заводит карточку на начало завтра, не оценивая её: ${JSON.stringify(c)}`);
  answer(dom, "8");
  assert(JSON.stringify(cardOf(dom)) === JSON.stringify(c), "второй промах в ту же загрузку не опускает только что заведённую карточку");
  // та же задача в тот же день после перезагрузки: верный ответ — early, карточка и счёт дня не тронуты
  const missSeed = () => ({ algoSRS: dom.window.localStorage.getItem("algoSRS"), algoChallengeMissed: dom.window.localStorage.getItem("algoChallengeMissed") });
  const seedAfterMiss = missSeed();
  let again = await page(TASK, seedAfterMiss);
  answer(again, "42");
  assert(JSON.stringify(cardOf(again)) === JSON.stringify(c) && again.window.localStorage.getItem("algoToday") === null,
    `верный ответ в тот же день после промаха карточку не оценивает (early): ${JSON.stringify(cardOf(again))}, algoToday ${again.window.localStorage.getItem("algoToday")}`);
  // назавтра — оценивается: «Помню», первый интервал
  again = await page(TASK, seedAfterMiss);
  again.window.__now = TOMORROW + 9 * 60 * 60 * 1000;
  answer(again, "42");
  assert(cardOf(again).iv === 1 && cardOf(again).reps === 1, `назавтра верный ответ оценивает карточку промаха: ${JSON.stringify(cardOf(again))}`);
  // выбор и порядок шагов — те же правила
  dom = await page(CHOICE.replace("<div ", '<div data-id="big-o#0" '), solvedSeed());
  [...dom.window.document.querySelectorAll(".algo-challenge__opt")].find((b) => b.textContent !== "верный").click();
  assert(cardOf(dom).iv === 1, `choice, неверно: «Забыл» — ${JSON.stringify(cardOf(dom))}`);
  dom = await page(ORDER.replace("<div ", '<div data-id="big-o#0" '), solvedSeed());
  const doc = dom.window.document;
  for (const t of ["альфа", "бета", "гамма"]) [...doc.querySelectorAll(".algo-challenge__pool .algo-challenge__chip")].find((x) => x.textContent.includes(t)).click();
  [...doc.querySelectorAll(".algo-challenge__btn")].find((b) => b.textContent === "Проверить порядок").click();
  assert(cardOf(dom).iv === 20, `ordering, верно: «Помню» — ${JSON.stringify(cardOf(dom))}`);
  // пустой ответ — не проверка, оценки нет
  dom = await page(TASK, solvedSeed());
  answer(dom, "   ");
  assert(dom.window.localStorage.getItem("algoSRS") === JSON.stringify({ "task:big-o#0": mature() }), "пустой ответ карточку не оценивает");
  answer(dom, "7");
  assert(cardOf(dom).iv === 1, "первая настоящая проверка после пустого ответа оценивает карточку");
}

// ---- 6. узел с data-id не занимает номер: id и якорь остальных — как будто его нет ----
// «Вспомни» ставит новые вопросы в НАЧАЛО главы; займи они номер, у всех задач ниже сдвинулись бы
// id (отметки «решено», промахи, карточки task:) и якоря task-N (ссылки «повторить»).
console.log("data-id вне счёта:");
{
  const Q = (id, q) =>
    `<div class="algo-challenge"${id ? ` data-id="${id}"` : ""} data-type="predict" data-answer="1" data-explain="e"><div class="algo-challenge__q">${q}</div></div>`;
  const dom = new JSDOM(`<body>${Q(null, "A")}${Q("p#r1", "B")}${Q(null, "C")}</body>`, {
    runScripts: "outside-only",
    url: "https://example.test/p.html",
  });
  dom.window.eval(src);
  if (dom.window.document.readyState === "loading") {
    await new Promise((r) => dom.window.document.addEventListener("DOMContentLoaded", r));
  }
  const nodes = [...dom.window.document.querySelectorAll(".algo-challenge")];
  const ids = nodes.map((n) => n.__algoId).join(",");
  const anchors = nodes.map((n) => n.id).join(",");
  assert(ids === "p#0,p#r1,p#1", `id: p#0,p#r1,p#1 — получено ${ids}`);
  assert(anchors === "task-0,task-p-r1,task-1", `якоря: task-0,task-p-r1,task-1 — получено ${anchors}`);
  // промах по вопросу с data-id пишется под его id и с его якорем — по ним ведёт ссылка «повторить»
  nodes[1].querySelector(".algo-challenge__input").value = "7";
  nodes[1].querySelector(".algo-challenge__btn").click();
  const missed = JSON.parse(dom.window.localStorage.getItem("algoChallengeMissed") || "{}");
  assert(
    missed["p#r1"] && missed["p#r1"].anchor === "task-p-r1" && missed["p#r1"].page === "p",
    `промах вопроса с data-id: ключ p#r1, якорь task-p-r1 — ${JSON.stringify(missed)}`
  );
}

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
