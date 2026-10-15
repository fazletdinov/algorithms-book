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
//      algoPkgSolved, algoExplainDone), промах — с начала завтрашних суток, и оценка в тот же день — early
//      (по каждому источнику: task:, quiz:, mix:, cx:, viz:; «Не сошлось» — сутки от отметки);
//   2) «Помню» даёт интервалы 1 → 3 → растущий геометрически, а не фиксированный;
//   3) «Забыл» — шаг назад по лестнице: завтра, потом предыдущая ступень (22 → 1 → 8 → 21),
//      а не сброс в начало; «С трудом» растит слабо, но растит; перебор достижимых состояний
//      (в том числе карточек прежней формулы) подтверждает порядок «Забыл» ≤ «С трудом» ≤
//      «Помню», в сроках тоже при одном и том же сдвиге на три оценки; повтор любой оценки не оставляет карточку
//      на месте; «Забыл» и «Помню» не дальше, чем было до «Забыл»;
//   4) ease не убегает за границы [1.3, 2.8] даже после серии одинаковых оценок;
//   5) заметка «в чём была ошибка» сохраняется и показывается при следующем повторе;
//   6) сдвиг срока от 8 дней управляем подставным генератором, номинальный iv от него не зависит;
//   7) две вкладки: оценка в одной не затирает то, что другая записала в algoSRS;
//   8) report(): четыре исхода; счётчик «Сегодня: N» в верхней панели каждой страницы;
//   9) карточки прежних версий (без back, iv = 1 при reps ≥ 2, главы без меток) не теряются;
//  10) «С трудом» у карточки с back — ступень НИЖЕ back (на шаг и на два шага порядок оценок держится);
//  11) «Забыл» до срока — один раз на падение, дальше early; отказ записи — статус unsaved, без события;
//  12) повреждённый algoSRS (пять видов значений) не перезаписывается, карточка-мусор пропускается;
//  13) ни разу не оценённая карточка главы без отметки в трекере при sync уходит;
//  14) порция дня: не больше 12 карточек и двух с кодом, порядок «iv, затем срок» у лёгких и «самые
//      просроченные» у карточек с кодом (за 120 дней на долге первого дня пакет не голодает), тяжёлые последними,
//      отложенные («Позже») в конце; границы — перебором случайных наборов с фиксированным зерном;
//      мусор в algoToday и смена суток начинают день заново; счётчик дня растёт только по оценке
//      карточки с вышедшим сроком; две вкладки не теряют ни done, ни later;
//  15) «Позже» не меняет карточку и не запирает очередь (единственная, тяжёлая), фокус — на следующей;
//  16) карточки quiz: и cx: — вопросы: ответ и оценки только после «Показать ответ»; карточка mix: — условие
//      другой задачи того же шаблона (не meta.last), глава из банка (прежняя meta.chapter "big-o" у bigo.* —
//      монотонный стек), ответ с альтернативами, оценка пишет meta.last; карточка ch: главы со строками
//      «Что унести» (takeaways.js) — три вопроса, ответ — те же строки и ссылка, оценки после ответа; без
//      строк или без реестра — прежний вопрос; глава с «объясни сам» не получает ch:, только если её expl:
//      уже есть (или заводится тем же sync); прежние ch: побайтно те же;
//  17) оставленная вкладка: возврат, storage и algo-srs:change перестраивают порцию, не закрывая
//      раскрытый ответ и форму заметки; промах на этой же странице заводит карточку сразу, но на завтра;
//  18) числа предела в текстах книги совпадают с константами движка;
//  19) карточка пакета — одна функция банка (свои тесты, без соседей) с чистого листа в виджете runner'а;
//      оценку ставят события ЭТОГО виджета: зелёный без подсказок — «Помню», с подсказкой — «С трудом»,
//      «Сдаюсь» — «Забыл» (на любой странице; нет карточки — заводится на завтра); красный прогон, чужой
//      узел и прогон списанного эталона ничего не меняют; функции идут по кругу, после «Забыл» — та же;
//      годной функции нет — пакет целиком; черновик стирается после оценки; без runner'а «Позже» переносит
//      карточку на начало завтра.
// Если jsdom не найден — мягкий пропуск (exit 0), как в остальных смоуках.
"use strict";
// Пояс не UTC — до любого Date: день порции — МЕСТНАЯ дата, а раннер CI живёт в UTC, где местная полночь
// совпадает с полночью UTC и путаница «день по UTC» не видна. Node перечитывает TZ при присваивании;
// все времена ниже строятся местным конструктором Date или от Date.now(), так что от пояса не зависят.
process.env.TZ = "Asia/Tokyo";
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
const challengeJs = fs.readFileSync(path.join(root, "assets", "challenge.js"), "utf8");
const quizJs = fs.readFileSync(path.join(root, "assets", "quiz.js"), "utf8");
const takeawaysJs = fs.readFileSync(path.join(root, "assets", "takeaways.js"), "utf8");
const { mulberry32 } = require(path.join(root, "assets", "infra-core.js"));

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

// --- порция дня (разделы 11–19) ---
const HOUR = 60 * 60 * 1000;
// Полдень дня без перевода часов: граница суток не должна зависеть от того, когда запущена проверка.
const NOON = new Date(2026, 0, 14, 12, 0, 0).getTime();
// Управляемые часы: скрипт стоит раньше srs.js; и движок, и виджет читают время через Date.now().
const CLOCK = (t) => `window.__now = ${t}; Date.now = function () { return window.__now; };`;
const PAGE = MENU + '<main><h1>Повторение</h1><div class="algo-today"></div></main>';
// Местная дата — ГГГГ-ММ-ДД, как день в algoToday.
const dayKey = (t) => {
  const d = new Date(t), two = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;
};
const todayRec = (dom) => JSON.parse(dom.window.localStorage.getItem("algoToday") || "null");
const light = (name, iv, due) => ({ due, iv, ease: 2.5, reps: 2, meta: { page: "big-o", q: "задача " + name }, seen: due - iv * DAY });
const heavy = (name, due) => ({ due, iv: 0, ease: 2.5, reps: 0, meta: { pkg: name } });
// Начало завтрашних местных суток — срок карточки, которую заводит промах (srs.js, missDue).
const nextDay = (t) => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime(); };
// Карточка, которую промах завёл раньше: срок due уже вышел, оценок не было. Проверки вида карточек кладут
// её в algoSRS сами — промах, записанный сегодня, заводит карточку только на завтра.
const missCard = (meta, due) => ({ due, iv: 0, ease: 2.5, reps: 0, meta });
// Долг: 20 лёгких и 3 с кодом, все просрочены. У карточек с кодом самый малый iv и самый старый срок —
// без предела они шли бы первыми тремя. В порции — две самые просроченные, последними и по сроку.
const debt = (now) => {
  const c = {};
  for (let i = 0; i < 20; i++) c["task:t#" + i] = light(i, (i % 4) + 1, now - (i + 1) * HOUR);
  for (let i = 0; i < 3; i++) c["pkg:p" + i] = heavy("p" + i, now - (30 + i) * DAY);
  return c;
};
const DEBT_PORTION = ["task:t#16", "task:t#12", "task:t#8", "task:t#4", "task:t#0", "task:t#17", "task:t#13", "task:t#9", "task:t#5", "task:t#1", "pkg:p2", "pkg:p1"];
// вкладка вернулась на экран
const comeBack = (w) => {
  Object.defineProperty(w.document, "hidden", { value: false, configurable: true });
  w.document.dispatchEvent(new w.Event("visibilitychange"));
};

function click(dom, label) {
  const btn = [...dom.window.document.querySelectorAll("button")].find((b) => b.textContent === label);
  if (!btn) {
    errors.push(`не нашлась кнопка «${label}»`);
    return false;
  }
  btn.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
  return true;
}

// Карточка пакета решается в виджете «Реши прямо здесь» (runner.js), и оценку ставят его события
// (algo-runner:result / :giveup / :state) — сервера в смоуке нет, они подаются руками на узел виджета.
// ALGO_RUNNER_INIT подменён: карточка обязана позвать его, когда узел уже в документе (иначе runner.js
// его не найдёт), — заглушка запоминает, сколько узлов карточки она увидела.
const BANK = (() => { const s = {}; new Function("window", problemsJs)(s); return s.ALGO_PROBLEMS; })();
const RUNNER_STUB = "window.__inits = 0; window.__initSaw = 0; window.ALGO_RUNNER_INIT = function () { window.__inits++; " +
  "window.__initSaw = document.querySelectorAll('.algo-today .algo-runner').length; };";
const runnerOf = (dom) => dom.window.document.querySelector(".algo-today .algo-runner");
function fire(dom, type, detail, node) {
  const n = node || runnerOf(dom);
  if (!n) {
    errors.push(`нет виджета runner на карточке — событие ${type} подать некуда`);
    return;
  }
  n.dispatchEvent(new dom.window.CustomEvent(type, { bubbles: true, detail }));
}
const run = (pkg, fn, extra) => Object.assign({ pkg, ok: true, filtered: !!fn, passed: 1, failed: 0, noTests: false, stage: "tests",
  fn: fn || "", unit: fn ? "func" : "pkg", draft: "review", hints: 0, gaveUp: false }, extra || {});
// зелёный прогон того, что гоняет виджет карточки, и «Дальше» — так карточка пакета получает «Помню»
function greenPkg(dom) {
  const n = runnerOf(dom);
  fire(dom, "algo-runner:result", run(n ? n.getAttribute("data-pkg") : "", n ? n.getAttribute("data-func") || "" : ""));
  click(dom, "Дальше →");
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
  if (c["task:big-o#2"] && c["task:big-o#2"].due !== nextDay(now)) {
    errors.push(`карточка промаха заведена на ${c["task:big-o#2"].due}, ожидалось начало завтрашних суток ${nextDay(now)}`);
  }
  const text = dom.window.document.querySelector(".algo-today").textContent;
  if (!/На сегодня всё/.test(text)) errors.push(`в день промаха очередь не пуста: «${text.slice(0, 80)}»`);
  // с начала завтрашних суток промах в очереди, а глава и пакет (сутки от события) — ещё нет
  const next = await newDom({ algoSRS: dom.window.localStorage.getItem("algoSRS") }, [CLOCK(nextDay(now))]);
  const nextText = next.window.document.querySelector(".algo-today").textContent;
  if (!/К повторению сегодня: 1/.test(nextText) || !/append/.test(nextText)) {
    errors.push(`с начала завтрашних суток в очереди не один промах: «${nextText.slice(0, 80)}»`);
  }
}

// --- 1b. промахи смешанной тренировки и собеседования: шаблон и сложность ---
// Два разных вида карточек по одной и той же задаче: узнать приём (mix:) и
// оценить стоимость своего кода (cx:) — разные умения, и оба встают в очередь с начала завтрашних суток.
{
  const now = Date.now();
  const MIX_META = { n: 1, chapter: "top-k-elements", pkg: "topk", fn: "KthLargest" };
  const CX_META = { n: 1, chapter: "dynamic-programming", pkg: "dp", fn: "CoinChange" };
  const dom = await newDom({
    algoMixedMissed: JSON.stringify({ "topk.KthLargest": MIX_META }),
    algoMockCxMissed: JSON.stringify({ "dp.CoinChange": CX_META }),
  });
  const c = cards(dom);
  for (const id of ["mix:topk.KthLargest", "cx:dp.CoinChange"]) {
    if (!c[id]) errors.push(`не заведена карточка ${id}: ${JSON.stringify(Object.keys(c))}`);
    else if (c[id].due !== nextDay(now)) errors.push(`карточка ${id} заведена на ${c[id].due}, ожидалось начало завтрашних суток`);
  }
  const text = dom.window.document.querySelector(".algo-today").textContent;
  if (!/На сегодня всё/.test(text)) errors.push(`в день промахов очередь не пуста: «${text.slice(0, 80)}»`);

  // Виджет показывает одну текущую карточку, а не список, — поэтому вид карточки
  // cx: проверяем там, где она единственная (заведена промахом раньше, срок вышел).
  const solo = await newDom({
    algoMockCxMissed: JSON.stringify({ "dp.CoinChange": CX_META }),
    algoSRS: JSON.stringify({ "cx:dp.CoinChange": missCard(CX_META, now - HOUR) }),
  });
  const soloText = solo.window.document.querySelector(".algo-today").textContent;
  if (!/Собеседование: сложность/.test(soloText) || !/dp\.CoinChange/.test(soloText)) {
    errors.push(`карточка промаха по сложности отрисована без своего вида или без задачи: «${soloText.slice(0, 120)}»`);
  }

  // Карточка mix: — вопрос. Раньше её заголовком было «topk.KthLargest — шаблон
  // выбран неверно»: имя пакета и есть ответ, и «Помню» ничего не проверяло.
  const mix = await newDom({
    algoMixedMissed: JSON.stringify({ "topk.KthLargest": MIX_META }),
    algoSRS: JSON.stringify({ "mix:topk.KthLargest": missCard(MIX_META, now - HOUR) }),
  }, [problemsJs]);
  const w = mix.window, box = w.document.querySelector(".algo-today");
  // Условие — ДРУГОЙ задачи того же шаблона (у Top-K их несколько): промах уже видел свою, узнать приём
  // надо на новой формулировке (подробнее — раздел 11g).
  const mixText = box.textContent;
  const sameChapter = w.ALGO_PROBLEMS.filter((p) => p.c === "top-k-elements");
  const shownMix = sameChapter.find((p) => mixText.includes(p.s.split("\n")[0]));
  if (!shownMix || (shownMix.p === "topk" && shownMix.f === "KthLargest")) {
    errors.push(`карточка mix: показывает не другую задачу Top-K из банка: «${mixText.slice(0, 160)}»`);
  }
  if (/topk|KthLargest|Top-K|top-k/i.test(mixText)) {
    errors.push(`карточка mix: до ответа выдаёт пакет, функцию или главу: «${mixText.slice(0, 200)}»`);
  }
  const grades = box.querySelector(".algo-today__grades");
  if (!grades || grades.style.display !== "none") errors.push("карточка mix: оценки доступны до «Показать ответ»");
  // Промах предсказания в виджете (режим 🎯) — карточка viz: с начала завтрашних суток, со строкой
  // развилки и ссылкой на страницу виджета.
  const VIZ_META = { n: 2, page: "sliding-window.html", title: "Максимум окна размера 3", line: 9, code: "if windowSum > maxSum {" };
  const vizNew = await newDom({ algoVizMissed: JSON.stringify({ "sliding-window-fixed": VIZ_META }) });
  const vc = cards(vizNew)["viz:sliding-window-fixed"];
  if (!vc) errors.push("промах предсказания не завёл карточку viz:");
  else if (vc.due !== nextDay(now)) errors.push("карточка viz: заведена не на начало завтрашних суток");
  const viz = await newDom({
    algoVizMissed: JSON.stringify({ "sliding-window-fixed": VIZ_META }),
    algoSRS: JSON.stringify({ "viz:sliding-window-fixed": missCard(VIZ_META, now - HOUR) }),
  });
  const vizText = viz.window.document.querySelector(".algo-today").textContent;
  const vizLink = viz.window.document.querySelector(".algo-today__title");
  if (!/Предсказание шага/.test(vizText) || !/строка 9: if windowSum > maxSum/.test(vizText) || !vizLink || vizLink.getAttribute("href") !== "sliding-window.html?viz=sliding-window-fixed") {
    errors.push(`карточка viz: без вида, развилки или ссылки на страницу: «${vizText.slice(0, 160)}»`);
  }
  // с якорем (algo-viz.js пишет его с промахом) ссылка ведёт прямо к виджету; без якоря — к первому виджету типа (выше)
  const VIZ_A = { n: 1, page: "two-pointers.html", anchor: "viz-3", title: "Два указателя", line: 4, code: "if s == target {" };
  const vizA = await newDom({
    algoVizMissed: JSON.stringify({ "two-pointers-sum": VIZ_A }),
    algoSRS: JSON.stringify({ "viz:two-pointers-sum": missCard(VIZ_A, now - HOUR) }),
  });
  const aLink = vizA.window.document.querySelector(".algo-today__title");
  // тип в ссылке страхует позиционный якорь (algo-viz.js сверяет его с data-viz цели)
  if (!aLink || aLink.getAttribute("href") !== "two-pointers.html?viz=two-pointers-sum#viz-3") errors.push(`карточка viz: с якорем ведёт на ${aLink && aLink.getAttribute("href")}, ожидалось two-pointers.html?viz=two-pointers-sum#viz-3`);
  // виджет переехал (VIZ_MOVED в srs.js): старая карточка ведёт на новую страницу и без чужого якоря,
  // а карточка, записанная уже на новой странице, остаётся как есть
  for (const [type, page, anchor, want] of [
    ["heap-sort", "sorting.html", "viz-4", "heap-structure.html?viz=heap-sort"],
    ["heap-sort", "heap-structure.html", "viz-4", "heap-structure.html?viz=heap-sort#viz-4"],
    ["binary-search-first", "modified-binary-search.html", "viz-2", "go-stdlib-structures.html?viz=binary-search-first"],
    ["hash-ring", "hash-table-structure.html", "viz-4", "consistent-hashing.html?viz=hash-ring"],
    ["hash-ring", "consistent-hashing.html", "viz-1", "consistent-hashing.html?viz=hash-ring#viz-1"],
  ]) {
    const VIZ_M = { n: 1, page, anchor, title: type, line: 5, code: "if x {" };
    const vizM = await newDom({
      algoVizMissed: JSON.stringify({ [type]: VIZ_M }),
      algoSRS: JSON.stringify({ ["viz:" + type]: missCard(VIZ_M, now - HOUR) }),
    });
    const mLink = vizM.window.document.querySelector(".algo-today__title");
    if (!mLink || mLink.getAttribute("href") !== want) errors.push(`карточка viz:${type} со страницы ${page} ведёт на ${mLink && mLink.getAttribute("href")}, ожидалось ${want}`);
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
  // seen есть: карточка главы без seen и без отметки в трекере при sync уходит (см. раздел 8g)
  const base = { due: now - DAY, iv: 20, ease: 2.5, reps: 5, meta: { href: "sliding-window.html" }, seen: now - 20 * DAY };

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
    ["«С трудом» с back — на ступень ниже back (22 → завтра → 3 → 4)", { iv: 22, ease: 2.7, reps: 4 }, ["again", "hard", "hard"], "1 (back 8), 3, 4"],
    ["61 день: Забыл, С трудом, Помню, Помню", { iv: 61, ease: 2.75, reps: 5 }, ["again", "hard", "good", "good"], "1 (back 22), 9, 23, 60"],
    ["61 день: Забыл, Забыл, Помню ×3 (хуже, чем «С трудом»)", { iv: 61, ease: 2.75, reps: 5 }, ["again", "again", "good", "good", "good"], "1 (back 22), 1 (back 9), 9, 22, 55"],
    ["back ≤ 3: «С трудом» — день, затем 2", { iv: 3, ease: 2.6, reps: 2 }, ["again", "hard", "hard"], "1 (back 1), 1, 2"],
    ["back 4 при высоком ease: «С трудом» не ниже пола ступени", { iv: 10, ease: 2.55, reps: 3 }, ["again", "hard"], "1 (back 4), 3"],
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
// не убывает от iv при любом c ∈ [−0.125, 0.125]. При независимых бросках для разных оценок
// порядок по срокам не держится: «С трудом» может лечь позже возможного «Помню» (замер: до 17 дней
// при iv ≤ 100; только при ease ≤ 1.5 и iv ≥ 7 и противоположных сдвигах) — это не проверяется и не обещается.
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
  const bad = { order: [], dueOrder: [], backStep: [], twoStep: [], hardBack: [], repeat: [], growth: [], shape: [], jitter: [] };
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
        if (c.iv < 8 ? off !== 0 : off > Math.round(0.125 * c.iv)) note("jitter", st, `iv ${c.iv}, срок через ${c.due / DAY}`);
      }
    }
    // «Забыл», затем «Помню» возвращает не дальше, чем карточка стояла до «Забыл»
    if (stand(st) >= 1) {
      const back = step(again, "good");
      if (back.iv > stand(st)) note("backStep", st, `«Забыл» → «Помню» дало ${back.iv} при ${stand(st)} до «Забыл»`);
    }
    // Карточка с back (упала и ещё не вернулась): «С трудом» ставит ступень НИЖЕ back тем же
    // правилом шага назад, что «Забыл», и снимает back; на два шага «Забыл → Помню» ≤
    // «С трудом → Помню» ≤ «Помню → Помню» — слабая оценка не откладывает дальше сильной.
    if (st.back != null) {
      const below = st.back <= 3 ? 1 : Math.max(3, Math.round(st.back / st.ease));
      if (hard.iv !== below || hard.back != null) note("hardBack", st, `«С трудом» → iv ${hard.iv}${hard.back != null ? ", back " + hard.back : ""}, ожидалось ${below} без back`);
      const ag = step(again, "good"), hg = step(hard, "good"), gg = step(good, "good");
      if (!(ag.iv <= hg.iv && hg.iv <= gg.iv)) note("twoStep", st, `«Забыл → Помню» ${ag.iv}, «С трудом → Помню» ${hg.iv}, «Помню → Помню» ${gg.iv}`);
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
    twoStep: "на два шага из состояния с back нарушен порядок «Забыл → Помню» ≤ «С трудом → Помню» ≤ «Помню → Помню»",
    hardBack: "«С трудом» у карточки с back не ставит ступень ниже back",
    repeat: "повтор той же оценки оставляет карточку на месте",
    growth: "оценка не растит интервал там, где должна",
    shape: "недопустимое состояние карточки",
    jitter: "сдвиг срока вышел за round(12,5 % iv) или появился до 8 дней",
  };
  for (const k of Object.keys(bad)) {
    if (bad[k].n) errors.push(`${labels[k]} в ${bad[k].n} из ${queue.length} проверок, например: ${bad[k].join("; ")}`);
  }
  if (queue.length < 2000) errors.push(`перебор состояний расписания обошёл только ${queue.length} — ожидалось больше 2000`);
  console.log(`   перебор расписания: ${queue.length} состояний, ${queue.filter((s) => s.back != null).length} из них с back (интервал до ${LIMIT} дней, ${starts.length} стартов)`);

  // «Забыл», «С трудом», «С трудом» с 10 дней (back 4): ступень ниже back — 3 (пол LADDER_LOW), затем +20 % не меньше дня — 4;
  // карточка не стоит на месте и не идёт заново с 1, 3, 8
  const forgot = step({ iv: 10, ease: 2.5, reps: 3 }, "again");
  const hard1 = step(forgot, "hard");
  const hard2 = step(hard1, "hard");
  const got = [forgot.iv, hard1.iv, hard2.iv].join(", ");
  if (got !== "1, 3, 4") errors.push(`«Забыл», «С трудом», «С трудом» с 10 дней дали интервалы ${got} вместо 1, 3, 4`);
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
  // вчерашний промах — его карточка уже в сроке; сегодняшний — заводится на завтра; глава — через сутки
  const OLD = { n: 2, page: "big-o", anchor: "task-2", q: "Сколько копий сделает append?" };
  const seed = {
    algoProgress: JSON.stringify({ "sliding-window.html": true, "big-o.html": false }),
    algoChallengeMissed: JSON.stringify({ "big-o#2": OLD, "big-o#3": { n: 1, page: "big-o", anchor: "task-3", q: "Сегодняшний промах" } }),
    algoSRS: JSON.stringify({ "task:big-o#2": missCard({ page: OLD.page, anchor: OLD.anchor, q: OLD.q }, Date.now() - 20 * HOUR) }),
  };
  const page = MENU + "<main><h1>Скользящее окно</h1><p>текст главы</p></main>";
  const dom = await bootDom(seed, page);
  const ids = Object.keys(cards(dom)).sort();
  if (JSON.stringify(ids) !== JSON.stringify(["ch:sliding-window.html", "task:big-o#2", "task:big-o#3"])) {
    errors.push(`на странице главы без виджета заведены ${JSON.stringify(ids)}, ожидались глава и два промаха`);
  }
  const b = badgeOf(dom);
  if (!b) errors.push("на странице главы нет счётчика «Сегодня: N»");
  else {
    if (!/Сегодня:\s*1\b/.test(badgeShown(dom) || "")) errors.push(`счётчик показывает «${badgeShown(dom)}», ожидалось «Сегодня: 1» (вчерашний промах — сегодня, сегодняшний и глава — завтра)`);
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
  if (Object.keys(cards(nowhere)).length !== 3) errors.push("на странице без панели и заголовка карточки не заведены");
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
  // чужой ключ перерисовку не вызывает: состояние изменено тихо, и экран остаётся прежним
  // (с «algoSRS» тот же сценарий ниже перерисовывает)
  const quiet = Object.assign(cards(dom), { "task:c#1": mk(now - 2 * DAY, "вопрос C") });
  w.localStorage.setItem("algoSRS", JSON.stringify(quiet));
  w.dispatchEvent(new w.StorageEvent("storage", { key: "algoQuizBest" }));
  if (!/На сегодня всё/.test(text()) || badgeShown(dom)) errors.push("storage по чужому ключу перерисовал виджет или счётчик");
  w.dispatchEvent(new w.StorageEvent("storage", { key: "algoSRS" }));
  if (!/вопрос C/.test(text())) errors.push("storage по ключу algoSRS не перерисовал виджет");
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
    if (!n || n.iv !== 0 || n.reps !== 0 || n.due !== nextDay(now)) errors.push(`report: созданная карточка тронута оценкой или срок не начало завтра: ${JSON.stringify(n)}`);
    if (events.length !== 3) errors.push(`report: создание карточки без события (${events.length})`);
    // в тот же день срок не вышел — early; с начала завтрашних суток — оценка
    status(r.report("task:big-o#9", "good", now), "early", "второй вызов по только что заведённой карточке в тот же день");
    status(r.report("task:big-o#9", "good", nextDay(now)), "graded", "вызов по заведённой карточке назавтра");
  }
}

