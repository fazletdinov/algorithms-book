#!/usr/bin/env node
// Линт режима «объясни сам» (из корня: node scripts/check-explain.js).
//
// Виджет молча деградирует до пустой рамки, если разметка неполна: без пары
// вопрос/эталон элемент просто не попадает в список, и читатель видит блок без
// содержимого — а книга при этом собирается зелёной. Проверяем:
//   1) у каждого .algo-explain есть data-key, и он совпадает со слагом ГЛАВЫ,
//      в которой виджет стоит (иначе карточка повторения уведёт не туда);
//   2) ключи уникальны по книге (ключ — идентификатор карточки в srs.js);
//   3) внутри ≥ 2 блоков .algo-explain__item, у каждого есть и вопрос, и эталон;
//   4) эталон не заглушка: осмысленная длина;
//   5) виджет стоит В НАЧАЛЕ раздела «Почему это корректно», а не после разбора —
//      иначе формулировать «своими словами» уже поздно.
"use strict";
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const srcDir = path.join(root, "src");
const errors = [];
const MIN_REF = 120;

const seenKeys = new Map();
let widgets = 0;
let questions = 0;

for (const file of fs.readdirSync(srcDir).filter((f) => f.endsWith(".md") && f !== "SUMMARY.md")) {
  const text = fs.readFileSync(path.join(srcDir, file), "utf8");
  const slug = file.replace(/\.md$/, "");
  const re = /<div class="algo-explain"([^>]*)>([\s\S]*?)\n<\/div>/g;
  let m;
  while ((m = re.exec(text))) {
    widgets++;
    const where = `src/${file}`;
    const key = (m[1].match(/data-key="([^"]*)"/) || [])[1];
    const body = m[2];

    if (!key) {
      errors.push(`${where}: виджет algo-explain без data-key`);
      continue;
    }
    if (key !== slug) {
      errors.push(`${where}: data-key="${key}" не совпадает со слагом главы «${slug}» — карточка повторения уведёт на чужую страницу`);
    }
    if (seenKeys.has(key)) {
      errors.push(`${where}: data-key="${key}" уже занят в ${seenKeys.get(key)} — ключ идентифицирует карточку в srs.js`);
    }
    seenKeys.set(key, where);

    const items = [...body.matchAll(/<div class="algo-explain__item">([\s\S]*?)<\/div>\s*<\/div>/g)];
    const qs = [...body.matchAll(/<div class="algo-explain__q">([\s\S]*?)<\/div>/g)];
    const refs = [...body.matchAll(/<div class="algo-explain__ref">([\s\S]*?)<\/div>/g)];
    questions += qs.length;

    if (qs.length < 2) {
      errors.push(`${where}: в виджете ${qs.length} вопрос(ов) — нужно минимум 2 (предусловие и инвариант)`);
    }
    if (qs.length !== refs.length) {
      errors.push(`${where}: вопросов ${qs.length}, эталонов ${refs.length} — у каждого вопроса должен быть свой эталон`);
    }
    if (items.length !== qs.length) {
      errors.push(`${where}: блоков .algo-explain__item ${items.length}, вопросов ${qs.length} — вопрос и эталон должны лежать в одном item`);
    }
    refs.forEach((r, i) => {
      const plain = r[1].replace(/<[^>]+>/g, "").trim();
      if (plain.length < MIN_REF) {
        errors.push(`${where}: эталон #${i + 1} короче ${MIN_REF} символов (${plain.length}) — похоже на заглушку`);
      }
    });
    qs.forEach((q, i) => {
      const plain = q[1].replace(/<[^>]+>/g, "").trim();
      if (!plain.endsWith("?") && !/\.$/.test(plain)) {
        errors.push(`${where}: вопрос #${i + 1} не выглядит вопросом или заданием: «${plain.slice(0, 60)}»`);
      }
    });

    // виджет обязан стоять сразу после заголовка раздела
    const before = text.slice(0, m.index).trimEnd();
    if (!/## 🧠 Почему это корректно$/.test(before)) {
      errors.push(`${where}: виджет стоит не в начале раздела «🧠 Почему это корректно» — формулировать своими словами уже поздно`);
    }
  }
}

if (errors.length) {
  console.error(`❌ check-explain: ${errors.length} проблем(ы):`);
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
console.log(
  `✅ check-explain: ${widgets} виджетов «объясни сам», ${questions} вопросов — ключи уникальны, у каждого вопроса есть эталон, все стоят до разбора`
);
