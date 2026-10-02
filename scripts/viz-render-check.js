#!/usr/bin/env node
// Headless smoke рендера виджетов через jsdom (дополняет check-viz.js, который
// проверяет лишь связность data-viz↔DASH↔CODE). Здесь каждый тип РЕАЛЬНО строится
// движком с его data-атрибутами из глав и прошагивается стрелками — ловит
// рантайм-крэши (NaN-координаты, undefined, выход за границы шага), пустой рендер
// и плашки-ошибки.
//
//   node scripts/viz-render-check.js
//
// Требует jsdom (dev-зависимость, в репозитории не хранится):
//   npm i -g jsdom   (и запуск с NODE_PATH на глобальные модули), либо npm i jsdom
// Если jsdom не найден — скрипт мягко пропускается (exit 0), чтобы не ломать тех,
// у кого его нет.
"use strict";
const fs = require("fs");
const path = require("path");

let JSDOM, VirtualConsole;
try {
  ({ JSDOM, VirtualConsole } = require("jsdom"));
} catch (e) {
  console.log("⏭  viz-render-check: jsdom не установлен — пропускаю (npm i jsdom). Связность проверяет check-viz.js.");
  process.exit(0);
}

const root = path.resolve(__dirname, "..");
const js = fs.readFileSync(path.join(root, "assets", "algo-viz.js"), "utf8");
const { infraScriptTags } = require("./lib/infra-files.js");

// Уникальные div.algo-viz (первое вхождение каждого типа) из src/*.md — с их реальными атрибутами.
const seen = new Set(), divs = [];
for (const f of fs.readdirSync(path.join(root, "src")).filter((n) => n.endsWith(".md"))) {
  const text = fs.readFileSync(path.join(root, "src", f), "utf8");
  for (const m of text.matchAll(/<div class="algo-viz"[^>]*><\/div>/g)) {
    const tm = m[0].match(/data-viz="([^"]+)"/);
    if (!tm || seen.has(tm[1])) continue;
    seen.add(tm[1]);
    divs.push({ type: tm[1], tag: m[0] });
  }
}

const errors = [];
const vc = new VirtualConsole();
vc.on("jsdomError", (e) => errors.push("jsdomError: " + (e && e.message)));
vc.on("error", (...a) => errors.push("console.error: " + a.join(" ")));
vc.on("warn", (...a) => errors.push("console.warn: " + a.join(" ")));

const body = divs.map((d, i) => d.tag.replace("<div ", `<div id="w${i}" tabindex="0" `)).join("\n");
const dom = new JSDOM(
  `<!DOCTYPE html><html><body>${body}<script>${js}</script>${infraScriptTags(root)}</body></html>`,
  { runScripts: "dangerously", virtualConsole: vc, pretendToBeVisual: true }
);
const doc = dom.window.document;

setTimeout(() => {
  const bad = [];
  let hot = 0;
  divs.forEach((d, i) => {
    const el = doc.getElementById("w" + i);
    const ready = el.classList.contains("algo-viz--ready");
    const note = el.querySelector(".algo-tp__note");
    const isErr = note ? /Ошибка|Неизвестн/.test(note.textContent) : false;
    const nDesc = el.querySelectorAll("*").length;
    const stepNav = /\/\s*\d+|из\s+\d+|Шаг/.test(el.textContent);
    let stepErr = null, hotSeen = false;
    const statCard = el.querySelector(".algo-tp__status");
    try {
      for (let s = 0; s < 90; s++) {
        el.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
        if (statCard && statCard.classList.contains("algo-tp__status--hot")) hotSeen = true;
      }
    } catch (e) { stepErr = e.message; }
    if (hotSeen) hot++;
    if (!(ready && !isErr && nDesc > 10 && stepNav && !stepErr)) {
      bad.push(`${d.type}: ready=${ready} err=${isErr} nDesc=${nDesc} nav=${stepNav} stepErr=${stepErr || "-"} ${isErr && note ? note.textContent.slice(0, 80) : ""}`);
    }
  });

  if (bad.length || errors.length) {
    console.error(`❌ viz-render-check: проблемных ${bad.length} из ${divs.length}`);
    bad.forEach((b) => console.error("  - " + b));
    [...new Set(errors)].slice(0, 40).forEach((e) => console.error("  ! " + e.slice(0, 140)));
    process.exit(1);
  }
  console.log(`✅ viz-render-check: все ${divs.length} виджетов строятся, имеют контент и прошагиваются без ошибок (подсветка --hot на ${hot}).`);
}, 600);
