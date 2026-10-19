#!/usr/bin/env node
// Замер «холостых кадров» пошаговых виджетов глав ядра (jsdom): доля переходов, на которых
// холст не изменился. Читатель жмёт «›», а рисунок стоит — меняется только строка шага или
// чип; на таких кадрах приём не виден, его надо вычитать из текста. Этап 4 сокращает их у
// типов из scripts/viz-idle-budget.json, а потолок держит, чтобы доля не поползла обратно.
//
//   node scripts/viz-idle.js                       # таблица: каждый виджет глав ядра + итог
//   node scripts/viz-idle.js --type a,b            # только виджеты этих типов
//   node scripts/viz-idle.js --json                # то же JSON-массивом
//   node scripts/viz-idle.js --check               # сверка с потолком viz-idle-budget.json (CI)
//
// Порядок — маршрут (главы lvl "core" в порядке GROUPS из assets/progress.js), внутри главы —
// порядок виджетов на странице (неактивные вкладки тоже: виджет строится отдельно, без обёртки).
// Строка: «глава:N тип шагов холст∅ всё∅ доля%», N — номер виджета на странице с 1, доля — холст∅
// от числа переходов (шагов − 1).
//
// ОПРЕДЕЛЕНИЯ.
//   Переход i → i+1 — нажатие «›» (ArrowRight на корне виджета) с шага i.
//   Холостой по холсту (холст∅) — подпись холста шага i+1 совпала с подписью шага i.
//   Холостой целиком (всё∅) — совпали и подпись холста, и чипы переменных (.algo-tp__vchips:
//   имена и значения, без класса «изменился»).
//   Подпись холста — outerHTML клона панели визуализации (.algo-tp__panel, прямой ребёнок
//   корня в компактной раскладке, compactLayout в algo-viz.js) после чистки:
//     • убраны узлы, которые не рисуют состояние шага: заголовок панели (.algo-tp__panelhdr),
//       примечание (.algo-tp__note), легенда (.algo-tp__legend) — они постоянны; «призраки»
//       переноса (.algo-nn__ghost) — анимация;
//     • на всякий случай убраны и узлы вне холста, если какой-то тип вложит их в панель:
//       строка шага (.algo-tp__status), копия строки (.algo-tp__curline), чипы (.algo-tp__vchips),
//       ряд управления (.algo-tp__ctrl), листинг (.algo-tp__code), ввод (.algo-tp__card);
//     • сняты классы анимации: algo-nn__track--still (плашки без перехода), algo-nn__cell--move,
//       algo-nn__cell--land (полёт и вспышка значения);
//     • из style вычищены transition, animation, z-index, will-change и min-width (ширина SVG под
//       телефон, ставится один раз после первой отрисовки); стиль переписан одной записью CSSOM,
//       пустой удалён; у слоя стрелок ДП (.algo-tp__dparrows) сняты width/height/viewBox — размер
//       таблицы, а не шаг;
//     • классы узла отсортированы: lo+mid и mid+lo — одна и та же ячейка;
//     • невидимый узел (hidden, display:none, visibility:hidden, классы HIDING_CLASSES — их CSS
//       прячет узел) сведён к пустому <… data-hidden>: его координаты, текст и классы остались от
//       прошлого показа и зависят от того, с какого шага пришли.
//   Последние три пункта найдены сверкой «кадр k, пришли вперёд» против «кадр k, пришли назад (←)»:
//   без них у 51 виджета ядра из 76 подпись зависела от направления. Эта сверка — часть прогона:
//   подпись, зависящая от пути, — красный с типом и номером кадра.
//   Остаётся всё, что рисует состояние: значения и классы ячеек, узлы, рёбра, рамки, зоны,
//   дуги, панели структур и ПОЛОЖЕНИЕ плашек. Положение плашки — её transform: движок ставит
//   «translate(calc(Xpx - 50%), …)» по offsetLeft целевой ячейки. В jsdom раскладки нет, поэтому
//   offsetLeft/offsetTop здесь заданы детерминированно (layoutStub ниже): у разных ячеек они
//   разные, у одной и той же — одинаковые. Отсюда: плашка переехала на другую ячейку — холст
//   изменился; «сдвиг на 0 px» (плашка осталась) — нет. Сменилась только подсвеченная строка
//   кода или чип — переход холостой по холсту.
//   Таймеры (setTimeout, requestAnimationFrame) между переходами не исполняются: обход
//   синхронный, подпись снимается сразу после show(). Это НЕ ровно тот кадр, который видит читатель:
//   отложенная работа движка (rAF/таймеры — __syncEdges у деревьев, followCurrent, markScroll,
//   min-width SVG) в подпись не попадает. Она подгоняет раскладку под уже нарисованное состояние,
//   поэтому холостой кадр не делает изменённым, но и не проверяется здесь.
//
// ПОТОЛОК (scripts/viz-idle-budget.json): { "<тип>": <максимум холст∅ в процентах> } или
// { "<тип>": { "idle": <проценты>, "steps": <максимум шагов> } } — steps необязателен. Проверяется
// КАЖДЫЙ виджет типа в главах ядра: доля холст∅ (с одним знаком) не выше потолка, число шагов (кадров,
// не переходов) — не больше steps. Превышение —
// красный с именем типа; тип из потолка, которого нет в главах ядра, — тоже красный. Ключ "__core__" —
// общий потолок: доля холст∅ по всем виджетам ядра (с одним знаком, не выше). С --type проверяются
// только типы из пересечения потолка и --type, общий потолок — нет; тип из --type без записи в потолке
// называется («потолка нет — нечего проверять»), а не молча пропускается; --json с --check не сочетается. Потолок
// понижают вслед за правкой генератора (новое значение — из вывода этого скрипта, округлённое
// вверх до целого); повышают только с причиной в отчёте задачи.
//
// Самопроверка на встроенных образцах идёт всегда (как у check-chapter-shape.js): ряд шагов,
// где холст меняется на каждом втором переходе (50 %), ряд без изменений (100 %), и подпись на
// сфабрикованной панели — смена строки шага, чипа, порядка классов, «сдвиг на 0 px» и переезд
// скрытой плашки холст не меняют; смена класса ячейки, переезд плашки и её скрытие меняют.
// Если jsdom не найден — мягкий пропуск (exit 0), как в остальных смоуках; --check без jsdom падает.
"use strict";
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const wantJson = args.includes("--json");
const wantCheck = args.includes("--check");
const typeArg = args.indexOf("--type");
const onlyTypes = typeArg >= 0 ? new Set(String(args[typeArg + 1] || "").split(",").filter(Boolean)) : null;
if (typeArg >= 0 && !onlyTypes.size) { console.error("❌ viz-idle: --type ждёт список типов через запятую"); process.exit(2); }
// --json печатает замер и выходит — потолок он не проверял бы, а зелёный код выхода выглядел бы проверкой
if (wantJson && wantCheck) { console.error("❌ viz-idle: --json и --check вместе не бывают — запусти по отдельности"); process.exit(2); }
const MAX_STEPS = 2000;
// ключ общего потолка в viz-idle-budget.json: доля холст∅ по всем виджетам ядра, с одним знаком
const CORE_KEY = "__core__"; // обход ограничен: виджет с бесконечным счётчиком не повесит прогон

