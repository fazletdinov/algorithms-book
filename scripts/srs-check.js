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
//   3) «Забыл» роняет интервал в 1 день и снижает ease, «с трудом» — растит слабо, но
//      растит, и во всех достижимых состояниях с интервалом до 60 дней не откладывает
//      дальше, чем «Помню»; после «Забыл» повтор «С трудом» засчитывается: подряд
//      «Забыл», «С трудом», «С трудом» дают 1, 1, 2 дня, а не день без конца;
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
const problemsJs = fs.readFileSync(path.join(root, "assets", "problems.js"), "utf8");

const errors = [];
const vc = new VirtualConsole();
vc.on("jsdomError", (e) => errors.push("jsdomError: " + (e && e.message)));
vc.on("error", (...a) => errors.push("console.error: " + a.join(" ")));

const DAY = 24 * 60 * 60 * 1000;

// Сначала ждём загрузки документа, ПОТОМ кладём данные и подключаем srs.js:
// иначе скрипт видит readyState === "loading", подписывается на DOMContentLoaded
// и строит виджет уже после проверок (первая версия этого смоука так и падала —
// «карточек 0» при полном localStorage).
function newDom(seed, extra) {
  return new Promise(function (resolve) {
    const dom = new JSDOM(`<!DOCTYPE html><html><body><div class="algo-today"></div></body></html>`, {
      runScripts: "dangerously",
      virtualConsole: vc,
      url: "https://example.test/review.html",
    });
    dom.window.addEventListener("load", function () {
      Object.keys(seed).forEach((k) => dom.window.localStorage.setItem(k, seed[k]));
      // extra — скрипты, которые в книге подключены раньше движка (банк задач)
      (extra || []).concat([srsJs]).forEach((code) => {
        const script = dom.window.document.createElement("script");
        script.textContent = code;
        dom.window.document.body.appendChild(script);
      });
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

// --- 1b. промахи смешанной тренировки и собеседования: шаблон и сложность ---
// Два разных вида карточек по одной и той же задаче: узнать приём (mix:) и
// оценить стоимость своего кода (cx:) — разные умения, и оба встают на сегодня.
{
  const now = Date.now();
  const dom = await newDom({
    algoMixedMissed: JSON.stringify({ "topk.KthLargest": { n: 1, chapter: "top-k-elements", pkg: "topk", fn: "KthLargest" } }),
    algoMockCxMissed: JSON.stringify({ "dp.CoinChange": { n: 1, chapter: "dynamic-programming", pkg: "dp", fn: "CoinChange" } }),
  });
  const c = cards(dom);
  for (const id of ["mix:topk.KthLargest", "cx:dp.CoinChange"]) {
    if (!c[id]) errors.push(`не заведена карточка ${id}: ${JSON.stringify(Object.keys(c))}`);
    else if (c[id].due - now > DAY * 0.1) errors.push(`карточка ${id} заведена не на сегодня`);
  }
  const text = dom.window.document.querySelector(".algo-today").textContent;
  if (!/К повторению сегодня: 2/.test(text)) errors.push(`в очереди не две карточки: «${text.slice(0, 80)}»`);

  // Виджет показывает одну текущую карточку, а не список, — поэтому вид карточки
  // cx: проверяем там, где она единственная.
  const solo = await newDom({
    algoMockCxMissed: JSON.stringify({ "dp.CoinChange": { n: 1, chapter: "dynamic-programming", pkg: "dp", fn: "CoinChange" } }),
  });
  const soloText = solo.window.document.querySelector(".algo-today").textContent;
  if (!/Собеседование: сложность/.test(soloText) || !/dp\.CoinChange/.test(soloText)) {
    errors.push(`карточка промаха по сложности отрисована без своего вида или без задачи: «${soloText.slice(0, 120)}»`);
  }

  // Карточка mix: — вопрос. Раньше её заголовком было «topk.KthLargest — шаблон
  // выбран неверно»: имя пакета и есть ответ, и «Помню» ничего не проверяло.
  const mix = await newDom({
    algoMixedMissed: JSON.stringify({ "topk.KthLargest": { n: 1, chapter: "top-k-elements", pkg: "topk", fn: "KthLargest" } }),
  }, [problemsJs]);
  const w = mix.window, box = w.document.querySelector(".algo-today");
  const statement = (w.ALGO_PROBLEMS.find((p) => p.p === "topk" && p.f === "KthLargest") || {}).s || "";
  const mixText = box.textContent;
  if (!statement || !mixText.includes(statement.split("\n")[0])) {
    errors.push(`карточка mix: не показывает условие задачи из банка: «${mixText.slice(0, 160)}»`);
  }
  if (/topk|KthLargest|Top-K|top-k/i.test(mixText)) {
    errors.push(`карточка mix: до ответа выдаёт пакет, функцию или главу: «${mixText.slice(0, 200)}»`);
  }
  const grades = box.querySelector(".algo-today__grades");
  if (!grades || grades.style.display !== "none") errors.push("карточка mix: оценки доступны до «Показать ответ»");
  // Промах предсказания в виджете (режим 🎯) — карточка viz: на сегодня, со строкой
  // развилки и ссылкой на страницу виджета.
  const viz = await newDom({
    algoVizMissed: JSON.stringify({ "sliding-window-fixed": { n: 2, page: "sliding-window.html", title: "Максимум окна размера 3", line: 9, code: "if windowSum > maxSum {" } }),
  });
  const vc = cards(viz)["viz:sliding-window-fixed"];
  if (!vc) errors.push("промах предсказания не завёл карточку viz:");
  else if (vc.due - Date.now() > DAY * 0.1) errors.push("карточка viz: заведена не на сегодня");
  const vizText = viz.window.document.querySelector(".algo-today").textContent;
  const vizLink = viz.window.document.querySelector(".algo-today__title");
  if (!/Предсказание шага/.test(vizText) || !/строка 9: if windowSum > maxSum/.test(vizText) || !vizLink || vizLink.getAttribute("href") !== "sliding-window.html") {
    errors.push(`карточка viz: без вида, развилки или ссылки на страницу: «${vizText.slice(0, 160)}»`);
  }

  if (click(mix, "Показать ответ")) {
    const ans = box.querySelector(".algo-today__answer a");
    if (!ans || ans.getAttribute("href") !== "top-k-elements.html") {
      errors.push(`после «Показать ответ» нет ссылки на главу-ответ: ${ans && ans.outerHTML}`);
    }
    if (grades.style.display === "none") errors.push("после «Показать ответ» оценки так и не появились");
  }
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

  // «С трудом» обязано растить интервал и на коротких: round(1 × 1.2) = 1 возвращал
  // карточку каждый день без конца. Число повторов — какое бывает у карточки с таким
  // интервалом: новая (0), после первой оценки (1), дальше (2).
  for (const [iv, want] of [[0, 1], [1, 2], [2, 3], [3, 4]]) {
    const d = await newDom({ algoSRS: JSON.stringify({ [id]: Object.assign({}, base, { iv, reps: Math.min(iv, 2) }) }) });
    click(d, "С трудом");
    const got = cards(d)[id].iv;
    if (got !== want) errors.push(`«С трудом» при интервале ${iv}: стало ${got}, ожидалось ${want} (рост не меньше чем на день)`);
  }
}

// --- 3b. порядок оценок: «Забыл» ≤ «С трудом» ≤ «Помню» ---
// Более слабая оценка не может отложить карточку дальше, чем более сильная. Перебираются ВСЕ
// состояния, достижимые оценками из новой карточки (интервал до 60 дней): инверсия пряталась
// ровно в одном — сразу после «Забыл» (интервал 1, повторов 0) «Помню» даёт день, а «С трудом»
// давала два. Там же второе свойство: у карточки, которую уже повторяли, «С трудом» обязана
// растить интервал — иначе она приходит каждый день без конца.
// Один документ на весь перебор (свежий контейнер и повторное исполнение srs.js на каждую
// оценку): по JSDOM на оценку это шло бы минуты.
{
  const LIMIT = 60;
  const id = "ch:sliding-window.html";
  const dom = await newDom({});
  const w = dom.window;
  const grade = (state, label) => {
    w.document.body.innerHTML = '<div class="algo-today"></div>';
    const card = Object.assign({}, state, { due: Date.now() - DAY, meta: { href: "sliding-window.html" } });
    w.localStorage.setItem("algoSRS", JSON.stringify({ [id]: card }));
    const script = w.document.createElement("script");
    script.textContent = srsJs;
    w.document.body.appendChild(script);
    if (!click(dom, label)) return null;
    if (label === "Забыл" && !click(dom, "Сохранить и отложить")) return null;
    const c = cards(dom)[id];
    return { iv: c.iv, ease: c.ease, reps: c.reps };
  };
  // расписание смотрит на число повторов только как на 0 / 1 / «2 и больше»
  const key = (s) => s.iv + "|" + Math.min(s.reps, 2) + "|" + s.ease.toFixed(2);
  const show = (s) => `интервал ${s.iv}, повторов ${s.reps}, ease ${s.ease.toFixed(2)}`;

  const start = { iv: 0, ease: 2.5, reps: 0 };
  const seen = new Set([key(start)]);
  const queue = [start];
  const inversions = [], stuck = [];
  for (let head = 0; head < queue.length; head++) {
    const st = queue[head];
    const again = grade(st, "Забыл"), hard = grade(st, "С трудом"), good = grade(st, "Помню");
    if (!again || !hard || !good) break; // кнопки не нашлось — click() уже записал ошибку
    if (!(again.iv <= hard.iv && hard.iv <= good.iv)) {
      inversions.push(`${show(st)}: «Забыл» → ${again.iv}, «С трудом» → ${hard.iv}, «Помню» → ${good.iv}`);
    }
    if (st.reps > 0 && hard.iv <= st.iv) stuck.push(`${show(st)}: «С трудом» → ${hard.iv}`);
    for (const next of [again, hard, good]) {
      if (next.iv > LIMIT || seen.has(key(next))) continue;
      seen.add(key(next));
      queue.push(next);
    }
  }
  // сейчас состояний 1377; если перебор вдруг сжался в разы, он перестал что-либо проверять
  if (queue.length < 500) errors.push(`перебор состояний расписания обошёл только ${queue.length} — ожидалось больше 500`);
  if (inversions.length) {
    errors.push(`слабая оценка откладывает дальше сильной в ${inversions.length} из ${queue.length} состояний, например: ${inversions.slice(0, 2).join("; ")}`);
  }
  if (stuck.length) {
    errors.push(`«С трудом» не растит интервал у уже повторявшейся карточки в ${stuck.length} из ${queue.length} состояний, например: ${stuck.slice(0, 2).join("; ")}`);
  }

  // Перебор выше смотрит на рост «С трудом» только при reps > 0: из состояния reps = 0 первый
  // интервал и есть день, и «не вырос» там нормально. Поэтому регрессию «при reps = 0 повтор
  // не засчитывается» он не видит, а карточка после «Забыл» тогда возвращалась бы каждый день
  // без конца. Ловит её только последовательность: на второй «С трудом» интервал уже 2.
  const forgot = grade({ iv: 10, ease: 2.5, reps: 3 }, "Забыл");
  const hard1 = forgot && grade(forgot, "С трудом");
  const hard2 = hard1 && grade(hard1, "С трудом");
  if (hard2) {
    const got = [forgot.iv, hard1.iv, hard2.iv].join(", ");
    if (got !== "1, 1, 2") errors.push(`«Забыл», «С трудом», «С трудом» дали интервалы ${got} дней вместо 1, 1, 2`);
    if (hard1.reps !== 1 || hard2.reps !== 2) errors.push(`«С трудом» после «Забыл» не засчитан как повтор: повторов ${hard1.reps} и ${hard2.reps} вместо 1 и 2`);
  }
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
    "«забыл» роняет в день и пишет заметку, «с трудом» не откладывает дальше «помню» во всех достижимых состояниях " +
    "с интервалом до 60 дней, «забыл → с трудом → с трудом» даёт 1, 1, 2 дня, ease держится в [1.3, 2.8]"
);
}

main().catch(function (e) {
  console.error("❌ srs-check: неожиданная ошибка:", e);
  process.exit(1);
});
