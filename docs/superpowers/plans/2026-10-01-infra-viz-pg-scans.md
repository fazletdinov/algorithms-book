# Infra-viz: виджеты «Как Postgres читает таблицу» (`pg-scan-seq` / `pg-scan-index` / `pg-scan-bitmap`) — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Показать пошагово, почему «5% строк» читают почти всю таблицу, а «80% строк» отдаёт Seq Scan: три способа прочитать одни и те же подходящие строки (Seq / Index / Bitmap) на одной маленькой таблице, с подсчётом чтений страниц; числа модели сверены с живым Postgres.

**Architecture:** Три типа виджета на одном генераторе-состоянии и одном рисунке (сетка страниц × строк), у каждого свой листинг Go. Строятся на уже слитой инфраструктуре: `window.ALGO_VIZ.register`, файл `assets/infra-viz.js` (формат `INFRA`/`CODE`, 4 пробела), проверки читают его. В главе показываются вкладками `algo-viz-tabs` (три `div.algo-viz` рядом — механизм движка уже есть).

**Tech Stack:** vanilla JS/SVG-free DOM, mdBook, jsdom (`npm i --no-save jsdom`), Postgres 16 из `pglab/` (`make pg-lab`) для сверки, Playwright MCP для проверки в браузере.

**Spec:** `docs/superpowers/specs/2026-10-01-infra-visualization-design.md` (виджет `pg-scan-kinds` из списка Postgres; здесь он разбит на три типа по способам скана). Предыдущий план: `docs/superpowers/plans/2026-10-01-infra-viz-foundation-pg-page.md` (слит).

## Global Constraints

- Язык контента русский, код листингов Go (спека).
- Виджеты строятся на движке `algo-viz.js` без сборщика; новые типы живут в `assets/infra-viz.js` (формат: записи `    "тип": {` с отступом 4 пробела в `var INFRA = {`, листинги в `var CODE = {`, оба блока закрываются `\n  };`, регистрация `Object.keys(INFRA).forEach(...)` в конце; генераторы — ДО строки-стража `if (typeof window === "undefined" || !window.ALGO_VIZ) return;` и экспортируются через `exportsForTest`).
- Числа и поведение сверяются с реальным Postgres; живая база — авторитет: если модель расходится, чинится модель (урок плана 1: pageinspect опроверг три допущения). «Непроверенное не утверждается».
- Правила генераторов (CLAUDE.md): снимок = состояние ПОСЛЕ подсвеченной строки; одна строка листинга — один кадр; чип — только переменная, живая на этой строке («—» до объявления); имя чипа = идентификатор из листинга; пресет задаёт РОВНО поля `inputs` типа (`check-viz.js` правило 4); у типов без неонового массива (`customViz`) легенда не проверяется, но нужна.
- `register` бросает на дубликате типа или `codeKey` — имена `pg-scan-seq`, `pg-scan-index`, `pg-scan-bitmap` и ключи листингов уникальны.
- Критерии готовности: `node scripts/infra-viz-check.js`, `check-viz.js`, `check-registries.js`, `mdbook build` + `check-links.js`, `viz-render-check.js` (~25 мин), `check-viz-names.js` (~8 мин), `predict-check.js`, `gofmt`/`checksnippets` из `exercises/` — зелёные; jsdom-скрипты в фоне; soft-skip ≠ pass.
- Контекст среды: `main` опережает `origin` — ничего не пушить без явного слова пользователя; работать в worktree (`.worktrees/`, в `.gitignore`).

## Review Focus

1. Индекс-скан не перечитывает страницу, если следующая строка лежит на той же странице подряд, но перечитывает, если к ней вернулись позже (счётчик `×2`): граница «подряд» против «позже».
2. Пустой набор совпадений (`data-match=""` или все id вне таблицы): все три типа дочитывают до итога без ошибок; Seq всё равно читает все страницы, Index/Bitmap — ноль.
3. Дубликаты и выход за пределы таблицы в `data-match` отбрасываются молча, но порядок оставшихся (порядок ключа индекса) сохраняется.
4. `data-pages`/`data-rows` вне [1..24]/[1..16] или нечисловые — клампятся/по умолчанию, вёрстка не ломается на 360 px.
5. Пресет задаёт ровно поля ввода (`data-pages`, `data-rows`, `data-match`) у каждого из трёх типов.

## File Structure

| Файл | Ответственность |
|---|---|
| `assets/infra-viz.js` (изменить) | `parseMatch`, `bScanSeq/bScanIndex/bScanBitmap`, отрисовка `scanViz`, записи INFRA (3) и CODE (3) |
| `assets/infra-viz.css` (изменить) | стили сетки страниц (`.iv-scan*`, токены `--iv-*`, тёмные темы, ≤520px) |
| `scripts/infra-viz-check.js` (изменить) | node-тесты генераторов и jsdom-тесты трёх типов |
| `src/postgres-plans.md` (изменить) | раздел с тремя вкладками после абзаца про «5% строк» + «что смотреть» |
| `CLAUDE.md` (изменить) | одна строка: новые типы и модель сканов |

---

### Task 1: Генераторы сканов (чистые функции, node-тесты)

**Files:**
- Modify: `assets/infra-viz.js` (после `bPgPage`, до строки-стража `if (typeof window ...`), `scripts/infra-viz-check.js`