// --- 8a. карточка от промаха — не раньше завтра, по каждому источнику ---
// Срок «сейчас» давал повтор в той же сессии через секунды, и «Помню» проверяло кратковременную память.
// Теперь: промах → срок = начало завтрашних местных суток; любая оценка в тот же день — early (iv, счёт дня
// и algoSRS не меняются); назавтра — обычная оценка. Карточки, заведённые прежде со сроком «сейчас», sync не трогает.
{
  const now = NOON, tomorrow = nextDay(NOON);
  const sources = [
    ["task:big-o#5", "algoChallengeMissed", "big-o#5", { n: 1, page: "big-o", anchor: "task-5", q: "задача" }],
    ["quiz:Вопрос?", "algoQuizMissed", "Вопрос?", { n: 1, pattern: "P", href: "x.html", q: "Вопрос?" }],
    ["mix:m.F", "algoMixedMissed", "m.F", { n: 1, chapter: "c", pkg: "m", fn: "F" }],
    ["cx:m.G", "algoMockCxMissed", "m.G", { n: 1, chapter: "c", pkg: "m", fn: "G" }],
    ["viz:t", "algoVizMissed", "t", { n: 1, page: "x.html", title: "t", line: 1, code: "if" }],
  ];
  for (const [id, key, k, meta] of sources) {
    const dom = await newDom({ [key]: JSON.stringify({ [k]: meta }) }, [CLOCK(now)], "<div></div>");
    const w = dom.window, r = w.ALGO_SRS;
    if (!r) continue;
    const c0 = cards(dom)[id];
    if (!c0 || c0.due !== tomorrow || c0.iv !== 0) { errors.push(`${id}: промах завёл ${JSON.stringify(c0)}, ожидался срок ${tomorrow} (начало завтра), iv 0`); continue; }
    const snap = w.localStorage.getItem("algoSRS");
    for (const [g, at] of [["good", now + HOUR], ["hard", now + 2 * HOUR], ["again", now + 3 * HOUR], ["good", tomorrow - 1]]) {
      const res = r.report(id, g, at);
      if (res.status !== "early") errors.push(`${id}: «${g}» в день промаха — статус ${res.status}, ожидался early`);
    }
    if (w.localStorage.getItem("algoSRS") !== snap) errors.push(`${id}: оценки в день промаха изменили карточку: ${JSON.stringify(cards(dom)[id])}`);
    if (w.localStorage.getItem("algoToday") !== null) errors.push(`${id}: оценки в день промаха заняли место в порции`);
    if (r.today(now).ids.indexOf(id) >= 0) errors.push(`${id}: карточка промаха в сегодняшней порции`);
    if (r.today(tomorrow).ids.indexOf(id) < 0) errors.push(`${id}: с начала завтрашних суток карточки промаха нет в порции`);
    const next = r.report(id, "good", tomorrow + HOUR);
    const c1 = cards(dom)[id];
    if (next.status !== "graded" || c1.iv !== 1 || c1.reps !== 1 || (todayRec(dom) || {}).done !== 1) errors.push(`${id}: назавтра «Помню» — ${next.status}, карточка ${JSON.stringify(c1)}, счёт дня ${JSON.stringify(todayRec(dom))}`);
    w.close();
  }
  // карточка, заведённая прежней версией со сроком «сейчас», не переносится: sync её не трогает, оценка — как раньше
  const oldCard = missCard({ n: 1, pattern: "P", href: "x.html", q: "Вопрос?" }, now - 2 * HOUR);
  const old = await newDom({ algoQuizMissed: JSON.stringify({ "Вопрос?": oldCard.meta }), algoSRS: JSON.stringify({ "quiz:Вопрос?": oldCard }) }, [CLOCK(now)], "<div></div>");
  if (JSON.stringify(cards(old)["quiz:Вопрос?"]) !== JSON.stringify(oldCard)) errors.push(`прежняя карточка промаха перенесена sync: ${JSON.stringify(cards(old)["quiz:Вопрос?"])}`);
  if (old.window.ALGO_SRS && old.window.ALGO_SRS.report("quiz:Вопрос?", "good", now).status !== "graded") errors.push("прежняя карточка промаха со сроком «сейчас» не оценивается в срок");
  old.window.close();
  // «Не сошлось» в «объясни сам» заводит карточку уже оценённой «Забыл»: срок — сутки от отметки, не раньше завтра
  const ex = await newDom({ algoExplainDone: JSON.stringify({ greedy: { ts: now, grade: "again" } }) }, [CLOCK(now)], "<div></div>");
  const ec = cards(ex)["expl:greedy"];
  if (!ec || ec.due !== now + DAY || ec.due < tomorrow || ec.iv !== 1) errors.push(`«Не сошлось» в «объясни сам»: ${JSON.stringify(ec)}, ожидался срок через сутки (не раньше завтра), iv 1`);
  if (ex.window.ALGO_SRS && ex.window.ALGO_SRS.report("expl:greedy", "good", now + HOUR).status !== "early") errors.push("«Сошлось» в день «Не сошлось» должно отвечать early");
  ex.window.close();
}

// --- 8b. «Забыл» до срока — один раз на падение ---
// Две неудачи подряд в одном заходе — обычное дело (Task 5/6 зовут report на каждый промах);
// пять вызовов не должны ронять карточку на пять ступеней.
{
  const now = Date.now();
  const mk = (extra) => Object.assign({ due: now + 5 * DAY, iv: 61, ease: 2.75, reps: 5, meta: { page: "big-o", q: "задача" } }, extra);
  const dom = await newDom({ algoSRS: JSON.stringify({ "task:a#1": mk(), "task:new#1": mk({ iv: 0, ease: 2.5, reps: 0, due: now + DAY }) }) }, [], "<div></div>");
  const r = dom.window.ALGO_SRS;
  if (r) {
    const statuses = [r.report("task:a#1", "again", now).status];
    const afterFirst = JSON.stringify(cards(dom)["task:a#1"]);
    for (let i = 0; i < 4; i++) statuses.push(r.report("task:a#1", "again", now).status);
    if (statuses.join() !== "graded,early,early,early,early") errors.push(`пять «Забыл» до срока: статусы ${statuses.join()}, ожидалось одно graded и четыре early`);
    if (JSON.stringify(cards(dom)["task:a#1"]) !== afterFirst) errors.push(`четыре повторных «Забыл» изменили карточку: ${JSON.stringify(cards(dom)["task:a#1"])} вместо ${afterFirst}`);
    const first = JSON.parse(afterFirst);
    if (first.back !== 22 || first.iv !== 1 || first.ease !== 2.55) errors.push(`первое «Забыл» с 61 дня: ${afterFirst}, ожидалось back 22, iv 1, ease 2.55`);

    // заметка ко второй неудаче обновляется, расписание — нет
    const noted = r.report("task:a#1", "again", now, { note: "вторая попытка" });
    const c = cards(dom)["task:a#1"];
    if (noted.status !== "early" || c.note !== "вторая попытка") errors.push(`заметка к «Забыл» до срока: ${JSON.stringify(noted)} ${JSON.stringify(c)}`);
    delete c.note;
    if (JSON.stringify(c) !== afterFirst) errors.push(`заметка к повторному «Забыл» тронула расписание: ${JSON.stringify(c)}`);

    // на следующий день карточка в сроке: второй «Забыл» — вторая ступень вниз
    const next = r.report("task:a#1", "again", now + DAY);
    const d = cards(dom)["task:a#1"];
    if (next.status !== "graded" || d.back !== 9 || d.ease !== 2.35) errors.push(`«Забыл» на следующий день: ${JSON.stringify(next)} ${JSON.stringify(d)}, ожидалось graded, back 9, ease 2.35`);

    // ещё не оценённая карточка, которая ждёт срока, — тоже не «падение»
    const before = JSON.stringify(cards(dom)["task:new#1"]);
    const fresh = r.report("task:new#1", "again", now);
    if (fresh.status !== "early" || JSON.stringify(cards(dom)["task:new#1"]) !== before) errors.push(`«Забыл» по ещё не оценённой карточке до срока: ${JSON.stringify(fresh)}`);
    // «Помню» до срока по-прежнему ничего не меняет (после второго «Забыл» срок — через сутки)
    const early = r.report("task:a#1", "good", now + DAY + 1000);
    if (early.status !== "early") errors.push(`«Помню» до срока: ${JSON.stringify(early)}`);
  }
}

// --- 8c. неудачная запись не выдаётся за успех ---
{
  const now = Date.now();
  const card = { due: now - DAY, iv: 8, ease: 2.5, reps: 3, meta: { page: "big-o", q: "вопрос A" } };
  const page = MENU + '<main><h1>Повторение</h1><div class="algo-today"></div></main>';
  const dom = await newDom({ algoSRS: JSON.stringify({ "task:a#1": card }) }, [], page);
  const w = dom.window;
  const r = w.ALGO_SRS;
  if (r) {
    const events = [];
    w.document.addEventListener("algo-srs:change", (e) => events.push(e.detail.ids));
    const baseline = w.localStorage.getItem("algoSRS");
    const orig = w.Storage.prototype.setItem;
    w.Storage.prototype.setItem = function () { throw new Error("QuotaExceededError"); };
    try {
      // оценка существующей карточки: sync нечего заводить, отказывает сама запись оценки
      const res = r.report("task:a#1", "good", now);
      if (res.status !== "unsaved") errors.push(`report при отказе записи: ${JSON.stringify(res)}, ожидался статус unsaved`);
      // а новая карточка из промаха: отказывает запись в sync
      orig.call(w.localStorage, "algoChallengeMissed", JSON.stringify({ "big-o#9": { n: 1, page: "big-o", anchor: "task-9", q: "Новая" } }));
      const s = r.sync(now);
      if (s.created.length || s.cards["task:big-o#9"]) errors.push(`sync при отказе записи сообщил о заведённых карточках: ${JSON.stringify(s.created)}`);
      // report по карточке, которую завёл бы этот вызов, — не «карточки нет», а «не записано»
      const pending = r.report("task:big-o#9", "again", now);
      if (pending.status !== "unsaved") errors.push(`report по карточке, которую не удалось завести: ${JSON.stringify(pending)}, ожидался unsaved`);
      if (events.length) errors.push(`при отказе записи ушло событие algo-srs:change: ${JSON.stringify(events)}`);
      if (w.localStorage.getItem("algoSRS") !== baseline) errors.push("при отказе записи algoSRS изменился");
      click(dom, "Помню");
      const t = w.document.querySelector(".algo-today").textContent;
      if (!/Не удалось сохранить оценку: хранилище браузера недоступно или переполнено/.test(t)) errors.push(`виджет не сообщил об отказе записи: «${t.slice(0, 160)}»`);
      if (!/вопрос A/.test(t)) errors.push("после отказа записи карточка ушла из очереди");
      if (/Следующее повторение/.test(t)) errors.push("после отказа записи виджет пишет «Следующее повторение»");
    } finally {
      w.Storage.prototype.setItem = orig;
    }
    const ok = r.report("task:a#1", "good", now);
    if (ok.status !== "graded") errors.push(`report после восстановления записи: ${JSON.stringify(ok)}`);
  }
}

// --- 8d. повреждённый algoSRS не перезаписывается и не роняет страницу ---
{
  const now = Date.now();
  const miss = { "big-o#2": { n: 2, page: "big-o", anchor: "task-2", q: "Сколько копий сделает append?" } };
  const page = MENU + '<main><h1>Повторение</h1><div class="algo-today"></div></main>';
  for (const raw of ["not json{", "[]", "42", '"str"', "null"]) {
    const dom = await bootDom({ algoSRS: raw, algoChallengeMissed: JSON.stringify(miss) }, page);
    const w = dom.window, r = w.ALGO_SRS;
    const what = `algoSRS = ${raw}`;
    if (w.localStorage.getItem("algoSRS") !== raw) errors.push(`${what}: при загрузке значение перезаписано: ${w.localStorage.getItem("algoSRS")}`);
    if (badgeShown(dom)) errors.push(`${what}: виден счётчик «${badgeShown(dom)}»`);
    const t = w.document.querySelector(".algo-today").textContent;
    if (!/повреждены/.test(t) || !/Импорт/.test(t)) errors.push(`${what}: виджет не сообщил о повреждении и об импорте: «${t.slice(0, 120)}»`);
    if (!/удалите ключ algoSRS/.test(t) || !/заведутся заново/.test(t)) errors.push(`${what}: виджет не подсказал удалить ключ без файла: «${t.slice(0, 120)}»`);
    if (!r) continue;
    const s = r.sync(now);
    if (!s.damaged || s.created.length) errors.push(`${what}: sync → ${JSON.stringify({ damaged: s.damaged, created: s.created })}`);
    const res = r.report("task:big-o#2", "again", now);
    if (res.status !== "unsaved") errors.push(`${what}: report → ${JSON.stringify(res)}, ожидался unsaved`);
    if (!(r.damaged && r.damaged()) || Object.keys(r.load()).length || r.due(now).length) errors.push(`${what}: damaged()/load()/due() не пусты`);
    if (w.localStorage.getItem("algoSRS") !== raw) errors.push(`${what}: sync/report перезаписали значение: ${w.localStorage.getItem("algoSRS")}`);
    // то, что обещает сообщение виджета: без ключа карточки заводятся заново из отметок и промахов
    w.localStorage.setItem("algoProgress", JSON.stringify({ "x.html": true }));
    w.localStorage.removeItem("algoSRS");
    const again = r.sync(now);
    if (again.damaged || again.created.slice().sort().join() !== "ch:x.html,task:big-o#2") errors.push(`${what}: после удаления ключа sync завёл ${JSON.stringify(again.created)}, ожидались ch:x.html и task:big-o#2`);
  }

  // отдельная карточка-мусор в исправной карте пропускается, остальные работают
  const ok = { due: now - DAY, iv: 8, ease: 2.5, reps: 3, meta: { page: "big-o", q: "исправная" } };
  const dom = await bootDom(
    {
      algoSRS: JSON.stringify({ "task:junk#1": null, "task:junk#2": 5, "task:junk#3": "x", "task:junk#4": [], "task:ok#1": ok }),
      algoChallengeMissed: JSON.stringify({ "junk#1": { n: 1, page: "big-o", anchor: "task-1", q: "мусорная" } }),
    },
    page
  );
  const w = dom.window, r = w.ALGO_SRS;
  const t = w.document.querySelector(".algo-today").textContent;
  if (!/исправная/.test(t) || !/Сегодня:\s*1\b/.test(badgeShown(dom) || "")) errors.push(`карточка-мусор: виджет «${t.slice(0, 80)}», счётчик «${badgeShown(dom)}»`);
  if (r) {
    if (JSON.stringify(r.due(now)) !== JSON.stringify(["task:ok#1"])) errors.push(`карточка-мусор: due() = ${JSON.stringify(r.due(now))}`);
    if (JSON.stringify(Object.keys(r.load())) !== JSON.stringify(["task:ok#1"])) errors.push(`карточка-мусор: load() = ${JSON.stringify(Object.keys(r.load()))}`);
    for (const id of ["task:junk#1", "task:junk#2", "task:junk#3", "task:junk#4"]) {
      const res = r.report(id, "good", now);
      if (res.status !== "none") errors.push(`карточка-мусор: report(${id}) → ${JSON.stringify(res)}, ожидался none`);
    }
    if (r.report("task:ok#1", "good", now).status !== "graded") errors.push("карточка-мусор: исправная карточка не оценилась");
    const stored = JSON.parse(w.localStorage.getItem("algoSRS"));
    if (stored["task:junk#1"] !== null || stored["task:junk#2"] !== 5 || stored["task:junk#3"] !== "x" || !Array.isArray(stored["task:junk#4"])) {
      errors.push(`карточка-мусор: оценка исправной переписала мусорные записи: ${JSON.stringify(stored)}`);
    }
  }
}

