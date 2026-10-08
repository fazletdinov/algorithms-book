#!/usr/bin/env node
// Headless smoke трекера прогресса (assets/progress.js) через jsdom.
//
//   node scripts/progress-render-check.js
//
// Трекер — единственный виджет, у которого нет ни data-атрибутов в главе (его
// содержимое целиком зашито в JS), ни разбора в check-viz.js. Поэтому здесь
// проверяется его поведение, а не разметка:
//   1) отрисовались ВСЕ главы из GROUPS и заголовок каждой группы со счётчиком;
//   2) отметка главы обновляет общий процент, счётчик своей группы и localStorage;
//   3) состояние ключуется по href (перегруппировка глав не сбрасывает отметки);
//   4) «Сбросить прогресс» действительно всё снимает;
//   5) отметка пишет algoProgressAt[href] (метку события для srs.js), снятие её убирает,
//      сброс очищает.
// Состав списка сверяет с книгой отдельный scripts/check-registries.js.
// Если jsdom не найден — мягкий пропуск (exit 0), как в viz-render-check.js.
"use strict";
const fs = require("fs");
const path = require("path");

let JSDOM, VirtualConsole;
try {
  ({ JSDOM, VirtualConsole } = require("jsdom"));
} catch (e) {
  console.log("⏭  progress-render-check: jsdom не установлен — пропускаю (npm i jsdom).");
  process.exit(0);
}

const root = path.resolve(__dirname, "..");
const js = fs.readFileSync(path.join(root, "assets", "progress.js"), "utf8");

const errors = [];
const vc = new VirtualConsole();
vc.on("jsdomError", (e) => errors.push("jsdomError: " + (e && e.message)));
vc.on("error", (...a) => errors.push("console.error: " + a.join(" ")));

const dom = new JSDOM(
  `<!DOCTYPE html><html><body><div class="algo-progress"></div><script>${js}</script></body></html>`,
  { runScripts: "dangerously", virtualConsole: vc, url: "https://example.test/cheatsheet.html" }
);
const { document: doc, localStorage } = dom.window;

