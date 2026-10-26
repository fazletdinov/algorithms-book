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
//   4) промах пишется в algoMixedMissed, верный ответ убирает запись; ответ сразу оценивает карточку
//      mix: через ALGO_SRS.report (верно — «Помню», неверно — «Забыл»), один раз на вопрос;
//   5) промахи квиза и смешанной тренировки попадают в таблицу слабых мест; глава промаха — из банка по
//      pkg/fn (прежний промах bigo.* с главой big-o считается у монотонного стека);
//   6) банк задач не пустой и ссылается только на существующие главы;
//   7) по умолчанию — только пройденные главы: меньше трёх глав с задачами — сообщение с их числом и двумя
//      выходами, «по всем главам» пишет algoPracticeScope; при трёх главах — задачи с c или a из них, у
//      собеседования — только со своими тестами и без соседей (n);
//   8) альтернативы: показан один верный вариант (c, если пройдена, иначе пройденная из a), выбор
//      альтернативы — не промах, вердикт называет «также решается»; неверные варианты — не c и не из a,
//      сначала пройденные (на 300 случайных наборах глав с зерном);
//   9) признак g не виден до ответа; после неверного — «Как это было узнать» раньше подсказок;
//  10) после промаха — ряд таблицы пар (pairs.js) только в точном направлении «верный = use, выбранный = not»:
//      в обычном режиме под признаком, в собеседовании — в итоге; ряды с обеими главами-ответами банка лежат
//      внутри одной группы CONFUSABLE;
//  11) задача с np (условие само называет приём — cmd/problembank/nopick.go) обычной смешанной не выдаётся,
//      а собеседование выдаёт её без шага «какой шаблон?»: сразу план, ни промаха, ни report карточки mix:,
//      в итоге и истории шаблон — «назван в условии» (pattern: null). Мутант «флаг игнорируется» (servable
//      без проверки np) краснеет здесь.
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
const { mulberry32 } = require("./lib/rand.js");

// shownProblem узнаёт показанную задачу по ПОЛНОМУ условию (абзацы в карточке —
// отдельные <p>, поэтому \n убираем). Раньше хватало первых 40 символов, но у
// dijkstra.ShortestPath и bellmanford.ShortestPath они совпадают («ShortestPath
// возвращает длину кратчайшег…»), главы у них разные — и выдача dijkstra изредка
// опознавалась как bellmanford: смоук падал с «среди вариантов нет верного».
function shownProblem(bank, cardText) {
  return (bank || []).find((q) => cardText.includes(q.s.split("\n").join("")));
}

// boot — собранная страница; seed ложится в хранилище до скриптов. Режим выдачи по умолчанию — «по всем
// главам» (algoPracticeScope = "all"): сценарии ниже проверяют выдачу из всего банка; разделы о пройденных
// главах передают algoPracticeScope: null — ключа нет, работает режим по умолчанию, «только пройденные».
// rngSeed — зерно Math.random страницы (выдача и варианты повторяемы).
function boot(page, scripts, seed, rngSeed) {
  return new Promise((resolve) => {
    const dom = new JSDOM(fs.readFileSync(path.join(root, "book", page), "utf8"), {
      runScripts: "dangerously",
      virtualConsole: vc,
      url: "https://example.test/" + page,
    });
    dom.window.addEventListener("load", () => {
      const all = Object.assign({ algoPracticeScope: "all" }, seed || {});
      Object.keys(all).forEach((k) => { if (all[k] !== null) dom.window.localStorage.setItem(k, all[k]); });
      if (rngSeed) dom.window.Math.random = mulberry32(rngSeed);
      scripts.forEach((f) => {
        const s = dom.window.document.createElement("script");
        s.textContent = f.endsWith(".js") ? asset(f) : f; // не имя файла — сам код
        dom.window.document.body.appendChild(s);
      });
      resolve(dom);
    });
  });
}