let JSDOM, VirtualConsole;
try {
  ({ JSDOM, VirtualConsole } = require("jsdom"));
} catch (e) {
  if (wantCheck) { console.error("❌ viz-idle: jsdom не установлен — потолок не проверен (npm i --no-save jsdom)."); process.exit(1); }
  console.log("⏭  viz-idle: jsdom не установлен — пропускаю (npm i jsdom).");
  process.exit(0);
}

// ---------- подпись холста ----------
const DROP = [".algo-tp__panelhdr", ".algo-tp__note", ".algo-tp__legend", ".algo-nn__ghost",
  ".algo-tp__status", ".algo-tp__curline", ".algo-tp__vchips", ".algo-tp__ctrl", ".algo-tp__code", ".algo-tp__card"];
const ANIM_CLASSES = ["algo-nn__track--still", "algo-nn__cell--move", "algo-nn__cell--land"];
// анимация и раскладка: min-width ставит SVG один раз после первой отрисовки (SVG_TEXT_MIN в
// algo-viz.js), и перерисованный SVG его теряет — это ширина под телефон, а не шаг
const ANIM_STYLE = /^(transition|animation|z-index|will-change|min-width)(-|$)/;

function canvasOf(widget) {
  const kids = [...widget.querySelectorAll(".algo-tp__panel")];
  // в компактной раскладке холст — панель рядом с .algo-tp__main, а не внутри неё
  return kids.find((p) => !p.closest(".algo-tp__main")) || null;
}

