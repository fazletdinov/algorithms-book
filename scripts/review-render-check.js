#!/usr/bin/env node
// Headless smoke связки «промах в главе → список повторить → экспорт/импорт».
//
//   node scripts/review-render-check.js
//
// Проверяется сквозной сценарий, а не отдельные функции, потому что ломается
// обычно именно стык: раньше challenge.js писал прогресс по data-id, которого
// нет ни в одной главе, — виджеты работали, тесты были зелёные, а в
// localStorage не попадало НИЧЕГО. Здесь:
//   0) «Слабые места» — одна строка на главу (ключ — href): старая запись квиза с английским pattern,
//      новая и промах смешанной по той же главе — одна строка; два ответа квиза одной главы — одна;
//      запись без главы — строка по своему pattern без ссылки;
//   1) промах в задаче попадает в algoChallengeMissed с текстом и якорем;
//   2) верный ответ помечает задачу решённой и убирает её из промахов;
//   3) review.js показывает только непройденное, с ссылкой на конкретную задачу;
//   4) экспорт собирает все ключи книги (в том числе algoProgressAt, algoSRS, algoFnSolved, algoQuizSeen и algoPracticeScope),
//      импорт вливает их СЛИЯНИЕМ; счётчик дня algoToday в файл не идёт и из файла не берётся.
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

// --- шаг 0: «Слабые места» — одна строка на главу, ключ — href главы ---
// Квиз и смешанная тренировка называли один приём по-разному («Sliding Window» и «Скользящее
// окно»), и слияние по имени давало две строки на одну главу. Старые записи algoQuizMissed хранят
// английский pattern — они обязаны встать в ту же строку, что и новые.
const asset = (f) => fs.readFileSync(path.join(root, "assets", f), "utf8");
const WINDOW_Q = "Найти длину самой длинной подстроки без повторяющихся символов.";
const LRU_Q = "Спроектировать кэш на capacity элементов: Get и Put за O(1), при переполнении вытесняется давно не используемый (LRU) элемент.";
const LADDER_Q = "Кратчайшая цепочка превращений одного слова в другое, меняя по одной букве; каждое промежуточное слово должно быть в словаре.";
const weakDom = new JSDOM(`<!DOCTYPE html><html><body><div class="algo-weakspots"></div></body></html>`, {
  runScripts: "dangerously",
  virtualConsole: vc,
  url: "https://example.test/review.html",
});
weakDom.window.localStorage.setItem("algoQuizMissed", JSON.stringify({
  // вопрос банка, записанный до перевода вариантов: pattern по-английски
  [WINDOW_Q]: { n: 1, pattern: "Sliding Window", href: "sliding-window.html", q: WINDOW_Q },
  // вопроса больше нет в банке — глава из записи (с «./» и якорем, как бывало в старых href)
  "Вопрос про медиану": { n: 1, pattern: "Two Heaps", href: "./two-heaps.html#две-кучи", q: "Вопрос про медиану" },
  // два вопроса одной главы с разными ответами — одна строка
  [LRU_Q]: { n: 1, pattern: "Хеш-таблица + двусвязный список", href: "pattern-combinations.html", q: LRU_Q },
  [LADDER_Q]: { n: 2, pattern: "BFS + хеш-множество", href: "pattern-combinations.html", q: LADDER_Q },
  // запись без главы — строка по старому pattern, без ссылки
  "Вопрос без главы": { n: 1, pattern: "Старый шаблон", q: "Вопрос без главы" },
}));
weakDom.window.localStorage.setItem("algoMixedMissed", JSON.stringify({
  "slidingwindow.LongestSubstringNoRepeat": { n: 1, chapter: "sliding-window", pkg: "slidingwindow", fn: "LongestSubstringNoRepeat" },
}));
for (const f of ["progress.js", "quiz.js", "problems.js", "review.js"]) {
  const s = weakDom.window.document.createElement("script");
  s.textContent = asset(f);
  weakDom.window.document.body.appendChild(s);
}