**Interfaces:**
- Produces (экспорт `exportsForTest`): `parseMatch(str, total) → number[]` (id строк в порядке КЛЮЧА индекса), `bScanSeq(P, R, matches)`, `bScanIndex(P, R, matches)`, `bScanBitmap(P, R, matches)` → `steps[]`.
- Модель таблицы: `P` страниц по `R` строк; строка `r` (0 … P·R−1) лежит на странице `Math.floor(r / R)`, слот `r % R`. `matches` — список id подходящих строк В ПОРЯДКЕ КЛЮЧА индекса (то, что вернёт `idx.Lookup`).
- Токены `data-match` (через запятую): число `N` — одна строка; `a-b` — диапазон по возрастанию («кластеризованные»); `rK` — K различных псевдослучайных строк в псевдослучайном порядке (детерминированно: mulberry32, сид `total*31+K`).
- Шаг: `{ P, R, line, vars, info, hot?, done?, reads:number[P], bits:boolean[P], found:number[], cur:number, total:number, tid:{page,slot}|null, mark:number|null }` (`mark` — страница, к которой относится кадр, для подсветки).
- Листинги (индексы строк — для `line`):
  - **Seq (0–7):** 0 `func SeqScan(t *Table, pred Pred) []Row {` · 1 `var out []Row` · 2 `for page := 0; page < t.Pages; page++ { // ВСЕ страницы подряд` · 3 `buf := t.ReadPage(page) // +1 чтение страницы` · 4 `out = append(out, buf.Match(pred)...) // проверяем все строки страницы` · 5 `}` · 6 `return out` · 7 `}`.
  - **Index (0–11):** 0 `func IndexScan(idx *Index, t *Table, key Range) []Row {` · 1 `var out []Row` · 2 `cur := -1 // страница, закреплённая в буфере` · 3 `for _, tid := range idx.Lookup(key) { // ctid в порядке КЛЮЧА, не страниц` · 4 `if tid.Page != cur {` · 5 `t.ReadPage(tid.Page) // +1 чтение` · 6 `cur = tid.Page` · 7 `}` · 8 `out = append(out, t.Row(tid))` · 9 `}` · 10 `return out` · 11 `}`.
  - **Bitmap (0–11):** 0 `func BitmapScan(idx *Index, t *Table, key Range) []Row {` · 1 `bitmap := map[int]bool{}` · 2 `for _, tid := range idx.Lookup(key) {` · 3 `bitmap[tid.Page] = true // запомнили только НОМЕР страницы` · 4 `}` · 5 `var out []Row` · 6 `for _, page := range sortedKeys(bitmap) { // страницы по возрастанию` · 7 `buf := t.ReadPage(page) // каждая страница ровно один раз` · 8 `out = append(out, buf.Recheck(key)...)` · 9 `}` · 10 `return out` · 11 `}`.
- Кадры (после какой строки какое состояние):
  - Seq: line 1 (старт, vars `{page:"—"}`); для каждой страницы p: line 2 (`page=p`, `cur` не меняется), line 3 (`reads[p]++`, `total++`, `cur=p`), line 4 (`found` дополняется подходящими строками страницы p); в конце line 6 (`done`).
  - Index: line 1, line 2 (`cur=-1`); для каждого id в `matches`: line 3 (`tid` выбран), line 4 (`if`, кадр без изменений состояния), если `page != cur`: line 5 (`reads[page]++`, `total++`), line 6 (`cur=page`); затем line 8 (`found.push(id)`); в конце line 10 (`done`).
  - Bitmap: line 1; для каждого id: line 2 (`tid`), line 3 (`bits[page]=true`); line 5; для каждой отмеченной страницы по возрастанию: line 6 (`page`), line 7 (`reads[page]++`, `total++`), line 8 (`found` += подходящие строки страницы, в порядке физическом); line 10 (`done`).
- Чипы (`vars`): Seq `{page}`; Index `{tid, cur}`; Bitmap `{tid, page}`; значение `tid` — строка `"(страница,слот)"`, до объявления `"—"`, `cur` до присваивания `-1` как число.

- [ ] **Step 1: Падающие тесты** — в `scripts/infra-viz-check.js` перед `process.exit` добавить (теги: `infra = require(".../assets/infra-viz.js")` и функции `eq`, `last` уже есть выше):

```js
// --- сканы таблицы ---
{
  const P = 12, R = 8, total = P * R;
  const pg = (r) => Math.floor(r / R);
  const transitions = (list) => list.reduce((n, r, i) => n + (i === 0 || pg(r) !== pg(list[i - 1]) ? 1 : 0), 0);
  const distinct = (list) => new Set(list.map(pg)).size;
  const cases = {
    scattered: infra.parseMatch("r5", total),
    clustered: infra.parseMatch("0-4", total),
    many: infra.parseMatch("r67", total),
    revisit: [3, 40, 4, 41]       // страница 0, страница 5, снова 0 (перечитывается), снова 5
  };
  eq("parseMatch: r5 — 5 различных строк в пределах таблицы", [cases.scattered.length, new Set(cases.scattered).size, cases.scattered.every((r) => r >= 0 && r < total)], [5, 5, true]);
  eq("parseMatch: r5 детерминирован", infra.parseMatch("r5", total), cases.scattered);
  eq("parseMatch: диапазон, дубликаты и выход за таблицу", infra.parseMatch("2-4,3,999,x,2", total), [2, 3, 4]);
  eq("parseMatch: пусто", infra.parseMatch("", total), []);
  Object.keys(cases).forEach((name) => {
    const m = cases[name];
    eq(`seq(${name}): читает все ${P} страниц`, last(infra.bScanSeq(P, R, m)).total, P);
    eq(`seq(${name}): находит все подходящие строки`, last(infra.bScanSeq(P, R, m)).found.slice().sort((a, b) => a - b), m.slice().sort((a, b) => a - b));
    eq(`index(${name}): чтений = число смен страницы подряд`, last(infra.bScanIndex(P, R, m)).total, transitions(m));
    eq(`index(${name}): строки в порядке ключа`, last(infra.bScanIndex(P, R, m)).found, m);
    eq(`bitmap(${name}): чтений = число различных страниц`, last(infra.bScanBitmap(P, R, m)).total, distinct(m));
    eq(`bitmap(${name}): каждая страница не больше одного раза`, Math.max.apply(null, last(infra.bScanBitmap(P, R, m)).reads), Math.min(1, distinct(m)));
  });
  eq("index(revisit): возврат на ту же страницу позже — перечитывание ×2", last(infra.bScanIndex(P, R, cases.revisit)).reads[0], 2);
  eq("index(revisit): подряд на одной странице не перечитывается", infra.bScanIndex(P, R, [0, 1, 2]).filter((s) => s.line === 5).length, 1);
  eq("пустой набор: seq читает всё, index/bitmap — ничего", [last(infra.bScanSeq(P, R, [])).total, last(infra.bScanIndex(P, R, [])).total, last(infra.bScanBitmap(P, R, [])).total], [P, 0, 0]);
  eq("все кадры index: line из листинга 0–11, последний done", [infra.bScanIndex(P, R, cases.many).every((s) => s.line >= 0 && s.line <= 11), !!last(infra.bScanIndex(P, R, cases.many)).done], [true, true]);
  eq("index: кадр if (line 4) после выбора tid (line 3) всегда", infra.bScanIndex(P, R, cases.scattered).every((s, i, a) => s.line !== 4 || a[i - 1].line === 3), true);
  eq("bitmap: страницы читаются по возрастанию", infra.bScanBitmap(P, R, cases.many).filter((s) => s.line === 7).map((s) => s.mark), infra.bScanBitmap(P, R, cases.many).filter((s) => s.line === 7).map((s) => s.mark).slice().sort((a, b) => a - b));
}
```

