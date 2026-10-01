# Infra-viz: хук движка + первый виджет Postgres (`pg-page`) — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Дать движку `algo-viz.js` внешнюю регистрацию типов, подключить `assets/infra-viz.js`, и на нём собрать вертикальный срез — виджет «страница Postgres 8 КБ» плюс глава «Как Postgres хранит данные».

**Architecture:** `algo-viz.js` — один IIFE, `DASH`/`CODE`/`mkEl` приватны. Добавляем `window.ALGO_VIZ = { register, mkEl }`. `infra-viz.js` грузится после него и регистрирует типы теми же конфигами, что `DASH`. Скрипты проверки разбирают `algo-viz.js` регэкспами по тексту и подставляют в jsdom только его, поэтому их нужно научить читать и `infra-viz.js` (записи конфигов с отступом в 4 пробела, `var CODE = {` — в том же формате).

**Tech Stack:** vanilla JS/SVG, mdBook, jsdom (`npm i --no-save jsdom`), Postgres 16 из `pglab/` + `pageinspect` для сверки.

**Spec:** `docs/superpowers/specs/2026-10-01-infra-visualization-design.md`

Это **план 1 из серии** по спецификации. Остальные виджеты Postgres (`pg-index-to-heap`, `pg-scan-kinds`, `pg-join`, `pg-mvcc`, `pg-vacuum`, `pg-wal`), Redis и Kafka — отдельные планы по рецепту задач 3–5 отсюда.

## Global Constraints

- Язык контента русский, код листингов Go (спека: «Язык контента русский, код Go»).
- Виджеты строятся на движке `algo-viz.js`, без сборщика и зависимостей (спека: «vanilla JS/SVG, без сборщика»).
- Числа и поведение сверяются с реальным Postgres: «Непроверенное не утверждается».
- Правила генераторов из CLAUDE.md: снимок = состояние ПОСЛЕ подсвеченной строки, одна строка листинга — один кадр; чип — только живая переменная (до объявления «—»); имя чипа = имя в листинге.
- Критерии готовности: `mdbook build`, `check-links.js`, `check-registries.js`, `check-viz.js`, `predict-check.js` зелёные; jsdom установлен (пропуск ≠ успех).
- Коммиты — шаги плана; без явного «да» пользователя на выполнение плана не начинать.

## Review Focus

1. Вставка строки ровно на границе (`need == upper-lower`) должна влезть, на 1 байт больше — нет.
2. Удаление уже удалённого или несуществующего слота — понятное сообщение, состояние не меняется, виджет не падает.
3. `vacuum` на пустой странице и на странице без удалённых — «нечего чистить», без ошибок.
4. Размер строки 0 и очень большой (> страницы) — ввод отвергается/отмечается, а не ломает вёрстку.
5. Пресет задаёт ровно поля ввода типа (правило 4 `check-viz.js`).

## File Structure

| Файл | Ответственность |
|---|---|
| `assets/algo-viz.js` (изменить) | хук `window.ALGO_VIZ`, ~10 строк перед диспетчером |
| `assets/infra-viz.js` (создать) | генератор `bPgPage`, `CODE`, конфиг `pg-page`, `customViz`; экспорт для node-теста |
| `assets/infra-viz.css` (создать) | стили страницы (`--iv-*` токены, светлая/тёмные темы) |
| `book.toml` (изменить) | подключить новый JS и CSS |
| `scripts/infra-viz-check.js` (создать) | node-тест генератора + jsdom-тест хука |
| `scripts/check-viz.js`, `viz-render-check.js`, `predict-check.js`, `check-viz-names.js` (изменить) | читать `infra-viz.js` вместе с `algo-viz.js` |
| `src/postgres-storage.md` (создать) | глава с теорией и виджетом |
| `src/SUMMARY.md`, `assets/progress.js` (изменить) | оглавление и реестр уровня |

---

### Task 1: Хук `ALGO_VIZ.register` и пустой `infra-viz.js`

**Files:**
- Modify: `assets/algo-viz.js` (перед `// ===== Диспетчер`, строка ~16575)
- Create: `assets/infra-viz.js`, `scripts/infra-viz-check.js`
- Modify: `book.toml:20`

**Interfaces:**
- Produces: `window.ALGO_VIZ.register(type: string, cfg: object, code: string[])` — кладёт `cfg` в `DASH[type]`, `code` в `CODE[cfg.codeKey]`; `window.ALGO_VIZ.mkEl(tag, cls, txt)`.

- [ ] **Step 1: Падающий тест хука** — `scripts/infra-viz-check.js`:

```js
#!/usr/bin/env node
// Проверка infra-viz: хук регистрации (jsdom) и генераторы (чистый node).
"use strict";
const fs = require("fs");
const path = require("path");
let JSDOM;
try { ({ JSDOM } = require("jsdom")); } catch (e) { console.log("⏭  infra-viz-check: jsdom не установлен (npm i --no-save jsdom)"); process.exit(1); }
const root = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, "assets", f), "utf8");
let failed = 0;
const eq = (name, got, want) => { if (JSON.stringify(got) !== JSON.stringify(want)) { failed++; console.error(`✗ ${name}\n  got:  ${JSON.stringify(got)}\n  want: ${JSON.stringify(want)}`); } else console.log(`✓ ${name}`); };

// --- хук ---
{
  const html = `<!DOCTYPE html><html><body><div class="algo-viz" id="a" data-viz="x-test"></div><div class="algo-viz" id="b" data-viz="x-missing"></div>
    <script>${read("algo-viz.js")}</script>
    <script>
      window.ALGO_VIZ.register("x-test", {
        badge: "t", desc: "t", valuesLabel: "", codeKey: "x-test", fillRange: false,
        complexity: { time: "O(1)", space: "O(1)", good: "" }, varOrder: ["a"], varDesc: { a: "a" }, lineNotes: {}, rules: [],
        parse: function () { return { steps: [{ line: 0, vars: { a: 1 }, info: "один" }, { done: true, line: 0, vars: { a: 2 }, info: "два" }] }; },
        inputs: [], values: function () { return []; }, title: function () { return "T"; }, pointers: function () { return { lo: -1, hi: -1 }; },
        sumCells: ["a"], sumValues: function (s) { return [{ text: s.vars.a }]; },
        status: function (s) { return { kind: "info", icon: "i", head: "h", text: s.info }; },
        stepCard: function (s) { return { a: s.vars.a, b: "", c: "", cls: "eq" }; }, varsOf: function (s) { return { a: s.vars.a }; },
        customViz: function (panel) { return function (s) { panel.textContent = "viz:" + s.info; }; }
      }, ["// x"]);
    </script></body></html>`;
  const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true });
  dom.window.document.dispatchEvent(new dom.window.Event("DOMContentLoaded"));
  const a = dom.window.document.getElementById("a"), b = dom.window.document.getElementById("b");
  eq("register: тип отрисован", a.classList.contains("algo-viz--ready") && /viz:один/.test(a.textContent), true);
  eq("register: чужой тип по-прежнему «Неизвестный»", /Неизвестный тип/.test(b.textContent), true);
}
process.exit(failed ? 1 : 0);
```