// --- 8e. due(), счётчик по visibilitychange и по storage с key === null ---
{
  const now = Date.now();
  const mk = (due) => ({ due, iv: 1, ease: 2.5, reps: 1, meta: { page: "big-o", q: "задача" } });
  const page = MENU + '<main><h1>Повторение</h1><div class="algo-today"></div></main>';
  const dom = await newDom(
    { algoSRS: JSON.stringify({ "task:a#1": mk(now - 3 * DAY), "task:b#1": mk(now - DAY), "task:c#1": mk(now - 2 * DAY), "task:d#1": mk(now + 2 * DAY), "task:junk#1": null, "task:e#1": Object.assign(mk(0), { due: "скоро" }) }) },
    [],
    page
  );
  const w = dom.window, r = w.ALGO_SRS;
  if (r) {
    const got = JSON.stringify(r.due(now)), want = JSON.stringify(["task:e#1", "task:a#1", "task:c#1", "task:b#1"]);
    if (got !== want) errors.push(`due(now) = ${got}, ожидалось ${want}: просроченные, старые первыми (due не числом считается 0), без будущих и мусора`);
    const later = JSON.stringify(r.due(now + 3 * DAY)), wantLater = JSON.stringify(["task:e#1", "task:a#1", "task:c#1", "task:b#1", "task:d#1"]);
    if (later !== wantLater) errors.push(`due(now + 3 дня) = ${later}, ожидалось ${wantLater}`);
    if (JSON.stringify(r.due()) !== want) errors.push("due() без аргумента не равен due(Date.now())");
  }
  // тихое изменение хранилища без события: счётчик догоняет вкладку, открытую со вчера
  const quiet = (due) => w.localStorage.setItem("algoSRS", JSON.stringify({ "task:a#1": mk(due) }));
  if (!/Сегодня:\s*4\b/.test(badgeShown(dom) || "")) errors.push(`старт: счётчик «${badgeShown(dom)}», ожидалось 4`);
  quiet(now + 5 * DAY);
  Object.defineProperty(w.document, "hidden", { value: true, configurable: true });
  w.document.dispatchEvent(new w.Event("visibilitychange"));
  if (!/Сегодня:\s*4\b/.test(badgeShown(dom) || "")) errors.push("visibilitychange у скрытой вкладки пересчитал счётчик");
  Object.defineProperty(w.document, "hidden", { value: false, configurable: true });
  w.document.dispatchEvent(new w.Event("visibilitychange"));
  if (badgeShown(dom)) errors.push(`visibilitychange у видимой вкладки не обновил счётчик: «${badgeShown(dom)}»`);
  // вкладка вернулась — порцию перестраивает и виджет (раскрытый ответ и форму заметки он при этом бережёт: раздел 15)
  if (!/На сегодня всё/.test(w.document.querySelector(".algo-today").textContent)) errors.push("visibilitychange у видимой вкладки не перестроил виджет");
  quiet(now - DAY);
  w.dispatchEvent(new w.StorageEvent("storage", { key: null })); // localStorage.clear() / восстановление в другой вкладке
  if (!/Сегодня:\s*1\b/.test(badgeShown(dom) || "")) errors.push(`storage с key === null не обновил счётчик: «${badgeShown(dom)}»`);
  if (!/задача/.test(w.document.querySelector(".algo-today").textContent) || /На сегодня всё/.test(w.document.querySelector(".algo-today").textContent)) {
    errors.push("storage с key === null не перерисовал виджет");
  }
}

// --- 8f. границы schedule: без now, мусорные поля ---
if (api) {
  const c = { iv: 8, ease: 2.5, reps: 3, meta: {} };
  api.schedule(c, "good");
  if (!Number.isFinite(c.due) || Math.abs(c.due - (Date.now() + c.iv * DAY)) > 3 * DAY + 60 * 1000 || !Number.isFinite(c.seen)) {
    errors.push(`schedule без now записал due ${c.due}, seen ${c.seen}`);
  }
  const s = { iv: 8, ease: "2.5", reps: "3", due: 0, meta: {} };
  api.schedule(s, "good", 0, () => 0.5);
  if (s.ease !== 2.55 || !Number.isFinite(s.iv) || s.reps !== 1) errors.push(`ease/reps строками: ${JSON.stringify(s)}, ожидалось ease 2.55 (как у карточки без ease), конечный iv, reps 1`);
}

