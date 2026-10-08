#!/usr/bin/env node
// Headless smoke режима «🎯 Предсказывать» пошаговых виджетов (assets/algo-viz.js).
//
//   node scripts/predict-check.js
//
// Что проверяется (и почему):
//   1) выключенный режим ничего не меняет — «›» листает, вопросов нет;
//   2) включённый режим на развилке НЕ листает по «›» / «→», пока не ответишь, — иначе
//      вопрос можно проскочить, не подумав, и режим превращается в декорацию;
//   3) ответ листает на шаг развилки и помечает его «Верно» / «Не угадал»; счёт «k/n»
//      совпадает с числом ответов, промах пишется в algoVizMissed (оттуда srs.js
//      заводит карточку viz:<тип>);
//   4) верный ответ — это правда о следующем шаге: «Да» верен ровно тогда, когда шаг
//      после развилки попал в тело блока — сверяется по подсвеченной строке кода;
//   5) у виджета без развилок кнопка 🎯 выключена, а не молча бесполезна;
//   6) автопроигрывание останавливается на вопросе, а не пролетает мимо;
//   7) ключи всех виджетов книги — на входах глав и на всех пресетах. Что именно держится:
//      • ключ «да» выводится по вхождению следующего шага в тело блока — это надёжно
//        (вошли в тело — условие истинно); движок считает по парной скобке, проверка —
//        независимо, по отступам листинга;
//      • ключ «нет» по следующему шагу НЕНАДЁЖЕН: шаг вне тела бывает и при ложном
//        условии, и при истинном с телом без кадров (вложенный цикл без итераций,
//        `continue`, `return`). Поэтому «нет» считается подтверждённым, только если его
//        вычислил оракул по чипам шага или генератор назвал исход сам (s.branch);
//      • где оракул вычислил условие, ключ обязан с ним совпасть — и «да», и «нет»;
//      • остальные «нет» записаны поимённо в scripts/predict-unconfirmed.json (тип, вход,
//        шаг, строка) — это список прочитанных по тексту шага: 218 на входах глав прочитаны
//        на ревью; 153 на пресетах — в задаче, по коду генератора лишь там, где текст не
//        называет чисел, и 132 из них сверены на ревью по коду генератора. Нового «нет» без
//        записи быть не может, лишней записи — тоже;
//   8) виджет входа в цикл печатает a, b и L — глава называет их «длинами из
//      доказательства». b — сколько узлов slow прошёл по кольцу до встречи (0 ≤ b ≤ L):
//      при цикле с головы это полный круг, b = L, а счёт по модулю L давал b = 0. Сверяются
//      оба места с числами (строка шага и подпись под рисунком) на примере главы и на
//      каждом пресете. Проверка живёт здесь, а не в отдельном скрипте, потому что этот
//      смоук уже строит виджеты настоящим движком и стоит в CI;
//   9) свой ввод читателя (не пример главы и не пресет): ключи там никто не читал, поэтому
//      выведенное «нет» не спрашивается вовсе; «да» и явный исход — как обычно. Если свой ввод
//      убрал ВСЕ вопросы, кнопка 🎯 выключена, а её подсказка говорит об этом («На своём вводе
//      вопросов 🎯 нет»), а не «развилок на шагах нет» — так отвечает виджет без развилок вовсе.
//
//   node scripts/predict-check.js --report   # напечатать текущий список неподтверждённых
//                                            # «нет» в формате predict-unconfirmed.json
// Если jsdom не найден — мягкий пропуск (exit 0), как в остальных смоуках.
"use strict";
const fs = require("fs");
const path = require("path");

let JSDOM, VirtualConsole;
try {
  ({ JSDOM, VirtualConsole } = require("jsdom"));
} catch (e) {
  console.log("⏭  predict-check: jsdom не установлен — пропускаю (npm i jsdom).");
  process.exit(0);
}

const root = path.resolve(__dirname, "..");
const js = fs.readFileSync(path.join(root, "assets", "algo-viz.js"), "utf8");
const { infraScriptTags } = require("./lib/infra-files.js");
const tagOf = (file, type) => {
  const t = fs.readFileSync(path.join(root, "src", file), "utf8");
  const m = t.match(new RegExp(`<div class="algo-viz" data-viz="${type}"[^>]*></div>`));
  if (!m) throw new Error(`в ${file} нет виджета ${type}`);
  return m[0];
};

