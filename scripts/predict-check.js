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
//      после развилки попал в тело блока — сверяется по подсвеченной строке кода;
//   5) у виджета без развилок кнопка 🎯 выключена, а не молча бесполезна;
//   6) автопроигрывание останавливается на вопросе, а не пролетает мимо;
//   7) ключи всех виджетов книги: движок считает «вошли в тело» по парной скобке блока,
//      проверка — независимо, по отступам листинга. Раньше ключ был «следующий шаг на
//      строке L+1», и генератор, пропустивший первую строку тела, превращал верное «Да»
//      читателя в «✗ Не угадал» и карточку в повторениях;
//   8) виджет входа в цикл печатает a, b и L — глава называет их «длинами из
//      доказательства». b — сколько узлов slow прошёл по кольцу до встречи (0 ≤ b ≤ L):
//      при цикле с головы это полный круг, b = L, а счёт по модулю L давал b = 0. Сверяются
//      оба места с числами (строка шага и подпись под рисунком) на примере главы и на
//      каждом пресете. Проверка живёт здесь, а не в отдельном скрипте, потому что этот
//      смоук уже строит виджеты настоящим движком и стоит в CI.
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
const { infraScriptTags } = require("./lib/infra-files.js");
const tagOf = (file, type) => {
  const t = fs.readFileSync(path.join(root, "src", file), "utf8");
  const m = t.match(new RegExp(`<div class="algo-viz" data-viz="${type}"[^>]*></div>`));
  if (!m) throw new Error(`в ${file} нет виджета ${type}`);
  return m[0];
};

// все виджеты входа в цикл из главы (в том числе вкладки: у них data-tab стоит перед data-viz)
const cycTags = [...fs.readFileSync(path.join(root, "src", "fast-slow-pointers.md"), "utf8").matchAll(/<div class="algo-viz"[^>]*><\/div>/g)]
  .map((m) => m[0]).filter((t) => t.includes('data-viz="list-cycle-entry"'));
if (!cycTags.length) throw new Error("в fast-slow-pointers.md нет виджета list-cycle-entry");

const errors = [];
const vc = new VirtualConsole();
vc.on("jsdomError", (e) => errors.push("jsdomError: " + (e && e.message)));

