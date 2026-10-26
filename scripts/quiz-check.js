#!/usr/bin/env node
// Headless smoke квиза распознавания шаблонов (assets/quiz.js) вместе с трекером (progress.js):
// порции по пройденным главам.
//
//   node scripts/quiz-check.js
//
// Что проверяется (и почему именно это):
//   (a) пустой трекер в режиме «только пройденные» — объяснение и переключатель, а не пустой экран и
//       не вопрос по главе, до которой читатель не дошёл; «по всем главам» — полная порция, выбор
//       записан в algoPracticeScope; хранилище недоступно — об этом сказано, выбор живёт в памяти;
//   (b) отмечены «Скользящее окно» и «Два указателя» — порция из всех их вопросов (их 5 + 2), только
//       этих глав, без повторов; вопрос из algoQuizMissed идёт первым; «Следующая порция» — новая;
//   (c) показ пишется в algoQuizSeen по свежему чтению — запись другой вкладки не стирается;
//   (d) рекорд — только у полной порции: порция из 7 его не пишет и не показывает, из 10 пишет «k/10»;
//       под своим ключом algoQuizBestPortion; прежний рекорд algoQuizBest «40/64» (весь банк подряд) не
//       показывается и не перезаписывается;
//   (e) сборка порции на случайных наборах (зерно): размер — min(10, вопросов в пуле), только главы
//       пула, без повторов, порядок «промахи → не показанные → давно показанные», а пропущенные
//       не «лучше» взятых (промах не уступает место показанному, давний — недавнему);
//   (f) повторная порция маленького пула: показанные идут каждый раз в другом порядке, промах — первым;
//   (g) один язык: варианты без латиницы (кроме имён Go и аббревиатур BFS, DFS, MST, KMP, NP, BST, A*, K),
//       без повторов, ответ среди вариантов, ответ-название главы ведёт в эту главу; английское
//       название (en) после ответа показано ровно один раз и не повторено в тексте пояснения;
//   (h) длина вариантов — как правило 7 scripts/check-challenges.js: верный вариант не бывает в ≥ 1.25 раза
//       и на ≥ 8 символов длиннее КАЖДОГО неверного (ответ угадывался бы по длине); печатается, в скольких
//       вопросах верный — самый длинный (при случайном выборе — в четверти);
//   (i) переписанные вопросы (ALGO_QUIZ.renamed): прежнего текста в банке нет, нынешний есть; промах и показ
//       под прежним текстом при загрузке переезжают на нынешний (промахи складываются, показ — поздний),
//       find() находит вопрос по обоим текстам, а испорченный algoQuizMissed не перезаписывается;
//   (j) у каждой главы ядра (lvl: "core" в progress.js), кроме «Инвариантов и индукции» (глава о
//       доказательстве корректности, а не о приёме), есть хотя бы один вопрос; хеш-таблица — ответ
//       хотя бы двух вопросов.
// Если jsdom не найден — мягкий пропуск (exit 0), как в остальных смоуках.
"use strict";
const fs = require("fs");
const path = require("path");

let JSDOM, VirtualConsole;
try {
  ({ JSDOM, VirtualConsole } = require("jsdom"));
} catch (e) {
  console.log("⏭  quiz-check: jsdom не установлен — пропускаю (npm i jsdom).");
  process.exit(0);
}

const root = path.resolve(__dirname, "..");
const progressJs = fs.readFileSync(path.join(root, "assets", "progress.js"), "utf8");
const quizJs = fs.readFileSync(path.join(root, "assets", "quiz.js"), "utf8");