- [ ] **Step 2: Запустить, увидеть падение**

Run: `npm i --no-save jsdom && node scripts/infra-viz-check.js`
Expected: FAIL (`window.ALGO_VIZ` is undefined → «Cannot read properties of undefined (reading 'register')»).

- [ ] **Step 3: Реализовать хук** — вставить в `assets/algo-viz.js` непосредственно перед строкой `// ===== Диспетчер`:

```js
  // ===== Внешняя регистрация типов ============================================
  // assets/infra-viz.js грузится ПОСЛЕ этого файла, а init() стартует на DOMContentLoaded,
  // то есть когда оба скрипта уже выполнились и регистрация успела.
  window.ALGO_VIZ = {
    register: function (type, cfg, code) {
      DASH[type] = cfg;
      CODE[cfg.codeKey] = code;
    },
    mkEl: mkEl
  };
```

Создать `assets/infra-viz.js`:

```js
/* Инфраструктурные визуализации (Postgres, Redis, Kafka). Регистрируются в движке через
 * window.ALGO_VIZ.register. Генераторы — чистые функции, экспортируются для node-теста. */
(function () {
  "use strict";
  var exportsForTest = {};
  if (typeof module !== "undefined" && module.exports) module.exports = exportsForTest;
  if (typeof window === "undefined" || !window.ALGO_VIZ) return;
})();
```

В `book.toml` строка 20: добавить `"assets/infra-viz.js"` сразу после `"assets/algo-viz.js"`.

- [ ] **Step 4: Тест проходит**

Run: `node scripts/infra-viz-check.js`
Expected: `✓ register: тип отрисован`, `✓ register: чужой тип по-прежнему «Неизвестный»`. Если `buildDashboard` требует поля, которых нет в минимальном конфиге теста, дописать их в конфиг теста по сообщению об ошибке (стиль — конфиг `lsm-put`).

- [ ] **Step 5: Регресс** — Run: `node scripts/check-viz.js && node scripts/viz-render-check.js` — Expected: как до правки (оба зелёные).

- [ ] **Step 6: Commit**

```bash
git add assets/algo-viz.js assets/infra-viz.js book.toml scripts/infra-viz-check.js
git commit -m "Движок: ALGO_VIZ.register и каркас infra-viz.js"
```

---

### Task 2: Скрипты проверки читают `infra-viz.js`

**Files:**
- Modify: `scripts/check-viz.js`, `scripts/viz-render-check.js`, `scripts/predict-check.js`, `scripts/check-viz-names.js`

**Interfaces:**
- Consumes: формат `infra-viz.js` — записи конфигов `^    "type": {` (4 пробела), блок `var CODE = {` … `\n  };`.
- Produces: все четыре скрипта видят типы из `infra-viz.js`.

- [ ] **Step 1: Падающий случай** — временно добавить в `infra-viz.js` внутрь IIFE после проверки `window.ALGO_VIZ` строку `window.ALGO_VIZ.register("x-probe", { codeKey: "x-probe" }, ["//"]);`, в `src/postgres-plans.md` в конец временно `<div class="algo-viz" data-viz="x-probe"></div>`. Run: `node scripts/check-viz.js` — Expected: FAIL «data-viz "x-probe" без конфига DASH» (скрипт читает только `algo-viz.js`).

- [ ] **Step 2: `check-viz.js`** — заменить чтение исходника: сразу после строки `const js = fs.readFileSync(path.join(root, "assets", "algo-viz.js"), "utf8");` добавить

```js
const infraJs = fs.readFileSync(path.join(root, "assets", "infra-viz.js"), "utf8");
```

Разбор `CODE` обернуть в функцию и вызвать для обоих файлов: заменить блок «реестр CODE» на

```js
const CODE = {};
function collectCode(src) {
  const codeStart = src.indexOf("var CODE = {");
  if (codeStart < 0) return;
  const codeBody = src.slice(codeStart, src.indexOf("\n  };", codeStart));
  const keyRe = /^    "([a-z0-9-]+)":\s*\[([\s\S]*?)\],?\s*$/gm;
  let m;
  while ((m = keyRe.exec(codeBody))) CODE[m[1]] = [...m[2].matchAll(/"(?:[^"\\]|\\.)*"/g)].map((x) => x[0]);
}
collectCode(js);
collectCode(infraJs);
```

(старые переменные `codeStart`/`codeBody`/`keyRe`/`m` удалить), а ключи DASH и список конфигов искать по `const all = js + "\n" + infraJs;`: в `dashKeys` и в `cfgRe` заменить `js` на `all`, включая `js.slice(...)` и `js.length` внутри цикла по конфигам.

- [ ] **Step 3:** остальные три скрипта: после строки `const js = fs.readFileSync(path.join(root, "assets", "algo-viz.js"), "utf8");` добавить