function checkWeakSpots() {
  const wdoc = weakDom.window.document;
  const rows = [...wdoc.querySelectorAll(".algo-weak__table tr")].slice(1).map((tr) => {
    const td = [...tr.querySelectorAll("td")].map((x) => x.textContent);
    const a = tr.querySelector("a");
    return { name: td[0], quiz: td[1], mixed: td[2], total: td[3], href: a ? a.getAttribute("href") : null };
  });
  const dump = JSON.stringify(rows);
  const byName = (n) => rows.filter((r) => r.name === n);
  const win = byName("Скользящее окно");
  if (win.length !== 1 || win[0].quiz !== "1" || win[0].mixed !== "1" || win[0].href !== "sliding-window.html") {
    errors.push(`слабые места: у скользящего окна не одна строка «квиз 1 + смешанная 1» со ссылкой на главу: ${dump}`);
  }
  const heaps = byName("Две кучи");
  if (heaps.length !== 1 || heaps[0].quiz !== "1" || heaps[0].href !== "two-heaps.html") {
    errors.push(`слабые места: старая запись «Two Heaps» не встала в строку «Две кучи» со ссылкой two-heaps.html: ${dump}`);
  }
  const combo = byName("Комбинации паттернов");
  if (combo.length !== 1 || combo[0].quiz !== "3") {
    errors.push(`слабые места: два вопроса главы «Комбинации паттернов» не слились в одну строку с 3 промахами: ${dump}`);
  }
  const old = byName("Старый шаблон");
  if (old.length !== 1 || old[0].href !== null) errors.push(`слабые места: запись без главы не показана по старому pattern без ссылки: ${dump}`);
  if (rows.some((r) => /[A-Za-z]/.test(r.name) && r.name !== "Старый шаблон")) errors.push(`слабые места: строка с английским названием: ${dump}`);
  if (rows.length !== 4) errors.push(`слабые места: строк ${rows.length}, ожидалось 4: ${dump}`);
}

