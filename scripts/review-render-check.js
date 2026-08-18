#!/usr/bin/env node
// Headless smoke связки «промах в главе → список повторить → экспорт/импорт».
//
//   node scripts/review-render-check.js
//
// Проверяется сквозной сценарий, а не отдельные функции, потому что ломается
// обычно именно стык: раньше challenge.js писал прогресс по data-id, которого
// нет ни в одной главе, — виджеты работали, тесты были зелёные, а в
// localStorage не попадало НИЧЕГО. Здесь:
//   1) промах в задаче попадает в algoChallengeMissed с текстом и якорем;
//   2) верный ответ помечает задачу решённой и убирает её из промахов;
//   3) review.js показывает только непройденное, с ссылкой на конкретную задачу;
//   4) экспорт собирает все ключи книги, импорт вливает их СЛИЯНИЕМ.
// Если jsdom не найден — мягкий пропуск (exit 0), как в остальных смоуках.
"use strict";
const fs = require("fs");
const path = require("path");

let JSDOM, VirtualConsole;
try {
  ({ JSDOM, VirtualConsole } = require("jsdom"));
} catch (e) {
  console.log("⏭  review-render-check: jsdom не установлен — пропускаю (npm i jsdom).");
  process.exit(0);
}

const root = path.resolve(__dirname, "..");
const challengeJs = fs.readFileSync(path.join(root, "assets", "challenge.js"), "utf8");
const reviewJs = fs.readFileSync(path.join(root, "assets", "review.js"), "utf8");
const progressJs = fs.readFileSync(path.join(root, "assets", "progress.js"), "utf8");

const errors = [];
const vc = new VirtualConsole();
vc.on("jsdomError", (e) => errors.push("jsdomError: " + (e && e.message)));
vc.on("error", (...a) => errors.push("console.error: " + a.join(" ")));

// --- шаг 1: глава с двумя задачами, одну проваливаем, вторую решаем ---
const chapter = `<!DOCTYPE html><html><body>
<div class="algo-challenge" data-type="predict" data-answer="12" data-explain="разбор">
  <div class="algo-challenge__q">Что вернёт gcd(48, 36)?</div>
</div>
<div class="algo-challenge" data-type="predict" data-answer="7" data-explain="разбор">
  <div class="algo-challenge__q">Сколько шагов сделает бинарный поиск?</div>
</div>
<script>${challengeJs}</script></body></html>`;

const dom = new JSDOM(chapter, {
  runScripts: "dangerously",
  virtualConsole: vc,
  url: "https://example.test/number-theory.html",
});