```js
const infraJs = fs.readFileSync(path.join(root, "assets", "infra-viz.js"), "utf8");
```

и в шаблоне JSDOM заменить `<script>${js}</script>` на `<script>${js}</script><script>${infraJs}</script>` (в `check-viz-names.js`, если он разбирает исходник регэкспами, — ещё и объединить `js + "\n" + infraJs` там, где ищутся конфиги, как в Step 2).

- [ ] **Step 4:** временный x-probe из Step 1 убрать; Run: `node scripts/check-viz.js && node scripts/viz-render-check.js && node scripts/predict-check.js && node scripts/check-viz-names.js` — Expected: все зелёные, числа проверенных типов те же, что до правки.

- [ ] **Step 5: Commit** — `git add scripts && git commit -m "Проверки виджетов читают и infra-viz.js"`

---

### Task 3: Генератор `bPgPage` (чистая функция, node-тест)

**Files:**
- Modify: `assets/infra-viz.js`, `scripts/infra-viz-check.js`

**Interfaces:**
- Produces: `bPgPage(ops, pageSize)` → `steps[]`; `parseOps(str)` → `ops[]`. Константы `PAGE_HDR=24`, `ITEM=4`, `TUP_HDR=24`; `maxAlign(n)=(n+7)&~7`.
- Операция: `{op:"ins", name, data}` (`data` — байты данных после заголовка tuple), `{op:"del", slot}` (слот с 1), `{op:"vacuum"}`.
- Шаг: `{ line, vars:{op,size,slot,need,lower,upper}, info, hot?, done?, slots:[{n, state:"normal"|"deleted"|"unused", name, off, len}], lower, upper, reserved:{off,len}|null }`.
- Листинг (индексы строк — для `line`): 0 `func (p *Page) Insert(data []byte) (int, bool) {` · 1 `size := maxAlign(tupleHeader + len(data))` · 2 `slot := p.firstUnused() // -1: свободного указателя нет` · 3 `need := size + p.pointerCost(slot) // 4 байта, если слот новый` · 4 `if need > p.upper-p.lower {` · 5 `return 0, false // не влезло: строка уйдёт на другую страницу` · 6 `}` · 7 `p.upper -= size` · 8 `p.setPointer(slot, p.upper)` · 9 `copy(p.buf[p.upper:], data)` · 10 `return slot, true` · 11 `}` · 12 `func (p *Page) Delete(slot int) {` · 13 `p.tuple(slot).xmax = txid // помечена, но место НЕ освобождено` · 14 `}` · 15 `func (p *Page) Vacuum() {` · 16 `p.freeDeadPointers() // указатель удалённой строки → unused` · 17 `p.compact() // живые tuple сдвигаются к концу, upper растёт` · 18 `p.truncateTrailingPointers() // хвост unused-указателей: lower уменьшается` · 19 `}`.

- [ ] **Step 1: Падающие тесты** — добавить в `scripts/infra-viz-check.js` перед `process.exit`:

```js
// --- генератор pg-page ---
const infra = require(path.join(root, "assets", "infra-viz.js"));
const last = (steps) => steps[steps.length - 1];
const run = (s, size) => infra.bPgPage(infra.parseOps(s), size || 8192);
{
  // 4 строки по 2000 байт данных: tuple = 24+2000 = 2024; lower 24+4*4=40, upper 8192-4*2024=96
  const st = run("+a:2000,+b:2000,+c:2000,+d:2000");
  eq("4 строки влезают: lower/upper", [last(st).lower, last(st).upper], [40, 96]);
  // 5-я: нужно 2024+4=2028 > 96-40=56 — не влезает
  const st5 = run("+a:2000,+b:2000,+c:2000,+d:2000,+e:2000");
  eq("5-я не влезает, состояние не меняется", [last(st5).lower, last(st5).upper, last(st5).slots.length], [40, 96, 4]);
}
{
  // граница: после 3 строк свободно 8192-24-3*(2024+4)=2084; строка с need=2084 влезает: 4+maxAlign(24+d)=2084 → d=2056
  const edge = run("+a:2000,+b:2000,+c:2000,+d:2056");
  eq("ровно впритык влезает (free=0)", last(edge).upper - last(edge).lower, 0);
  const over = run("+a:2000,+b:2000,+c:2000,+d:2057");
  eq("на 1 байт больше — не влезает (maxAlign округляет до 2088, need=2092)", last(over).slots.length, 3);
}
{
  const st = run("+a:100,+b:100,-1");
  eq("delete: tuple остаётся, место не освобождено", [last(st).upper, last(st).slots[0].state], [8192 - 2 * 128, "deleted"]);
  const v = run("+a:100,+b:100,-1,vacuum");
  eq("vacuum: место возвращено, указатель unused", [last(v).upper, last(v).slots[0].state], [8192 - 128, "unused"]);
  const v2 = run("+a:100,+b:100,-2,vacuum");
  eq("vacuum: хвостовой unused-указатель отрезан (lower уменьшился)", last(v2).lower, 24 + 4);
  const re = run("+a:100,+b:100,-1,vacuum,+c:100");
  eq("новая строка берёт освободившийся слот 1 без роста lower", [last(re).slots[0].name, last(re).lower], ["c", 24 + 2 * 4]);
}
{
  const bad = run("-9,-1,vacuum");
  eq("delete несуществующего слота и vacuum на пустой — не падают", last(bad).slots.length, 0);
  eq("парсер отбрасывает размер 0 и больше страницы", infra.parseOps("+a:0,+b:99999,+c:10").map((o) => o.name), ["c"]);
}
```

Подсчёт: tuple 24+100=124 → maxAlign 128 (отсюда `128` в ожиданиях).

- [ ] **Step 2: Падение** — Run: `node scripts/infra-viz-check.js` — Expected: FAIL `infra.bPgPage is not a function`.

- [ ] **Step 3: Реализация** — в `assets/infra-viz.js` внутри IIFE, после `var exportsForTest = {};`:

