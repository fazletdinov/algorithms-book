#!/usr/bin/env node
// Смоук-проверка интерактива (запускать из корня репозитория: node scripts/check-viz.js).
// Ловит класс ошибок, который иначе проходит незаметно (mdBook просто копирует JS):
//  1) каждый data-viz="X" в src/*.md имеет конфиг в реестре DASH (иначе пустой <div>);
//  2) у каждого конфига DASH codeKey есть запись в реестре CODE (иначе пустая панель кода);
//  3) индексы в lineNotes не выходят за пределы листинга CODE (иначе подпись о несуществующей строке);
//  4) пресет граничного случая задаёт ровно поля ввода своего типа (иначе кнопка молча не работает);
//  5) у неонового виджета (без customViz) в главе ядра есть легенда: смысл цветов иначе живёт
//     только в абзаце над виджетом, который при листании уезжает с экрана.
// Синтаксис самих *.js проверяется отдельно через `node --check` (см. CI).
"use strict";
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const js = fs.readFileSync(path.join(root, "assets", "algo-viz.js"), "utf8");
const infraJs = fs.readFileSync(path.join(root, "assets", "infra-viz.js"), "utf8");
// Конфиги и листинги инфраструктурных типов живут в infra-viz.js в том же формате (отступ 4 пробела)
const all = js + "\n" + infraJs;
const errors = [];

// --- ключи DASH ---
const dashKeys = new Set([...all.matchAll(/^    "([a-z0-9-]+)":\s*\{/gm)].map((m) => m[1]));

// --- реестр CODE: ключ -> массив строк ---
const CODE = {};
function collectCode(src) {
  const codeStart = src.indexOf("var CODE = {");
  if (codeStart < 0) return; // у infra-viz.js блока CODE может ещё не быть
  const codeBody = src.slice(codeStart, src.indexOf("\n  };", codeStart));
  const keyRe = /^    "([a-z0-9-]+)":\s*\[([\s\S]*?)\],?\s*$/gm;
  let m;
  while ((m = keyRe.exec(codeBody))) CODE[m[1]] = [...m[2].matchAll(/"(?:[^"\\]|\\.)*"/g)].map((x) => x[0]);
}
collectCode(js);
collectCode(infraJs);

// --- разбор конфигов DASH: codeKey и lineNotes ---
const cfgRe = /^    "([a-z0-9-]+)":\s*\{/gm;
const configs = [];
let c;
while ((c = cfgRe.exec(all))) configs.push({ key: c[1], at: c.index });
configs.forEach((cfg, i) => {
  const body = all.slice(cfg.at, i + 1 < configs.length ? configs[i + 1].at : all.length);
  cfg.codeKey = (body.match(/codeKey:\s*"([^"]+)"/) || [])[1];
  const ln = body.match(/lineNotes:\s*\{([^}]*)\}/);
  cfg.lineNotes = ln ? [...ln[1].matchAll(/(\d+):/g)].map((x) => +x[1]) : [];
  const inp = body.match(/\n      inputs: \[([^\n]*)\],/);
  cfg.inputs = inp ? [...inp[1].matchAll(/attr: "([^"]+)"/g)].map((x) => x[1]) : [];
  const pr = body.match(/\n      presets: \[\n([\s\S]*?)\n      \],/);
  cfg.presets = pr ? [...pr[1].matchAll(/label: ("(?:[^"\\]|\\.)*"), set: \{([^}]*)\}/g)].map((x) => ({ label: JSON.parse(x[1]), keys: [...x[2].matchAll(/"(data-[a-z-]+)":/g)].map((k) => k[1]) })) : null;
  cfg.legend = /\n      legend: \[/.test(body);
  cfg.customViz = /\n      customViz:/.test(body);
});

// (2) codeKey есть в CODE; (3) индексы lineNotes в пределах листинга
configs.forEach((cfg) => {
  if (!cfg.codeKey) { errors.push(`Конфиг DASH "${cfg.key}" без codeKey`); return; }
  const lines = CODE[cfg.codeKey];
  if (!lines) { errors.push(`Конфиг "${cfg.key}": codeKey "${cfg.codeKey}" отсутствует в реестре CODE`); return; }
  cfg.lineNotes.forEach((idx) => {
    if (idx < 0 || idx >= lines.length) {
      errors.push(`Конфиг "${cfg.key}": lineNotes ссылается на строку ${idx}, а в CODE["${cfg.codeKey}"] всего ${lines.length} строк`);
    }
  });
});

// (4) пресет граничного случая задаёт РОВНО поля ввода своего типа: лишний атрибут
// движок не прочитает (кнопка молча ничего не меняет), недостающий останется от
// прошлого пресета — и «другой target» покажет разное в зависимости от порядка нажатий
let presetCount = 0;
configs.forEach((cfg) => {
  if (!cfg.presets) return;
  if (!cfg.inputs.length) errors.push(`Конфиг "${cfg.key}": presets без inputs — подставлять некуда`);
  const want = [...cfg.inputs].sort().join(",");
  cfg.presets.forEach((p) => {
    presetCount++;
    const got = [...p.keys].sort().join(",");
    if (got !== want) errors.push(`Конфиг "${cfg.key}": пресет «${p.label}» задаёт {${got}}, а поля ввода типа — {${want}}`);
  });
});
// (1) каждый data-viz из src имеет конфиг DASH
const srcDir = path.join(root, "src");
const used = new Map(); // тип -> файлы
for (const f of fs.readdirSync(srcDir).filter((n) => n.endsWith(".md"))) {
  const text = fs.readFileSync(path.join(srcDir, f), "utf8");
  for (const mm of text.matchAll(/data-viz="([^"]+)"/g)) {
    if (!used.has(mm[1])) used.set(mm[1], []);
    used.get(mm[1]).push(f);
  }
}
for (const [type, files] of used) {
  if (!dashKeys.has(type)) {
    errors.push(`data-viz="${type}" (в ${files.join(", ")}) не имеет конфига в DASH`);
  }
}

// (5) легенда у неоновых виджетов ядра. Уровень главы — из реестра трекера (progress.js),
// тот же источник, что у плашки уровня и у check-ladder.
const progressJs = fs.readFileSync(path.join(root, "assets", "progress.js"), "utf8");
const coreChapters = new Set([...progressJs.matchAll(/h: "([a-z0-9-]+)\.html", lvl: "core"/g)].map((x) => x[1] + ".md"));
if (coreChapters.size < 20) errors.push(`не удалось прочитать главы ядра из progress.js (найдено ${coreChapters.size})`);
let legendCore = 0;
const byKey = new Map(configs.map((c) => [c.key, c]));
for (const [type, files] of used) {
  const cfg = byKey.get(type);
  if (!cfg || cfg.customViz || !files.some((f) => coreChapters.has(f))) continue;
  legendCore++;
  if (!cfg.legend) errors.push(`Конфиг "${type}" (глава ядра ${files.filter((f) => coreChapters.has(f)).join(", ")}): неоновый виджет без легенды — цвета ячеек ничем не объяснены`);
}

if (errors.length) {
  errors.forEach((e) => console.error("::error::" + e));
  console.error(`\n❌ check-viz: ${errors.length} проблем(ы)`);
  process.exit(1);
}
console.log(`✅ check-viz: ${used.size} типов data-viz, ${dashKeys.size} конфигов DASH, ${Object.keys(CODE).length} листингов CODE, ${presetCount} пресетов граничных случаев, легенда у всех ${legendCore} неоновых виджетов ядра — всё согласовано`);
