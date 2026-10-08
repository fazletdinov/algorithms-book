#!/usr/bin/env node
// Headless smoke смешанной тренировки и диагностики слабых мест — на СОБРАННЫХ
// страницах, с настоящим банком задач.
//
//   mdbook build && node scripts/mixed-check.js
//
// Что проверяется (и почему именно это):
//   1) до ответа НЕ видно ни имени пакета и функции, ни главы, ни подсказок из условия —
//      иначе вся затея бессмысленна: подсказка «Ожидаемая сложность: O(log n)»
//      на отсортированном массиве и есть ответ «бинарный поиск»;
//   2) вариантов ровно 4, среди них верный, и все — реальные главы книги; неверные
//      сначала берутся из путаемых шаблонов (ALGO_CONFUSABLE), а группы названы
//      настоящими главами — опечатка тихо выключила бы группу;
//   3) верный ответ раскрывает тему, подсказки и редактор с пакетом задачи;
//   4) промах пишется в algoMixedMissed, верный ответ убирает запись;
//   5) промахи квиза и смешанной тренировки попадают в таблицу слабых мест;
//   6) банк задач не пустой и ссылается только на существующие главы.
// Если jsdom не найден — мягкий пропуск (exit 0), как в остальных смоуках.
"use strict";
const fs = require("fs");
const path = require("path");

let JSDOM, VirtualConsole;
try {
  ({ JSDOM, VirtualConsole } = require("jsdom"));
} catch (e) {
  console.log("⏭  mixed-check: jsdom не установлен — пропускаю (npm i jsdom).");
  process.exit(0);
}

const root = path.resolve(__dirname, "..");
for (const p of ["mixed.html", "review.html"]) {
  if (!fs.existsSync(path.join(root, "book", p))) {
    console.error(`❌ mixed-check: нет book/${p} — сначала \`mdbook build\`.`);
    process.exit(1);
  }
}

const errors = [];
const vc = new VirtualConsole();
vc.on("jsdomError", () => {}); // собственные скрипты mdBook в jsdom шумят

const asset = (f) => fs.readFileSync(path.join(root, "assets", f), "utf8");

// shownProblem узнаёт показанную задачу по ПОЛНОМУ условию (абзацы в карточке —
// отдельные <p>, поэтому \n убираем). Раньше хватало первых 40 символов, но у
// dijkstra.ShortestPath и bellmanford.ShortestPath они совпадают («ShortestPath
// возвращает длину кратчайшег…»), главы у них разные — и выдача dijkstra изредка
// опознавалась как bellmanford: смоук падал с «среди вариантов нет верного».
function shownProblem(bank, cardText) {
  return (bank || []).find((q) => cardText.includes(q.s.split("\n").join("")));
}

function boot(page, scripts, seed) {
  return new Promise((resolve) => {
    const dom = new JSDOM(fs.readFileSync(path.join(root, "book", page), "utf8"), {
      runScripts: "dangerously",
      virtualConsole: vc,
      url: "https://example.test/" + page,
    });
    dom.window.addEventListener("load", () => {
      Object.keys(seed || {}).forEach((k) => dom.window.localStorage.setItem(k, seed[k]));
      scripts.forEach((f) => {
        const s = dom.window.document.createElement("script");
        s.textContent = asset(f);
        dom.window.document.body.appendChild(s);
      });
      resolve(dom);
    });
  });
}

const click = (dom, node) => node.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));