// Классы, которые прячут узел целиком (algo-viz.css: opacity 0 / display none / visibility hidden).
const HIDING_CLASSES = ["algo-nn__tag--off", "algo-nn__jump--off", "algo-nn__frame--off", "algo-nn__zone--off", "algo-tp__dpcard--off"];
const isHidden = (x) => x.hasAttribute("hidden") || x.getAttribute("visibility") === "hidden" ||
  (x.style && (x.style.display === "none" || x.style.visibility === "hidden")) ||
  HIDING_CLASSES.some((k) => x.classList.contains(k));

function canvasSig(panel) {
  if (!panel) return "";
  const c = panel.cloneNode(true);
  c.querySelectorAll(DROP.join(",")).forEach((x) => x.remove());
  [c, ...c.querySelectorAll("*")].forEach((x) => {
    if (!x.parentNode && x !== c) return; // внутри уже опустошённого скрытого узла
    ANIM_CLASSES.forEach((k) => x.classList.remove(k));
    // Невидимый узел рисует только «меня нет»: его старые координаты, текст и дети остаются
    // от прошлого показа и зависят от того, с какого шага пришли.
    if (isHidden(x)) {
      [...x.attributes].forEach((a) => x.removeAttribute(a.name));
      x.textContent = "";
      x.setAttribute("data-hidden", "");
      return;
    }
    // размер слоя стрелок ДП — раскладка таблицы, его не снимают со слоя без стрелок
    if (x.classList.contains("algo-tp__dparrows")) ["width", "height", "viewBox"].forEach((a) => x.removeAttribute(a));
    // порядок классов зависит от порядка toggle, а не от вида: lo+mid и mid+lo — одна ячейка
    if (x.getAttribute("class") != null) {
      const cls = [...x.classList].sort().join(" ");
      if (cls) x.setAttribute("class", cls); else x.removeAttribute("class");
    }
    if (x.getAttribute("style") == null) return;
    [...x.style].filter((p) => ANIM_STYLE.test(p)).forEach((p) => x.style.removeProperty(p));
    // одна запись стиля: «max-width:410px» из разметки и «max-width: 410px» из CSSOM — одно и то же
    if (x.style.length) x.setAttribute("style", x.style.cssText); else x.removeAttribute("style");
  });
  return c.outerHTML;
}

function chipsSig(widget) {
  return [...widget.querySelectorAll(".algo-tp__vchips .algo-tp__vchip")]
    .map((c) => c.textContent).join("\u0001");
}

// Счёт по ряду подписей шагов [{ canvas, chips }]: переходов steps − 1.
function idleCounts(sigs) {
  let idleCanvas = 0, idleAll = 0;
  for (let i = 1; i < sigs.length; i++) {
    if (sigs[i].canvas !== sigs[i - 1].canvas) continue;
    idleCanvas++;
    if (sigs[i].chips === sigs[i - 1].chips) idleAll++;
  }
  return { steps: sigs.length, idleCanvas, idleAll };
}
const pct = (k, steps) => (steps > 1 ? (100 * k) / (steps - 1) : 0);
const fmt = (x) => x.toFixed(1);