// все виджеты входа в цикл из главы (в том числе вкладки: у них data-tab стоит перед data-viz)
const cycTags = [...fs.readFileSync(path.join(root, "src", "fast-slow-pointers.md"), "utf8").matchAll(/<div class="algo-viz"[^>]*><\/div>/g)]
  .map((m) => m[0]).filter((t) => t.includes('data-viz="list-cycle-entry"'));
if (!cycTags.length) throw new Error("в fast-slow-pointers.md нет виджета list-cycle-entry");
// Вход не из главы: хвост кратен длине кольца (a = 3, L = 3). slow входит в кольцо и сразу
// встречает fast на входе — по кольцу он не шёл, b = 0. Только этот случай отличает счётчик
// шагов от правила «встреча на входе → b = L».
cycTags.push('<div class="algo-viz" data-viz="list-cycle-entry" data-list="1,2,3,4,5,6" data-cycle="3"></div>');

const errors = [];
const vc = new VirtualConsole();
vc.on("jsdomError", (e) => errors.push("jsdomError: " + (e && e.message)));

const dom = new JSDOM(
  `<!DOCTYPE html><html><body>
     ${tagOf("sliding-window.md", "sliding-window-fixed").replace("<div ", '<div id="win" ')}
     ${tagOf("monotonic-stack.md", "monotonic-stack").replace("<div ", '<div id="stk" ')}
     ${cycTags.map((t, i) => t.replace("<div ", `<div id="cyc${i}" `)).join("\n")}
     ${tagOf("sliding-window.md", "sliding-window-fixed").replace("<div ", '<div id="own1" ')}
     ${tagOf("string-algorithms.md", "string-match-naive").replace("<div ", '<div id="own2" ')}
     ${tagOf("union-find-structure.md", "union-find-find").replace("<div ", '<div id="own3" ')}
     ${tagOf("monotonic-stack.md", "monotonic-stack").replace("<div ", '<div id="own4" ')}
     <script>${js}</script>${infraScriptTags(root)}
   </body></html>`,
  { runScripts: "dangerously", virtualConsole: vc, pretendToBeVisual: true, url: "http://localhost:3000/sliding-window.html" }
);
const w = dom.window, doc = w.document;
const fails = [];
const expect = (ok, msg) => { if (!ok) fails.push(msg); };

