#!/usr/bin/env node
// Headless smoke движка интервальных повторений (assets/srs.js).
//
//   node scripts/srs-check.js
//
// Проверяется не «виджет отрисовался», а арифметика расписания и правила
// заведения карточек — то, из-за чего метод либо работает, либо тихо
// вырождается в список без порядка:
//   1) карточки заводятся сами из источников (главы, пакеты, промахи) на ЛЮБОЙ странице,
//      а не только на «Повторении»; срок считается от события (метки algoProgressAt,
//      algoPkgSolved, algoExplainDone), промах встаёт «сейчас»;
//   2) «Помню» даёт интервалы 1 → 3 → растущий геометрически, а не фиксированный;
//   3) «Забыл» — шаг назад по лестнице: завтра, потом предыдущая ступень (22 → 1 → 8 → 21),
//      а не сброс в начало; «С трудом» растит слабо, но растит; перебор достижимых состояний
//      (в том числе карточек прежней формулы) подтверждает порядок «Забыл» ≤ «С трудом» ≤
//      «Помню», в сроках тоже, при любом сдвиге; повтор любой оценки не оставляет карточку
//      на месте; «Забыл» и «Помню» не дальше, чем было до «Забыл»;
//   4) ease не убегает за границы [1.3, 2.8] даже после серии одинаковых оценок;
//   5) заметка «в чём была ошибка» сохраняется и показывается при следующем повторе;
//   6) сдвиг срока от 8 дней управляем подставным генератором, номинальный iv от него не зависит;
//   7) две вкладки: оценка в одной не затирает то, что другая записала в algoSRS;
//   8) report(): четыре исхода; счётчик «Сегодня: N» в верхней панели каждой страницы;
//   9) карточки прежних версий (без back, iv = 1 при reps ≥ 2, главы без меток) не теряются.
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
function newDom(seed, extra, body) {
  return new Promise(function (resolve) {
    const dom = new JSDOM(`<!DOCTYPE html><html><body>${body || '<div class="algo-today"></div>'}</body></html>`, {
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

// Страница так, как её собирает mdBook: скрипты стоят в конце body, и srs.js видит
// readyState === "loading". Данные кладутся в beforeParse — до первого скрипта.
function bootDom(seed, body) {
  return new Promise(function (resolve) {
    const dom = new JSDOM(`<!DOCTYPE html><html><body>${body}<script>${srsJs}</script></body></html>`, {
      runScripts: "dangerously",
      virtualConsole: vc,
      url: "https://example.test/sliding-window.html",
      beforeParse(window) {
        Object.keys(seed).forEach((k) => window.localStorage.setItem(k, seed[k]));
      },
    });
    dom.window.addEventListener("load", () => resolve(dom));
  });
}

// Верхняя панель mdBook 0.5: справа кнопки, слева заголовок книги.
const MENU =
  '<div id="mdbook-menu-bar" class="menu-bar"><div class="left-buttons"></div><h1 class="menu-title">Книга</h1>' +
  '<div class="right-buttons"><a href="print.html" title="Print"><span class="fa-svg">P</span></a></div></div>';

const badgeOf = (dom) => dom.window.document.querySelector(".algo-srs-badge");
const badgeShown = (dom) => {
  const b = badgeOf(dom);
  return b && !b.hidden ? b.textContent.replace(/\s+/g, " ").trim() : null;
};

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
    // пакет решён только что: срок «завтра». Метки в прошлом проверяет раздел 5.
    algoPkgSolved: JSON.stringify({ slidingwindow: now }),
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

// --- 3a. лестница, «Забыл» как шаг назад и разброс: числа считает настоящая schedule ---
// Таблица взята у плана, но план её не запускал: каждая строка здесь проверена функцией, а не
// посчитана руками. rnd = () => 0.5 выключает разброс (2·0.5 − 1 = 0).
const api = (await newDom({})).window.ALGO_SRS;
if (!api) {
  errors.push("window.ALGO_SRS не определён — расписание недоступно снаружи виджета");
} else {
  const MID = () => 0.5;
  const play = (start, grades, rnd) => {
    const c = Object.assign({ due: 0, meta: {} }, start);
    return grades.map((g) => {
      api.schedule(c, g, 0, rnd || MID);
      return c.back != null ? `${c.iv} (back ${c.back})` : String(c.iv);
    });
  };
  const A = { iv: 22, ease: 2.7, reps: 4 };
  for (const [name, start, grades, want] of [
    ["22 дня: Забыл, Помню, Помню", A, ["again", "good", "good"], "1 (back 8), 8, 21"],
    ["22 дня: Забыл, Забыл, Помню, Помню", A, ["again", "again", "good", "good"], "1 (back 8), 1 (back 3), 3, 7"],
    ["3 дня: Забыл, Помню, Помню", { iv: 3, ease: 2.6, reps: 2 }, ["again", "good", "good"], "1 (back 1), 1, 3"],
    ["прежняя формула iv 1, ease 1.3, reps 2: Помню", { iv: 1, ease: 1.3, reps: 2 }, ["good"], "2"],
    ["прежняя формула iv 1, ease 1.3, reps 2: С трудом", { iv: 1, ease: 1.3, reps: 2 }, ["hard"], "2"],
    ["«С трудом» после «Забыл» снимает back: 1, затем 2", { iv: 22, ease: 2.7, reps: 4 }, ["again", "hard", "hard"], "1 (back 8), 1, 2"],
    // round(4 / 2.55) = 2, но ниже 3 дней «Забыл» ступень не опускает: пол LADDER_LOW
    ["4 дня при высоком ease: Забыл, Помню (пол ступени)", { iv: 4, ease: 2.55, reps: 2 }, ["again", "good"], "1 (back 3), 3"],
    ["ладдер «Помню» с новой карточки", { iv: 0, ease: 2.5, reps: 0 }, ["good", "good", "good", "good", "good"], "1, 3, 8, 22, 61"],
  ]) {
    const got = play(start, grades).join(", ");
    if (got !== want) errors.push(`${name}: интервалы «${got}», ожидалось «${want}»`);
  }

  // Неизвестная оценка (опечатка в вызове виджета) не должна молча стать «Помню».
  {
    const c = { iv: 8, ease: 2.5, reps: 3, due: 5, meta: {} };
    const before = JSON.stringify(c);
    const got = api.schedule(c, "excellent", 0, MID);
    if (JSON.stringify(c) !== before || got !== 8) errors.push(`schedule с неизвестной оценкой изменил карточку: ${JSON.stringify(c)}, вернул ${got}`);
  }

  // Разброс: номинальный iv не двигается, сдвигается только срок, и только от 8 дней.
  const jit = (rnd) => {
    const c = { iv: 8, ease: 2.65, reps: 3, due: 0, meta: {} };
    api.schedule(c, "good", 0, () => rnd);
    return `iv ${c.iv}, срок через ${c.due / DAY}`;
  };
  for (const [rnd, want] of [[0, "iv 22, срок через 19"], [0.5, "iv 22, срок через 22"], [0.999, "iv 22, срок через 25"]]) {
    const got = jit(rnd);
    if (got !== want) errors.push(`разброс при rnd = ${rnd}: «${got}», ожидалось «${want}»`);
  }
  for (const rnd of [0, 0.999]) {
    const c = { iv: 1, ease: 2.5, reps: 1, due: 0, meta: {} };
    api.schedule(c, "good", 0, () => rnd);
    if (c.iv !== 3 || c.due !== 3 * DAY) errors.push(`у iv 3 срок зависит от rnd = ${rnd}: iv ${c.iv}, срок через ${c.due / DAY}`);
  }
  // без подставного генератора — настоящий Math.random: срок в пределах ±12,5 %, iv прежний
  for (let i = 0; i < 200; i++) {
    const c = { iv: 8, ease: 2.65, reps: 3, due: 0, meta: {} };
    api.schedule(c, "good", 0);
    const days = c.due / DAY;
    if (c.iv !== 22 || days < 19 || days > 25) {
      errors.push(`schedule без rnd: iv ${c.iv}, срок через ${days} (ждали iv 22, срок 19…25)`);
      break;
    }
  }
}

// --- 3b. порядок оценок: «Забыл» ≤ «С трудом» ≤ «Помню» ---
// Более слабая оценка не может отложить карточку дальше, чем более сильная. Перебираются ВСЕ
// состояния, достижимые оценками из новой карточки и из карточек прежней формулы (интервал до
// 100 дней), теперь с полем back. Идёт через ALGO_SRS.schedule в одном документе — ни DOM, ни
// localStorage на оценку не нужны, поэтому перебор на порядки шире прежнего (1377 состояний).
// Сдвиг срока: порядок сверяется и по номинальному iv (rnd = 0.5, сдвига нет), и по срокам при
// крайних rnd = 0 и 0.999 — с ОДНИМ значением rnd на все три оценки: срок iv + round(c·iv)
// не убывает от iv при любом c ∈ [−0.125, 0.125], так что проверка остаётся строгой.
if (api) {
  const LIMIT = 100;
  const MID = () => 0.5;
  const stand = (s) => (s.back != null ? s.back : s.iv);
  const show = (s) => `iv ${s.iv}, повторов ${s.reps}, ease ${s.ease.toFixed(2)}${s.back != null ? ", back " + s.back : ""}`;
  // расписание смотрит на число повторов только как на 0 / 1 / «2 и больше»
  const key = (s) => [s.iv, Math.min(s.reps, 2), s.ease.toFixed(2), s.back == null ? "-" : s.back].join("|");
  const step = (st, g, rnd) => {
    const c = { due: 0, meta: {}, iv: st.iv, ease: st.ease, reps: st.reps };
    if (st.back != null) c.back = st.back;
    api.schedule(c, g, 0, rnd || MID);
    return c;
  };

  const starts = [{ iv: 0, ease: 2.5, reps: 0 }];
  // состояния, которые оставляла формула до этапа 1: интервал 1 при повторах ≥ 2
  for (const reps of [2, 3]) {
    for (let k = 0; k <= 24; k++) starts.push({ iv: 1, ease: Math.round((1.3 + 0.05 * k) * 100) / 100, reps });
  }
  const seen = new Set(starts.map(key));
  const queue = starts.slice();
  const bad = { order: [], dueOrder: [], backStep: [], repeat: [], growth: [], shape: [], jitter: [] };
  const note = (kind, st, text) => { if (bad[kind].length < 3) bad[kind].push(`${show(st)}: ${text}`); bad[kind].n = (bad[kind].n || 0) + 1; };
  const valid = (c) =>
    Number.isInteger(c.iv) && c.iv >= 1 && Number.isInteger(c.reps) && c.reps >= 0 &&
    c.ease >= 1.3 - 1e-9 && c.ease <= 2.8 + 1e-9 &&
    (c.back == null || (Number.isInteger(c.back) && c.back >= 1));

  for (let head = 0; head < queue.length; head++) {
    const st = queue[head];
    const again = step(st, "again"), hard = step(st, "hard"), good = step(st, "good");
    for (const [name, c] of [["Забыл", again], ["С трудом", hard], ["Помню", good]]) {
      if (!valid(c)) note("shape", st, `«${name}» дал недопустимое состояние ${JSON.stringify(c)}`);
    }
    if (!(again.iv <= hard.iv && hard.iv <= good.iv)) {
      note("order", st, `«Забыл» → ${again.iv}, «С трудом» → ${hard.iv}, «Помню» → ${good.iv}`);
    }
    for (const rnd of [() => 0, () => 0.999]) {
      const d = ["again", "hard", "good"].map((g) => step(st, g, rnd));
      if (!(d[0].due <= d[1].due && d[1].due <= d[2].due)) {
        note("dueOrder", st, `сроки в днях ${d.map((c) => c.due / DAY)} при rnd = ${rnd()}`);
      }
      for (const c of d) {
        const off = Math.abs(c.due / DAY - c.iv);
        if (c.iv < 8 ? off !== 0 : off > Math.ceil(0.125 * c.iv)) note("jitter", st, `iv ${c.iv}, срок через ${c.due / DAY}`);
      }
    }
    // «Забыл», затем «Помню» возвращает не дальше, чем карточка стояла до «Забыл»
    if (stand(st) >= 1) {
      const back = step(again, "good");
      if (back.iv > stand(st)) note("backStep", st, `«Забыл» → «Помню» дало ${back.iv} при ${stand(st)} до «Забыл»`);
    }
    // повтор той же оценки не оставляет карточку на месте: «С трудом» и «Помню» за три нажатия
    for (const g of ["hard", "good"]) {
      let c = st;
      for (let i = 0; i < 3; i++) c = step(c, g);
      if (c.iv <= st.iv) note("repeat", st, `три «${g === "hard" ? "С трудом" : "Помню"}» подряд остались на ${c.iv}`);
    }
    // у уже повторявшейся карточки «С трудом» растит с первого нажатия; «Помню» при повторах ≥ 2 — тоже
    if (st.reps > 0 && !(hard.iv > st.iv)) note("growth", st, `«С трудом» → ${hard.iv}`);
    if (st.reps >= 2 && st.back == null && !(good.iv > st.iv)) note("growth", st, `«Помню» → ${good.iv}`);

    for (const next of [again, hard, good]) {
      if (next.iv > LIMIT || seen.has(key(next))) continue;
      seen.add(key(next));
      queue.push({ iv: next.iv, ease: next.ease, reps: next.reps, back: next.back });
    }
  }
  const labels = {
    order: "слабая оценка откладывает дальше сильной",
    dueOrder: "слабая оценка дальше сильной по СРОКУ при сдвиге",
    backStep: "«Забыл» → «Помню» возвращает дальше, чем было до «Забыл»",
    repeat: "повтор той же оценки оставляет карточку на месте",
    growth: "оценка не растит интервал там, где должна",
    shape: "недопустимое состояние карточки",
    jitter: "сдвиг срока вышел за ±12,5 % или появился до 8 дней",
  };
  for (const k of Object.keys(bad)) {
    if (bad[k].n) errors.push(`${labels[k]} в ${bad[k].n} из ${queue.length} проверок, например: ${bad[k].join("; ")}`);
  }
  if (queue.length < 2000) errors.push(`перебор состояний расписания обошёл только ${queue.length} — ожидалось больше 2000`);
  console.log(`   перебор расписания: ${queue.length} состояний, ${queue.filter((s) => s.back != null).length} из них с back (интервал до ${LIMIT} дней, ${starts.length} стартов)`);

  // «Забыл», «С трудом», «С трудом»: на второй «С трудом» интервал уже 2, а не день без конца
  const forgot = step({ iv: 10, ease: 2.5, reps: 3 }, "again");
  const hard1 = step(forgot, "hard");
  const hard2 = step(hard1, "hard");
  const got = [forgot.iv, hard1.iv, hard2.iv].join(", ");
  if (got !== "1, 1, 2") errors.push(`«Забыл», «С трудом», «С трудом» дали интервалы ${got} дней вместо 1, 1, 2`);
  if (hard1.reps !== 1 || hard2.reps !== 2) errors.push(`«С трудом» после «Забыл» не засчитан как повтор: повторов ${hard1.reps} и ${hard2.reps} вместо 1 и 2`);
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

// --- 5. срок новой карточки считается от события, а не от захода на страницу ---
{
  const now = Date.now();
  const dom = await newDom({
    algoProgress: JSON.stringify({ "a.html": true, "b.html": true }),
    algoProgressAt: JSON.stringify({ "a.html": now - 3 * DAY }), // у b метки нет
    algoPkgSolved: JSON.stringify({ pkgold: now - 5 * DAY, pkgbad: true, pkgfuture: now + 10 * DAY }),
    algoExplainDone: JSON.stringify({
      "sliding-window": { ts: now - 2 * DAY, grade: "good" },
      "two-pointers": { ts: now - 2 * DAY, grade: "hard" },
      "prefix-sums": { ts: now - 2 * DAY, grade: "again" },
      greedy: { ts: now - 2 * DAY }, // запись без оценки
    }),
  });
  const c = cards(dom);
  const near = (v, want, what) => {
    if (typeof v !== "number" || Math.abs(v - want) > 60 * 1000) errors.push(`${what}: срок ${v && (v - Date.now()) / DAY} дней от сейчас, ожидалось ${(want - Date.now()) / DAY}`);
  };
  const exact = (card, want, what) => {
    if (!card || card.due !== want) errors.push(`${what}: срок ${card && (card.due - now) / DAY} дней от опорной метки, ожидалось ${(want - now) / DAY}`);
  };
  exact(c["ch:a.html"], now - 2 * DAY, "глава с меткой algoProgressAt (3 дня назад)");
  near(c["ch:b.html"] && c["ch:b.html"].due, Date.now() + DAY, "глава без метки — от сейчас");
  exact(c["pkg:pkgold"], now - 4 * DAY, "пакет решён 5 дней назад");
  near(c["pkg:pkgbad"] && c["pkg:pkgbad"].due, Date.now() + DAY, "пакет, у которого вместо метки true");
  near(c["pkg:pkgfuture"] && c["pkg:pkgfuture"].due, Date.now() + DAY, "пакет с меткой из будущего (часы)");

  const ex = (k) => c["expl:" + k] || {};
  const shape = (k, want) => {
    const e = ex(k);
    const got = `iv ${e.iv}, reps ${e.reps}, ease ${e.ease}, back ${e.back}, срок ${e.due === now - DAY ? "ts+день" : e.due}`;
    if (got !== want) errors.push(`expl:${k}: «${got}», ожидалось «${want}»`);
  };
  shape("sliding-window", "iv 1, reps 1, ease 2.55, back undefined, срок ts+день"); // Сошлось
  shape("two-pointers", "iv 1, reps 1, ease 2.45, back undefined, срок ts+день"); // Частично
  shape("prefix-sums", "iv 1, reps 0, ease 2.3, back 1, срок ts+день"); // Не сошлось
  shape("greedy", "iv 0, reps 0, ease 2.5, back undefined, срок ts+день"); // оценки нет — как раньше
  if (ex("sliding-window").seen !== now - 2 * DAY) errors.push("expl: seen должен быть меткой события, а не временем захода");
}

// --- 6. sync() на любой странице: карточки заводятся без захода на «Повторение», счётчик в панели ---
{
  const seed = {
    algoProgress: JSON.stringify({ "sliding-window.html": true, "big-o.html": false }),
    algoChallengeMissed: JSON.stringify({ "big-o#2": { n: 2, page: "big-o", anchor: "task-2", q: "Сколько копий сделает append?" } }),
  };
  const page = MENU + "<main><h1>Скользящее окно</h1><p>текст главы</p></main>";
  const dom = await bootDom(seed, page);
  const ids = Object.keys(cards(dom)).sort();
  if (JSON.stringify(ids) !== JSON.stringify(["ch:sliding-window.html", "task:big-o#2"])) {
    errors.push(`на странице главы без виджета заведены ${JSON.stringify(ids)}, ожидались глава и промах`);
  }
  const b = badgeOf(dom);
  if (!b) errors.push("на странице главы нет счётчика «Сегодня: N»");
  else {
    if (!/Сегодня:\s*1\b/.test(badgeShown(dom) || "")) errors.push(`счётчик показывает «${badgeShown(dom)}», ожидалось «Сегодня: 1» (промах — сегодня, глава — завтра)`);
    if (b.getAttribute("href") !== "review.html") errors.push(`счётчик ведёт на ${b.getAttribute("href")}, ожидалось review.html`);
    if (!b.parentNode.classList.contains("right-buttons")) errors.push("счётчик стоит не в .right-buttons верхней панели");
    if (b.parentNode.querySelector("a") !== b) errors.push("счётчик должен идти первым среди кнопок справа — порядок остальных не меняется");
    if (dom.window.document.querySelectorAll(".right-buttons > *").length !== 2) errors.push("в .right-buttons должна прибавиться ровно одна кнопка");
  }
  // повторный sync ничего не заводит и не пишет
  const w6 = dom.window;
  const before = w6.localStorage.getItem("algoSRS");
  const again = w6.ALGO_SRS && w6.ALGO_SRS.sync(Date.now());
  if (!again || again.created.length !== 0 || w6.localStorage.getItem("algoSRS") !== before) errors.push("повторный sync() завёл карточки или переписал algoSRS");

  // нечего повторять сегодня — счётчика на экране нет (и он не мигает: его даже не создают)
  const quiet = await bootDom({ algoProgress: JSON.stringify({ "big-o.html": true }) }, page);
  if (badgeShown(quiet)) errors.push(`при N = 0 счётчик виден: «${badgeShown(quiet)}»`);
  // чистое хранилище: ничего не записано
  const empty = await bootDom({}, page);
  if (empty.window.localStorage.getItem("algoSRS") !== null) errors.push("на пустом хранилище sync() записал algoSRS");
  if (badgeShown(empty)) errors.push("на пустом хранилище виден счётчик");
  // нет верхней панели — счётчик под заголовком главы
  const bare = await bootDom(seed, "<main><h1>Глава</h1><p>текст</p></main>");
  const bb = badgeOf(bare);
  if (!bb || bb.previousElementSibling !== bare.window.document.querySelector("main h1")) errors.push("без панели mdBook счётчик не встал сразу под main h1");
  // нет ни панели, ни заголовка — страница не ломается
  const nowhere = await bootDom(seed, "<p>просто текст</p>");
  if (Object.keys(cards(nowhere)).length !== 2) errors.push("на странице без панели и заголовка карточки не заведены");
}

// --- 7. две вкладки: оценка в одной не стирает то, что другая записала в algoSRS ---
{
  const now = Date.now();
  const mk = (due, q) => ({ due, iv: 1, ease: 2.5, reps: 1, meta: { page: "big-o", q } });
  const page = MENU + '<main><h1>Повторение</h1><div class="algo-today"></div></main>';
  const dom = await newDom(
    { algoSRS: JSON.stringify({ "task:a#1": mk(now - 3 * DAY, "вопрос A"), "task:b#1": mk(now - 2 * DAY, "вопрос B") }) },
    [],
    page
  );
  const w = dom.window;
  const text = () => w.document.querySelector(".algo-today").textContent;
  if (!/вопрос A/.test(text()) || !/Сегодня:\s*2\b/.test(badgeShown(dom) || "")) errors.push(`две вкладки: старт — «${text().slice(0, 60)}», счётчик «${badgeShown(dom)}»`);

  // другая вкладка: B уходит в будущее, появляется C. Событие storage здесь не шлём — вкладка A о нём
  // не знает (закрыта в фоне, событие потеряно); оценка обязана читать хранилище заново.
  const other = cards(dom);
  other["task:b#1"].due = now + 10 * DAY;
  other["task:c#1"] = mk(now - 1 * DAY, "вопрос C");
  w.localStorage.setItem("algoSRS", JSON.stringify(other));
  const snapB = JSON.stringify(other["task:b#1"]);
  const snapC = JSON.stringify(other["task:c#1"]);

  click(dom, "Помню");
  const after = cards(dom);
  if (!after["task:a#1"] || after["task:a#1"].iv !== 3 || after["task:a#1"].reps !== 2) {
    errors.push(`две вкладки: A не оценена как «Помню»: ${JSON.stringify(after["task:a#1"])}`);
  }
  if (JSON.stringify(after["task:b#1"]) !== snapB) errors.push(`две вкладки: оценка затёрла B из другой вкладки: ${JSON.stringify(after["task:b#1"])}`);
  if (JSON.stringify(after["task:c#1"]) !== snapC) errors.push(`две вкладки: оценка стёрла C, заведённую в другой вкладке: ${JSON.stringify(after["task:c#1"])}`);
  if (!/вопрос C/.test(text())) errors.push(`две вкладки: после оценки виджет не показал C: «${text().slice(0, 80)}»`);
  if (!/Сегодня:\s*1\b/.test(badgeShown(dom) || "")) errors.push(`две вкладки: счётчик после оценки «${badgeShown(dom)}», ожидалось «Сегодня: 1»`);

  // событие storage из другой вкладки перерисовывает и виджет, и счётчик
  const moved = Object.assign(cards(dom), { "task:c#1": mk(now + 7 * DAY, "вопрос C") });
  w.localStorage.setItem("algoSRS", JSON.stringify(moved));
  w.dispatchEvent(new w.StorageEvent("storage", { key: "algoSRS" }));
  if (!/На сегодня всё/.test(text())) errors.push(`storage: виджет не перерисовался: «${text().slice(0, 80)}»`);
  if (badgeShown(dom)) errors.push(`storage: счётчик остался на экране: «${badgeShown(dom)}»`);
  // чужой ключ ничего не ломает
  w.dispatchEvent(new w.StorageEvent("storage", { key: "algoQuizBest" }));
  // «Забыл» с заметкой: форма не должна пропадать от события из другой вкладки
  const m2 = Object.assign(cards(dom), { "task:c#1": mk(now - DAY, "вопрос C") });
  w.localStorage.setItem("algoSRS", JSON.stringify(m2));
  w.dispatchEvent(new w.StorageEvent("storage", { key: "algoSRS" }));
  click(dom, "Забыл");
  const input = w.document.querySelector(".algo-today input");
  if (!input) errors.push("после «Забыл» нет поля заметки");
  else {
    input.value = "заметка из формы";
    const o2 = cards(dom);
    o2["task:d#1"] = mk(now - 9 * DAY, "вопрос D");
    w.localStorage.setItem("algoSRS", JSON.stringify(o2));
    w.dispatchEvent(new w.StorageEvent("storage", { key: "algoSRS" }));
    if (!w.document.querySelector(".algo-today input") || w.document.querySelector(".algo-today input").value !== "заметка из формы") {
      errors.push("storage во время ввода заметки стёр форму или введённый текст");
    }
    click(dom, "Сохранить и отложить");
    const fin = cards(dom);
    if (!fin["task:d#1"]) errors.push("«Забыл» с заметкой стёр карточку D из другой вкладки");
    if (!fin["task:c#1"] || fin["task:c#1"].note !== "заметка из формы" || fin["task:c#1"].iv !== 1) errors.push(`«Забыл» с заметкой записан неверно: ${JSON.stringify(fin["task:c#1"])}`);
  }
}

// --- 8. report(): четыре исхода ---
{
  const now = Date.now();
  const mk = (due) => ({ due, iv: 8, ease: 2.5, reps: 3, meta: { page: "big-o", q: "задача" } });
  const dom = await newDom({ algoSRS: JSON.stringify({ "task:due#1": mk(now - DAY), "task:later#1": mk(now + 5 * DAY) }) }, [], "<div></div>");
  const w = dom.window;
  const r = w.ALGO_SRS;
  if (!r || typeof r.report !== "function") {
    errors.push("ALGO_SRS.report не определён");
  } else {
    const events = [];
    w.document.addEventListener("algo-srs:change", (e) => events.push(e.detail && e.detail.ids));
    const store = () => w.localStorage.getItem("algoSRS");
    const status = (res, want, what) => { if (res.status !== want) errors.push(`report: ${what} — статус «${res.status}», ожидался «${want}»`); };

    const snap = store();
    status(r.report("task:nope#1", "good", now), "none", "карточки нет");
    status(r.report("task:due#1", "excellent", now), "none", "неизвестная оценка");
    if (store() !== snap || events.length) errors.push("report: none изменил algoSRS или послал событие");

    status(r.report("task:later#1", "good", now), "early", "срок не подошёл, «Помню»");
    status(r.report("task:later#1", "hard", now), "early", "срок не подошёл, «С трудом»");
    if (store() !== snap || events.length) errors.push("report: early изменил algoSRS или послал событие");

    // «Забыл» применяется даже до срока: промах нельзя оставить без последствий
    let res = r.report("task:later#1", "again", now);
    status(res, "graded", "срок не подошёл, «Забыл»");
    const l = cards(dom)["task:later#1"];
    if (res.iv !== 1 || !l || l.iv !== 1 || l.back !== 3 || l.reps !== 0 || l.due !== now + DAY) errors.push(`report: «Забыл» до срока записан неверно: ${JSON.stringify(res)} ${JSON.stringify(l)}`);
    if (events.length !== 1 || events[0].join() !== "task:later#1") errors.push(`report: событие algo-srs:change после «Забыл» — ${JSON.stringify(events)}`);

    res = r.report("task:due#1", "good", now);
    status(res, "graded", "срок подошёл");
    const d = cards(dom)["task:due#1"];
    if (res.iv !== 20 || !d || d.iv !== 20 || d.reps !== 4 || Math.abs(d.due - (now + 20 * DAY)) > 3 * DAY) errors.push(`report: «Помню» записан неверно: ${JSON.stringify(res)} ${JSON.stringify(d)}`);
    if (events.length !== 2) errors.push(`report: ожидалось 2 события, пришло ${events.length}`);

    // карточку завёл сам этот вызов (промах записан виджетом секунду назад) — оценивать нечего
    w.localStorage.setItem("algoChallengeMissed", JSON.stringify({ "big-o#9": { n: 1, page: "big-o", anchor: "task-9", q: "Новая" } }));
    res = r.report("task:big-o#9", "good", now);
    status(res, "created", "карточку завёл этот вызов");
    const n = cards(dom)["task:big-o#9"];
    if (!n || n.iv !== 0 || n.reps !== 0 || n.due !== now) errors.push(`report: созданная карточка тронута оценкой: ${JSON.stringify(n)}`);
    if (events.length !== 3) errors.push(`report: создание карточки без события (${events.length})`);
    status(r.report("task:big-o#9", "good", now), "graded", "второй вызов по уже заведённой карточке");
  }
}

// --- 9. карточки прежних версий не теряются и не меняются ---
{
  const now = Date.now();
  const old = {
    "ch:old.html": { due: now - DAY, iv: 8, ease: 2.5, reps: 3, meta: { href: "old.html" }, seen: now - 8 * DAY },
    "task:stuck#1": { due: now - DAY, iv: 1, ease: 1.3, reps: 3, meta: { page: "big-o", q: "застрявшая" } },
    "pkg:oldpkg": { due: now + 4 * DAY, iv: 3, ease: 2.6, reps: 2, meta: { pkg: "oldpkg" }, note: "перепутал границу" },
    "expl:greedy": { due: now - DAY, iv: 0, ease: 2.5, reps: 0, meta: { chapter: "greedy" } },
    "viz:foo": { due: now - 2 * DAY, iv: 1, ease: 2.3, reps: 0, meta: { page: "x.html", title: "t", line: 3, code: "if" } },
  };
  const seed = {
    algoSRS: JSON.stringify(old),
    algoProgress: JSON.stringify({ "x.html": true, "old.html": true }), // меток algoProgressAt нет
    algoPkgSolved: JSON.stringify({ oldpkg: now - 20 * DAY }),
  };
  const dom = await newDom(seed, [], "<div></div>");
  const got = cards(dom);
  for (const id of Object.keys(old)) {
    if (!got[id]) errors.push(`прежние данные: карточка ${id} пропала`);
    else if (JSON.stringify(got[id]) !== JSON.stringify(old[id])) errors.push(`прежние данные: sync() изменил ${id}: ${JSON.stringify(got[id])}`);
  }
  if (!got["ch:x.html"] || Math.abs(got["ch:x.html"].due - (Date.now() + DAY)) > 60 * 1000) errors.push("прежние данные: глава без метки algoProgressAt не получила срок «завтра»");
  if (Object.keys(got).length !== Object.keys(old).length + 1) errors.push(`прежние данные: карточек ${Object.keys(got).length}, ожидалось ${Object.keys(old).length + 1}`);

  const r = dom.window.ALGO_SRS;
  if (r) {
    // iv = 1 при повторах ≥ 2 (прежняя формула): оба «живых» ответа выводят из тупика
    const stuckHard = Object.assign({}, old["task:stuck#1"]);
    r.schedule(stuckHard, "hard", now);
    if (stuckHard.iv !== 2) errors.push(`прежние данные: «С трудом» на iv 1, ease 1.3, reps 3 → ${stuckHard.iv}, ожидалось 2`);
    const res = r.report("task:stuck#1", "good", now);
    if (res.status !== "graded" || res.iv !== 2) errors.push(`прежние данные: «Помню» на застрявшей карточке: ${JSON.stringify(res)}`);
    // карточка без back: «Забыл» берёт ступень из iv
    const res2 = r.report("ch:old.html", "again", now);
    const o = cards(dom)["ch:old.html"];
    if (res2.status !== "graded" || !o || o.back !== 3 || o.iv !== 1 || o.seen !== now) errors.push(`прежние данные: «Забыл» на карточке без back: ${JSON.stringify(o)}`);
    // «Помню» после «Забыл» на карточке без back возвращает на ступень назад
    const res3 = r.report("ch:old.html", "good", now + 2 * DAY); // после «Забыл» срок — завтра, поэтому через два дня
    if (res3.iv !== 3) errors.push(`прежние данные: «Помню» после «Забыл» на карточке без back: ${JSON.stringify(res3)}`);
    // остальные карточки при этом на месте
    for (const id of ["pkg:oldpkg", "expl:greedy", "viz:foo"]) {
      if (JSON.stringify(cards(dom)[id]) !== JSON.stringify(old[id])) errors.push(`прежние данные: оценка соседней карточки изменила ${id}`);
    }
  }
}

// --- 10. sync() на каждой странице не должен тормозить загрузку ---
{
  const now = Date.now();
  const kinds = ["ch:c", "pkg:p", "task:t#", "viz:v", "mix:m.", "quiz:q", "cx:x.", "expl:e"];
  const big = {};
  for (let i = 0; i < 150; i++) {
    big[kinds[i % kinds.length] + i] = { due: now + ((i % 9) - 3) * DAY, iv: i % 30, ease: 2.5, reps: i % 5, meta: { page: "big-o", q: "задача " + i, href: "c" + i + ".html" }, seen: now - i * DAY };
  }
  const progress = {};
  for (let i = 0; i < 60; i++) progress["ch" + i + ".html"] = true;
  const dom = await newDom({ algoSRS: JSON.stringify(big), algoProgress: JSON.stringify(progress), algoPkgSolved: JSON.stringify({ a: now, b: now }) }, [], "<div></div>");
  const r = dom.window.ALGO_SRS;
  if (r) {
    r.sync(now); // прогрев и заведение недостающих
    const N = 200;
    const t0 = process.hrtime.bigint();
    for (let i = 0; i < N; i++) r.sync(now);
    const ms = Number(process.hrtime.bigint() - t0) / 1e6 / N;
    console.log(`   sync() на ${Object.keys(cards(dom)).length} карточках: ${ms.toFixed(2)} мс за вызов (jsdom, ${N} вызовов)`);
    if (ms > 25) errors.push(`sync() на 150 карточках занял ${ms.toFixed(1)} мс за вызов — на каждой странице это заметно`);
  }
}

if (errors.length) {
  console.error(`❌ srs-check: ${errors.length} проблем(ы):`);
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
console.log(
  "✅ srs-check: карточки заводятся на любой странице с опорой на метку события, счётчик «Сегодня: N» в панели, " +
    "интервалы 1→3→8→22→61, «забыл» — шаг назад (22 → 1 → 8 → 21) с заметкой, порядок оценок и сроков при сдвиге " +
    "держится во всех достижимых состояниях (в том числе прежней формулы), две вкладки не затирают друг друга, " +
    "report() — четыре исхода, прежние карточки не меняются, ease держится в [1.3, 2.8]"
);
}

main().catch(function (e) {
  console.error("❌ srs-check: неожиданная ошибка:", e);
  process.exit(1);
});
