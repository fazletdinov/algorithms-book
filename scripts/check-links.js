#!/usr/bin/env node
// Проверка внутренних ссылок книги (запускать ПОСЛЕ `mdbook build`, из корня:
//   mdbook build && node scripts/check-links.js
// Ловит то, что иначе всплывёт только у читателя кликом:
//  1) ссылка [..](foo.md) на несуществующую главу;
//  2) ссылка [..](foo.md#anchor) или [..](#anchor) на несуществующий якорь;
//  3) ссылка на отсутствующий локальный файл (картинка/папка).
// То же — для <a href="…"> внутри HTML-блоков глав (их markdown-регэксп не видит).
// Якоря берём из СОБРАННОГО book/*.html (это авторитетный источник — ровно те id,
// что сгенерировал mdBook), поэтому угадывать алгоритм слагов не нужно.
// Внешние http(s)-ссылки тут НЕ проверяются (см. check-links-external при наличии).
"use strict";
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const srcDir = path.join(root, "src");
const bookDir = path.join(root, "book");

if (!fs.existsSync(bookDir)) {
  console.error("❌ check-links: нет каталога book/. Сначала запусти `mdbook build`.");
  process.exit(1);
}

// mdBook рендерит первую главу README.md как index.html (README.html не создаётся).
const srcToPage = (name) => (name === "README" ? "index" : name);

// id/name из каждой собранной страницы: ключ — basename без .html.
const ids = {};
for (const hf of fs.readdirSync(bookDir).filter((n) => n.endsWith(".html"))) {
  const html = fs.readFileSync(path.join(bookDir, hf), "utf8");
  const set = new Set();
  for (const m of html.matchAll(/\sid="([^"]+)"/g)) set.add(m[1]);
  for (const m of html.matchAll(/\sname="([^"]+)"/g)) set.add(m[1]);
  ids[hf.slice(0, -5)] = set;
}

const linkRe = /\[(?:[^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
// <a href="…"> в HTML-блоках глав («Вспомни», «Что унести», карточки): mdBook переписывает в них
// .md → .html так же, как в markdown-ссылках, поэтому проверяются они тем же путём.
const htmlLinkRe = /<a\s[^>]*?\bhref="([^"]+)"/g;
const broken = [];
let total = 0, external = 0, htmlLinks = 0;

for (const mf of fs.readdirSync(srcDir).filter((n) => n.endsWith(".md"))) {
  const base = mf.slice(0, -3);
  // вырезаем fenced-блоки кода, чтобы не ловить link-подобный синтаксис внутри них, и теги
  // рисунков: data-tree дерева отрезков «3|[0,1](2|[0,0],…)» — разметка дерева, а не ссылка
  // (внутри HTML-тега mdBook ссылок не делает)
  const text = fs.readFileSync(path.join(srcDir, mf), "utf8").replace(/```[\s\S]*?```/g, "").replace(/<div\s[^>]*\bclass="(?:[^"]*\s)?algo-fig(?:\s[^"]*)?"[^>]*>/g, "");
  const targets = [...text.matchAll(linkRe)].map((m) => m[1]);
  for (const m of text.matchAll(htmlLinkRe)) {
    if (!/^(https?:|mailto:|tel:)/.test(m[1].trim())) htmlLinks++;
    targets.push(m[1]);
  }
  for (const raw of targets) {
    let tgt = raw.trim();
    if (/^(https?:|mailto:|tel:)/.test(tgt)) { external++; continue; }
    total++;
    let page, anchor;
    if (tgt.startsWith("#")) {
      page = srcToPage(base);
      anchor = tgt.slice(1);
    } else {
      const [f, a] = tgt.split("#");
      const file = f.replace(/^\.\//, "");
      anchor = a;
      if (!file.endsWith(".md")) {
        // ссылка на не-md ресурс (картинка/папка) — проверяем существование пути
        if (!fs.existsSync(path.join(srcDir, file))) {
          broken.push(`[${base}] ${tgt} — локальный путь не найден`);
        }
        continue;
      }
      page = srcToPage(file.slice(0, -3));
    }
    if (!ids[page]) { broken.push(`[${base}] ${tgt} — нет страницы '${page}'`); continue; }
    if (anchor && !ids[page].has(anchor)) {
      broken.push(`[${base}] ${tgt} — якорь '${anchor}' отсутствует на странице '${page}'`);
    }
  }
}

if (broken.length) {
  broken.forEach((b) => console.error("::error::" + b));
  console.error(`\n❌ check-links: ${broken.length} битых ссылок (из ${total} внутренних)`);
  process.exit(1);
}
console.log(`✅ check-links: ${total} внутренних ссылок и якорей валидны (из них ${htmlLinks} — <a href> в HTML-блоках; ${external} внешних не проверялись), ${Object.keys(ids).length} страниц`);