- [ ] **Step 2: Падение** — Run: `node scripts/infra-viz-check.js` — Expected: FAIL `infra.parseMatch is not a function`.

- [ ] **Step 3: Реализация** — в `assets/infra-viz.js` после `bPgPage` (перед стражем) вставить:

```js
  // ===== Сканы таблицы: Seq / Index / Bitmap ===================================
  // Модель: P страниц по R строк; строка r лежит на странице floor(r/R). matches — id подходящих
  // строк в порядке КЛЮЧА индекса: именно в этом порядке idx.Lookup отдаёт ctid. Планировщик и
  // стоимость не моделируются — только «сколько раз прочитали страницу таблицы».
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function shuffled(n, seed) {
    var a = [], rnd = mulberry32(seed), i, j, k, t;
    for (i = 0; i < n; i++) a.push(i);
    for (j = n - 1; j > 0; j--) { k = Math.floor(rnd() * (j + 1)); t = a[j]; a[j] = a[k]; a[k] = t; }
    return a;
  }
  // Токены через запятую: N | a-b | rK (K псевдослучайных строк в псевдослучайном порядке).
  function parseMatch(str, total) {
    var out = [], seen = {};
    function add(r) { if (r >= 0 && r < total && !seen[r]) { seen[r] = true; out.push(r); } }
    String(str || "").split(",").forEach(function (raw) {
      var t = raw.trim(), m = /^(\d+)-(\d+)$/.exec(t);
      if (m) { for (var r = +m[1]; r <= +m[2] && r < total; r++) add(r); return; }
      m = /^r(\d+)$/.exec(t);
      if (m) { shuffled(total, total * 31 + +m[1]).slice(0, +m[1]).forEach(function (x) { add(x); }); return; }
      if (/^\d+$/.test(t)) add(+t);
    });
    return out;
  }

  // Общее состояние сканирования: snap() копирует всё, что рисуется, поэтому кадры не делят ссылок.
  function scanState(P, R) {
    var st = { P: P, R: R, reads: [], bits: [], found: [], cur: -1, total: 0, steps: [] };
    for (var i = 0; i < P; i++) { st.reads.push(0); st.bits.push(false); }
    st.read = function (page) { st.reads[page]++; st.total++; };
    st.snap = function (line, vars, info, extra) {
      var s = { P: P, R: R, line: line, vars: vars, info: info, reads: st.reads.slice(), bits: st.bits.slice(), found: st.found.slice(), cur: st.cur, total: st.total, tid: null, mark: null };
      for (var k in extra) s[k] = extra[k];
      st.steps.push(s);
    };
    return st;
  }
  function tidOf(r, R) { return { page: Math.floor(r / R), slot: r % R }; }
  function tidText(t) { return "(" + t.page + "," + t.slot + ")"; }
  function rowsOnPage(page, R, matchSet) { var out = []; for (var s = 0; s < R; s++) if (matchSet[page * R + s]) out.push(page * R + s); return out; }
  function matchSetOf(matches) { var m = {}; matches.forEach(function (r) { m[r] = true; }); return m; }
  function plural(n, one, few, many) { var a = n % 100, b = n % 10; return (a >= 11 && a <= 14) ? many : b === 1 ? one : (b >= 2 && b <= 4) ? few : many; }
  function pages(n) { return n + " " + plural(n, "страница", "страницы", "страниц"); }

  function bScanSeq(P, R, matches) {
    var st = scanState(P, R), ms = matchSetOf(matches);
    st.snap(1, { page: "—" }, "Таблица: " + pages(P) + " по " + R + " строк. Подходящих строк: " + matches.length + ". Seq Scan читает ВСЕ страницы подряд — без индекса.");
    for (var p = 0; p < P; p++) {
      st.snap(2, { page: p }, "page = " + p, { mark: p });
      st.read(p); st.cur = p;
      st.snap(3, { page: p }, "ReadPage(" + p + "): страница целиком в буфере. Чтений: " + st.total + " из " + P, { mark: p });
      var here = rowsOnPage(p, R, ms);
      here.forEach(function (r) { st.found.push(r); });
      st.snap(4, { page: p }, here.length ? "Проверили " + R + " строк, подошло: " + here.length + " (всего найдено " + st.found.length + ")" : "Проверили " + R + " строк — ни одна не подошла, но страницу уже прочитали", { mark: p });
    }
    st.snap(6, { page: P - 1 }, "Итог: " + pages(st.total) + " прочитано ради " + st.found.length + " строк. Не зависит от того, сколько строк подошло.", { done: true });
    return st.steps;
  }

  function bScanIndex(P, R, matches) {
    var st = scanState(P, R);
    st.snap(1, { tid: "—", cur: "—" }, "Index Scan: индекс отдаёт ctid подходящих строк в порядке КЛЮЧА, а строки таблицы лежат как попало.");
    st.snap(2, { tid: "—", cur: -1 }, "cur = −1: в буфере пока ни одной страницы таблицы");
    matches.forEach(function (r) {
      var t = tidOf(r, R), tt = tidText(t), fresh = t.page !== st.cur;
      st.snap(3, { tid: tt, cur: st.cur }, "Следующий ctid из индекса: " + tt + " — страница " + t.page + ", слот " + t.slot, { tid: t, mark: t.page });
      st.snap(4, { tid: tt, cur: st.cur }, fresh ? "tid.Page (" + t.page + ") ≠ cur (" + st.cur + ") — страницу придётся читать" : "tid.Page = cur = " + st.cur + " — страница уже в буфере, читать не нужно", { tid: t, mark: t.page });
      if (fresh) {
        var again = st.reads[t.page] > 0;
        st.read(t.page);
        st.snap(5, { tid: tt, cur: st.cur }, "ReadPage(" + t.page + ")" + (again ? " — ПОВТОРНО (×" + st.reads[t.page] + "): к этой странице уже ходили, но между обращениями индекс уводил на другие" : "") + ". Чтений: " + st.total, { tid: t, mark: t.page });
        st.cur = t.page;
        st.snap(6, { tid: tt, cur: st.cur }, "cur = " + t.page, { tid: t, mark: t.page });
      }
      st.found.push(r);
      st.snap(8, { tid: tt, cur: st.cur }, "Строка " + tt + " добавлена в результат (" + st.found.length + " из " + matches.length + ")", { tid: t, mark: t.page });
    });
    st.snap(10, { tid: "—", cur: st.cur }, "Итог: " + pages(st.total) + " прочитано ради " + matches.length + " строк" + (st.total > P ? " — БОЛЬШЕ, чем в таблице (" + P + ")" : "") + ".", { done: true });
    return st.steps;
  }

  function bScanBitmap(P, R, matches) {
    var st = scanState(P, R), ms = matchSetOf(matches);
    st.snap(1, { tid: "—", page: "—" }, "Bitmap Scan: сначала по индексу собираем карту нужных страниц, потом читаем страницы по порядку.");
    matches.forEach(function (r) {
      var t = tidOf(r, R), tt = tidText(t), had = st.bits[t.page];
      st.snap(2, { tid: tt, page: "—" }, "Следующий ctid из индекса: " + tt, { tid: t, mark: t.page });
      st.bits[t.page] = true;
      st.snap(3, { tid: tt, page: "—" }, had ? "Бит страницы " + t.page + " уже стоит — порядок ключа забыт, повтор ничего не стоит" : "bitmap[" + t.page + "] = true: запомнили только номер страницы", { tid: t, mark: t.page });
    });
    var set = []; st.bits.forEach(function (b, i) { if (b) set.push(i); });
    st.snap(5, { tid: "—", page: "—" }, "Карта готова: нужных страниц " + set.length + " из " + P);
    set.forEach(function (p) {
      st.snap(6, { tid: "—", page: p }, "Следующая страница по возрастанию: " + p, { mark: p });
      st.read(p); st.cur = p;
      st.snap(7, { tid: "—", page: p }, "ReadPage(" + p + ") — ровно один раз. Чтений: " + st.total, { mark: p });
      var here = rowsOnPage(p, R, ms);
      here.forEach(function (r) { st.found.push(r); });
      st.snap(8, { tid: "—", page: p }, "Recheck: из " + R + " строк подошло " + here.length + " (найдено " + st.found.length + ")", { mark: p });
    });
    st.snap(10, { tid: "—", page: set.length ? set[set.length - 1] : "—" }, "Итог: " + pages(st.total) + " прочитано ради " + matches.length + " строк — каждая нужная страница по одному разу, никогда больше " + P + ".", { done: true });
    return st.steps;
  }
  exportsForTest.parseMatch = parseMatch;
  exportsForTest.bScanSeq = bScanSeq;
  exportsForTest.bScanIndex = bScanIndex;
  exportsForTest.bScanBitmap = bScanBitmap;
```