// jsdom без раскладки: offsetWidth/Height = 40 (как в check-viz-names), offsetLeft/Top — по номерам
// узла и его предков среди братьев (i0 — сам узел, i1 — родитель, …). x = i0 + i1·1000 + i2·10⁶ + i3·10⁹,
// y = i1 + i2·1000 + i3·10⁶ + i4·10⁹: вместе они различают узлы, расходящиеся в пяти нижних уровнях
// дерева, пока у узла меньше 1000 братьев (числа < 2⁵³ — без потери точности). Одна и та же ячейка
// всегда даёт одну координату, разные ячейки — разные: прежняя сумма Σ i·7^глубина склеивала
// ячейку (r, 7) с (r+1, 0) у ряда из 8 и больше детей. Ограничение: предки глубже пятого уровня
// не различаются — два узла с одинаковыми номерами на пяти нижних уровнях, разошедшиеся только
// выше, получат одни координаты (переезд плашки между ними был бы холостым кадром).
function layoutStub(w) {
  const P = w.HTMLElement.prototype;
  const W = 1000, LEVELS = 5;
  const idx = (el) => {
    const out = [];
    for (let x = el; out.length < LEVELS && x && x.parentElement && x !== x.ownerDocument.body; x = x.parentElement) {
      let i = 0;
      for (let y = x.previousElementSibling; y; y = y.previousElementSibling) i++;
      out.push(Math.min(i, W - 1));
    }
    while (out.length < LEVELS) out.push(0);
    return out;
  };
  const num = (ds) => ds.reduce((s, d, k) => s + d * W ** k, 0);
  Object.defineProperty(P, "offsetWidth", { get() { return 40; } });
  Object.defineProperty(P, "offsetHeight", { get() { return 40; } });
  Object.defineProperty(P, "offsetLeft", { get() { return num(idx(this).slice(0, 4)); } });
  Object.defineProperty(P, "offsetTop", { get() { return num(idx(this).slice(1, 5)); } });
}