```js
  var PAGE_HDR = 24, ITEM = 4, TUP_HDR = 24;
  function maxAlign(n) { return (n + 7) & ~7; }

  // Формат: "+имя:байты" вставка, "-N" удаление слота N (с 1), "vacuum".
  function parseOps(str, pageSize) {
    var max = (pageSize || 8192) - PAGE_HDR - ITEM - TUP_HDR;
    var ops = [];
    String(str || "").split(",").forEach(function (raw) {
      var t = raw.trim();
      if (!t) return;
      if (t === "vacuum") { ops.push({ op: "vacuum" }); return; }
      if (t.charAt(0) === "-") { var n = parseInt(t.slice(1), 10); if (n > 0) ops.push({ op: "del", slot: n }); return; }
      if (t.charAt(0) === "+") {
        var p = t.slice(1).split(":"), d = parseInt(p[1], 10);
        if (p[0] && d > 0 && d <= max) ops.push({ op: "ins", name: p[0], data: d });
      }
    });
    return ops;
  }

  function bPgPage(ops, pageSize) {
    var slots = [], steps = [];
    function lower() { return PAGE_HDR + ITEM * slots.length; }
    function used() { return slots.reduce(function (a, s) { return a + (s.state === "unused" ? 0 : s.len); }, 0); }
    function upper() { return pageSize - used(); }
    function pack() { // offset каждого tuple: упаковка от конца страницы по порядку слотов
      var off = pageSize;
      slots.forEach(function (s) { if (s.state === "unused") { s.off = 0; return; } off -= s.len; s.off = off; });
    }
    function snap(extra) {
      var o = { slots: slots.map(function (s) { return { n: s.n, state: s.state, name: s.name, off: s.off, len: s.len }; }), lower: lower(), upper: upper(), reserved: null };
      for (var k in extra) o[k] = extra[k];
      return o;
    }
    function v(op, o) { var r = { op: op, size: "—", slot: "—", need: "—", lower: lower(), upper: upper() }; for (var k in o) r[k] = o[k]; return r; }
    steps.push(snap({ line: 0, vars: v("—", {}), info: "Пустая страница " + pageSize + " Б: заголовок " + PAGE_HDR + " Б, остальное свободно. Указатели растут сверху, строки — снизу, навстречу." }));

    ops.forEach(function (op) {
      if (op.op === "ins") {
        var size = maxAlign(TUP_HDR + op.data), label = "Insert(" + op.name + ")";
        steps.push(snap({ line: 1, vars: v(label, { size: size }), info: "Строка «" + op.name + "»: заголовок " + TUP_HDR + " Б + данные " + op.data + " Б, выровнено до 8 → size = " + size + " Б" }));
        var slot = -1;
        for (var i = 0; i < slots.length; i++) if (slots[i].state === "unused") { slot = i; break; }
        steps.push(snap({ line: 2, vars: v(label, { size: size, slot: slot < 0 ? -1 : slot + 1 }), info: slot < 0 ? "Свободного указателя нет (-1) — заведём новый" : "Есть свободный указатель №" + (slot + 1) + " — переиспользуем" }));
        var need = size + (slot < 0 ? ITEM : 0);
        steps.push(snap({ line: 3, vars: v(label, { size: size, slot: slot < 0 ? -1 : slot + 1, need: need }), info: "need = " + size + (slot < 0 ? " + " + ITEM + " (новый указатель)" : " (указатель уже есть)") + " = " + need + " Б; свободно " + (upper() - lower()) + " Б" }));
        if (need > upper() - lower()) {
          steps.push(snap({ line: 5, hot: true, vars: v(label, { size: size, slot: slot < 0 ? -1 : slot + 1, need: need }), info: "need " + need + " > свободно " + (upper() - lower()) + " → не влезло. Postgres положит строку на другую страницу (или добавит новую)" }));
          return;
        }
        var newSlot = slot < 0 ? { n: slots.length + 1, state: "normal", name: op.name, off: 0, len: size } : null;
        var target = newSlot || slots[slot];
        steps.push(snap({ line: 4, vars: v(label, { size: size, slot: target.n, need: need }), info: "need ≤ свободно → вставка пройдёт" }));
        // upper сдвигается ДО появления указателя и tuple: резерв места
        var reserveOff = upper() - size;
        steps.push({ slots: snap({}).slots, lower: lower(), upper: reserveOff, reserved: { off: reserveOff, len: size }, line: 7, vars: v(label, { size: size, slot: target.n, need: need, upper: reserveOff }), info: "upper -= " + size + ": место под строку отрезано от свободной зоны" });
        if (newSlot) slots.push(newSlot); else { target.state = "normal"; target.name = op.name; target.len = size; }
        pack();
        steps.push({ slots: snap({}).slots.map(function (s) { return s.n === target.n ? { n: s.n, state: s.state, name: s.name, off: s.off, len: s.len, ptrOnly: true } : s; }), lower: lower(), upper: upper(), reserved: { off: target.off, len: size }, line: 8, vars: v(label, { size: size, slot: target.n, need: need }), info: "setPointer: указатель №" + target.n + " → смещение " + target.off + (newSlot ? "; lower вырос на " + ITEM : "; lower не изменился") });
        steps.push(snap({ line: 9, vars: v(label, { size: size, slot: target.n, need: need }), info: "Данные записаны по смещению " + target.off + ". Строка «" + op.name + "» лежит в слоте №" + target.n }));
        steps.push(snap({ line: 10, vars: v(label, { size: size, slot: target.n, need: need }), info: "Готово: lower=" + lower() + ", upper=" + upper() + ", свободно " + (upper() - lower()) + " Б" }));
      } else if (op.op === "del") {
        var s = slots[op.slot - 1];
        if (!s || s.state !== "normal") {
          steps.push(snap({ line: 13, hot: true, vars: v("Delete(" + op.slot + ")", {}), info: !s ? "Слота №" + op.slot + " нет — удалять нечего" : "Слот №" + op.slot + " уже удалён" }));
          return;
        }
        s.state = "deleted";
        steps.push(snap({ line: 13, vars: v("Delete(" + op.slot + ")", { slot: op.slot }), info: "xmax проставлен: строка «" + s.name + "» невидима для новых транзакций, но её " + s.len + " Б всё ещё заняты — место вернёт только VACUUM" }));
      } else {
        var dead = slots.filter(function (x) { return x.state === "deleted"; });
        if (!dead.length) {
          steps.push(snap({ line: 16, hot: true, vars: v("Vacuum", {}), info: "Удалённых строк нет — чистить нечего" }));
          return;
        }
        dead.forEach(function (x) { x.state = "unused"; });
        steps.push(snap({ line: 16, vars: v("Vacuum", {}), info: "Указатели удалённых строк (" + dead.map(function (x) { return "№" + x.n; }).join(", ") + ") → unused" }));
        pack();
        steps.push(snap({ line: 17, hot: true, vars: v("Vacuum", {}), info: "compact: живые строки сдвинуты к концу страницы — upper вырос до " + upper() }));
        var before = slots.length;
        while (slots.length && slots[slots.length - 1].state === "unused") slots.pop();
        steps.push(snap({ line: 18, vars: v("Vacuum", {}), info: slots.length < before ? "Хвостовые unused-указатели отрезаны: lower уменьшился до " + lower() : "Хвоста из unused нет — lower не изменился (указатель в середине останется ждать новую строку)" }));
      }
    });
    steps.push(snap({ done: true, line: 19, vars: v("готово", {}), info: "Итог: " + slots.filter(function (x) { return x.state === "normal"; }).length + " живых строк, свободно " + (upper() - lower()) + " Б из " + pageSize }));
    return steps;
  }
  exportsForTest.bPgPage = bPgPage;
  exportsForTest.parseOps = parseOps;
```

