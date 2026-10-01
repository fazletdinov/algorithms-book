#!/usr/bin/env node
// Headless smoke режима «🎯 Предсказывать» пошаговых виджетов (assets/algo-viz.js).
//
//   node scripts/predict-check.js
//
// Что проверяется (и почему):
//   1) выключенный режим ничего не меняет — «›» листает, вопросов нет;
//   2) включённый режим на развилке НЕ листает по «›» / «→», пока не ответишь, — иначе
//      вопрос можно проскочить, не подумав, и режим превращается в декорацию;
//   3) ответ листает на шаг развилки и помечает его «Верно» / «Не угадал»; счёт «k/n»
//      совпадает с числом ответов, промах пишется в algoVizMissed (оттуда srs.js
//      заводит карточку viz:<тип>);
//   4) верный ответ — это правда о следующем шаге: «Да» верен ровно тогда, когда шаг
//      после развилки попал в тело (строка L+1) — сверяется по подсвеченной строке кода;
//   5) у виджета без развилок кнопка 🎯 выключена, а не молча бесполезна;
//   6) автопроигрывание останавливается на вопросе, а не пролетает мимо.
// Если jsdom не найден — мягкий пропуск (exit 0), как в остальных смоуках.
"use strict";
const fs = require("fs");
const path = require("path");

let JSDOM, VirtualConsole;
try {
  ({ JSDOM, VirtualConsole } = require("jsdom"));
} catch (e) {
  console.log("⏭  predict-check: jsdom не установлен — пропускаю (npm i jsdom).");
  process.exit(0);
}

const root = path.resolve(__dirname, "..");
const js = fs.readFileSync(path.join(root, "assets", "algo-viz.js"), "utf8");
const infraJs = fs.readFileSync(path.join(root, "assets", "infra-viz.js"), "utf8");
const tagOf = (file, type) => {
  const t = fs.readFileSync(path.join(root, "src", file), "utf8");
  const m = t.match(new RegExp(`<div class="algo-viz" data-viz="${type}"[^>]*></div>`));
  if (!m) throw new Error(`в ${file} нет виджета ${type}`);
  return m[0];
};

const errors = [];
const vc = new VirtualConsole();
vc.on("jsdomError", (e) => errors.push("jsdomError: " + (e && e.message)));

const dom = new JSDOM(
  `<!DOCTYPE html><html><body>
     ${tagOf("sliding-window.md", "sliding-window-fixed").replace("<div ", '<div id="win" ')}
     ${tagOf("monotonic-stack.md", "monotonic-stack").replace("<div ", '<div id="stk" ')}
     <script>${js}</script><script>${infraJs}</script>
   </body></html>`,
  { runScripts: "dangerously", virtualConsole: vc, pretendToBeVisual: true, url: "http://localhost:3000/sliding-window.html" }
);
const w = dom.window, doc = w.document;
const fails = [];
const expect = (ok, msg) => { if (!ok) fails.push(msg); };