const win = () => doc.getElementById("win");
const counter = (el) => +((el.querySelector(".algo-viz__counter").textContent.match(/(\d+)\s*\//) || [])[1]);
const activeLine = (el) => [...el.querySelectorAll(".algo-tp__codeline")].findIndex((x) => x.classList.contains("algo-tp__codeline--active"));
const click = (el) => el.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
const key = (el, k) => el.dispatchEvent(new w.KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));
const next = (el) => click(el.querySelector(".algo-tp__nextbtn"));
const pending = (el) => el.querySelector(".algo-tp__pred");

// Независимый от движка признак «шаг M внутри тела блока строки L» — отступы: тело —
// строки с отступом глубже заголовка. Движок считает по парной скобке; способы обязаны сойтись.
const indentOf = (s) => s.match(/^\s*/)[0].length;
function insideByIndent(code, L, M) {
  if (M <= L) return false;
  for (let j = L + 1; j <= M; j++) if (code[j].trim() !== "" && indentOf(code[j]) <= indentOf(code[L])) return false;
  return true;
}

// Оракул: истинность условия развилки по ЧИПАМ шага (снимок шага — состояние после строки
// заголовка, чипы — то, что читатель видит в момент вопроса). Умеет только то, в чём нельзя
// ошибиться: сравнения < <= == != >= >, где операнд — имя чипа, целое или «чип ± целое»,
// их отрицание !( … ), булев чип и !чип, цепочки && / || без скобок. Остальное — null:
// «не знаю», а не догадка.
function condOf(line) {
  const t = String(line).replace(/\/\/.*$/, "").trim();
  let m = t.match(/^(?:\}\s*else\s+)?if\s+(.+?)\s*\{$/);
  if (m) return m[1].split(";").pop().trim(); // if v := f(); cond {
  m = t.match(/^for\s+(.*?)\s*\{$/);
  if (!m || !m[1] || /\brange\b/.test(m[1])) return null;
  const parts = m[1].split(";");
  return parts.length === 3 ? parts[1].trim() : parts.length === 1 ? parts[0].trim() : null;
}
const squash = (s) => String(s).replace(/\s+/g, "").replace(/−/g, "-");
const chipOf = (tx, chips) => { const k = Object.keys(chips).find((n) => squash(n) === squash(tx)); return k == null ? null : squash(chips[k]); };
function intOf(tx, chips) {
  const t = squash(tx);
  if (/^-?\d+$/.test(t)) return +t;
  const v = chipOf(t, chips);
  if (v != null) return /^-?\d+$/.test(v) ? +v : null;
  const m = t.match(/^(.+)([+-])(\d+)$/); // dp[a-c]+1, i-1
  if (!m) return null;
  const a = intOf(m[1], chips);
  return a == null ? null : m[2] === "+" ? a + +m[3] : a - +m[3];
}
function truthOf(cond, chips) {
  let t = cond.trim(), neg = false;
  const par = t.match(/^!\s*\((.*)\)$/);
  if (par) { neg = true; t = par[1].trim(); }
  if (/&&|\|\|/.test(t)) return null;
  const m = t.match(/^(.+?)\s*(<=|>=|==|!=|<|>)\s*(.+)$/);
  let r = null;
  if (m) {
    const a = intOf(m[1], chips), b = intOf(m[3], chips);
    if (a != null && b != null) r = { "<": a < b, "<=": a <= b, ">": a > b, ">=": a >= b, "==": a === b, "!=": a !== b }[m[2]];
  } else {
    const bm = t.match(/^(!?)\s*(.+)$/), v = chipOf(bm[2], chips);
    if (v === "true" || v === "false") r = (v === "true") !== !!bm[1];
  }
  return r == null ? null : r !== neg;
}
function oracle(line, chips) {
  const c = condOf(line);
  if (c == null) return null;
  if (!/&&|\|\|/.test(c) || /[()]/.test(c)) return truthOf(c, chips);
  // a && b || c: «и» ложно, если ложен хоть один член, истинно — если истинны все
  const ors = c.split("||").map((part) => {
    const vs = part.split("&&").map((x) => truthOf(x, chips));
    return vs.includes(false) ? false : vs.every((v) => v === true) ? true : null;
  });
  return ors.includes(true) ? true : ors.every((v) => v === false) ? false : null;
}
// Чип врёт о состоянии после строки — известное и записанное отдельно расхождение, не ключ:
// у heap-build кадр выхода из `for i := …; i >= 0; i--` показывает i до декремента (i = 0).
const STALE_CHIP = new Set(["heap-build|3"]);
// «Нет», выведенное по следующему шагу и не подтверждённое ни оракулом, ни явным исходом
// генератора (s.branch): шаг вне тела бывает и при ложном условии, и при истинном с телом
// без кадров. Каждый такой вопрос записан поимённо в predict-unconfirmed.json — это список
// ПРОЧИТАННЫХ ключей (по тексту шага: 218 на входах глав прочитаны на ревью; 153 на пресетах —
// в задаче, по коду генератора лишь там, где текст не называет чисел, и 132 из них сверены на
// ревью по коду генератора), а не разрешение не читать. Храповик, как у viz-names-allow.json: неподтверждённого «нет» нет в списке —
// ошибка (назови исход в генераторе или прочитай шаг и внеси запись); запись больше не
// встречается — тоже ошибка, пока её не уберут. Список может только сокращаться.
const UNCONFIRMED_PATH = path.join(__dirname, "predict-unconfirmed.json");
const REPORT = process.argv.includes("--report");
const unconfirmed = fs.existsSync(UNCONFIRMED_PATH) ? JSON.parse(fs.readFileSync(UNCONFIRMED_PATH, "utf8")) : {};
// Вход прогона: у главы — файл и атрибуты виджета (в главе бывает несколько виджетов типа),
// у пресета — его название (пресет задаёт все поля типа, глава на него не влияет).
const inputOf = (t, label) => label ? `пресет «${label}»`
  : `глава ${t.f} (${[...t.tag.matchAll(/\bdata-([a-z-]+)="([^"]*)"/g)].filter((m) => m[1] !== "viz" && m[1] !== "tab").map((m) => `${m[1]}=${m[2]}`).join("; ")})`;

// 7) ключи ВСЕХ виджетов книги на входах глав и на всех пресетах (пресет — на тип, поэтому
// гоняется у первого виджета типа). Движок отдаёт вопросы, строки шагов и чипы
// (root.__algoPredict). Три сверки: выведенный ключ — с отступами листинга; любой ключ —
// с оракулом там, где оракул вычислил условие; явное «нет» — не при шаге внутри тела.
async function keyAudit() {
  const tags = [];
  for (const f of fs.readdirSync(path.join(root, "src")).filter((n) => n.endsWith(".md")).sort()) {
    for (const m of fs.readFileSync(path.join(root, "src", f), "utf8").matchAll(/<div class="algo-viz"[^>]*><\/div>/g)) tags.push({ f, tag: m[0], type: m[0].match(/data-viz="([^"]+)"/)[1] });
  }
  const bad = [], cover = {}, loose = {};
  ["главы", "пресеты"].forEach((s) => { cover[s] = { runs: 0, all: 0, yes: 0, yesSaid: 0, yesOracle: 0, noOracle: 0, noSaid: 0, noLoose: 0 }; });
  function audit(scope, t, label, node) {
    const p = node.__algoPredict, c = cover[scope], where = `${t.f}: ${t.type}${label ? `, пресет «${label}»` : ""}`;
    if (!p) { bad.push(`${where} — движок не отдал __algoPredict`); return; }
    c.runs++;
    for (const k of Object.keys(p.qs)) {
      const q = p.qs[k], next = p.lines[+k + 1], code = p.code[q.line].trim(), key = q.entered ? "да" : "нет";
      const at = `${where}, шаг ${+k + 1}, строка ${q.line + 1} «${code}»`, inside = insideByIndent(p.code, q.line, next);
      if (!q.said && q.entered !== inside) bad.push(`${at} — ключ «${key}», а следующий шаг (строка ${next + 1}) ${inside ? "внутри" : "вне"} тела`);
      if (q.said && !q.entered && inside) bad.push(`${at} — генератор назвал исход «нет», а следующий шаг (строка ${next + 1}) внутри тела`);
      const chips = p.chips(+k), o = STALE_CHIP.has(`${t.type}|${q.line + 1}`) ? null : oracle(p.code[q.line], chips);
      if (o != null && o !== q.entered) bad.push(`${at} — ключ «${key}», а по чипам ${JSON.stringify(chips)} условие ${o ? "истинно" : "ложно"}`);
      c.all++;
      if (q.entered) { c.yes++; if (q.said) c.yesSaid++; if (o === true) c.yesOracle++; }
      else if (o === false) c.noOracle++;
      else if (q.said) c.noSaid++;
      else { c.noLoose++; (loose[t.type] = loose[t.type] || []).push({ input: inputOf(t, label), preset: !!label, step: +k + 1, text: `шаг ${+k + 1}, строка ${q.line + 1}: ${code}` }); }
    }
  }
  // Страницами по PAGE виджетов: в jsdom сборка и перезапуск виджета дорожают вместе с
  // размером документа (все 198 на одной странице — ~30 с сборки и ~0,3 с на каждый пресет,
  // по 24 — секунды на всё).
  const seen = new Set(), PAGE = 24;
  let presetTypes = 0;
  for (let from = 0; from < tags.length; from += PAGE) {
    const page = tags.slice(from, from + PAGE);
    const d = new JSDOM(`<!DOCTYPE html><html><body>${page.map((t, i) => t.tag.replace("<div ", `<div id="k${i}" `)).join("\n")}<script>${js}</script>${infraScriptTags(root)}</body></html>`, {
      runScripts: "dangerously", virtualConsole: vc, pretendToBeVisual: true, url: "http://localhost:3000/x.html",
    });
    const el = (i) => d.window.document.getElementById("k" + i);
    for (let t0 = Date.now(); page.some((_, i) => !el(i).classList.contains("algo-viz--ready")) && Date.now() - t0 < 60000;) await new Promise((r) => setTimeout(r, 20));
    page.forEach((t, i) => {
      audit("главы", t, "", el(i));
      if (seen.has(t.type)) return;
      seen.add(t.type);
      const n = el(i).querySelectorAll(".algo-tp__preset").length; // первая кнопка — «пример главы»
      if (n > 1) presetTypes++;
      for (let p = 1; p < n; p++) {
        const btn = el(i).querySelectorAll(".algo-tp__preset")[p], label = btn.textContent;
        btn.dispatchEvent(new d.window.MouseEvent("click", { bubbles: true })); // пресет перестраивает виджет на том же узле
        audit("пресеты", t, label, el(i));
      }
    });
    d.window.close();
  }
  // список как он есть сейчас: по типам; внутри — входы глав, потом пресеты, по номеру шага
  const now = {};
  Object.keys(loose).sort().forEach((type) => {
    const rows = loose[type].sort((a, b) => a.preset - b.preset || a.input.localeCompare(b.input) || a.step - b.step);
    now[type] = [...new Set(rows.map((r) => `${r.input} — ${r.text}`))];
  });
  const listedCount = Object.values(unconfirmed).reduce((a, b) => a + b.length, 0);
  if (!REPORT) {
    for (const type of Object.keys(now)) {
      const ok = new Set(unconfirmed[type] || []);
      now[type].filter((e) => !ok.has(e)).forEach((e) => bad.push(`${type}: «${e}» — ключ «нет» выведен по следующему шагу и ничем не подтверждён. Назови исход в генераторе (s.branch) или прочитай шаг и внеси запись в scripts/predict-unconfirmed.json`));
    }
    for (const [type, list] of Object.entries(unconfirmed)) {
      const have = new Set(now[type] || []);
      list.filter((e) => !have.has(e)).forEach((e) => bad.push(`${type}: «${e}» больше не встречается (ключ подтверждён или вопрос исчез) — убери из scripts/predict-unconfirmed.json`));
    }
  }
  return { bad, cover, widgets: tags.length, presetTypes, list: now, listedCount };
}

// 8) вход в цикл: эталон — свой прогон Флойда со счётчиком шагов slow. До встречи slow
// делает t шагов, из них a — по хвосту, значит по кольцу он прошёл b = t − a.
function floydLengths(list, c) {
  const n = list.length;
  if (!(c >= 0 && c < n)) return null;
  const nx = (i) => (i === n - 1 ? c : i + 1);
  let slow = 0, fast = 0, t = 0;
  do { slow = nx(slow); fast = nx(nx(fast)); t++; } while (slow !== fast);
  return { a: c, b: t - c, L: n - c };
}
function cycleEntryMismatches() {
  const bad = new Set(), kinds = new Set(); let runs = 0;
  cycTags.forEach((_, i) => {
    const at = () => doc.getElementById("cyc" + i);
    const presets = at().querySelectorAll(".algo-tp__preset").length; // первая кнопка — «пример главы»
    if (presets < 2) bad.add(`виджет ${i + 1}: кнопок граничных случаев ${presets} — пресеты не проверены`);
    for (let p = 0; p < presets; p++) {
      const btn = at().querySelectorAll(".algo-tp__preset")[p], label = btn.textContent;
      click(btn); // пресет перестраивает виджет на том же узле
      const el = at(), list = el.getAttribute("data-list").split(",").filter((x) => x.trim() !== "");
      const cyc = parseInt(el.getAttribute("data-cycle"), 10), want = floydLengths(list, cyc), name = `виджет ${i + 1}, «${label}» [${list.join(",")} | цикл с ${cyc}]`;
      if (want && !(want.b >= 0 && want.b <= want.L && (want.a + want.b) % want.L === 0)) bad.add(`${name}: эталон сломан — a = ${want.a}, b = ${want.b}, L = ${want.L}`);
      if (want) kinds.add(want.b === want.L ? "полный круг" : want.b === 0 ? "встреча на входе без круга" : "встреча внутри кольца");
      const total = +el.querySelector(".algo-viz__counter").textContent.match(/\/\s*(\d+)/)[1];
      const seen = { "строка шага": 0, "подпись под рисунком": 0 };
      for (let k = 1; ; k++) {
        [["строка шага", ".algo-tp__stattext"], ["подпись под рисунком", ".algo-tp__rhonote"]].forEach(([where, sel]) => {
          const m = ((el.querySelector(sel) || {}).textContent || "").match(/\ba = (\d+).*?\bb = (\d+).*?\bL = (\d+)/);
          if (!m) return;
          seen[where]++;
          if (!want) bad.add(`${name}, ${where}: цикла нет, а числа a, b, L напечатаны`);
          else if (+m[1] !== want.a || +m[2] !== want.b || +m[3] !== want.L) bad.add(`${name}, ${where}: a = ${m[1]}, b = ${m[2]}, L = ${m[3]} — а slow прошёл по кольцу ${want.b} из ${want.L} (a = ${want.a})`);
        });
        if (k >= total) break;
        next(el);
      }
      if (want) Object.keys(seen).forEach((where) => { if (!seen[where]) bad.add(`${name}, ${where}: числа a, b, L не напечатаны ни на одном шаге`); });
      runs++;
    }
  });
  // три разных исхода обязаны встретиться: иначе проверка не отличит счётчик от формулы
  ["полный круг", "встреча на входе без круга", "встреча внутри кольца"].forEach((kind) => { if (!kinds.has(kind)) bad.add(`ни на одном входе нет случая «${kind}»`); });
  return { bad: [...bad], runs };
}

// 9) свой ввод читателя. Виджет own1 (окно фиксированного размера) — выведенные «нет»: на входе
// главы и на пресете они спрашиваются, на своём вводе — нет, а «да» остаются. Виджет own2
// (наивный поиск подстроки) — явное «нет» генератора: на своём вводе оно спрашивается.
function ownInputMismatches() {
  const bad = [];
  const kinds = (id) => {
    const p = doc.getElementById(id).__algoPredict, qs = Object.values(p.qs);
    return { own: p.own, yes: qs.filter((q) => q.entered).length, noSaid: qs.filter((q) => !q.entered && q.said).length, noGuess: qs.filter((q) => !q.entered && !q.said).length };
  };
  const type = (id, values) => { // как читатель: вписал в поля и нажал «⟲ Запустить»
    const el = doc.getElementById(id), inputs = el.querySelectorAll(".algo-tp__input");
    if (inputs.length !== values.length) { bad.push(`${id}: полей ввода ${inputs.length}, а значений ${values.length}`); return; }
    inputs.forEach((inp, i) => { inp.value = values[i]; });
    click(el.querySelector(".algo-tp__run"));
  };
  const show = (k) => `own=${k.own}, «да» ${k.yes}, выведенных «нет» ${k.noGuess}, явных «нет» ${k.noSaid}`;
  const orig = [...doc.getElementById("own1").querySelectorAll(".algo-tp__input")].map((inp) => inp.value);
  let k = kinds("own1");
  if (k.own || !k.noGuess) bad.push(`вход главы: ${show(k)} — выведенные «нет» здесь прочитаны и должны спрашиваться`);
  click(doc.getElementById("own1").querySelectorAll(".algo-tp__preset")[1]);
  k = kinds("own1");
  if (k.own || !k.noGuess) bad.push(`пресет: ${show(k)} — выведенные «нет» здесь прочитаны и должны спрашиваться`);
  type("own1", ["5,1,2,9,3,7", "2"]);
  k = kinds("own1");
  if (!k.own || k.noGuess || !k.yes) bad.push(`свой ввод: ${show(k)} — выведенное «нет» не должно спрашиваться, «да» — должно`);
  type("own1", orig);
  k = kinds("own1");
  if (k.own || !k.noGuess) bad.push(`вернули вход главы вручную: ${show(k)} — это снова не «свой ввод»`);
  type("own2", ["abcabd", "abd"]);
  k = kinds("own2");
  if (!k.own || !k.noSaid || k.noGuess) bad.push(`свой ввод, явный исход: ${show(k)} — «нет», названное генератором, должно спрашиваться и на своём вводе`);
  // Подсказка выключенной кнопки 🎯 различает два случая: развилок у виджета нет вовсе и
  // «свой ввод убрал все вопросы». Оба раза кнопка выключена, но «развилок нет» во втором
  // случае неправда: на примере главы они есть (own3), а на стеке (own4) их нет нигде.
  const off = (id) => { const b = doc.getElementById(id).querySelector(".algo-tp__predbtn"); return { off: b.disabled, text: b.title }; };
  let h = off("own3");
  if (h.off) bad.push("подсказка: на примере главы у union-find-find кнопка 🎯 выключена — проверка потеряла смысл");
  type("own3", ["0,1,2,3,4", "0"]); // все узлы — корни: ни «да», ни явного «нет», остаются одни выведенные «нет»
  k = kinds("own3");
  h = off("own3");
  if (!k.own || k.yes || k.noSaid || k.noGuess || !h.off) bad.push(`свой ввод убрал все вопросы: ${show(k)}, кнопка ${h.off ? "выключена" : "включена"} — проверка рассчитана на ввод без вопросов`);
  else if (/развилок на шагах нет/.test(h.text)) bad.push(`подсказка выключенной кнопки на своём вводе, где вопросы ушли: «${h.text}» — развилки у виджета есть, не должно быть «развилок на шагах нет»`);
  else if (!/На своём вводе вопросов 🎯 нет/.test(h.text)) bad.push(`подсказка выключенной кнопки на своём вводе, где вопросы ушли, не объясняет причину: «${h.text}»`);
  type("own4", ["5,1,4,2,9"]);
  k = kinds("own4");
  h = off("own4");
  if (!k.own || !h.off) bad.push(`стек на своём вводе: own=${k.own}, кнопка ${h.off ? "выключена" : "включена"} — должна быть выключена`);
  else if (!/развилок на шагах нет/.test(h.text) || /своём вводе/.test(h.text)) bad.push(`подсказка выключенной кнопки у виджета без развилок: «${h.text}» — должна говорить «развилок на шагах нет» и не упоминать свой ввод`);
  return bad;
}

setTimeout(async () => {
  const keys = await keyAudit();
  if (REPORT) { console.log(JSON.stringify(keys.list, null, 1)); process.exit(0); }
  keys.bad.forEach((b) => fails.push("ключ: " + b));
  expect(keys.cover["главы"].all > 0 && keys.cover["пресеты"].all > 0, "ключи: на входах глав или на пресетах не нашлось ни одного вопроса 🎯 — сверка пуста");
  const coverage = Object.keys(keys.cover).map((s) => {
    const c = keys.cover[s];
    return `${s} — ${c.all} вопросов в ${c.runs} прогонах: «да» ${c.yes} (из них по явному исходу ${c.yesSaid}, остальные — по вхождению в тело; по чипам совпало ${c.yesOracle}), «нет» по чипам ${c.noOracle}, «нет» по явному исходу ${c.noSaid}, «нет» по списку прочитанных ${c.noLoose}`;
  }).join("; ");

  // до включения режима: с 🎯 «›» вставал бы на вопросах
  const cyc = cycleEntryMismatches();
  cyc.bad.forEach((b) => fails.push("вход в цикл: " + b));
  ownInputMismatches().forEach((b) => fails.push("свой ввод: " + b));

  const el = win();
  const total = +el.querySelector(".algo-viz__counter").textContent.match(/\/\s*(\d+)/)[1];

  // 1) режим выключен — обычное листание
  let c0 = counter(el);
  for (let i = 0; i < 6; i++) next(el);
  expect(counter(el) === c0 + 6, `режим выключен, а «›» пролистал ${counter(el) - c0} шагов из 6`);
  expect(!pending(el), "режим выключен, а вопрос появился");

  // 5) у стека развилок на шагах нет — кнопка выключена
  const stkBtn = doc.getElementById("stk").querySelector(".algo-tp__predbtn");
  expect(stkBtn && stkBtn.disabled, "у виджета без развилок кнопка 🎯 не выключена");

  // включаем режим и начинаем сначала
  click(el.querySelector(".algo-tp__predbtn"));
  expect(w.localStorage.getItem("algoVizPredict") === "1", "включённый режим не запомнился в localStorage");
  key(el, "Home");

  // промах заводит карточку сразу: движок повторений (srs.js) зовут без перехода на другую страницу
  let synced = 0;
  w.ALGO_SRS = { sync: () => { synced++; } };

  // 2)–4) проходим весь прогон, на каждый вопрос отвечая «Да»
  let asked = 0, right = 0, wrong = 0, guard = 0;
  while (counter(el) < total && guard++ < 400) {
    next(el);
    if (!pending(el)) continue;
    asked++;
    const before = counter(el);
    next(el); key(el, "ArrowRight");
    expect(counter(el) === before && pending(el), `на вопросе «›» / «→» пролистали шаг (${before} → ${counter(el)})`);
    const qLine = +pending(el).querySelector(".algo-tp__curlineno").textContent - 1;
    click(pending(el).querySelector(".algo-tp__predans")); // «Да»
    expect(!pending(el), "после ответа вопрос не закрылся");
    expect(counter(el) === before + 1, `ответ должен показать шаг развилки: было ${before}, стало ${counter(el)}`);
    const v = el.querySelector(".algo-tp__predv");
    expect(!!v, "после ответа нет пометки «Верно / Не угадал»");
    if (!v) continue;
    const ok = v.classList.contains("algo-tp__predv--ok");
    if (ok) right++; else wrong++;
    // правда о развилке — по следующему шагу: вошли ли в тело блока
    expect(activeLine(el) === qLine, `шаг развилки подсвечивает строку ${activeLine(el) + 1}, а спрашивали про ${qLine + 1}`);
    next(el); // следующий шаг (если он сам вопрос — это следующая итерация цикла)
    if (pending(el)) { // шаг L+1 тоже развилка: правда видна на нём — подсветку сверим после ответа
      continue;
    }
    const entered = insideByIndent(el.__algoPredict.code, qLine, activeLine(el));
    expect(ok === entered, `«Да» на строке ${qLine + 1} помечено ${ok ? "верным" : "неверным"}, а выполнение ${entered ? "вошло" : "не вошло"} в тело`);
  }
  expect(asked >= 3, `в окне фиксированного размера ожидалось хотя бы 3 вопроса, задано ${asked}`);
  expect(right > 0 && wrong > 0, `ответы «Да» должны быть и верными, и неверными (цикл когда-то кончается): верно ${right}, нет ${wrong}`);
  const score = el.querySelector(".algo-tp__predscore").textContent;
  expect(score === `${right}/${right + wrong}`, `счёт «${score}», а ответов ${right}/${right + wrong}`);
  const miss = JSON.parse(w.localStorage.getItem("algoVizMissed") || "{}")["sliding-window-fixed"];
  expect(miss && miss.n === wrong && miss.line > 0 && miss.code && miss.page === "sliding-window.html",
    `промахи не записаны как надо: ${JSON.stringify(miss)} при ${wrong} промахах`);
  expect(synced === wrong, `ALGO_SRS.sync вызван ${synced} раз(а) при ${wrong} промахах — счётчик «Сегодня» не узнает о промахе до перехода`);

  // 6) автопроигрывание на 4× останавливается на первом вопросе
  key(el, "Home");
  const sel = el.querySelector(".algo-tp__speedsel");
  sel.value = "100"; sel.dispatchEvent(new w.Event("change"));
  click(el.querySelector(".algo-tp__playbtn"));
  const t0 = Date.now();
  while (!pending(el) && Date.now() - t0 < 20000) await new Promise((r) => setTimeout(r, 100));
  expect(!!pending(el), "автопроигрывание не остановилось на вопросе за 20 с");
  const stopped = counter(el);
  await new Promise((r) => setTimeout(r, 1500));
  expect(counter(el) === stopped, "автопроигрывание продолжило листать при открытом вопросе");

  // выключенный режим снова не спрашивает
  click(el.querySelector(".algo-tp__predbtn"));
  expect(!pending(el), "выключение режима не закрыло вопрос");

  if (errors.length) fails.push(...errors.slice(0, 5));
  if (fails.length) {
    console.error("❌ predict-check:\n  - " + fails.join("\n  - "));
    process.exit(1);
  }
  console.log(`✅ predict-check: без режима листается как раньше; с 🎯 на развилках «›» ждёт ответа, ответ сверяется со следующим шагом (${asked} вопросов: ${right} верно, ${wrong} промахов записано), счёт и промахи сходятся, автопроигрывание встаёт на вопросе, у виджета без развилок кнопка выключена; a, b, L входа в цикл сошлись со своим прогоном Флойда на ${cyc.runs} входах.\n   Ключи (${keys.widgets} виджетов глав; пресеты ${keys.presetTypes} типов): ${coverage}. Выведенные ключи сошлись с отступами листинга, вычислимые по чипам — с оракулом; каждое «нет» без оракула и без явного исхода стоит в predict-unconfirmed.json (${keys.listedCount} записей, лишних и недостающих нет). На своём вводе читателя выведенное «нет» не спрашивается.`);
  process.exit(0);
}, 400);