const errors = [];
const vc = new VirtualConsole();
vc.on("jsdomError", (e) => errors.push("jsdomError: " + (e && e.message)));

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Порядок скриптов — как в additional-js книги (book.toml): quiz.js раньше progress.js. Скрипты стоят в
// конце body, как их ставит mdBook, и оба собираются по DOMContentLoaded — тогда квиз уже видит ALGO_DONE.
// Начни quiz.js собираться сразу при загрузке, он не увидел бы трекер и выдал бы все главы — проверка это поймает.
const BOOK_JS = (() => {
  const toml = fs.readFileSync(path.join(root, "book.toml"), "utf8");
  const list = JSON.parse((toml.match(/^additional-js\s*=\s*(\[.*\])/m) || [])[1] || "[]");
  return list.map((p) => path.basename(p)).filter((f) => f === "quiz.js" || f === "progress.js");
})();
const SRC = { "quiz.js": quizJs, "progress.js": progressJs };

// boot — страница квиза: хранилище и зерно случайности до первого скрипта, затем quiz.js и progress.js в
// порядке книги. brokenStorage — getItem/setItem бросают.
function boot(seed, rngSeed, brokenStorage) {
  const scripts = BOOK_JS.map((f) => `<script>${SRC[f]}</script>`).join("");
  return new Promise((resolve) => {
    const dom = new JSDOM(`<!DOCTYPE html><html><body><main><h1>Квиз</h1><div class="algo-quiz"></div></main>${scripts}</body></html>`, {
      runScripts: "dangerously",
      virtualConsole: vc,
      url: "https://example.test/quiz.html",
      beforeParse(w) {
        Object.keys(seed || {}).forEach((k) => w.localStorage.setItem(k, seed[k]));
        w.Math.random = mulberry32(rngSeed || 1);
        if (brokenStorage) {
          w.Storage.prototype.getItem = () => { throw new Error("SecurityError"); };
          w.Storage.prototype.setItem = () => { throw new Error("SecurityError"); };
        }
      },
    });
    dom.window.addEventListener("load", () => resolve(dom));
  });
}
if (BOOK_JS.length !== 2) errors.push(`в additional-js книги (book.toml) нет quiz.js или progress.js: ${JSON.stringify(BOOK_JS)}`);

const click = (dom, node) => node.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));

function view(dom) {
  const el = dom.window.document.querySelector(".algo-quiz");
  return {
    el,
    head: el.querySelector(".algo-quiz__head").textContent,
    q: el.querySelector(".algo-quiz__q").textContent,
    opts: [...el.querySelectorAll(".algo-quiz__opt")],
    btn: el.querySelector(".algo-quiz__btn"),
    scope: el.querySelector(".algo-scope__box"),
    text: el.textContent,
  };
}

// answerAll проходит порцию до итога: отвечает верно, кроме вопросов с номерами из wrong (с 0).
// Возвращает показанные вопросы (объекты банка) в порядке показа.
function answerAll(dom, wrong) {
  const bank = dom.window.ALGO_QUIZ.questions;
  const shown = [];
  for (let i = 0; i < 20; i++) {
    const v = view(dom);
    if (!v.opts.length) break;
    const item = bank.find((x) => x.q === v.q);
    if (!item) { errors.push(`показан вопрос не из банка: «${v.q}»`); break; }
    shown.push(item);
    const bad = (wrong || []).includes(i);
    const pick = v.opts.find((o) => (o.textContent === item.correct) !== bad);
    click(dom, pick);
    click(dom, v.btn); // «Проверить»
    click(dom, view(dom).btn); // «Следующий» / «Результат»
  }
  return shown;
}

function toggleAll(dom, on) {
  const box = view(dom).scope;
  box.checked = on;
  box.dispatchEvent(new dom.window.Event("change"));
}

const parse = (dom, k) => JSON.parse(dom.window.localStorage.getItem(k) || "{}");