- [ ] **Step 4: Тесты проходят** — Run: `node scripts/infra-viz-check.js` — Expected: все `✓`. Если расхождение арифметики (выравнивание на границе) — исправить генератор по сообщению, не тест: тесты посчитаны по формулам выше.

- [ ] **Step 5: Commit** — `git add assets/infra-viz.js scripts/infra-viz-check.js && git commit -m "infra-viz: генератор страницы Postgres bPgPage"`

---

### Task 4: Конфиг `pg-page`, отрисовка, стили, пресеты

**Files:**
- Modify: `assets/infra-viz.js`, `book.toml`
- Create: `assets/infra-viz.css`

**Interfaces:**
- Consumes: `bPgPage`, `parseOps` (Task 3), `window.ALGO_VIZ.register/mkEl` (Task 1).
- Produces: тип `data-viz="pg-page"` с полями ввода `data-ops`, `data-page`.

- [ ] **Step 1: Падающий тест** — в `scripts/infra-viz-check.js` добавить jsdom-блок (по образцу хука), который грузит `algo-viz.js` + `infra-viz.js`, разметку `<div class="algo-viz" data-viz="pg-page" data-ops="+a:2000,+b:2000,-1,vacuum"></div>`, жмёт `ArrowRight` 60 раз и проверяет: `algo-viz--ready`, нет «Ошибка визуализации», в тексте есть «Итог:» и `.iv-page` присутствует. Run → Expected FAIL «Неизвестный тип».

```js
{
  const html = `<!DOCTYPE html><html><body><div class="algo-viz" id="w" tabindex="0" data-viz="pg-page" data-ops="+a:2000,+b:2000,-1,vacuum"></div>
    <script>${read("algo-viz.js")}</script><script>${read("infra-viz.js")}</script></body></html>`;
  const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true });
  dom.window.document.dispatchEvent(new dom.window.Event("DOMContentLoaded"));
  const el = dom.window.document.getElementById("w");
  for (let i = 0; i < 60; i++) el.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
  eq("pg-page: построен без ошибок", el.classList.contains("algo-viz--ready") && !/Ошибка визуализации/.test(el.textContent), true);
  eq("pg-page: дошёл до итога", /Итог:/.test(el.textContent), true);
  eq("pg-page: рисунок страницы на месте", !!el.querySelector(".iv-page"), true);
}
```

- [ ] **Step 2: Реализация** — в `assets/infra-viz.js` после экспортов Task 3, до конца IIFE (переменная `H = window.ALGO_VIZ`):