setTimeout(() => {
  const { document: doc, localStorage } = dom.window;
  const widgets = [...doc.querySelectorAll(".algo-challenge")];

  if (widgets.length !== 2) errors.push(`ожидались 2 задачи, отрисовано ${widgets.length}`);
  if (!widgets.every((w) => w.id)) errors.push("не у каждой задачи появился якорь (id)");

  const answer = (w, value) => {
    const input = w.querySelector("input");
    const btn = [...w.querySelectorAll("button")].find((b) => !b.classList.contains("algo-challenge__hintbtn"));
    if (!input || !btn) {
      errors.push("в задаче не нашлось поля ввода и кнопки проверки");
      return;
    }
    input.value = value;
    btn.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
  };

  answer(widgets[0], "999"); // промах
  answer(widgets[1], "7"); // верно

  const missed = JSON.parse(localStorage.getItem("algoChallengeMissed") || "{}");
  const solved = JSON.parse(localStorage.getItem("algoChallengeSolved") || "{}");

  const missedIds = Object.keys(missed);
  if (missedIds.length !== 1) {
    errors.push(`в промахах ${missedIds.length} записей, ожидалась 1: ${JSON.stringify(missed)}`);
  } else {
    const rec = missed[missedIds[0]];
    if (!/number-theory/.test(missedIds[0])) errors.push(`id промаха не содержит главу: ${missedIds[0]}`);
    if (!/gcd/i.test(rec.q || "")) errors.push(`в промахе не сохранился текст задачи: ${JSON.stringify(rec)}`);
    if (!rec.anchor) errors.push("в промахе не сохранился якорь задачи");
    if (rec.page !== "number-theory") errors.push(`page промаха = ${rec.page}, ожидалось number-theory`);
  }
  if (Object.keys(solved).length !== 1) {
    errors.push(`решённых ${Object.keys(solved).length}, ожидалась 1`);
  }

  // повторный верный ответ на ту же задачу должен УБРАТЬ её из промахов
  answer(widgets[0], "12");
  const missedAfter = JSON.parse(localStorage.getItem("algoChallengeMissed") || "{}");
  if (Object.keys(missedAfter).length !== 0) {
    errors.push("решённая задача не ушла из списка промахов");
  }

  // --- шаг 2: список «повторить» на этих данных ---
  // id берём ДРУГИЕ, не решённые выше: решённые review.js обязан отфильтровать
  // (это проверяется отдельно — см. «решённая задача не ушла из списка»).
  localStorage.setItem(
    "algoChallengeMissed",
    JSON.stringify({
      "number-theory#5": { n: 3, page: "number-theory", anchor: "task-5", q: "Что вернёт gcd(48, 36)?" },
      "big-o#4": { n: 1, page: "big-o", anchor: "task-4", q: "Сколько копий сделает append?" },
    })
  );
  const storage = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    storage[k] = localStorage.getItem(k);
  }

  const reviewDom = new JSDOM(
    `<!DOCTYPE html><html><body><div class="algo-review"></div><script>${reviewJs}</script></body></html>`,
    { runScripts: "dangerously", virtualConsole: vc, url: "https://example.test/cheatsheet.html" }
  );
  Object.keys(storage).forEach((k) => reviewDom.window.localStorage.setItem(k, storage[k]));
  reviewDom.window.document.querySelector(".algo-review").classList.remove("algo-review--ready");
  // повторная инициализация после подстановки данных
  reviewDom.window.eval(reviewJs);

  setTimeout(() => {
    const rdoc = reviewDom.window.document;
    const box = rdoc.querySelector(".algo-review");
    const items = [...rdoc.querySelectorAll(".algo-review__item")];
    const chapters = [...rdoc.querySelectorAll(".algo-review__chapter")];
    if (items.length !== 2) errors.push(`в списке повторения ${items.length} задач, ожидалось 2`);
    if (chapters.length !== 2) errors.push(`в списке повторения ${chapters.length} глав, ожидалось 2`);
    if (!/Осталось повторить: 2/.test(box.textContent)) {
      errors.push(`заголовок списка: «${box.textContent.slice(0, 60)}»`);
    }
    const links = [...rdoc.querySelectorAll(".algo-review__q")].map((a) => a.getAttribute("href"));
    if (!links.some((h) => /number-theory\.html#task-5$/.test(h))) {
      errors.push(`нет ссылки на конкретную задачу: ${JSON.stringify(links)}`);
    }

    // --- шаг 3: экспорт/импорт в трекере ---
    const progDom = new JSDOM(
      `<!DOCTYPE html><html><body><div class="algo-progress"></div><script>${progressJs}</script></body></html>`,
      { runScripts: "dangerously", virtualConsole: vc, url: "https://example.test/cheatsheet.html" }
    );
    setTimeout(() => {
      const pdoc = progDom.window.document;
      const buttons = [...pdoc.querySelectorAll("button")].map((b) => b.textContent);
      if (!buttons.some((t) => /Экспорт/.test(t))) errors.push("в трекере нет кнопки экспорта");
      if (!buttons.some((t) => /Импорт/.test(t))) errors.push("в трекере нет кнопки импорта");

      // импорт: подкладываем дамп с чужой машины и проверяем СЛИЯНИЕ
      const pls = progDom.window.localStorage;
      pls.setItem("algoProgress", JSON.stringify({ "sliding-window.html": true }));
      const dump = {
        kind: "algorithms-book-progress",
        version: 1,
        data: {
          algoProgress: JSON.stringify({ "big-o.html": true }),
          algoQuizBest: "40/57",
        },
      };
      const importInput = pdoc.querySelector('input[type="file"]');
      if (!importInput) {
        errors.push("в трекере нет поля выбора файла для импорта");
        finish();
        return;
      }
      // подменяем FileReader: jsdom не даёт собрать настоящий File из строки
      progDom.window.FileReader = function () {
        this.readAsText = function () {
          this.result = JSON.stringify(dump);
          this.onload();
        };
      };
      Object.defineProperty(importInput, "files", { value: [{ name: "p.json" }], configurable: true });
      importInput.onchange();

      const merged = JSON.parse(pls.getItem("algoProgress"));
      if (!merged["sliding-window.html"] || !merged["big-o.html"]) {
        errors.push(`импорт не слил прогресс, а заменил: ${JSON.stringify(merged)}`);
      }
      if (pls.getItem("algoQuizBest") !== "40/57") errors.push("импорт не перенёс рекорд квиза");
      const label = pdoc.querySelector(".algo-prog__label").textContent;
      if (!/2 \/ \d+/.test(label)) errors.push(`после импорта подпись трекера = «${label}»`);
      finish();
    }, 200);
  }, 200);

  function finish() {
    if (errors.length) {
      console.error(`❌ review-render-check: ${errors.length} проблем(ы):`);
      for (const e of errors) console.error("  - " + e);
      process.exit(1);
    }
    console.log(
      "✅ review-render-check: промах сохраняется с текстом и якорем, решение убирает его из списка, " +
        "«повторить» показывает непройденное с ссылками, экспорт/импорт сливают прогресс"
    );
  }
}, 200);
