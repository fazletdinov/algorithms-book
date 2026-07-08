#!/usr/bin/env node
// Смоук-тест ПОВЕДЕНИЯ challenge.js в jsdom (запускать из корня):
//  - choice перемешивает варианты (позиция правильного не подсказывает ответ);
//  - promах у predict/cloze/ordering НЕ спойлерит разбор; после 2-й неудачи
//    появляется кнопка «Показать разбор»;
//  - нормализация: кириллические двойники латиницы (О в O(1)), пробелы-разряды
//    в числах («1 048 576»), русские слова-ответы.
// Требует jsdom (в CI ставится npm install --no-save jsdom).
const { JSDOM } = require("jsdom");
const fs = require("fs");
const path = require("path");

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

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
