#!/usr/bin/env node
// Генератор assets/course-map.js (запускать из корня: node scripts/gen-course-map.js).
//
// Карта курса (assets/course-map-view.js) рисует стрелки «глава стоит на главе». Источник правды —
// первое предложение «Вспомни» глав ядра (тот же разбор, что у check-ladder.js, — scripts/lib/leans.js);
// в браузере текста других глав нет, поэтому опоры собираются сюда. Руками файл не правится.
//
//   node scripts/gen-course-map.js          — записать assets/course-map.js
//   node scripts/gen-course-map.js --check  — сверить с диском (CI): расхождение — выход 1
"use strict";
const fs = require("fs");
const path = require("path");
const { leansOf } = require("./lib/leans.js");

const root = path.resolve(__dirname, "..");
const OUT = path.join(root, "assets", "course-map.js");
const src = path.join(root, "src");

const leans = {};
for (const file of fs.readdirSync(src).filter((f) => f.endsWith(".md")).sort()) {
  const l = leansOf(fs.readFileSync(path.join(src, file), "utf8"));
  if (l && l.length) leans[file.replace(/\.md$/, "")] = l;
}

const body = `/*
 * course-map.js — опоры глав для карты курса: { глава: [главы, на которых она стоит] }.
 * СГЕНЕРИРОВАНО: node scripts/gen-course-map.js. Руками не редактировать: источник правды —
 * предложение «Эта глава стоит на …» в блоке «Вспомни» глав (src/*.md). CI: --check.
 */
(function () {
  var LEANS = ${JSON.stringify(leans, null, 2).replace(/\n/g, "\n  ")};
  if (typeof module !== "undefined" && module.exports) module.exports = LEANS;
  if (typeof window !== "undefined") window.ALGO_COURSE_LEANS = LEANS;
})();
`;

const n = Object.keys(leans).length;
const edges = Object.values(leans).reduce((a, l) => a + l.length, 0);
if (process.argv.includes("--check")) {
  const have = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
  if (have !== body) {
    console.error("✗ gen-course-map: assets/course-map.js не совпадает с главами — запусти node scripts/gen-course-map.js");
    process.exit(1);
  }
  console.log(`✅ gen-course-map: assets/course-map.js совпадает с главами (глав с опорами ${n}, стрелок ${edges})`);
} else {
  fs.writeFileSync(OUT, body);
  console.log(`записан assets/course-map.js: глав с опорами ${n}, стрелок ${edges}`);
}