// progress.js строится по DOMContentLoaded — в jsdom он асинхронный, поэтому
// проверки идут в следующем такте (тот же приём, что в viz-render-check.js).
setTimeout(function () {
  const el = doc.querySelector(".algo-progress");

  const items = [...el.querySelectorAll(".algo-prog__item")];
  const groups = [...el.querySelectorAll(".algo-prog__group")];
  const label = el.querySelector(".algo-prog__label");
  const bar = el.querySelector(".algo-prog__bar");

  // сколько глав и групп объявлено в самом файле — сверяем с тем, что построилось
  const declaredChapters = [...js.matchAll(/h:\s*"([\w-]+)\.html"/g)].map((m) => m[1]);
  const declaredGroups = [...js.matchAll(/\{\s*g:\s*"/g)].length;
  // уровни маршрута: процент считается ТОЛЬКО по ядру, см. progress.js
  const declaredLevels = [...js.matchAll(/h:\s*"([\w-]+)\.html",\s*lvl:\s*"(\w+)"/g)].map((m) => ({
    h: m[1],
    lvl: m[2],
  }));
  if (declaredLevels.length !== declaredChapters.length) {
    errors.push(
      `у ${declaredChapters.length - declaredLevels.length} глав в GROUPS нет поля lvl — ` +
        `такая глава выпадет из счёта по ядру`
    );
  }
  const core = declaredLevels.filter((d) => d.lvl === "core");
  const nonCore = declaredLevels.filter((d) => d.lvl !== "core");
  if (!core.length) {
    errors.push("в GROUPS не осталось ни одной главы ядра — процент будет делиться на ноль");
  }

  if (items.length !== declaredChapters.length) {
    errors.push(`отрисовано ${items.length} глав, в GROUPS объявлено ${declaredChapters.length}`);
  }
  if (groups.length !== declaredGroups) {
    errors.push(`отрисовано ${groups.length} заголовков групп, в GROUPS объявлено ${declaredGroups}`);
  }
  if (!groups.every((g) => /\d+\s*\/\s*\d+/.test(g.textContent))) {
    errors.push("не у каждого заголовка группы есть счётчик вида «0 / 7»");
  }
  if (!label || !new RegExp(`0\\s*/\\s*${core.length}\\s*\\(0%\\)`).test(label.textContent)) {
    errors.push(
      `стартовая подпись неожиданная: «${label ? label.textContent : "нет .algo-prog__label"}», ` +
        `ожидалось «0 / ${core.length} (0%)» — процент считается по ядру`
    );
  }
  // метка уровня стоит у всех глав вне ядра и ни у одной главы ядра
  const badges = [...el.querySelectorAll(".algo-prog__item .algo-lvl")];
  if (badges.length !== nonCore.length) {
    errors.push(`меток уровня отрисовано ${badges.length}, глав вне ядра ${nonCore.length}`);
  }
  const links = [...el.querySelectorAll(".algo-prog__link")];
  if (links.some((a) => !/^[\w-]+\.html$/.test(a.getAttribute("href")))) {
    errors.push("есть ссылка на главу с href не вида «chapter.html»");
  }
  if (new Set(declaredChapters).size !== declaredChapters.length) {
    errors.push("в GROUPS есть дубли глав — процент будет считаться неверно");
  }

  const counters = () => groups.map((g) => g.querySelector(".algo-prog__groupcount").textContent);
  const mark = (i) => {
    const cb = items[i].querySelector("input");
    cb.checked = true;
    cb.dispatchEvent(new dom.window.Event("change"));
  };

  // --- глава ВНЕ ядра не двигает процент: ради этого всё и затевалось ---
  // Именно ext/ref, а не «любая не из ядра»: первая такая в списке — инструмент
  // (tool), а инструменты не входят и в строку «Расширение / Справочник», так
  // что проверка ниже на нём провалилась бы при верном трекере.
  const idxNonCore = declaredLevels.findIndex((d) => d.lvl === "ext" || d.lvl === "ref");
  const idxCore = declaredLevels.findIndex((d) => d.lvl === "core");
  const asideBefore = el.querySelector(".algo-prog__aside").textContent;
  mark(idxNonCore);
  if (!new RegExp(`0\\s*/\\s*${core.length}`).test(label.textContent)) {
    errors.push(
      `отметка главы вне ядра сдвинула процент: «${label.textContent}» — ` +
        `в процент должно идти только ядро`
    );
  }
  if (el.querySelector(".algo-prog__aside").textContent === asideBefore) {
    errors.push("отметка главы вне ядра не изменила строку «Расширение / Справочник»");
  }

  // --- отметка главы ЯДРА: процент, счётчик группы и localStorage ---
  const countersBefore = counters();
  mark(idxCore);

  const oneOf = `1 / ${core.length}`;
  if (!label.textContent.includes(oneOf)) {
    errors.push(`после отметки главы ядра подпись = «${label.textContent}», ожидалось «${oneOf}»`);
  }
  if (counters().every((c, i) => c === countersBefore[i])) {
    errors.push("счётчик группы не изменился после отметки главы из этой группы");
  }
  if (!items[idxCore].classList.contains("algo-prog__item--done")) {
    errors.push("отмеченная глава не получила класс algo-prog__item--done");
  }
  if (!/^[1-9]/.test(bar.style.width)) {
    errors.push(`ширина полосы после отметки = «${bar.style.width}», ожидалось > 0`);
  }

  const stored = JSON.parse(localStorage.getItem("algoProgress") || "{}");
  const coreHref = links[idxCore].getAttribute("href");
  if (stored[coreHref] !== true) {
    errors.push(`состояние в localStorage ключуется не по href: ${JSON.stringify(stored)}`);
  }

  // --- метка времени отметки: по ней srs.js считает срок карточки главы от события ---
  const marks = () => JSON.parse(localStorage.getItem("algoProgressAt") || "{}");
  if (typeof marks()[coreHref] !== "number" || Math.abs(marks()[coreHref] - Date.now()) > 60 * 1000) {
    errors.push(`отметка главы не записала метку algoProgressAt[${coreHref}]: ${JSON.stringify(marks())}`);
  }
  if (typeof marks()[declaredLevels[idxNonCore].h + ".html"] !== "number") {
    errors.push("метка пишется только у глав ядра — у остальных она нужна так же");
  }
  // снятие галочки убирает метку (algoProgress остаётся false: сама карточка из srs.js не удаляется)
  const cbCore = items[idxCore].querySelector("input");
  cbCore.checked = false;
  cbCore.dispatchEvent(new dom.window.Event("change"));
  if (coreHref in marks()) errors.push(`снятие отметки не убрало метку: ${JSON.stringify(marks())}`);
  if (JSON.parse(localStorage.getItem("algoProgress"))[coreHref] !== false) errors.push("снятие отметки не записало false в algoProgress");
  // повторная отметка — новая метка, не старая
  mark(idxCore);
  if (typeof marks()[coreHref] !== "number") errors.push("повторная отметка не записала метку заново");

  // --- вторая вкладка: чужая отметка, появившаяся в хранилище после загрузки этой страницы,
  // переживает клик — обработчик галочки читает algoProgress заново, а не пишет устаревшее state ---
  const idxOther = declaredLevels.findIndex((d, i) => d.lvl === "core" && i !== idxCore);
  const idxThird = declaredLevels.findIndex((d, i) => d.lvl === "core" && i !== idxCore && i !== idxOther);
  const hrefOther = links[idxOther].getAttribute("href");
  const hrefThird = links[idxThird].getAttribute("href");
  localStorage.setItem("algoProgress", JSON.stringify({ [coreHref]: true, [hrefOther]: true })); // как из другой вкладки
  mark(idxThird);
  const afterForeign = JSON.parse(localStorage.getItem("algoProgress"));
  if (afterForeign[hrefOther] !== true || afterForeign[coreHref] !== true || afterForeign[hrefThird] !== true) {
    errors.push(`отметка затёрла чужую: algoProgress = ${JSON.stringify(afterForeign)}`);
  }
  if (!items[idxOther].querySelector("input").checked) errors.push("чужая отметка не показана галочкой после клика");
  if (!label.textContent.includes(`3 / ${core.length}`)) errors.push(`процент не по свежему состоянию: «${label.textContent}», ожидалось 3 / ${core.length}`);
  // снятие галочки тоже не трогает чужое
  localStorage.setItem("algoProgress", JSON.stringify({ [coreHref]: true, [hrefOther]: true, [hrefThird]: true, "chapter-from-other-tab.html": true }));
  items[idxThird].querySelector("input").checked = false;
  items[idxThird].querySelector("input").dispatchEvent(new dom.window.Event("change"));
  const afterUncheck = JSON.parse(localStorage.getItem("algoProgress"));
  if (afterUncheck["chapter-from-other-tab.html"] !== true || afterUncheck[hrefOther] !== true || afterUncheck[hrefThird] !== false) {
    errors.push(`снятие отметки затёрло чужое: algoProgress = ${JSON.stringify(afterUncheck)}`);
  }

  // --- сброс ---
  const reset = [...el.querySelectorAll("button")].find((b) => /Сбросить/.test(b.textContent));
  if (!reset) {
    errors.push("нет кнопки «Сбросить прогресс»");
  } else {
    reset.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    if (!new RegExp(`0\\s*/\\s*${core.length}\\s*\\(0%\\)`).test(label.textContent)) {
      errors.push(`после сброса подпись = «${label.textContent}», ожидалось 0%`);
    }
    if (items.some((i) => i.querySelector("input").checked)) {
      errors.push("после сброса остались отмеченные главы");
    }
    if (Object.keys(marks()).length) errors.push(`после сброса остались метки времени: ${JSON.stringify(marks())}`);
  }

  if (errors.length) {
    console.error(`❌ progress-render-check: ${errors.length} проблем(ы):`);
    for (const e of errors) console.error("  - " + e);
    process.exit(1);
  }
  console.log(
    `✅ progress-render-check: трекер строит ${items.length} глав в ${groups.length} группах ` +
      `(ядро ${core.length}, вне ядра ${nonCore.length}), процент считается только по ядру, ` +
      `отметка обновляет счётчик группы/localStorage и пишет метку времени, снятие её убирает, сброс работает`
  );
}, 200);