- [ ] **Step 4: Тесты проходят** — Run: `node scripts/infra-viz-check.js && node --check assets/infra-viz.js` — Expected: все `✓`. Если сообщение расходится с ожиданием из-за арифметики теста — перепроверить формулы выше вручную, а не подгонять код под тест.

- [ ] **Step 5: Commit** — `git add assets/infra-viz.js scripts/infra-viz-check.js && git commit -m "infra-viz: генераторы сканов Seq/Index/Bitmap"`

---

### Task 2: Три типа виджета, рисунок, стили, пресеты

**Files:**
- Modify: `assets/infra-viz.js` (после `window.ALGO_VIZ`-стража, в блоки `INFRA` и `CODE`), `assets/infra-viz.css`, `scripts/infra-viz-check.js`

**Interfaces:**
- Consumes: `parseMatch`, `bScanSeq/Index/Bitmap` (Task 1), `window.ALGO_VIZ.mkEl`, общие помощники (`pages`).
- Produces: типы `pg-scan-seq`, `pg-scan-index`, `pg-scan-bitmap` с полями ввода `data-pages` (1–24, по умолчанию 12), `data-rows` (1–16, по умолчанию 8), `data-match` (по умолчанию `r5`).

- [ ] **Step 1: Падающий jsdom-тест** — в `scripts/infra-viz-check.js` перед `process.exit` (рядом с остальными jsdom-блоками; функции `JSDOM`, `read`, `eq` уже есть):