// --- 8g. ни разу не оценённая карточка главы, у которой отметку сняли, уходит ---
{
  const now = Date.now();
  const mk = (extra) => Object.assign({ due: now + DAY, iv: 0, ease: 2.5, reps: 0, meta: {} }, extra);
  const seed = {
    algoSRS: JSON.stringify({
      "ch:marked.html": mk({ meta: { href: "marked.html" } }), // отмечена — остаётся
      "ch:unmarked.html": mk({ meta: { href: "unmarked.html" } }), // отметку сняли, не оценена — уходит
      "ch:absent.html": mk({ meta: { href: "absent.html" } }), // записи в algoProgress нет — уходит
      "ch:graded.html": mk({ iv: 3, reps: 1, seen: now - DAY, meta: { href: "graded.html" } }), // оценена — история, остаётся
      "pkg:somepkg": mk({ meta: { pkg: "somepkg" } }), // не глава — остаётся
      "ch:handmade-iv.html": mk({ iv: 8, meta: { href: "handmade-iv.html" } }), // без seen, но с iv (собранный руками файл) — остаётся
      "ch:handmade-reps.html": mk({ reps: 2, meta: { href: "handmade-reps.html" } }), // без seen, но с reps — остаётся
    }),
    algoProgress: JSON.stringify({ "marked.html": true, "unmarked.html": false, "graded.html": false }),
  };
  const dom = await newDom(seed, [], "<div></div>");
  const ids = Object.keys(cards(dom)).sort();
  const want = ["ch:graded.html", "ch:handmade-iv.html", "ch:handmade-reps.html", "ch:marked.html", "pkg:somepkg"];
  if (JSON.stringify(ids) !== JSON.stringify(want)) errors.push(`карточки глав без отметки: осталось ${JSON.stringify(ids)}, ожидалось ${JSON.stringify(want)}`);
  // событие несёт и убранные карточки; повреждённый algoProgress ничего не убирает
  const r = dom.window.ALGO_SRS;
  const events = [];
  dom.window.document.addEventListener("algo-srs:change", (e) => events.push(e.detail.ids));
  dom.window.localStorage.setItem("algoSRS", seed.algoSRS);
  const s = r.sync(now);
  if (!s.removed || s.removed.sort().join() !== "ch:absent.html,ch:unmarked.html" || events.length !== 1 || events[0].indexOf("ch:unmarked.html") < 0) {
    errors.push(`sync: removed ${JSON.stringify(s.removed)}, события ${JSON.stringify(events)}`);
  }
  const broken = await newDom({ algoSRS: seed.algoSRS, algoProgress: "not json{" }, [], "<div></div>");
  if (Object.keys(cards(broken)).length !== 7) errors.push(`повреждённый algoProgress убрал карточки глав: ${Object.keys(cards(broken))}`);
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

// --- 11. порция дня: не больше 12 карточек и двух с кодом, остальное ждёт ---
{
  const now = NOON;
  const dom = await newDom({ algoSRS: JSON.stringify(debt(now)) }, [CLOCK(now), RUNNER_STUB], PAGE);
  const w = dom.window, r = w.ALGO_SRS;
  const text = () => w.document.querySelector(".algo-today").textContent;
  if (!r || typeof r.today !== "function") {
    errors.push("ALGO_SRS.today не определён — очередь не ограничена дневной порцией");
  } else {
    // (a) 20 лёгких и 3 с кодом: 12 в порции, две с кодом (самые просроченные, по сроку) последними; лёгкие — iv, затем срок
    const t = r.today(now);
    if (JSON.stringify(t.ids) !== JSON.stringify(DEBT_PORTION)) errors.push(`порция: ${JSON.stringify(t.ids)}, ожидалось ${JSON.stringify(DEBT_PORTION)}`);
    if (t.held !== 11) errors.push(`порция: held = ${t.held}, ожидалось 11 (23 просроченных минус 12)`);
    if (JSON.stringify(r.today()) !== JSON.stringify(t)) errors.push("today() без аргумента не равен today(Date.now())");
    if (!r.limits || r.limits.cards !== 12 || r.limits.heavy !== 2) errors.push(`ALGO_SRS.limits = ${JSON.stringify(r.limits)}, ожидалось { cards: 12, heavy: 2 }`);
    if (!/К повторению сегодня: 12/.test(text())) errors.push(`порция: шапка «${text().slice(0, 60)}», ожидалось «К повторению сегодня: 12»`);
    if (!/ещё 11 — не раньше завтра: в день не больше 12 карточек и двух с кодом/.test(text())) errors.push(`порция: нет строки об отложенных: «${text().slice(0, 200)}»`);
    if (!/Сегодня:\s*12\b/.test(badgeShown(dom) || "")) errors.push(`порция: счётчик «${badgeShown(dom)}», ожидалось «Сегодня: 12»`);
    if (!/ещё 11/.test((badgeOf(dom) && badgeOf(dom).title) || "")) errors.push(`порция: подсказка счётчика не говорит об отложенных: «${badgeOf(dom) && badgeOf(dom).title}»`);
    if (w.localStorage.getItem("algoToday") !== null) errors.push("порция только прочитана, а algoToday уже записан — чтение очереди не должно писать");

    // (b) 12 оценок подряд — порция пуста, счётчик скрыт
    for (let i = 0; i < 12; i++) {
      if (i < 10) { click(dom, "Помню"); continue; }
      const want = i === 10 ? "p2" : "p1"; // самая просроченная первой
      if (!/Пакет тренажёра/.test(text()) || (runnerOf(dom) || { getAttribute: () => "" }).getAttribute("data-pkg") !== want) {
        errors.push(`${i + 1}-й должна идти карточка с кодом ${want}: «${text().slice(0, 80)}»`);
      }
      greenPkg(dom); // у карточки с кодом кнопок оценки нет — её оценивает зелёный прогон виджета
    }
    const rec = todayRec(dom);
    if (!rec || rec.day !== dayKey(now) || rec.done !== 12 || rec.heavy !== 2 || JSON.stringify(rec.later) !== "[]") {
      errors.push(`после 12 оценок algoToday = ${JSON.stringify(rec)}, ожидалось { day: ${dayKey(now)}, done: 12, heavy: 2, later: [] }`);
    }
    const after = r.today(now);
    if (after.ids.length !== 0 || after.held !== 11) errors.push(`после 12 оценок порция ${JSON.stringify(after)}, ожидалось пусто и held 11`);
    if (!/На сегодня всё/.test(text()) || !/ещё 11 придут не раньше завтра: в день не больше 12 карточек и двух с кодом/i.test(text())) {
      errors.push(`после 12 оценок виджет: «${text().slice(0, 200)}», ожидалось «На сегодня всё» и «ещё 11 придут не раньше завтра…»`);
    }
    if (/К повторению сегодня/.test(text()) || w.document.querySelector(".algo-today__card")) errors.push("порция пройдена, а виджет показывает карточку");
    if (badgeShown(dom)) errors.push(`порция пройдена, а счётчик виден: «${badgeShown(dom)}»`);
  }

  // счётчик на странице без виджета — тоже порция, а не всё просроченное
  const chapter = await bootDom({ algoSRS: JSON.stringify(debt(Date.now())) }, MENU + "<main><h1>Глава</h1><p>текст</p></main>");
  if (!/Сегодня:\s*12\b/.test(badgeShown(chapter) || "")) errors.push(`страница главы при долге в 23: счётчик «${badgeShown(chapter)}», ожидалось «Сегодня: 12»`);
}

// --- 11c. algoToday со вчерашней датой — день начинается заново ---
{
  const now = NOON;
  const stale = { day: dayKey(now - DAY), done: 12, heavy: 1, later: ["task:t#3"] };
  const dom = await newDom({ algoSRS: JSON.stringify(debt(now)), algoToday: JSON.stringify(stale) }, [CLOCK(now)], PAGE);
  const r = dom.window.ALGO_SRS;
  if (r && r.today) {
    const t = r.today(now);
    if (JSON.stringify(t.ids) !== JSON.stringify(DEBT_PORTION) || t.held !== 11) errors.push(`вчерашний algoToday: порция ${JSON.stringify(t)}, ожидалась полная, без вчерашнего «Позже»`);
    click(dom, "Помню");
    const rec = todayRec(dom);
    if (!rec || rec.day !== dayKey(now) || rec.done !== 1 || rec.heavy !== 0 || rec.later.length) errors.push(`первая оценка нового дня: algoToday = ${JSON.stringify(rec)}, ожидалось done 1 с сегодняшней датой`);
  }
}

// --- 11d. «Позже»: карточка уходит в конец порции и сама не меняется ---
{
  const now = NOON;
  const four = {
    "task:a#1": light("A", 1, now - 4 * HOUR), "task:b#1": light("B", 2, now - 3 * HOUR),
    "task:c#1": light("C", 3, now - 2 * HOUR), "task:d#1": light("D", 4, now - HOUR),
  };
  const dom = await newDom({ algoSRS: JSON.stringify(four) }, [CLOCK(now)], PAGE);
  const w = dom.window, r = w.ALGO_SRS;
  const text = (d) => (d || dom).window.document.querySelector(".algo-today").textContent;
  const order = (api) => (api || r).today(now).ids.map((id) => id.slice(5, 6).toUpperCase()).join("");
  if (r && r.today && typeof r.later === "function") {
    const snap = w.localStorage.getItem("algoSRS");
    if (order() !== "ABCD" || !/задача A/.test(text())) errors.push(`«Позже»: старт — порядок ${order()}, на экране «${text().slice(0, 60)}»`);
    click(dom, "Позже");
    if (order() !== "BCDA") errors.push(`«Позже» на первой карточке: порядок ${order()}, ожидалось BCDA`);
    if (w.localStorage.getItem("algoSRS") !== snap) errors.push("«Позже» изменило algoSRS — карточка должна остаться как была");
    if (!/задача B/.test(text())) errors.push(`после «Позже» на экране не следующая карточка: «${text().slice(0, 60)}»`);
    const rec = todayRec(dom);
    if (!rec || JSON.stringify(rec.later) !== '["task:a#1"]' || rec.done !== 0) errors.push(`«Позже»: algoToday = ${JSON.stringify(rec)}, ожидалось later [task:a#1], done 0`);
    // порядок переживает перестройку виджета (страницу открыли заново)
    const again = await newDom({ algoSRS: snap, algoToday: w.localStorage.getItem("algoToday") }, [CLOCK(now)], PAGE);
    if (order(again.window.ALGO_SRS) !== "BCDA" || !/задача B/.test(text(again))) errors.push(`«Позже» не пережило перестройку: порядок ${order(again.window.ALGO_SRS)}, на экране «${text(again).slice(0, 60)}»`);
    // не первая карточка — через интерфейс; чего нет в порции, то не откладывается
    if (r.later("task:c#1", now) !== true || order() !== "BDAC") errors.push(`later() по третьей карточке: порядок ${order()}, ожидалось BDAC`);
    const before = w.localStorage.getItem("algoToday");
    if (r.later("task:nope#1", now) !== false || w.localStorage.getItem("algoToday") !== before) errors.push("later() по несуществующей карточке записал algoToday или вернул не false");
    // остались только отложенные — идут по кругу
    click(dom, "Помню"); // B
    click(dom, "Помню"); // D
    if (order() !== "AC" || !/задача A/.test(text())) errors.push(`остались только отложенные: порядок ${order()}, на экране «${text().slice(0, 60)}»`);
    click(dom, "Позже");
    if (order() !== "CA" || !/задача C/.test(text())) errors.push(`отложенные по кругу, шаг 1: порядок ${order()}`);
    click(dom, "Позже");
    if (order() !== "AC" || !/задача A/.test(text())) errors.push(`отложенные по кругу, шаг 2: порядок ${order()}`);
    click(dom, "Помню"); // A
    const fin = todayRec(dom);
    if (!fin || fin.done !== 3 || JSON.stringify(fin.later) !== '["task:c#1"]') errors.push(`оценённая карточка осталась в later: ${JSON.stringify(fin)}`);
  } else {
    errors.push("ALGO_SRS.later не определён — «Позже» некуда записать");
  }
}

// --- 11e. порядок порции: лёгкие по возрастанию iv, затем срока; из карточек с кодом — самая просроченная ---
{
  const now = NOON;
  const c = { "task:x#1": light("X", 1, now - HOUR), "task:y#1": light("Y", 22, now - 5 * DAY), "task:z#1": light("Z", 3, now - 2 * DAY) };
  const dom = await newDom({ algoSRS: JSON.stringify(c) }, [CLOCK(now)], "<div></div>");
  const r = dom.window.ALGO_SRS;
  if (r && r.today) {
    const got = r.today(now).ids.join();
    if (got !== "task:x#1,task:z#1,task:y#1") errors.push(`порядок по iv: ${got}, ожидалось x (iv 1), z (iv 3), y (iv 22) — срок у y самый старый, но iv важнее`);
    c["task:q#1"] = light("Q", 3, now - 3 * DAY);
    dom.window.localStorage.setItem("algoSRS", JSON.stringify(c));
    const tie = r.today(now).ids.join();
    if (tie !== "task:x#1,task:q#1,task:z#1,task:y#1") errors.push(`при равном iv первым идёт старший срок: ${tie}`);

    // Карточки с кодом — только по сроку: пакет с интервалом 22 дня, просроченный на 30, идёт раньше
    // пакета с интервалом 1, просроченного на 2. По iv место дня доставалось бы молодым пакетам, и
    // зрелый ждал бы, пока они не кончатся.
    const pk = (iv, due) => Object.assign(heavy("p", due), { iv, reps: iv ? 3 : 0, ease: 2.5 });
    const h = { "task:x#1": light("X", 1, now - HOUR), "pkg:young": pk(1, now - 2 * DAY), "pkg:old": pk(22, now - 30 * DAY), "pkg:new": pk(0, now - DAY) };
    dom.window.localStorage.setItem("algoSRS", JSON.stringify(h));
    const byDue = r.today(now);
    if (byDue.ids.join() !== "task:x#1,pkg:old,pkg:young" || byDue.held !== 1) errors.push(`из карточек с кодом в порцию идут две самые просроченные, а не младшие по iv: ${JSON.stringify(byDue)}, ожидалось task:x#1, pkg:old, pkg:young`);
    // три с кодом в сроке и лёгкие после них по сроку: в порции две, обе последние, самая просроченная первой
    const three = { "pkg:c": pk(3, now - 5 * DAY), "task:l#1": light("L1", 2, now - 6 * DAY), "pkg:d": pk(8, now - 9 * DAY), "task:m#1": light("M", 1, now - HOUR), "pkg:e": pk(1, now - 2 * DAY) };
    dom.window.localStorage.setItem("algoSRS", JSON.stringify(three));
    const t3 = r.today(now);
    if (t3.ids.join() !== "task:m#1,task:l#1,pkg:d,pkg:c" || t3.held !== 1) errors.push(`три с кодом в сроке: ${JSON.stringify(t3)}, ожидалось task:m#1, task:l#1, pkg:d, pkg:c — две с кодом, последними, по сроку`);
    // при равном сроке — по id, а не по порядку заведения
    const same = { "pkg:b": pk(1, now - 3 * DAY), "pkg:a": pk(8, now - 3 * DAY), "pkg:c": pk(2, now - 3 * DAY) };
    dom.window.localStorage.setItem("algoSRS", JSON.stringify(same));
    if (r.today(now).ids.join() !== "pkg:a,pkg:b") errors.push(`карточки с кодом с равным сроком — по id: ${r.today(now).ids.join()}, ожидалось pkg:a,pkg:b`);
    // последнее место дня при равном сроке достаётся лёгкой: в общем проходе тяжёлая стоит как iv 0, но после лёгких
    const tieLast = { "pkg:z": pk(5, now - DAY), "task:n#1": light("N", 0, now - DAY) };
    dom.window.localStorage.setItem("algoSRS", JSON.stringify(tieLast));
    dom.window.localStorage.setItem("algoToday", JSON.stringify({ day: dayKey(now), done: 11, heavy: 0, later: [] }));
    if (r.today(now).ids.join() !== "task:n#1") errors.push(`последнее место дня при равном сроке: ${r.today(now).ids.join()}, ожидалась лёгкая task:n#1`);
    dom.window.localStorage.removeItem("algoToday");
  }
}

// --- 11f. карточки-вопросы: quiz: и cx: показывают ответ и оценки только после «Показать ответ» ---
{
  const now = NOON;
  const Q = "Дан массив и число k: найти наибольшую сумму подмассива длины k.";
  const QM = { n: 1, pattern: "Скользящее окно", href: "sliding-window.html", q: Q };
  const quiz = await newDom(
    { algoQuizMissed: JSON.stringify({ [Q]: QM }), algoSRS: JSON.stringify({ ["quiz:" + Q]: missCard(QM, now - HOUR) }) },
    [CLOCK(now)], PAGE
  );
  {
    const box = quiz.window.document.querySelector(".algo-today");
    const grades = box.querySelector(".algo-today__grades");
    if (!box.textContent.includes(Q)) errors.push(`карточка quiz: нет текста вопроса: «${box.textContent.slice(0, 120)}»`);
    if (/Скользящее окно/.test(box.textContent) || box.querySelector('a[href^="sliding-window"]')) errors.push("карточка quiz: до ответа назван шаблон или дана ссылка на его главу");
    if (!grades || grades.style.display !== "none") errors.push("карточка quiz: оценки доступны до «Показать ответ»");
    // «Позже» доступно и до ответа: кнопка есть и не спрятана вместе с оценками
    const laterBtn = box.querySelector(".algo-today__later");
    let hidden = !laterBtn;
    for (let n = laterBtn; n && n !== box; n = n.parentNode) if (n.style.display === "none") hidden = true;
    if (hidden) errors.push("карточка quiz: до ответа нет кнопки «Позже» (или она спрятана вместе с оценками)");
    if (click(quiz, "Показать ответ")) {
      const ans = box.querySelector(".algo-today__answer a");
      if (!ans || ans.textContent !== "Скользящее окно" || ans.getAttribute("href") !== "sliding-window.html") errors.push(`карточка quiz: ответ не meta.pattern со ссылкой на главу: ${ans && ans.outerHTML}`);
      if (grades && grades.style.display === "none") errors.push("карточка quiz: после ответа оценки не появились");
      click(quiz, "Помню");
      const c = cards(quiz)["quiz:" + Q];
      if (!c || c.iv !== 1 || c.reps !== 1) errors.push(`карточка quiz: «Помню» после ответа не записано: ${JSON.stringify(c)}`);
    }
  }

  // Старая карточка: промах записан, когда ответом на вопрос о цикле в неориентированном графе был
  // «Union-Find (DSU)». Ответ и глава берутся из банка квиза по тексту вопроса, снимок meta — только у
  // вопроса, которого в банке больше нет. Так же — промах, записанный до перевода вариантов квиза на
  // русский: снимок «Sliding Window», ответ карточки — «Скользящее окно» из банка.
  const CYCLE = "Определить, образует ли набор рёбер цикл в НЕориентированном графе.";
  const CYCLE_ANSWER = "Обход графа в глубину (DFS)";
  const WINDOW_Q = "Найти длину самой длинной подстроки без повторяющихся символов.";
  const cycleMeta = { n: 1, pattern: "Union-Find (DSU)", href: "union-find-structure.html", q: CYCLE };
  const windowMeta = { n: 2, pattern: "Sliding Window", href: "sliding-window.html", q: WINDOW_Q };
  const goneMeta = { n: 1, pattern: "Старый шаблон", href: "old.html", q: "Вопроса больше нет" };
  for (const [meta, wantText, wantHref] of [[cycleMeta, CYCLE_ANSWER, "graphs.html"], [windowMeta, "Скользящее окно", "sliding-window.html"], [goneMeta, "Старый шаблон", "old.html"]]) {
    const d = await newDom({ algoQuizMissed: JSON.stringify({ [meta.q]: meta }), algoSRS: JSON.stringify({ ["quiz:" + meta.q]: missCard(meta, now - DAY) }) }, [CLOCK(now), quizJs], PAGE);
    const bank = d.window.ALGO_QUIZ && d.window.ALGO_QUIZ.questions.find((x) => x.q === CYCLE);
    if (!bank || bank.correct !== CYCLE_ANSWER) errors.push(`в банке квиза у вопроса о цикле ответ «${bank && bank.correct}» — проверка рассчитана на «${CYCLE_ANSWER}»`);
    if (!d.window.ALGO_QUIZ.questions.some((x) => x.q === WINDOW_Q)) errors.push(`в банке квиза нет вопроса «${WINDOW_Q}» — проверка старого промаха с английским ответом его ищет`);
    if (click(d, "Показать ответ")) {
      const a = d.window.document.querySelector(".algo-today__answer a");
      if (!a || a.textContent !== wantText || a.getAttribute("href") !== wantHref) errors.push(`карточка quiz: «${meta.q}» отвечает ${a && a.outerHTML}, ожидалось «${wantText}» → ${wantHref}`);
    }
    d.window.close();
  }

  const CXM = { n: 1, chapter: "dynamic-programming", pkg: "dp", fn: "CoinChange" };
  const cxSeed = { algoMockCxMissed: JSON.stringify({ "dp.CoinChange": CXM }), algoSRS: JSON.stringify({ "cx:dp.CoinChange": missCard(CXM, now - HOUR) }) };
  const cx = await newDom(cxSeed, [CLOCK(now), problemsJs], PAGE);
  {
    const w = cx.window, box = w.document.querySelector(".algo-today");
    const prob = w.ALGO_PROBLEMS.find((p) => p.p === "dp" && p.f === "CoinChange") || {};
    const REF = "O(amount · len(coins))";
    if (prob.x !== REF) errors.push(`в банке у dp.CoinChange эталон «${prob.x}» — проверка рассчитана на «${REF}»`);
    const grades = box.querySelector(".algo-today__grades");
    if (!prob.s || !box.textContent.includes(prob.s.split("\n")[0])) errors.push(`карточка cx: нет условия из банка: «${box.textContent.slice(0, 160)}»`);
    if (!/Какая сложность у решения — по времени и по памяти\?/.test(box.textContent)) errors.push(`карточка cx: нет вопроса о сложности: «${box.textContent.slice(0, 160)}»`);
    if (box.textContent.includes("O(amount")) errors.push("карточка cx: эталон виден до «Показать ответ»");
    if (!grades || grades.style.display !== "none") errors.push("карточка cx: оценки доступны до «Показать ответ»");
    if (click(cx, "Показать ответ")) {
      const ans = box.querySelector(".algo-today__answer");
      const link = ans && ans.querySelector("a");
      if (!ans || !ans.textContent.includes(REF)) errors.push(`карточка cx: в ответе нет «${REF}»: «${ans && ans.textContent}»`);
      if (!link || link.getAttribute("href") !== "dynamic-programming.html") errors.push(`карточка cx: в ответе нет ссылки на главу: ${link && link.outerHTML}`);
      if (grades && grades.style.display === "none") errors.push("карточка cx: после ответа оценки не появились");
    }
  }
  // эталона у задачи в банке нет — карточка так и говорит, оценки доступны сразу
  const noRef = await newDom(cxSeed, [CLOCK(now), 'window.ALGO_PROBLEMS = [{ p: "dp", f: "CoinChange", c: "dynamic-programming", s: "Условие без эталона.", h: "", t: [], x: "" }];'], PAGE);
  {
    const box = noRef.window.document.querySelector(".algo-today");
    const grades = box.querySelector(".algo-today__grades");
    if (!/Условие без эталона\./.test(box.textContent) || !/эталонной оценки у этой задачи в банке нет/i.test(box.textContent)) errors.push(`карточка cx без эталона: «${box.textContent.slice(0, 200)}»`);
    if ([...box.querySelectorAll("button")].some((b) => b.textContent === "Показать ответ")) errors.push("карточка cx без эталона обещает ответ, которого нет");
    if (!grades || grades.style.display === "none") errors.push("карточка cx без эталона: оценки спрятаны, а открыть их нечем");
    if (!box.querySelector('a[href="dynamic-programming.html"]')) errors.push("карточка cx без эталона: нет ссылки на главу для сверки");
  }
  // задачи в банке больше нет — карточка называет её по имени и говорит об этом
  const gone = await newDom(cxSeed, [CLOCK(now), "window.ALGO_PROBLEMS = [];"], PAGE);
  {
    const box = gone.window.document.querySelector(".algo-today");
    const grades = box.querySelector(".algo-today__grades");
    if (!/dp\.CoinChange/.test(box.textContent) || !/больше нет в банке/.test(box.textContent)) errors.push(`карточка cx без задачи в банке: «${box.textContent.slice(0, 200)}»`);
    if (!grades || grades.style.display === "none") errors.push("карточка cx без задачи в банке: оценки спрятаны, а открыть их нечем");
  }
}

// --- 11g. карточка mix: условие другой задачи того же шаблона; глава — из банка, из meta — вне банка ---
// Оценивается карточка промаха, а на ней — другая задача с той же главой-ответом c: свою формулировку
// читатель уже видел, а узнавать приём надо по новой. После оценки meta.last — показанная задача, и в
// следующий раз придёт следующая. Прежние карточки bigo.* записаны с meta.chapter "big-o", а в банке их
// ответ теперь — монотонный стек: глава берётся из банка.
{
  const now = NOON;
  const titleOf = (slug) => slug; // в этих страницах нет ALGO_CHAPTERS — заголовок главы равен слагу
  const mixCard = (meta, extra) => Object.assign({ due: now - HOUR, iv: 0, ease: 2.5, reps: 0, meta }, extra || {});
  const oldMeta = { n: 1, chapter: "big-o", pkg: "bigo", fn: "DailyTemperatures" };
  const stackList = BANK.filter((p) => p.c === "monotonic-stack");
  const key = (p) => p.p + "." + p.f;
  const shownOf = (dom) => {
    const t = dom.window.document.querySelector(".algo-today").textContent;
    return BANK.filter((p) => t.includes(p.s.split("\n").join(""))).map(key);
  };
  const dom = await newDom({
    algoMixedMissed: JSON.stringify({ "bigo.DailyTemperatures": oldMeta }),
    algoSRS: JSON.stringify({ "mix:bigo.DailyTemperatures": mixCard(oldMeta) }),
  }, [CLOCK(now), problemsJs], PAGE);
  const first = shownOf(dom);
  if (stackList.length < 2) errors.push(`у монотонного стека в банке ${stackList.length} задач — проверка рассчитана на несколько`);
  if (first.length !== 1 || first[0] === "bigo.DailyTemperatures" || !stackList.map(key).includes(first[0])) {
    errors.push(`карточка mix:bigo.DailyTemperatures показывает ${JSON.stringify(first)}, ожидалась другая задача монотонного стека`);
  }
  if (click(dom, "Показать ответ")) {
    const ans = dom.window.document.querySelector(".algo-today__answer");
    const link = ans && ans.querySelector("a");
    if (!link || link.getAttribute("href") !== "monotonic-stack.html") errors.push(`карточка mix: с meta.chapter "big-o" отвечает ${link && link.getAttribute("href")}, ожидалась глава монотонного стека из банка`);
    const shownRec = BANK.find((p) => key(p) === first[0]);
    if (shownRec && shownRec.a.length && !(ans && ans.textContent.includes("также решается: " + shownRec.a.map(titleOf).join(", ")))) {
      errors.push(`карточка mix: ответ не перечисляет альтернативы показанной задачи (${shownRec.a}): «${ans && ans.textContent}»`);
    }
    click(dom, "Помню");
    const c = cards(dom)["mix:bigo.DailyTemperatures"];
    if (!c || c.iv !== 1 || !c.meta || c.meta.last !== first[0]) errors.push(`карточка mix: после «Помню» meta.last ≠ показанной задаче ${first[0]}: ${JSON.stringify(c)}`);
    if (c && c.meta && c.meta.chapter !== "big-o") errors.push("карточка mix: оценка переписала прежнюю meta.chapter — карточку менять не нужно");
  }
  dom.window.close();

  // следующий показ — не та, что в meta.last; задача-промах снова приходит в свою очередь
  for (const last of stackList.map(key)) {
    const meta = Object.assign({}, oldMeta, { last });
    const again = await newDom({ algoSRS: JSON.stringify({ "mix:bigo.DailyTemperatures": mixCard(meta, { iv: 1, reps: 1, seen: now - DAY }) }) }, [CLOCK(now), problemsJs], PAGE);
    const s = shownOf(again);
    if (s.length !== 1 || s[0] === last || !stackList.map(key).includes(s[0])) errors.push(`карточка mix: при meta.last = ${last} показано ${JSON.stringify(s)}`);
    again.window.close();
  }

  // у шаблона одна задача — показывается она сама; задачи нет в банке — глава из meta, ссылка на смешанную
  const single = Object.entries(BANK.reduce((m, p) => ((m[p.c] = (m[p.c] || []).concat(p)), m), {})).find(([, list]) => list.length === 1);
  if (single) {
    const p = single[1][0];
    const one = await newDom({ algoSRS: JSON.stringify({ ["mix:" + key(p)]: mixCard({ n: 1, chapter: p.c, pkg: p.p, fn: p.f }) }) }, [CLOCK(now), problemsJs], PAGE);
    if (JSON.stringify(shownOf(one)) !== JSON.stringify([key(p)])) errors.push(`карточка mix: у шаблона ${p.c} одна задача, показано ${JSON.stringify(shownOf(one))}`);
    one.window.close();
  }
  // cx: — то же правило главы: прежняя запись big-o у bigo.DailyTemperatures ведёт к монотонному стеку
  const cxOld = await newDom({ algoSRS: JSON.stringify({ "cx:bigo.DailyTemperatures": mixCard(oldMeta) }) }, [CLOCK(now), problemsJs], PAGE);
  {
    const box = cxOld.window.document.querySelector(".algo-today");
    if (/Показать ответ/.test(box.textContent)) click(cxOld, "Показать ответ");
    const links = [...box.querySelectorAll("a")].map((a) => a.getAttribute("href"));
    if (!links.includes("monotonic-stack.html") || links.includes("big-o.html")) errors.push(`карточка cx: с meta.chapter "big-o" ведёт на ${JSON.stringify(links)}, ожидалась глава монотонного стека из банка`);
  }
  cxOld.window.close();
  const gone = await newDom({ algoSRS: JSON.stringify({ "mix:old.Gone": mixCard({ n: 1, chapter: "greedy", pkg: "old", fn: "Gone" }) }) }, [CLOCK(now), problemsJs], PAGE);
  {
    const box = gone.window.document.querySelector(".algo-today");
    if (!/больше нет в банке/.test(box.textContent)) errors.push(`карточка mix: задача вне банка не сказала об этом: «${box.textContent.slice(0, 160)}»`);
    if (click(gone, "Показать ответ")) {
      const link = box.querySelector(".algo-today__answer a");
      if (!link || link.getAttribute("href") !== "greedy.html") errors.push(`карточка mix: задача вне банка отвечает не главой из meta: ${link && link.outerHTML}`);
    }
  }
  gone.window.close();
}

// --- 11h. карточка главы: три вопроса, ответ — строки «Что унести» (takeaways.js); главы с «объясни сам» ---
// Ключ карточки прежний (ch:<страница>.html), расписание читателя не трогается. В главе с «объясни сам»
// ch: не заводится, только если её expl: уже есть: глава, отмеченная без заполненного виджета, обязана
// попасть в очередь. Реестр не загрузился — прежнее поведение: карточки заводятся, вопрос прежний.
{
  const now = NOON;
  const TK = (() => { const s = {}; new Function("window", takeawaysJs)(s); return s.ALGO_TAKEAWAYS; })();
  const GRAPHS = TK.chapters["graphs.html"];
  if (!Array.isArray(GRAPHS) || GRAPHS.length !== 3) errors.push("в takeaways.js у graphs.html не три строки — проверка рассчитана на них");
  if (TK.explain.indexOf("monotonic-stack.html") < 0 || TK.explain.indexOf("sliding-window.html") < 0) errors.push("в takeaways.js monotonic-stack/sliding-window не среди глав с «объясни сам» — проверка рассчитана на них");
  if (TK.explain.indexOf("graphs.html") >= 0 || TK.chapters["two-heaps.html"]) errors.push("takeaways.js: graphs.html с «объясни сам» или two-heaps.html со строками — проверка рассчитана на обратное");
  const marked = JSON.stringify({ "monotonic-stack.html": true, "graphs.html": true });
  const idsOf = (dom) => Object.keys(cards(dom)).sort().join();
  const tk = [CLOCK(now), takeawaysJs];
  const explCard = { due: now + 5 * DAY, iv: 3, ease: 2.5, reps: 2, meta: { chapter: "monotonic-stack" }, seen: now - 3 * DAY };

  // «объясни сам» без expl: — карточка главы заводится, как у любой другой главы
  const noExpl = await newDom({ algoProgress: marked }, tk);
  if (idsOf(noExpl) !== "ch:graphs.html,ch:monotonic-stack.html") errors.push(`«объясни сам» без expl:: заведены ${idsOf(noExpl)}, ожидались ch:graphs.html и ch:monotonic-stack.html`);
  noExpl.window.close();
  // expl: уже есть — ch: этой главы не заводится, expl: не меняется
  const withExpl = await newDom({ algoProgress: marked, algoSRS: JSON.stringify({ "expl:monotonic-stack": explCard }) }, tk);
  if (idsOf(withExpl) !== "ch:graphs.html,expl:monotonic-stack") errors.push(`«объясни сам» с expl:: в algoSRS ${idsOf(withExpl)}, ожидались ch:graphs.html и expl:monotonic-stack`);
  if (JSON.stringify(cards(withExpl)["expl:monotonic-stack"]) !== JSON.stringify(explCard)) errors.push("«объясни сам» с expl:: карточка expl: изменилась");
  withExpl.window.close();
  // виджет заполнен, а expl: ещё не заведена: её заводит тот же sync — ch: рядом с ней не нужна
  const samePass = await newDom({ algoProgress: marked, algoExplainDone: JSON.stringify({ "monotonic-stack": { ts: now - DAY, grade: "good" } }) }, tk);
  if (idsOf(samePass) !== "ch:graphs.html,expl:monotonic-stack") errors.push(`«объясни сам», expl: в том же sync: в algoSRS ${idsOf(samePass)}, ожидались ch:graphs.html и expl:monotonic-stack`);
  samePass.window.close();
  // мусорная запись под id expl: — не карточка: ch: заводится
  const junkExpl = await newDom({ algoProgress: marked, algoSRS: JSON.stringify({ "expl:monotonic-stack": 7 }) }, tk);
  if (!cards(junkExpl)["ch:monotonic-stack.html"] || cards(junkExpl)["expl:monotonic-stack"] !== 7) errors.push(`«объясни сам», мусор под expl:: в algoSRS ${JSON.stringify(cards(junkExpl))}`);
  junkExpl.window.close();

  // прежние карточки читателя — побайтно те же, с expl: и без, ничего нового не заводится и не убирается
  const oldCh = {
    "ch:sliding-window.html": { due: now + 4 * DAY, iv: 8, ease: 2.5, reps: 2, meta: { href: "sliding-window.html" }, seen: now - 4 * DAY },
    "ch:graphs.html": { due: now - HOUR, iv: 0, ease: 2.5, reps: 0, meta: { href: "graphs.html" } },
  };
  const oldMarked = JSON.stringify({ "sliding-window.html": true, "graphs.html": true });
  const withSw = Object.assign({ "expl:sliding-window": Object.assign({}, explCard, { meta: { chapter: "sliding-window" } }) }, oldCh);
  for (const [label, store] of [["без expl:", oldCh], ["с expl:", withSw]]) {
    const raw = JSON.stringify(store);
    const d = await newDom({ algoProgress: oldMarked, algoSRS: raw }, tk);
    const r = d.window.ALGO_SRS.sync(now);
    if (r.created.length || r.removed.length) errors.push(`прежние карточки (${label}): sync завёл ${JSON.stringify(r.created)}, убрал ${JSON.stringify(r.removed)}`);
    if (d.window.localStorage.getItem("algoSRS") !== raw) errors.push(`прежние карточки (${label}): algoSRS изменился: ${d.window.localStorage.getItem("algoSRS")}`);
    d.window.close();
  }

  // вид: три вопроса; ответ — строки главы и ссылка, оценки — только после «Показать ответ»
  const chCard = (href) => ({ due: now - HOUR, iv: 0, ease: 2.5, reps: 0, meta: { href } });
  const view = await newDom({ algoProgress: JSON.stringify({ "graphs.html": true }), algoSRS: JSON.stringify({ "ch:graphs.html": chCard("graphs.html") }) }, tk, PAGE);
  {
    const box = view.window.document.querySelector(".algo-today");
    const grades = box.querySelector(".algo-today__grades");
    const qs = [...box.querySelectorAll(".algo-today__questions li")].map((li) => li.textContent);
    const WANT_Q = ["По каким словам условия узнать этот приём?", "Что должно быть верно, чтобы он работал?", "Где он ломается и чем его заменить?"];
    if (JSON.stringify(qs) !== JSON.stringify(WANT_Q)) errors.push(`карточка главы: вопросы ${JSON.stringify(qs)}, ожидались ${JSON.stringify(WANT_Q)}`);
    if (GRAPHS && GRAPHS.some((s) => box.textContent.includes(s))) errors.push("карточка главы: строка «Что унести» видна до «Показать ответ»");
    if (box.querySelector('a[href^="graphs.html"]')) errors.push("карточка главы: до ответа есть ссылка на главу — текст открывается раньше попытки");
    if (!grades || grades.style.display !== "none") errors.push("карточка главы: оценки доступны до «Показать ответ»");
    if (click(view, "Показать ответ")) {
      const ans = box.querySelector(".algo-today__answer");
      const lines = ans ? [...ans.querySelectorAll("li")].map((li) => li.textContent) : [];
      if (JSON.stringify(lines) !== JSON.stringify(GRAPHS)) errors.push(`карточка главы: строки ответа ${JSON.stringify(lines)}, ожидались строки takeaways.js`);
      const link = ans && ans.querySelector("a");
      if (!link || link.getAttribute("href") !== "graphs.html") errors.push(`карточка главы: в ответе нет ссылки на главу: ${link && link.outerHTML}`);
      if (ans && /undefined|Ответ: $/.test(ans.textContent)) errors.push(`карточка главы: в ответе «${ans.textContent}»`);
      if (grades && grades.style.display === "none") errors.push("карточка главы: после ответа оценки не появились");
      if (view.window.document.activeElement !== ans) errors.push("карточка главы: фокус после «Показать ответ» не на ответе");
      click(view, "Помню");
      const c = cards(view)["ch:graphs.html"];
      if (!c || c.iv !== 1 || c.reps !== 1) errors.push(`карточка главы: «Помню» после ответа не записано: ${JSON.stringify(c)}`);
    }
  }
  view.window.close();
  // глава без строк (вне ядра) и любая глава без реестра — прежний вопрос со ссылкой на главу, оценки сразу
  const oldView = async (href, extra) => {
    const d = await newDom({ algoProgress: JSON.stringify({ [href]: true }), algoSRS: JSON.stringify({ ["ch:" + href]: chCard(href) }) }, extra, PAGE);
    const box = d.window.document.querySelector(".algo-today");
    const grades = box.querySelector(".algo-today__grades");
    const who = `карточка главы ${href}${extra.length > 1 ? "" : " без реестра"}`;
    if (!/Вспомни предусловие и инвариант/.test(box.textContent)) errors.push(`${who}: не прежний вопрос: «${box.textContent.slice(0, 160)}»`);
    if (box.querySelector(".algo-today__questions") || /Показать ответ/.test(box.textContent)) errors.push(`${who}: три вопроса или «Показать ответ» без строк`);
    if (!box.querySelector(`a.algo-today__title[href="${href}"]`)) errors.push(`${who}: заголовок не ссылка на главу`);
    if (!grades || grades.style.display === "none") errors.push(`${who}: оценки спрятаны`);
    if (/undefined/.test(box.textContent)) errors.push(`${who}: в тексте «undefined»`);
    d.window.close();
  };
  await oldView("two-heaps.html", tk);
  await oldView("graphs.html", [CLOCK(now)]);
  // запись реестра не из трёх строк (недописанный блок, сбой генератора) — прежний вопрос, а не обрезанный ответ
  for (const n of [2, 4]) {
    const odd = `window.ALGO_TAKEAWAYS = { chapters: { "graphs.html": ${JSON.stringify(Array.from({ length: n }, (_, i) => "строка " + (i + 1)))} }, explain: [] };`;
    await oldView("graphs.html", [CLOCK(now), odd]);
  }
  // без реестра «объясни сам» неизвестно — заводятся обе карточки, как раньше
  const noReg = await newDom({ algoProgress: marked }, [CLOCK(now)]);
  if (idsOf(noReg) !== "ch:graphs.html,ch:monotonic-stack.html") errors.push(`без реестра: заведены ${idsOf(noReg)}, ожидались ch:graphs.html и ch:monotonic-stack.html`);
  noReg.window.close();
}

// --- 12. границы порции — перебором случайных наборов (зерно фиксировано) ---
// Свойства, а не один пример: размер и число тяжёлых — в пределах остатка дня, тяжёлые последними
// среди неотложенных и по сроку, отложенные в конце в порядке later, ни одна карточка не дважды и не потеряна
// (ids + held = всё просроченное), неотложенные лёгкие — по (iv, срок), и порция не меньше возможного.
{
  const now = NOON;
  const dom = await newDom({}, [CLOCK(now)], "<div></div>");
  const w = dom.window, r = w.ALGO_SRS;
  if (r && r.today) {
    const rnd = mulberry32(20261008);
    const pick = (n) => Math.floor(rnd() * n);
    const KINDS = ["ch:c", "task:t#", "viz:v", "mix:m.", "quiz:q", "cx:x.", "expl:e"];
    const isObj = (c) => c !== null && typeof c === "object" && !Array.isArray(c);
    const bad = [];
    const TRIALS = 600;
    let nonTrivial = 0, withLater = 0, overLimit = 0, twoHeavy = 0;
    for (let trial = 0; trial < TRIALS && bad.length < 5; trial++) {
      const map = {}, all = [];
      const n = pick(45);
      for (let i = 0; i < n; i++) {
        const id = (rnd() < 0.3 ? "pkg:p" : KINDS[pick(KINDS.length)]) + i;
        const u = rnd();
        map[id] = u < 0.04 ? null : {
          due: u < 0.22 ? now + (1 + pick(5 * 24)) * HOUR : u < 0.3 ? now : now - pick(40 * 24) * HOUR,
          iv: pick(5) === 0 ? 0 : pick(61), ease: 2.5, reps: pick(4), meta: {},
        };
        all.push(id);
      }
      const st = { day: dayKey(now), done: pick(4) === 0 ? 9 + pick(7) : pick(9), heavy: pick(3) === 0 ? 1 + pick(3) : 0, later: [] };
      for (let j = pick(7); j > 0 && all.length; j--) st.later.push(rnd() < 0.15 ? "task:gone#" + j : all[pick(all.length)]);
      w.localStorage.setItem("algoSRS", JSON.stringify(map));
      w.localStorage.setItem("algoToday", JSON.stringify(st));

      const got = r.today(now);
      const dueAll = all.filter((id) => isObj(map[id]) && map[id].due <= now);
      const isDue = new Set(dueAll);
      const isHeavy = (id) => id.indexOf("pkg:") === 0;
      const room = Math.max(0, 12 - st.done), heavyRoom = Math.max(0, 2 - st.heavy);
      const laterDue = st.later.filter((id, i) => isDue.has(id) && st.later.indexOf(id) === i);
      const inLater = new Set(laterDue);
      const ids = got.ids;
      const fail = (what) => bad.push(`набор ${trial}: ${what} — порция ${JSON.stringify(ids)}, held ${got.held}, день ${JSON.stringify(st)}, просрочено ${dueAll.length}`);
      const key = (id) => [map[id].iv, map[id].due];
      const less = (a, b) => key(a)[0] < key(b)[0] || (key(a)[0] === key(b)[0] && key(a)[1] < key(b)[1]);
      // карточки с кодом — только по сроку, при равном — по id
      const earlier = (a, b) => map[a].due < map[b].due || (map[a].due === map[b].due && a < b);

      if (new Set(ids).size !== ids.length) fail("карточка встречается дважды");
      if (ids.some((id) => !isDue.has(id))) fail("в порции карточка без вышедшего срока, мусорная или несуществующая");
      if (ids.length > room) fail(`в порции ${ids.length} при остатке дня ${room}`);
      if (ids.filter(isHeavy).length > heavyRoom) fail(`тяжёлых ${ids.filter(isHeavy).length} при остатке ${heavyRoom}`);
      if (ids.length + got.held !== dueAll.length) fail(`ids + held = ${ids.length + got.held}, просрочено ${dueAll.length}`);
      // отложенные — в конце и в порядке later
      const firstLater = ids.findIndex((id) => inLater.has(id));
      const tail = firstLater < 0 ? [] : ids.slice(firstLater);
      const headPart = firstLater < 0 ? ids : ids.slice(0, firstLater);
      if (tail.some((id) => !inLater.has(id))) fail("после отложенной карточки стоит неотложенная");
      if (tail.map((id) => laterDue.indexOf(id)).some((p, i, a) => i > 0 && p <= a[i - 1])) fail("отложенные стоят не в порядке later");
      // тяжёлые последними среди неотложенных и между собой по сроку; лёгкие — по (iv, срок)
      const heavyAt = headPart.findIndex(isHeavy);
      const heavies = heavyAt < 0 ? [] : headPart.slice(heavyAt);
      if (heavies.some((id) => !isHeavy(id))) fail("тяжёлые карточки не последние среди неотложенных");
      if (heavies.some((id, i) => i > 0 && earlier(id, heavies[i - 1]))) fail("неотложенные тяжёлые не по сроку");
      if (heavies.length > 1) twoHeavy++;
      const lights = headPart.filter((id) => !isHeavy(id));
      if (lights.some((id, i) => i > 0 && less(id, lights[i - 1]))) fail("неотложенные лёгкие не по возрастанию iv, затем срока");
      // отложенные занимают место первыми: лёгкая отложенная не вошла — значит, места не было вовсе
      const out = dueAll.filter((id) => ids.indexOf(id) < 0);
      if (out.some((id) => inLater.has(id) && !isHeavy(id)) && headPart.length) fail("отложенная лёгкая карточка вытеснена неотложенной");
      if (out.some((id) => inLater.has(id) && isHeavy(id)) && headPart.some(isHeavy)) fail("отложенная тяжёлая карточка вытеснена неотложенной тяжёлой");
      // в порцию вошли лучшие по (iv, срок) из неотложенных
      const outFresh = out.filter((id) => !inLater.has(id));
      if (outFresh.some((id) => !isHeavy(id) && lights.some((x) => less(id, x)))) fail("оставленная лёгкая карточка раньше по (iv, срок), чем взятая");
      if (outFresh.some((id) => isHeavy(id) && heavies.some((x) => earlier(id, x)))) fail("оставленная тяжёлая карточка просрочена раньше взятой — у карточек с кодом порядок по сроку");
      // порция не меньше возможного: место осталось — значит, за бортом только тяжёлые сверх предела
      if (ids.length < room) {
        if (out.some((id) => !isHeavy(id))) fail("место в порции осталось, а лёгкая карточка не взята");
        if (out.length && ids.filter(isHeavy).length < heavyRoom) fail("место и предел тяжёлых позволяют, а тяжёлая карточка не взята");
      }
      if (ids.length && got.held) nonTrivial++;
      if (tail.length) withLater++;
      if (st.done > 12) overLimit++;
    }
    bad.forEach((b) => errors.push("порция дня: " + b));
    if (nonTrivial < 100 || withLater < 100 || overLimit < 20 || twoHeavy < 100) errors.push(`перебор порции слишком беден: с остатком ${nonTrivial}, с отложенными ${withLater}, с done > 12 — ${overLimit}, с двумя неотложенными тяжёлыми — ${twoHeavy} из ${TRIALS}`);
    console.log(`   перебор порции дня: ${TRIALS} случайных наборов (до 44 карточек), с остатком на завтра ${nonTrivial}, с отложенными в порции ${withLater}, с done > 12 — ${overLimit}, с двумя неотложенными тяжёлыми — ${twoHeavy}`);

    // later с id, которого больше нет, и с уже оценённым — как будто их не откладывали; следующее «Позже» их убирает
    const c = { "task:a#1": light("A", 1, now - 3 * HOUR), "task:b#1": light("B", 2, now - 2 * HOUR), "task:done#1": light("G", 1, now + 3 * DAY) };
    w.localStorage.setItem("algoSRS", JSON.stringify(c));
    w.localStorage.setItem("algoToday", JSON.stringify({ day: dayKey(now), done: 2, heavy: 0, later: ["task:gone#1", "task:done#1", "task:gone#1"] }));
    const t = r.today(now);
    if (t.ids.join() !== "task:a#1,task:b#1" || t.held !== 0) errors.push(`later с пропавшей и с оценённой карточкой: порция ${JSON.stringify(t)}`);
    r.later("task:a#1", now);
    const rec = todayRec(dom);
    if (!rec || JSON.stringify(rec.later) !== '["task:a#1"]' || rec.done !== 2) errors.push(`«Позже» не убрало из later пропавшие и оценённые: ${JSON.stringify(rec)}`);

    // мусор в algoToday — день начинается заново, ничего не падает; первая же оценка пишет исправную запись
    const today = dayKey(now);
    for (const raw of [
      "not json{", "[]", "42", "null", '"str"',
      JSON.stringify({ day: today, done: "5", heavy: 0, later: [] }),
      JSON.stringify({ day: today, done: -3, heavy: 0, later: [] }),
      JSON.stringify({ day: today, done: 12, heavy: "1", later: [] }),
      JSON.stringify({ day: today, done: 12, heavy: 1, later: "task:t#3" }),
      JSON.stringify({ day: today, done: 12 }),
      JSON.stringify({ day: "2099-01-01", done: 12, heavy: 1, later: ["task:t#3"] }),
      JSON.stringify({ day: 20260114, done: 12, heavy: 1, later: [] }),
    ]) {
      w.localStorage.setItem("algoSRS", JSON.stringify(debt(now)));
      w.localStorage.setItem("algoToday", raw);
      let g = null;
      try { g = r.today(now); } catch (e) { errors.push(`algoToday = ${raw}: today() бросил ${e.message}`); }
      if (g && (JSON.stringify(g.ids) !== JSON.stringify(DEBT_PORTION) || g.held !== 11)) errors.push(`algoToday = ${raw}: порция ${JSON.stringify(g)}, ожидался новый день`);
      const res = r.report("task:t#16", "good", now);
      const rec2 = todayRec(dom);
      if (res.status !== "graded" || !rec2 || rec2.day !== today || rec2.done !== 1 || rec2.heavy !== 0 || JSON.stringify(rec2.later) !== "[]") {
        errors.push(`algoToday = ${raw}: после оценки ${JSON.stringify(rec2)}, ожидалась исправная запись с done 1`);
      }
    }
    // элементы later не строками — пропускаются по одному, запись не считается мусором. Массив с id
    // внутри приводится к этому id как ключ: без отсева он занял бы место, и в порции оказался бы не id
    w.localStorage.setItem("algoSRS", JSON.stringify(debt(now)));
    w.localStorage.setItem("algoToday", JSON.stringify({ day: today, done: 3, heavy: 0, later: [5, null, ["task:t#19"], "task:t#3", {}] }));
    const mixed = r.today(now);
    if (mixed.ids.length !== 9 || mixed.ids[8] !== "task:t#3" || !mixed.ids.every((id) => typeof id === "string") || mixed.ids.indexOf("task:t#19") >= 0) {
      errors.push(`later с нестроковыми элементами: ${JSON.stringify(mixed)}, ожидалось 9 id-строк, последняя task:t#3, без task:t#19`);
    }
    // done больше предела (виджеты в главах оценивают и сверх порции; прежняя запись) — порция пуста, без ошибок
    for (const done of [12, 13, 50, 12.7]) {
      w.localStorage.setItem("algoToday", JSON.stringify({ day: today, done, heavy: 0, later: ["task:t#3"] }));
      const g = r.today(now);
      if (g.ids.length !== 0 || g.held !== 23) errors.push(`done = ${done}: порция ${JSON.stringify(g)}, ожидалось пусто и held 23`);
    }
    // дробный done округляется вниз: при 11.5 остаётся одно место, а не «полместа», после которого счёт уходит в минус
    w.localStorage.setItem("algoToday", JSON.stringify({ day: today, done: 11.5, heavy: 0, later: [] }));
    const half = r.today(now);
    if (half.ids.length !== 1 || half.held !== 22) errors.push(`done = 11.5: порция ${JSON.stringify(half)}, ожидалась одна карточка`);
    // предел тяжёлых исчерпан, места много: тяжёлые ждут, лёгкие идут
    w.localStorage.setItem("algoToday", JSON.stringify({ day: today, done: 1, heavy: 2, later: ["pkg:p0"] }));
    const noHeavy = r.today(now);
    if (noHeavy.ids.length !== 11 || noHeavy.ids.some((id) => id.indexOf("pkg:") === 0) || noHeavy.held !== 12) errors.push(`две с кодом сегодня уже были: ${JSON.stringify(noHeavy)}, ожидалось 11 лёгких и held 12`);
    // одна с кодом уже была: место осталось одно, и его берёт отложенная, а не самая просроченная
    w.localStorage.setItem("algoToday", JSON.stringify({ day: today, done: 1, heavy: 1, later: ["pkg:p0"] }));
    const oneHeavy = r.today(now);
    if (oneHeavy.ids.length !== 11 || oneHeavy.ids.filter((id) => id.indexOf("pkg:") === 0).join() !== "pkg:p0" || oneHeavy.ids[10] !== "pkg:p0") errors.push(`одна с кодом сегодня уже была: ${JSON.stringify(oneHeavy)}, ожидалось 10 лёгких и отложенная pkg:p0 последней`);
  }
}

// --- 13. смена суток при открытой странице: порция нового дня, done с нуля ---
{
  const late = new Date(2026, 0, 14, 23, 59, 0).getTime();
  const twenty = {};
  for (let i = 0; i < 20; i++) twenty["task:t#" + i] = light(i, 1, late - (i + 1) * DAY);
  const dom = await newDom({ algoSRS: JSON.stringify(twenty) }, [CLOCK(late)], PAGE);
  const w = dom.window, r = w.ALGO_SRS;
  const text = () => w.document.querySelector(".algo-today").textContent;
  if (r && r.today) {
    click(dom, "Помню");
    click(dom, "Помню");
    const rec = todayRec(dom);
    if (!rec || rec.day !== "2026-01-14" || rec.done !== 2) errors.push(`23:59: algoToday = ${JSON.stringify(rec)}, ожидалось 2026-01-14 и done 2`);
    if (!/К повторению сегодня: 10/.test(text())) errors.push(`23:59 после двух оценок: «${text().slice(0, 60)}», ожидалось 10`);
    w.__now = late + 2 * 60 * 1000; // 00:01 следующего дня
    comeBack(w);
    if (!/К повторению сегодня: 12/.test(text())) errors.push(`00:01, вкладка вернулась: «${text().slice(0, 60)}», ожидалась порция нового дня — 12`);
    if (!/Сегодня:\s*12\b/.test(badgeShown(dom) || "")) errors.push(`00:01: счётчик «${badgeShown(dom)}», ожидалось 12`);
    if (r.today(w.__now).ids.length !== 12 || r.today(w.__now).held !== 6) errors.push(`00:01: today() = ${JSON.stringify(r.today(w.__now))}`);
    if (todayRec(dom).day !== "2026-01-14") errors.push("чтение порции в новый день переписало algoToday — день начинает первая оценка или «Позже»");
    click(dom, "Помню");
    const next = todayRec(dom);
    if (!next || next.day !== "2026-01-15" || next.done !== 1 || next.heavy !== 0) errors.push(`00:01, первая оценка: algoToday = ${JSON.stringify(next)}, ожидалось 2026-01-15 и done 1`);
  }
  // без единого события: в 00:01 нажата оценка на вчерашнем экране — она идёт в счёт нового дня
  const dom2 = await newDom({ algoSRS: JSON.stringify(twenty) }, [CLOCK(late)], PAGE);
  if (dom2.window.ALGO_SRS && dom2.window.ALGO_SRS.today) {
    click(dom2, "Помню");
    dom2.window.__now = late + 2 * 60 * 1000;
    click(dom2, "Помню");
    const rec = todayRec(dom2);
    if (!rec || rec.day !== "2026-01-15" || rec.done !== 1) errors.push(`оценка в 00:01 без события возврата: algoToday = ${JSON.stringify(rec)}, ожидалось 2026-01-15 и done 1`);
    const t2 = dom2.window.document.querySelector(".algo-today").textContent;
    if (!/К повторению сегодня: 11/.test(t2)) errors.push(`после оценки в 00:01 виджет: «${t2.slice(0, 60)}», ожидалось 11`);
  }
}

// --- 13b. вкладка на экране через полночь: порция нового дня приходит без действий читателя ---
// Таймер ловится подменой setTimeout до srs.js: ждать настоящей полуночи проверка не может.
{
  const late = new Date(2026, 0, 14, 23, 59, 0).getTime();
  const midnight = new Date(2026, 0, 15, 0, 0, 2).getTime(); // местная полночь и две секунды запаса
  const twenty = {};
  for (let i = 0; i < 20; i++) twenty["task:t#" + i] = light(i, 1, late - (i + 1) * DAY);
  const CATCH = "window.__timers = []; window.setTimeout = function (fn, ms) { window.__timers.push({ fn: fn, ms: ms }); return window.__timers.length; };";
  const dom = await newDom({ algoSRS: JSON.stringify(twenty) }, [CLOCK(late), CATCH], PAGE);
  const w = dom.window;
  const text = () => w.document.querySelector(".algo-today").textContent;
  if (w.ALGO_SRS && w.ALGO_SRS.today) {
    click(dom, "Помню");
    click(dom, "Помню");
    const armed = w.__timers.slice();
    if (armed.length !== 1 || armed[0].ms !== midnight - late) {
      errors.push(`таймер до полуночи: взведено ${armed.length}, через ${armed[0] && armed[0].ms} мс, ожидался один через ${midnight - late} мс (до местной полуночи + 2 с)`);
    } else {
      if (!/К повторению сегодня: 10\b/.test(text())) errors.push(`23:59 после двух оценок: «${text().slice(0, 60)}»`);
      w.__now = midnight;
      armed[0].fn(); // сработал таймер: ни события, ни действия читателя
      if (!/К повторению сегодня: 12\b/.test(text())) errors.push(`полночь без действий читателя: «${text().slice(0, 60)}», ожидалась порция нового дня — 12`);
      if (!/Сегодня:\s*12\b/.test(badgeShown(dom) || "")) errors.push(`полночь без действий читателя: счётчик «${badgeShown(dom)}», ожидалось 12`);
      const next = w.__timers[1];
      const want = new Date(2026, 0, 16, 0, 0, 2).getTime() - midnight;
      if (w.__timers.length !== 2 || !next || next.ms !== want) errors.push(`после полуночи таймер не перевзведён на следующие сутки: ${JSON.stringify(w.__timers.map((t) => t.ms))}, ожидалось ещё одно через ${want} мс`);
    }
  }
}

// --- 14. «Позже» не запирает очередь: единственная карточка, тяжёлая, фокус, недоступное хранилище ---
{
  const now = NOON;
  // единственная карточка остаётся на экране и оценивается
  const one = await newDom({ algoSRS: JSON.stringify({ "task:a#1": light("A", 1, now - HOUR) }) }, [CLOCK(now)], PAGE);
  if (one.window.ALGO_SRS && one.window.ALGO_SRS.later) {
    const text = () => one.window.document.querySelector(".algo-today").textContent;
    click(one, "Позже");
    if (!/задача A/.test(text()) || !/Других карточек в сегодняшней порции нет/.test(text())) errors.push(`«Позже» на единственной карточке: «${text().slice(0, 200)}»`);
    click(one, "Помню");
    if (cards(one)["task:a#1"].iv !== 3 || !/На сегодня всё/.test(text())) errors.push("после «Позже» единственная карточка не оценивается");
  }

  // тяжёлые: отложенная остаётся сегодняшней тяжёлой, третья её не подменяет
  const hv = {
    "task:a#1": light("A", 1, now - HOUR), "pkg:first": heavy("first", now - 3 * DAY),
    "pkg:second": heavy("second", now - 2 * DAY), "pkg:third": heavy("third", now - DAY),
  };
  const dom = await newDom({ algoSRS: JSON.stringify(hv) }, [CLOCK(now), RUNNER_STUB], PAGE);
  const w = dom.window, r = w.ALGO_SRS;
  if (r && r.later) {
    const text = () => w.document.querySelector(".algo-today").textContent;
    const ids = () => r.today(now).ids.join();
    if (ids() !== "task:a#1,pkg:first,pkg:second" || r.today(now).held !== 1) errors.push(`тяжёлые: старт ${JSON.stringify(r.today(now))}`);
    click(dom, "Позже"); // лёгкая уходит за тяжёлые
    if (ids() !== "pkg:first,pkg:second,task:a#1" || !/first/.test(text())) errors.push(`«Позже» на лёгкой перед тяжёлыми: ${ids()}`);
    click(dom, "Позже"); // теперь тяжёлая
    if (ids() !== "pkg:second,task:a#1,pkg:first") errors.push(`«Позже» на тяжёлой: ${ids()}, ожидалось pkg:second,task:a#1,pkg:first — третья тяжёлая её не подменяет`);
    greenPkg(dom); // second
    if (ids() !== "task:a#1,pkg:first") errors.push(`после второй тяжёлой: ${ids()}, ожидалось task:a#1,pkg:first — третья ждёт`);
    click(dom, "Помню"); // A
    if (ids() !== "pkg:first" || !/first/.test(text())) errors.push(`тяжёлая после лёгких: ${ids()}`);
    click(dom, "Позже"); // единственная и тяжёлая
    if (ids() !== "pkg:first" || !/first/.test(text()) || !runnerOf(dom)) errors.push(`«Позже» на единственной тяжёлой заперло очередь: ${ids()}, «${text().slice(0, 80)}»`);
    greenPkg(dom);
    const rec = todayRec(dom);
    if (!rec || rec.done !== 3 || rec.heavy !== 2 || rec.later.length) errors.push(`тяжёлые оценены: algoToday = ${JSON.stringify(rec)}`);
    if (r.today(now).ids.length !== 0 || r.today(now).held !== 1 || !/На сегодня всё/.test(text()) || !/ещё 1 придёт не раньше завтра/i.test(text())) {
      errors.push(`третья тяжёлая должна ждать завтра: ${JSON.stringify(r.today(now))}, «${text().slice(0, 160)}»`);
    }
  }

  // фокус клавиатуры после «Позже» и после оценки — на новой карточке, а не потерян
  const three = { "task:a#1": light("A", 1, now - 3 * HOUR), "task:b#1": light("B", 2, now - 2 * HOUR), "task:c#1": light("C", 3, now - HOUR) };
  const f = await newDom({ algoSRS: JSON.stringify(three) }, [CLOCK(now)], PAGE);
  if (f.window.ALGO_SRS && f.window.ALGO_SRS.later) {
    const d = f.window.document;
    const laterBtn = d.querySelector(".algo-today__later");
    if (!laterBtn) errors.push("на карточке нет кнопки «Позже»");
    else {
      laterBtn.focus();
      click(f, "Позже");
      const a = d.activeElement;
      if (!a || !a.classList.contains("algo-today__card") || !/задача B/.test(a.textContent)) errors.push(`после «Позже» фокус не на следующей карточке: ${a && a.tagName}.${a && a.className}`);
      click(f, "Помню");
      const b = d.activeElement;
      if (!b || !b.classList.contains("algo-today__card") || !/задача C/.test(b.textContent)) errors.push(`после оценки фокус не на следующей карточке: ${b && b.tagName}.${b && b.className}`);
      // ←/→ на этих узлах mdBook обрабатывает как обычно: своих обработчиков клавиш карточка не ставит,
      // а поле заметки — <input>, на нём mdBook главу не листает
      click(f, "Забыл");
      const note = d.querySelector(".algo-today__noteform input");
      if (!note || note.nodeName !== "INPUT" || d.activeElement !== note) errors.push("поле заметки — не <input> в фокусе: mdBook листал бы главу по ←/→ при вводе");
      click(f, "Забыл"); // второе нажатие не плодит форму
      if (d.querySelectorAll(".algo-today__noteform").length !== 1) errors.push(`повторное «Забыл» открыло ${d.querySelectorAll(".algo-today__noteform").length} форм заметки`);
    }
  }

  // запись отказала: «Позже» работает в пределах вкладки и ничего не выдаёт за сохранённое
  const mem = await newDom({ algoSRS: JSON.stringify(three) }, [CLOCK(now)], PAGE);
  if (mem.window.ALGO_SRS && mem.window.ALGO_SRS.later) {
    const wm = mem.window, rm = wm.ALGO_SRS;
    const orig = wm.Storage.prototype.setItem;
    wm.Storage.prototype.setItem = function () { throw new Error("QuotaExceededError"); };
    try {
      click(mem, "Позже");
      if (rm.today(now).ids.join() !== "task:b#1,task:c#1,task:a#1") errors.push(`«Позже» при отказе записи: порядок ${rm.today(now).ids.join()}`);
      if (!/задача B/.test(wm.document.querySelector(".algo-today").textContent)) errors.push("«Позже» при отказе записи не показало следующую карточку");
      if (wm.localStorage.getItem("algoToday") !== null) errors.push("при отказе записи algoToday всё же записан");
    } finally {
      wm.Storage.prototype.setItem = orig;
    }
    // запись снова работает: следующее «Позже» сохраняет и то, что копилось в памяти вкладки
    click(mem, "Позже");
    const rec = todayRec(mem);
    if (!rec || JSON.stringify(rec.later) !== '["task:a#1","task:b#1"]') errors.push(`после восстановления записи later = ${JSON.stringify(rec)}, ожидалось [a, b]`);
    // …и дальше день снова читается из хранилища, а не из устаревшей памяти вкладки
    if (rm.today(now).ids.join() !== "task:c#1,task:a#1,task:b#1") errors.push(`после восстановления записи порядок ${rm.today(now).ids.join()}, ожидалось c, a, b`);
  }
}

// --- 15. оставленная вкладка: возврат и чужие события перестраивают порцию, не закрывая ответ и форму ---
{
  const now = NOON;
  const KM = { n: 1, chapter: "top-k-elements", pkg: "topk", fn: "KthLargest" };
  const seed = {
    algoSRS: JSON.stringify({ "task:a#1": light("A", 5, now - HOUR), "mix:topk.KthLargest": missCard(KM, now - DAY) }),
    algoMixedMissed: JSON.stringify({ "topk.KthLargest": KM }),
  };
  const dom = await newDom(seed, [CLOCK(now), problemsJs], PAGE);
  const w = dom.window;
  if (w.ALGO_SRS && w.ALGO_SRS.today) {
    const box = w.document.querySelector(".algo-today");
    const add = (id, card) => { const c = cards(dom); c[id] = card; w.localStorage.setItem("algoSRS", JSON.stringify(c)); };
    const state = (what, n) => {
      if (!box.querySelector(".algo-today__answer")) errors.push(`${what}: раскрытый ответ карточки закрылся`);
      if (!new RegExp("К повторению сегодня: " + n + "\\b").test(box.textContent)) errors.push(`${what}: шапка «${box.textContent.slice(0, 40)}», ожидалось ${n}`);
      if (!new RegExp("Сегодня:\\s*" + n + "\\b").test(badgeShown(dom) || "")) errors.push(`${what}: счётчик «${badgeShown(dom)}», ожидалось ${n}`);
    };
    click(dom, "Показать ответ");
    // другая вкладка завела карточку с меньшим iv (она встала бы первой) — тихо, эта вкладка была в фоне
    add("task:n1#1", light("N1", 0, now - HOUR));
    comeBack(w);
    state("возврат на вкладку", 3);
    add("task:n2#1", light("N2", 0, now - HOUR));
    w.dispatchEvent(new w.StorageEvent("storage", { key: "algoSRS" }));
    state("storage из другой вкладки", 4);
    add("task:n3#1", light("N3", 0, now - HOUR));
    w.document.dispatchEvent(new w.CustomEvent("algo-srs:change", { detail: { ids: [] } })); // так сообщает импорт прогресса
    state("algo-srs:change после импорта", 5);
    add("task:n4#1", light("N4", 0, now - HOUR));
    w.dispatchEvent(new w.Event("focus"));
    state("окно получило фокус", 6);
    // карточку на экране оценили в другой вкладке, и её срок успел выйти снова (вкладка стояла сутки):
    // это уже новое повторение — вчерашний раскрытый ответ закрывается
    const again = cards(dom);
    Object.assign(again["mix:topk.KthLargest"], { due: now - 2 * HOUR, seen: now - DAY }); // срок другой, карточка по-прежнему первая
    w.localStorage.setItem("algoSRS", JSON.stringify(again));
    comeBack(w);
    if (box.querySelector(".algo-today__answer") || ![...box.querySelectorAll("button")].some((b) => b.textContent === "Показать ответ")) {
      errors.push("карточку оценили в другой вкладке, и её срок вышел снова, а ответ на экране остался раскрытым");
    }
    click(dom, "Показать ответ");
    // а вот карточку на экране оценили в другой вкладке: её ответ больше не нужен, виджет идёт дальше
    const moved = cards(dom);
    moved["mix:topk.KthLargest"].due = now + 3 * DAY;
    w.localStorage.setItem("algoSRS", JSON.stringify(moved));
    comeBack(w);
    if (box.querySelector(".algo-today__answer") || !/задача N1/.test(box.textContent) || !/К повторению сегодня: 5\b/.test(box.textContent)) {
      errors.push(`карточку на экране оценили в другой вкладке, а виджет не ушёл на следующую: «${box.textContent.slice(0, 120)}»`);
    }
  }

  // форма заметки: порция перестраивается вокруг неё, текст не теряется
  const two = { "task:a#1": light("A", 1, now - 2 * HOUR), "task:b#1": light("B", 2, now - HOUR), "task:c#1": light("C", 3, now - HOUR) };
  const nf = await newDom({ algoSRS: JSON.stringify(two) }, [CLOCK(now)], PAGE);
  const wn = nf.window;
  if (wn.ALGO_SRS && wn.ALGO_SRS.today) {
    const box = wn.document.querySelector(".algo-today");
    click(nf, "Забыл");
    const input = box.querySelector(".algo-today__noteform input");
    if (input) {
      input.value = "перепутал границу";
      // другая вкладка: B оценена, счёт дня вырос
      const c = cards(nf);
      c["task:b#1"].due = now + 3 * DAY;
      wn.localStorage.setItem("algoSRS", JSON.stringify(c));
      wn.localStorage.setItem("algoToday", JSON.stringify({ day: dayKey(now), done: 5, heavy: 0, later: [] }));
      comeBack(wn);
      const still = box.querySelector(".algo-today__noteform input");
      if (!still || still.value !== "перепутал границу") errors.push("возврат на вкладку стёр форму заметки или её текст");
      if (!/К повторению сегодня: 2\b/.test(box.textContent)) errors.push(`форма заметки открыта, а шапка не обновилась: «${box.textContent.slice(0, 40)}»`);
      click(nf, "Сохранить и отложить");
      const a = cards(nf)["task:a#1"];
      if (!a || a.note !== "перепутал границу" || a.iv !== 1) errors.push(`заметка после возврата на вкладку не записана: ${JSON.stringify(a)}`);
      if (todayRec(nf).done !== 6) errors.push(`оценка после возврата на вкладку: done = ${todayRec(nf).done}, ожидалось 6 (5 из другой вкладки и эта)`);
      if (!/задача C/.test(box.textContent)) errors.push(`после заметки на экране не следующая карточка: «${box.textContent.slice(0, 80)}»`);
    }
  }

  // та же форма, но в другой вкладке оценили саму карточку с открытой формой: из порции она ушла,
  // а набранный текст ещё не записан — форма остаётся, шапка считает уже без неё
  const gone = await newDom({ algoSRS: JSON.stringify(two) }, [CLOCK(now)], PAGE);
  const wg = gone.window;
  if (wg.ALGO_SRS && wg.ALGO_SRS.today) {
    const box = wg.document.querySelector(".algo-today");
    click(gone, "Забыл");
    const input = box.querySelector(".algo-today__noteform input");
    if (input) {
      input.value = "не тот инвариант";
      const c = cards(gone);
      Object.assign(c["task:a#1"], { due: now + 3 * DAY, iv: 3, reps: 3, seen: now });
      wg.localStorage.setItem("algoSRS", JSON.stringify(c));
      wg.dispatchEvent(new wg.StorageEvent("storage", { key: "algoSRS" }));
      const still = box.querySelector(".algo-today__noteform input");
      if (!still || still.value !== "не тот инвариант") errors.push("карточку с открытой формой заметки оценили в другой вкладке — форма или её текст пропали");
      if (!/К повторению сегодня: 2\b/.test(box.textContent)) errors.push(`карточка с формой ушла из порции, а шапка её ещё считает: «${box.textContent.slice(0, 40)}»`);
      click(gone, "Сохранить и отложить");
      const a = cards(gone)["task:a#1"];
      if (!a || a.note !== "не тот инвариант") errors.push(`заметка по карточке, оценённой в другой вкладке, потеряна: ${JSON.stringify(a)}`);
      if (todayRec(gone)) errors.push(`«Забыл» по карточке, срок которой уже не вышел, занял место в порции: ${JSON.stringify(todayRec(gone))}`);
      if (!/задача B/.test(box.textContent) || box.querySelector(".algo-today__noteform")) errors.push(`после заметки виджет не ушёл на следующую карточку: «${box.textContent.slice(0, 80)}»`);
    }
  }
}

// --- 16. две вкладки и algoToday: done не меньше настоящего, later не теряется ---
{
  const now = NOON;
  const three = { "task:a#1": light("A", 1, now - 3 * HOUR), "task:b#1": light("B", 2, now - 2 * HOUR), "task:c#1": light("C", 3, now - HOUR) };
  const dom = await newDom({ algoSRS: JSON.stringify(three) }, [CLOCK(now)], PAGE);
  const w = dom.window;
  if (w.ALGO_SRS && w.ALGO_SRS.today) {
    const text = () => w.document.querySelector(".algo-today").textContent;
    // другая вкладка оценила пять своих карточек и отложила C; событие до этой вкладки не дошло
    w.localStorage.setItem("algoToday", JSON.stringify({ day: dayKey(now), done: 5, heavy: 0, later: ["task:c#1"] }));
    click(dom, "Помню"); // A
    const rec = todayRec(dom);
    if (!rec || rec.done !== 6 || JSON.stringify(rec.later) !== '["task:c#1"]') errors.push(`две вкладки: algoToday = ${JSON.stringify(rec)}, ожидалось done 6 и later [task:c#1]`);
    // событие storage по ключу algoToday перестраивает и порцию, и счётчик
    w.localStorage.setItem("algoToday", JSON.stringify({ day: dayKey(now), done: 12, heavy: 0, later: [] }));
    w.dispatchEvent(new w.StorageEvent("storage", { key: "algoToday" }));
    if (!/На сегодня всё/.test(text()) || badgeShown(dom)) errors.push(`storage по ключу algoToday: «${text().slice(0, 60)}», счётчик «${badgeShown(dom)}»`);
  }
}

// --- 17. счёт дня: растёт только по оценке карточки с вышедшим сроком; повреждённый algoSRS порцию не строит ---
{
  const now = NOON;
  const seed = {
    "task:due#1": light("D1", 1, now - HOUR), "task:due#2": light("D2", 1, now - HOUR), "pkg:due": heavy("due", now - DAY),
    "task:due#3": light("D3", 3, now - HOUR),
    "task:wait#1": Object.assign(light("W", 8, now + 5 * DAY), { reps: 3 }),
  };
  const dom = await newDom({ algoSRS: JSON.stringify(seed) }, [CLOCK(now)], "<div></div>");
  const w = dom.window, r = w.ALGO_SRS;
  if (r && r.today) {
    const seenAtEvent = [];
    w.document.addEventListener("algo-srs:change", () => seenAtEvent.push((todayRec(dom) || { done: 0 }).done));
    const expect = (what, done, hv) => {
      const rec = todayRec(dom) || { done: 0, heavy: 0 };
      if (rec.done !== done || rec.heavy !== hv) errors.push(`счёт дня, ${what}: done ${rec.done}, heavy ${rec.heavy}, ожидалось ${done} и ${hv}`);
    };
    r.report("task:nope#1", "good", now);
    expect("карточки нет (none)", 0, 0);
    r.report("task:wait#1", "good", now);
    expect("срок не подошёл (early)", 0, 0);
    if (r.report("task:wait#1", "again", now).status !== "graded") errors.push("«Забыл» до срока по зрелой карточке должен оцениваться");
    expect("«Забыл» до срока — карточка не была в сроке", 0, 0);
    w.localStorage.setItem("algoChallengeMissed", JSON.stringify({ "big-o#9": { n: 1, page: "big-o", anchor: "task-9", q: "Новая" } }));
    if (r.report("task:big-o#9", "good", now).status !== "created") errors.push("report по новому промаху должен отвечать created");
    expect("карточку завёл этот вызов (created)", 0, 0);
    if (w.localStorage.getItem("algoToday") !== null) errors.push("algoToday записан, хотя ни одна карточка в сроке не оценена");
    seenAtEvent.length = 0;
    r.report("task:due#1", "good", now);
    expect("лёгкая в сроке", 1, 0);
    if (seenAtEvent.join() !== "1") errors.push(`в момент события algo-srs:change счёт дня ещё прежний: ${JSON.stringify(seenAtEvent)} — слушатель построил бы порцию по устаревшему done`);
    r.report("pkg:due", "hard", now);
    expect("с кодом в сроке", 2, 1);
    // карточка промаха, заведённая выше, в сроке только завтра: «Забыл» и «Помню» сегодня — early, место не занято
    if (r.report("task:big-o#9", "again", now).status !== "early") errors.push("«Забыл» в день промаха по его карточке должен отвечать early");
    if (r.report("task:big-o#9", "good", now).status !== "early") errors.push("«Помню» в день промаха по его карточке должен отвечать early");
    expect("промах в тот же день — early", 2, 1);
    r.report("task:due#3", "again", now);
    expect("«Забыл» по карточке в сроке", 3, 1);
    const orig = w.Storage.prototype.setItem;
    w.Storage.prototype.setItem = function () { throw new Error("QuotaExceededError"); };
    try {
      if (r.report("task:due#2", "good", now).status !== "unsaved") errors.push("при отказе записи report должен отвечать unsaved");
    } finally {
      w.Storage.prototype.setItem = orig;
    }
    expect("запись отказала (unsaved)", 3, 1);
    if (r.today(now).ids.join() !== "task:due#2") errors.push(`после unsaved карточка должна остаться в порции: ${r.today(now).ids.join()}`);
  }

  for (const raw of ["not json{", "[]"]) {
    const broken = await newDom({ algoSRS: raw }, [CLOCK(now)], PAGE);
    const rb = broken.window.ALGO_SRS;
    if (!rb || !rb.today) continue;
    const t = rb.today(now);
    if (t.ids.length !== 0 || t.held !== 0) errors.push(`algoSRS = ${raw}: today() = ${JSON.stringify(t)}, ожидалось пусто`);
    if (rb.later("task:a#1", now) !== false) errors.push(`algoSRS = ${raw}: later() вернул не false`);
    if (broken.window.localStorage.getItem("algoToday") !== null) errors.push(`algoSRS = ${raw}: algoToday записан при повреждённом состоянии`);
  }
}

// --- 18. промах на этой же странице заводит карточку сразу, но на завтра: счётчик сегодня не растёт ---
{
  const task =
    '<div class="algo-challenge" data-type="predict" data-answer="12" data-explain="разбор">' +
    '<div class="algo-challenge__q">Что вернёт gcd(48, 36)?</div></div>';
  const dom = await newDom({}, [challengeJs], MENU + "<main><h1>Глава</h1>" + task + "</main>");
  const w = dom.window;
  if (badgeShown(dom)) errors.push("промах в задаче: счётчик виден до ответа");
  const box = w.document.querySelector(".algo-challenge");
  const input = box.querySelector("input");
  const btn = [...box.querySelectorAll("button")].find((b) => !b.classList.contains("algo-challenge__hintbtn"));
  if (!input || !btn) errors.push("промах в задаче: виджет задачи не построился");
  else {
    input.value = "999";
    btn.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
    if (badgeShown(dom)) errors.push(`промах в задаче поднял счётчик сегодняшней порции: «${badgeShown(dom)}» — карточка промаха приходит завтра`);
    const tc = Object.keys(cards(dom)).filter((id) => id.indexOf("task:") === 0).map((id) => cards(dom)[id]);
    if (tc.length !== 1 || tc[0].due !== nextDay(Date.now())) errors.push(`промах в задаче не завёл карточку сразу на начало завтра: ${JSON.stringify(tc)}`);
  }

  const qdom = await newDom({}, [quizJs], MENU + '<main><h1>Квиз</h1><div class="algo-quiz"></div></main>');
  const wq = qdom.window, quiz = wq.document.querySelector(".algo-quiz");
  const press = (node) => node.dispatchEvent(new wq.MouseEvent("click", { bubbles: true }));
  let missed = 0;
  for (let i = 0; i < 12 && !missed; i++) {
    const opt = quiz.querySelector(".algo-quiz__opt");
    const go = quiz.querySelector(".algo-quiz__actions .algo-quiz__btn");
    if (!opt || !go) break;
    press(opt);
    press(go); // «Проверить»
    missed = Object.keys(JSON.parse(wq.localStorage.getItem("algoQuizMissed") || "{}")).length;
    if (!missed) press(go); // «Следующий»
  }
  if (!missed) errors.push("промах в квизе: за 12 вопросов не удалось ошибиться — проверка ничего не видит");
  else {
    if (badgeShown(qdom)) errors.push(`промах в квизе поднял счётчик сегодняшней порции: «${badgeShown(qdom)}»`);
    const qc = Object.keys(cards(qdom)).filter((id) => id.indexOf("quiz:") === 0).map((id) => cards(qdom)[id]);
    if (qc.length !== 1 || qc[0].due !== nextDay(Date.now())) errors.push(`промах в квизе не завёл карточку сразу на начало завтра: ${JSON.stringify(qc)}`);
  }
}

// --- 19. числа предела в текстах книги — те же, что в константах движка ---
{
  const r = (await newDom({})).window.ALGO_SRS;
  if (r && r.limits) {
    const phrase = `не больше ${r.limits.cards} карточек`;
    for (const f of ["review.md", "README.md"]) {
      const md = fs.readFileSync(path.join(root, "src", f), "utf8");
      const said = md.match(/не больше \d+ карточ[а-яё]*/g) || [];
      if (!said.length) errors.push(`src/${f}: дневной предел не назван («${phrase}»)`);
      for (const s of said) if (s !== phrase) errors.push(`src/${f}: «${s}», а предел в srs.js — ${r.limits.cards}`);
    }
    // предел карточек с кодом тексты называют словом: «не больше двух с кодом» (шапка виджета — limitText)
    const word = { 1: "одной", 2: "двух" }[r.limits.heavy];
    if (!word) errors.push(`предел карточек с кодом ${r.limits.heavy}: у проверки текстов нет для него слова`);
    for (const f of ["review.md", "README.md"]) {
      const md = fs.readFileSync(path.join(root, "src", f), "utf8").replace(/\s+/g, " ");
      const said = md.match(/не больше (\S+) с кодом/g) || [];
      if (!said.length) errors.push(`src/${f}: предел карточек с кодом не назван («не больше ${word} с кодом»)`);
      for (const s of said) if (s !== `не больше ${word} с кодом`) errors.push(`src/${f}: «${s}», а предел в srs.js — ${r.limits.heavy}`);
    }
  }
  // карточка пакета: сколько функций и пакетов годны для «одной функции с чистого листа» — по банку задач
  // (свои тесты, без соседей) и каталогам тренажёра, а не по памяти
  const md = fs.readFileSync(path.join(root, "src", "review.md"), "utf8").replace(/\s+/g, " ");
  const ex = path.join(root, "exercises");
  const pkgs = fs.readdirSync(ex).filter((d) => d !== "cmd" && fs.statSync(path.join(ex, d)).isDirectory());
  const fit = BANK.filter((p) => p.t.length && !p.n.length);
  const withFn = new Set(fit.map((p) => p.p));
  const want = [fit.length, withFn.size, pkgs.length, pkgs.length - withFn.size];
  const said = md.match(/(\d+) функци\S* в (\d+) пакет\S* из (\d+); у остальных (\d+) пакет/);
  if (!said) errors.push("src/review.md: нет фразы «N функций в M пакетах из K; у остальных L пакетов» о карточке пакета");
  else if (said.slice(1).map(Number).join() !== want.join()) errors.push(`src/review.md: «${said[0]}», а по банку и тренажёру — ${want.join(" / ")}`);
}

// --- 20. карточки с кодом не голодают: 120 дней ежедневной работы на долге первого дня ---
// Состояние — как у автора книги в замере ревью: 15 глав без меток, 18 пакетов (старейший просрочен на
// 87 дней), 6 формулировок, 14 промахов. Каждый день порция проходится целиком. Мест для кода H в день
// (limits.heavy, сейчас 2), и при порядке «самая просроченная первой» пакет опаздывает против своего срока
// не больше чем на floor((N − 1) / H) дней: оценённый пакет получает срок не раньше завтра, поэтому перед
// пакетом P после его срока встают не больше N − 1 других, по H в день (N = 18, H = 2 — до 8 дней; при
// H = 1 было 17). Первый круг — ceil(N / H) дней. При прежнем порядке по iv и одном месте зрелый пакет
// ждал, пока не кончатся молодые: при «Забыл» в четверти оценок — до 40 с лишним дней.
{
  const start = new Date(2026, 9, 8, 19, 0).getTime();
  const PKGS = 18;
  const state = () => {
    const prog = {}, pk = {}, ex = {}, ch = {}, qz = {}, mx = {};
    for (let i = 0; i < 15; i++) prog["c" + i + ".html"] = true;
    for (let i = 0; i < PKGS; i++) pk["p" + i] = start - (88 - i * 5) * DAY;
    for (let i = 0; i < 6; i++) ex["e" + i] = { ts: start - (10 + i) * DAY, grade: "good" };
    for (let i = 0; i < 8; i++) ch["big-o#" + i] = { n: 1, page: "big-o", anchor: "", q: "q" };
    for (let i = 0; i < 3; i++) qz["q" + i] = { n: 1, pattern: "P", href: "x.html", q: "q" + i };
    for (let i = 0; i < 2; i++) mx["m.F" + i] = { n: 1, chapter: "c", pkg: "m", fn: "F" + i };
    const vz = { t: { n: 1, page: "x.html", title: "t", line: 1, code: "if" } };
    const out = {};
    Object.entries({ algoProgress: prog, algoPkgSolved: pk, algoExplainDone: ex, algoChallengeMissed: ch, algoQuizMissed: qz, algoMixedMissed: mx, algoVizMissed: vz })
      .forEach(([k, v]) => { out[k] = JSON.stringify(v); });
    return out;
  };
  const run = async (pAgain, seed) => {
    const dom = await newDom(state(), [CLOCK(start)], "<div></div>");
    const w = dom.window, r = w.ALGO_SRS;
    if (!r || !r.today) return null;
    const R = mulberry32(seed);
    let worst = 0, firstPass = 0, firstEmpty = Infinity;
    const seenPkg = new Set();
    for (let day = 1; day <= 120; day++) {
      const now = start + (day - 1) * DAY;
      w.__now = now;
      r.sync(now);
      for (let g = 0; g < 20; g++) {
        const t = r.today(now);
        if (!t.ids.length) break;
        const id = t.ids[0];
        const card = r.load()[id];
        if (id.indexOf("pkg:") === 0) {
          seenPkg.add(id);
          if (seenPkg.size === PKGS && !firstPass) firstPass = day;
          if (card.iv > 0) worst = Math.max(worst, (now - card.due) / DAY);
        }
        r.report(id, R() < pAgain ? "again" : "good", now, { rnd: () => 0.5 });
      }
      // очередь кода пуста: после первого круга и дневной порции ни одного пакета в сроке
      const left = r.load();
      if (firstPass && firstEmpty === Infinity && !Object.keys(left).some((id) => id.indexOf("pkg:") === 0 && left[id].due <= now)) firstEmpty = day;
    }
    w.close();
    return { worst, firstPass, firstEmpty, heavy: r.limits.heavy };
  };
  for (const [what, pAgain, seed] of [["все «Помню»", 0, 1], ["«Забыл» в четверти оценок", 0.25, 20261008]]) {
    const res = await run(pAgain, seed);
    if (!res) continue;
    const H = res.heavy;
    const pass = Math.ceil(PKGS / H), bound = Math.floor((PKGS - 1) / H);
    if (res.firstPass !== pass) errors.push(`${what}: первый круг по ${PKGS} пакетам закончился на дне ${res.firstPass}, ожидался день ${pass} — по ${H} пакета в день`);
    if (res.worst > bound) errors.push(`${what}: пакет пришёл на ${res.worst} дн. позже своего срока — больше ${bound}: карточки с кодом голодают`);
    if (res.firstEmpty > 120) errors.push(`${what}: за 120 дней очередь кода ни разу не опустела после дневной порции`);
    console.log(`   долг первого дня, 120 дней (${what}): первый круг по ${PKGS} пакетам — день ${res.firstPass}, наибольшее опоздание пакета ${res.worst} дн. (граница ${bound}), очередь кода впервые пуста после порции — день ${res.firstEmpty}`);
  }
}

// --- 21–24. карточка пакета: одна функция с чистого листа, оценку ставит виджет «Реши прямо здесь» ---
const fnsOf = (pkg) => BANK.filter((p) => p.p === pkg && p.t.length && !p.n.length).map((p) => p.f);
const RUNNER = RUNNER_STUB;
const todayText = (dom) => dom.window.document.querySelector(".algo-today").textContent;
// строка итога под виджетом карточки: условие карточки само называет все три оценки, итог — одну
const verdictOf = (dom) => (dom.window.document.querySelector(".algo-today__verdict") || { textContent: "" }).textContent;
const hasBtn = (dom, label) => [...dom.window.document.querySelectorAll(".algo-today button")].some((b) => b.textContent === label);
const DRAFT = "algoRunnerCode:review:";
const startOfDay = (t) => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };

