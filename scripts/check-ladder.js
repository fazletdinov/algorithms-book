#!/usr/bin/env node
// Линт «лестницы задач» (запускать из корня: node scripts/check-ladder.js).
//
// Лестница — это три ступени (разогрев → основа → добивка) плюс строка «не пошло»
// с конкретной подсказкой. Она заменила плоский список ссылок на LeetCode, потому
// что список не отвечал на два вопроса: в каком порядке решать и что делать, когда
// застрял. Проверяем ровно то, что ломается молча:
//
//  1) у главы ЯДРА со списком задач лестница есть (иначе новая глава ядра тихо
//     приедет с плоским списком, и маршрут снова станет «прорешай всё подряд»);
//  2) ступени идут в правильном порядке и ни одна не потерялась;
//  3) в каждой ступени есть хотя бы одна задача (пустая ступень — опечатка);
//  4) есть строка «не пошло» — та самая стрелка «вернись сюда», ради которой
//     всё и затевалось. Без неё лестница вырождается в тот же список, но с
//     заголовками.
//
// Уровень главы (core/ext/ref/tool) берётся из ЕДИНОГО реестра — assets/progress.js,
// того же, что питает трекер и плашку на странице.
"use strict";
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const srcDir = path.join(root, "src");
const errors = [];

const read = (p) => fs.readFileSync(p, "utf8");

// уровни глав из реестра трекера
const progressJs = read(path.join(root, "assets", "progress.js"));
const levelOf = new Map(
  [...progressJs.matchAll(/h:\s*"([\w-]+)\.html",\s*lvl:\s*"(\w+)"/g)].map((m) => [m[1], m[2]])
);

const TIERS = [
  { emoji: "🟢", name: "Разогрев" },
  { emoji: "🔵", name: "Основа" },
  { emoji: "🔴", name: "Добивка" },
];

let withLadder = 0;
let coreSkipped = 0;

for (const file of fs.readdirSync(srcDir).filter((f) => f.endsWith(".md") && f !== "SUMMARY.md")) {
  const slug = file.replace(/\.md$/, "");
  const text = read(path.join(srcDir, file));
  const where = `src/${file}`;

  const positions = TIERS.map((t) => text.indexOf(`**${t.emoji} ${t.name}**`));
  const present = positions.filter((p) => p !== -1).length;
  const hasProblems = /leetcode\.com\/problems/.test(text);
  const isCore = levelOf.get(slug) === "core";

  if (present === 0) {
    // Ядро со списком задач обязано иметь лестницу; всё остальное — по желанию.
    if (isCore && hasProblems) {
      errors.push(
        `${where}: глава ЯДРА со списком задач, но без лестницы ` +
          `(нужны ступени ${TIERS.map((t) => t.emoji + " " + t.name).join(" → ")})`
      );
    } else if (isCore) {
      coreSkipped++;
    }
    continue;
  }

  withLadder++;

  // 2) все три ступени на месте и в правильном порядке
  const missing = TIERS.filter((t, i) => positions[i] === -1);
  if (missing.length) {
    errors.push(`${where}: в лестнице нет ступени ${missing.map((t) => `«${t.name}»`).join(", ")}`);
    continue;
  }
  for (let i = 1; i < positions.length; i++) {
    if (positions[i] < positions[i - 1]) {
      errors.push(
        `${where}: ступень «${TIERS[i].name}» стоит выше «${TIERS[i - 1].name}» — ` +
          `лестница читается снизу вверх, порядок важен`
      );
    }
  }

  // 3) в каждой ступени есть задачи
  const bounds = positions.concat(text.length);
  TIERS.forEach((t, i) => {
    const block = text.slice(bounds[i], bounds[i + 1]);
    const links = (block.match(/leetcode\.com\/problems/g) || []).length;
    if (!links) {
      errors.push(`${where}: в ступени «${t.name}» нет ни одной задачи`);
    }
  });

  // 4) стрелка «не пошло — вернись сюда»
  const tail = text.slice(positions[2]);
  if (!/не пошл/i.test(tail)) {
    errors.push(
      `${where}: после лестницы нет строки «Не пошла задача…» — ` +
        `без подсказки, куда вернуться, лестница это просто список с заголовками`
    );
  }
}

if (errors.length) {
  console.error(`❌ check-ladder: ${errors.length} проблем(ы):`);
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
console.log(
  `✅ check-ladder: лестница задач в ${withLadder} главах — три ступени по порядку, ` +
    `каждая непустая, подсказка «не пошло» на месте ` +
    `(глав ядра без списка задач: ${coreSkipped} — практика там в пакете тренажёра или в задачах самой главы)`
);
