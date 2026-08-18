#!/usr/bin/env node
// Headless smoke режима «объясни сам» (assets/explain.js) — на СОБРАННОЙ странице
// главы, а не на синтетическом HTML: разметка вопросов и эталонов живёт в
// src/*.md и проходит через mdBook, поэтому проверять её надо после сборки.
//
//   mdbook build && node scripts/explain-check.js
//
// Проверяется то, ради чего виджет существует:
//   1) эталон СКРЫТ, пока читатель не написал свой ответ (иначе весь смысл теряется);
//   2) гейт открывается, только когда заполнены ВСЕ поля;
//   3) ответы сохраняются в localStorage;
//   4) самооценка пишет algoExplainDone — источник карточек для srs.js;
//   5) при повторном заходе поле пустое, а прошлый ответ спрятан за кнопкой.
// Если jsdom не найден — мягкий пропуск (exit 0), как в остальных смоуках.
"use strict";
const fs = require("fs");
const path = require("path");

let JSDOM, VirtualConsole;
try {
  ({ JSDOM, VirtualConsole } = require("jsdom"));
} catch (e) {
  console.log("⏭  explain-check: jsdom не установлен — пропускаю (npm i jsdom).");
  process.exit(0);
}

const root = path.resolve(__dirname, "..");
const page = path.join(root, "book", "sliding-window.html");
if (!fs.existsSync(page)) {
  console.error("❌ explain-check: нет book/sliding-window.html — сначала `mdbook build`.");
  process.exit(1);
}
const html = fs.readFileSync(page, "utf8");
const explainJs = fs.readFileSync(path.join(root, "assets", "explain.js"), "utf8");

const errors = [];
const vc = new VirtualConsole();
// Собственные скрипты mdBook в jsdom шумят (matchMedia и т.п.) — нас интересует
// только наш виджет, поэтому чужой шум не собираем.
vc.on("jsdomError", () => {});

function boot(seed) {
  return new Promise((resolve) => {
    const dom = new JSDOM(html, { runScripts: "dangerously", virtualConsole: vc, url: "https://example.test/sliding-window.html" });
    dom.window.addEventListener("load", () => {
      Object.keys(seed).forEach((k) => dom.window.localStorage.setItem(k, seed[k]));
      const s = dom.window.document.createElement("script");
      s.textContent = explainJs;
      dom.window.document.body.appendChild(s);
      resolve(dom);
    });
  });
}

const type = (dom, ta, text) => {
  ta.value = text;
  ta.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
};
const btn = (dom, label) =>
  [...dom.window.document.querySelectorAll("button")].find((b) => b.textContent === label);

async function main() {
  // --- первый заход ---
  const dom = await boot({});
  const doc = dom.window.document;
  const widget = doc.querySelector(".algo-explain");
  if (!widget) {
    errors.push("виджет .algo-explain не найден на собранной странице");
    return finish();
  }

  const areas = [...widget.querySelectorAll("textarea")];
  const refs = [...widget.querySelectorAll(".algo-explain__refbox")];
  const reveal = btn(dom, "Сверить с книгой");

  if (areas.length < 2) errors.push(`полей для ответа ${areas.length}, ожидалось ≥ 2`);
  if (refs.length !== areas.length) errors.push(`эталонов ${refs.length}, полей ${areas.length}`);
  if (refs.some((r) => !r.hidden)) errors.push("эталон виден ДО ответа — весь смысл режима теряется");
  if (!reveal) errors.push("нет кнопки «Сверить с книгой»");
  else if (!reveal.disabled) errors.push("кнопка сверки активна при пустых полях");

  // заполняем все, кроме последнего — гейт должен держать
  areas.slice(0, -1).forEach((ta) => type(dom, ta, "монотонность левой границы окна"));
  if (reveal && !reveal.disabled) errors.push("гейт открылся, хотя одно поле ещё пустое");
  const hint = widget.querySelector(".algo-explain__hint");
  if (hint && !/осталось ответить: 1/.test(hint.textContent)) {
    errors.push(`подсказка о незаполненных полях: «${hint ? hint.textContent : ""}»`);
  }

  type(dom, areas[areas.length - 1], "left только растёт, поэтому суммарно n шагов");
  if (reveal && reveal.disabled) errors.push("гейт не открылся при всех заполненных полях");

  // запись в localStorage намеренно отложена (debounce 400мс), чтобы не дёргать
  // хранилище на каждое нажатие клавиши — ждём чуть дольше
  await new Promise((r) => setTimeout(r, 600));
  const stored = JSON.parse(dom.window.localStorage.getItem("algoExplain") || "{}");
  if (!stored["sliding-window"] || stored["sliding-window"].a.length !== areas.length) {
    errors.push(`ответы не сохранились: ${JSON.stringify(stored)}`);
  }

  reveal.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
  if (refs.some((r) => r.hidden)) errors.push("после сверки эталоны всё ещё скрыты");
  const refText = refs[0].textContent;
  if (!/монотон/i.test(refText)) errors.push(`в эталоне не видно формулировки книги: «${refText.slice(0, 60)}»`);

  const partial = btn(dom, "Частично");
  if (!partial) {
    errors.push("после сверки не появилась самооценка");
  } else {
    partial.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    const done = JSON.parse(dom.window.localStorage.getItem("algoExplainDone") || "{}");
    if (!done["sliding-window"] || done["sliding-window"].grade !== "hard") {
      errors.push(`самооценка не записана: ${JSON.stringify(done)}`);
    }
  }

  // --- повторный заход: поле пустое, прошлый ответ спрятан ---
  const again = await boot({
    algoExplain: dom.window.localStorage.getItem("algoExplain"),
    algoExplainDone: dom.window.localStorage.getItem("algoExplainDone"),
  });
  const w2 = again.window.document.querySelector(".algo-explain");
  const areas2 = [...w2.querySelectorAll("textarea")];
  if (areas2.some((ta) => ta.value !== "")) {
    errors.push("при повторном заходе поле предзаполнено прошлым ответом — воспроизведения не будет");
  }
  const prevBtn = btn(again, "показать мою прошлую формулировку");
  if (!prevBtn) {
    errors.push("при повторном заходе нет кнопки «показать мою прошлую формулировку»");
  } else {
    const prev = w2.querySelector(".algo-explain__prev");
    if (!prev || !prev.hidden) errors.push("прошлая формулировка показана сразу, а не по кнопке");
    prevBtn.dispatchEvent(new again.window.MouseEvent("click", { bubbles: true }));
    if (prev.hidden) errors.push("кнопка не раскрывает прошлую формулировку");
    if (!/монотонность/.test(prev.textContent)) errors.push("в прошлой формулировке не тот текст");
  }

  finish();
}

function finish() {
  if (errors.length) {
    console.error(`❌ explain-check: ${errors.length} проблем(ы):`);
    for (const e of errors) console.error("  - " + e);
    process.exit(1);
  }
  console.log(
    "✅ explain-check: эталон скрыт до ответа, гейт держит незаполненные поля, ответы и самооценка сохраняются, " +
      "при повторе поле пустое, а прошлый ответ — под кнопкой"
  );
}

main().catch((e) => {
  console.error("❌ explain-check: неожиданная ошибка:", e);
  process.exit(1);
});
