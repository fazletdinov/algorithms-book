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
//      сброс очищает;
//   6) галочка «Глава пройдена» в конце главы: есть на странице главы (ядро, расширение) и
//      только там — ни у инструментов, ни на print.html; пишет те же ключи по свежему чтению,
//      зовёт ALGO_SRS.sync(), слышит трекер другой вкладки, без хранилища не выдаёт отметку
//      за сохранённую.
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
const srsJs = fs.readFileSync(path.join(root, "assets", "srs.js"), "utf8");

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

  // --- хранилище недоступно (чтение бросает): отметки живут в памяти вкладки, а не обнуляются.
  // Раньше load() отдавал {}, и клик по второй главе снимал галочку с первой ---
  const idx4 = declaredLevels.findIndex((d, i) => d.lvl === "core" && ![idxCore, idxOther, idxThird].includes(i));
  const idx5 = declaredLevels.findIndex((d, i) => d.lvl === "core" && ![idxCore, idxOther, idxThird, idx4].includes(i));
  const proto = dom.window.Storage.prototype, origGet = proto.getItem;
  proto.getItem = function () { throw new Error("SecurityError"); };
  try {
    mark(idx4);
    mark(idx5);
  } finally {
    proto.getItem = origGet;
  }
  for (const [i, what] of [[idxCore, "первая отметка до отказа чтения"], [idxOther, "вторая отметка до отказа чтения"], [idx4, "отметка при недоступном хранилище"], [idx5, "вторая отметка при недоступном хранилище"]]) {
    if (!items[i].querySelector("input").checked) errors.push(`при недоступном чтении потеряна галочка: ${what}`);
  }
  if (!label.textContent.includes(`4 / ${core.length}`)) errors.push(`при недоступном чтении процент «${label.textContent}», ожидалось 4 / ${core.length}`);

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

  // --- отметка, сделанная в другой вкладке (галочка в конце главы), доходит до открытого трекера ---
  localStorage.setItem("algoProgress", JSON.stringify({ [coreHref]: true }));
  dom.window.dispatchEvent(new dom.window.StorageEvent("storage", { key: "algoQuizBest" }));
  if (items[idxCore].querySelector("input").checked) errors.push("storage по чужому ключу перечитал отметки трекера");
  dom.window.dispatchEvent(new dom.window.StorageEvent("storage", { key: "algoProgress" }));
  if (!items[idxCore].querySelector("input").checked || !label.textContent.includes(`1 / ${core.length}`)) {
    errors.push(`storage: отметка из другой вкладки не показана в трекере: «${label.textContent}»`);
  }

  chapterDoneChecks().then(function () { return tocChecks(declaredLevels); }).then(function () {
    if (errors.length) {
      console.error(`❌ progress-render-check: ${errors.length} проблем(ы):`);
      for (const e of errors) console.error("  - " + e);
      process.exit(1);
    }
    console.log(
      `✅ progress-render-check: трекер строит ${items.length} глав в ${groups.length} группах ` +
        `(ядро ${core.length}, вне ядра ${nonCore.length}), процент считается только по ядру, ` +
        `отметка обновляет счётчик группы/localStorage и пишет метку времени, снятие её убирает, сброс работает; ` +
        `галочка «Глава пройдена» стоит в конце каждой главы (и только главы), пишет те же ключи по свежему чтению, ` +
        `зовёт sync и слышит другую вкладку; ссылки оглавления на главы ext/ref приглушены классом и подсказкой уровня, ` +
        `остальные не тронуты`
    );
    // явный выход: страницы с настоящим srs.js взводят таймер до местной полуночи и держали бы процесс
    process.exit(0);
  }, function (e) {
    console.error("❌ progress-render-check: неожиданная ошибка:", e);
    process.exit(1);
  });
}, 200);