```js
  var CODE_PG_PAGE = [
    "func (p *Page) Insert(data []byte) (int, bool) {",
    "    size := maxAlign(tupleHeader + len(data))",
    "    slot := p.firstUnused() // -1: свободного указателя нет",
    "    need := size + p.pointerCost(slot) // 4 байта, если слот новый",
    "    if need > p.upper-p.lower {",
    "        return 0, false // не влезло: строка уйдёт на другую страницу",
    "    }",
    "    p.upper -= size",
    "    p.setPointer(slot, p.upper)",
    "    copy(p.buf[p.upper:], data)",
    "    return slot, true",
    "}",
    "func (p *Page) Delete(slot int) {",
    "    p.tuple(slot).xmax = txid // помечена, но место НЕ освобождено",
    "}",
    "func (p *Page) Vacuum() {",
    "    p.freeDeadPointers() // указатель удалённой строки → unused",
    "    p.compact() // живые tuple сдвигаются к концу, upper растёт",
    "    p.truncateTrailingPointers() // хвост unused-указателей: lower уменьшается",
    "}"
  ];

  function pgPageViz(panel, ctx) {
    var H = window.ALGO_VIZ, size = ctx.page;
    var wrap = H.mkEl("div", "iv-page");
    panel.appendChild(wrap);
    function pct(b) { return Math.max(b / size * 100, 0.8) + "%"; }
    function seg(cls, bytes, label) { var e = H.mkEl("div", "iv-seg " + cls, label); e.style.flexBasis = pct(bytes); e.title = label + " · " + bytes + " Б"; return e; }
    return function (s) {
      wrap.innerHTML = "";
      var bar = H.mkEl("div", "iv-bar");
      bar.appendChild(seg("iv-seg--hdr", PAGE_HDR, "hdr"));
      s.slots.forEach(function (sl) { bar.appendChild(seg(sl.state === "unused" ? "iv-seg--unused" : "iv-seg--ptr", ITEM, "№" + sl.n)); });
      var freeBytes = s.upper - s.lower;
      bar.appendChild(seg("iv-seg--free", Math.max(freeBytes, 0), freeBytes > size * 0.06 ? "свободно " + freeBytes + " Б" : ""));
      var tuples = s.slots.filter(function (x) { return x.state !== "unused" && !x.ptrOnly && x.off; }).sort(function (a, b) { return a.off - b.off; });
      if (s.reserved && !tuples.some(function (t) { return t.off === s.reserved.off; })) bar.appendChild(seg("iv-seg--reserved", s.reserved.len, "резерв"));
      tuples.forEach(function (t) { bar.appendChild(seg(t.state === "deleted" ? "iv-seg--dead" : "iv-seg--tup", t.len, t.name + (t.state === "deleted" ? " ✗" : ""))); });
      wrap.appendChild(bar);
      var ruler = H.mkEl("div", "iv-ruler");
      ruler.appendChild(H.mkEl("span", "", "lower = " + s.lower));
      ruler.appendChild(H.mkEl("span", "iv-ruler__free", "← свободно " + freeBytes + " Б →"));
      ruler.appendChild(H.mkEl("span", "", "upper = " + s.upper));
      wrap.appendChild(ruler);
      var tbl = H.mkEl("table", "iv-slots");
      var head = H.mkEl("tr"); ["указатель", "состояние", "строка", "смещение", "байт"].forEach(function (h) { head.appendChild(H.mkEl("th", "", h)); });
      tbl.appendChild(head);
      var names = { normal: "живая", deleted: "удалена (xmax)", unused: "unused" };
      s.slots.forEach(function (sl) {
        var r = H.mkEl("tr", "iv-slots__" + sl.state);
        [sl.n, names[sl.state], sl.state === "unused" ? "—" : sl.name, sl.state === "unused" ? "—" : sl.off, sl.state === "unused" ? "—" : sl.len].forEach(function (c) { r.appendChild(H.mkEl("td", "", String(c))); });
        tbl.appendChild(r);
      });
      if (!s.slots.length) { var er = H.mkEl("tr"); var td = H.mkEl("td", "", "указателей нет"); td.colSpan = 5; er.appendChild(td); tbl.appendChild(er); }
      wrap.appendChild(tbl);
    };
  }

  window.ALGO_VIZ.register("pg-page", {
    badge: "Postgres · страница 8 КБ",
    desc: "Страница кучи Postgres: заголовок, массив указателей (растёт сверху вниз) и строки (растут снизу вверх). Между ними — свободное место. DELETE место не освобождает — это делает VACUUM.",
    valuesLabel: "", codeKey: "pg-page", fillRange: false,
    complexity: { time: "вставка O(1)", space: "8192 Б на страницу", good: "★ 1 чтение = 1 страница" },
    varOrder: ["op", "size", "slot", "need", "lower", "upper"],
    varDesc: { op: "Операция", size: "Размер строки (выровнено до 8)", slot: "Слот (указатель)", need: "Сколько байт нужно", lower: "Конец массива указателей", upper: "Начало зоны строк" },
    lineNotes: { 1: "Заголовок tuple 24 Б + данные, округление вверх до кратного 8", 2: "Ищем освободившийся указатель — переиспользуем", 3: "Новый указатель стоит ещё 4 байта", 4: "Хватит ли места между lower и upper?", 5: "Нет — строка уедет на другую страницу", 7: "Зона строк растёт вниз-вверх: upper уменьшается", 8: "Указатель записан; lower растёт, если слот новый", 9: "Сами байты строки — по смещению upper", 13: "DELETE лишь ставит xmax: байты остаются", 16: "Указатель удалённой строки освобождается", 17: "Живые строки сдвигаются, место объединяется", 18: "Хвост неиспользуемых указателей отрезается" },
    rules: [{ head: "указатели", body: "растут сверху", cls: "eq" }, { head: "строки", body: "растут снизу", cls: "gt" }, { head: "DELETE", body: "место не возвращает", cls: "lt" }],
    legend: [{ cls: "iv-seg--hdr", label: "заголовок страницы (24 Б)" }, { cls: "iv-seg--ptr", label: "указатель на строку (4 Б)" }, { cls: "iv-seg--tup", label: "живая строка" }, { cls: "iv-seg--dead", label: "удалена, место занято" }, { cls: "iv-seg--free", label: "свободное место" }],
    presets: [
      { label: "пример главы", set: { "data-ops": "+a:2000,+b:2000,+c:2000,+d:2000,+e:2000", "data-page": "8192" }, hint: "4 строки влезли, пятая — нет" },
      { label: "узкие строки", set: { "data-ops": "+a:100,+b:100,+c:100,+d:100,+e:100,+f:100", "data-page": "8192" }, hint: "указатели тоже стоят места" },
      { label: "DELETE без VACUUM", set: { "data-ops": "+a:2000,+b:2000,+c:2000,-1,-2,+d:2000,+e:2000", "data-page": "8192" }, hint: "удалённое место не вернулось" },
      { label: "DELETE + VACUUM", set: { "data-ops": "+a:2000,+b:2000,+c:2000,-1,-2,vacuum,+d:2000,+e:2000", "data-page": "8192" }, hint: "после VACUUM место снова есть" },
      { label: "впритык", set: { "data-ops": "+a:2000,+b:2000,+c:2000,+d:2056", "data-page": "8192" }, hint: "free = 0, но влезло" }
    ],
    parse: function (root) {
      var page = parseInt(root.getAttribute("data-page"), 10);
      if (!(page >= 256)) page = 8192;
      var ops = parseOps(root.getAttribute("data-ops") || "+a:2000,+b:2000,+c:2000,+d:2000,+e:2000", page);
      return { ops: ops, page: page, steps: bPgPage(ops, page) };
    },
    inputs: [{ attr: "data-ops", label: "Операции (+имя:байты, -слот, vacuum)" }, { attr: "data-page", label: "Размер страницы" }],
    values: function () { return []; },
    title: function (ctx) { return "Страница " + ctx.page + " Б, " + ctx.ops.length + " операций"; },
    pointers: function () { return { lo: -1, hi: -1 }; },
    sumCells: ["Операция", "lower", "upper"],
    sumValues: function (s) { return [{ text: s.vars.op, cls: "gt" }, { text: s.vars.lower }, { text: s.vars.upper }]; },
    status: function (s, idx, total) { if (s.done) return { kind: "ok", icon: "✓", head: "Готово", text: s.info }; return { kind: "info", hot: !!s.hot, icon: idx + 1, head: s.hot ? "Внимание" : "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
    stepCard: function (s) { return { a: s.vars.op, b: "lower " + s.vars.lower, c: "upper " + s.vars.upper, cls: "gt" }; },
    varsOf: function (s) { return { op: s.vars.op, size: s.vars.size, slot: s.vars.slot, need: s.vars.need, lower: s.vars.lower, upper: s.vars.upper }; },
    customViz: pgPageViz
  }, CODE_PG_PAGE);
```

