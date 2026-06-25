#!/usr/bin/env node
// РУЧНАЯ проверка внешних ссылок на «гниль» (нужна сеть; НЕ в CI — иначе CI станет
// флаки из-за антибота/рейт-лимитов внешних сайтов). Запуск из корня на Node 18+:
//   node scripts/check-links-external.js
// LeetCode за Cloudflare отдаёт 403 на обычный запрос, поэтому ссылки на задачи
// (leetcode.com/problems/<slug>) валидируются через их GraphQL (question по titleSlug);
// прочие хосты — обычным GET со статусом 2xx/3xx = живо. 403 от leetcode.com (не-problem)
// считаем «жив, но защищён ботом», а не мёртвым.
"use strict";
const fs = require("fs");
const path = require("path");

const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36";
const srcDir = path.join(path.resolve(__dirname, ".."), "src");

const urls = new Map(); // url -> Set(files)
for (const mf of fs.readdirSync(srcDir).filter((n) => n.endsWith(".md"))) {
  const txt = fs.readFileSync(path.join(srcDir, mf), "utf8");
  for (let u of txt.match(/https?:\/\/[^\s)"'\]]+/g) || []) {
    u = u.replace(/[.,);`>]+$/, "");
    if (u.includes("localhost")) continue;
    if (!urls.has(u)) urls.set(u, new Set());
    urls.get(u).add(mf);
  }
}

const LC = /^https?:\/\/leetcode\.com\/problems\/([a-z0-9-]+)\/?$/;

async function checkLeetcode(slug) {
  try {
    const r = await fetch("https://leetcode.com/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": UA, Referer: "https://leetcode.com" },
      body: JSON.stringify({ query: "query q($t:String!){question(titleSlug:$t){questionId}}", variables: { t: slug } }),
    });
    const j = await r.json();
    return j && j.data && j.data.question ? "ok" : "missing";
  } catch (e) { return "err:" + e.message; }
}

async function checkUrl(u) {
  try {
    const r = await fetch(u, { headers: { "User-Agent": UA }, redirect: "follow" });
    if (r.status >= 200 && r.status < 400) return "ok";
    if (r.status === 403 && /leetcode\.com/.test(u)) return "blocked"; // антибот, не «мёртвый»
    return "http:" + r.status;
  } catch (e) { return "err:" + e.message; }
}

(async () => {
  console.log(`Проверяю ${urls.size} внешних URL...`);
  const dead = [];
  let blocked = 0;
  for (const [u, files] of urls) {
    const m = u.match(LC);
    const verdict = m ? await checkLeetcode(m[1]) : await checkUrl(u);
    if (verdict === "blocked") blocked++;
    else if (verdict !== "ok") dead.push({ u, verdict, files: [...files].sort() });
  }
  if (dead.length) {
    console.error(`\n❌ Проблемные ссылки (${dead.length}); защищённых ботом пропущено: ${blocked}`);
    dead.forEach((d) => console.error(`  ${d.verdict}: ${d.u}\n      в: ${d.files.join(", ")}`));
    process.exit(1);
  }
  console.log(`✅ Все внешние ссылки живы (${blocked} защищены ботом — пропущены).`);
})();