async function main() {
  // --- (a) пустой трекер ---
  {
    const dom = await boot({}, 11);
    const v = view(dom);
    if (v.opts.length) errors.push("(a) пустой трекер: показан вопрос, хотя пройденных глав нет");
    // объяснение — на месте вопроса, с обоими выходами: галочка в конце главы и «по всем главам»
    const why = v.q + " " + v.el.querySelector(".algo-quiz__explain").textContent;
    if (!/отмеченных/.test(v.q) || !/«Глава пройдена»/.test(why) || !/«по всем главам»/.test(why)) {
      errors.push(`(a) пустой трекер: нет объяснения с выходами — «${why.slice(0, 200)}»`);
    }
    if (!v.scope) errors.push("(a) нет переключателя «по всем главам»");
    else {
      toggleAll(dom, true);
      const after = view(dom);
      if (!/^Вопрос 1 \/ 10/.test(after.head)) errors.push(`(a) «по всем главам»: заголовок «${after.head}», ожидалось «Вопрос 1 / 10»`);
      if (dom.window.localStorage.getItem("algoPracticeScope") !== "all") errors.push(`(a) выбор не записан: algoPracticeScope = ${dom.window.localStorage.getItem("algoPracticeScope")}`);
      // выбор общий и переживает перезагрузку
      const again = await boot({ algoPracticeScope: "all" }, 12);
      if (!/^Вопрос 1 \/ 10/.test(view(again).head) || !view(again).scope.checked) errors.push("(a) сохранённый «по всем главам» не подхватился при загрузке");
    }
    const broken = await boot({}, 13, true);
    const b = view(broken);
    if (b.opts.length || !/[Хх]ранилище/.test(b.text)) errors.push(`(a) хранилище недоступно: нет честного сообщения — «${b.text.slice(0, 200)}»`);
    else {
      toggleAll(broken, true);
      if (!/^Вопрос 1 \/ 10/.test(view(broken).head)) errors.push("(a) хранилище недоступно: «по всем главам» не дало порцию");
    }
  }

  // --- (b), (c), (d) две главы: порция из 7, промах первым, рекорд не пишется ---
  const SW_TP = new Set(["sliding-window.html", "two-pointers.html"]);
  {
    const probe = await boot({}, 1);
    const bank = probe.window.ALGO_QUIZ.questions;
    const pool = bank.filter((x) => SW_TP.has(x.href));
    const sw = bank.filter((x) => x.href === "sliding-window.html").length;
    const tp = bank.filter((x) => x.href === "two-pointers.html").length;
    if (sw !== 5 || tp !== 2) errors.push(`(b) вопросов окна ${sw} и двух указателей ${tp}, ожидалось 5 и 2 — поправь проверку и тексты`);
    const missedQ = pool.find((x) => x.href === "two-pointers.html");
    for (let rs = 1; rs <= 5; rs++) {
      const dom = await boot({
        algoProgress: JSON.stringify({ "sliding-window.html": true, "two-pointers.html": true, "big-o.html": false }),
        algoQuizMissed: JSON.stringify({ [missedQ.q]: { n: 1, pattern: missedQ.correct, href: missedQ.href, q: missedQ.q } }),
        algoQuizBest: "40/64",
      }, 100 + rs);
      const v = view(dom);
      if (!/^Вопрос 1 \/ 7/.test(v.head)) errors.push(`(b) зерно ${rs}: заголовок «${v.head}», ожидалось «Вопрос 1 / 7»`);
      if (v.q !== missedQ.q) errors.push(`(b) зерно ${rs}: первым показан «${v.q}», а промах — «${missedQ.q}»`);
      if (/40/.test(v.head) || /Рекорд/.test(v.text)) errors.push(`(d) зерно ${rs}: показан рекорд — «${v.head}»`);
      if (v.scope && v.scope.checked) errors.push(`(b) зерно ${rs}: по умолчанию стоит «по всем главам»`);
      // (c) другая вкладка успела записать свой показ — он не стирается
      dom.window.localStorage.setItem("algoQuizSeen", JSON.stringify({ "чужой вопрос": 5 }));
      const shown = answerAll(dom, [1]);
      if (shown.length !== 7) errors.push(`(b) зерно ${rs}: в порции ${shown.length} вопросов, ожидалось 7`);
      if (new Set(shown.map((x) => x.q)).size !== shown.length) errors.push(`(b) зерно ${rs}: вопросы в порции повторяются`);
      const alien = shown.find((x) => !SW_TP.has(x.href));
      if (alien) errors.push(`(b) зерно ${rs}: вопрос чужой главы ${alien.href}: «${alien.q}»`);
      const seen = parse(dom, "algoQuizSeen");
      if (seen["чужой вопрос"] !== 5) errors.push(`(c) зерно ${rs}: показ другой вкладки стёрт: ${JSON.stringify(seen)}`);
      if (shown.some((x) => typeof seen[x.q] !== "number")) errors.push(`(c) зерно ${rs}: не все показанные вопросы попали в algoQuizSeen`);
      const end = view(dom);
      if (dom.window.localStorage.getItem("algoQuizBest") !== "40/64") errors.push(`(d) зерно ${rs}: порция из 7 тронула прежний рекорд: ${dom.window.localStorage.getItem("algoQuizBest")}`);
      if (dom.window.localStorage.getItem("algoQuizBestPortion") !== null) errors.push(`(d) зерно ${rs}: порция из 7 записала рекорд порции: ${dom.window.localStorage.getItem("algoQuizBestPortion")}`);
      if (/Рекорд:/.test(end.text) || /Новый рекорд/.test(end.text)) errors.push(`(d) зерно ${rs}: итог порции из 7 говорит о рекорде: «${end.text.slice(0, 160)}»`);
      if (!/Вы набрали 6 из 7/.test(end.text)) errors.push(`(b) зерно ${rs}: итог «${end.q}», ожидалось «Вы набрали 6 из 7»`);
      if (end.btn.textContent !== "Следующая порция") errors.push(`(b) зерно ${rs}: кнопка итога «${end.btn.textContent}»`);
      // следующая порция: промах (второй вопрос) — первым
      const missedNow = shown[1];
      click(dom, end.btn);
      const next = view(dom);
      if (!/^Вопрос 1 \/ 7/.test(next.head)) errors.push(`(b) зерно ${rs}: следующая порция — «${next.head}»`);
      if (next.q !== missedNow.q) errors.push(`(b) зерно ${rs}: в следующей порции первым не новый промах «${missedNow.q}», а «${next.q}»`);
      dom.window.close();
    }
  }

  // --- (d) полная порция пишет рекорд «k/10» под своим ключом и показывает его; прежний «40/64» не тронут ---
  {
    const dom = await boot({ algoPracticeScope: "all", algoQuizBest: "40/64" }, 7);
    if (/40/.test(view(dom).head)) errors.push(`(d) «по всем главам»: показан прежний рекорд — «${view(dom).head}»`);
    const shown = answerAll(dom, [0, 3, 5]);
    if (shown.length !== 10) errors.push(`(d) полная порция: ${shown.length} вопросов, ожидалось 10`);
    if (dom.window.localStorage.getItem("algoQuizBestPortion") !== "7/10") errors.push(`(d) полная порция: рекорд порции ${dom.window.localStorage.getItem("algoQuizBestPortion")}, ожидалось 7/10`);
    if (dom.window.localStorage.getItem("algoQuizBest") !== "40/64") errors.push(`(d) полная порция перезаписала прежний рекорд algoQuizBest: ${dom.window.localStorage.getItem("algoQuizBest")}, ожидалось 40/64`);
    if (!/Рекорд: 7 \/ 10/.test(view(dom).text)) errors.push(`(d) итог полной порции не показывает рекорд: «${view(dom).text.slice(0, 160)}»`);
    click(dom, view(dom).btn);
    if (!/Рекорд: 7 \/ 10/.test(view(dom).head)) errors.push(`(d) в следующей порции нет рекорда в заголовке: «${view(dom).head}»`);
    dom.window.close();
  }

  // --- (e) сборка порции на случайных наборах ---
  {
    const probe = await boot({}, 1);
    const Q = probe.window.ALGO_QUIZ;
    const bank = Q.questions;
    const slugs = [...new Set(bank.map((x) => x.href.replace(/\.html$/, "")))];
    if (Q.size !== 10) errors.push(`(e) размер порции ${Q.size}, ожидалось 10`);
    for (let s = 1; s <= 400; s++) {
      const rnd = mulberry32(s);
      const all = rnd() < 0.2;
      const done = {};
      slugs.forEach((sl) => { if (rnd() < 0.25) done[sl] = true; });
      const missed = {};
      const seen = {};
      bank.forEach((x) => {
        if (rnd() < 0.15) missed[x.q] = { n: 1 };
        if (rnd() < 0.5) seen[x.q] = rnd() < 0.1 ? "мусор" : Math.floor(rnd() * 1000);
      });
      missed["вопроса нет в банке"] = { n: 3 };
      const got = Q.portion({ done: all ? null : done, missed, seen, rnd: mulberry32(s * 7) });
      const pool = bank.filter((x) => all || done[x.href.replace(/\.html$/, "")]);
      const where = `зерно ${s}`;
      if (got.length !== Math.min(10, pool.length)) { errors.push(`(e) ${where}: в порции ${got.length}, в пуле ${pool.length}`); continue; }
      if (new Set(got.map((x) => x.q)).size !== got.length) errors.push(`(e) ${where}: повтор в порции`);
      if (got.some((x) => !pool.includes(x))) errors.push(`(e) ${where}: вопрос вне пройденных глав`);
      const cls = (x) => (missed[x.q] ? 0 : seen[x.q] == null ? 1 : 2);
      const ts = (x) => (typeof seen[x.q] === "number" ? seen[x.q] : 0);
      // порядок групп; внутри показанных порядок случайный (раздел (f)), а взяты — самые давние
      for (let i = 1; i < got.length; i++) {
        if (cls(got[i]) < cls(got[i - 1])) { errors.push(`(e) ${where}: порядок групп нарушен на ${i}`); break; }
      }
      const left = pool.filter((x) => !got.includes(x));
      const maxCls = Math.max(...got.map(cls));
      const maxTs = Math.max(0, ...got.filter((x) => cls(x) === 2).map(ts));
      if (left.some((x) => cls(x) < maxCls || (maxCls === 2 && cls(x) === 2 && ts(x) < maxTs))) {
        errors.push(`(e) ${where}: за бортом остался вопрос, который шёл бы раньше взятого`);
      }
      if (errors.length > 20) break;
    }
  }

  // --- (f) маленький пул, повторная порция: показанные — каждый раз в другом порядке, промах — первым ---
  // Иначе на двух главах (7 вопросов) порция шла бы одной и той же очередью, и запоминалась бы она, а не
  // признак в условии. Набор вопросов и место промаха от перемешивания не зависят.
  {
    const probe = await boot({}, 1);
    const Q = probe.window.ALGO_QUIZ;
    const pool = Q.questions.filter((x) => SW_TP.has(x.href));
    const seen = Object.fromEntries(pool.map((x, i) => [x.q, 1000 + i]));
    const done = { "sliding-window": true, "two-pointers": true };
    const orders = new Set();
    for (const withMiss of [false, true]) {
      for (let s = 1; s <= 20; s++) {
        const missed = withMiss ? { [pool[3].q]: { n: 1 } } : {};
        const got = Q.portion({ done, missed, seen, rnd: mulberry32(500 + s) });
        if (got.length !== pool.length || pool.some((x) => !got.includes(x))) errors.push(`(f) зерно ${s}: порция — не весь пул из ${pool.length}`);
        if (withMiss && got[0] !== pool[3]) errors.push(`(f) зерно ${s}: промах не первым`);
        if (!withMiss) orders.add(got.map((x) => pool.indexOf(x)).join(","));
      }
    }
    if (orders.size < 10) errors.push(`(f) 20 повторных порций из 7 показанных дали ${orders.size} разных порядков — порция идёт одной очередью`);
  }

  // --- (g) один язык: варианты по-русски, английское название — один раз, в пояснении ---
  // Оглавление и «Слабые места» называют главы по-русски; вариант «Sliding Window» рядом со «Скользящим
  // окном» читался бы как другой приём. Латиница в варианте — только имена Go и аббревиатуры из ALLOWED.
  {
    // en бывает из нескольких имён («Fenwick Tree, BIT», «Segment Tree / Fenwick Tree»): каждое — без учёта регистра
    const enParts = (en) => String(en).split(/[,/]/).map((x) => x.trim().toLowerCase()).filter(Boolean);
    const ALLOWED = /\b(?:BFS|DFS|MST|KMP|NP|BST)\b|A\*|\bK\b|map\[string\]bool/g;
    const probe = await boot({}, 1);
    const bank = probe.window.ALGO_QUIZ.questions;
    const chapters = probe.window.ALGO_CHAPTERS || [];
    const short = (t) => String(t).split(":")[0].trim();
    for (const item of bank) {
      const where = `«${item.q.slice(0, 50)}»`;
      if (!item.options.includes(item.correct)) errors.push(`(g) ${where}: ответа «${item.correct}» нет среди вариантов`);
      if (new Set(item.options).size !== item.options.length) errors.push(`(g) ${where}: повтор среди вариантов ${JSON.stringify(item.options)}`);
      for (const o of item.options) {
        const left = o.replace(ALLOWED, "");
        if (/[A-Za-z]/.test(left)) errors.push(`(g) ${where}: вариант на латинице «${o}»`);
      }
      // ответ, совпавший с названием главы, ведёт в эту главу
      const named = chapters.filter((c) => short(c.t) === item.correct).map((c) => c.h);
      if (named.length && !named.includes(item.href)) errors.push(`(g) ${where}: ответ «${item.correct}» — название главы ${named.join(", ")}, а ссылка ведёт на ${item.href}`);
      if (item.en != null) {
        if (!/[A-Za-z]/.test(item.en)) errors.push(`(g) ${where}: en без латиницы «${item.en}»`);
        for (const part of enParts(item.en)) {
          if (item.explain.toLowerCase().includes(part)) errors.push(`(g) ${where}: английское «${part}» (из en «${item.en}») повторено в тексте пояснения`);
        }
      }
    }
    // после ответа пояснение называет английское имя ровно один раз
    toggleAll(probe, true);
    let withEn = 0;
    for (let i = 0; i < 10; i++) {
      const v = view(probe);
      if (!v.opts.length) break;
      const item = bank.find((x) => x.q === v.q);
      click(probe, v.opts.find((o) => o.textContent !== item.correct));
      click(probe, v.btn);
      const text = probe.window.document.querySelector(".algo-quiz__explain").textContent;
      if (!text.includes(item.correct)) errors.push(`(g) после ответа на «${item.q.slice(0, 50)}» не назван ответ «${item.correct}»`);
      if (item.en) {
        withEn++;
        for (const part of enParts(item.en)) {
          const n = text.toLowerCase().split(part).length - 1;
          if (n !== 1) errors.push(`(g) после ответа на «${item.q.slice(0, 50)}» английское «${part}» (из en «${item.en}») названо ${n} раз(а), ожидался один`);
        }
      }
      click(probe, view(probe).btn);
    }
    if (!withEn) errors.push("(g) в порции из 10 нет ни одного вопроса с английским названием — проверка показа en не сработала");
  }

  // --- (i) переписанные вопросы: банк и перенос промаха и показа ---
  {
    const probe = await boot({}, 1);
    const Q = probe.window.ALGO_QUIZ;
    const renamed = Q.renamed || {};
    const olds = Object.keys(renamed);
    if (!olds.length) errors.push("(i) ALGO_QUIZ.renamed пуст — проверка переноса ничего не проверяет");
    for (const oldQ of olds) {
      if (Q.questions.some((x) => x.q === oldQ)) errors.push(`(i) прежний текст «${oldQ.slice(0, 50)}» всё ещё в банке`);
      const cur = Q.questions.find((x) => x.q === renamed[oldQ]);
      if (!cur) errors.push(`(i) нынешнего текста «${String(renamed[oldQ]).slice(0, 50)}» нет в банке`);
      else if (Q.find(oldQ) !== cur || Q.find(cur.q) !== cur) errors.push(`(i) find() не находит «${cur.q.slice(0, 50)}» по прежнему или нынешнему тексту`);
    }
    if (Q.find("Вопроса нет в банке") !== null) errors.push("(i) find() нашёл вопрос, которого нет в банке");
    if (olds.length) {
      const [a, b] = olds;
      const na = renamed[a], nb = renamed[b];
      const cur = Q.questions.find((x) => x.q === na);
      const dom = await boot({
        algoQuizMissed: JSON.stringify({
          [a]: { n: 2, pattern: "Старый ответ", href: "old.html", q: a },
          [na]: { n: 1, pattern: cur.correct, href: cur.href, q: na },
          "чужой промах": { n: 1, pattern: "P", href: "p.html", q: "чужой промах" },
        }),
        algoQuizSeen: JSON.stringify({ [a]: 500, [na]: 300, [b]: 700 }),
      }, 2);
      const missed = parse(dom, "algoQuizMissed"), seen = parse(dom, "algoQuizSeen");
      if (a in missed || !missed[na] || missed[na].n !== 3 || missed[na].q !== na || missed[na].pattern !== cur.correct || missed[na].href !== cur.href) {
        errors.push(`(i) промах под прежним текстом не перенесён на нынешний (ожидалось n = 3 и ответ банка): ${JSON.stringify(missed)}`);
      }
      if (!missed["чужой промах"]) errors.push("(i) перенос стёр промах другого вопроса");
      if (a in seen || b in seen || seen[na] !== 500 || seen[nb] !== 700) errors.push(`(i) показ не перенесён (ожидалось ${na.slice(0, 20)}… = 500, ${nb.slice(0, 20)}… = 700): ${JSON.stringify(seen)}`);
      // перенесённый промах идёт в порции первым, как любой промах
      const dom2 = await boot({ algoPracticeScope: "all", algoQuizMissed: JSON.stringify({ [b]: { n: 1, pattern: "P", href: "p.html", q: b } }) }, 3);
      if (view(dom2).q !== nb) errors.push(`(i) перенесённый промах не первым в порции: «${view(dom2).q.slice(0, 50)}»`);
      // испорченная запись не перезаписывается
      const dom3 = await boot({ algoQuizMissed: "{не json" }, 4);
      if (dom3.window.localStorage.getItem("algoQuizMissed") !== "{не json") errors.push("(i) перенос перезаписал испорченный algoQuizMissed");
      [dom, dom2, dom3].forEach((d) => d.window.close());
    }
  }

  // --- (j) покрытие ядра и хеш-таблица как ответ ---
  {
    const probe = await boot({}, 1);
    const bank = probe.window.ALGO_QUIZ.questions;
    const core = (probe.window.ALGO_CHAPTERS || []).filter((c) => c.lvl === "core");
    // «Инварианты и индукция» — о том, как доказать корректность кода, а не о приёме, который узнают по условию
    const SKIP = new Set(["invariants.html"]);
    if (core.length < 20) errors.push(`(j) глав ядра в progress.js ${core.length} — проверка покрытия не нашла реестр`);
    for (const c of core) {
      if (SKIP.has(c.h)) continue;
      if (!bank.some((x) => x.href === c.h)) errors.push(`(j) у главы ядра «${c.t}» (${c.h}) нет ни одного вопроса квиза`);
    }
    const hash = bank.filter((x) => x.href === "hash-table-structure.html").length;
    if (hash < 2) errors.push(`(j) хеш-таблица — ответ ${hash} вопросов, нужно хотя бы 2: иначе ученик учится её отбрасывать`);
  }
}