Важно: в конфиге-записи для `check-viz.js` отступ ключа — 4 пробела (`    "pg-page": {`). Поэтому вместо вызова `register("pg-page", {…}, CODE_PG_PAGE)` оформить так: `var INFRA = {` с записями `    "pg-page": {…},` (4 пробела), `var CODE = {` с записью `    "pg-page": [...]` и в конце `Object.keys(INFRA).forEach(function (t) { window.ALGO_VIZ.register(t, INFRA[t], CODE[INFRA[t].codeKey]); });`. Привести код выше к этой форме (переименовать `CODE_PG_PAGE` в запись `CODE`, объект конфига — в запись `INFRA`; блоки закрывать `\n  };` на отступе в 2 пробела, как в `algo-viz.js`).

Создать `assets/infra-viz.css`:

```css
.iv-page { --iv-hdr:#64748b; --iv-ptr:#2563eb; --iv-tup:#16a34a; --iv-dead:#dc2626; --iv-free:#e2e8f0; --iv-unused:#94a3b8; --iv-res:#f59e0b; --iv-fg:#0f172a; --iv-bd:#cbd5e1; }
.coal .iv-page, .navy .iv-page, .ayu .iv-page { --iv-free:#1e293b; --iv-fg:#e2e8f0; --iv-bd:#334155; --iv-hdr:#94a3b8; }
.iv-bar { display:flex; width:100%; height:52px; border:1px solid var(--iv-bd); border-radius:6px; overflow:hidden; }
.iv-seg { flex:0 0 auto; min-width:2px; display:flex; align-items:center; justify-content:center; font:600 11px/1 system-ui,sans-serif; color:#fff; overflow:hidden; white-space:nowrap; border-right:1px solid rgba(255,255,255,.35); }
.iv-seg--hdr { background:var(--iv-hdr); } .iv-seg--ptr { background:var(--iv-ptr); } .iv-seg--tup { background:var(--iv-tup); }
.iv-seg--dead { background:var(--iv-dead); text-decoration:line-through; } .iv-seg--unused { background:var(--iv-unused); }
.iv-seg--reserved { background:repeating-linear-gradient(45deg,var(--iv-res),var(--iv-res) 6px,#fbbf24 6px,#fbbf24 12px); color:#000; }
.iv-seg--free { flex-grow:1; background:var(--iv-free); color:var(--iv-fg); border-right:0; }
.iv-ruler { display:flex; justify-content:space-between; margin:6px 0 10px; font:12px/1.2 ui-monospace,monospace; color:var(--iv-fg); }
.iv-slots { width:100%; border-collapse:collapse; font-size:13px; }
.iv-slots th,.iv-slots td { border:1px solid var(--iv-bd); padding:3px 8px; text-align:left; }
.iv-slots__deleted td { color:var(--iv-dead); } .iv-slots__unused td { color:var(--iv-unused); }
@media (max-width:520px) { .iv-bar { height:44px; } .iv-seg { font-size:10px; } .iv-slots { font-size:12px; } }
```

В `book.toml` `additional-css` добавить `"assets/infra-viz.css"`.

- [ ] **Step 3:** Run: `node scripts/infra-viz-check.js && node scripts/check-viz.js && node scripts/predict-check.js` — Expected: зелёные. При расхождении правил `check-viz.js` (легенда: правило 5 касается неоновых без `customViz` — у нас `customViz`, не применяется) подправить конфиг по тексту ошибки.

- [ ] **Step 4: Живая проверка** — `mdbook build && mdbook serve`, открыть главу (после Task 5), нажать все 5 пресетов, прошагать до конца, проверить в тёмной теме (navy) и при ширине 360 px.

- [ ] **Step 5: Commit** — `git add assets book.toml scripts && git commit -m "infra-viz: виджет pg-page (страница Postgres 8 КБ)"`

---

### Task 5: Сверка с настоящим Postgres и глава «Как Postgres хранит данные»

**Files:**
- Create: `src/postgres-storage.md`
- Modify: `src/SUMMARY.md` (перед «🐘 Postgres: EXPLAIN как pprof» в Группе 8), `assets/progress.js:98` (добавить строку главы перед `postgres-plans.html`, `lvl: "ext"`), `src/postgres-plans.md` (в «Связанные главы» ссылка на новую)

- [ ] **Step 1: Сверка модели с живой страницей.** Run: `make pg-lab`, затем `make pg-psql` и:

