#!/usr/bin/env node
// Смоук-проверка интерактива (запускать из корня репозитория: node scripts/check-viz.js).
// Ловит класс ошибок, который иначе проходит незаметно (mdBook просто копирует JS):
//  1) каждый data-viz="X" в src/*.md имеет конфиг в реестре DASH (иначе пустой <div>);
//  2) у каждого конфига DASH codeKey есть запись в реестре CODE (иначе пустая панель кода);
//  3) индексы в lineNotes не выходят за пределы листинга CODE (иначе подпись о несуществующей строке);
//  4) пресет граничного случая задаёт ровно поля ввода своего типа (иначе кнопка молча не работает);
//  5) у неонового виджета (без customViz) в главе ядра есть легенда: смысл цветов иначе живёт
//     только в абзаце над виджетом, который при листании уезжает с экрана;
//  6) тип и его листинг объявлены один раз на все файлы (algo-viz.js + assets/infra-*.js): иначе
//     проверка видела бы одну запись, а в браузере ALGO_VIZ.register бросил бы при загрузке;
//  7) SVG рёбер дерева (algo-tp__bstsvg) создаётся с width/height в пикселях: без них он
//     сжимался вместе с хостом, а узлы оставались на своих местах.
// Синтаксис самих *.js проверяется отдельно через `node --check` (см. CI).
"use strict";
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const js = fs.readFileSync(path.join(root, "assets", "algo-viz.js"), "utf8");
const { readInfra, infraScriptTags } = require("./lib/infra-files.js");
const infraFiles = readInfra(root);
const infraJs = infraFiles.map((f) => f.src).join("\n");
// Конфиги и листинги инфраструктурных типов живут в assets/infra-*.js в том же формате (отступ 4 пробела)
const all = js + "\n" + infraJs;
const errors = [];

// --- ключи DASH ---
const dashKeys = new Set([...all.matchAll(/^    "([a-z0-9-]+)":\s*\{/gm)].map((m) => m[1]));

// --- дубликаты: Set и перезапись в CODE схлопнули бы их молча, а в рантайме register бросит ---
// Считаем по файлам отдельно: ключ в двух файлах или дважды в одном — ошибка.
function countKeys(src, re) {
  const n = {};
  for (const m of src.matchAll(re)) n[m[1]] = (n[m[1]] || 0) + 1;
  return n;
}
function codeBlock(src) {
  const at = src.indexOf("var CODE = {");
  return at < 0 ? "" : src.slice(at, src.indexOf("\n  };", at));
}
function checkDuplicates(what, re, pick) {
  const files = [{ name: "algo-viz.js", src: js }, ...infraFiles].map((f) => ({ name: f.name, n: countKeys(pick(f.src), re) }));
  const keys = new Set(files.flatMap((f) => Object.keys(f.n)));
  for (const k of keys) {
    const where = files.filter((f) => f.n[k]);
    if (where.length > 1) errors.push(`Дубликат типа "${k}" в ${where.map((f) => f.name).join(" и ")} (${what})`);
    else if (where[0].n[k] > 1) errors.push(`Дубликат типа "${k}" внутри одного файла ${where[0].name} (${what})`);
  }
}
checkDuplicates("конфиг DASH/INFRA", /^    "([a-z0-9-]+)":\s*\{/gm, (src) => src);
checkDuplicates("листинг CODE", /^    "([a-z0-9-]+)":\s*\[/gm, codeBlock);

// --- реестр CODE: ключ -> массив строк ---
const CODE = {};
function collectCode(src) {
  const codeStart = src.indexOf("var CODE = {");
  if (codeStart < 0) return; // у файла темы блока CODE может ещё не быть
  const codeBody = src.slice(codeStart, src.indexOf("\n  };", codeStart));
  const keyRe = /^    "([a-z0-9-]+)":\s*\[([\s\S]*?)\],?\s*$/gm;
  let m;
  while ((m = keyRe.exec(codeBody))) CODE[m[1]] = [...m[2].matchAll(/"(?:[^"\\]|\\.)*"/g)].map((x) => x[0]);
}
collectCode(js);
infraFiles.forEach((f) => collectCode(f.src));

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

// (7) SVG рёбер дерева рисуется в пикселях узлов. Узлы стоят в px от края хоста, а SVG без
// width/height растягивался на ширину СЖАТОГО хоста (max-width: 100%) — на телефоне рёбра
// трёх виджетов BST отрывались от узлов на десятки пикселей.
let edgeSvgs = 0;
js.split("\n").forEach((line, i) => {
  if (!/"algo-tp__bstsvg"/.test(line)) return;
  edgeSvgs++;
  if (!(/setAttribute\("width", W\)/.test(line) && /setAttribute\("height", H\)/.test(line))) {
    errors.push(`assets/algo-viz.js:${i + 1}: SVG рёбер (algo-tp__bstsvg) без width/height в пикселях`);
  }
});
if (!edgeSvgs) errors.push("в assets/algo-viz.js не найдено ни одного SVG рёбер (algo-tp__bstsvg) — правило 7 ничего не проверило");

if (errors.length) {
  errors.forEach((e) => console.error("::error::" + e));
  console.error(`\n❌ check-viz: ${errors.length} проблем(ы)`);
  process.exit(1);
}
console.log(`✅ check-viz: ${used.size} типов data-viz, ${dashKeys.size} конфигов DASH, ${Object.keys(CODE).length} листингов CODE, ${presetCount} пресетов граничных случаев, легенда у всех ${legendCore} неоновых виджетов ядра — всё согласовано`);
