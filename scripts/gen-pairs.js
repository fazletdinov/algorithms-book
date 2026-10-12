#!/usr/bin/env node
// Генератор блоков «Не спутай с соседом» (запускать из корня: node scripts/gen-pairs.js).
//
// Источник правды — реестр путаемых пар assets/pairs.js: ряд { must, use, not, why }.
// В раздел «## 🔗» каждой главы, названной в рядах (как use или как not), генератор вписывает
// блок между метками <!-- pairs:begin … --> и <!-- pairs:end -->: сразу после заголовка и
// пустой строки, ряды в порядке реестра. У глав, которых в реестре нет, блок убирается.
// В руководство по выбору (src/pattern-selection-guide.md) — вся таблица: сразу после заголовка
// «## Путаемые пары: что обязано быть верно», между метками <!-- pairs:begin guide … -->.
// Руками внутри меток не править — правка реестра и перегенерация.
//
//   node scripts/gen-pairs.js          — вписать блоки в src/*.md
//   node scripts/gen-pairs.js --check  — сверить реестр и главы с диском (CI): расхождение — выход 1
//
// Самопроверка (selfTest) идёт всегда, на встроенных образцах.
"use strict";
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const SRC = path.join(root, "src");
const PROGRESS = path.join(root, "assets", "progress.js");

const BEGIN = "<!-- pairs:begin — сгенерировано node scripts/gen-pairs.js из assets/pairs.js, руками не править -->";
const GUIDE_BEGIN = "<!-- pairs:begin guide — сгенерировано node scripts/gen-pairs.js из assets/pairs.js, руками не править -->";
const END = "<!-- pairs:end -->";
const GUIDE = "pattern-selection-guide";
const GUIDE_HEADING = "## Путаемые пары: что обязано быть верно";
const GUIDE_LINK = "pattern-selection-guide.md#путаемые-пары-что-обязано-быть-верно";
const MAX_WORDS = 25;
// Ключ ряда — глава-ответ банка (по нему ищет смешанная тренировка и сверяется CONFUSABLE),
// а ссылка для читателя может вести на соседнюю главу, где приём объяснён. «Дерево Фенвика:
// задачи» — ответ банка, а обновление и запрос учит «устройство», и туда же ведут «Ломается»
// и «🔗» префиксных сумм. Блок получают обе главы; в каждой своя глава — без ссылки.
const LINK_TARGET = { "fenwick-tree": "fenwick-tree-structure" };
const href = (s) => LINK_TARGET[s] || s;