// Страница так, как её собирает mdBook: скрипты стоят в конце body. before — скрипт до progress.js
// (подставной ALGO_SRS), srs — подключить настоящий srs.js после него (как в book.toml).
function pageDom(file, opts) {
  opts = opts || {};
  return new Promise(function (resolve) {
    const d = new JSDOM(
      `<!DOCTYPE html><html><body>${opts.menu || ""}<main><h1>Заголовок</h1><p>текст главы</p>${opts.main || ""}<p id="last">последний абзац</p></main>` +
        `<script>${opts.before || ""}</script><script>${js}</script>${opts.srs ? `<script>${srsJs}</script>` : ""}</body></html>`,
      {
        runScripts: "dangerously",
        virtualConsole: vc,
        url: "https://example.test/" + file,
        beforeParse(window) {
          Object.keys(opts.seed || {}).forEach((k) => window.localStorage.setItem(k, opts.seed[k]));
        },
      }
    );
    d.window.addEventListener("load", () => resolve(d));
  });
}

// Приглушённое оглавление: ссылки на главы ext/ref получают класс и подсказку из реестра уровней,
// ядро, инструменты и страницы вне реестра — ничего. Уровень берётся из GROUPS, второго списка нет.
async function tocChecks(declaredLevels) {
  const lvlOf = (h) => (declaredLevels.find((d) => d.h + ".html" === h) || {}).lvl;
  const hints = {};
  for (const m of js.matchAll(/(ext|ref|core|tool):\s*\{\s*badge:\s*"[^"]*",\s*hint:\s*"([^"]*)"/g)) hints[m[1]] = m[2];
  const sample = ["sliding-window.html", "deque-structure.html", "avl-tree-structure.html", "quiz.html", "glossary.html"];
  const want = { "sliding-window.html": "core", "deque-structure.html": "ext", "avl-tree-structure.html": "ref", "quiz.html": "tool" };
  for (const h of Object.keys(want)) {
    if (lvlOf(h) !== want[h]) errors.push(`образец оглавления устарел: ${h} теперь «${lvlOf(h)}», в проверке «${want[h]}»`);
  }
  if (lvlOf("glossary.html")) errors.push("образец «вне реестра» (glossary.html) попал в реестр — возьми другую страницу");
  const toc = (hrefs) =>
    '<mdbook-sidebar-scrollbox class="sidebar-scrollbox"><ol class="chapter">' +
    hrefs.map((h) => `<li class="chapter-item"><span class="chapter-link-wrapper"><a href="${h}"><strong aria-hidden="true">1.</strong> Название</a></span></li>`).join("") +
    "</ol></mdbook-sidebar-scrollbox>";

  const verify = (d, where) => {
    const doc = d.window.document;
    for (const h of sample) {
      const a = doc.querySelector(`.chapter a[href="${h}"]`);
      if (!a) { errors.push(`${where}: нет ссылки ${h}`); continue; }
      const lvl = lvlOf(h);
      const marked = lvl === "ext" || lvl === "ref";
      const classes = [...a.classList].filter((c) => c.startsWith("algo-toc"));
      if (marked) {
        if (classes.join() !== "algo-toc--" + lvl) errors.push(`${where}: у ${h} классы «${classes.join()}», ожидался algo-toc--${lvl}`);
        if (a.title !== hints[lvl] || !a.title) errors.push(`${where}: у ${h} title «${a.title}», ожидалась подсказка уровня ${lvl}`);
      } else {
        if (classes.length) errors.push(`${where}: ${h} (${lvl || "вне реестра"}) получила класс ${classes.join()}`);
        if (a.hasAttribute("title")) errors.push(`${where}: ${h} (${lvl || "вне реестра"}) получила title`);
      }
    }
  };

  // 1) оглавление уже на месте к DOMContentLoaded (так custom element mdBook и делает); повторный вызов не дублирует
  const d = await pageDom("sliding-window.html", { menu: toc(sample) });
  verify(d, "оглавление к загрузке");
  if (typeof d.window.ALGO_MARK_TOC !== "function") errors.push("window.ALGO_MARK_TOC не экспортирован");
  else {
    d.window.ALGO_MARK_TOC();
    verify(d, "повторный вызов");
    const a = d.window.document.querySelector('.chapter a[href="deque-structure.html"]');
    if (a.className.split(/\s+/).filter((c) => c === "algo-toc--ext").length !== 1) errors.push("повторный вызов задвоил класс");
  }

  // 2) оглавление вставлено ПОСЛЕ загрузки страницы (запас, если порядок скриптов изменится)
  const d2 = await pageDom("sliding-window.html", {});
  const holder = d2.window.document.createElement("div");
  holder.innerHTML = toc(sample);
  d2.window.document.body.appendChild(holder);
  await new Promise((r) => setTimeout(r, 100));
  verify(d2, "оглавление, вставленное позже");
  d.window.close();
  d2.window.close();

  // 3) ссылка с «./» и с якорем ведёт на тот же файл главы: markToc отрезает якорь и путь
  {
    const odd = { "./deque-structure.html": "ext", "avl-tree-structure.html#раздел": "ref", "./sliding-window.html#x": "" };
    const d3 = await pageDom("sliding-window.html", { menu: toc(Object.keys(odd)) });
    for (const h of Object.keys(odd)) {
      const a = d3.window.document.querySelector(`.chapter a[href="${h}"]`);
      const got = a ? [...a.classList].filter((c) => c.startsWith("algo-toc")).join() : "нет ссылки";
      const want = odd[h] ? "algo-toc--" + odd[h] : "";
      if (got !== want) errors.push(`оглавление: у ссылки ${h} классы «${got}», ожидалось «${want}»`);
    }
    d3.window.close();
  }

  // 4) наблюдатель: один, на коробке оглавления (а не на всём body, где меняется каждый виджет), и после
  //    разметки или срока отключается и забывается — повторный initToc без ссылок заводит новый, а не молчит.
  //    Подставной MutationObserver считает наблюдателей; таймер срока (5000 мс) перехватывается и зовётся руками.
  const spy =
    "window.__toc = { made: 0, active: 0, targets: [], timers: [] };" +
    "(function () { var MO = window.MutationObserver, s = window.__toc, st = window.setTimeout;" +
    "  window.MutationObserver = function (cb) { var o = new MO(cb), on = false; s.made++; return {" +
    "    observe: function (t, opt) { if (!on) { on = true; s.active++; } s.targets.push(t.tagName.toLowerCase()); o.observe(t, opt); }," +
    "    disconnect: function () { if (on) { on = false; s.active--; } o.disconnect(); } }; };" +
    "  window.setTimeout = function (fn, ms) { if (ms === 5000) { s.timers.push(fn); return 0; } return st.apply(window, arguments); };" +
    "})();";
  const fireTimers = (dd, where) => {
    const t = dd.window.__toc.timers.splice(0);
    for (const fn of t) {
      try { fn(); } catch (e) { errors.push(`${where}: срок наблюдателя бросил «${e.message}»`); }
    }
  };
  {
    // а) коробка оглавления есть, ссылки придут позже
    const d4 = await pageDom("sliding-window.html", { menu: '<mdbook-sidebar-scrollbox class="sidebar-scrollbox"></mdbook-sidebar-scrollbox>', before: spy });
    const s = d4.window.__toc;
    if (typeof d4.window.ALGO_INIT_TOC !== "function") errors.push("window.ALGO_INIT_TOC не экспортирован");
    else {
      if (s.targets.join() !== "mdbook-sidebar-scrollbox") errors.push(`наблюдатель оглавления смотрит на «${s.targets.join()}», ожидалась коробка mdbook-sidebar-scrollbox`);
      d4.window.ALGO_INIT_TOC();
      if (s.made !== 1 || s.active !== 1) errors.push(`повторный initToc до ссылок: наблюдателей заведено ${s.made}, активно ${s.active}, ожидался один`);
      d4.window.document.querySelector("mdbook-sidebar-scrollbox").innerHTML = toc(sample).replace(/<\/?mdbook-sidebar-scrollbox[^>]*>/g, "");
      await new Promise((r) => setTimeout(r, 50));
      verify(d4, "ссылки, пришедшие в пустую коробку");
      if (s.active !== 0) errors.push(`после разметки оглавления наблюдатель не отключился (активно ${s.active})`);
      d4.window.ALGO_INIT_TOC();
      if (s.made !== 1) errors.push(`повторный initToc после разметки завёл второй наблюдатель (заведено ${s.made})`);
      fireTimers(d4, "после разметки");
    }
    d4.window.close();

    // б) коробки нет вовсе — наблюдатель на body; срок вышел, ссылок нет — повторный initToc снова ждёт
    const d5 = await pageDom("sliding-window.html", { before: spy });
    const s5 = d5.window.__toc;
    if (s5.targets.join() !== "body") errors.push(`без коробки оглавления наблюдатель смотрит на «${s5.targets.join()}», ожидался body`);
    fireTimers(d5, "срок без ссылок");
    if (s5.active !== 0) errors.push(`по сроку наблюдатель не отключился (активно ${s5.active})`);
    if (typeof d5.window.ALGO_INIT_TOC === "function") {
      d5.window.ALGO_INIT_TOC();
      if (s5.made !== 2 || s5.active !== 1) errors.push(`после срока повторный initToc: заведено ${s5.made}, активно ${s5.active} — отключённый наблюдатель не забыт, ожидались 2 и 1`);
    }
    d5.window.close();
  }
}

// Галочка «Глава пройдена» в конце главы: тот же реестр и те же ключи, что у трекера.
async function chapterDoneChecks() {
  const blocks = (d) => d.window.document.querySelectorAll(".algo-chapdone");
  const read = (d, k) => JSON.parse(d.window.localStorage.getItem(k) || "{}");
  const toggle = (d, on) => {
    const cb = d.window.document.querySelector(".algo-chapdone input");
    if (!cb) {
      errors.push(`на ${d.window.location.pathname.slice(1)} нет галочки «Глава пройдена» — отметить нечем`);
      return;
    }
    cb.checked = on;
    cb.dispatchEvent(new d.window.Event("change", { bubbles: true }));
  };
  const SYNC_STUB = "window.__sync = 0; window.ALGO_SRS = { sync: function () { window.__sync++; return { cards: {}, created: [], removed: [] }; } };";
  const H = "sliding-window.html";

  // 1) глава ядра: блок один, в конце main; щелчок пишет оба ключа и зовёт sync
  const d = await pageDom(H, { before: SYNC_STUB });
  const w = d.window, doc = w.document, ls = w.localStorage;
  if (blocks(d).length !== 1) {
    errors.push(`на странице главы ${H} блоков «Глава пройдена»: ${blocks(d).length}, ожидался один`);
  } else {
    const b = blocks(d)[0];
    const cb = b.querySelector('input[type="checkbox"]');
    if (doc.querySelector("main").lastElementChild !== b) errors.push("блок «Глава пройдена» стоит не в конце main");
    if (!/Глава пройдена/.test(b.textContent)) errors.push(`в блоке нет подписи «Глава пройдена»: «${b.textContent}»`);
    // карточка главы приходит ровно через сутки после отметки (срок — метка + DAY), а не «на следующий день»
    if (!/новая карточка приходит через сутки/.test(b.textContent)) errors.push(`подсказка блока не говорит «через сутки»: «${b.textContent}»`);
    if (!cb || cb.checked) errors.push("галочка неотмеченной главы отсутствует или уже стоит");
    if (doc.querySelector(".algo-lvlnote")) errors.push("у главы ядра появилась плашка уровня");
    toggle(d, true);
    if (read(d, "algoProgress")[H] !== true) errors.push(`отметка в главе не записала algoProgress: ${ls.getItem("algoProgress")}`);
    const at = read(d, "algoProgressAt")[H];
    if (typeof at !== "number" || Math.abs(at - Date.now()) > 60 * 1000) errors.push(`отметка в главе не записала метку algoProgressAt: ${ls.getItem("algoProgressAt")}`);
    if (w.__sync !== 1) errors.push(`после отметки ALGO_SRS.sync вызван ${w.__sync} раз(а), ожидался один`);
    if (!b.classList.contains("algo-chapdone--done")) errors.push("отмеченный блок не получил класс algo-chapdone--done");
    // чужая отметка, появившаяся в хранилище после загрузки страницы, переживает щелчок здесь
    ls.setItem("algoProgress", JSON.stringify({ [H]: true, "big-o.html": true }));
    toggle(d, false);
    const after = read(d, "algoProgress");
    if (after["big-o.html"] !== true || after[H] !== false) errors.push(`снятие отметки в главе затёрло чужое или не записалось: ${JSON.stringify(after)}`);
    if (H in read(d, "algoProgressAt")) errors.push("снятие отметки в главе не убрало метку algoProgressAt");
    if (w.__sync !== 2) errors.push(`после снятия отметки ALGO_SRS.sync вызван ${w.__sync} раз(а), ожидалось два — иначе карточка главы остаётся в очереди`);
    if (b.classList.contains("algo-chapdone--done")) errors.push("после снятия отметки блок остался отмеченным");
    // трекер в другой вкладке отметил главу — галочка здесь её показывает
    ls.setItem("algoProgress", JSON.stringify({ [H]: true }));
    w.dispatchEvent(new w.StorageEvent("storage", { key: "algoProgress" }));
    if (!cb.checked || !b.classList.contains("algo-chapdone--done")) errors.push("storage: отметка из трекера другой вкладки не показана в главе");
    ls.setItem("algoProgress", JSON.stringify({ [H]: false }));
    w.dispatchEvent(new w.StorageEvent("storage", { key: "algoQuizBest" }));
    if (!cb.checked) errors.push("storage по чужому ключу изменил галочку в главе");
    w.dispatchEvent(new w.StorageEvent("storage", { key: null }));
    if (cb.checked) errors.push("storage с key === null (очистка хранилища) не обновил галочку в главе");
    // повторная инициализация (скрипт выполнен дважды) не плодит блоки
    w.eval(js);
    if (blocks(d).length !== 1) errors.push(`после повторной инициализации блоков ${blocks(d).length}`);
  }

  // 2) глава, отмеченная раньше (в трекере), открывается с галочкой
  const pre = await pageDom(H, { seed: { algoProgress: JSON.stringify({ [H]: true }) } });
  const preCb = pre.window.document.querySelector(".algo-chapdone input");
  if (!preCb || !preCb.checked) errors.push("глава, отмеченная в трекере, открылась без галочки");

  // 3) не глава — блока нет: инструменты, страницы вне реестра, вся книга одной страницей
  for (const f of ["quiz.html", "cheatsheet.html", "pattern-selection-guide.html", "review.html", "mixed.html", "glossary.html", "index.html", "print.html", "toc.html"]) {
    const p = await pageDom(f);
    if (blocks(p).length) errors.push(`на ${f} есть блок «Глава пройдена» — это не глава`);
  }

  // 4) глава расширения: плашка уровня под заголовком на месте, блок — в конце
  const ext = await pageDom("deque-structure.html");
  const extDoc = ext.window.document;
  const note = extDoc.querySelector(".algo-lvlnote");
  if (!note || note.previousElementSibling !== extDoc.querySelector("main h1")) errors.push("у главы расширения пропала плашка уровня под заголовком");
  if (blocks(ext).length !== 1 || extDoc.querySelector("main").lastElementChild !== blocks(ext)[0]) errors.push("у главы расширения нет блока «Глава пройдена» в конце");

  // 5) хранилище недоступно: галочка держится в пределах вкладки и не выдаёт себя за сохранённую
  const off = await pageDom("big-o.html");
  const proto = off.window.Storage.prototype, origGet = proto.getItem, origSet = proto.setItem;
  proto.getItem = function () { throw new Error("SecurityError"); };
  proto.setItem = function () { throw new Error("SecurityError"); };
  try {
    toggle(off, true);
  } finally {
    proto.getItem = origGet;
    proto.setItem = origSet;
  }
  const offBlock = off.window.document.querySelector(".algo-chapdone");
  if (offBlock) {
    if (!offBlock.querySelector("input").checked) errors.push("при недоступном хранилище галочка в главе снялась сама");
    if (!/не сохранилась/.test(offBlock.textContent)) errors.push(`при недоступном хранилище блок не сказал, что отметка не сохранилась: «${offBlock.textContent}»`);
  }
  if (off.window.localStorage.getItem("algoProgress") !== null) errors.push("при недоступном хранилище algoProgress всё же записан");

  // 6) вместе с настоящим srs.js: отметка сразу заводит карточку главы на завтра, снятие её убирает
  const MENU =
    '<div id="mdbook-menu-bar" class="menu-bar"><div class="left-buttons"></div><h1 class="menu-title">Книга</h1>' +
    '<div class="right-buttons"><a href="print.html" title="Print">P</a></div></div>';
  // промах вчерашний: его карточка уже в сроке (промах сегодняшний заводит карточку только на завтра)
  const miss = { "big-o#2": { n: 1, page: "big-o", anchor: "task-2", q: "Сколько копий сделает append?" } };
  const missCard = { due: Date.now() - 60 * 60 * 1000, iv: 0, ease: 2.5, reps: 0, meta: { page: "big-o", anchor: "task-2", q: miss["big-o#2"].q } };
  const real = await pageDom(H, { srs: true, menu: MENU, seed: { algoChallengeMissed: JSON.stringify(miss), algoSRS: JSON.stringify({ "task:big-o#2": missCard }) } });
  const badge = () => {
    const a = real.window.document.querySelector(".algo-srs-badge");
    return a && !a.hidden ? a.textContent.replace(/\s+/g, " ").trim() : null;
  };
  if (!/Сегодня:\s*1\b/.test(badge() || "")) errors.push(`глава с настоящим srs.js: счётчик «${badge()}», ожидалось 1 (промах)`);
  toggle(real, true);
  const card = read(real, "algoSRS")["ch:" + H];
  if (!card || Math.abs(card.due - (Date.now() + 24 * 60 * 60 * 1000)) > 60 * 1000) errors.push(`отметка в главе не завела карточку главы на завтра: ${JSON.stringify(card)}`);
  if (!/Сегодня:\s*1\b/.test(badge() || "")) errors.push(`после отметки главы счётчик «${badge()}» — карточка главы приходит завтра, сегодня должно остаться 1`);
  toggle(real, false);
  if (read(real, "algoSRS")["ch:" + H]) errors.push("снятая отметка оставила ни разу не оценённую карточку главы в очереди");
  if (!read(real, "algoSRS")["task:big-o#2"]) errors.push("снятие отметки главы убрало чужую карточку");

  // 7) трекер тоже зовёт sync: отметка на шпаргалке заводит карточку без перехода на другую страницу
  const sheet = await pageDom("cheatsheet.html", { srs: true, menu: MENU, main: '<div class="algo-progress"></div>' });
  const first = sheet.window.document.querySelector('.algo-prog__item input[aria-label*="Big-O"]');
  if (!first) errors.push("на шпаргалке не нашлась галочка главы Big-O");
  else {
    first.checked = true;
    first.dispatchEvent(new sheet.window.Event("change"));
    if (!read(sheet, "algoSRS")["ch:big-o.html"]) errors.push("отметка в трекере не завела карточку главы сразу");
    first.checked = false;
    first.dispatchEvent(new sheet.window.Event("change"));
    if (read(sheet, "algoSRS")["ch:big-o.html"]) errors.push("снятая в трекере отметка оставила неоценённую карточку главы");
    // «Сбросить прогресс» — то же: карточки глав, которые ни разу не оценивались, уходят сразу
    first.checked = true;
    first.dispatchEvent(new sheet.window.Event("change"));
    const reset = [...sheet.window.document.querySelectorAll("button")].find((b) => /Сбросить/.test(b.textContent));
    reset.dispatchEvent(new sheet.window.MouseEvent("click", { bubbles: true }));
    if (read(sheet, "algoSRS")["ch:big-o.html"]) errors.push("после сброса прогресса неоценённая карточка главы осталась в очереди");
  }
}