async function main() {
  // --- банк задач ---
  const bankSrc = asset("problems.js");
  const sandbox = { window: {} };
  new Function("window", bankSrc)(sandbox.window);
  const bank = sandbox.window.ALGO_PROBLEMS;
  if (!Array.isArray(bank) || bank.length < 50) {
    errors.push(`банк задач подозрительно мал: ${bank && bank.length}`);
  }
  const chapters = new Set(
    fs.readdirSync(path.join(root, "src")).filter((f) => f.endsWith(".md")).map((f) => f.replace(/\.md$/, ""))
  );
  const badChapter = (bank || []).find((p) => !chapters.has(p.c));
  if (badChapter) errors.push(`задача ${badChapter.p}.${badChapter.f} ссылается на несуществующую главу «${badChapter.c}»`);
  const withHints = (bank || []).filter((p) => p.h).length;
  if (!withHints) errors.push("ни у одной задачи не отделены подсказки — проверь problembank");
  const leak = (bank || []).find((p) => /Ожидаемая сложность|Подсказка:/.test(p.s));
  if (leak) errors.push(`в условии ${leak.p}.${leak.f} осталась подсказка, называющая приём`);

  // --- страница смешанной тренировки ---
  const dom = await boot("mixed.html", ["progress.js", "problems.js", "runner.js", "mixed.js"], {});
  const doc = dom.window.document;
  const widget = doc.querySelector(".algo-mixed");
  if (!widget) {
    errors.push("виджет .algo-mixed не найден");
    return finish();
  }

  const nextBtn = [...widget.querySelectorAll("button")].find((b) => /Дать задачу/.test(b.textContent));
  if (!nextBtn) {
    errors.push("нет кнопки «Дать задачу»");
    return finish();
  }
  click(dom, nextBtn);

  const shown = widget.querySelector(".algo-mixed__card");
  if (!shown) {
    errors.push("после нажатия не появилось условие");
    return finish();
  }
  const statement = shown.textContent;
  if (/Ожидаемая сложность|Подсказка:/.test(statement)) {
    errors.push("в показанном условии есть подсказка, называющая приём");
  }
  if (widget.querySelector(".algo-runner")) {
    errors.push("редактор с пакетом показан ДО выбора шаблона — имя пакета выдаёт тему");
  }
  if (/Открыть главу|algo-mixed__link/.test(widget.innerHTML) && !widget.querySelector(".algo-mixed__result")) {
    errors.push("ссылка на главу видна до ответа");
  }

  const opts = [...widget.querySelectorAll(".algo-mixed__q .algo-challenge__opt")];
  if (opts.length !== 4) errors.push(`вариантов ответа ${opts.length}, ожидалось 4`);
  const titles = opts.map((b) => b.textContent);
  if (new Set(titles).size !== titles.length) errors.push(`варианты повторяются: ${titles.join(" | ")}`);

  // выбираем заведомо НЕверный: тот, что не совпадает с темой показанной задачи
  const problem = shownProblem(bank, statement);
  if (!problem) {
    errors.push("не удалось сопоставить показанное условие с банком");
    return finish();
  }
  const correctTitle = (() => {
    const list = dom.window.ALGO_CHAPTERS || [];
    const hit = list.find((c) => c.h === problem.c + ".html");
    return hit ? hit.t : problem.c;
  })();
  if (!titles.includes(correctTitle)) {
    errors.push(`среди вариантов нет верного («${correctTitle}»): ${titles.join(" | ")}`);
    return finish();
  }
  // Имя функции — тоже подсказка («SieveOfEratosthenes возвращает…»): генератор банка
  // заменяет его на «Функция» и f(…), и до ответа его быть не должно.
  if (new RegExp("\\b" + problem.f + "\\b").test(statement)) {
    errors.push(`в условии видно имя функции ${problem.f} — оно называет приём`);
  }
  // Путаемые шаблоны: имена групп — настоящие главы, и если у верной главы есть
  // соседи в банке, среди неверных вариантов стоит хотя бы min(2, соседей) из них.
  const groups = dom.window.ALGO_CONFUSABLE || [];
  const slugs = new Set(fs.readdirSync(path.join(root, "src")).map((f) => f.replace(/\.md$/, "")));
  const typos = [].concat(...groups).filter((c) => !slugs.has(c));
  if (!groups.length) errors.push("mixed.js не выставил ALGO_CONFUSABLE — неверные варианты снова случайные");
  if (typos.length) errors.push(`в группах путаемых шаблонов нет таких глав: ${typos.join(", ")}`);
  const inBank = new Set(bank.map((p) => p.c));
  const titleOf = (slug) => ((dom.window.ALGO_CHAPTERS || []).find((c) => c.h === slug + ".html") || {}).t || slug;
  const near = new Set([].concat(...groups.filter((g) => g.includes(problem.c))).filter((c) => c !== problem.c && inBank.has(c)));
  const nearShown = titles.filter((t) => [...near].map(titleOf).includes(t)).length;
  if (nearShown < Math.min(2, near.size)) {
    errors.push(`для «${problem.c}» среди вариантов ${nearShown} путаемых шаблонов из ${near.size}: ${titles.join(" | ")}`);
  }

  const wrongBtn = opts.find((b) => b.textContent !== correctTitle);
  // промах заводит карточку сразу: движок повторений зовут без перехода на другую страницу
  let synced = 0;
  dom.window.ALGO_SRS = { sync: () => { synced++; } };
  // Черновик смешанной стирается при выдаче НОВОЙ задачи, а не при постройке редактора: подкладываем
  // его до ответа, как будто читатель уже печатал, — после ответа он обязан остаться.
  const draftKey = "algoRunnerCode:mixed:" + problem.p;
  dom.window.localStorage.setItem(draftKey, "мой черновик");
  click(dom, wrongBtn);

  const missed = JSON.parse(dom.window.localStorage.getItem("algoMixedMissed") || "{}");
  const id = problem.p + "." + problem.f;
  if (!missed[id]) errors.push(`промах не записан: ${JSON.stringify(missed)}`);
  if (synced !== 1) errors.push(`после промаха ALGO_SRS.sync вызван ${synced} раз(а), ожидался один`);
  const result = widget.querySelector(".algo-mixed__result");
  if (!result) errors.push("после ответа не показан разбор");
  else {
    if (!result.textContent.includes(correctTitle)) errors.push("в разборе не назван верный шаблон");
    if (problem.h && !result.textContent.includes(problem.h.slice(0, 30))) {
      errors.push("после ответа не показаны скрытые подсказки");
    }
    const link = result.querySelector("a");
    if (!link || link.getAttribute("href") !== problem.c + ".html") {
      errors.push("нет ссылки на главу с теорией");
    }
  }
  const ed = widget.querySelector('.algo-runner[data-pkg="' + problem.p + '"]');
  if (!ed) {
    errors.push("после ответа не появился редактор с нужным пакетом");
  } else {
    // Обычный режим: редактор открывает упражнение задачи (единицу прогона выберет виджет: функция, тип
    // или пакет), черновик — свой, отдельный от решения пакета в главе; подсказки и «Сдаюсь» на месте.
    if (ed.getAttribute("data-func") !== problem.f) errors.push(`обычный режим: data-func = ${ed.getAttribute("data-func")}, а задача — ${problem.f}`);
    if (ed.getAttribute("data-draft") !== "mixed") errors.push(`обычный режим: data-draft = ${ed.getAttribute("data-draft")}, ожидалось mixed`);
    if (ed.hasAttribute("data-hints") || ed.hasAttribute("data-tests")) errors.push("обычный режим: у редактора data-hints или data-tests — подсказки спрятаны или тесты заданы вручную");
  }
  if (dom.window.localStorage.getItem(draftKey) !== "мой черновик") errors.push("черновик смешанной стёрт постройкой редактора, а не выдачей новой задачи");
  click(dom, nextBtn);
  if (dom.window.localStorage.getItem(draftKey) !== null) errors.push("при выдаче новой задачи черновик прошлой не стёрт");

  // верный ответ по той же задаче должен убрать её из промахов
  const dom2 = await boot("mixed.html", ["progress.js", "problems.js", "runner.js", "mixed.js"], {
    algoMixedMissed: JSON.stringify({ [id]: { n: 1, chapter: problem.c, pkg: problem.p, fn: problem.f } }),
  });
  const w2 = dom2.window.document.querySelector(".algo-mixed");
  // «дать задачу» повторяем, пока не выпадет именно она (промахи приоритетны, но не гарантированы)
  const next2 = [...w2.querySelectorAll("button")].find((b) => /Дать задачу/.test(b.textContent));
  let found = false;
  for (let i = 0; i < 60 && !found; i++) {
    click(dom2, next2);
    const card = w2.querySelector(".algo-mixed__card");
    if (card && card.textContent.includes(problem.s.slice(0, 40))) found = true;
  }
  if (!found) {
    errors.push("задача с промахом ни разу не выпала за 60 попыток — приоритет промахов не работает");
  } else {
    const o2 = [...w2.querySelectorAll(".algo-mixed__q .algo-challenge__opt")];
    const right = o2.find((b) => b.textContent === correctTitle);
    if (!right) errors.push("во второй выдаче нет верного варианта");
    else {
      click(dom2, right);
      const after = JSON.parse(dom2.window.localStorage.getItem("algoMixedMissed") || "{}");
      if (after[id]) errors.push("верный ответ не убрал задачу из промахов");
    }
  }

  // --- режим собеседования ---
  await mockInterview(bank);

  // --- диагностика слабых мест ---
  const dom3 = await boot("review.html", ["progress.js", "review.js"], {
    algoQuizMissed: JSON.stringify({
      "Вопрос про кучу": { n: 2, pattern: "Two Heaps", href: "two-heaps.html", q: "Вопрос про кучу" },
    }),
    algoMixedMissed: JSON.stringify({
      "topk.KthLargest": { n: 1, chapter: "top-k-elements", pkg: "topk", fn: "KthLargest" },
      "twoheaps.MedianFinder": { n: 3, chapter: "two-heaps", pkg: "twoheaps", fn: "MedianFinder" },
    }),
  });
  const table = dom3.window.document.querySelector(".algo-weak__table");
  if (!table) {
    errors.push("таблица слабых мест не отрисовалась");
  } else {
    const rows = [...table.querySelectorAll("tr")].slice(1).map((tr) =>
      [...tr.querySelectorAll("td")].map((td) => td.textContent)
    );
    if (rows.length < 2) errors.push(`строк в таблице ${rows.length}, ожидалось ≥ 2`);
    const top = rows[0];
    if (!/Two Heaps/.test(top[0])) {
      errors.push(`сверху не самый слабый шаблон: ${JSON.stringify(rows)}`);
    }
    if (top[3] !== "5") errors.push(`сумма промахов у верхней строки = ${top[3]}, ожидалось 5 (2 квиз + 3 смешанная)`);
  }

  finish();
}