// (h) длина вариантов. Без DOM: банк — из самого quiz.js с заглушками окна и хранилища.
const LONG_RATIO = 1.25;
const LONG_EXTRA = 8;
function bankOf(src) {
  const win = {};
  const store = {};
  const ls = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
  new Function("window", "document", "localStorage", src)(win, { readyState: "complete", querySelectorAll: () => [] }, ls);
  return win.ALGO_QUIZ;
}
// lengthProblems — вопросы, где верный вариант угадывается по длине, и сколько раз верный — самый длинный.
function lengthProblems(bank) {
  const len = (s) => [...String(s).trim()].length;
  const bad = [];
  let longest = 0;
  for (const item of bank) {
    const lc = len(item.correct);
    const lw = Math.max(...item.options.filter((o) => o !== item.correct).map(len));
    if (lc > lw) longest++;
    if (lc >= LONG_RATIO * lw && lc - lw >= LONG_EXTRA) {
      bad.push(`(h) «${item.q.slice(0, 50)}»: верный вариант «${item.correct}» длиннее всех неверных (${lc} против ${lw} символов) — ответ угадывается по длине; допиши неверные варианты до той же подробности`);
    }
  }
  return { bad, longest };
}
const quizBank = bankOf(quizJs).questions;
const lengthStat = lengthProblems(quizBank);
errors.push(...lengthStat.bad);
// src/quiz.md называет размер банка («берёт все N вопросов») — число обязано совпасть с банком
{
  const md = fs.readFileSync(path.join(root, "src", "quiz.md"), "utf8");
  const m = md.match(/берёт все (\d+) вопрос/);
  if (!m) errors.push("src/quiz.md: не найдено «берёт все N вопросов» — проверка размера банка ничего не сверяет");
  else if (Number(m[1]) !== quizBank.length) errors.push(`src/quiz.md: «берёт все ${m[1]} вопросов», а в банке ${quizBank.length}`);
}
// мутация: раздутый верный вариант обязан дать ровно одну ошибку — иначе правило ничего не проверяет
{
  const q0 = quizBank[0];
  const long = q0.correct + " со сходящимися концами массива";
  const mut = { ...q0, correct: long, options: q0.options.map((o) => (o === q0.correct ? long : o)) };
  if (lengthProblems([mut]).bad.length !== 1) errors.push(`(h) правило длины не поймало мутацию «${long}» против ${JSON.stringify(q0.options)}`);
}