const dom = new JSDOM(
  `<!DOCTYPE html><html><body>
     ${tagOf("sliding-window.md", "sliding-window-fixed").replace("<div ", '<div id="win" ')}
     ${tagOf("monotonic-stack.md", "monotonic-stack").replace("<div ", '<div id="stk" ')}
     ${cycTags.map((t, i) => t.replace("<div ", `<div id="cyc${i}" `)).join("\n")}
     <script>${js}</script>${infraScriptTags(root)}
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

// Независимый от движка признак «шаг M внутри тела блока строки L» — отступы: тело —
// строки с отступом глубже заголовка. Движок считает по парной скобке; способы обязаны сойтись.
const indentOf = (s) => s.match(/^\s*/)[0].length;
function insideByIndent(code, L, M) {
  if (M <= L) return false;
  for (let j = L + 1; j <= M; j++) if (code[j].trim() !== "" && indentOf(code[j]) <= indentOf(code[L])) return false;
  return true;
}
// 7) ключи ВСЕХ виджетов книги: каждый div.algo-viz из src/*.md строится со своими
// атрибутами, движок отдаёт вопросы и строки шагов (root.__algoPredict), и каждый ключ
// сверяется с отступами листинга.
async function keyMismatches() {
  const tags = [];
  for (const f of fs.readdirSync(path.join(root, "src")).filter((n) => n.endsWith(".md")).sort()) {
    for (const m of fs.readFileSync(path.join(root, "src", f), "utf8").matchAll(/<div class="algo-viz"[^>]*><\/div>/g)) tags.push({ f, tag: m[0] });
  }
  const d = new JSDOM(`<!DOCTYPE html><html><body>${tags.map((t, i) => t.tag.replace("<div ", `<div id="k${i}" `)).join("\n")}<script>${js}</script>${infraScriptTags(root)}</body></html>`, {
    runScripts: "dangerously", virtualConsole: vc, pretendToBeVisual: true, url: "http://localhost:3000/x.html",
  });
  const el = (i) => d.window.document.getElementById("k" + i);
  for (let t0 = Date.now(); tags.some((_, i) => !el(i).classList.contains("algo-viz--ready")) && Date.now() - t0 < 60000;) await new Promise((r) => setTimeout(r, 200));
  const bad = []; let asked = 0, widgets = 0;
  tags.forEach((t, i) => {
    const p = el(i).__algoPredict, type = t.tag.match(/data-viz="([^"]+)"/)[1];
    if (!p) { bad.push(`${t.f}: ${type} — движок не отдал __algoPredict`); return; }
    const ks = Object.keys(p.qs);
    if (ks.length) widgets++;
    for (const k of ks) {
      asked++;
      const q = p.qs[k], truth = insideByIndent(p.code, q.line, p.lines[+k + 1]);
      if (q.entered !== truth) bad.push(`${t.f}: ${type}, шаг ${+k + 1}, строка ${q.line + 1} «${p.code[q.line].trim()}» — ключ «${q.entered ? "да" : "нет"}», а следующий шаг (строка ${p.lines[+k + 1] + 1}) ${truth ? "внутри" : "вне"} тела`);
    }
  });
  d.window.close();
  return { bad, asked, widgets, total: tags.length };
}

// 8) вход в цикл: эталон — свой прогон Флойда со счётчиком шагов slow. До встречи slow
// делает t шагов, из них a — по хвосту, значит по кольцу он прошёл b = t − a.
function floydLengths(list, c) {
  const n = list.length;
  if (!(c >= 0 && c < n)) return null;
  const nx = (i) => (i === n - 1 ? c : i + 1);
  let slow = 0, fast = 0, t = 0;
  do { slow = nx(slow); fast = nx(nx(fast)); t++; } while (slow !== fast);
  return { a: c, b: t - c, L: n - c };
}
function cycleEntryMismatches() {
  const bad = new Set(); let runs = 0;
  cycTags.forEach((_, i) => {
    const at = () => doc.getElementById("cyc" + i);
    const presets = at().querySelectorAll(".algo-tp__preset").length; // первая кнопка — «пример главы»
    if (presets < 2) bad.add(`виджет ${i + 1}: кнопок граничных случаев ${presets} — пресеты не проверены`);
    for (let p = 0; p < presets; p++) {
      const btn = at().querySelectorAll(".algo-tp__preset")[p], label = btn.textContent;
      click(btn); // пресет перестраивает виджет на том же узле
      const el = at(), list = el.getAttribute("data-list").split(",").filter((x) => x.trim() !== "");
      const cyc = parseInt(el.getAttribute("data-cycle"), 10), want = floydLengths(list, cyc), name = `виджет ${i + 1}, «${label}» [${list.join(",")} | цикл с ${cyc}]`;
      if (want && !(want.b >= 0 && want.b <= want.L && (want.a + want.b) % want.L === 0)) bad.add(`${name}: эталон сломан — a = ${want.a}, b = ${want.b}, L = ${want.L}`);
      const total = +el.querySelector(".algo-viz__counter").textContent.match(/\/\s*(\d+)/)[1];
      const seen = { "строка шага": 0, "подпись под рисунком": 0 };
      for (let k = 1; ; k++) {
        [["строка шага", ".algo-tp__stattext"], ["подпись под рисунком", ".algo-tp__rhonote"]].forEach(([where, sel]) => {
          const m = ((el.querySelector(sel) || {}).textContent || "").match(/\ba = (\d+).*?\bb = (\d+).*?\bL = (\d+)/);
          if (!m) return;
          seen[where]++;
          if (!want) bad.add(`${name}, ${where}: цикла нет, а числа a, b, L напечатаны`);
          else if (+m[1] !== want.a || +m[2] !== want.b || +m[3] !== want.L) bad.add(`${name}, ${where}: a = ${m[1]}, b = ${m[2]}, L = ${m[3]} — а slow прошёл по кольцу ${want.b} из ${want.L} (a = ${want.a})`);
        });
        if (k >= total) break;
        next(el);
      }
      if (want) Object.keys(seen).forEach((where) => { if (!seen[where]) bad.add(`${name}, ${where}: числа a, b, L не напечатаны ни на одном шаге`); });
      runs++;
    }
  });
  return { bad: [...bad], runs };
}

setTimeout(async () => {
  const keys = await keyMismatches();
  keys.bad.forEach((b) => fails.push("ключ: " + b));
  expect(keys.asked > 0, "ключи: в главах не нашлось ни одного вопроса 🎯 — сверка пуста");

  // до включения режима: с 🎯 «›» вставал бы на вопросах
  const cyc = cycleEntryMismatches();
  cyc.bad.forEach((b) => fails.push("вход в цикл: " + b));

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
    // правда о развилке — по следующему шагу: вошли ли в тело блока
    expect(activeLine(el) === qLine, `шаг развилки подсвечивает строку ${activeLine(el) + 1}, а спрашивали про ${qLine + 1}`);
    next(el); // следующий шаг (если он сам вопрос — это следующая итерация цикла)
    if (pending(el)) { // шаг L+1 тоже развилка: правда видна на нём — подсветку сверим после ответа
      continue;
    }
    const entered = insideByIndent(el.__algoPredict.code, qLine, activeLine(el));
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
  console.log(`✅ predict-check: без режима листается как раньше; с 🎯 на развилках «›» ждёт ответа, ответ сверяется со следующим шагом (${asked} вопросов: ${right} верно, ${wrong} промахов записано), счёт и промахи сходятся, автопроигрывание встаёт на вопросе, у виджета без развилок кнопка выключена; ключи ${keys.asked} вопросов у ${keys.widgets} виджетов (построено ${keys.total}) сверены по отступам; a, b, L входа в цикл сошлись со своим прогоном Флойда на ${cyc.runs} входах`);
  process.exit(0);
}, 400);