// --- 21. «Сдаюсь» где угодно: карточка пакета получает «Забыл», без карточки — заводится на завтра ---
{
  const now = NOON;
  const CH = MENU + "<main><h1>Глава</h1><p>текст</p></main>";
  const giveupOn = (dom, pkg, fn) => fire(dom, "algo-runner:giveup", { pkg, fn }, dom.window.document.querySelector("main"));
  const SW = fnsOf("slidingwindow");
  // (d) карточки нет: заводится со сроком «завтра» и функцией, на которой сдались
  const dom = await newDom({}, [CLOCK(now), problemsJs], CH);
  const w = dom.window;
  if (!w.ALGO_SRS || typeof w.ALGO_SRS.giveup !== "function") errors.push("ALGO_SRS.giveup не определён — «Сдаюсь» вне карточки некому завести");
  giveupOn(dom, "slidingwindow", SW[3]);
  let c = cards(dom)["pkg:slidingwindow"];
  if (!c || c.due !== now + DAY || c.iv !== 0 || c.reps !== 0 || !c.meta || c.meta.pkg !== "slidingwindow" || c.meta.fn !== SW[3]) {
    errors.push(`«Сдаюсь» без карточки: ${JSON.stringify(c)}, ожидалась карточка на завтра с meta.fn = ${SW[3]}`);
  }
  if (todayRec(dom)) errors.push(`«Сдаюсь» без карточки занял место в порции: ${JSON.stringify(todayRec(dom))}`);
  // функция, тесты которой зовут соседей (n непусто), в meta.fn не попадает: с чистого листа её не решить
  giveupOn(dom, "numbertheory", "LCM");
  c = cards(dom)["pkg:numbertheory"];
  if (!c || !c.meta || "fn" in c.meta) errors.push(`«Сдаюсь» на LCM (нужен GCD) записал meta.fn: ${JSON.stringify(c)}`);
  // …и у существующей карточки тоже: «Забыл» ставится, функция в meta не попадает
  const nt = { "pkg:numbertheory": { due: now - DAY, iv: 3, ease: 2.5, reps: 2, meta: { pkg: "numbertheory" } } };
  const d1 = await newDom({ algoSRS: JSON.stringify(nt) }, [CLOCK(now), problemsJs], CH);
  giveupOn(d1, "numbertheory", "LCM");
  c = cards(d1)["pkg:numbertheory"];
  if (!c || c.iv !== 1 || JSON.stringify(c.meta) !== '{"pkg":"numbertheory"}') errors.push(`«Сдаюсь» на LCM по существующей карточке: ${JSON.stringify(c)}, ожидалось «Забыл» и meta без fn и last`);

  // карточка есть и срок вышел: «Забыл», черновик карточки стёрт, место дня занято
  const due = { "pkg:slidingwindow": { due: now - DAY, iv: 8, ease: 2.5, reps: 3, meta: { pkg: "slidingwindow", last: SW[0] }, seen: now - 9 * DAY } };
  const d2 = await newDom({ algoSRS: JSON.stringify(due), [DRAFT + "slidingwindow"]: "черновик" }, [CLOCK(now), problemsJs], CH);
  giveupOn(d2, "slidingwindow", SW[1]); // по очереди за SW[0] идёт SW[1]
  c = cards(d2)["pkg:slidingwindow"];
  if (!c || c.iv !== 1 || c.back !== 3 || c.reps !== 0 || c.meta.last !== SW[1] || c.meta.fn !== SW[1]) {
    errors.push(`«Сдаюсь» по карточке в сроке: ${JSON.stringify(c)}, ожидалось «Забыл» (iv 1, back 3), meta.last и meta.fn = ${SW[1]}`);
  }
  if (d2.window.localStorage.getItem(DRAFT + "slidingwindow") !== null) errors.push("после «Забыл» черновик карточки пакета не стёрт");
  const rec = todayRec(d2);
  if (!rec || rec.done !== 1 || rec.heavy !== 1) errors.push(`«Сдаюсь» по карточке в сроке не занял место дня: ${JSON.stringify(rec)}`);
  // второе «Сдаюсь» в тот же заход — то же падение (report: early), карточка не ниже
  const snap = d2.window.localStorage.getItem("algoSRS");
  giveupOn(d2, "slidingwindow", SW[1]);
  if (d2.window.localStorage.getItem("algoSRS") !== snap) errors.push("второе «Сдаюсь» в тот же заход опустило карточку ещё на ступень");
  // не по очереди: meta.last не двигается, функция встаёт вне очереди
  const d3 = await newDom({ algoSRS: JSON.stringify(due) }, [CLOCK(now), problemsJs], CH);
  giveupOn(d3, "slidingwindow", SW[3]);
  c = cards(d3)["pkg:slidingwindow"];
  if (!c || c.meta.last !== SW[0] || c.meta.fn !== SW[3]) errors.push(`«Сдаюсь» не по очереди: meta ${JSON.stringify(c && c.meta)}, ожидалось last ${SW[0]}, fn ${SW[3]}`);

  // эталон после ЗЕЛЁНОГО прогона той же функции на этой странице — сверка, а не «сдаюсь»
  const d4 = await newDom({ algoSRS: JSON.stringify(due), [DRAFT + "slidingwindow"]: "черновик" }, [CLOCK(now), problemsJs], CH);
  const main4 = d4.window.document.querySelector("main");
  fire(d4, "algo-runner:result", run("slidingwindow", SW[1], { draft: "" }), main4);
  const snap4 = d4.window.localStorage.getItem("algoSRS");
  giveupOn(d4, "slidingwindow", SW[1]);
  if (d4.window.localStorage.getItem("algoSRS") !== snap4) errors.push("эталон после зелёного прогона той же функции поставил «Забыл»");
  if (d4.window.localStorage.getItem(DRAFT + "slidingwindow") === null) errors.push("эталон после зелёного прогона стёр черновик карточки");
  // …а зелёный прогон ДРУГОЙ функции не защищает
  giveupOn(d4, "slidingwindow", SW[2]);
  if ((cards(d4)["pkg:slidingwindow"] || {}).iv !== 1) errors.push("зелёный прогон одной функции защитил от «Забыл» другую");

  // карточка ждёт срока и уже упала (reps 0): early, ничего не меняется, черновик на месте
  const fallen = { "pkg:slidingwindow": { due: now + DAY, iv: 1, ease: 2.3, reps: 0, back: 3, meta: { pkg: "slidingwindow" }, seen: now - HOUR } };
  const d5 = await newDom({ algoSRS: JSON.stringify(fallen), [DRAFT + "slidingwindow"]: "черновик" }, [CLOCK(now), problemsJs], CH);
  const res = d5.window.ALGO_SRS && d5.window.ALGO_SRS.giveup && d5.window.ALGO_SRS.giveup("slidingwindow", SW[0], now);
  if (!res || res.status !== "early") errors.push(`giveup по упавшей карточке, ждущей срока: ${JSON.stringify(res)}, ожидалось early`);
  if (cards(d5)["pkg:slidingwindow"].meta.fn !== undefined || d5.window.localStorage.getItem(DRAFT + "slidingwindow") !== "черновик") {
    errors.push("early по «Сдаюсь» всё же записал meta.fn или стёр черновик");
  }
  // повреждённый algoSRS не перезаписывается
  const d6 = await newDom({ algoSRS: "not json{" }, [CLOCK(now), problemsJs], CH);
  giveupOn(d6, "slidingwindow", SW[0]);
  if (d6.window.localStorage.getItem("algoSRS") !== "not json{") errors.push("«Сдаюсь» перезаписал повреждённый algoSRS");
}