// fillEdges — три граничных случая собеседования: без них «К коду» закрыта так же, как без плана.
function fillEdges(root, win, vals) {
  root.querySelectorAll(".algo-mixed__edge").forEach((e, i) => {
    e.value = (vals || ["пустой массив", "все равны", "k больше n"])[i] || "";
    e.dispatchEvent(new win.Event("input"));
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
  // соседи — без глав, чей ответ тоже верен (a): они не бывают неверным вариантом
  const near = new Set([].concat(...groups.filter((g) => g.includes(problem.c))).filter((c) => c !== problem.c && !problem.a.includes(c) && inBank.has(c)));
  const nearShown = titles.filter((t) => [...near].map(titleOf).includes(t)).length;
  if (nearShown < Math.min(2, near.size)) {
    errors.push(`для «${problem.c}» среди вариантов ${nearShown} путаемых шаблонов из ${near.size}: ${titles.join(" | ")}`);
  }

  const wrongBtn = opts.find((b) => b.textContent !== correctTitle);
  // ответ уходит в движок повторений сразу — report после записи промаха (новую карточку заведёт sync
  // внутри report), без перехода на другую страницу
  const reports = [];
  dom.window.ALGO_SRS = { report: (rid, grade) => { reports.push(rid + " " + grade + " " + !!JSON.parse(dom.window.localStorage.getItem("algoMixedMissed") || "{}")[rid.slice(4)]); return { status: "created" }; } };
  // Черновик смешанной стирается при выдаче НОВОЙ задачи, а не при постройке редактора: подкладываем
  // его до ответа, как будто читатель уже печатал, — после ответа он обязан остаться.
  const draftKey = "algoRunnerCode:mixed:" + problem.p;
  dom.window.localStorage.setItem(draftKey, "мой черновик");
  click(dom, wrongBtn);

  const missed = JSON.parse(dom.window.localStorage.getItem("algoMixedMissed") || "{}");
  const id = problem.p + "." + problem.f;
  if (!missed[id]) errors.push(`промах не записан: ${JSON.stringify(missed)}`);
  // «true» в конце — промах в algoMixedMissed уже записан к моменту report
  if (reports.join() !== `mix:${id} again true`) errors.push(`после промаха report: ${JSON.stringify(reports)}, ожидался один «mix:${id} again» после записи промаха`);
  // повторный щелчок по вариантам того же вопроса — не второй ответ
  opts.forEach((b) => click(dom, b));
  if (reports.length !== 1) errors.push(`повторные щелчки по вариантам дали report: ${JSON.stringify(reports)}`);
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
  // Новая задача начинается с чистого листа, даже если в её пакете лежит старый черновик смешанной
  // (с прошлого раза). Чтобы следующая задача была из ДРУГОГО пакета (иначе её черновик стёр бы и
  // шаг «прошлая задача»), задачи пакета текущей помечены показанными — выдача берёт непоказанные.
  const ls = dom.window.localStorage;
  const seenNow = JSON.parse(ls.getItem("algoMixedSeen") || "{}");
  bank.filter((q) => q.p === problem.p).forEach((q) => { seenNow[q.p + "." + q.f] = 1; });
  ls.setItem("algoMixedSeen", JSON.stringify(seenNow));
  [...new Set(bank.map((q) => q.p))].forEach((p) => { if (p !== problem.p) ls.setItem("algoRunnerCode:mixed:" + p, "старый черновик " + p); });
  click(dom, nextBtn);
  if (ls.getItem(draftKey) !== null) errors.push("при выдаче новой задачи черновик прошлой не стёрт");
  const next = shownProblem(bank, widget.querySelector(".algo-mixed__card").textContent);
  if (!next || next.p === problem.p) errors.push(`следующая задача не из другого пакета: ${next && next.p} — проверка ниже ничего не видит`);
  else if (ls.getItem("algoRunnerCode:mixed:" + next.p) !== null) errors.push(`новая задача пакета ${next.p} откроется со старым черновиком смешанной, а не с чистой заготовки`);

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

  // --- ответ оценивает карточку mix: в настоящем движке повторений (srs.js): верно — «Помню», неверно — «Забыл» ---
  await gradesMixCard(problem, correctTitle);
  await raceFlag(bank);
  await typeTask(bank);

  // --- пройденные главы, альтернативные ответы, признак ---
  await practiceScope(bank);
  await alternatives(bank);
  await signBeforeHints(bank);
  await pairAfterMiss(bank);
  await choicesOnRandomSets(bank);

  // --- условие называет приём (np) ---
  await noPickFlag(bank);

  // --- режим собеседования ---
  await mockInterview(bank);

  // --- диагностика слабых мест ---
  // Глава промаха смешанной — из банка по pkg/fn (её ответ мог смениться: bigo-задачи «следующего
  // большего» теперь отвечают главой монотонного стека), из записи — только у задачи вне банка. Так же у
  // промаха квиза: ответ и глава — из банка квиза по тексту вопроса («цикл в неориентированном графе» был
  // «Union-Find (DSU)» с главой union-find-structure, стал обходом графа в главе graphs), из записи — только у
  // вопроса вне банка («Вопрос про кучу»). Строка — одна на главу, названа по оглавлению (review-render-check).
  const CYCLE = "Определить, образует ли набор рёбер цикл в НЕориентированном графе.";
  const dom3 = await boot("review.html", ["quiz.js", "progress.js", "problems.js", "review.js"], {
    algoQuizMissed: JSON.stringify({
      "Вопрос про кучу": { n: 2, pattern: "Две кучи", href: "two-heaps.html", q: "Вопрос про кучу" },
      [CYCLE]: { n: 1, pattern: "Union-Find (DSU)", href: "union-find-structure.html", q: CYCLE },
    }),
    algoMixedMissed: JSON.stringify({
      "topk.KthLargest": { n: 1, chapter: "top-k-elements", pkg: "topk", fn: "KthLargest" },
      "twoheaps.MedianFinder": { n: 3, chapter: "two-heaps", pkg: "twoheaps", fn: "MedianFinder" },
      "bigo.DailyTemperatures": { n: 2, chapter: "big-o", pkg: "bigo", fn: "DailyTemperatures" },
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
    if (!/Две кучи/.test(top[0])) {
      errors.push(`сверху не самый слабый шаблон: ${JSON.stringify(rows)}`);
    }
    if (top[3] !== "5") errors.push(`сумма промахов у верхней строки = ${top[3]}, ожидалось 5 (2 квиз + 3 смешанная)`);
    const stackRow = rows.find((r) => /Монотонный стек/.test(r[0]));
    if (!stackRow || stackRow[2] !== "2") errors.push(`промах bigo.DailyTemperatures (в записи big-o) не посчитан у монотонного стека: ${JSON.stringify(rows)}`);
    if (rows.some((r) => /Big-O/.test(r[0]))) errors.push(`промах bigo.DailyTemperatures посчитан у Big-O по старой записи: ${JSON.stringify(rows)}`);
    const graphsRow = [...table.querySelectorAll("tr")].find((tr) => /Обход графов/.test(tr.textContent));
    const graphsLink = graphsRow && graphsRow.querySelector("a");
    if (!graphsRow || !graphsLink || graphsLink.getAttribute("href") !== "graphs.html") errors.push(`старый промах квиза о цикле не посчитан у «Обход графов» со ссылкой на graphs.html: ${JSON.stringify(rows)}`);
    if (rows.some((r) => /Union-Find/.test(r[0]))) errors.push(`старый промах квиза о цикле посчитан по снимку «Union-Find (DSU)»: ${JSON.stringify(rows)}`);
  }

  finish();
}

// gradesMixCard — у задачи есть карточка mix: с вышедшим сроком, и ответ на «какой шаблон?» сам оценивает
// карточку через ALGO_SRS.report (настоящий srs.js). Задача записана в промахи: выдача берёт промахи в
// половине случаев, а промах один — за 60 выдач она выпадет почти наверняка (как выше).
async function gradesMixCard(problem, correctTitle) {
  const DAY = 24 * 60 * 60 * 1000;
  const id = problem.p + "." + problem.f;
  const rec = { n: 1, chapter: problem.c, pkg: problem.p, fn: problem.f };
  const mature = () => ({ due: Date.now() - DAY, iv: 8, ease: 2.5, reps: 3, meta: rec, seen: Date.now() - 9 * DAY });
  for (const [right, want] of [[true, (c) => c.iv === 20 && c.reps === 4], [false, (c) => c.iv === 1 && c.back === 3 && c.reps === 0]]) {
    const dom = await boot("mixed.html", ["progress.js", "problems.js", "runner.js", "srs.js", "mixed.js"], {
      algoSRS: JSON.stringify({ ["mix:" + id]: mature() }),
      algoMixedMissed: JSON.stringify({ [id]: rec }),
    });
    const w = dom.window;
    const widget = w.document.querySelector(".algo-mixed");
    const give = [...widget.querySelectorAll("button")].find((b) => /Дать задачу/.test(b.textContent));
    let shown = false;
    for (let i = 0; i < 60 && !shown; i++) {
      click(dom, give);
      const cardEl = widget.querySelector(".algo-mixed__card");
      shown = !!cardEl && cardEl.textContent.includes(problem.s.split("\n").join(""));
    }
    if (!shown) { errors.push(`карточка mix:${id}: задача с промахом не выпала за 60 выдач`); continue; }
    const opts = [...widget.querySelectorAll(".algo-mixed__q .algo-challenge__opt")];
    const pickBtn = right ? opts.find((b) => b.textContent === correctTitle) : opts.find((b) => b.textContent !== correctTitle);
    click(dom, pickBtn);
    const c = JSON.parse(w.localStorage.getItem("algoSRS") || "{}")["mix:" + id] || {};
    if (!want(c)) errors.push(`карточка mix:${id} в сроке, ответ ${right ? "верный" : "неверный"}: ${JSON.stringify(c)}, ожидалось ${right ? "«Помню» (iv 8 → 20)" : "«Забыл» (iv 1, back 3)"}`);
    w.close();
  }
}

// raceFlag — задача пакета, который в главе гоняется с -race (ALGO_SRS.racePkgs из srs.js), открывает
// редактор с data-race="true" и в обычном режиме, и в собеседовании; задача другого пакета — без него.
// Без детектора гоночное решение там зеленело бы.
async function raceFlag(bank) {
  for (const [pkg, race] of [["wordcount", true], ["slidingwindow", false]]) {
    const p = bank.find((q) => q.p === pkg && q.t.length);
    if (!p) { errors.push(`-race: в банке нет задачи пакета ${pkg} со своими тестами`); continue; }
    const id = p.p + "." + p.f;
    // Все задачи -race-пакетов в банке зовут соседей (n) и собеседованию не выдаются; путь -race в
    // собеседовании проверяется на той же задаче, у которой соседи в странице убраны.
    const noNeeds = `window.ALGO_PROBLEMS.forEach(function (q) { if (q.p === "${p.p}" && q.f === "${p.f}") q.n = []; });`;
    for (const mock of [false, true]) {
      const dom = await boot("mixed.html", ["progress.js", "problems.js"].concat(mock ? [noNeeds] : [], ["runner.js", "srs.js", "mixed.js"]), {
        algoMixedMissed: JSON.stringify({ [id]: { n: 1, chapter: p.c, pkg: p.p, fn: p.f } }),
      });
      const w = dom.window, widget = w.document.querySelector(".algo-mixed");
      if (mock) { const box = widget.querySelector(".algo-mixed__mode-box"); box.checked = true; box.dispatchEvent(new w.Event("change")); }
      const give = [...widget.querySelectorAll("button")].find((b) => /Дать задачу/.test(b.textContent));
      let shown = false;
      for (let i = 0; i < 60 && !shown; i++) {
        click(dom, give);
        const cardEl = widget.querySelector(".algo-mixed__card");
        shown = !!cardEl && cardEl.textContent.includes(p.s.split("\n").join(""));
      }
      if (!shown) { errors.push(`-race: задача ${id} не выпала за 60 выдач`); w.close(); continue; }
      click(dom, widget.querySelector(".algo-mixed__q .algo-challenge__opt"));
      if (mock) {
        const ta = widget.querySelector(".algo-mixed__plan-text");
        ta.value = "План: считаю частоты по чанкам параллельно, каждая горутина — своя карта, потом слияние под одним владельцем, без общей памяти.";
        ta.dispatchEvent(new w.Event("input"));
        fillEdges(widget, w);
        click(dom, widget.querySelector(".algo-mixed__to-code"));
      }
      const ed = widget.querySelector('.algo-runner[data-pkg="' + p.p + '"]');
      const got = ed && ed.getAttribute("data-race") === "true";
      if (!ed) errors.push(`-race: ${mock ? "собеседование" : "обычный режим"}, ${id}: редактор не появился`);
      else if (got !== race) errors.push(`-race: ${mock ? "собеседование" : "обычный режим"}, ${id}: data-race=${ed.getAttribute("data-race")}, ожидалось ${race ? "true, как в главе" : "без -race"}`);
      w.close();
    }
  }
}

// typeTask — задача на проектирование класса (поле m): редактор получает имя типа в data-func (runner
// гоняет тесты типа, «Сдаюсь» отдаёт тип целиком), собеседование — тесты типа в data-tests, а текст
// называет тип и все его методы, а не «функцию».
async function typeTask(bank) {
  const p = bank.find((q) => q.p === "lru" && q.f === "LRUCache");
  if (!p || !p.m || !p.m.includes("LRUCache.Get") || !p.t.length) {
    errors.push(`тип: в банке нет задачи lru.LRUCache с методами и тестами типа: ${JSON.stringify(p)}`);
    return;
  }
  if (bank.some((q) => q.m && !q.m.length)) errors.push("тип: пустое поле m — у функции его быть не должно");
  for (const mock of [false, true]) {
    const dom = await boot("mixed.html", ["progress.js", "problems.js", "runner.js", "srs.js", "mixed.js"], {
      algoMixedMissed: JSON.stringify({ "lru.LRUCache": { n: 1, chapter: p.c, pkg: p.p, fn: p.f } }),
    });
    const w = dom.window, widget = w.document.querySelector(".algo-mixed");
    if (mock) { const box = widget.querySelector(".algo-mixed__mode-box"); box.checked = true; box.dispatchEvent(new w.Event("change")); }
    const give = [...widget.querySelectorAll("button")].find((b) => /Дать задачу/.test(b.textContent));
    let shown = false;
    for (let i = 0; i < 60 && !shown; i++) {
      click(dom, give);
      const cardEl = widget.querySelector(".algo-mixed__card");
      shown = !!cardEl && cardEl.textContent.includes(p.s.split("\n").join(""));
    }
    const mode = mock ? "собеседование" : "обычный режим";
    if (!shown) { errors.push(`тип, ${mode}: lru.LRUCache не выпала за 60 выдач`); w.close(); continue; }
    if (/LRUCache/.test(widget.querySelector(".algo-mixed__card").textContent)) errors.push(`тип, ${mode}: имя типа видно до ответа`);
    click(dom, widget.querySelector(".algo-mixed__q .algo-challenge__opt"));
    if (mock) {
      const ta = widget.querySelector(".algo-mixed__plan-text");
      ta.value = "План: хеш-таблица ключ → узел двусвязного списка, свежий в голове, вытесняю хвост; обе операции за O(1).";
      ta.dispatchEvent(new w.Event("input"));
      fillEdges(widget, w);
      click(dom, widget.querySelector(".algo-mixed__to-code"));
    }
    const ed = widget.querySelector('.algo-runner[data-pkg="lru"]');
    const solve = [...widget.querySelectorAll(".algo-mixed__solve")].map((e) => e.textContent).join(" ");
    if (!ed) { errors.push(`тип, ${mode}: редактор не появился`); w.close(); continue; }
    if (ed.getAttribute("data-func") !== "LRUCache") errors.push(`тип, ${mode}: data-func=${ed.getAttribute("data-func")}, ожидалось имя типа LRUCache`);
    if (mock && ed.getAttribute("data-tests") !== JSON.stringify(p.t)) errors.push(`тип, собеседование: data-tests=${ed.getAttribute("data-tests")}, ожидались тесты типа`);
    if (!/тип LRUCache/.test(solve) || !p.m.every((m) => solve.includes(m))) errors.push(`тип, ${mode}: текст не называет тип и его методы: «${solve}»`);
    w.close();
  }
}

const slugOf = (h) => h.replace(/\.html$/, "");
const progressOf = (slugs) => JSON.stringify(Object.fromEntries(slugs.map((s) => [s + ".html", true])));
const answersOf = (p) => [p.c].concat(p.a || []);
const giveBtn = (w) => [...w.querySelectorAll("button")].find((b) => /Дать задачу|Следующая задача/.test(b.textContent));
const optionsOf = (w) => [...w.querySelectorAll(".algo-mixed__q .algo-challenge__opt")];

// practiceScope — режим по умолчанию «только пройденные главы»: при пустом трекере и при двух главах —
// сообщение с числом и двумя выходами, а не пустой экран и не задача из непройденной главы; при трёх —
// задачи только тех, чей ответ (c или из a) пройден, и среди неверных вариантов нет её альтернатив. Тот же
// пул у собеседования. Переключатель «по всем главам» пишет общий ключ.
async function practiceScope(bank) {
  for (const [label, slugs] of [["пустой трекер", []], ["две главы", ["sliding-window", "two-pointers"]]]) {
    const dom = await boot("mixed.html", ["progress.js", "problems.js", "runner.js", "srs.js", "mixed.js"],
      { algoPracticeScope: null, algoProgress: progressOf(slugs) }, 3);
    const w = dom.window.document.querySelector(".algo-mixed");
    const give = giveBtn(w);
    if (give && !give.disabled) click(dom, give); // кнопка выключена или ничего не выдаёт — так и надо
    const empty = w.querySelector(".algo-mixed__empty");
    const text = empty ? empty.textContent : "";
    if (w.querySelector(".algo-mixed__card")) errors.push(`пройденные: ${label} — выдана задача, хотя пройдено меньше трёх глав`);
    if (!new RegExp(`глав с задачами[^.]*: ${slugs.length}\\b`).test(text) || !/«Глава пройдена»/.test(text) || !/«по всем главам»/.test(text)) {
      errors.push(`пройденные: ${label} — нет сообщения с числом глав (${slugs.length}) и двумя выходами: «${text}»`);
    }
    const box = w.querySelector(".algo-scope__box");
    if (!box) { errors.push(`пройденные: ${label} — нет переключателя «по всем главам»`); dom.window.close(); continue; }
    if (box.checked) errors.push(`пройденные: ${label} — по умолчанию стоит «по всем главам»`);
    box.checked = true;
    box.dispatchEvent(new dom.window.Event("change"));
    if (dom.window.localStorage.getItem("algoPracticeScope") !== "all") errors.push(`пройденные: ${label} — «по всем главам» не записан в algoPracticeScope`);
    click(dom, giveBtn(w));
    if (!w.querySelector(".algo-mixed__card")) errors.push(`пройденные: ${label} — «по всем главам» не дал задачу`);
    dom.window.close();
  }

  const done = ["sliding-window", "two-pointers", "prefix-sums"];
  for (const mock of [false, true]) {
    const dom = await boot("mixed.html", ["progress.js", "problems.js", "runner.js", "srs.js", "mixed.js"],
      { algoPracticeScope: null, algoProgress: progressOf(done) }, mock ? 21 : 22);
    const doc = dom.window.document, w = doc.querySelector(".algo-mixed");
    if (mock) { const mb = w.querySelector(".algo-mixed__mode-box"); mb.checked = true; mb.dispatchEvent(new dom.window.Event("change")); }
    const titleOf = (slug) => ((dom.window.ALGO_CHAPTERS || []).find((c) => c.h === slug + ".html") || {}).t || slug;
    for (let i = 0; i < 25; i++) {
      click(dom, giveBtn(w));
      const card = w.querySelector(".algo-mixed__card");
      const p = card && shownProblem(bank, card.textContent);
      if (!p) { errors.push(`пройденные (${mock ? "собеседование" : "обычный"}): выдача ${i} — задача не опознана`); break; }
      const right = answersOf(p);
      if (!right.some((c) => done.includes(c))) errors.push(`пройденные: выдана ${p.p}.${p.f} (ответы ${right}) — ни одна её глава не пройдена`);
      if (mock && (!p.t.length || p.n.length)) errors.push(`пройденные, собеседование: выдана ${p.p}.${p.f} без своих тестов или с соседями`);
      if (p.np) {
        // условие само называет приём: обычная смешанная такую не выдаёт, собеседование — без вариантов
        if (!mock) errors.push(`пройденные, обычный: выдана ${p.p}.${p.f} с np — условие само называет приём`);
        else if (optionsOf(w).length) errors.push(`пройденные, собеседование: у ${p.p}.${p.f} с np есть варианты «какой шаблон?»`);
        continue;
      }
      const titles = optionsOf(w).map((b) => b.textContent);
      const shown = titles.filter((t) => right.map(titleOf).includes(t));
      if (shown.length !== 1) errors.push(`пройденные: у ${p.p}.${p.f} верных вариантов ${shown.length}: ${titles.join(" | ")}`);
      else if (!done.map(titleOf).includes(shown[0])) errors.push(`пройденные: у ${p.p}.${p.f} верный вариант «${shown[0]}» — непройденная глава`);
      if (titles.length !== 4) errors.push(`пройденные: у ${p.p}.${p.f} вариантов ${titles.length}`);
    }
    dom.window.close();
  }
}

// alternatives — (f) k-й по величине при пройденных сортировках: верный вариант — «Сортировки», его
// выбор не промах; вердикт называет и главу-ответ, и альтернативы. (g) bigo-задачи «следующего
// большего» отвечают главой монотонного стека.
async function alternatives(bank) {
  const kth = bank.find((p) => p.p === "topk" && p.f === "KthLargest");
  if (!kth || kth.c !== "top-k-elements" || !kth.a.includes("sorting")) {
    errors.push(`(f) в банке у topk.KthLargest c = ${kth && kth.c}, a = ${kth && JSON.stringify(kth.a)} — ожидались top-k-elements и sorting`);
    return;
  }
  const done = ["sorting", "sliding-window", "prefix-sums"];
  // выдача берёт непоказанные: все прочие задачи пула помечены показанными
  const seen = {};
  bank.forEach((p) => { if (p !== kth) seen[p.p + "." + p.f] = 1; });
  const dom = await boot("mixed.html", ["progress.js", "problems.js", "runner.js", "srs.js", "mixed.js"],
    { algoPracticeScope: null, algoProgress: progressOf(done), algoMixedSeen: JSON.stringify(seen) }, 5);
  const w = dom.window.document.querySelector(".algo-mixed");
  click(dom, giveBtn(w));
  const card = w.querySelector(".algo-mixed__card");
  if (!card || shownProblem(bank, card.textContent) !== kth) {
    errors.push(`(f) выдана не topk.KthLargest: «${card && card.textContent.slice(0, 80)}»`);
  } else {
    const titleOf = (slug) => ((dom.window.ALGO_CHAPTERS || []).find((c) => c.h === slug + ".html") || {}).t || slug;
    const opts = optionsOf(w);
    const sortBtn = opts.find((b) => b.textContent === titleOf("sorting"));
    if (!sortBtn) errors.push(`(f) среди вариантов нет «${titleOf("sorting")}»: ${opts.map((b) => b.textContent).join(" | ")}`);
    if (opts.some((b) => b.textContent === titleOf("top-k-elements"))) errors.push("(f) глава-ответ непройдена, а стоит среди вариантов");
    if (sortBtn) {
      click(dom, sortBtn);
      const missed = JSON.parse(dom.window.localStorage.getItem("algoMixedMissed") || "{}");
      if (missed["topk.KthLargest"]) errors.push("(f) выбор альтернативы «Сортировки» записан как промах");
      const verdict = w.querySelector(".algo-mixed__verdict");
      const vt = verdict ? verdict.textContent : "";
      if (!/^✓/.test(vt) || !vt.includes(titleOf("sorting")) || !/также решается/.test(vt) || !vt.includes(titleOf("top-k-elements"))) {
        errors.push(`(f) вердикт не называет выбор и альтернативу: «${vt}»`);
      }
      if (!sortBtn.classList.contains("algo-challenge__opt--ok")) errors.push("(f) выбранная альтернатива не отмечена верной");
    }
  }
  dom.window.close();

  const bigo = bank.filter((p) => p.p === "bigo" && p.c === "monotonic-stack").map((p) => p.f).sort();
  // MinStack — задача на проектирование класса: тип с «Шаблон: monotonic-stack»
  if (JSON.stringify(bigo) !== JSON.stringify(["DailyTemperatures", "MinStack", "NextGreaterElement"])) {
    errors.push(`(g) у bigo главой монотонного стека отвечают ${JSON.stringify(bigo)}, ожидались DailyTemperatures, MinStack и NextGreaterElement`);
  }
}

// signBeforeHints — (h) признак g виден только после ответа; после неверного он стоит под вердиктом
// («Как это было узнать»), раньше подсказок; после верного — первым среди подсказок.
async function signBeforeHints(bank) {
  const p = bank.find((q) => q.g && q.h && q.p === "prefixsum" && q.f === "CountSubarraysWithSum") || bank.find((q) => q.g && q.h);
  if (!p) { errors.push("(h) в банке нет задачи с признаком и подсказками"); return; }
  const seen = {};
  bank.forEach((q) => { if (q !== p) seen[q.p + "." + q.f] = 1; });
  for (const right of [false, true]) {
    const dom = await boot("mixed.html", ["progress.js", "problems.js", "runner.js", "srs.js", "mixed.js"], { algoMixedSeen: JSON.stringify(seen) }, 9);
    const w = dom.window.document.querySelector(".algo-mixed");
    click(dom, giveBtn(w));
    const card = w.querySelector(".algo-mixed__card");
    if (!card || shownProblem(bank, card.textContent) !== p) { errors.push(`(h) выдана не ${p.p}.${p.f}`); dom.window.close(); continue; }
    if (w.textContent.includes(p.g.slice(0, 40))) errors.push("(h) признак виден до ответа");
    const titleOf = (slug) => ((dom.window.ALGO_CHAPTERS || []).find((c) => c.h === slug + ".html") || {}).t || slug;
    const okTitles = answersOf(p).map(titleOf);
    const btn = optionsOf(w).find((b) => okTitles.includes(b.textContent) === right);
    click(dom, btn);
    const res = w.querySelector(".algo-mixed__result");
    const t = res ? res.textContent : "";
    const gi = t.indexOf(p.g.slice(0, 40)), hi = t.indexOf(p.h.split("\n")[0].slice(0, 30));
    if (gi < 0) errors.push(`(h) ответ ${right ? "верный" : "неверный"}: признака нет в разборе`);
    else if (hi >= 0 && gi > hi) errors.push(`(h) ответ ${right ? "верный" : "неверный"}: признак стоит после подсказок`);
    if (!right && !/Как это было узнать: /.test(t)) errors.push("(h) после неверного ответа нет «Как это было узнать»");
    dom.window.close();
  }
}

// choicesOnRandomSets — варианты ответа на случайных наборах пройденных глав (зерно): показан ровно один
// верный — c, если пройдена, иначе пройденная из a; неверные — не c и не из a, без повторов, всего 4;
// неверные — сначала пройденные (до двух соседей из путаемых групп), и непройденная стоит, только когда
// пройденные чужие главы кончились.
async function choicesOnRandomSets(bank) {
  const dom = await boot("mixed.html", ["progress.js", "problems.js", "runner.js", "srs.js", "mixed.js"], {});
  const M = dom.window.ALGO_MIXED;
  if (!M || typeof M.choices !== "function") { errors.push("mixed.js не отдаёт ALGO_MIXED.choices — варианты не проверить"); return; }
  const groups = dom.window.ALGO_CONFUSABLE || [];
  const chapters = [...new Set(bank.map((p) => p.c))];
  for (let s = 1; s <= 300; s++) {
    const rnd = mulberry32(s);
    const all = rnd() < 0.15;
    const done = {};
    chapters.forEach((c) => { if (rnd() < 0.2) done[c] = true; });
    ["sorting", "big-o", "union-find-structure", "merge-intervals", "greedy", "recursion", "dynamic-programming"].forEach((c) => { if (rnd() < 0.3) done[c] = true; });
    const isDone = (c) => all || !!done[c];
    const pool = bank.filter((p) => answersOf(p).some(isDone));
    if (!pool.length) continue;
    const p = pool[Math.floor(rnd() * pool.length)];
    const got = M.choices(p, bank, all ? null : done, mulberry32(s * 31));
    const right = answersOf(p);
    const where = `зерно ${s}, ${p.p}.${p.f}`;
    if (!got || !Array.isArray(got.options)) { errors.push(`варианты: ${where} — choices вернул ${JSON.stringify(got)}`); break; }
    const opts = got.options;
    if (opts.length !== 4) errors.push(`варианты: ${where} — их ${opts.length}`);
    if (new Set(opts).size !== opts.length) errors.push(`варианты: ${where} — повторы ${opts}`);
    const shown = opts.filter((c) => right.includes(c));
    if (shown.length !== 1 || shown[0] !== got.shown) errors.push(`варианты: ${where} — верных ${shown.length} (${shown}), показанный ${got.shown}`);
    const wantShown = isDone(p.c) ? p.c : (p.a || []).find((c) => done[c]);
    if (got.shown !== wantShown) errors.push(`варианты: ${where} — показан верным ${got.shown}, ожидался ${wantShown}`);
    const wrong = opts.filter((c) => !right.includes(c));
    const others = chapters.filter((c) => !right.includes(c));
    if (wrong.some((c) => !others.includes(c))) errors.push(`варианты: ${where} — неверный вариант не из глав банка: ${wrong}`);
    if (wrong.some((c) => !isDone(c)) && others.some((c) => isDone(c) && !wrong.includes(c))) {
      errors.push(`варианты: ${where} — стоит непройденная ${wrong.filter((c) => !isDone(c))}, хотя пройденные чужие главы остались`);
    }
    const near = new Set([].concat(...groups.filter((g) => g.includes(got.shown))).filter((c) => others.includes(c) && isDone(c)));
    const nearShown = wrong.filter((c) => near.has(c)).length;
    if (nearShown < Math.min(2, near.size)) errors.push(`варианты: ${where} — соседей из путаемых групп ${nearShown} из ${near.size}`);
    if (errors.length > 30) break;
  }
  dom.window.close();
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
    // задача np идёт без шага «какой шаблон?» — её путь проверяет noPickFlag
    if (hit.x && !hit.np) p = hit;
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
  // План есть, граничных случаев нет (или один пустой) — гейт держится нажатием.
  if (w.querySelectorAll(".algo-mixed__edge").length !== 3) errors.push("собеседование: нет трёх полей граничных случаев");
  if (!go.disabled) errors.push("собеседование: план без граничных случаев пускает к коду");
  fillEdges(w, dom.window, ["пустой массив", "все равны", ""]);
  click(dom, go);
  if (w.querySelector(".algo-runner")) errors.push("собеседование: два граничных случая из трёх открыли редактор");
  fillEdges(w, dom.window);
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
  // Свой тест: поле включено, граничные случаи плана переданы заготовке теста; зелёный свой тест — не решение.
  if (runner.getAttribute("data-own-test") !== "on") errors.push("собеседование: у редактора нет поля «Свой тест» (data-own-test)");
  if (runner.getAttribute("data-own-cases") !== JSON.stringify(["пустой массив", "все равны", "k больше n"])) {
    errors.push(`собеседование: граничные случаи не переданы своему тесту: ${runner.getAttribute("data-own-cases")}`);
  }
  runner.dispatchEvent(new dom.window.CustomEvent("algo-runner:own", {
    bubbles: true, detail: { pkg: p.p, ok: true, passed: 2, failed: 0, stage: "tests", tests: ["TestMine", "TestEdge"] },
  }));
  if (w.querySelector(".algo-mixed__cx-input")) errors.push("собеседование: зелёный СВОЙ тест засчитан как решение");

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
  if (!sum.textContent.includes("k больше n")) errors.push("собеседование: граничные случаи не попали в итог");
  if (!/Свой тест\s*зелёный \(тестов 2, прогонов 1\)/.test(sum.textContent)) errors.push(`собеседование: итог не говорит о своём тесте: «${sum.textContent.slice(0, 300)}»`);
  const logged = JSON.parse(dom.window.localStorage.getItem("algoMockLog") || "[]").pop() || {};
  if (logged.own !== "ok") errors.push(`собеседование: в algoMockLog own = ${JSON.stringify(logged.own)}, ожидалось "ok"`);
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

  // Задачи без своих тестов и задачи, чьи тесты зовут соседние упражнения (n), режим выдавать не должен:
  // он гоняет только тесты функции на чистой заготовке, и такая задача там неразрешима. Случайной выдачей
  // это не проверить, поэтому детерминированно: все годные задачи (свои тесты, без соседей) помечаем
  // показанными — выдача предпочитает непоказанные, и при ошибке фильтра неизбежно вытащит негодную.
  const untested = bank.filter((q) => !q.t || !q.t.length || (q.n && q.n.length));
  if (!untested.length) return; // нечего проверять — все задачи годны
  const seen = {};
  bank.filter((q) => q.t && q.t.length && !(q.n && q.n.length)).forEach((q) => { seen[q.p + "." + q.f] = 1; });
  const dom2 = await boot("mixed.html", ["progress.js", "problems.js", "runner.js", "mixed.js"], {
    algoMixedSeen: JSON.stringify(seen),
  });
  const w2 = dom2.window.document.querySelector(".algo-mixed");
  const box2 = w2.querySelector(".algo-mixed__mode-box");
  box2.checked = true;
  box2.dispatchEvent(new dom2.window.Event("change"));
  click(dom2, [...w2.querySelectorAll("button")].find((b) => /Дать задачу/.test(b.textContent)));
  const card2 = w2.querySelector(".algo-mixed__card");
  const bad = card2 && shownProblem(untested, card2.textContent);
  if (bad) errors.push(`режим собеседования выдал ${bad.p}.${bad.f} — ${bad.t.length ? "её тесты зовут соседей " + bad.n.join(", ") : "у неё нет своих тестов"}`);
  if (!card2) errors.push("собеседование: при всех годных задачах показанными задача не выдана вовсе");
}

// noPickFlag — (j) задача с np (условие само называет приём). Случайной выдачей это не проверить, поэтому
// детерминированно, как у собеседования с соседями: все задачи, которые режим вправе выдать, помечены
// показанными — выдача предпочитает непоказанные и при сломанном фильтре неизбежно вытащит задачу с np.
// Обычная смешанная: ни одна из 30 выдач не np. Собеседование: выдана задача с np (по всем главам) — вариантов
// нет, вердикт «назван в самом условии» с главой задачи, сразу план; ни промаха, ни report; итог и история —
// «назван в условии», pattern: null.
async function noPickFlag(bank) {
  const np = bank.filter((q) => q.np);
  if (!np.length) { errors.push("(j) в банке нет задач с np — список noPick в cmd/problembank пуст или не дошёл до банка"); return; }
  if (bank.some((q) => "np" in q && q.np !== true)) errors.push("(j) поле np у задачи не true — генератор пишет его только помеченным");
  const keyOf = (q) => q.p + "." + q.f;
  // числа страницы — против банка: сколько помечено, сколько из них на трёх главах ядра и сколько не годно
  // собеседованию (без своих тестов или с соседями) — то есть не выдаётся нигде
  {
    const page = fs.readFileSync(path.join(root, "book", "mixed.html"), "utf8").replace(/<[^>]+>/g, "").replace(/\s+/g, " ");
    const three = ["sliding-window", "two-pointers", "prefix-sums"];
    const want = {
      "У N задач условие само называет приём": [/У (\d+) задач условие само называет приём/, np.length],
      "дают M задач (N из них": [/префиксные суммы дают \d+ задач \((\d+) из них/, np.filter((q) => [q.c].concat(q.a || []).some((c) => three.includes(c))).length],
      "Из этих задач N не выдаются нигде": [/Из этих задач (\d+) не выдаются нигде/, np.filter((q) => !(q.t && q.t.length) || (q.n && q.n.length)).length],
    };
    for (const [what, [re, n]] of Object.entries(want)) {
      const m = page.match(re);
      if (!m || Number(m[1]) !== n) errors.push(`(j) src/mixed.md: «${what}» — на странице ${m ? m[1] : "(не нашёл)"}, в банке ${n}`);
    }
  }

  // обычный режим
  {
    const seen = {};
    bank.filter((q) => !q.np).forEach((q) => { seen[keyOf(q)] = 1; });
    const dom = await boot("mixed.html", ["progress.js", "problems.js", "runner.js", "mixed.js"], { algoMixedSeen: JSON.stringify(seen) }, 13);
    const w = dom.window.document.querySelector(".algo-mixed");
    const M = dom.window.ALGO_MIXED;
    if (!M || typeof M.servable !== "function") errors.push("(j) mixed.js не отдаёт ALGO_MIXED.servable");
    else {
      const leaked = np.filter((q) => M.servable(q, false));
      if (leaked.length) errors.push(`(j) servable пускает в обычную смешанную задачи с np: ${leaked.slice(0, 3).map(keyOf).join(", ")}…`);
    }
    for (let i = 0; i < 30; i++) {
      click(dom, giveBtn(w));
      const card = w.querySelector(".algo-mixed__card");
      const q = card && shownProblem(bank, card.textContent);
      if (!q) { errors.push(`(j) обычный режим: выдача ${i} не опознана`); break; }
      if (q.np) { errors.push(`(j) обычный режим выдал ${keyOf(q)} — условие само называет приём (np)`); break; }
    }
    dom.window.close();
  }

  // собеседование
  const mockNp = np.filter((q) => q.t && q.t.length && !(q.n && q.n.length));
  if (!mockNp.length) { errors.push("(j) нет задачи с np, годной собеседованию (свои тесты, без соседей)"); return; }
  const seen = {};
  bank.filter((q) => !q.np).forEach((q) => { seen[keyOf(q)] = 1; });
  const dom = await boot("mixed.html", ["progress.js", "problems.js", "runner.js", "mixed.js"], { algoMixedSeen: JSON.stringify(seen) }, 14);
  const w = dom.window.document.querySelector(".algo-mixed");
  const ls = dom.window.localStorage;
  const reports = [];
  dom.window.ALGO_SRS = { report: (rid, grade) => { reports.push(rid + " " + grade); return { status: "created" }; }, sync: () => {} };
  const box = w.querySelector(".algo-mixed__mode-box");
  box.checked = true;
  box.dispatchEvent(new dom.window.Event("change"));
  click(dom, giveBtn(w));
  const card = w.querySelector(".algo-mixed__card");
  const q = card && shownProblem(bank, card.textContent);
  if (!q || !q.np) {
    errors.push(`(j) собеседование при всех прочих показанных выдало не задачу с np: ${q ? keyOf(q) : "ничего"}`);
    dom.window.close();
    return;
  }
  const titleOf = (s) => ((dom.window.ALGO_CHAPTERS || []).find((c) => c.h === s + ".html") || {}).t || s;
  if (optionsOf(w).length || w.querySelector(".algo-mixed__q")) errors.push(`(j) собеседование, ${keyOf(q)}: показан вопрос «какой шаблон?»`);
  const v = w.querySelector(".algo-mixed__verdict");
  const vt = v ? v.textContent : "";
  if (!/назван в самом условии/.test(vt) || !vt.includes(titleOf(q.c))) errors.push(`(j) собеседование, ${keyOf(q)}: вердикт «${vt}», ожидалось «назван в самом условии» и «${titleOf(q.c)}»`);
  if (/[✓✗]/.test(vt)) errors.push(`(j) собеседование, ${keyOf(q)}: вердикт с «✓/✗», хотя ответа не было: «${vt}»`);
  if (reports.length) errors.push(`(j) собеседование, ${keyOf(q)}: без ответа вызван report: ${JSON.stringify(reports)}`);
  if (Object.keys(JSON.parse(ls.getItem("algoMixedMissed") || "{}")).length) errors.push(`(j) собеседование, ${keyOf(q)}: без ответа записан промах`);
  if (!JSON.parse(ls.getItem("algoMixedSeen") || "{}")[keyOf(q)]) errors.push(`(j) собеседование, ${keyOf(q)}: задача не отмечена показанной — выдача будет возвращать её как новую`);
  if (w.querySelector(".algo-mixed__link")) errors.push(`(j) собеседование, ${keyOf(q)}: ссылка на главу видна до итога`);
  const ta = w.querySelector(".algo-mixed__plan-text");
  if (!ta) { errors.push(`(j) собеседование, ${keyOf(q)}: нет поля плана`); dom.window.close(); return; }
  ta.value = "План: разбираю условие, выбираю структуру данных, держу инвариант на каждом шаге и проверяю края входа до кода.";
  ta.dispatchEvent(new dom.window.Event("input"));
  fillEdges(w, dom.window);
  click(dom, w.querySelector(".algo-mixed__to-code"));
  const ed = w.querySelector('.algo-runner[data-pkg="' + q.p + '"]');
  if (!ed || ed.getAttribute("data-tests") !== JSON.stringify(q.t)) errors.push(`(j) собеседование, ${keyOf(q)}: после плана нет редактора с тестами задачи`);
  const giveUp = w.querySelector(".algo-mixed__giveup");
  if (giveUp) click(dom, giveUp);
  const sum = w.querySelector(".algo-mixed__summary");
  if (!sum || !/Шаблон\s*назван в условии/.test(sum.textContent)) errors.push(`(j) собеседование, ${keyOf(q)}: в итоге нет «Шаблон — назван в условии»: «${sum ? sum.textContent.slice(0, 200) : ""}»`);
  const rec = JSON.parse(ls.getItem("algoMockLog") || "[]").pop() || {};
  if (rec.k !== keyOf(q) || rec.pattern !== null) errors.push(`(j) собеседование: в истории ${JSON.stringify(rec)}, ожидалось k = ${keyOf(q)} и pattern: null`);
  dom.window.close();
}

// pairAfterMiss — (i) ряд таблицы путаемых пар (assets/pairs.js) после промаха, только в точном направлении:
// верный приём задачи — use, выбранный — not. Обычный режим — сразу под «Как это было узнать»; собеседование —
// в итоге (в ряду бывают оценки сложности, а их режим прячет до итога). Нет ряда, нет реестра, верный ответ
// или альтернатива из a — строки нет и нигде нет «undefined». Промах при этом пишется как раньше. Отдельно:
// обе главы ряда, если обе — главы-ответы банка, стоят в одной группе CONFUSABLE.
let pairCoverage = "";
async function pairAfterMiss(bank) {
  const PAIRS = require(path.join(root, "assets", "pairs.js"));
  const bankCh = new Set(bank.map((q) => q.c));
  const scripts = (withPairs) => ["progress.js", "problems.js", "runner.js"].concat(withPairs ? ["pairs.js"] : [], ["mixed.js"]);

  // сверка с CONFUSABLE и пересчёт покрытия (информация)
  const probe = await boot("mixed.html", scripts(true), {});
  const groups = probe.window.ALGO_CONFUSABLE || [];
  if (!probe.window.ALGO_PAIRS) errors.push("(i) pairs.js не выставил window.ALGO_PAIRS");
  probe.window.close();
  PAIRS.forEach((r, i) => {
    if (!bankCh.has(r.use) || !bankCh.has(r.not)) return;
    if (!groups.some((g) => g.includes(r.use) && g.includes(r.not))) {
      errors.push(`(i) ряд ${i + 1} пар (${r.use} ← ${r.not}): обе главы — ответы банка, но ни одна группа CONFUSABLE не содержит обе`);
    }
  });
  const cand = new Set();
  groups.forEach((g) => g.forEach((a) => g.forEach((b) => {
    if (a < b && bankCh.has(a) && bankCh.has(b)) cand.add(a + "|" + b);
  })));
  const covered = [...cand].filter((k) => {
    const [a, b] = k.split("|");
    return PAIRS.some((r) => (r.use === a && r.not === b) || (r.use === b && r.not === a));
  }).length;
  pairCoverage = `пар глав-ответов внутри групп CONFUSABLE с рядом в реестре: ${covered} из ${cand.size}`;

  const p = bank.find((q) => q.p === "prefixsum" && q.f === "CountSubarraysWithSum");
  const row = PAIRS.find((r) => r.use === "prefix-sums" && r.not === "sliding-window");
  if (!p || !row || p.c !== "prefix-sums" || p.a.includes("sliding-window")) {
    errors.push(`(i) нет опоры сценария: prefixsum.CountSubarraysWithSum (${p && p.c}) или ряда prefix-sums ← sliding-window`);
    return;
  }
  // notFor — задачи, на которых ряд противоречил бы условию: каждая есть в банке
  PAIRS.forEach((x, i) => (x.notFor || []).forEach((id) => {
    if (!bank.some((q) => q.p + "." + q.f === id)) errors.push(`(i) ряд ${i + 1} пар: notFor «${id}» — такой задачи в банке нет`);
  }));
  // строка пары — сравнение глав, а не утверждение о задаче
  const lineOf = (x, titleOf) => "Как отличать эти приёмы: если " + x.must + " — " + titleOf(x.use) +
    ", а не «" + titleOf(x.not) + "»: " + x.why + ".";

  // pick — выдать задачу q (все прочие помечены показанными; пройдены глава задачи, выбираемая глава и две
  // чужие без ряда — варианты повторяемы) и нажать вариант главы slug; вернуть окно, виджет и вызовы report
  async function pick(slug, opts, q) {
    q = q || p;
    const seen = {};
    bank.forEach((x) => { if (x !== q) seen[x.p + "." + x.f] = 1; });
    const done = [q.c, slug, "greedy", "tree-bfs"];
    const seed = { algoPracticeScope: null, algoProgress: progressOf(done), algoMixedSeen: JSON.stringify(seen) };
    const dom = await boot("mixed.html", ["progress.js", "problems.js"].concat(opts.pre ? [opts.pre] : [], scripts(opts.pairs).slice(2)), seed, 11);
    const reports = [];
    dom.window.ALGO_SRS = { report: (rid, grade) => { reports.push(rid + " " + grade); return { status: "created" }; } };
    const w = dom.window.document.querySelector(".algo-mixed");
    if (opts.mock) {
      const box = w.querySelector(".algo-mixed__mode-box");
      box.checked = true;
      box.dispatchEvent(new dom.window.Event("change"));
    }
    click(dom, giveBtn(w));
    const card = w.querySelector(".algo-mixed__card");
    if (!card || shownProblem(bank, card.textContent) !== q) { errors.push(`(i) выдана не ${q.p}.${q.f}`); return null; }
    const titleOf = (s) => ((dom.window.ALGO_CHAPTERS || []).find((c) => c.h === s + ".html") || {}).t || s;
    const btn = optionsOf(w).find((b) => b.textContent === titleOf(slug));
    if (!btn) { errors.push(`(i) среди вариантов нет «${titleOf(slug)}»: ${optionsOf(w).map((b) => b.textContent).join(" | ")}`); return null; }
    click(dom, btn);
    return { dom, w, reports, titleOf };
  }
  const missedOf = (dom) => JSON.parse(dom.window.localStorage.getItem("algoMixedMissed") || "{}")[p.p + "." + p.f];

  // промах соседом с рядом: строка пары — сразу под признаком; промах записан как прежде
  let r = await pick("sliding-window", { pairs: true });
  if (r) {
    const pair = r.w.querySelector(".algo-mixed__result .algo-mixed__pair");
    const want = lineOf(row, r.titleOf);
    if (!pair) errors.push("(i) промах соседом с рядом в реестре: строки пары нет");
    else {
      if (pair.textContent !== want) errors.push(`(i) строка пары «${pair.textContent}», ожидалось «${want}»`);
      const prev = pair.previousElementSibling;
      if (!prev || !prev.classList.contains("algo-mixed__sign")) errors.push("(i) строка пары стоит не сразу под «Как это было узнать»");
    }
    if (!missedOf(r.dom)) errors.push("(i) промах соседом не записан в algoMixedMissed");
    if (r.reports.join() !== "mix:" + p.p + "." + p.f + " again") errors.push(`(i) report после промаха: ${JSON.stringify(r.reports)}`);
    r.dom.window.close();
  }
  // обратное направление — отдельно, не завися от порядка рядов: верный «Два указателя», выбрано «Скользящее
  // окно»; ряд «sliding-window ← two-pointers» есть, ряда «two-pointers ← sliding-window» нет — строки нет
  const twoSum = bank.find((q) => q.p === "twopointers" && q.f === "PairWithTargetSum");
  if (!twoSum || twoSum.c !== "two-pointers" || PAIRS.some((x) => x.use === "two-pointers" && x.not === "sliding-window") ||
      !PAIRS.some((x) => x.use === "sliding-window" && x.not === "two-pointers")) {
    errors.push("(i) нет опоры сценария обратного направления: twopointers.PairWithTargetSum и ряд только sliding-window ← two-pointers");
  } else {
    r = await pick("sliding-window", { pairs: true }, twoSum);
    if (r) {
      const shown = r.w.querySelector(".algo-mixed__pair");
      if (shown) errors.push("(i) обратное направление: показан ряд «" + shown.textContent.slice(0, 60) + "…»");
      r.dom.window.close();
    }
  }
  // задача без признака g: строка пары — прямо под вердиктом
  const noSign = bank.find((q) => q.p === "slidingwindow" && q.f === "LongestSubstringNoRepeat");
  const row3 = PAIRS.find((x) => x.use === "sliding-window" && x.not === "two-pointers");
  if (!noSign || noSign.g || !row3 || (row3.notFor || []).includes("slidingwindow.LongestSubstringNoRepeat")) {
    errors.push("(i) нет опоры сценария без признака: slidingwindow.LongestSubstringNoRepeat без g и ряд sliding-window ← two-pointers");
  } else {
    r = await pick("two-pointers", { pairs: true }, noSign);
    if (r) {
      const pair = r.w.querySelector(".algo-mixed__result .algo-mixed__pair");
      if (!pair) errors.push("(i) задача без признака: строки пары нет");
      else {
        if (pair.textContent !== lineOf(row3, r.titleOf)) errors.push(`(i) задача без признака: строка «${pair.textContent}»`);
        const prev = pair.previousElementSibling;
        if (!prev || !prev.classList.contains("algo-mixed__verdict")) errors.push("(i) задача без признака: строка пары не сразу под вердиктом");
      }
      if (r.w.querySelector(".algo-mixed__sign")) errors.push("(i) задача без признака: показано «Как это было узнать»");
      r.dom.window.close();
    }
  }
  // notFor: на MaxSlidingWindow ряд «окно ← префиксы» о пороге суммы противоречил бы условию — строки нет
  const msw = bank.find((q) => q.p === "slidingwindow" && q.f === "MaxSlidingWindow");
  const row1 = PAIRS.find((x) => x.use === "sliding-window" && x.not === "prefix-sums");
  if (!msw || !row1 || !(row1.notFor || []).includes("slidingwindow.MaxSlidingWindow")) {
    errors.push("(i) нет опоры сценария notFor: ряд sliding-window ← prefix-sums с notFor slidingwindow.MaxSlidingWindow");
  } else {
    // MaxSlidingWindow называет окно в условии (np) и обычной смешанной не выдаётся; правило notFor — о строке
    // пары, а не о выдаче, поэтому здесь флаг снят на странице.
    const pre = msw.np ? `window.ALGO_PROBLEMS.forEach(function (q) { if (q.p === "slidingwindow" && q.f === "MaxSlidingWindow") delete q.np; });` : "";
    r = await pick("prefix-sums", { pairs: true, pre: pre }, msw);
    if (r) {
      if (r.w.querySelector(".algo-mixed__pair")) errors.push("(i) notFor: ряд показан на slidingwindow.MaxSlidingWindow");
      if (!JSON.parse(r.dom.window.localStorage.getItem("algoMixedMissed") || "{}")["slidingwindow.MaxSlidingWindow"]) errors.push("(i) notFor: промах не записан");
      r.dom.window.close();
    }
  }
  // промах главой без ряда для этой задачи и промах без загруженного реестра — строки нет, «undefined» нет
  for (const [slug, withPairs, what] of [["greedy", true, "глава без ряда"], ["sliding-window", false, "реестр не загружен"]]) {
    r = await pick(slug, { pairs: withPairs });
    if (!r) continue;
    if (r.w.querySelector(".algo-mixed__pair")) errors.push(`(i) ${what}: строка пары показана`);
    if (/undefined/.test(r.w.textContent)) errors.push(`(i) ${what}: в разборе «undefined»`);
    if (!missedOf(r.dom)) errors.push(`(i) ${what}: промах не записан`);
    r.dom.window.close();
  }
  // верная альтернатива из a — не промах, строки нет, хотя ряд top-k-elements ← sorting в реестре есть
  const kth = bank.find((q) => q.p === "topk" && q.f === "KthLargest");
  if (kth && kth.a.includes("sorting") && PAIRS.some((x) => x.use === kth.c && x.not === "sorting")) {
    const seenK = {};
    bank.forEach((q) => { if (q !== kth) seenK[q.p + "." + q.f] = 1; });
    const dom = await boot("mixed.html", scripts(true), { algoPracticeScope: null,
      algoProgress: progressOf(["sorting", "sliding-window", "prefix-sums"]), algoMixedSeen: JSON.stringify(seenK) }, 5);
    const w = dom.window.document.querySelector(".algo-mixed");
    click(dom, giveBtn(w));
    const titleOf = (s) => ((dom.window.ALGO_CHAPTERS || []).find((c) => c.h === s + ".html") || {}).t || s;
    const btn = optionsOf(w).find((b) => b.textContent === titleOf("sorting"));
    if (!btn) errors.push("(i) альтернатива: нет варианта «Сортировки»");
    else {
      click(dom, btn);
      const v = w.querySelector(".algo-mixed__verdict");
      if (!v || !/^✓/.test(v.textContent)) errors.push("(i) альтернатива: вердикт не «✓»");
      if (w.querySelector(".algo-mixed__pair")) errors.push("(i) альтернатива из a: показана строка пары");
    }
    dom.window.close();
  } else {
    errors.push("(i) нет опоры сценария альтернативы: topk.KthLargest с a = sorting и ряд top-k-elements ← sorting");
  }
  // собеседование: до итога строки нет (в рядах бывает сложность, а её режим прячет), в итоге — есть
  r = await pick("sliding-window", { pairs: true, mock: true });
  if (r) {
    const w = r.w;
    if (w.querySelector(".algo-mixed__pair")) errors.push("(i) собеседование: строка пары видна до итога");
    if (!missedOf(r.dom)) errors.push("(i) собеседование: промах не записан");
    const ta = w.querySelector(".algo-mixed__plan-text");
    ta.value = "Префиксные суммы и карта счётчиков: для каждого префикса ищу prefix − k среди прошлых, ответ копится по ходу.";
    ta.dispatchEvent(new r.dom.window.Event("input"));
    fillEdges(w, r.dom.window);
    click(r.dom, w.querySelector(".algo-mixed__to-code"));
    const giveUp = w.querySelector(".algo-mixed__giveup");
    if (giveUp) click(r.dom, giveUp);
    const sum = w.querySelector(".algo-mixed__summary");
    const pair = sum && sum.querySelector(".algo-mixed__pair");
    if (!sum) errors.push("(i) собеседование: нет итога");
    else if (!pair) errors.push("(i) собеседование: в итоге нет строки пары");
    else if (!pair.textContent.includes(row.why)) errors.push(`(i) собеседование: строка пары «${pair.textContent}»`);
    r.dom.window.close();
  }
}

function finish() {
  if (pairCoverage) console.log("ℹ️  mixed-check: " + pairCoverage);
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
      "(data-hints=\"off\"), спрашивает сложность до эталона и не выдаёт задач с соседями; по умолчанию — только пройденные главы " +
      "(меньше трёх — сообщение с числом), альтернативы засчитываются и названы в вердикте, неверные варианты — не из них, " +
      "признак — после ответа, раньше подсказок; после промаха — ряд таблицы пар в точном направлении; " +
      "задачи, чьё условие называет приём (np), обычная смешанная не выдаёт, а собеседование — без шага «какой шаблон?»"
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