main().then(finish, (e) => { console.error("❌ quiz-check: неожиданная ошибка:", e); process.exit(1); });
// Обещание, которое так и не исполнилось, не держит node: процесс тихо вышел бы с кодом 0, не дойдя до итога.
process.on("exit", (code) => {
  if (code === 0 && !finished) {
    console.error("❌ quiz-check: проверка не дошла до итога (обещание не исполнилось)");
    process.exitCode = 1;
  }
});
let finished = false;

function finish() {
  finished = true;
  if (errors.length) {
    console.error(`❌ quiz-check: ${errors.length} проблем(ы):`);
    for (const e of errors.slice(0, 40)) console.error("  - " + e);
    process.exit(1);
  }
  console.log(
    "✅ quiz-check: пустой трекер — объяснение и «по всем главам» (выбор сохраняется, без хранилища — в памяти); " +
      "две главы — порция из их 7 вопросов, промах первым, «Следующая порция»; показы пишутся по свежему чтению; " +
      "рекорд — только у порции из 10 и под своим ключом, «40/64» не показан и не тронут; сборка порции на 400 случайных наборах " +
      "держит размер, главы, порядок групп; повторная порция — в новом порядке; " +
      "варианты по-русски, английское название — один раз в пояснении; " +
      `верный вариант не угадывается по длине (самый длинный — в ${lengthStat.longest} из ${quizBank.length}, ${Math.round((100 * lengthStat.longest) / quizBank.length)} %); ` +
      "переписанные вопросы переносят промах и показ; у каждой главы ядра, кроме инвариантов, есть вопрос"
  );
  process.exit(0);
}