```sql
CREATE EXTENSION IF NOT EXISTS pageinspect;
DROP TABLE IF EXISTS pg_page_demo;
CREATE TABLE pg_page_demo (id int, pad text);
ALTER TABLE pg_page_demo ALTER COLUMN pad SET STORAGE PLAIN;
ALTER TABLE pg_page_demo SET (autovacuum_enabled = off);
-- text длиной 1996 символов: varlena-заголовок 4 Б, значит данных 2000 Б вместе с int (4 Б) = 2004 → tuple 24+2004=2028 → maxAlign 2032
INSERT INTO pg_page_demo SELECT g, repeat('x', 1996) FROM generate_series(1,4) g;
SELECT lower, upper, upper-lower AS free FROM page_header(get_raw_page('pg_page_demo', 0));
SELECT lp, lp_off, lp_len, lp_flags FROM heap_page_items(get_raw_page('pg_page_demo', 0));
```

Сверить с формулами модели (`size = maxAlign(24 + data)`): подобрать `repeat('x', N)` так, чтобы `data = 4 (int) + 4 (varlena) + N` совпал с входом виджета; ожидаемо `lower = 24 + 4·rows`, `upper = 8192 − Σ maxAlign(lp_len)`. Затем `DELETE FROM pg_page_demo WHERE id IN (1,2);` — `lp_flags` остаются 1, `upper` не меняется; `VACUUM pg_page_demo;` — у удалённых `lp_flags = 0`, `upper` вырос. Записать реальные числа. **Если что-то не совпало с моделью** (например, `lower` после VACUUM или судьба указателя в середине) — исправить `bPgPage` и тесты Task 3, а не текст: «число не воспроизвелось — объяснение не пишем» (feedback_verification_rigor).

- [ ] **Step 2: Написать главу.** Файл `src/postgres-storage.md`; тон и структура — как у ядра книги (простым языком, аналогия до определения). Обязательные разделы:
  1. `# 🗂️ Как Postgres хранит данные: страница, строка, указатель` — зачем: индекс и `EXPLAIN` из следующей главы говорят «прочитано N страниц»; здесь выясняем, что это такое.
  2. «Аналогия: книга с оглавлением вверху и текстом снизу» → страница 8 КБ как тетрадный лист; чтение с диска всегда целыми страницами.
  3. «Из чего состоит страница» — заголовок 24 Б, массив указателей по 4 Б (`lp`), строки с конца; `lower`/`upper`; виджет `<div class="algo-viz" data-viz="pg-page" data-ops="+a:2000,+b:2000,+c:2000,+d:2000,+e:2000" data-page="8192"></div>` с абзацем: что смотреть (почему пятая строка не влезла: нужно 2028 Б при свободных 56 Б).
  4. «Строка внутри: заголовок tuple 24 Б, выравнивание до 8» с цифрами из сверки Step 1.
  5. «`DELETE` ничего не освобождает» — виджет с пресетом «DELETE + VACUUM» (второй `<div>` с `data-ops="+a:2000,+b:2000,+c:2000,-1,-2,vacuum,+d:2000,+e:2000"`), связь с `xmax` и будущей главой про MVCC.
  6. «Посмотри сам» — SQL из Step 1 с реальным выводом.
  7. «⚠️ Типичные ошибки» (`SELECT *` читает те же страницы, что и узкий запрос; удалил миллион строк — файл не уменьшился), «🧩 Задачи» (3 упражнения: рассчитать, сколько строк по 100 Б влезет на страницу и сверить с `pageinspect`; и т.п.), «🔗 Связанные главы» (`postgres-plans`, `btree-structure`, `hash-table-structure`).

Строки листингов `go` в главе — только настоящие (проходят `checksnippets`), псевдокод помечать `<!-- snippet:pseudo -->`.

- [ ] **Step 3: Оглавление и реестры.** Добавить строку `- [🗂️ Как Postgres хранит данные: страница, строка, указатель](postgres-storage.md)` в `src/SUMMARY.md` перед `postgres-plans.md`; в `assets/progress.js` рядом с записью `postgres-plans.html` — `{ t: "Как Postgres хранит данные", h: "postgres-storage.html", lvl: "ext" },`.

- [ ] **Step 4: Полный прогон как в CI** — из корня: `mdbook build && node scripts/check-links.js && node scripts/check-registries.js && node scripts/check-viz.js && node scripts/viz-render-check.js && node scripts/predict-check.js && node scripts/check-viz-names.js && node scripts/progress-render-check.js && node scripts/infra-viz-check.js`; из `exercises/`: `gofmt -l . && go run ./cmd/checksnippets -src ../src`. Expected: всё зелёное, jsdom установлен (иначе скрипты «мягко пропускаются» — это не успех).

- [ ] **Step 5: Живая проверка в браузере** — все 5 пресетов нажать, прошагать до конца, прочитать итоговые статусы; режим 🎯 на `if need > …`; тёмная тема navy; 360 px; стрелки ←/→ не листают главу (`stopPropagation`).

- [ ] **Step 6: Commit** — `git add src assets scripts && git commit -m "Глава «Как Postgres хранит данные» и виджет страницы"`

---

## Self-review

- **Покрытие спеки (этот план):** хук + `infra-viz.js` (T1), проверки читают новый файл (T2), виджет `pg-page` из списка Postgres (T3–T4), глава «Как Postgres хранит данные» + сверка с `pglab/` + реестры + полный прогон + живая проверка (T5). Остальные виджеты и Redis/Kafka — следующие планы по тому же рецепту, это оговорено в шапке.
- **Типы/имена:** `bPgPage`, `parseOps`, `maxAlign`, `PAGE_HDR/ITEM/TUP_HDR`, `register/mkEl`, поля шага `slots/lower/upper/reserved/vars` — едины в T1–T4. Номера строк листинга (0–19) совпадают в T3 (`line`), T4 (`lineNotes`, `CODE`).
- **Известный риск:** конфиг `register` в T1 использует минимальный набор полей; `buildDashboard` может требовать больше — тест в Step 4 T1 подскажет, дописывать поля в тест.
- **Review Focus:** п.1–3 покрыты тестами T3 (граница, удаление несуществующего, vacuum на пустой); п.4 — тестом парсера; п.5 — правилом 4 `check-viz.js` (T4 Step 3).