setTimeout(() => {
  checkWeakSpots();
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
      pls.setItem("algoProgressAt", JSON.stringify({ "sliding-window.html": 1700000000000 }));
      pls.setItem("algoSRS", JSON.stringify({ "ch:sliding-window.html": { due: 1, iv: 0, ease: 2.5, reps: 0, meta: { href: "sliding-window.html" } } }));
      // решённые упражнения виджета «Реши прямо здесь» (runner.js) — от них зависит, какое упражнение он предложит первым
      pls.setItem("algoFnSolved", JSON.stringify({ "slidingwindow.MaxSumSubarray": 1700000200000 }));
      // квиз: когда вопрос показан последний раз (порядок порции) и режим выдачи квиза и смешанной
      pls.setItem("algoQuizSeen", JSON.stringify({ "Вопрос A": 1700000400000 }));
      pls.setItem("algoPracticeScope", "all");
      pls.setItem("algoQuizBestPortion", "7/10"); // рекорд полной порции квиза — под своим ключом
      // счётчик дня (srs.js) — про сегодня в ЭТОМ браузере: в файл прогресса он не идёт и из файла не берётся
      const todayHere = JSON.stringify({ day: "2026-01-14", done: 3, heavy: 0, later: ["ch:sliding-window.html"] });
      pls.setItem("algoToday", todayHere);

      // экспорт забирает ВСЕ ключи книги, и метки событий для srs.js тоже: без них после переноса
      // на другую машину сроки новых карточек глав снова считались бы от «сейчас»
      let exportedText = null;
      progDom.window.Blob = function (parts) { exportedText = parts.join(""); };
      progDom.window.URL.createObjectURL = () => "blob:test";
      progDom.window.URL.revokeObjectURL = () => {};
      progDom.window.HTMLAnchorElement.prototype.click = function () {};
      [...pdoc.querySelectorAll("button")].find((b) => /Экспорт/.test(b.textContent)).dispatchEvent(new progDom.window.MouseEvent("click", { bubbles: true }));
      const exported = exportedText ? JSON.parse(exportedText) : null;
      if (!exported || !exported.data) errors.push("экспорт не собрал дамп");
      else {
        for (const k of ["algoProgress", "algoProgressAt", "algoSRS", "algoFnSolved", "algoQuizSeen", "algoPracticeScope", "algoQuizBestPortion"]) {
          if (!(k in exported.data)) errors.push(`в экспорте нет ключа ${k}: ${Object.keys(exported.data)}`);
        }
        if (exported.data.algoProgressAt !== pls.getItem("algoProgressAt")) errors.push("экспорт отдал algoProgressAt не таким, каким он лежит в localStorage");
        if ("algoToday" in exported.data) errors.push("в экспорт попал algoToday — счётчик дня чужой машины съел бы здесь дневную порцию");
      }

      const dump = {
        kind: "algorithms-book-progress",
        version: 1,
        data: {
          algoProgress: JSON.stringify({ "big-o.html": true }),
          algoProgressAt: JSON.stringify({ "big-o.html": 1700000100000 }),
          algoQuizBest: "40/57",
          algoFnSolved: JSON.stringify({ "bigo.MinStack.Push": 1700000300000 }),
          algoToday: JSON.stringify({ day: "2026-01-14", done: 12, heavy: 1, later: [] }),
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
      // после импорта движок повторений сверяется сразу: карточки для пришедших отметок и промахов
      // заводятся без перехода на другую страницу
      let synced = 0;
      progDom.window.ALGO_SRS = { sync: () => { synced++; } };
      importInput.onchange();
      if (synced !== 1) errors.push(`после импорта ALGO_SRS.sync вызван ${synced} раз(а), ожидался один`);

      const merged = JSON.parse(pls.getItem("algoProgress"));
      if (!merged["sliding-window.html"] || !merged["big-o.html"]) {
        errors.push(`импорт не слил прогресс, а заменил: ${JSON.stringify(merged)}`);
      }
      if (pls.getItem("algoQuizBest") !== "40/57") errors.push("импорт не перенёс рекорд квиза");
      const fnSolved = JSON.parse(pls.getItem("algoFnSolved") || "{}");
      if (!fnSolved["slidingwindow.MaxSumSubarray"] || !fnSolved["bigo.MinStack.Push"]) errors.push(`импорт не слил algoFnSolved, а заменил: ${JSON.stringify(fnSolved)}`);
      if (pls.getItem("algoToday") !== todayHere) errors.push(`импорт тронул algoToday: ${pls.getItem("algoToday")}`);
      const at = JSON.parse(pls.getItem("algoProgressAt") || "{}");
      if (!at["sliding-window.html"] || !at["big-o.html"]) errors.push(`импорт не слил метки algoProgressAt, а заменил: ${JSON.stringify(at)}`);
      const label = pdoc.querySelector(".algo-prog__label").textContent;
      if (!/2 \/ \d+/.test(label)) errors.push(`после импорта подпись трекера = «${label}»`);

      // --- импорт не откатывает и не портит: у algoSRS, algoProgress и algoProgressAt свои правила ---
      const importDump = (data) => {
        progDom.window.FileReader = function () {
          this.readAsText = function () {
            this.result = JSON.stringify({ kind: "algorithms-book-progress", version: 1, data });
            this.onload();
          };
        };
        importInput.onchange();
      };
      const setLocal = (obj) => {
        pls.clear();
        for (const k of Object.keys(obj)) pls.setItem(k, typeof obj[k] === "string" ? obj[k] : JSON.stringify(obj[k]));
      };
      const get = (k) => {
        try { return JSON.parse(pls.getItem(k)); } catch (e) { return "не JSON: " + pls.getItem(k); }
      };
      let changes = 0;
      pdoc.addEventListener("algo-srs:change", () => changes++);

      // 1. algoSRS: по каждой карточке побеждает та, у которой больше seen; без seen проигрывает
      // оценённой; при равенстве — здешняя. Файл старше текущего состояния ничего не откатывает.
      const card = (seen, iv) => Object.assign({ due: 1, iv, ease: 2.5, reps: 2, meta: {} }, seen === undefined ? {} : { seen });
      setLocal({
        algoSRS: { A: card(2000, 20), B: card(1000, 3), C: card(undefined, 3), D: card(5000, 30), E: card(3000, 3), H: card(undefined, 3), J: null, J2: null },
      });
      importDump({
        algoSRS: JSON.stringify({ A: card(1000, 4), B: card(4000, 99), C: card(10, 7), D: card(undefined, 8), E: card(3000, 55), F: card(1, 5), H: card(undefined, 8), J: card(7, 6), J2: card(undefined, 9), K: null }),
      });
      const srs = get("algoSRS");
      const iv = (id) => srs[id] && srs[id].iv;
      for (const [id, want, why] of [
        ["A", 20, "здешняя оценка свежее файла — откатываться нельзя"],
        ["B", 99, "оценка в файле свежее"],
        ["C", 7, "здешняя ни разу не оценивалась, а в файле оценка есть"],
        ["D", 30, "в файле карточка без seen проигрывает здешней оценённой"],
        ["E", 3, "при равенстве seen — здешняя"],
        ["F", 5, "карточки нет здесь — приходит из файла"],
        ["H", 3, "обе без seen — здешняя"],
        ["J", 6, "здешняя запись — мусор, из файла приходит настоящая карточка"],
        ["J2", 9, "здешняя запись — мусор: карточка из файла даже без seen лучше мусора"],
      ]) {
        if (iv(id) !== want) errors.push(`импорт algoSRS, карточка ${id}: iv ${iv(id)}, ожидалось ${want} (${why})`);
      }
      if ("K" in srs) errors.push("импорт algoSRS завёл мусорную запись из файла (null)");
      if (!changes) errors.push("после импорта не ушло событие algo-srs:change — счётчик «Сегодня» не узнает о новых карточках");

      // 2. algoProgress: отметка побеждает, «false» из файла её не снимает; algoProgressAt — ранняя метка
      setLocal({ algoProgress: { a: true, b: false, d: false }, algoProgressAt: { a: 5000, x: 100 } });
      importDump({
        algoProgress: JSON.stringify({ a: false, b: true, c: false, d: false }),
        algoProgressAt: JSON.stringify({ a: 3000, b: 4000, x: 900 }),
      });
      if (JSON.stringify(get("algoProgress")) !== JSON.stringify({ a: true, b: true, d: false, c: false })) {
        errors.push(`импорт algoProgress: ${pls.getItem("algoProgress")}, ожидалось a, b отмечены, c, d нет — «false» из файла не снимает отметку`);
      }
      if (JSON.stringify(get("algoProgressAt")) !== JSON.stringify({ a: 3000, x: 100, b: 4000 })) {
        errors.push(`импорт algoProgressAt: ${pls.getItem("algoProgressAt")}, ожидалась более ранняя метка у главы, отмеченной с обеих сторон`);
      }
      setLocal({ algoProgressAt: { a: 3000 } });
      importDump({ algoProgressAt: JSON.stringify({ a: 5000 }) });
      if (get("algoProgressAt").a !== 3000) errors.push("импорт algoProgressAt заменил раннюю здешнюю метку более поздней");

      // 3. значение, не разбирающееся как JSON, не затирает исправное здешнее; повреждённое здешнее — лечится
      const srsLocal = { A: card(2000, 20) };
      for (const bad of ["not json{", "[]", "42", "null", '"str"']) {
        setLocal({ algoSRS: srsLocal, algoChallengeMissed: { "x#1": { n: 1 } } });
        importDump({ algoSRS: bad, algoChallengeMissed: bad });
        if (JSON.stringify(get("algoSRS")) !== JSON.stringify(srsLocal)) errors.push(`файл с algoSRS = ${bad} затёр исправное здешнее: ${pls.getItem("algoSRS")}`);
        if (JSON.stringify(get("algoChallengeMissed")) !== JSON.stringify({ "x#1": { n: 1 } })) errors.push(`файл с algoChallengeMissed = ${bad} затёр исправное здешнее: ${pls.getItem("algoChallengeMissed")}`);
      }
      setLocal({ algoChallengeMissed: { "x#1": { n: 1 } }, algoMockLog: [{ ts: 1 }] });
      importDump({ algoChallengeMissed: '["a","b"]', algoMockLog: '{"k":1}' });
      if (JSON.stringify(get("algoChallengeMissed")) !== JSON.stringify({ "x#1": { n: 1 } }) || JSON.stringify(get("algoMockLog")) !== JSON.stringify([{ ts: 1 }])) {
        errors.push("файл с массивом вместо карты (и наоборот) затёр здешнее значение");
      }
      setLocal({});
      importDump({ algoSRS: "not json{" });
      if (pls.getItem("algoSRS") !== null) errors.push(`файл с неразбираемым algoSRS завёл повреждённый ключ: ${pls.getItem("algoSRS")}`);
      for (const damaged of ["garbage{", "[]", "42"]) {
        setLocal({ algoSRS: damaged });
        importDump({ algoSRS: JSON.stringify({ A: card(1, 5) }) });
        if (JSON.stringify(get("algoSRS")) !== JSON.stringify({ A: card(1, 5) })) errors.push(`импорт не вылечил повреждённый algoSRS = ${damaged}: ${pls.getItem("algoSRS")}`);
      }
      // 4. algoQuizSeen — более поздняя метка (ранняя из файла вернула бы в порцию только что пройденное);
      // algoPracticeScope — выбор этой машины: заданный здесь не затирается, незаданный приходит из файла
      setLocal({ algoQuizSeen: { a: 5000, b: 1000 }, algoPracticeScope: "done" });
      importDump({ algoQuizSeen: JSON.stringify({ a: 3000, b: 4000, c: 7000, d: "мусор" }), algoPracticeScope: "all" });
      if (JSON.stringify(get("algoQuizSeen")) !== JSON.stringify({ a: 5000, b: 4000, c: 7000 })) {
        errors.push(`импорт algoQuizSeen: ${pls.getItem("algoQuizSeen")}, ожидалась более поздняя метка у каждого вопроса`);
      }
      if (pls.getItem("algoPracticeScope") !== "done") errors.push(`импорт затёр здешний algoPracticeScope: ${pls.getItem("algoPracticeScope")}`);
      setLocal({});
      importDump({ algoPracticeScope: "all" });
      if (pls.getItem("algoPracticeScope") !== "all") errors.push(`импорт не перенёс algoPracticeScope, которого здесь не было: ${pls.getItem("algoPracticeScope")}`);
      // 5. algoQuizBestPortion — остаётся лучший рекорд полной порции; мусор из файла здешний не затирает
      for (const [here, there, want] of [["7/10", "5/10", "7/10"], ["7/10", "9/10", "9/10"], [null, "4/10", "4/10"], ["7/10", "мусор", "7/10"], ["мусор", "3/10", "3/10"]]) {
        setLocal(here === null ? {} : { algoQuizBestPortion: here });
        importDump({ algoQuizBestPortion: there });
        if (pls.getItem("algoQuizBestPortion") !== want) errors.push(`импорт algoQuizBestPortion: здесь ${here}, в файле ${there} — стало ${pls.getItem("algoQuizBestPortion")}, ожидалось ${want}`);
      }
      // ключи с сырым текстом ведут себя как раньше
      setLocal({ "algoRunnerCode:slidingwindow": "мой код", algoQuizBest: "10/57" });
      importDump({ "algoRunnerCode:slidingwindow": "чужой код", algoQuizBest: "40/57" });
      if (pls.getItem("algoRunnerCode:slidingwindow") !== "чужой код" || pls.getItem("algoQuizBest") !== "40/57") errors.push("импорт ключей с сырым текстом изменил поведение");
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
      "✅ review-render-check: «слабые места» — одна строка на главу (старые английские записи квиза — в ней же), промах сохраняется с текстом и якорем, решение убирает его из списка, " +
        "«повторить» показывает непройденное с ссылками, экспорт забирает algoProgressAt, algoSRS, algoFnSolved, algoQuizSeen и algoPracticeScope (algoToday — нет), импорт сливает прогресс, метки и решённые упражнения, у показов квиза берёт позднюю метку, здешний режим выдачи не затирает"
    );
  }
}, 200);