const win = () => doc.getElementById("win");
const counter = (el) => +((el.querySelector(".algo-viz__counter").textContent.match(/(\d+)\s*\//) || [])[1]);
const activeLine = (el) => [...el.querySelectorAll(".algo-tp__codeline")].findIndex((x) => x.classList.contains("algo-tp__codeline--active"));
const click = (el) => el.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
const key = (el, k) => el.dispatchEvent(new w.KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));
const next = (el) => click(el.querySelector(".algo-tp__nextbtn"));
const pending = (el) => el.querySelector(".algo-tp__pred");

setTimeout(async () => {
  const el = win();
  const total = +el.querySelector(".algo-viz__counter").textContent.match(/\/\s*(\d+)/)[1];

  // 1) режим выключен — обычное листание
  let c0 = counter(el);
  for (let i = 0; i < 6; i++) next(el);
  expect(counter(el) === c0 + 6, `режим выключен, а «›» пролистал ${counter(el) - c0} шагов из 6`);
  expect(!pending(el), "режим выключен, а вопрос появился");

  // 5) у стека развилок на шагах нет — кнопка выключена
  const stkBtn = doc.getElementById("stk").querySelector(".algo-tp__predbtn");
  expect(stkBtn && stkBtn.disabled, "у виджета без развилок кнопка 🎯 не выключена");

  // включаем режим и начинаем сначала
  click(el.querySelector(".algo-tp__predbtn"));
  expect(w.localStorage.getItem("algoVizPredict") === "1", "включённый режим не запомнился в localStorage");
  key(el, "Home");

  // 2)–4) проходим весь прогон, на каждый вопрос отвечая «Да»
  let asked = 0, right = 0, wrong = 0, guard = 0;
  while (counter(el) < total && guard++ < 400) {
    next(el);
    if (!pending(el)) continue;
    asked++;
    const before = counter(el);
    next(el); key(el, "ArrowRight");
    expect(counter(el) === before && pending(el), `на вопросе «›» / «→» пролистали шаг (${before} → ${counter(el)})`);
    const qLine = +pending(el).querySelector(".algo-tp__curlineno").textContent - 1;
    click(pending(el).querySelector(".algo-tp__predans")); // «Да»
    expect(!pending(el), "после ответа вопрос не закрылся");
    expect(counter(el) === before + 1, `ответ должен показать шаг развилки: было ${before}, стало ${counter(el)}`);
    const v = el.querySelector(".algo-tp__predv");
    expect(!!v, "после ответа нет пометки «Верно / Не угадал»");
    if (!v) continue;
    const ok = v.classList.contains("algo-tp__predv--ok");
    if (ok) right++; else wrong++;
    // правда о развилке — по следующему шагу: вошли ли в тело (строка L+1)
    expect(activeLine(el) === qLine, `шаг развилки подсвечивает строку ${activeLine(el) + 1}, а спрашивали про ${qLine + 1}`);
    next(el); // следующий шаг (если он сам вопрос — это следующая итерация цикла)
    if (pending(el)) { // шаг L+1 тоже развилка: правда видна на нём — подсветку сверим после ответа
      continue;
    }
    const entered = activeLine(el) === qLine + 1;
    expect(ok === entered, `«Да» на строке ${qLine + 1} помечено ${ok ? "верным" : "неверным"}, а выполнение ${entered ? "вошло" : "не вошло"} в тело`);
  }
  expect(asked >= 3, `в окне фиксированного размера ожидалось хотя бы 3 вопроса, задано ${asked}`);
  expect(right > 0 && wrong > 0, `ответы «Да» должны быть и верными, и неверными (цикл когда-то кончается): верно ${right}, нет ${wrong}`);
  const score = el.querySelector(".algo-tp__predscore").textContent;
  expect(score === `${right}/${right + wrong}`, `счёт «${score}», а ответов ${right}/${right + wrong}`);
  const miss = JSON.parse(w.localStorage.getItem("algoVizMissed") || "{}")["sliding-window-fixed"];
  expect(miss && miss.n === wrong && miss.line > 0 && miss.code && miss.page === "sliding-window.html",
    `промахи не записаны как надо: ${JSON.stringify(miss)} при ${wrong} промахах`);

  // 6) автопроигрывание на 4× останавливается на первом вопросе
  key(el, "Home");
  const sel = el.querySelector(".algo-tp__speedsel");
  sel.value = "100"; sel.dispatchEvent(new w.Event("change"));
  click(el.querySelector(".algo-tp__playbtn"));
  const t0 = Date.now();
  while (!pending(el) && Date.now() - t0 < 20000) await new Promise((r) => setTimeout(r, 100));
  expect(!!pending(el), "автопроигрывание не остановилось на вопросе за 20 с");
  const stopped = counter(el);
  await new Promise((r) => setTimeout(r, 1500));
  expect(counter(el) === stopped, "автопроигрывание продолжило листать при открытом вопросе");

  // выключенный режим снова не спрашивает
  click(el.querySelector(".algo-tp__predbtn"));
  expect(!pending(el), "выключение режима не закрыло вопрос");

  if (errors.length) fails.push(...errors.slice(0, 5));
  if (fails.length) {
    console.error("❌ predict-check:\n  - " + fails.join("\n  - "));
    process.exit(1);
  }
  console.log(`✅ predict-check: без режима листается как раньше; с 🎯 на развилках «›» ждёт ответа, ответ сверяется со следующим шагом (${asked} вопросов: ${right} верно, ${wrong} промахов записано), счёт и промахи сходятся, автопроигрывание встаёт на вопросе, у виджета без развилок кнопка выключена`);
  process.exit(0);
}, 400);
