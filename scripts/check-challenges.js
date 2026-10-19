#!/usr/bin/env node
// Линт слоя интерактивных задач (запускать из корня: node scripts/check-challenges.js).
// Ловит класс контентных ошибок, которые иначе всплывают только у читателя:
//  1) неизвестный data-type (виджет молча отрисуется как predict);
//  2) choice: меньше 3 вариантов (угадывание 50%), data-answer вне диапазона
//     или не число; вариант, похожий на обрубок (символ «|» внутри текста
//     варианта режется движком при split);
//  3) predict/cloze: пустой data-answer;
//  4) ordering: меньше 2 шагов в data-items;
//  5) отсутствует data-explain (разбор после верного ответа — часть формата);
//  6) data-id: узел с ним не занимает позиционный номер (challenge.js), поэтому формат строгий —
//     «<слаг файла>#r<N>», уникален по книге (это ключ отметок, промахов и карточки task:);
//     у такого вопроса обязателен data-from — слаг главы, приём которой он повторяет (файл
//     src/<слаг>.md есть); data-from без data-id не бывает. Порядок по маршруту — check-ladder.js.
// Конвенция: правильный вариант choice идёт ПЕРВЫМ в data-options
// (data-answer="0"); на экране движок перемешивает кнопки сам.
"use strict";
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const srcDir = path.join(root, "src");
const errors = [];
const KNOWN_TYPES = new Set(["predict", "choice", "cloze", "ordering"]);

// эвристика «вариант выглядит обрубком»: начинается/заканчивается на знак
// сравнения или пуст — обычно значит, что внутри варианта был «|»
function looksTruncated(opt) {
  const t = opt.trim();
  return t === "" || /^[≤≥<>=−+]/.test(t) || /[≤≥<>=−+]$/.test(t);
}

// readTag возвращает содержимое тега от позиции start (после имени) до
// закрывающего «>», НЕ считая «>» внутри кавычек атрибутов (в вариантах
// ответов легально живут выражения вроде «mask + i > 0»).
function readTag(text, start) {
  let inQuote = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') inQuote = !inQuote;
    else if (ch === ">" && !inQuote) return text.slice(start, i);
  }
  return text.slice(start);
}

let total = 0;
let withId = 0;
const seenIds = new Map(); // data-id → где встретился впервые
const mdFiles = fs.readdirSync(srcDir).filter((f) => f.endsWith(".md"));
const slugs = new Set(mdFiles.map((f) => f.replace(/\.md$/, "")));
for (const file of mdFiles) {
  const slug = file.replace(/\.md$/, "");
  const text = fs.readFileSync(path.join(srcDir, file), "utf8");
  const re = /<div class="algo-challenge"/g;
  let m;
  while ((m = re.exec(text))) {
    // упоминание виджета в инлайн-коде (`<div class="algo-challenge">`) — не виджет
    if (text[m.index - 1] === "`") continue;
    total++;
    const line = text.slice(0, m.index).split("\n").length;
    const where = `src/${file}:${line}`;
    const tag = readTag(text, m.index + m[0].length);
    const attrs = {};
    for (const a of tag.matchAll(/data-([\w-]+)="([^"]*)"/g)) attrs[a[1]] = a[2];

    if ("id" in attrs) {
      withId++;
      const fmt = new RegExp(`^${slug.replace(/[-]/g, "\\-")}#r\\d+$`);
      if (!fmt.test(attrs.id)) {
        errors.push(`${where}: data-id="${attrs.id}" — нужен формат «${slug}#rN» (слаг этого файла, #r и номер)`);
      } else if (seenIds.has(attrs.id)) {
        errors.push(`${where}: data-id="${attrs.id}" уже стоит в ${seenIds.get(attrs.id)} — id обязан быть уникален по книге`);
      } else {
        seenIds.set(attrs.id, where);
      }
      if (!attrs.from) {
        errors.push(`${where}: у вопроса с data-id нет data-from — слага главы, приём которой он повторяет`);
      } else if (!slugs.has(attrs.from)) {
        errors.push(`${where}: data-from="${attrs.from}" — нет файла src/${attrs.from}.md`);
      }
    } else if ("from" in attrs) {
      errors.push(`${where}: data-from без data-id — вопрос-повторение обязан нести свой id (иначе он сдвинет номера задач ниже)`);
    }

    const type = attrs.type || "predict";
    if (!KNOWN_TYPES.has(type)) {
      errors.push(`${where}: неизвестный data-type="${type}"`);
      continue;
    }
    if (!attrs.explain) {
      errors.push(`${where}: нет data-explain (разбор после верного ответа обязателен)`);
    }
    if (type === "choice") {
      const opts = (attrs.options || "").split("|");
      if (opts.length < 3) {
        errors.push(`${where}: choice всего с ${opts.length} вариантами — нужно ≥ 3 правдоподобных`);
      }
      opts.forEach((o, i) => {
        if (looksTruncated(o)) {
          errors.push(`${where}: вариант ${i} выглядит обрубком («${o.trim()}») — внутри варианта был «|»?`);
        }
      });
      const ans = Number(attrs.answer);
      if (!Number.isInteger(ans) || ans < 0 || ans >= opts.length) {
        errors.push(`${where}: data-answer="${attrs.answer}" вне диапазона вариантов (0..${opts.length - 1})`);
      }
    } else if (type === "ordering") {
      const items = (attrs.items || "").split("|").filter((s) => s.trim());
      if (items.length < 2) {
        errors.push(`${where}: ordering с ${items.length} шагами — нужно ≥ 2`);
      }
    } else {
      // predict / cloze
      if (!(attrs.answer || "").trim()) {
        errors.push(`${where}: пустой data-answer у ${type}`);
      }
    }
  }
}

if (errors.length) {
  console.error(`❌ check-challenges: ${errors.length} проблем(ы) из ${total} задач:`);
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
console.log(
  `✅ check-challenges: все ${total} задач валидны (тип, ≥3 варианта у choice, ответы в диапазоне, explain на месте); ` +
    `с data-id: ${withId} — формат «слаг#rN», id уникальны, data-from называет главу`
);