// ---------- самопроверка ----------
function selfTest() {
  const errs = [];
  const row = (cs) => cs.map((c) => ({ canvas: c, chips: "x" }));
  const half = idleCounts(row(["a", "a", "b", "b", "c"]));
  if (fmt(pct(half.idleCanvas, half.steps)) !== "50.0") errs.push(`образец «каждый второй»: ${half.idleCanvas}/${half.steps - 1}, ожидалось 50 %`);
  const none = idleCounts(row(["a", "a", "a", "a"]));
  if (fmt(pct(none.idleCanvas, none.steps)) !== "100.0" || none.idleAll !== 3) errs.push(`образец «без изменений»: ${none.idleCanvas}/${none.steps - 1}, ожидалось 100 %`);
  const chipy = idleCounts([{ canvas: "a", chips: "1" }, { canvas: "a", chips: "2" }, { canvas: "a", chips: "2" }]);
  if (chipy.idleCanvas !== 2 || chipy.idleAll !== 1) errs.push(`образец «сменился только чип»: холст∅ ${chipy.idleCanvas}, всё∅ ${chipy.idleAll}, ожидалось 2 и 1`);

  // подпись на сфабрикованном виджете в той же раскладке, что у движка
  const dom = new JSDOM(`<!DOCTYPE html><body><div id="w" class="algo-tp">
    <div class="algo-tp__panel"><div class="algo-tp__panelhdr">Визуализация</div><div class="algo-tp__legend">л</div>
      <div class="algo-tp__vizhost"><div class="algo-nn__track algo-nn__track--still">
        <div class="algo-nn__row"><div class="algo-nn__col"><div class="algo-tp__big algo-nn__cell">1</div></div><div class="algo-nn__col"><div class="algo-tp__big algo-nn__cell">2</div></div></div>
        <div class="algo-nn__tag algo-nn__tag--lo"><span class="algo-nn__tagtx">i</span></div>
        <div class="algo-nn__frame"><span class="algo-nn__framelab">1 + 2 = 3 &lt; 5</span></div>
        <div class="algo-nn__zone"><span class="algo-nn__zonelab">нули</span></div></div></div></div>
    <div class="algo-tp__card algo-tp__status">шаг 1</div><div class="algo-tp__curline">x := 1</div>
    <div class="algo-tp__vchips"><span class="algo-tp__vchip">i 0</span></div><div class="algo-tp__main"><div class="algo-tp__panel">код</div></div>
  </div></body>`, { beforeParse: layoutStub });
  const d = dom.window.document, w = d.getElementById("w");
  const cells = [...d.querySelectorAll(".algo-nn__cell")], tag = d.querySelector(".algo-nn__tag");
  const put = (j) => { tag.style.transform = `translate(calc(${cells[j].offsetLeft + 20}px - 50%), ${cells[j].offsetTop + 40}px)`; tag.style.transition = "transform .3s"; };
  put(0);
  const s0 = canvasSig(canvasOf(w));
  if (!s0.includes("algo-nn__cell")) errs.push("подпись: холст не найден (canvasOf взял не ту панель)");
  if (s0.includes("код")) errs.push("подпись: в холст попала панель кода из .algo-tp__main");
  d.querySelector(".algo-tp__status").textContent = "шаг 2";
  d.querySelector(".algo-tp__curline").textContent = "x := 2";
  d.querySelector(".algo-tp__vchip").textContent = "i 1";
  d.querySelector(".algo-nn__track").classList.remove("algo-nn__track--still");
  put(0); // «сдвиг на 0 px»
  if (canvasSig(canvasOf(w)) !== s0) errs.push("подпись: смена строки шага, чипа, класса анимации или сдвиг плашки на 0 px изменили холст");
  put(1);
  const s1 = canvasSig(canvasOf(w));
  if (s1 === s0) errs.push("подпись: переезд плашки на соседнюю ячейку не изменил холст");
  cells[1].classList.add("algo-tp__big--found");
  const s2 = canvasSig(canvasOf(w));
  if (s2 === s1) errs.push("подпись: смена класса ячейки не изменила холст");
  cells[1].className = "algo-tp__big--found algo-nn__cell algo-tp__big";
  if (canvasSig(canvasOf(w)) !== s2) errs.push("подпись: другой порядок тех же классов изменил холст");
  tag.classList.add("algo-nn__tag--off");
  const s3 = canvasSig(canvasOf(w));
  if (s3 === s2) errs.push("подпись: плашка спряталась, а холст не изменился");
  put(0); tag.querySelector(".algo-nn__tagtx").textContent = "j";
  if (canvasSig(canvasOf(w)) !== s3) errs.push("подпись: координаты и текст СКРЫТОЙ плашки изменили холст");
  // сравнение на холсте (этап 4) живёт в ярлыке рамки или зоны: его смена — изменение холста
  d.querySelector(".algo-nn__framelab").textContent = "1 + 4 = 5 == 5";
  const s4 = canvasSig(canvasOf(w));
  if (s4 === s3) errs.push("подпись: сменился только ярлык рамки, а холст не изменился");
  d.querySelector(".algo-nn__zonelab").textContent = "двойки";
  if (canvasSig(canvasOf(w)) === s4) errs.push("подпись: сменился только ярлык зоны, а холст не изменился");
  // координаты: ячейка (ряд r, колонка 7) и (ряд r+1, колонка 0) не совпадают (прежний вес 7 их склеивал)
  const g = dom.window.document.createElement("div");
  g.innerHTML = "<div>" + "<i></i>".repeat(9) + "</div><div>" + "<i></i>".repeat(9) + "</div>";
  d.body.appendChild(g);
  const [ra, rb] = g.children, pt = (e) => e.offsetLeft + "," + e.offsetTop;
  if (pt(ra.children[7]) === pt(rb.children[0])) errs.push("layoutStub: ячейки (0, 7) и (1, 0) получили одни координаты");
  const all = new Set([...g.querySelectorAll("i")].map(pt));
  if (all.size !== 18) errs.push(`layoutStub: 18 ячеек двух рядов дали ${all.size} разных координат`);
  dom.window.close();
  return errs;
}

// ---------- главы ядра и виджеты ----------
function coreChapters() {
  const src = fs.readFileSync(path.join(root, "assets", "progress.js"), "utf8");
  return [...src.matchAll(/h:\s*"([\w-]+)\.html",\s*lvl:\s*"(\w+)"/g)].filter((m) => m[2] === "core").map((m) => m[1]);
}

const js = fs.readFileSync(path.join(root, "assets", "algo-viz.js"), "utf8");
const { infraScriptTags } = require("./lib/infra-files.js");
const infra = infraScriptTags(root);