// mockInterview проходит собеседование от начала до итога. Проверяется то, ради
// чего режим существует: до итога не видно ни подсказок (среди них эталонная
// сложность), ни главы; редактор появляется только после плана; гоняются только
// тесты этой функции и с чистой заготовки; сложность спрашивается ДО эталона.
// Зелёный прогон эмулируется тем же событием, что шлёт runner.js — сервера в
// смоуке нет.
async function mockInterview(bank) {
  const dom = await boot("mixed.html", ["progress.js", "problems.js", "runner.js", "mixed.js"], {});
  const doc = dom.window.document;
  const ls = dom.window.localStorage;
  const w = doc.querySelector(".algo-mixed");
  const modeBox = w && w.querySelector(".algo-mixed__mode-box");
  if (!modeBox) {
    errors.push("нет переключателя режима собеседования");
    return;
  }
  modeBox.checked = true;
  modeBox.dispatchEvent(new dom.window.Event("change"));
  const next = [...w.querySelectorAll("button")].find((b) => /Дать задачу/.test(b.textContent));

  // берём задачу с эталонной сложностью (поле x банка) — она есть у девяти задач из десяти,
  // так что обычно хватает первой выдачи
  let p = null;
  for (let i = 0; i < 60 && !p; i++) {
    click(dom, next);
    const card = w.querySelector(".algo-mixed__card");
    const hit = card && shownProblem(bank, card.textContent);
    if (!hit) continue;
    if (!hit.t || !hit.t.length) {
      errors.push(`режим собеседования выдал ${hit.p}.${hit.f} — у неё нет своих тестов`);
      return;
    }
    if (hit.x) p = hit;
  }
  if (!p) {
    errors.push("за 60 выдач не попалась задача с эталонной сложностью");
    return;
  }
  if (!w.querySelector(".algo-mixed__clock")) errors.push("в режиме собеседования нет таймера");

  const title = (() => {
    const hit = (dom.window.ALGO_CHAPTERS || []).find((c) => c.h === p.c + ".html");
    return hit ? hit.t : p.c;
  })();
  const right = [...w.querySelectorAll(".algo-mixed__q .algo-challenge__opt")].find((b) => b.textContent === title);
  if (!right) {
    errors.push("в режиме собеседования среди вариантов нет верного");
    return;
  }
  click(dom, right);

  if (w.querySelector(".algo-runner")) errors.push("собеседование: редактор показан ДО плана");
  if (w.querySelector(".algo-mixed__link")) errors.push("собеседование: ссылка на главу видна до итога");
  if (p.h && w.textContent.includes(p.h.slice(0, 30))) {
    errors.push("собеседование: подсказки (с эталонной сложностью) видны до итога");
  }

  const ta = w.querySelector(".algo-mixed__plan-text");
  const go = w.querySelector(".algo-mixed__to-code");
  if (!ta || !go) {
    errors.push("собеседование: нет поля плана или кнопки «К коду»");
    return;
  }
  // Гейт проверяем нажатием, а не видом кнопки: сразу, с пустым полем, и с
  // коротким планом — редактор не должен появиться ни разу.
  click(dom, go);
  if (w.querySelector(".algo-runner")) errors.push("собеседование: «К коду» с пустым планом открыло редактор");
  ta.value = "окно и мапа";
  ta.dispatchEvent(new dom.window.Event("input"));
  if (!go.disabled) errors.push("собеседование: короткий план пускает к коду");
  click(dom, go);
  if (w.querySelector(".algo-runner")) errors.push("собеседование: короткий план открыл редактор");
  ta.value = "Иду окном по массиву: правая граница расширяет, левая догоняет при нарушении. " +
    "Держу частоты в массиве, инвариант — окно валидно после сжатия. Край — пустой вход.";
  ta.dispatchEvent(new dom.window.Event("input"));
  if (go.disabled) errors.push("собеседование: полноценный план не открыл кнопку «К коду»");
  click(dom, go);

  const runner = w.querySelector('.algo-runner[data-pkg="' + p.p + '"]');
  if (!runner) {
    errors.push("собеседование: после плана не появился редактор с пакетом задачи");
    return;
  }
  if (runner.getAttribute("data-tests") !== JSON.stringify(p.t)) {
    errors.push(`собеседование: редактор гоняет не те тесты: ${runner.getAttribute("data-tests")} вместо ${JSON.stringify(p.t)}`);
  }
  if (runner.getAttribute("data-fresh") !== "true") {
    errors.push("собеседование: редактор не с чистой заготовки — подсунет решение пакета из его главы");
  }
  // Подсказки и эталон в собеседовании закрыты: среди подсказок — «Ожидаемая сложность», то есть ответ на шаг
  // «сложность»; data-func — чтобы событие прогона называло функцию, а строка про needs знала соседей.
  if (runner.getAttribute("data-hints") !== "off") errors.push("собеседование: у редактора нет data-hints=\"off\" — подсказки и эталон доступны");
  if (runner.getAttribute("data-func") !== p.f) errors.push(`собеседование: data-func = ${runner.getAttribute("data-func")}, а задача — ${p.f}`);
  if (w.querySelector(".algo-mixed__cx-input")) errors.push("собеседование: вопрос о сложности ДО зелёных тестов");

  // красный прогон не должен двигать сессию дальше
  runner.dispatchEvent(new dom.window.CustomEvent("algo-runner:result", {
    bubbles: true, detail: { pkg: p.p, ok: false, filtered: true, passed: 0, failed: 1 },
  }));
  if (w.querySelector(".algo-mixed__cx-input")) errors.push("собеседование: красные тесты открыли вопрос о сложности");

  runner.dispatchEvent(new dom.window.CustomEvent("algo-runner:result", {
    bubbles: true, detail: { pkg: p.p, ok: true, filtered: true, passed: 1, failed: 0 },
  }));
  const cx = w.querySelector(".algo-mixed__cx-input");
  if (!cx) {
    errors.push("собеседование: после зелёных тестов нет вопроса о сложности");
    return;
  }
  if (w.querySelector(".algo-mixed__cx-ref")) errors.push("собеседование: эталон сложности виден ДО своего ответа");
  cx.value = "O(n) по времени, O(1) по памяти";
  cx.dispatchEvent(new dom.window.Event("input"));
  click(dom, w.querySelector(".algo-mixed__cx-check"));
  const ref = w.querySelector(".algo-mixed__cx-ref");
  if (!ref) {
    errors.push(`собеседование: после ответа не показан эталон, хотя в банке у ${p.p}.${p.f} x = «${p.x}»`);
    return;
  }
  if (ref.textContent !== "Эталон: " + p.x) errors.push(`собеседование: эталон «${ref.textContent}», а в банке у ${p.p}.${p.f} x = «${p.x}»`);
  if (w.querySelector(".algo-mixed__summary")) errors.push("собеседование: итог подведён до самооценки");
  // промах по сложности заводит карточку сразу: движок повторений зовут без перехода на другую страницу
  let synced = 0;
  dom.window.ALGO_SRS = { sync: () => { synced++; } };
  click(dom, w.querySelector(".algo-mixed__cx-no"));
  if (synced !== 1) errors.push(`собеседование: после промаха по сложности ALGO_SRS.sync вызван ${synced} раз(а), ожидался один`);

  const sum = w.querySelector(".algo-mixed__summary");
  if (!sum) {
    errors.push("собеседование: нет итога");
    return;
  }
  const link = sum.querySelector(".algo-mixed__link");
  if (!link || link.getAttribute("href") !== p.c + ".html") errors.push("собеседование: после итога не открылась глава");
  if (p.h && !sum.textContent.includes(p.h.slice(0, 30))) errors.push("собеседование: после итога не показаны подсказки");

  const id = p.p + "." + p.f;
  const log = JSON.parse(ls.getItem("algoMockLog") || "[]");
  const rec = log[log.length - 1] || {};
  if (log.length !== 1 || rec.k !== id || !rec.pattern || !rec.green || rec.cx !== "miss" || !(rec.plan >= 80)) {
    errors.push("собеседование: в истории не то: " + JSON.stringify(log));
  }
  const cxMissed = JSON.parse(ls.getItem("algoMockCxMissed") || "{}");
  if (!cxMissed[id]) errors.push("собеседование: промах по сложности не записан для повторений");

  // Задачи без своих тестов режим выдавать не должен. Случайной выдачей это не
  // проверить (таких 4 из 163), поэтому детерминированно: все задачи СО своими
  // тестами помечаем показанными — выдача предпочитает непоказанные, и при
  // ошибке фильтра неизбежно вытащит задачу без тестов.
  const untested = bank.filter((q) => !q.t || !q.t.length);
  if (!untested.length) return; // нечего проверять — все задачи с тестами
  const seen = {};
  bank.filter((q) => q.t && q.t.length).forEach((q) => { seen[q.p + "." + q.f] = 1; });
  const dom2 = await boot("mixed.html", ["progress.js", "problems.js", "runner.js", "mixed.js"], {
    algoMixedSeen: JSON.stringify(seen),
  });
  const w2 = dom2.window.document.querySelector(".algo-mixed");
  const box2 = w2.querySelector(".algo-mixed__mode-box");
  box2.checked = true;
  box2.dispatchEvent(new dom2.window.Event("change"));
  click(dom2, [...w2.querySelectorAll("button")].find((b) => /Дать задачу/.test(b.textContent)));
  const card2 = w2.querySelector(".algo-mixed__card");
  const bad = card2 && untested.find((q) => card2.textContent.includes(q.s.slice(0, 40)));
  if (bad) errors.push(`режим собеседования выдал ${bad.p}.${bad.f} — у неё нет своих тестов`);
}

function finish() {
  if (errors.length) {
    console.error(`❌ mixed-check: ${errors.length} проблем(ы):`);
    for (const e of errors) console.error("  - " + e);
    process.exit(1);
  }
  console.log(
    "✅ mixed-check: условие показывается без темы и подсказок, 4 варианта из реальных глав, " +
      "промах записывается и приоритетно возвращается, верный ответ раскрывает главу и редактор (data-func задачи, " +
      "черновик data-draft=\"mixed\" стирается выдачей новой задачи, а не постройкой редактора), " +
      "слабые места считаются по квизу и смешанной вместе; собеседование прячет подсказки и главу до итога, " +
      "пускает к коду только после плана, гоняет тесты одной функции с чистой заготовки без подсказок и эталона " +
      "(data-hints=\"off\"), спрашивает сложность до эталона"
  );
  // Явный выход: последняя проверка начинает собеседование, и его часы (setInterval
  // в mixed.js) держат цикл событий jsdom-окна живым — без exit процесс после «✅»
  // не завершался вовсе и висел до внешнего таймаута.
  process.exit(0);
}

main().catch((e) => {
  console.error("❌ mixed-check: неожиданная ошибка:", e);
  process.exit(1);
});