// --- 22. (a) карточка пакета: функция банка, черновик review, оценка по событиям своего виджета ---
{
  const now = NOON;
  const SW = fnsOf("slidingwindow");
  if (SW.length < 4) errors.push(`у slidingwindow в банке ${SW.length} функций для карточки — проверка рассчитана на ≥ 4`);
  const seed = { algoSRS: JSON.stringify({ "pkg:slidingwindow": heavy("slidingwindow", now - DAY) }), [DRAFT + "slidingwindow"]: "мой черновик" };
  const dom = await newDom(seed, [CLOCK(now), problemsJs, RUNNER], PAGE);
  const w = dom.window, ls = w.localStorage;
  const node = runnerOf(dom);
  if (!node || node.getAttribute("data-pkg") !== "slidingwindow" || node.getAttribute("data-func") !== SW[0] || node.getAttribute("data-draft") !== "review") {
    errors.push(`карточка пакета: виджет ${node && node.outerHTML}, ожидался .algo-runner[data-pkg=slidingwindow][data-func=${SW[0]}][data-draft=review]`);
  }
  if (w.__inits < 1 || w.__initSaw < 1) errors.push(`ALGO_RUNNER_INIT не позван после вставки узла (вызовов ${w.__inits}, узлов в документе ${w.__initSaw})`);
  const statement = (BANK.find((p) => p.p === "slidingwindow" && p.f === SW[0]) || {}).s || "";
  const card = w.document.querySelector(".algo-today__card");
  if (!statement || !card.textContent.includes(statement.split("\n")[0])) errors.push(`карточка пакета без условия функции из банка: «${card.textContent.slice(0, 160)}»`);
  if (card.textContent.includes(SW[0])) errors.push(`карточка пакета называет функцию ${SW[0]} в тексте — имя показывает виджет`);
  for (const b of ["Помню", "С трудом", "Забыл"]) if (hasBtn(dom, b)) errors.push(`у карточки пакета есть кнопка «${b}» — оценку ставят тесты`);
  if (!hasBtn(dom, "Позже")) errors.push("у карточки пакета нет «Позже»");

  // красный прогон и чужие события ничего не меняют
  const snap = ls.getItem("algoSRS");
  fire(dom, "algo-runner:result", run("slidingwindow", SW[0], { ok: false, failed: 1, passed: 0 }));
  fire(dom, "algo-runner:result", run("slidingwindow", SW[0]), w.document.querySelector("main")); // не её узел
  fire(dom, "algo-runner:result", run("slidingwindow", SW[0], { draft: "mixed" })); // не её черновик
  fire(dom, "algo-runner:result", run("slidingwindow", SW[0], { gaveUp: true })); // списано с эталона
  fire(dom, "algo-runner:result", run("slidingwindow", SW[1])); // зелёная другая функция
  if (ls.getItem("algoSRS") !== snap) errors.push("красный прогон, чужой узел, чужой черновик, прогон после эталона или другая функция изменили карточку");
  if (w.document.querySelector(".algo-today__partial:not([hidden])")) errors.push("карточка одной функции показала строку про «весь пакет»");
  if (ls.getItem(DRAFT + "slidingwindow") !== "мой черновик") errors.push("черновик карточки стёрт без оценки");
  if (runnerOf(dom) !== node) errors.push("после красного прогона виджет карточки перестроен — набранный код пропал бы");

  // зелёный без подсказок — «Помню»; карточка остаётся на экране до «Дальше»
  fire(dom, "algo-runner:result", run("slidingwindow", SW[0]));
  let c = cards(dom)["pkg:slidingwindow"];
  if (!c || c.iv !== 1 || c.reps !== 1 || c.ease !== 2.55 || !c.meta || c.meta.last !== SW[0] || "fn" in c.meta) {
    errors.push(`зелёный без подсказок: ${JSON.stringify(c)}, ожидалось «Помню» (iv 1, ease 2.55) и meta.last = ${SW[0]}`);
  }
  if (ls.getItem(DRAFT + "slidingwindow") !== null) errors.push("после оценки черновик карточки не стёрт");
  const rec = todayRec(dom);
  if (!rec || rec.done !== 1 || rec.heavy !== 1) errors.push(`оценка карточки пакета не заняла место дня: ${JSON.stringify(rec)}`);
  if (runnerOf(dom) !== node || !/«Помню»/.test(verdictOf(dom)) || !hasBtn(dom, "Дальше →")) {
    errors.push(`после «Помню» карточка ушла с экрана или не сказала, что записано: «${todayText(dom).slice(0, 240)}»`);
  }
  const seen1 = c && c.seen;
  fire(dom, "algo-runner:result", run("slidingwindow", SW[0])); // второй зелёный — не вторая оценка
  if ((cards(dom)["pkg:slidingwindow"] || {}).seen !== seen1 || (todayRec(dom) || {}).done !== 1) errors.push("второй зелёный прогон оценил карточку ещё раз");
  if (w.document.querySelectorAll(".algo-today__verdict").length !== 1) errors.push(`после второго зелёного прогона строк итога ${w.document.querySelectorAll(".algo-today__verdict").length}, ожидалась одна`);
  ls.setItem(DRAFT + "slidingwindow", "печатал после оценки"); // виджет ещё в документе и пишет черновик
  // эталон после зелёного на карточке — сверка, а не «Забыл»
  fire(dom, "algo-runner:giveup", { pkg: "slidingwindow", fn: SW[0] });
  if ((cards(dom)["pkg:slidingwindow"] || {}).iv !== 1 || (cards(dom)["pkg:slidingwindow"] || {}).back) errors.push("«Сдаюсь» после зелёного на карточке поставил «Забыл»");
  click(dom, "Дальше →");
  if (!/На сегодня всё/.test(todayText(dom)) || runnerOf(dom)) errors.push(`«Дальше» не увело с оценённой карточки: «${todayText(dom).slice(0, 120)}»`);
  if (ls.getItem(DRAFT + "slidingwindow") !== null) errors.push("черновик, записанный после оценки, пережил уход с карточки — следующий показ открылся бы с ним");

  // следующий показ — следующая функция банка; «С трудом» при открытой подсказке
  const d2 = await newDom({ algoSRS: ls.getItem("algoSRS") }, [CLOCK(now + 2 * DAY), problemsJs, RUNNER], PAGE);
  const n2 = runnerOf(d2);
  if (!n2 || n2.getAttribute("data-func") !== SW[1]) errors.push(`после «Помню» по ${SW[0]} следующий показ — ${n2 && n2.getAttribute("data-func")}, ожидалось ${SW[1]}`);
  d2.window.__now = now + 2 * DAY;
  fire(d2, "algo-runner:result", run("slidingwindow", SW[1], { hints: 1 }));
  c = cards(d2)["pkg:slidingwindow"];
  if (!c || c.ease !== 2.5 || c.iv !== 2 || c.meta.last !== SW[1] || !/«С трудом»/.test(verdictOf(d2))) {
    errors.push(`зелёный с подсказкой: ${JSON.stringify(c)}, «${todayText(d2).slice(0, 200)}» — ожидалось «С трудом» (iv 2, ease 2.5), meta.last = ${SW[1]}`);
  }

  // «Сдаюсь» на карточке — «Забыл»: эталон остаётся на экране, функция придёт снова первой
  const t3 = now + 5 * DAY;
  const d3 = await newDom({ algoSRS: d2.window.localStorage.getItem("algoSRS"), [DRAFT + "slidingwindow"]: "код" }, [CLOCK(t3), problemsJs, RUNNER], PAGE);
  const n3 = runnerOf(d3);
  if (!n3 || n3.getAttribute("data-func") !== SW[2]) errors.push(`третий показ — ${n3 && n3.getAttribute("data-func")}, ожидалось ${SW[2]}`);
  fire(d3, "algo-runner:result", run("slidingwindow", SW[2], { ok: false, failed: 1, passed: 0 }));
  fire(d3, "algo-runner:giveup", { pkg: "slidingwindow", fn: SW[2] });
  c = cards(d3)["pkg:slidingwindow"];
  if (!c || c.iv !== 1 || c.reps !== 0 || c.meta.last !== SW[2] || c.meta.fn !== SW[2]) errors.push(`«Сдаюсь» на карточке: ${JSON.stringify(c)}, ожидалось «Забыл», meta.last и meta.fn = ${SW[2]}`);
  if (runnerOf(d3) !== n3 || !/«Забыл»/.test(verdictOf(d3))) errors.push(`после «Сдаюсь» карточка с эталоном ушла с экрана: «${todayText(d3).slice(0, 200)}»`);
  if (d3.window.localStorage.getItem(DRAFT + "slidingwindow") !== null) errors.push("после «Забыл» на карточке черновик не стёрт");
  const snap3 = d3.window.localStorage.getItem("algoSRS");
  fire(d3, "algo-runner:result", run("slidingwindow", SW[2], { gaveUp: true }));
  if (d3.window.localStorage.getItem("algoSRS") !== snap3) errors.push("зелёный прогон списанного эталона после «Сдаюсь» изменил карточку");
  // назавтра — та же функция вне очереди; после неё очередь идёт дальше
  const d4 = await newDom({ algoSRS: snap3 }, [CLOCK(t3 + DAY + HOUR), problemsJs, RUNNER], PAGE);
  if ((runnerOf(d4) || { getAttribute: () => null }).getAttribute("data-func") !== SW[2]) errors.push(`после «Забыл» назавтра не ${SW[2]}: ${runnerOf(d4) && runnerOf(d4).getAttribute("data-func")}`);
  fire(d4, "algo-runner:result", run("slidingwindow", SW[2]));
  c = cards(d4)["pkg:slidingwindow"];
  if (!c || "fn" in c.meta || c.meta.last !== SW[2]) errors.push(`зелёный после «Забыл»: meta ${JSON.stringify(c && c.meta)}, ожидалось без fn и last = ${SW[2]}`);
  const d5 = await newDom({ algoSRS: d4.window.localStorage.getItem("algoSRS") }, [CLOCK(t3 + 30 * DAY), problemsJs, RUNNER], PAGE);
  if ((runnerOf(d5) || { getAttribute: () => null }).getAttribute("data-func") !== SW[3]) errors.push(`после функции вне очереди очередь не пошла дальше: ${runnerOf(d5) && runnerOf(d5).getAttribute("data-func")}, ожидалось ${SW[3]}`);

  // перезагрузка открытой карточки возвращает тот же лист: та же функция, черновик не тронут
  const d6 = await newDom({ algoSRS: JSON.stringify({ "pkg:slidingwindow": heavy("slidingwindow", now - DAY) }), [DRAFT + "slidingwindow"]: "полчаса работы" }, [CLOCK(now), problemsJs, RUNNER], PAGE);
  if ((runnerOf(d6) || { getAttribute: () => null }).getAttribute("data-func") !== SW[0] || d6.window.localStorage.getItem(DRAFT + "slidingwindow") !== "полчаса работы") {
    errors.push("перезагрузка открытой карточки сменила функцию или стёрла черновик");
  }
  // вторая вкладка оценила раньше: early — «записано» не пишется, черновик на месте
  const other = cards(d6);
  Object.assign(other["pkg:slidingwindow"], { due: now + DAY, iv: 1, reps: 1, seen: now });
  d6.window.localStorage.setItem("algoSRS", JSON.stringify(other));
  fire(d6, "algo-runner:result", run("slidingwindow", SW[0]));
  if (d6.window.localStorage.getItem(DRAFT + "slidingwindow") !== "полчаса работы") errors.push("early: черновик стёрт, хотя оценки не было");
  if (/«Помню»/.test(verdictOf(d6)) || !/другой вкладке/.test(verdictOf(d6))) errors.push(`early: «${todayText(d6).slice(0, 200)}» — ожидалось «уже оценили в другой вкладке», без «Помню»`);
  click(d6, "Дальше →");
  if (d6.window.localStorage.getItem(DRAFT + "slidingwindow") !== "полчаса работы") errors.push("early: черновик стёрт при уходе с карточки, хотя эта вкладка её не оценивала");
  // запись отказала: unsaved — карточка в очереди, черновик на месте, следующий зелёный оценит
  const d7 = await newDom({ algoSRS: JSON.stringify({ "pkg:slidingwindow": heavy("slidingwindow", now - DAY) }), [DRAFT + "slidingwindow"]: "код" }, [CLOCK(now), problemsJs, RUNNER], PAGE);
  const orig = d7.window.Storage.prototype.setItem;
  d7.window.Storage.prototype.setItem = function () { throw new Error("QuotaExceededError"); };
  try {
    fire(d7, "algo-runner:result", run("slidingwindow", SW[0]));
  } finally {
    d7.window.Storage.prototype.setItem = orig;
  }
  if (d7.window.localStorage.getItem(DRAFT + "slidingwindow") !== "код" || !/Не удалось сохранить/.test(todayText(d7))) errors.push(`unsaved: «${todayText(d7).slice(0, 200)}», черновик ${d7.window.localStorage.getItem(DRAFT + "slidingwindow")}`);
  fire(d7, "algo-runner:result", run("slidingwindow", SW[0]));
  if ((cards(d7)["pkg:slidingwindow"] || {}).iv !== 1) errors.push("после unsaved следующий зелёный прогон карточку не оценил");

  // Гонка, найденная в браузере: виджет пишет черновик через 400 мс после ввода, а прогон, нажатый сразу
  // после правки, зеленеет за ~200 мс — черновик записывается ПОСЛЕ оценки и стирания. Карточка стирает
  // его ещё раз, когда срок записи прошёл, и при уходе со страницы (pagehide), если оценена.
  const d8 = await newDom({ algoSRS: JSON.stringify({ "pkg:slidingwindow": heavy("slidingwindow", now - DAY) }) }, [CLOCK(now), problemsJs, RUNNER], PAGE);
  fire(d8, "algo-runner:result", run("slidingwindow", SW[0]));
  d8.window.localStorage.setItem(DRAFT + "slidingwindow", "запоздавшая запись виджета");
  await new Promise((r) => setTimeout(r, 1200));
  if (d8.window.localStorage.getItem(DRAFT + "slidingwindow") !== null) errors.push("черновик, записанный виджетом через 400 мс после оценки, остался — следующий показ открылся бы с ним");
  d8.window.localStorage.setItem(DRAFT + "slidingwindow", "печатал после оценки и перезагрузил");
  d8.window.dispatchEvent(new d8.window.Event("pagehide"));
  if (d8.window.localStorage.getItem(DRAFT + "slidingwindow") !== null) errors.push("уход со страницы с оценённой карточкой не стёр черновик");
  // без оценки уход со страницы черновик не трогает: открытая карточка вернётся к нему
  const d9 = await newDom({ algoSRS: JSON.stringify({ "pkg:slidingwindow": heavy("slidingwindow", now - DAY) }), [DRAFT + "slidingwindow"]: "работа" }, [CLOCK(now), problemsJs, RUNNER], PAGE);
  d9.window.dispatchEvent(new d9.window.Event("pagehide"));
  if (d9.window.localStorage.getItem(DRAFT + "slidingwindow") !== "работа") errors.push("уход со страницы стёр черновик неоценённой карточки");
}

