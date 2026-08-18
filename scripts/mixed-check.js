#!/usr/bin/env node
// Headless smoke смешанной тренировки и диагностики слабых мест — на СОБРАННЫХ
// страницах, с настоящим банком задач.
//
//   mdbook build && node scripts/mixed-check.js
//
// Что проверяется (и почему именно это):
//   1) до ответа НЕ видно ни имени пакета, ни главы, ни подсказок из условия —
//      иначе вся затея бессмысленна: подсказка «Ожидаемая сложность: O(log n)»
//      на отсортированном массиве и есть ответ «бинарный поиск»;
//   2) вариантов ровно 4, среди них верный, и все — реальные главы книги;
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
  const problem = (bank || []).find((p) => statement.includes(p.s.slice(0, 40)));
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

  const wrongBtn = opts.find((b) => b.textContent !== correctTitle);
  click(dom, wrongBtn);

  const missed = JSON.parse(dom.window.localStorage.getItem("algoMixedMissed") || "{}");
  const id = problem.p + "." + problem.f;
  if (!missed[id]) errors.push(`промах не записан: ${JSON.stringify(missed)}`);
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
  if (!widget.querySelector('.algo-runner[data-pkg="' + problem.p + '"]')) {
    errors.push("после ответа не появился редактор с нужным пакетом");
  }

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

function finish() {
  if (errors.length) {
    console.error(`❌ mixed-check: ${errors.length} проблем(ы):`);
    for (const e of errors) console.error("  - " + e);
    process.exit(1);
  }
  console.log(
    "✅ mixed-check: условие показывается без темы и подсказок, 4 варианта из реальных глав, " +
      "промах записывается и приоритетно возвращается, верный ответ раскрывает главу и редактор, " +
      "слабые места считаются по квизу и смешанной вместе"
  );
}

main().catch((e) => {
  console.error("❌ mixed-check: неожиданная ошибка:", e);
  process.exit(1);
});