```js
{
  const types = ["pg-scan-seq", "pg-scan-index", "pg-scan-bitmap"];
  const P = 12, R = 8, pg = (r) => Math.floor(r / R);
  const run = (type, attrs) => {
    const div = `<div class="algo-viz" id="w" tabindex="0" data-viz="${type}" ${attrs}></div>`;
    const dom = new JSDOM(`<!DOCTYPE html><html><body>${div}<script>${read("algo-viz.js")}</script><script>${read("infra-viz.js")}</script></body></html>`, { runScripts: "dangerously", pretendToBeVisual: true });
    dom.window.document.dispatchEvent(new dom.window.Event("DOMContentLoaded"));
    const el = dom.window.document.getElementById("w");
    for (let i = 0; i < 400; i++) el.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    return el;
  };
  const list = infra.parseMatch("r5", P * R);
  types.forEach((t) => {
    const el = run(t, 'data-pages="12" data-rows="8" data-match="r5"');
    eq(`${t}: построен без ошибок`, el.classList.contains("algo-viz--ready") && !/Ошибка визуализации|Неизвестный тип/.test(el.textContent), true);
    eq(`${t}: сетка ${P} страниц и ${P * R} ячеек`, [el.querySelectorAll(".iv-scan__page").length, el.querySelectorAll(".iv-scan__cell").length], [P, P * R]);
    eq(`${t}: дошёл до итога`, /Итог:/.test(el.textContent), true);
  });
  const want = { "pg-scan-seq": P, "pg-scan-index": last(infra.bScanIndex(P, R, list)).total, "pg-scan-bitmap": new Set(list.map(pg)).size };
  types.forEach((t) => {
    const el = run(t, 'data-pages="12" data-rows="8" data-match="r5"');
    eq(`${t}: счётчик чтений на экране = модель`, +el.querySelector(".iv-scan__reads").getAttribute("data-reads"), want[t]);
  });
  // граница: пустой набор и нечисловые размеры не ломают
  types.forEach((t) => {
    const el = run(t, 'data-pages="abc" data-rows="0" data-match=""');
    eq(`${t}: пустой набор и мусорные размеры — без ошибок`, el.classList.contains("algo-viz--ready") && !/Ошибка визуализации/.test(el.textContent), true);
  });
  // пресеты: каждый строится без ошибок у каждого типа
  const src = read("infra-viz.js");
  types.forEach((t) => {
    const body = src.slice(src.indexOf(`    "${t}": {`));
    const block = (body.match(/presets: \[\n([\s\S]*?)\n      \],/) || [])[1] || "";
    const presets = [...block.matchAll(/set: \{([^}]*)\}/g)].map((m) => Object.fromEntries([...m[1].matchAll(/"(data-[a-z-]+)":\s*"([^"]*)"/g)].map((x) => [x[1], x[2]])));
    eq(`${t}: 4 пресета с ровно тремя полями`, [presets.length, presets.every((p) => Object.keys(p).sort().join() === "data-match,data-pages,data-rows")], [4, true]);
    presets.forEach((p, i) => {
      const el = run(t, Object.keys(p).map((k) => `${k}="${p[k]}"`).join(" "));
      eq(`${t}: пресет ${i + 1} строится`, el.classList.contains("algo-viz--ready") && !/Ошибка визуализации/.test(el.textContent) && /Итог:/.test(el.textContent), true);
    });
  });
}
```

- [ ] **Step 2: Падение** — Run: `node scripts/infra-viz-check.js` — Expected: FAIL «Неизвестный тип».

- [ ] **Step 3: Реализация.** В `assets/infra-viz.js`, ПОСЛЕ страж-строки и ПЕРЕД `var INFRA = {`, добавить рисунок и общие функции конфигов; затем три записи в `INFRA` и три листинга в `CODE` (формат — как у `pg-page`: записи с отступом 4 пробела, `inputs:` одной строкой, `presets:` блоком по строке на пресет, `codeKey` литералом, `lineNotes` одной строкой без вложенных скобок).

```js
  // Размеры клампятся: поля ввода открыты читателю, а сетка из 10 000 ячеек ничему не учит.
  function clampInt(v, lo, hi, def) { var n = parseInt(v, 10); return isNaN(n) ? def : Math.max(lo, Math.min(hi, n)); }

  var scanCommon = {
    parse: function (kind) {
      return function (root) {
        var P = clampInt(root.getAttribute("data-pages"), 1, 24, 12), R = clampInt(root.getAttribute("data-rows"), 1, 16, 8);
        var m = parseMatch(root.getAttribute("data-match") == null ? "r5" : root.getAttribute("data-match"), P * R);
        var gen = { seq: bScanSeq, index: bScanIndex, bitmap: bScanBitmap }[kind];
        return { P: P, R: R, matches: m, steps: gen(P, R, m) };
      };
    },
    values: function () { return []; },
    pointers: function () { return { lo: -1, hi: -1 }; },
    sumCells: ["Чтений страницы", "Страниц в таблице", "Найдено строк"],
    sumValues: function (s) { return [{ text: s.total, cls: "gt" }, { text: s.P }, { text: s.found.length }]; },
    status: function (s, idx, total) { if (s.done) return { kind: "ok", icon: "✓", head: "Готово", text: s.info }; return { kind: "info", hot: !!s.hot, icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
    stepCard: function (s) { return { a: "чтений " + s.total, b: "из " + s.P, c: "найдено " + s.found.length, cls: "gt" }; },
    legend: [{ cls: "iv-scan__page--unread", label: "страница ещё не читалась" }, { cls: "iv-scan__page--read", label: "страница прочитана (×N — сколько раз)" }, { cls: "iv-scan__page--cur", label: "страница, к которой относится шаг" }, { cls: "iv-scan__cell--match", label: "строка подходит под условие" }, { cls: "iv-scan__cell--found", label: "строка уже в результате" }, { cls: "iv-scan__page--bit", label: "бит страницы в карте (Bitmap)" }]
  };

  function scanViz(panel, ctx) {
    var H = window.ALGO_VIZ, ms = {};
    ctx.matches.forEach(function (r) { ms[r] = true; });
    var wrap = H.mkEl("div", "iv-scan");
    panel.appendChild(wrap);
    return function (s) {
      wrap.innerHTML = "";
      var head = H.mkEl("div", "iv-scan__reads", "Чтений страницы таблицы: " + s.total + " из " + pages(s.P));
      head.setAttribute("data-reads", String(s.total));
      wrap.appendChild(head);
      var foundSet = {}; s.found.forEach(function (r) { foundSet[r] = true; });
      var grid = H.mkEl("div", "iv-scan__grid");
      for (var p = 0; p < s.P; p++) {
        var cls = "iv-scan__page " + (s.reads[p] ? "iv-scan__page--read" : "iv-scan__page--unread") + (s.mark === p ? " iv-scan__page--cur" : "") + (s.bits[p] ? " iv-scan__page--bit" : "");
        var card = H.mkEl("div", cls);
        card.appendChild(H.mkEl("div", "iv-scan__label", "стр. " + p + (s.reads[p] > 1 ? " ×" + s.reads[p] : s.reads[p] ? " ✓" : "")));
        var cells = H.mkEl("div", "iv-scan__cells");
        for (var c = 0; c < s.R; c++) {
          var id = p * s.R + c;
          var cc = "iv-scan__cell" + (ms[id] ? " iv-scan__cell--match" : "") + (foundSet[id] ? " iv-scan__cell--found" : "") + (s.tid && s.tid.page === p && s.tid.slot === c ? " iv-scan__cell--tid" : "");
          cells.appendChild(H.mkEl("div", cc));
        }
        card.appendChild(cells);
        grid.appendChild(card);
      }
      wrap.appendChild(grid);
    };
  }
```

Три записи INFRA (приведена ПЕРВАЯ, вторая и третья отличаются полями `badge`, `desc`, `codeKey`, `varOrder`, `varDesc`, `lineNotes`, `rules`, `parse: scanCommon.parse("index"|"bitmap")`, `title`, и `varsOf`; пресеты — те же четыре; тексты ниже):

```js
    "pg-scan-seq": {
      badge: "Postgres · Seq Scan",
      desc: "Последовательное чтение: все страницы таблицы подряд, на каждой проверяем все строки. Стоимость не зависит от того, сколько строк подошло.",
      valuesLabel: "", codeKey: "pg-scan-seq", fillRange: false,
      complexity: { time: "O(страниц)", space: "O(1)", good: "★ читает подряд — дёшево на странице" },
      varOrder: ["page"],
      varDesc: { page: "Текущая страница" },
      lineNotes: { 2: "Страницы идут по порядку — никаких прыжков", 3: "Читаем страницу целиком — одно чтение, сколько бы на ней строк ни подошло", 4: "Проверяем ВСЕ строки страницы, даже ненужные" },
      rules: [{ head: "чтений", body: "= страниц в таблице", cls: "eq" }, { head: "порядок", body: "физический, подряд", cls: "gt" }],
      legend: scanCommon.legend,
      presets: [
        { label: "пример главы: 5% разбросаны", set: { "data-pages": "12", "data-rows": "8", "data-match": "r5" }, hint: "5 строк, все страницы" },
        { label: "те же строки подряд", set: { "data-pages": "12", "data-rows": "8", "data-match": "0-4" }, hint: "стоимость не изменилась" },
        { label: "70% строк", set: { "data-pages": "12", "data-rows": "8", "data-match": "r67" }, hint: "тут Seq выигрывает" },
        { label: "ничего не подошло", set: { "data-pages": "12", "data-rows": "8", "data-match": "" }, hint: "всё равно читает всё" }
      ],
      parse: scanCommon.parse("seq"),
      inputs: [{ attr: "data-pages", label: "Страниц в таблице" }, { attr: "data-rows", label: "Строк на странице" }, { attr: "data-match", label: "Подходящие строки (N, a-b, rK)" }],
      values: scanCommon.values,
      title: function (ctx) { return "Seq Scan: " + ctx.P + " стр. × " + ctx.R + " строк, подходит " + ctx.matches.length; },
      pointers: scanCommon.pointers,
      sumCells: scanCommon.sumCells,
      sumValues: scanCommon.sumValues,
      status: scanCommon.status,
      stepCard: scanCommon.stepCard,
      varsOf: function (s) { return { page: s.vars.page }; },
      customViz: scanViz
    },
```
Для `pg-scan-index`: `badge "Postgres · Index Scan"`, `codeKey "pg-scan-index"`, `varOrder ["tid", "cur"]`, `varDesc { tid: "ctid строки из индекса", cur: "Страница, что сейчас в буфере" }`, `lineNotes { 3: "Индекс отдаёт ctid в порядке КЛЮЧА — страницы идут вразнобой", 4: "Та же страница, что и в прошлый раз? Тогда читать не надо", 5: "Новая страница — чтение; к уже виденной страницы после чужих — снова чтение (×2)", 8: "Строка берётся со страницы, что уже в буфере" }`, `rules [{ head: "чтений", body: "= смен страницы подряд", cls: "eq" }, { head: "порядок", body: "по ключу, а не по страницам", cls: "lt" }]`, `parse: scanCommon.parse("index")`, `title` «Index Scan: …», `varsOf: function (s) { return { tid: s.vars.tid, cur: s.vars.cur }; }`, пресеты те же четыре, но `hint`: «5 строк — ≈5 чтений», «подряд — 1 чтение», «70% строк — больше, чем в таблице!», «ничего — ноль чтений». Для `pg-scan-bitmap`: `badge "Postgres · Bitmap Scan"`, `codeKey "pg-scan-bitmap"`, `varOrder ["tid", "page"]`, `varDesc { tid: "ctid строки из индекса", page: "Страница, которую читаем" }`, `lineNotes { 3: "Запоминаем только номер страницы: порядок ключа не нужен", 6: "Страницы по возрастанию — читаем почти подряд", 7: "Каждая нужная страница — ровно один раз", 8: "Recheck: из страницы берём только подходящие строки" }`, `rules [{ head: "чтений", body: "= различных страниц", cls: "eq" }, { head: "потолок", body: "страниц в таблице", cls: "gt" }]`, `parse: scanCommon.parse("bitmap")`, `varsOf: function (s) { return { tid: s.vars.tid, page: s.vars.page }; }`, `hint`: «5 строк — ≈5 страниц», «подряд — 1 страница», «70% строк — не больше 12», «ничего — ноль».

Три листинга в `CODE` (строки — ровно из списка в «Interfaces» выше, с 4 пробелами отступа внутри функции), ключи `"pg-scan-seq"`, `"pg-scan-index"`, `"pg-scan-bitmap"`.

CSS — добавить в `assets/infra-viz.css` (токены `--iv-*`; цвета подобраны под всегда тёмную карточку `.algo-tp`, как у `pg-page`):

```css
.iv-scan { --iv-s-unread:#334155; --iv-s-read:#1d4ed8; --iv-s-cur:#f59e0b; --iv-s-match:#16a34a; --iv-s-found:#4ade80; --iv-s-bit:#a78bfa; --iv-s-fg:#e2e8f0; }
.iv-scan__reads { font:600 14px/1.3 system-ui,sans-serif; color:var(--iv-s-fg); margin-bottom:8px; }
.iv-scan__grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(92px,1fr)); gap:6px; }
.iv-scan__page { border:2px solid transparent; border-radius:6px; padding:4px; background:var(--iv-s-unread); }
.iv-scan__page--read { background:var(--iv-s-read); }
.iv-scan__page--bit { border-color:var(--iv-s-bit); }
.iv-scan__page--cur { border-color:var(--iv-s-cur); }
.iv-scan__label { font:600 11px/1 system-ui,sans-serif; color:var(--iv-s-fg); margin-bottom:3px; }
.iv-scan__cells { display:flex; flex-wrap:wrap; gap:2px; }
.iv-scan__cell { width:9px; height:9px; border-radius:2px; background:rgba(255,255,255,.18); }
.iv-scan__cell--match { background:var(--iv-s-match); }
.iv-scan__cell--found { background:var(--iv-s-found); }
.iv-scan__cell--tid { outline:2px solid var(--iv-s-cur); outline-offset:1px; }
@media (max-width:520px) { .iv-scan__grid { grid-template-columns:repeat(auto-fill,minmax(78px,1fr)); } }
```

- [ ] **Step 4:** Run: `node scripts/infra-viz-check.js && node scripts/check-viz.js && node --check assets/infra-viz.js` — Expected: зелёные (check-viz теперь видит 3 новых типа: у каждого `codeKey`, индексы `lineNotes` в пределах листинга, пресеты = поля `inputs`). Если `check-viz.js` пожалуется на правила — поправить конфиг по тексту ошибки.

- [ ] **Step 5: Commit** — `git add assets scripts && git commit -m "infra-viz: виджеты pg-scan-seq/index/bitmap"`

---

### Task 3: Сверка с живым Postgres, раздел в главе, проверки, браузер

**Files:**
- Modify: `src/postgres-plans.md`, `CLAUDE.md`; при расхождении модели — `assets/infra-viz.js` + `scripts/infra-viz-check.js`

- [ ] **Step 1: Сверка модели с живой базой** — `make pg-lab`, `make pg-psql`, затем таблица ровно на 12 страниц по 8 строк (модель примера главы), строки с физическим порядком = id:

```sql
CREATE TABLE scan_demo (id int PRIMARY KEY, k int NOT NULL, pad text NOT NULL);
ALTER TABLE scan_demo ALTER COLUMN pad SET STORAGE PLAIN;
ALTER TABLE scan_demo SET (autovacuum_enabled = off);
-- 96 строк; pad подобрать так, чтобы на странице помещалось РОВНО 8 строк (tuple ≈ 1008 Б: 8×(1008+4) ≤ 8168 < 9×(1008+4))
INSERT INTO scan_demo SELECT g, (g * 37) % 96, repeat('x', 967) FROM generate_series(0, 95) g;
CREATE INDEX scan_demo_k_idx ON scan_demo (k);
VACUUM ANALYZE scan_demo;
-- проверить раскладку: ожидаем 12 строк результата по 8
SELECT (ctid::text::point)[0]::int AS page, count(*) FROM scan_demo GROUP BY 1 ORDER BY 1;
```

Если строк на страницу не 8 — подобрать длину `repeat('x', N)` и проверить `pageinspect`-ом (`heap_page_items(get_raw_page('scan_demo', 0))`), пока ровно 8; не продолжать, пока раскладка не совпадёт с моделью (`P=12, R=8`). Ключ `k = (id·37) mod 96` — перестановка (gcd(37,96)=1), поэтому условие `k < 5` даёт 5 разбросанных строк, а `id < 5` — 5 подряд (кластеризованные).

Для каждого запроса снять число страниц ТАБЛИЦЫ (не индекса): `Bitmap Heap Scan` печатает `Heap Blocks: exact=N` — это прямое число; для `Index Scan` снять `shared hit` у `EXPLAIN (ANALYZE, BUFFERS)` и вычесть страницы индекса, измеренные тем же запросом в виде Index Only Scan по покрывающему условию (`SELECT k FROM scan_demo WHERE k < 5` после VACUUM — читает только индекс); для `Seq Scan` — `shared hit/read` целиком. Включать нужный план флагами `SET enable_seqscan/enable_bitmapscan/enable_indexscan = off` (только для эксперимента). Случаи: (а) `k < 5` — 5 разбросанных; (б) `id < 5` по индексу на `id` (первичный ключ) — 5 подряд; (в) `k < 67` — ≈70% строк; (г) условие, которому ничего не подходит (`k < 0`). Для каждого — список id в порядке ключа: `SELECT id FROM scan_demo WHERE k < 5 ORDER BY k` (для (б) `ORDER BY id`); прогнать этот список через модель (`node -e "const i=require('./assets/infra-viz.js'); const l=[…]; const s=i.bScanIndex(12,8,l); console.log(s[s.length-1].total, i.bScanBitmap(12,8,l).slice(-1)[0].total, i.bScanSeq(12,8,l).slice(-1)[0].total)"`) и записать таблицу «модель | живой Postgres» для Seq / Index / Bitmap по четырём случаям. Расхождение = ошибка модели (живая база — авторитет): исправить генератор и тесты Task 1, затем сообщить, что именно отличалось. Положить таблицу и сырой вывод в отчёт. Данные и таблицу `scan_demo` в репозиторий НЕ коммитить; в конце `make pg-lab-down`.

- [ ] **Step 2: Раздел в главе.** В `src/postgres-plans.md` сразу после абзаца про 5% строк («…выбрали двадцатую часть данных, а прочитали всё равно всю таблицу.») вставить подраздел `### Посмотри, откуда берутся 2049 страниц` (простым языком: аналогия — «библиотека: 5 нужных книг стоят на 5 разных полках; ходить к каждой по очереди — обойти все полки; или сначала выписать номера полок и обойти каждую один раз»), затем вкладки:

```html
<div class="algo-viz-tabs">
<div class="algo-viz" data-tab="Seq Scan" data-viz="pg-scan-seq" data-pages="12" data-rows="8" data-match="r5"></div>
<div class="algo-viz" data-tab="Index Scan" data-viz="pg-scan-index" data-pages="12" data-rows="8" data-match="r5"></div>
<div class="algo-viz" data-tab="Bitmap Scan" data-viz="pg-scan-bitmap" data-pages="12" data-rows="8" data-match="r5"></div>
</div>
```

и абзац «Что смотреть»: сравнить счётчик «Чтений страницы» во вкладках; нажать пресет «70% строк» во вкладке Index Scan — чтений станет больше, чем в таблице (Seq Scan = 12, потому что порядок индекса уводит с одной страницы на другую и возвращает обратно); пресет «подряд» — индекс выигрывает (одна страница). Привести таблицу «модель | живой Postgres» из Step 1 (только реальные числа) и одной фразой связать с планами главы (`Heap Blocks: exact=2049` из 2062 — то же явление на 200 000 строках). Каждое число и каждое утверждение про Postgres — из Step 1 или уже стоящее в главе; новых непроверенных фактов не добавлять. Листинги Go в главу не вставлять (они в виджете).

- [ ] **Step 3: `CLAUDE.md`** — в уже существующем пункте «Инфраструктурные виджеты» дописать одной фразой типы `pg-scan-seq/index/bitmap` (модель: P страниц × R строк, `data-match` в порядке ключа индекса; токены `N`, `a-b`, `rK`). Остальное в файле не трогать.

- [ ] **Step 4: Полный прогон как в CI** — `mdbook build && node scripts/check-links.js && node scripts/check-registries.js && node scripts/check-viz.js && node scripts/infra-viz-check.js && node scripts/progress-render-check.js`; из `exercises/`: `gofmt -l . && go run ./cmd/checksnippets -src ../src`; медленные в фоне, параллельно, ждать: `node scripts/viz-render-check.js` (~25 мин), `node scripts/check-viz-names.js` (~8 мин), `node scripts/predict-check.js`. Каждый скрипт с кодом выхода в отчёт; soft-skip не считается.

- [ ] **Step 5: Браузер (Playwright MCP, инструменты — через ToolSearch)** — `mdbook serve` в фоне, страница `postgres-plans.html`: на каждой из трёх вкладок нажать все 4 пресета, прошагать до конца, прочитать итоговые статусы и счётчик; сравнить с таблицей Step 1; режим 🎯 на `if tid.Page != cur` (вопрос задаётся, ответ различает «та же страница» и «новая»); тёмная тема navy, ширина 360 px (сетка не выходит за экран), стрелки ←/→ при фокусе на виджете не листают главу, переключение вкладок не теряет шаг. Скриншоты — в scratchpad, не в репозиторий. Остановить `mdbook serve`.

- [ ] **Step 6: Commit** — `git add src/postgres-plans.md CLAUDE.md assets scripts && git commit -m "Postgres: виджеты сканов в главе про планы, сверка с живой базой"`

---

## Self-review

- **Покрытие спеки (этот план):** виджет Seq/Index/Bitmap с подсчётом страниц (спека: `pg-scan-kinds`, «Seq / Index / Bitmap Scan на одной таблице, счёт прочитанных страниц»); числа сверены с живой базой; теория простым языком (аналогия «библиотека»), «что смотреть», связь с уже измеренными 2049/2062 страницами главы. Остальные Postgres-виджеты (`pg-index-to-heap`, `pg-join`, `pg-mvcc`, `pg-vacuum`, `pg-wal`), Redis и Kafka — отдельные планы.
- **Плейсхолдеры:** `rules`/`lineNotes`/`varDesc`/`hint` для `pg-scan-index` и `pg-scan-bitmap` даны текстом выше (полные значения) — исполнитель переносит их по образцу первой записи; листинги — полным списком строк; тест и код генераторов приведены целиком.
- **Типы/имена:** `parseMatch`, `bScanSeq/Index/Bitmap`, шаг `{P,R,line,vars,info,reads,bits,found,cur,total,tid,mark,done?,hot?}`, классы `iv-scan__*`, атрибут `data-reads`, ключи `pg-scan-seq|index|bitmap` — едины в Task 1–3; номера строк листингов (Seq 0–7, Index/Bitmap 0–11) совпадают с `line` в генераторах и с `lineNotes`.
- **Review Focus:** п.1 — тест `index(revisit)` и «подряд не перечитывается»; п.2 — «пустой набор»; п.3 — `parseMatch` тест; п.4 — jsdom-тест «мусорные размеры»; п.5 — тест пресетов (ровно три поля).
- **Известные риски:** `Index Scan`-буферы таблицы отдельно от индекса измеряются косвенно (Step 1) — если вычитание нечисто, исполнитель пользуется `pg_statio_user_tables` (`heap_blks_hit+heap_blks_read`) с `pg_stat_force_next_flush()`, и всё равно сверяет с моделью; `check-viz-names.js` может потребовать подправить имена чипов (`tid`, `cur`, `page` — идентификаторы листингов).