// --- 23. (b) функции для карточки нет: виджет без data-func, оценку даёт зелёный прогон пакета целиком ---
{
  const now = NOON;
  for (const [pkg, why] of [["hashtable", "пакет вне банка"], ["parallelbfs", "у всех его задач банка тесты зовут соседей"], ["lru", "у его задачи банка нет своих тестов"]]) {
    const dom = await newDom({ algoSRS: JSON.stringify({ ["pkg:" + pkg]: heavy(pkg, now - DAY) }) }, [CLOCK(now), problemsJs, RUNNER], PAGE);
    const node = runnerOf(dom);
    if (!node || node.hasAttribute("data-func") || node.getAttribute("data-draft") !== "review") errors.push(`${pkg} (${why}): виджет ${node && node.outerHTML}, ожидался без data-func, с data-draft=review`);
    // parallelbfs в главе гоняется с -race: без детектора гоночное решение зеленело бы и ставило «Помню»
    const race = pkg === "parallelbfs";
    if (node && (node.getAttribute("data-race") === "true") !== race) errors.push(`${pkg}: data-race=${node.getAttribute("data-race")}, ожидалось ${race ? "true, как в главе" : "без -race"}`);
    if (!/пакет целиком/.test(todayText(dom))) errors.push(`${pkg}: карточка не говорит, что решать пакет целиком: «${todayText(dom).slice(0, 200)}»`);
    const snap = dom.window.localStorage.getItem("algoSRS");
    const partial = () => { const p = dom.window.document.querySelector(".algo-today__partial"); return p && !p.hidden ? p.textContent : ""; };
    if (partial()) errors.push(`${pkg}: строка про «весь пакет» видна до первого зелёного упражнения`);
    fire(dom, "algo-runner:result", run(pkg, "Put", { ok: false, failed: 1, passed: 0 })); // красное упражнение — молчит
    if (partial()) errors.push(`${pkg}: красный прогон упражнения показал строку про «весь пакет»`);
    fire(dom, "algo-runner:result", run(pkg, "Put")); // зелёное одно упражнение — не пакет
    if (dom.window.localStorage.getItem("algoSRS") !== snap) errors.push(`${pkg}: зелёный прогон одного упражнения оценил карточку пакета целиком`);
    if (!/засчитает зелёный прогон всего пакета — пункт «весь пакет»/.test(partial())) errors.push(`${pkg}: зелёное упражнение без строки, что карточку засчитает «весь пакет»: «${partial()}»`);
    fire(dom, "algo-runner:result", run(pkg, ""));
    const c = cards(dom)["pkg:" + pkg];
    if (!c || c.iv !== 1 || "last" in c.meta) errors.push(`${pkg}: зелёный прогон пакета целиком: ${JSON.stringify(c)}, ожидалось «Помню» без meta.last`);
    if (partial()) errors.push(`${pkg}: после оценки осталась строка «карточку засчитает весь пакет»`);
  }
  // книга без банка задач: тот же пакет целиком, условия нет, ничего не падает
  const nob = await newDom({ algoSRS: JSON.stringify({ "pkg:slidingwindow": heavy("slidingwindow", now - DAY) }) }, [CLOCK(now), RUNNER], PAGE);
  const nn = runnerOf(nob);
  if (!nn || nn.hasAttribute("data-func") || nob.window.document.querySelector(".algo-today__q")) errors.push(`без банка задач: виджет ${nn && nn.outerHTML}, условие ${!!nob.window.document.querySelector(".algo-today__q")}`);
  // старая карточка (meta без last и fn) — первая функция банка, отрисовка ничего не пишет
  const old = { "pkg:slidingwindow": { due: now - DAY, iv: 3, ease: 2.6, reps: 2, meta: { pkg: "slidingwindow" }, note: "перепутал границу" } };
  const od = await newDom({ algoSRS: JSON.stringify(old) }, [CLOCK(now), problemsJs, RUNNER], PAGE);
  if ((runnerOf(od) || { getAttribute: () => null }).getAttribute("data-func") !== fnsOf("slidingwindow")[0]) errors.push("старая карточка пакета не открылась на первой функции банка");
  if (od.window.localStorage.getItem("algoSRS") !== JSON.stringify(old)) errors.push("отрисовка старой карточки пакета изменила algoSRS");
  if (!/перепутал границу/.test(todayText(od))) errors.push("у старой карточки пакета не показана заметка");
  // мусорная meta (строка вместо объекта) — карточка рисуется, оценка заводит meta заново
  const junk = { "pkg:slidingwindow": { due: now - DAY, iv: 0, ease: 2.5, reps: 0, meta: "мусор" } };
  const jd = await newDom({ algoSRS: JSON.stringify(junk) }, [CLOCK(now), problemsJs, RUNNER], PAGE);
  fire(jd, "algo-runner:result", run("slidingwindow", fnsOf("slidingwindow")[0]));
  const jc = cards(jd)["pkg:slidingwindow"];
  if (!jc || jc.iv !== 1 || !jc.meta || jc.meta.pkg !== "slidingwindow" || jc.meta.last !== fnsOf("slidingwindow")[0]) errors.push(`карточка с мусорной meta: ${JSON.stringify(jc)}`);
}