// Перевод строки после END необязателен: блок в самом конце файла тоже снимается, и запись
// не вставит второй.
const BLOCK_RE = /<!-- pairs:begin[^\n]*\n[\s\S]*?<!-- pairs:end -->(?:\n\n?)?/;
const LINKS_RE = /^(## 🔗[^\n]*\n)\n?/m;
const GUIDE_RE = new RegExp(`^(${GUIDE_HEADING}\n)\n?`, "m");

// Названия глав из трекера прогресса: слаг -> «Название». Приписка после двоеточия
// («Хеш-таблица: устройство», «Дерево Фенвика: задачи») в строке пары опускается:
// внутри предложения она читалась бы как начало пояснения.
function titlesOf(progressJs) {
  const titles = new Map();
  for (const m of progressJs.matchAll(/\{\s*t:\s*"([^"]+)",\s*h:\s*"([\w-]+)\.html",\s*lvl:\s*"\w+"/g)) {
    titles.set(m[2], m[1]);
  }
  return titles;
}

const words = (s) => s.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;

// Проверка реестра. titles — слаг -> название; texts — слаг -> текст главы (или нет в карте).
function validate(pairs, titles, texts) {
  const errs = [];
  const seen = new Set();
  pairs.forEach((p, i) => {
    const at = `ряд ${i + 1} (${p.use} ← ${p.not})`;
    const missing = ["must", "use", "not", "why"].filter((k) => typeof p[k] !== "string" || !p[k].trim());
    if (missing.length) {
      errs.push(`${at}: нет поля ${missing.join(", ")}`);
      return;
    }
    for (const s of new Set([p.use, p.not, href(p.use), href(p.not)])) {
      if (!titles.has(s)) errs.push(`${at}: главы «${s}» нет в assets/progress.js`);
      else if (!texts.has(s)) errs.push(`${at}: нет файла src/${s}.md`);
      else if (!LINKS_RE.test(texts.get(s))) errs.push(`${at}: в src/${s}.md нет раздела «## 🔗»`);
    }
    if (p.use === p.not) errs.push(`${at}: use и not — одна глава`);
    if (p.use === GUIDE || p.not === GUIDE) errs.push(`${at}: руководство по выбору — не глава`);
    const key = `${p.use}|${p.not}`;
    if (seen.has(key)) errs.push(`${at}: пара повторяется`);
    seen.add(key);
    for (const k of ["must", "why"]) {
      const n = words(p[k]);
      if (n > MAX_WORDS) errs.push(`${at}: ${k} — ${n} слов, больше ${MAX_WORDS}`);
      if (/[`<>\[\]{}=;|]/.test(p[k])) errs.push(`${at}: ${k} похоже на код или разметку`);
      if (!/^[а-яё]/iu.test(p[k])) errs.push(`${at}: ${k} должно начинаться с русского слова`);
      if (/[.!?;:,]$/.test(p[k])) errs.push(`${at}: ${k} без знака препинания в конце — его ставит генератор`);
    }
    // В строке «если must — Приём, а не Сосед: why» тире и двоеточие — разделители.
    if (/—/.test(p.must)) errs.push(`${at}: must без тире — оно отделяет название приёма`);
    if (/:/.test(p.why)) errs.push(`${at}: why без двоеточия — оно уже стоит перед why`);
  });
  return errs;
}

// Блок главы slug или null, если в реестре её нет.
function blockFor(slug, pairs, titles) {
  const short = (s) => titles.get(s).replace(/:.*$/, "");
  const own = (s) => s === slug || href(s) === slug;
  const name = (s) => (own(s) ? short(s) : `[${short(s)}](${href(s)}.md)`);
  const rows = pairs
    .filter((p) => own(p.use) || own(p.not))
    .map((p) => `- если ${p.must} — ${name(p.use)}, а не ${name(p.not)}: ${p.why}.`);
  if (!rows.length) return null;
  return (
    `${BEGIN}\n` +
    `**Не спутай с соседом** (вся таблица — в [руководстве по выбору](${GUIDE_LINK})):\n\n` +
    `${rows.join("\n")}\n${END}\n`
  );
}

// Таблица руководства по выбору: все ряды в порядке реестра.
function guideBlock(pairs, titles) {
  const short = (s) => titles.get(s).replace(/:.*$/, "");
  const rows = pairs.map((p) => `| ${p.must} | [${short(p.use)}](${href(p.use)}.md) | не [${short(p.not)}](${href(p.not)}.md): ${p.why} |`);
  return (
    `${GUIDE_BEGIN}\n` +
    "Если в условии верно то, что слева, — бери приём из середины, а не соседа справа. " +
    "Те же строки стоят в разделе «🔗» обеих глав пары.\n\n" +
    "| Что обязано быть верно | Приём | Почему не сосед |\n|---|---|---|\n" +
    `${rows.join("\n")}\n${END}\n`
  );
}

// Текст с вписанным блоком (block = null — блок убирается). head — заголовок, после которого
// встаёт блок: «## 🔗» у главы, GUIDE_HEADING у руководства.
function apply(text, block, head = LINKS_RE, headName = "«## 🔗»") {
  const begins = text.split("<!-- pairs:begin").length - 1;
  const ends = text.split(END).length - 1;
  if (begins !== ends || begins > 1) throw new Error(`меток pairs:begin ${begins}, pairs:end ${ends} — нужно поровну и не больше одной пары`);
  const clean = text.replace(BLOCK_RE, "");
  if (!block) return clean;
  if (!head.test(clean)) throw new Error(`нет раздела ${headName}`);
  return clean.replace(head, (_, h) => `${h}\n${block}\n`);
}

function loadChapters() {
  const texts = new Map();
  for (const f of fs.readdirSync(SRC).filter((n) => n.endsWith(".md")).sort()) {
    texts.set(f.replace(/\.md$/, ""), fs.readFileSync(path.join(SRC, f), "utf8"));
  }
  return texts;
}

// Ожидаемые тексты глав: слаг -> { disk, want }.
function generate(pairs, titles, texts) {
  const out = new Map();
  for (const [slug, disk] of texts) {
    let want;
    try {
      want =
        slug === GUIDE
          ? apply(disk, guideBlock(pairs, titles), GUIDE_RE, `«${GUIDE_HEADING}»`)
          : apply(disk, blockFor(slug, pairs, titles));
    } catch (e) {
      throw new Error(`src/${slug}.md: ${e.message}`);
    }
    out.set(slug, { disk, want });
  }
  return out;
}

function selfTest() {
  const errs = [];
  const titles = new Map([
    ["a", "Глава А"],
    ["b", "Глава Б: устройство"],
    ["c", "Глава В"],
  ]);
  const chapter = (body) => `# Г\n\nтекст\n\n## 🔗 Связанные шаблоны\n\n${body}- **[X](x.md)** — сосед.\n`;
  const texts = new Map([
    ["a", chapter("")],
    ["b", chapter("")],
    ["c", "# В\n\nбез раздела ссылок\n"],
  ]);
  const row = (o) => Object.assign({ must: "числа неотрицательны", use: "a", not: "b", why: "окно проще" }, o);
  const expectErr = (pairs, re, what) => {
    const got = validate(pairs, titles, texts);
    if (!got.some((e) => re.test(e))) errs.push(`самопроверка (${what}): нет ошибки ${re}, есть ${JSON.stringify(got)}`);
  };
  if (validate([row(), row({ use: "b", not: "a" })], titles, texts).length) errs.push("самопроверка: верный реестр красный");
  expectErr([row(), row()], /пара повторяется/, "повтор пары");
  expectErr([row({ not: "zz" })], /главы «zz» нет/, "несуществующий слаг");
  expectErr([row({ not: "a" })], /одна глава/, "use = not");
  expectErr([row({ not: "c" })], /нет раздела «## 🔗»/, "глава без 🔗");
  expectErr([row({ must: Array(26).fill("слово").join(" ") })], /must — 26 слов/, "must длиннее 25 слов");
  expectErr([row({ why: "берём `x := 1`" })], /похоже на код/, "код в why");
  expectErr([row({ why: "окно проще." })], /без знака препинания/, "точка в конце");
  expectErr([row({ must: "числа — любые" })], /must без тире/, "тире в must");
  expectErr([row({ why: "окно: проще" })], /why без двоеточия/, "двоеточие в why");

  const pairs = [row(), row({ use: "b", not: "a", must: "числа любые", why: "окно ломается" })];
  const block = blockFor("a", pairs, titles);
  const want =
    `${BEGIN}\n**Не спутай с соседом** (вся таблица — в [руководстве по выбору](${GUIDE_LINK})):\n\n` +
    "- если числа неотрицательны — Глава А, а не [Глава Б](b.md): окно проще.\n" +
    "- если числа любые — [Глава Б](b.md), а не Глава А: окно ломается.\n" +
    `${END}\n`;
  if (block !== want) errs.push(`самопроверка (блок): ${JSON.stringify(block)}`);
  if (blockFor("c", pairs, titles) !== null) errs.push("самопроверка: блок у главы вне реестра");

  const once = apply(texts.get("a"), block);
  if (once !== chapter(`${block}\n`)) errs.push(`самопроверка (вписывание): ${JSON.stringify(once)}`);
  if (apply(once, block) !== once) errs.push("самопроверка: второй прогон меняет главу");
  if (apply(once, null) !== texts.get("a")) errs.push("самопроверка: блок не убирается");
  const edited = once.replace("окно проще", "окно короче");
  if (apply(edited, block) === edited) errs.push("самопроверка: правка внутри меток не видна");
  const guide = `# Р\n\n${GUIDE_HEADING}\n\n## Дальше\n`;
  const gb = guideBlock(pairs, titles);
  if (!gb.includes("| числа неотрицательны | [Глава А](a.md) | не [Глава Б](b.md): окно проще |"))
    errs.push(`самопроверка (таблица руководства): ${JSON.stringify(gb)}`);
  const g1 = apply(guide, gb, GUIDE_RE);
  if (g1 !== `# Р\n\n${GUIDE_HEADING}\n\n${gb}\n## Дальше\n`) errs.push(`самопроверка (вписывание в руководство): ${JSON.stringify(g1)}`);
  if (apply(g1, gb, GUIDE_RE) !== g1) errs.push("самопроверка: второй прогон меняет руководство");
  const tail = `${chapter("")}\n${block}`.replace(/\n$/, "");
  if ((apply(tail, null).match(/pairs:begin/g) || []).length) errs.push("самопроверка: блок в конце файла без перевода строки не снимается");
  if ((apply(tail, block).match(/pairs:begin/g) || []).length !== 1) errs.push("самопроверка: блок в конце файла удваивается");
  try {
    apply(once.replace(END, ""), block);
    errs.push("самопроверка: метка без пары не замечена");
  } catch (e) {
    /* ожидаемо */
  }
  return errs;
}

function main() {
  const errs = selfTest();
  if (errs.length) {
    console.error(errs.map((e) => "❌ " + e).join("\n"));
    process.exit(1);
  }
  const pairs = require("../assets/pairs.js");
  const titles = titlesOf(fs.readFileSync(PROGRESS, "utf8"));
  const texts = loadChapters();
  const bad = validate(pairs, titles, texts);
  if (bad.length) {
    console.error(bad.map((e) => "❌ assets/pairs.js: " + e).join("\n"));
    process.exit(1);
  }
  const out = generate(pairs, titles, texts);
  const withBlock = [...out.values()].filter((o) => o.want.includes(BEGIN)).length;
  if (!out.get(GUIDE) || !out.get(GUIDE).want.includes(GUIDE_BEGIN)) {
    console.error(`❌ src/${GUIDE}.md: таблица пар не вписана`);
    process.exit(1);
  }
  const stale = [...out].filter(([, o]) => o.disk !== o.want).map(([s]) => `src/${s}.md`);
  if (process.argv.includes("--check")) {
    if (stale.length) {
      console.error(`❌ блоки пар расходятся с assets/pairs.js: ${stale.join(", ")} — запусти node scripts/gen-pairs.js`);
      process.exit(1);
    }
    console.log(`✅ gen-pairs: блоки пар совпадают с assets/pairs.js (рядов ${pairs.length}, глав с блоком ${withBlock}, таблица в руководстве), самопроверка зелёная`);
    return;
  }
  for (const [slug, o] of out) {
    if (o.disk !== o.want) fs.writeFileSync(path.join(SRC, `${slug}.md`), o.want);
  }
  console.log(`gen-pairs: рядов ${pairs.length}, глав с блоком ${withBlock}, переписано ${stale.length}`);
}

if (require.main === module) main();
module.exports = { LINK_TARGET, href, BEGIN, GUIDE_BEGIN, END, GUIDE, GUIDE_HEADING, GUIDE_LINK, titlesOf, validate, blockFor, guideBlock, apply, generate, selfTest };