// Один документ на главу: в jsdom сборка дорожает с размером документа (см. predict-check).
function measureChapter(slug) {
  const text = fs.readFileSync(path.join(root, "src", slug + ".md"), "utf8");
  const tags = [...text.matchAll(/<div class="algo-viz"[^>]*><\/div>/g)].map((m, i) => ({
    index: i + 1, tag: m[0], type: (m[0].match(/data-viz="([^"]+)"/) || [])[1],
  })).filter((t) => t.type && (!onlyTypes || onlyTypes.has(t.type)));
  if (!tags.length) return Promise.resolve({ rows: [], errors: [] });
  const errors = [];
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => errors.push(`${slug}: jsdomError: ${e && e.message}`));
  const body = tags.map((t) => t.tag.replace("<div ", `<div id="w${t.index}" `)).join("\n");
  const dom = new JSDOM(`<!DOCTYPE html><html><body>${body}<script>${js}</script>${infra}</body></html>`, {
    runScripts: "dangerously", virtualConsole: vc, pretendToBeVisual: true, beforeParse: layoutStub,
  });
  const win = dom.window, doc = win.document;
  return new Promise((resolve) => win.addEventListener("load", () => setTimeout(() => {
    const rows = tags.map((t) => {
      const el = doc.getElementById("w" + t.index);
      const counter = el.querySelector(".algo-viz__counter");
      const panel = canvasOf(el);
      if (!counter || !panel) { errors.push(`${slug}:${t.index} ${t.type}: нет ${counter ? "холста" : "счётчика"} — виджет не построился`); return null; }
      const sigs = [];
      for (let guard = 0; guard < MAX_STEPS; guard++) {
        sigs.push({ canvas: canvasSig(panel), chips: chipsSig(el) });
        const m = counter.textContent.match(/(\d+)\s*\/\s*(\d+)/);
        if (!m || +m[1] >= +m[2]) break;
        if (guard === MAX_STEPS - 1) errors.push(`${slug}:${t.index} ${t.type}: больше ${MAX_STEPS} шагов — обход оборван`);
        el.dispatchEvent(new win.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
      }
      const m = counter.textContent.match(/(\d+)\s*\/\s*(\d+)/);
      if (!m || +m[1] !== +m[2] || sigs.length !== +m[2]) errors.push(`${slug}:${t.index} ${t.type}: обход дошёл до ${counter.textContent.trim()} за ${sigs.length} кадров`);
      // обратный ход: кадр k, к которому пришли с k+1, обязан совпасть с кадром k, к которому
      // пришли с k−1, — иначе в подписи остался след пути (анимация, остатки скрытого узла)
      for (let k = sigs.length - 2; k >= 0; k--) {
        el.dispatchEvent(new win.KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
        if (canvasSig(panel) !== sigs[k].canvas) { errors.push(`${slug}:${t.index} ${t.type}: подпись кадра ${k + 1} зависит от направления (← против ›) — дочисть её в canvasSig`); break; }
      }
      return { chapter: slug, index: t.index, type: t.type, ...idleCounts(sigs) };
    }).filter(Boolean);
    win.close();
    resolve({ rows, errors });
  }, 50)));
}

async function main() {
  const fails = selfTest();
  if (fails.length) { console.error("❌ viz-idle: самопроверка:\n  - " + fails.join("\n  - ")); process.exit(1); }

  const rows = [], errors = [];
  for (const slug of coreChapters()) {
    const r = await measureChapter(slug);
    rows.push(...r.rows); errors.push(...r.errors);
  }
  if (errors.length) { console.error("❌ viz-idle:\n  - " + [...new Set(errors)].slice(0, 20).join("\n  - ")); process.exit(1); }
  if (onlyTypes) {
    const seen = new Set(rows.map((r) => r.type));
    const lost = [...onlyTypes].filter((t) => !seen.has(t));
    if (lost.length) { console.error(`❌ viz-idle: в главах ядра нет виджетов типа ${lost.join(", ")}`); process.exit(1); }
  }

  if (wantJson) { console.log(JSON.stringify(rows, null, 1)); process.exit(0); }

  const tr = rows.reduce((a, r) => a + r.steps - 1, 0);
  const ic = rows.reduce((a, r) => a + r.idleCanvas, 0), ia = rows.reduce((a, r) => a + r.idleAll, 0);
  if (!wantCheck) {
    rows.forEach((r) => console.log(`${(r.chapter + ":" + r.index).padEnd(26)} ${r.type.padEnd(24)} ${String(r.steps).padStart(4)} ${String(r.idleCanvas).padStart(4)} ${String(r.idleAll).padStart(4)} ${fmt(pct(r.idleCanvas, r.steps)).padStart(5)}%`));
    console.log(`\n${onlyTypes ? "выбранные типы" : "ядро"}: ${rows.length} виджетов, ${tr} переходов; холст∅ ${ic} (${fmt(tr ? 100 * ic / tr : 0)} %), всё∅ ${ia} (${fmt(tr ? 100 * ia / tr : 0)} %)`);
    process.exit(0);
  }

  const budget = JSON.parse(fs.readFileSync(path.join(__dirname, "viz-idle-budget.json"), "utf8"));
  const bad = [];
  const types = Object.keys(budget).filter((t) => t !== CORE_KEY && (!onlyTypes || onlyTypes.has(t)));
  // --type с типом без записи в потолке: проверять нечего — так и сказать, а не «0 типов под потолком»
  const noCap = onlyTypes ? [...onlyTypes].filter((t) => !Object.prototype.hasOwnProperty.call(budget, t)) : [];
  if (noCap.length && !types.length) { console.log(`⚠ viz-idle: для ${noCap.join(", ")} потолка в viz-idle-budget.json нет — нечего проверять`); process.exit(0); }
  for (const type of types) {
    // запись — число (потолок холст∅) или { idle, steps }: steps — необязательный потолок числа шагов
    const entry = budget[type];
    const cap = typeof entry === "number" ? entry : entry && entry.idle;
    const maxSteps = entry && typeof entry === "object" ? entry.steps : undefined;
    if (typeof cap !== "number" || (maxSteps !== undefined && typeof maxSteps !== "number")) { bad.push(`${type}: запись в viz-idle-budget.json — число или { "idle": число, "steps": число }`); continue; }
    const mine = rows.filter((r) => r.type === type);
    if (!mine.length) { bad.push(`${type}: типа из viz-idle-budget.json нет в главах ядра — убери запись`); continue; }
    mine.forEach((r) => {
      const p = pct(r.idleCanvas, r.steps);
      if (+fmt(p) > cap) bad.push(`${type} (${r.chapter}:${r.index}): холст∅ ${fmt(p)} % (${r.idleCanvas} из ${r.steps - 1}) выше потолка ${cap} %`);
      if (maxSteps !== undefined && r.steps > maxSteps) bad.push(`${type} (${r.chapter}:${r.index}): ${r.steps} шагов — больше потолка ${maxSteps}`);
    });
  }
  // общий потолок — только на полном прогоне: с --type итог считается по части виджетов
  const total = tr ? 100 * ic / tr : 0;
  if (!onlyTypes) {
    if (typeof budget[CORE_KEY] !== "number") bad.push(`в viz-idle-budget.json нет общего потолка «${CORE_KEY}»`);
    else if (+fmt(total) > budget[CORE_KEY]) bad.push(`${CORE_KEY}: холст∅ по ядру ${fmt(total)} % (${ic} из ${tr}) выше потолка ${budget[CORE_KEY]} %`);
  }
  if (bad.length) { console.error("❌ viz-idle --check:\n  - " + bad.join("\n  - ")); process.exit(1); }
  console.log(onlyTypes
    ? `✅ viz-idle: ${types.length} типов из --type под потолком (общий потолок ядра на частичном прогоне не проверяется)` + (noCap.length ? `; для ${noCap.join(", ")} потолка нет — не проверялись` : "")
    : `✅ viz-idle: ${types.length} типов под потолком; ядро — ${rows.length} виджетов, холст∅ ${fmt(total)} % (потолок ${budget[CORE_KEY]} %), всё∅ ${fmt(tr ? 100 * ia / tr : 0)} %`);
  process.exit(0);
}

// функции — для дампов и тестов (как check-chapter-shape.js)
module.exports = { canvasOf, canvasSig, chipsSig, idleCounts, layoutStub, selfTest, coreChapters };
if (require.main === module) main();