// --- 24. (c) runner не отвечает: карточка так и говорит, «Позже» переносит её на начало завтрашнего дня ---
{
  const now = NOON;
  const two = {
    "pkg:first": Object.assign(heavy("first", now - 3 * DAY), { iv: 8, ease: 2.4, reps: 3, back: 3 }),
    "pkg:second": heavy("second", now - 2 * DAY), "pkg:third": heavy("third", now - DAY),
  };
  const dom = await newDom({ algoSRS: JSON.stringify(two) }, [CLOCK(now), RUNNER], PAGE);
  const w = dom.window, r = w.ALGO_SRS;
  if (r.today(now).ids.join() !== "pkg:first,pkg:second") errors.push(`runner не отвечает: старт ${r.today(now).ids.join()}`);
  fire(dom, "algo-runner:state", { pkg: "first", up: false });
  if (!/нужен runner/.test(todayText(dom))) errors.push(`runner не отвечает, а карточка молчит: «${todayText(dom).slice(0, 200)}»`);
  click(dom, "Позже");
  const c = cards(dom)["pkg:first"];
  const want = Object.assign({}, two["pkg:first"], { due: startOfDay(now + DAY) });
  if (JSON.stringify(c) !== JSON.stringify(want)) errors.push(`«Позже» без runner'а: ${JSON.stringify(c)}, ожидалось ${JSON.stringify(want)} — срок на начало завтра, остальное как было`);
  if (todayRec(dom) && (todayRec(dom).done || todayRec(dom).heavy)) errors.push(`«Позже» без runner'а засчитано как оценка: ${JSON.stringify(todayRec(dom))}`);
  if (r.today(now).ids.join() !== "pkg:second,pkg:third" || !/second/.test(todayText(dom))) errors.push(`после «Позже» без runner'а место для кода не освободилось: ${r.today(now).ids.join()}, «${todayText(dom).slice(0, 120)}»`);
  if (!/завтра/.test(todayText(dom))) errors.push("«Позже» без runner'а не сказало, что карточка ушла на завтра");
  // runner отвечает — обычное «Позже»: в конец порции, карточка не меняется
  const up = await newDom({ algoSRS: JSON.stringify({ "pkg:first": heavy("first", now - 3 * DAY), "task:a#1": light("A", 1, now - HOUR) }) }, [CLOCK(now), RUNNER], PAGE);
  up.window.ALGO_SRS.later("task:a#1", now);
  up.window.ALGO_SRS.later("task:a#1", now); // перерисовки нет: виджет перестроим заново
  const up2 = await newDom({ algoSRS: up.window.localStorage.getItem("algoSRS"), algoToday: up.window.localStorage.getItem("algoToday") }, [CLOCK(now), RUNNER], PAGE);
  fire(up2, "algo-runner:state", { pkg: "first", up: true });
  const snap = up2.window.localStorage.getItem("algoSRS");
  const oldNode = runnerOf(up2);
  click(up2, "Позже");
  if (up2.window.localStorage.getItem("algoSRS") !== snap || up2.window.ALGO_SRS.today(now).ids.join() !== "task:a#1,pkg:first") errors.push(`«Позже» при живом runner'е: порция ${up2.window.ALGO_SRS.today(now).ids.join()}, algoSRS ${up2.window.localStorage.getItem("algoSRS") === snap ? "не тронут" : "изменён"}`);
  // прогон, начатый до «Позже», закончился на убранном виджете — карточку, ушедшую в конец, он не оценивает
  fire(up2, "algo-runner:result", run("first", ""), oldNode);
  if (up2.window.localStorage.getItem("algoSRS") !== snap) errors.push("зелёный прогон убранного виджета оценил карточку, которую читатель отложил");
  // runner.js на странице нет вовсе (ALGO_RUNNER_INIT не определён) — то же, что «не отвечает»
  const none = await newDom({ algoSRS: JSON.stringify(two) }, [CLOCK(now)], PAGE);
  if (!/нужен runner/.test(todayText(none))) errors.push(`без runner.js карточка не говорит, что ей нужен runner: «${todayText(none).slice(0, 200)}»`);
  click(none, "Позже");
  if ((cards(none)["pkg:first"] || {}).due !== startOfDay(now + DAY)) errors.push("без runner.js «Позже» не перенесло карточку на завтра");
}

if (errors.length) {
  console.error(`❌ srs-check: ${errors.length} проблем(ы):`);
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
console.log(
  "✅ srs-check: карточки заводятся на любой странице с опорой на метку события, счётчик «Сегодня: N» в панели, " +
    "интервалы 1→3→8→22→61, «забыл» — шаг назад (22 → 1 → 8 → 21) с заметкой, порядок оценок и сроков при одном и том же сдвиге " +
    "держится во всех достижимых состояниях (в том числе прежней формулы), две вкладки не затирают друг друга, " +
    "«с трудом» с back — ступень ниже back, «забыл» до срока один раз на падение, report() — исходы created/none/graded/early/unsaved, " +
    "повреждённый algoSRS не перезаписывается, прежние карточки не меняются, ease держится в [1.3, 2.8]; " +
    "порция дня — не больше 12 карточек и двух с кодом (границы и порядок — на случайных наборах), «Позже» ставит в конец и не запирает очередь, " +
    "смена суток и мусор в algoToday начинают день заново, счёт дня растёт только по оценке карточки в сроке, " +
    "карточки quiz: и cx: отвечают после «Показать ответ», mix: показывает другую задачу шаблона с главой из банка, ch: — три вопроса и ответ из «Что унести» (без ch:, если у главы уже есть expl:), возврат на вкладку перестраивает порцию без потери ответа и заметки, " +
    "промах заводит карточку на начало завтра (оценка в тот же день — early), таймер в местную полночь приносит порцию нового дня; " +
    "карточка пакета — одна функция с чистого листа, оценку ставят события её виджета и «Сдаюсь» с любой страницы, " +
    "без runner'а «Позже» переносит её на завтра"
);
// Явный выход: каждая страница с srs.js взводит таймер до местной полуночи, и окна jsdom держали бы
// процесс до утра.
process.exit(0);
}

main().catch(function (e) {
  console.error("❌ srs-check: неожиданная ошибка:", e);
  process.exit(1);
});
