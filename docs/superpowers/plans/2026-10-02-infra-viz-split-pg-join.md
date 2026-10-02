# Infra-viz: разделение файла и виджеты соединений (`pg-join-nl` / `pg-join-hash` / `pg-join-merge`) — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** (1) Разделить `assets/infra-viz.js` (550 строк) на общее ядро и файл темы Postgres до того, как появятся Redis и Kafka; (2) показать пошагово три алгоритма соединения таблиц — Nested Loop, Hash Join, Merge Join — на одной маленькой паре таблиц с подсчётом работы, и сверить модель с живым Postgres.

**Architecture:** `assets/infra-core.js` — общие чистые помощники (`plural`, `clampInt`, `mulberry32`, `shuffled`), доступные как `window.ALGO_VIZ_INFRA` и через `require` в node. `assets/infra-pg.js` — всё, что сейчас в `infra-viz.js` (pg-page, pg-scan-*) плюс новые `pg-join-*`; в нём по-прежнему блоки `INFRA`/`CODE` с отступом 4 пробела и регистрация в конце. Все четыре скрипта проверки читают файлы по маске `assets/infra-*.js` (ядро первым), дубликаты типов ловятся по всем файлам сразу. `book.toml` подключает `infra-core.js`, затем `infra-pg.js` сразу после `algo-viz.js`.

**Tech Stack:** vanilla JS (без сборщика), mdBook, jsdom (`npm i --no-save jsdom`), Postgres 16 из `pglab/` (`make pg-lab`) для сверки, Playwright MCP для проверки в браузере.

**Spec:** `docs/superpowers/specs/2026-10-01-infra-visualization-design.md` (виджет `pg-join` из списка Postgres). Предыдущие планы (слиты): `docs/superpowers/plans/2026-10-01-infra-viz-foundation-pg-page.md`, `docs/superpowers/plans/2026-10-01-infra-viz-pg-scans.md`.

## Global Constraints

- Язык контента русский, код листингов Go (спека).
- Виджеты строятся на движке `algo-viz.js` без сборщика и зависимостей.
- Формат файлов инфраструктурных виджетов (его разбирают регэкспами `check-viz.js` и остальные проверки): записи `    "тип": {` с отступом 4 пробела внутри `var INFRA = {`, листинги в `var CODE = {`, оба блока закрываются `\n  };`; регистрация `Object.keys(INFRA).forEach(...)` в конце файла; генераторы — чистые функции ДО строки-стража `if (typeof window === "undefined" || !window.ALGO_VIZ) return;` и экспортируются через `exportsForTest`/`module.exports`.
- `register` бросает на дубликате типа или `codeKey`: имена `pg-join-nl|hash|merge` и ключи листингов уникальны во ВСЕХ файлах.
- Числа и поведение сверяются с реальным Postgres; живая база — авторитет: если модель расходится, чинится модель. «Непроверенное не утверждается». В главе — только измеренные или уже стоящие в ней числа.
- Правила генераторов (CLAUDE.md): снимок = состояние ПОСЛЕ подсвеченной строки; одна строка листинга — один кадр; чип — только переменная, живая на этой строке («—» до объявления и вне области видимости, в том числе на кадре `done`); имя чипа = идентификатор из листинга; пресет задаёт РОВНО поля `inputs` типа и НЕ дублирует кнопку «пример главы» (её добавляет движок из исходных атрибутов).
- Уроки двух предыдущих планов, обязательные здесь: (а) у каждого пункта легенды есть правило `.algo-tp__legdot--<cls>` с конкретным цветом в `infra-viz.css`, и тест выводит список классов из легенды в исходнике; (б) заголовок счётчика не выглядит как дробь («62 из 12»); (в) русские окончания через `plural()`; (г) под виджетом в главе — предложение о том, что модель считает и чего нет; (д) ничего не утверждать про холодный кэш/диск без замера.
- Критерии готовности: `node scripts/infra-viz-check.js`, `check-viz.js`, `check-registries.js`, `check-challenges.js`, `mdbook build` + `check-links.js`, `viz-render-check.js` (~25 мин), `check-viz-names.js` (~8 мин), `predict-check.js`, `gofmt`/`checksnippets` из `exercises/` — зелёные; медленные jsdom-скрипты в фоне; soft-skip ≠ pass.
- Контекст среды: `main` опережает `origin` — ничего не пушить; работать в worktree (`.worktrees/`, в `.gitignore`); субагенты на sonnet иногда падают с API 403 — перезапуск/смена модели.

## Review Focus

1. Merge Join останавливается, когда кончилась одна из сторон: оставшиеся строки второй стороны не читаются (счётчик «заказов прочитано» меньше, чем заказов в таблице) — на живой базе проверено.
2. Hash Join всегда читает ВСЕ заказы (проб-сторона), независимо от числа совпадений; хеш строится по внешней таблице после фильтра.
3. Nested Loop делает ровно одно обращение к индексу на каждую внешнюю строку, включая те, у которых заказов нет (кадр «пусто»).
4. Пустые стороны, пользователи без заказов, заказы без пользователей, один пользователь со многими заказами — все три алгоритма дают одно и то же множество пар (сверка с перебором на сидовом фаззинге), и ни один не падает.
5. После разделения файла ВСЕ существующие проверки проходят без изменения ожиданий (145 проверок), порядок регистрации и подключения в `book.toml` верен, ядро доступно и в браузере, и в node.

## File Structure

| Файл | Ответственность |
|---|---|
| `assets/infra-core.js` (создать) | общие помощники + экспорт `window.ALGO_VIZ_INFRA` / `module.exports`; ничего не регистрирует |
| `assets/infra-pg.js` (создать переименованием `git mv assets/infra-viz.js assets/infra-pg.js`) | pg-page, pg-scan-*, pg-join-* |
| `assets/infra-viz.css` (изменить в Task 3) | стили соединений (`.iv-join*`, legdot-правила) |
| `book.toml` (изменить) | подключить `infra-core.js` и `infra-pg.js` вместо `infra-viz.js` |
| `scripts/check-viz.js`, `viz-render-check.js`, `predict-check.js`, `check-viz-names.js` (изменить) | читать все `assets/infra-*.js` |
| `scripts/infra-viz-check.js` (изменить) | helper `readInfra()`, node-тесты соединений, тесты разделения |
| `src/postgres-plans.md` (изменить в Task 4) | подраздел «Посмотри пошагово» с тремя вкладками после «Морали» раздела 2 |
| `CLAUDE.md` (изменить) | пункт «Инфраструктурные виджеты»: новое разделение, `pg-join-*` |

---

### Task 1: Разделение на `infra-core.js` + `infra-pg.js` (поведение не меняется)

**Files:**
- Create: `assets/infra-core.js`; Rename: `assets/infra-viz.js` → `assets/infra-pg.js` (`git mv`)
- Modify: `book.toml:20`, `scripts/check-viz.js`, `scripts/viz-render-check.js`, `scripts/predict-check.js`, `scripts/check-viz-names.js`, `scripts/infra-viz-check.js`, `CLAUDE.md`

**Interfaces:**
- Produces: `core = { plural(n, one, few, many), clampInt(v, lo, hi, def), mulberry32(seed), shuffled(n, seed) }` — в браузере `window.ALGO_VIZ_INFRA`, в node `require("./infra-core.js")`. Семантика функций — ровно как у текущих в `infra-viz.js` (`plural` — строка ~167, `clampInt` — ~309, `mulberry32`/`shuffled` — ~128–135).
- `infra-pg.js` начинается с `var core = (typeof module !== "undefined" && module.exports) ? require("./infra-core.js") : window.ALGO_VIZ_INFRA;` и использует `core.plural` и т. д.; локальные `plural`, `clampInt`, `mulberry32`, `shuffled` удаляются, остальные локальные имена (`pages`, `rows`, ...) остаются.
- Скрипты: общая функция чтения — `fs.readdirSync(assets).filter(n => /^infra-.*\.js$/.test(n)).sort((a,b) => (a === "infra-core.js" ? -1 : b === "infra-core.js" ? 1 : a.localeCompare(b)))`; `infraJs` = конкатенация текстов в этом порядке с разделителем `"\n"`; в jsdom-скриптах каждый файл вставляется ОТДЕЛЬНЫМ `<script>` в том же порядке (ядро первым).

- [ ] **Step 1: Падающий тест** — в `scripts/infra-viz-check.js` добавить функцию (рядом с `read`) и два блока перед `process.exit`:

```js
const infraFiles = () => fs.readdirSync(path.join(root, "assets")).filter((n) => /^infra-.*\.js$/.test(n)).sort((a, b) => (a === "infra-core.js" ? -1 : b === "infra-core.js" ? 1 : a.localeCompare(b)));
const readInfra = () => infraFiles().map(read).join("\n");
const infraScripts = () => infraFiles().map((f) => `<script>${read(f)}</script>`).join("");
```

```js
// --- разделение на ядро и тему ---
{
  eq("файлы: ядро и pg есть, старого infra-viz.js нет", [fs.existsSync(path.join(root, "assets", "infra-core.js")), fs.existsSync(path.join(root, "assets", "infra-pg.js")), fs.existsSync(path.join(root, "assets", "infra-viz.js"))], [true, true, false]);
  const core = require(path.join(root, "assets", "infra-core.js"));
  eq("core: экспорт в node", Object.keys(core).sort(), ["clampInt", "mulberry32", "plural", "shuffled"]);
  eq("core.plural: 1/2/5/11/21", [1, 2, 5, 11, 21].map((n) => core.plural(n, "а", "б", "в")), ["а", "б", "в", "в", "а"]);
  eq("core.clampInt: мусор, границы", [core.clampInt("abc", 1, 24, 12), core.clampInt("0", 1, 24, 12), core.clampInt("999", 1, 24, 12), core.clampInt("7", 1, 24, 12)], [12, 1, 24, 7]);
  eq("core.shuffled: перестановка 0..n-1, детерминирована", [core.shuffled(10, 5).slice().sort((a, b) => a - b), core.shuffled(10, 5)], [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9], core.shuffled(10, 5)]);
  const html = `<!DOCTYPE html><html><body><div id="w" class="algo-viz" data-viz="pg-page" data-ops="+a:100"></div><script>${read("algo-viz.js")}</script>${infraScripts()}</body></html>`;
  const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true });
  eq("браузер: ядро доступно как window.ALGO_VIZ_INFRA", typeof dom.window.ALGO_VIZ_INFRA.plural, "function");
  const book = fs.readFileSync(path.join(root, "book.toml"), "utf8");
  eq("book.toml: algo-viz.js → infra-core.js → infra-pg.js подряд", /"assets\/algo-viz\.js", "assets\/infra-core\.js", "assets\/infra-pg\.js"/.test(book), true);
}
```

Существующие места теста, читающие `read("infra-viz.js")` и `require(".../infra-viz.js")` (строки ~51, ~85, ~122, ~325, ~351), заменить: везде, где нужен ИСХОДНИК для регэкспов (`read("infra-viz.js")`) — на `readInfra()`; везде, где HTML собирается из двух скриптов (`<script>${read("algo-viz.js")}</script><script>${read("infra-viz.js")}</script>`) — на `<script>${read("algo-viz.js")}</script>${infraScripts()}`; `const infra = require(path.join(root, "assets", "infra-viz.js"))` — на `require(path.join(root, "assets", "infra-pg.js"))`. Эти правки делаются в Step 3 вместе с переименованием (тест ещё не может быть зелёным до него).

- [ ] **Step 2: Падение** — Run: `node scripts/infra-viz-check.js` — Expected: FAIL (`infra-core.js` нет).

- [ ] **Step 3: Реализация.**
  1. `git mv assets/infra-viz.js assets/infra-pg.js`.
  2. Создать `assets/infra-core.js`:
```js
/* Общие помощники инфраструктурных виджетов (Postgres, Redis, Kafka). Ничего не регистрирует:
 * загружается ПЕРЕД файлами тем (book.toml), в node — через require. */
(function () {
  "use strict";
  var core = {
    plural: function (n, one, few, many) { var a = n % 100, b = n % 10; return (a >= 11 && a <= 14) ? many : b === 1 ? one : (b >= 2 && b <= 4) ? few : many; },
    // Размеры открыты читателю через поля ввода: клампим, иначе сетка из 10 000 ячеек ничему не учит.
    clampInt: function (v, lo, hi, def) { var n = parseInt(v, 10); return isNaN(n) ? def : Math.max(lo, Math.min(hi, n)); },
    mulberry32: function (a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; },
    shuffled: function (n, seed) {
      var a = [], rnd = core.mulberry32(seed), i, j, k, t;
      for (i = 0; i < n; i++) a.push(i);
      for (j = n - 1; j > 0; j--) { k = Math.floor(rnd() * (j + 1)); t = a[j]; a[j] = a[k]; a[k] = t; }
      return a;
    }
  };
  if (typeof module !== "undefined" && module.exports) module.exports = core;
  if (typeof window !== "undefined") window.ALGO_VIZ_INFRA = core;
})();
```
  (скопировать реализации `plural`/`clampInt`/`mulberry32`/`shuffled` дословно из текущего `infra-viz.js`, если они там отличаются от приведённых — поведение не менять; сохранить комментарии «почему».)
  3. В `assets/infra-pg.js`: добавить сразу после `var exportsForTest = {};` строку `var core = (typeof module !== "undefined" && module.exports) ? require("./infra-core.js") : window.ALGO_VIZ_INFRA;`, удалить локальные определения `mulberry32`, `shuffled`, `plural`, `clampInt` и заменить их вызовы на `core.mulberry32`, `core.shuffled`, `core.plural`, `core.clampInt` (helper'ы `pages`, `rows` остаются и вызывают `core.plural`); поправить заголовочный комментарий файла (тема Postgres; общие помощники — в infra-core.js).
  4. `book.toml:20`: заменить `"assets/infra-viz.js"` на `"assets/infra-core.js", "assets/infra-pg.js"` (сразу после `"assets/algo-viz.js"`); `infra-viz.css` остаётся как есть.
  5. Скрипты: в `check-viz.js`, `viz-render-check.js`, `predict-check.js`, `check-viz-names.js` заменить чтение одного файла `infra-viz.js` на чтение всех `assets/infra-*.js` в порядке из «Interfaces» (общая функция в каждом скрипте либо маленький `scripts/lib/infra-files.js`, если так чище — тогда он тоже входит в коммит); в `check-viz.js` правило 6 («дубликат типа/листинга») сравнивает ключи по ВСЕМ файлам (algo-viz.js + каждый infra-файл), сообщение называет оба файла; в трёх jsdom-скриптах HTML собирается как `<script>${js}</script>` + по `<script>` на каждый infra-файл в порядке «ядро первым».
  6. `CLAUDE.md`, пункт «Инфраструктурные виджеты»: описать разделение (ядро `infra-core.js` + файлы тем `infra-pg.js`, будущие `infra-redis.js`/`infra-kafka.js`; порядок в `book.toml`; скрипты читают маску `assets/infra-*.js`, ядро первым; общие помощники берутся из ядра, а не копируются); заменить упоминания `infra-viz.js` там, где речь о коде, на актуальные имена; остальное не трогать.

- [ ] **Step 4: Все проверки зелёные без изменения ожиданий** — Run: `node --check assets/infra-core.js assets/infra-pg.js` (каждый отдельно), `node scripts/infra-viz-check.js` (все прежние 145 проверок + новые), `node scripts/check-viz.js` (156 типов, 123 пресета, как до разделения), `node scripts/check-registries.js`, `mdbook build && node scripts/check-links.js`. Затем в фоне и параллельно (ждать): `node scripts/viz-render-check.js` (~25 мин), `node scripts/check-viz-names.js` (~8 мин), `node scripts/predict-check.js`. Expected: все exit 0; числа типов/пресетов те же, что до правки; allow-list имён без изменений (162). Быстро убедиться пробой, что дубликат ловится: временно скопировать ключ существующего типа из `algo-viz.js` в `infra-pg.js` — `check-viz.js` обязан упасть сообщением о дубликате; проба убирается до коммита.

- [ ] **Step 5: Commit** — `git add assets book.toml scripts CLAUDE.md && git commit -m "infra-viz: общее ядро infra-core.js и файл темы infra-pg.js"`

---

### Task 2: Генераторы соединений (чистые функции, node-тесты)

**Files:**
- Modify: `assets/infra-pg.js` (после `bScanBitmap`, до строки-стража), `scripts/infra-viz-check.js`

**Interfaces:**
- Consumes: `core.mulberry32`, `core.plural`.
- Produces (экспорт через `exportsForTest`): `parseIds(str, lo, hi, dups)`, `bJoinNL(users, orders)`, `bJoinHash(users, orders)`, `bJoinMerge(users, orders)` → `steps[]`, и `joinPairs(users, orders)` (эталон: перебор).
- Модель: `users` — массив id (по возрастанию, уникальные; внешняя таблица ПОСЛЕ фильтра `u.id < K`); `orders` — массив `{n, u}`: `n` — номер заказа (1-based, порядок в таблице), `u` — `user_id`. Соединение внутреннее: `o.user_id = u.id`. Эталон `joinPairs`: пары `{u, n}` для всех совпадений, упорядочены по `(u, n)`.
- Токены `data-users`/`data-orders` (через запятую): число `N`; диапазон `a-b` (по возрастанию, границы клампятся к `[lo,hi]`); `rK` — K псевдослучайных значений в `[lo,hi]` (детерминированно: `core.mulberry32(K * 7919 + hi)`, значения берутся как `lo + floor(rnd() * (hi - lo + 1))`); `dups=false` (пользователи) — дубликаты отбрасываются и результат сортируется по возрастанию; `dups=true` (заказы) — порядок и повторы сохраняются; не более 40 значений.
- Шаг: `{ line, vars, info, hot?, done?, U:number[], O:{n,u}[], cu:number, co:number, out:{u,n}[], uRead:number, oRead:number, metric:{label,value}, built:number[] }` — `U` = внешние строки; `O` = заказы В ПОРЯДКЕ ЭТОГО АЛГОРИТМА (NL: порядок индекса `(user_id, n)`; Hash: порядок таблицы; Merge: порядок индекса `(user_id, n)`); `cu`/`co` — индексы текущих строк в `U`/`O` (−1, если нет); `built` — id пользователей, уже положенных в хеш-таблицу (только Hash).
- Листинги (индексы строк — для `line`):
  - **NL (0–8):** 0 `func NestedLoop(users []User, idx *Index) []Pair {` · 1 `var out []Pair` · 2 `for _, u := range users { // внешняя таблица (после фильтра)` · 3 `for _, o := range idx.Lookup(u.ID) { // поиск по индексу orders(user_id)` · 4 `out = append(out, Pair{u, o})` · 5 `}` · 6 `}` · 7 `return out` · 8 `}`.
  - **Hash (0–12):** 0 `func HashJoin(users []User, orders []Order) []Pair {` · 1 `h := map[int][]User{}` · 2 `for _, u := range users { // build: хеш по внешней таблице (после фильтра)` · 3 `h[u.ID] = append(h[u.ID], u)` · 4 `}` · 5 `var out []Pair` · 6 `for _, o := range orders { // probe: ВСЕ заказы, один проход` · 7 `for _, u := range h[o.UserID] {` · 8 `out = append(out, Pair{u, o})` · 9 `}` · 10 `}` · 11 `return out` · 12 `}`.
  - **Merge (0–14):** 0 `func MergeJoin(users []User, orders []Order) []Pair { // оба входа отсортированы по ключу` · 1 `var out []Pair` · 2 `i, j := 0, 0` · 3 `for i < len(users) && j < len(orders) {` · 4 `if users[i].ID < orders[j].UserID {` · 5 `i++` · 6 `} else if users[i].ID > orders[j].UserID {` · 7 `j++` · 8 `} else {` · 9 `out = append(out, Pair{users[i], orders[j]})` · 10 `j++ // тот же пользователь: следующий заказ` · 11 `}` · 12 `}` · 13 `return out` · 14 `}`.
- Кадры:
  - **NL:** line 1 (старт; `U`, `O` в порядке индекса); для каждого `u` (по возрастанию): line 2 (`cu` = индекс `u`, `co` = −1); затем, если у `u` есть заказы, для каждого `o` в порядке `n`: line 3 (`co` = индекс `o`; `oRead++`; при ПЕРВОМ заказе пользователя — ещё и `metric.value++` как «обращение к индексу», счётчик растёт на кадре line 3), line 4 (пара добавлена в `out`); если заказов нет — ОДИН кадр line 3 `hot: true` (`co` = −1, обращение к индексу посчитано, «заказов 0»); в конце line 7 (`done`). `metric = {label: "обращений к индексу", value}`.
  - **Hash:** line 1; для каждого `u`: line 2 (`cu`), line 3 (`built` += id, `uRead++`); line 5; для каждого заказа в порядке таблицы: line 6 (`co`, `oRead++`, `cu` = −1), затем если у ключа есть пользователь в хеше: line 7 (`cu` = индекс, чип `u` = id), line 8 (пара); иначе ОДИН кадр line 7 `hot: true` (чип `u` = «—», «в хеше нет»); в конце line 11 (`done`). `metric = {label: "строк в хеш-таблице", value: built.length}`.
  - **Merge:** line 1; line 2 (`i = 0`, `j = 0`; `uRead` = 1 если есть пользователи, `oRead` = 1 если есть заказы); пока `i < len(U) && j < len(O)`: line 4 (сравнение; `cmp++`); если `U[i] < O[j].u`: line 5 (`i++`); иначе line 6 (`cmp++`), и если `U[i] > O[j].u`: line 7 (`j++`); иначе (равны): line 9 (пара), line 10 (`j++`). После каждого `i++`/`j++` `uRead = min(i + 1, len(U))`, `oRead = min(j + 1, len(O))`; в конце line 13 (`done`). `metric = {label: "сравнений", value: cmp}`. Чипы: `i`, `j` (числа; «—» до line 2 и на кадре `done`).
- Чипы остальных типов: NL `{u, o}`, Hash `{u, o}`; значения — id пользователя (`u`) и `"№n·user u"` (`o`); «—» до объявления, вне области видимости (NL: `o` вне цикла по `o` и на `done`; Hash: `u` вне внутреннего цикла и на `done`, `o` вне цикла probe и на `done`).
- Выход за предел: > 40 значений обрезается; пустые `users`/`orders` допустимы.

- [ ] **Step 1: Падающие тесты** — в `scripts/infra-viz-check.js` перед `process.exit` добавить (`infra`, `eq`, `last` уже есть выше):

```js
// --- соединения ---
{
  const mk = (us, os) => ({ users: us, orders: os.map((u, i) => ({ n: i + 1, u })) });
  const key = (ps) => ps.map((p) => p.u + ":" + p.n).sort().join(",");
  const brute = (users, orders) => infra.joinPairs(users, orders);
  const cases = {
    plain: mk([1, 2, 3], [2, 2, 9]),
    noOrders: mk([1, 2], []),
    noUsers: mk([], [1, 2]),
    manyOne: mk([1, 2, 3, 4], [2, 2, 2, 2, 2, 2, 2, 3]),
    orphans: mk([1, 2, 3], [1, 2, 3, 7, 8, 9]),
    shuffled: mk([1, 2, 3, 4, 5], [5, 1, 3, 3, 9, 2, 5, 1])
  };
  const gens = { NL: infra.bJoinNL, Hash: infra.bJoinHash, Merge: infra.bJoinMerge };
  Object.keys(cases).forEach((name) => Object.keys(gens).forEach((g) => {
    const c = cases[name], st = gens[g](c.users, c.orders), l = last(st);
    eq(`join ${g}(${name}): те же пары, что у перебора`, key(l.out), key(brute(c.users, c.orders)));
    eq(`join ${g}(${name}): последний кадр done, line в листинге`, [!!l.done, st.every((s) => s.line >= 0 && s.line <= (g === "NL" ? 8 : g === "Hash" ? 12 : 14))], [true, true]);
  }));
  // точные последовательности строк
  const seq = (st) => st.map((s) => s.line).join(",");
  eq("NL: кадры на users [1,2,3], orders [u2,u2,u9]", seq(infra.bJoinNL([1, 2, 3], [{ n: 1, u: 2 }, { n: 2, u: 2 }, { n: 3, u: 9 }])), "1,2,3,2,3,4,3,4,2,3,7");
  eq("Hash: кадры на users [1,2], orders [u2,u5]", seq(infra.bJoinHash([1, 2], [{ n: 1, u: 2 }, { n: 2, u: 5 }])), "1,2,3,2,3,5,6,7,8,6,7,11");
  eq("Merge: кадры на users [1,2], orders [u2,u1]", seq(infra.bJoinMerge([1, 2], [{ n: 1, u: 2 }, { n: 2, u: 1 }])), "1,2,4,6,9,10,4,5,4,6,9,10,13");
  // счётчики: фокус обзора
  const plain = cases.plain;
  eq("NL: одно обращение к индексу на каждую внешнюю строку (и у пустых)", last(infra.bJoinNL(plain.users, plain.orders)).metric.value, 3);
  eq("NL: прочитано заказов = число совпавших", last(infra.bJoinNL(plain.users, plain.orders)).oRead, 2);
  eq("Hash: прочитаны ВСЕ заказы независимо от совпадений", [last(infra.bJoinHash(plain.users, plain.orders)).oRead, last(infra.bJoinHash(cases.orphans.users, cases.orphans.orders)).oRead], [3, 6]);
  eq("Hash: в хеш-таблице все внешние строки", last(infra.bJoinHash(plain.users, plain.orders)).built, [1, 2, 3]);
  const early = infra.bJoinMerge([1, 2], [{ n: 1, u: 1 }, { n: 2, u: 2 }, { n: 3, u: 5 }, { n: 4, u: 6 }, { n: 5, u: 7 }]);
  eq("Merge: остановился, когда кончились пользователи — заказов прочитано 3 из 5", [last(early).uRead, last(early).oRead], [2, 3]);
  eq("Merge: пустой вход — только старт и итог", seq(infra.bJoinMerge([], [{ n: 1, u: 1 }])), "1,2,13");
  eq("NL по порядку индекса: O отсортирован по (user_id, n)", infra.bJoinNL([1, 2, 3, 4, 5], cases.shuffled.orders)[0].O.map((o) => o.u + ":" + o.n), cases.shuffled.orders.slice().sort((a, b) => a.u - b.u || a.n - b.n).map((o) => o.u + ":" + o.n));
  eq("Hash по порядку таблицы: O как в таблице", infra.bJoinHash([1, 2, 3, 4, 5], cases.shuffled.orders)[0].O.map((o) => o.n), cases.shuffled.orders.map((o) => o.n));
  // чипы: вне области видимости — «—»
  eq("Merge: на done чипы i и j — «—»", [last(early).vars.i, last(early).vars.j], ["—", "—"]);
  eq("NL: на done чип o — «—»", last(infra.bJoinNL(plain.users, plain.orders)).vars.o, "—");
  eq("Hash: на done чипы u и o — «—»", [last(infra.bJoinHash(plain.users, plain.orders)).vars.u, last(infra.bJoinHash(plain.users, plain.orders)).vars.o], ["—", "—"]);
  // разбор токенов
  eq("parseIds: пользователи — диапазон, дубликаты, сортировка, границы", infra.parseIds("3-5,4,1,99,x", 1, 12, false), [1, 3, 4, 5]);
  eq("parseIds: заказы — порядок и повторы сохраняются", infra.parseIds("2,2,1,2", 1, 12, true), [2, 2, 1, 2]);
  eq("parseIds: rK детерминирован, в границах, нужной длины", [infra.parseIds("r14", 1, 8, true).length, infra.parseIds("r14", 1, 8, true).every((v) => v >= 1 && v <= 8), JSON.stringify(infra.parseIds("r14", 1, 8, true)) === JSON.stringify(infra.parseIds("r14", 1, 8, true))], [14, true, true]);
  eq("parseIds: пусто и не больше 40", [infra.parseIds("", 1, 8, true), infra.parseIds("r999", 1, 8, true).length], [[], 40]);
  // фаззинг: три алгоритма дают те же пары, что перебор; кадры не делят ссылок
  let seed = 12345; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  let bad = 0;
  for (let t = 0; t < 300; t++) {
    const nu = Math.floor(rnd() * 8), no = Math.floor(rnd() * 14);
    const us = [...new Set(Array.from({ length: nu }, () => 1 + Math.floor(rnd() * 10)))].sort((a, b) => a - b);
    const os = Array.from({ length: no }, (_, i) => ({ n: i + 1, u: 1 + Math.floor(rnd() * 10) }));
    Object.keys(gens).forEach((g) => {
      const st = gens[g](us, os);
      if (key(last(st).out) !== key(brute(us, os)) || !last(st).done || st.filter((s) => s.done).length !== 1) bad++;
      if (st.length > 1 && st[0].out === st[1].out) bad++;
    });
  }
  eq("фаззинг 300 случаев × 3 алгоритма: пары = перебор, один done, кадры не делят out", bad, 0);
}
```

- [ ] **Step 2: Падение** — Run: `node scripts/infra-viz-check.js` — Expected: FAIL `infra.joinPairs is not a function`.

- [ ] **Step 3: Реализация** — в `assets/infra-pg.js` после `bScanBitmap` (перед страж-строкой) вставить:

```js
  // ===== Соединения: Nested Loop / Hash / Merge ================================
  // Внутреннее соединение users.id = orders.user_id на маленьких таблицах. Модель считает работу
  // строками и обращениями, а не временем: на 20 строках время ничего не показывает.
  function parseIds(str, lo, hi, dups) {
    var out = [];
    function add(v) { if (v >= lo && v <= hi && out.length < 40) out.push(v); }
    String(str || "").split(",").forEach(function (raw) {
      var t = raw.trim(), m = /^(\d+)-(\d+)$/.exec(t);
      if (m) { for (var v = Math.max(+m[1], lo); v <= Math.min(+m[2], hi); v++) add(v); return; }
      m = /^r(\d+)$/.exec(t);
      if (m) { var rnd = core.mulberry32(+m[1] * 7919 + hi), k = Math.min(+m[1], 40); for (var i = 0; i < k; i++) add(lo + Math.floor(rnd() * (hi - lo + 1))); return; }
      if (/^\d+$/.test(t)) add(+t);
    });
    if (dups) return out;
    var seen = {}, uniq = [];
    out.forEach(function (v) { if (!seen[v]) { seen[v] = true; uniq.push(v); } });
    return uniq.sort(function (a, b) { return a - b; });
  }
  function joinPairs(users, orders) {
    var ps = [];
    users.forEach(function (u) { orders.forEach(function (o) { if (o.u === u) ps.push({ u: u, n: o.n }); }); });
    return ps.sort(function (a, b) { return a.u - b.u || a.n - b.n; });
  }
  function byIndexOrder(orders) { return orders.slice().sort(function (a, b) { return a.u - b.u || a.n - b.n; }); }
  function orderText(o) { return "№" + o.n + "·user " + o.u; }

  function joinState(users, orders, metricLabel) {
    var st = { out: [], uRead: 0, oRead: 0, metric: 0, built: [], cu: -1, co: -1, steps: [] };
    st.snap = function (line, vars, info, extra) {
      var s = { line: line, vars: vars, info: info, U: users.slice(), O: orders.slice(), cu: st.cu, co: st.co, out: st.out.slice(), uRead: st.uRead, oRead: st.oRead, built: st.built.slice(), metric: { label: metricLabel, value: st.metric } };
      for (var k in extra) s[k] = extra[k];
      st.steps.push(s);
    };
    return st;
  }

  function bJoinNL(users, orders) {
    var O = byIndexOrder(orders), st = joinState(users, O, "обращений к индексу");
    st.snap(1, { u: "—", o: "—" }, "Nested Loop: для КАЖДОЙ внешней строки идём в индекс по заказам. Внешних строк: " + users.length + ", заказов в таблице: " + orders.length + ".");
    users.forEach(function (u, ui) {
      st.cu = ui; st.co = -1;
      st.snap(2, { u: u, o: "—" }, "u = " + u + ": следующая строка внешней таблицы", {});
      var mine = []; O.forEach(function (o, oi) { if (o.u === u) mine.push(oi); });
      if (!mine.length) {
        st.metric++;
        st.snap(3, { u: u, o: "—" }, "Lookup(" + u + "): обращение к индексу — у пользователя " + u + " заказов нет, внутренний цикл не выполнится", { hot: true });
        return;
      }
      mine.forEach(function (oi, k) {
        if (k === 0) st.metric++;
        st.co = oi; st.oRead++;
        st.snap(3, { u: u, o: orderText(O[oi]) }, (k === 0 ? "Lookup(" + u + "): обращение к индексу. " : "") + "Нашли заказ " + orderText(O[oi]), {});
        st.out.push({ u: u, n: O[oi].n });
        st.snap(4, { u: u, o: orderText(O[oi]) }, "Пара (user " + u + ", заказ №" + O[oi].n + ") в результате: " + st.out.length, {});
      });
    });
    st.cu = -1; st.co = -1;
    st.snap(7, { u: "—", o: "—" }, "Итог: " + st.out.length + " пар; обращений к индексу " + st.metric + " — по одному на каждую внешнюю строку, нашлись ли у неё заказы или нет.", { done: true });
    return st.steps;
  }

  function bJoinHash(users, orders) {
    var st = joinState(users, orders, "строк в хеш-таблице");
    st.snap(1, { u: "—", o: "—" }, "Hash Join: сначала строим хеш-таблицу по внешней таблице (" + users.length + " строк), потом ОДНИМ проходом читаем все заказы (" + orders.length + ").");
    users.forEach(function (u, ui) {
      st.cu = ui;
      st.snap(2, { u: u, o: "—" }, "build: u = " + u, {});
      st.built.push(u); st.uRead++; st.metric = st.built.length;
      st.snap(3, { u: u, o: "—" }, "h[" + u + "] = [user " + u + "]: строк в хеш-таблице " + st.built.length, {});
    });
    st.cu = -1;
    st.snap(5, { u: "—", o: "—" }, "Хеш-таблица готова. Теперь probe: каждый заказ — один поиск по хешу.");
    var inHash = {}; users.forEach(function (u, ui) { inHash[u] = ui; });
    orders.forEach(function (o, oi) {
      st.co = oi; st.cu = -1; st.oRead++;
      st.snap(6, { u: "—", o: orderText(o) }, "probe: заказ " + orderText(o) + ". Прочитано заказов: " + st.oRead + " из " + orders.length, {});
      if (inHash[o.u] === undefined) {
        st.snap(7, { u: "—", o: orderText(o) }, "h[" + o.u + "]: в хеш-таблице такого пользователя нет — заказ пропускаем, но прочитать его всё равно пришлось", { hot: true });
        return;
      }
      st.cu = inHash[o.u];
      st.snap(7, { u: o.u, o: orderText(o) }, "h[" + o.u + "] → user " + o.u, {});
      st.out.push({ u: o.u, n: o.n });
      st.snap(8, { u: o.u, o: orderText(o) }, "Пара (user " + o.u + ", заказ №" + o.n + ") в результате: " + st.out.length, {});
    });
    st.cu = -1; st.co = -1;
    st.snap(11, { u: "—", o: "—" }, "Итог: " + st.out.length + " пар; прочитано ВСЕ " + orders.length + " заказов — столько, сколько совпадений ни было.", { done: true });
    return st.steps;
  }

  function bJoinMerge(users, orders) {
    var O = byIndexOrder(orders), st = joinState(users, O, "сравнений");
    var i = 0, j = 0;
    function reads() { st.uRead = Math.min(i + 1, users.length); st.oRead = Math.min(j + 1, O.length); st.cu = i < users.length ? i : -1; st.co = j < O.length ? j : -1; }
    st.snap(1, { i: "—", j: "—" }, "Merge Join: оба входа отсортированы по ключу (users — по первичному ключу, заказы — по индексу user_id); идём по ним двумя указателями.");
    reads();
    st.snap(2, { i: i, j: j }, "i = 0, j = 0: стоим на первых строках обеих сторон", {});
    while (i < users.length && j < O.length) {
      st.metric++;
      st.snap(4, { i: i, j: j }, "users[" + i + "] = " + users[i] + ", orders[" + j + "].user_id = " + O[j].u + ": " + users[i] + (users[i] < O[j].u ? " < " : users[i] > O[j].u ? " > " : " = ") + O[j].u, {});
      if (users[i] < O[j].u) {
        i++; reads();
        st.snap(5, { i: i, j: j }, "Пользователь " + users[i - 1] + " меньше — заказов у него больше не будет, i++", {});
      } else {
        st.metric++;
        st.snap(6, { i: i, j: j }, users[i] > O[j].u ? "users[i] > orders[j].user_id — заказ без пользователя" : "Не больше и не меньше — значит равны", {});
        if (users[i] > O[j].u) {
          j++; reads();
          st.snap(7, { i: i, j: j }, "Заказ пропускаем, j++", {});
        } else {
          st.out.push({ u: users[i], n: O[j].n });
          st.snap(9, { i: i, j: j }, "Пара (user " + users[i] + ", заказ №" + O[j].n + ") в результате: " + st.out.length, {});
          j++; reads();
          st.snap(10, { i: i, j: j }, "j++: следующий заказ того же пользователя (или другого)", {});
        }
      }
    }
    st.cu = -1; st.co = -1;
    st.snap(13, { i: "—", j: "—" }, "Итог: " + st.out.length + " пар; прочитано пользователей " + st.uRead + " из " + users.length + ", заказов " + st.oRead + " из " + O.length + (st.oRead < O.length ? " — одна из сторон кончилась, и остаток другой читать не пришлось" : "") + ".", { done: true });
    return st.steps;
  }
  exportsForTest.parseIds = parseIds;
  exportsForTest.joinPairs = joinPairs;
  exportsForTest.bJoinNL = bJoinNL;
  exportsForTest.bJoinHash = bJoinHash;
  exportsForTest.bJoinMerge = bJoinMerge;
```

- [ ] **Step 4: Тесты проходят** — Run: `node scripts/infra-viz-check.js && node --check assets/infra-pg.js` — Expected: все `✓`. Расхождение арифметики теста и генератора — сначала пересчитать вручную по формулам выше (особенно `uRead`/`oRead` у Merge: `min(i+1, len)`), не подгонять код под тест вслепую; если в тесте или в этом плане найдена настоящая ошибка — сообщить DONE_WITH_CONCERNS с точным объяснением.

- [ ] **Step 5: Commit** — `git add assets/infra-pg.js scripts/infra-viz-check.js && git commit -m "infra-viz: генераторы соединений Nested Loop/Hash/Merge"`

---

### Task 3: Три типа виджета соединений, рисунок, стили, пресеты

**Files:**
- Modify: `assets/infra-pg.js` (после страж-строки: рисунок `joinViz`, `joinCommon`, три записи `INFRA` и три листинга `CODE`), `assets/infra-viz.css`, `scripts/infra-viz-check.js`

**Interfaces:**
- Consumes: `parseIds`, `bJoinNL/Hash/Merge` (Task 2), `window.ALGO_VIZ.mkEl`, `core.plural`, `core.clampInt`, `pages`-подобные помощники.
- Produces: типы `pg-join-nl`, `pg-join-hash`, `pg-join-merge`; поля ввода `data-users` (по умолчанию `1-8`), `data-orders` (по умолчанию `r14`), `data-filter` (`u.id < K`; `0` — без фильтра; по умолчанию `0`). Размеры: пользователи — значения 1..12; заказы — `user_id` 1..12.
- Разбор: `users = parseIds(data-users, 1, 12, false)`, `orders = parseIds(data-orders, 1, 12, true).map((u, i) => ({ n: i + 1, u: u }))`, `K = clampInt(data-filter, 0, 13, 0)`; если `K > 0`, внешняя таблица = `users.filter(id < K)`. Отсутствующий атрибут `data-orders` → `r14`; ПУСТОЙ → пустая таблица заказов.
- Рисунок `joinViz`: сверху строка метрик «Внешних строк: A · заказов прочитано: B из C · <metric.label>: M · пар в результате: D» (без дробей-обманок: `B из C` допустимо, потому что B — прочитано, C — в таблице заказов; формулировка явно «прочитано … из … в таблице»); ряд ячеек внешней таблицы `U` (`iv-join__cell` + модификаторы: `--cur` для `cu`, `--read` для строк с индексом ≤ `cu` у Merge/NL либо уже положенных в хеш у Hash, `--match` для id, участвующих в `out`), ряд ячеек заказов `O` в порядке алгоритма (`--cur` для `co`, `--read` для индексов < числа прочитанных, `--match`), у Hash — ряд «хеш-таблица»: ключи из `built` (`iv-join__cell--hash`); ниже список пар `out` текстом. Всё — через `mkEl`/textContent.
- Легенда (6 пунктов, у каждого legdot-правило в CSS с конкретным цветом, как в Task 2 плана сканов): `iv-join__cell--cur` «текущая строка», `iv-join__cell--read` «уже прочитана», `iv-join__cell--match` «вошла в результат», `iv-join__cell--hash` «лежит в хеш-таблице» (только у Hash — легенда ПО ТИПАМ: у NL и Merge без этого пункта), `iv-join__cell--idle` «ещё не читалась». Итого у NL и Merge 4 пункта, у Hash 5.
- Пресеты — по 4 на тип, БЕЗ дублирования «примера главы»: см. список ниже. Каждый задаёт ровно `data-users`, `data-orders`, `data-filter`.
- Листинги — ровно из Task 2; `lineNotes` — по образцу `pg-scan-*` (одна строка, без вложенных скобок).

Пресеты (одинаковые у трёх типов; различаются только `hint`):

| label | data-users | data-orders | data-filter |
|---|---|---|---|
| «внешняя сторона — 3 строки» | `1-12` | `r24` | `4` |
| «у части пользователей нет заказов» | `1-6` | `1,1,2,2,5,5` | `0` |
| «заказы без пользователя» | `1-3` | `1,2,3,7,8,9` | `0` |
| «много заказов у одного» | `1-4` | `2,2,2,2,2,2,2,3` | `0` |

`hint` по типам — NL: «3 обращения к индексу», «обращение и у тех, у кого пусто», «лишние заказы индекс не трогает», «все заказы одного — подряд по индексу»; Hash: «заказов прочитано все 24, хеш — 3 строки», «читает все заказы, даже ненужные», «заказы без пары пропускает, но читает», «одно ведро — длинная работа на пробе»; Merge: «читает, пока не кончится сторона», «ныряет мимо пустых», «остановился на последнем пользователе, хвост заказов не прочитан», «один пользователь — j идёт подряд».

- [ ] **Step 1: Падающий jsdom-тест** — в `scripts/infra-viz-check.js` перед `process.exit` (рядом с jsdom-блоком сканов; `JSDOM`, `read`, `readInfra`, `infraScripts`, `eq`, `infra`, `last` уже есть):

```js
{
  const types = { "pg-join-nl": infra.bJoinNL, "pg-join-hash": infra.bJoinHash, "pg-join-merge": infra.bJoinMerge };
  const run = (type, attrs) => {
    const div = `<div class="algo-viz" id="w" tabindex="0" data-viz="${type}" ${attrs}></div>`;
    const dom = new JSDOM(`<!DOCTYPE html><html><body>${div}<script>${read("algo-viz.js")}</script>${infraScripts()}</body></html>`, { runScripts: "dangerously", pretendToBeVisual: true });
    dom.window.document.dispatchEvent(new dom.window.Event("DOMContentLoaded"));
    const el = dom.window.document.getElementById("w");
    for (let i = 0; i < 500; i++) el.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    return el;
  };
  const attrs = 'data-users="1-6" data-orders="r14" data-filter="0"';
  const us = infra.parseIds("1-6", 1, 12, false), os = infra.parseIds("r14", 1, 12, true).map((u, i) => ({ n: i + 1, u }));
  Object.keys(types).forEach((t) => {
    const el = run(t, attrs), fin = last(types[t](us, os));
    eq(`${t}: построен без ошибок и дошёл до итога`, [el.classList.contains("algo-viz--ready") && !/Ошибка визуализации|Неизвестный тип/.test(el.textContent), /Итог:/.test(el.textContent)], [true, true]);
    eq(`${t}: ячейки внешней таблицы и заказов`, [el.querySelectorAll(".iv-join__row--users .iv-join__cell").length, el.querySelectorAll(".iv-join__row--orders .iv-join__cell").length], [us.length, os.length]);
    eq(`${t}: пар в результате на экране = модель`, +el.querySelector(".iv-join__metrics").getAttribute("data-pairs"), fin.out.length);
    eq(`${t}: прочитано заказов на экране = модель`, +el.querySelector(".iv-join__metrics").getAttribute("data-oread"), fin.oRead);
    const bad = run(t, 'data-users="abc" data-orders="" data-filter="zzz"');
    eq(`${t}: мусорные атрибуты — без ошибок`, bad.classList.contains("algo-viz--ready") && !/Ошибка визуализации/.test(bad.textContent), true);
    const src = readInfra(), body = src.slice(src.indexOf(`    "${t}": {`));
    const block = (body.match(/presets: \[\n([\s\S]*?)\n      \],/) || [])[1] || "";
    const presets = [...block.matchAll(/set: \{([^}]*)\}/g)].map((m) => Object.fromEntries([...m[1].matchAll(/"(data-[a-z-]+)":\s*"([^"]*)"/g)].map((x) => [x[1], x[2]])));
    eq(`${t}: 4 пресета, ровно три поля, нет дубля «пример главы»`, [presets.length, presets.every((p) => Object.keys(p).sort().join() === "data-filter,data-orders,data-users"), /label: "пример главы/.test(block)], [4, true, false]);
    presets.forEach((p, i) => {
      const e = run(t, Object.keys(p).map((k) => `${k}="${p[k]}"`).join(" "));
      eq(`${t}: пресет ${i + 1} строится`, e.classList.contains("algo-viz--ready") && !/Ошибка визуализации/.test(e.textContent) && /Итог:/.test(e.textContent), true);
    });
  });
  // легенда: правило legdot с цветом для КАЖДОГО класса из легенды в исходнике (урок плана 2)
  const src = readInfra(), css = read("infra-viz.css");
  const legBlock = (src.match(/var joinLegendAll = \[([\s\S]*?)\n  \];/) || [])[1] || "";
  const classes = [...legBlock.matchAll(/cls: "([^"]+)"/g)].map((m) => m[1]);
  eq("join: легенда содержит 5 классов", classes.length, 5);
  classes.forEach((c) => eq(`join: legdot-правило с цветом для ${c}`, new RegExp("\\.algo-tp__legdot--" + c.replace(/[-_]/g, (x) => "\\" + x) + "\\s*\\{[^}]*#[0-9a-fA-F]{6}").test(css), true));
}
```

- [ ] **Step 2: Падение** — Run: `node scripts/infra-viz-check.js` — Expected: FAIL «Неизвестный тип» для `pg-join-*`.

- [ ] **Step 3: Реализация.** В `assets/infra-pg.js`, после страж-строки и до `var INFRA = {`:

```js
  var joinLegendAll = [
    { cls: "iv-join__cell--idle", label: "ещё не читалась" },
    { cls: "iv-join__cell--cur", label: "текущая строка" },
    { cls: "iv-join__cell--read", label: "уже прочитана" },
    { cls: "iv-join__cell--match", label: "вошла в результат" },
    { cls: "iv-join__cell--hash", label: "лежит в хеш-таблице" }
  ];
  var joinLegend = joinLegendAll;
  var joinLegendNoHash = joinLegendAll.filter(function (e) { return e.cls !== "iv-join__cell--hash"; });

  function joinCommonParse(kind) {
    return function (root) {
      var uAttr = root.getAttribute("data-users"), oAttr = root.getAttribute("data-orders");
      var users = parseIds(uAttr == null ? "1-8" : uAttr, 1, 12, false);
      var K = core.clampInt(root.getAttribute("data-filter"), 0, 13, 0);
      if (K > 0) users = users.filter(function (id) { return id < K; });
      var orders = parseIds(oAttr == null ? "r14" : oAttr, 1, 12, true).map(function (u, i) { return { n: i + 1, u: u }; });
      var gen = { nl: bJoinNL, hash: bJoinHash, merge: bJoinMerge }[kind];
      return { users: users, orders: orders, filter: K, steps: gen(users, orders) };
    };
  }
  var joinCommon = {
    values: function () { return []; },
    pointers: function () { return { lo: -1, hi: -1 }; },
    sumCells: ["Пар в результате", "Заказов прочитано"],
    sumValues: function (s) { return [{ text: s.out.length, cls: "gt" }, { text: s.oRead }]; },
    status: function (s, idx, total) { if (s.done) return { kind: "ok", icon: "✓", head: "Готово", text: s.info }; return { kind: "info", hot: !!s.hot, icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
    stepCard: function (s) { return { a: s.metric.label + ": " + s.metric.value, b: "пар " + s.out.length, c: "заказов прочитано " + s.oRead, cls: "gt" }; }
  };

  function joinViz(panel, ctx, kind) {
    var H = window.ALGO_VIZ;
    var wrap = H.mkEl("div", "iv-join");
    panel.appendChild(wrap);
    return function (s) {
      wrap.innerHTML = "";
      var m = H.mkEl("div", "iv-join__metrics", "Внешних строк: " + s.U.length + " · заказов прочитано: " + s.oRead + " (в таблице заказов " + s.O.length + ") · " + s.metric.label + ": " + s.metric.value + " · пар в результате: " + s.out.length);
      m.setAttribute("data-pairs", String(s.out.length));
      m.setAttribute("data-oread", String(s.oRead));
      wrap.appendChild(m);
      var matchedU = {}, matchedN = {};
      s.out.forEach(function (p) { matchedU[p.u] = true; matchedN[p.n] = true; });
      var rowU = H.mkEl("div", "iv-join__row iv-join__row--users");
      rowU.appendChild(H.mkEl("div", "iv-join__label", "внешняя таблица (users.id)"));
      s.U.forEach(function (id, i) {
        var cls = "iv-join__cell" + (i === s.cu ? " iv-join__cell--cur" : matchedU[id] ? " iv-join__cell--match" : i < s.uRead ? " iv-join__cell--read" : " iv-join__cell--idle");
        rowU.appendChild(H.mkEl("div", cls, String(id)));
      });
      if (!s.U.length) rowU.appendChild(H.mkEl("div", "iv-join__empty", "пусто"));
      wrap.appendChild(rowU);
      if (kind === "hash") {
        var rowH = H.mkEl("div", "iv-join__row iv-join__row--hash");
        rowH.appendChild(H.mkEl("div", "iv-join__label", "хеш-таблица (ключи)"));
        s.built.forEach(function (id) { rowH.appendChild(H.mkEl("div", "iv-join__cell iv-join__cell--hash", String(id))); });
        if (!s.built.length) rowH.appendChild(H.mkEl("div", "iv-join__empty", "пока пуста"));
        wrap.appendChild(rowH);
      }
      var rowO = H.mkEl("div", "iv-join__row iv-join__row--orders");
      rowO.appendChild(H.mkEl("div", "iv-join__label", kind === "hash" ? "заказы (user_id), порядок таблицы" : "заказы (user_id), порядок индекса"));
      s.O.forEach(function (o, i) {
        var cls = "iv-join__cell" + (i === s.co ? " iv-join__cell--cur" : matchedN[o.n] ? " iv-join__cell--match" : i < s.oRead ? " iv-join__cell--read" : " iv-join__cell--idle");
        var cell = H.mkEl("div", cls, String(o.u));
        cell.title = "заказ №" + o.n + ", user_id " + o.u;
        rowO.appendChild(cell);
      });
      if (!s.O.length) rowO.appendChild(H.mkEl("div", "iv-join__empty", "пусто"));
      wrap.appendChild(rowO);
      var pairs = H.mkEl("div", "iv-join__pairs", s.out.length ? "Пары: " + s.out.map(function (p) { return "(" + p.u + ", №" + p.n + ")"; }).join(" ") : "Пар пока нет");
      wrap.appendChild(pairs);
    };
  }
```

Три записи `INFRA` (одна в полном виде — `pg-join-nl`; `pg-join-hash` и `pg-join-merge` — ПОЛНЫЕ копии той же формы, **каждая записана целиком, без общих вызовов в полях, которые разбирают регэкспы**: `codeKey`, `inputs:`, `presets:`, `lineNotes:`; отличия — перечислены ниже):

```js
    "pg-join-nl": {
      badge: "Postgres · Nested Loop",
      desc: "Для каждой строки внешней таблицы — поиск подходящих заказов по индексу. Цена — одно обращение к индексу на внешнюю строку.",
      valuesLabel: "", codeKey: "pg-join-nl", fillRange: false,
      complexity: { time: "O(внешних · log заказов)", space: "O(1)", good: "★ выигрывает, когда внешних строк мало" },
      varOrder: ["u", "o"],
      varDesc: { u: "Текущая внешняя строка", o: "Найденный заказ" },
      lineNotes: { 2: "Внешняя таблица — только строки, прошедшие фильтр", 3: "Одно обращение к индексу на КАЖДУЮ внешнюю строку, даже если заказов нет", 4: "Каждая найденная пара сразу в результат" },
      rules: [{ head: "обращений", body: "= внешних строк", cls: "eq" }, { head: "хеш и сортировка", body: "не нужны", cls: "gt" }],
      legend: joinLegendNoHash,
      presets: [
        { label: "внешняя сторона — 3 строки", set: { "data-users": "1-12", "data-orders": "r24", "data-filter": "4" }, hint: "3 обращения к индексу" },
        { label: "у части пользователей нет заказов", set: { "data-users": "1-6", "data-orders": "1,1,2,2,5,5", "data-filter": "0" }, hint: "обращение и у тех, у кого пусто" },
        { label: "заказы без пользователя", set: { "data-users": "1-3", "data-orders": "1,2,3,7,8,9", "data-filter": "0" }, hint: "лишние заказы индекс не трогает" },
        { label: "много заказов у одного", set: { "data-users": "1-4", "data-orders": "2,2,2,2,2,2,2,3", "data-filter": "0" }, hint: "все заказы одного — подряд по индексу" }
      ],
      parse: joinCommonParse("nl"),
      inputs: [{ attr: "data-users", label: "Внешняя таблица, users.id (N, a-b, rK)" }, { attr: "data-orders", label: "Заказы, user_id (N, a-b, rK)" }, { attr: "data-filter", label: "Фильтр u.id < K (0 — без)" }],
      values: joinCommon.values,
      title: function (ctx) { return "Nested Loop: " + ctx.users.length + " внешних строк, " + ctx.orders.length + " заказов"; },
      pointers: joinCommon.pointers,
      sumCells: joinCommon.sumCells,
      sumValues: joinCommon.sumValues,
      status: joinCommon.status,
      stepCard: joinCommon.stepCard,
      varsOf: function (s) { return { u: s.vars.u, o: s.vars.o }; },
      customViz: function (panel, ctx) { return joinViz(panel, ctx, "nl"); }
    },
```
Отличия `pg-join-hash`: `badge "Postgres · Hash Join"`, `desc` «Сначала хеш-таблица по внешней таблице (build), потом один проход по ВСЕМ заказам с поиском по хешу (probe).», `codeKey "pg-join-hash"`, `complexity { time: "O(внешних + заказов)", space: "O(внешних)", good: "★ один проход по каждой стороне" }`, `varOrder ["u","o"]`, `varDesc { u: "Пользователь из хеш-таблицы", o: "Текущий заказ (probe)" }`, `lineNotes { 2: "build: хеш по внешней таблице (после фильтра)", 3: "Положили строку в хеш по ключу user id", 6: "probe: читаем ВСЕ заказы, сколько бы ни совпало", 7: "Один поиск по хешу на заказ; нет в хеше — заказ пропускаем, но он уже прочитан", 8: "Совпадение — пара в результат" }`, `rules [{ head: "прочитано заказов", body: "= все заказы", cls: "eq" }, { head: "память", body: "хеш по внешней стороне", cls: "lt" }]`, `legend: joinLegend`, `varsOf: function (s) { return { u: s.vars.u, o: s.vars.o }; }`, `parse: joinCommonParse("hash")`, `title` «Hash Join: …», `customViz: … joinViz(panel, ctx, "hash")`, `sumCells` как у остальных, пресеты те же, `hint`: «заказов прочитано все 24, хеш — 3 строки» / «читает все заказы, даже ненужные» / «заказы без пары пропускает, но читает» / «одно ведро — длинная работа на пробе». Отличия `pg-join-merge`: `badge "Postgres · Merge Join"`, `desc` «Оба входа отсортированы по ключу; два указателя идут навстречу друг другу, пока одна из сторон не кончится.», `codeKey "pg-join-merge"`, `complexity { time: "O(внешних + заказов)", space: "O(1)", good: "★ без хеша; входы уже отсортированы индексами" }`, `varOrder ["i","j"]`, `varDesc { i: "Позиция во внешней таблице", j: "Позиция в заказах" }`, `lineNotes { 3: "Идём, пока не кончилась хотя бы одна из сторон", 4: "Меньше — у пользователя заказов больше нет, сдвигаем i", 6: "Больше — заказ без пользователя, сдвигаем j", 9: "Равны — пара в результат", 10: "Следующий заказ: тот же пользователь или уже другой" }`, `rules [{ head: "остановка", body: "кончилась любая сторона", cls: "gt" }, { head: "вход", body: "уже отсортирован", cls: "eq" }]`, `legend: joinLegendNoHash`, `varsOf: function (s) { return { i: s.vars.i, j: s.vars.j }; }`, `parse: joinCommonParse("merge")`, `title` «Merge Join: …», `customViz: … joinViz(panel, ctx, "merge")`, пресеты те же, `hint`: «читает, пока не кончится сторона» / «ныряет мимо пустых» / «остановился на последнем пользователе, хвост заказов не прочитан» / «один пользователь — j идёт подряд».

Три листинга в `CODE` (ключи `"pg-join-nl"`, `"pg-join-hash"`, `"pg-join-merge"`) — строки ровно из Task 2 (с 4 пробелами отступа внутри функций).

CSS в `assets/infra-viz.css` (токены `--iv-j-*`, карточка виджета всегда тёмная; legdot-правила — с ЛИТЕРАЛЬНЫМИ цветами, потому что точки легенды стоят вне `.iv-join`):

```css
.iv-join { --iv-j-idle:#334155; --iv-j-cur:#f59e0b; --iv-j-read:#1d4ed8; --iv-j-match:#16a34a; --iv-j-hash:#a78bfa; --iv-j-fg:#e2e8f0; }
.iv-join__metrics { font:600 13px/1.4 system-ui,sans-serif; color:var(--iv-j-fg); margin-bottom:8px; }
.iv-join__row { display:flex; flex-wrap:wrap; align-items:center; gap:3px; margin-bottom:6px; }
.iv-join__label { flex:0 0 100%; font:600 11px/1.2 system-ui,sans-serif; color:var(--iv-j-fg); opacity:.85; }
.iv-join__cell { min-width:24px; height:24px; padding:0 4px; display:flex; align-items:center; justify-content:center; border-radius:4px; border:2px solid transparent; font:600 12px/1 ui-monospace,monospace; color:#fff; background:var(--iv-j-idle); }
.iv-join__cell--read { background:var(--iv-j-read); }
.iv-join__cell--match { background:var(--iv-j-match); }
.iv-join__cell--hash { background:var(--iv-j-hash); }
.iv-join__cell--cur { border-color:var(--iv-j-cur); }
.iv-join__empty { font:12px/1 system-ui,sans-serif; color:var(--iv-j-fg); opacity:.7; }
.iv-join__pairs { font:12px/1.4 ui-monospace,monospace; color:var(--iv-j-fg); margin-top:4px; word-break:break-word; }
/* точки легенды вне .iv-join: цвета литералами, равными токенам выше */
.algo-tp__legdot--iv-join__cell--idle { background:#334155; }
.algo-tp__legdot--iv-join__cell--read { background:#1d4ed8; }
.algo-tp__legdot--iv-join__cell--match { background:#16a34a; }
.algo-tp__legdot--iv-join__cell--hash { background:#a78bfa; }
.algo-tp__legdot--iv-join__cell--cur { background:#334155; box-shadow:0 0 0 2px #f59e0b; }
@media (max-width:520px) { .iv-join__cell { min-width:20px; height:22px; font-size:11px; } }
```

- [ ] **Step 4:** Run: `node scripts/infra-viz-check.js && node scripts/check-viz.js && node --check assets/infra-pg.js && node scripts/check-registries.js` — Expected: зелёные (check-viz: +3 типа = 159, +12 пресетов; у каждого `codeKey`, `lineNotes` в пределах листингов, пресеты = поля `inputs`). Ошибку правил поправить по тексту.

- [ ] **Step 5: Commit** — `git add assets scripts && git commit -m "infra-viz: виджеты pg-join-nl/hash/merge"`

---

### Task 4: Сверка с живым Postgres, подраздел в главе, проверки, браузер

**Files:**
- Modify: `src/postgres-plans.md`, `CLAUDE.md`; при расхождении модели — `assets/infra-pg.js` + `scripts/infra-viz-check.js`

- [ ] **Step 1: Сверка модели с живой базой.** `make pg-lab`, `make pg-psql`. Маленькие таблицы с теми же данными, что у виджета (данные формируются из `parseIds` в node — SQL собрать из его вывода):

```sql
CREATE TABLE j_users (id int PRIMARY KEY);
CREATE TABLE j_orders (id int PRIMARY KEY, user_id int NOT NULL);
-- заполнить из вывода node: users = parseIds("1-12",1,12,false), orders = parseIds("r24",1,12,true) с n = 1..24 (id = n)
CREATE INDEX j_orders_user_id_idx ON j_orders (user_id);
VACUUM ANALYZE j_users; VACUUM ANALYZE j_orders;
```

Для каждого из четырёх пресетов и примера по умолчанию (`1-8`, `r14`, фильтр 0) принудить нужный алгоритм (`SET enable_hashjoin/enable_mergejoin/enable_nestloop = off` по очереди; `SET enable_seqscan = off`, где нужен индекс; только для эксперимента) и снять `EXPLAIN (ANALYZE, BUFFERS)` на запросе `SELECT * FROM j_users u JOIN j_orders o ON o.user_id = u.id WHERE u.id < K` (K из фильтра пресета; без фильтра — без WHERE). Сравнить с моделью (`node -e` по экспортам `bJoin*`):
  - **Nested Loop:** `loops=` внутреннего узла = число внешних строк (модель: `metric.value`); `actual rows` суммарно = `oRead`.
  - **Hash Join:** `rows` узла `Hash` = число строк в хеш-таблице (модель: `built.length`); `actual rows` у Seq Scan по заказам = все заказы (модель: `oRead` = все).
  - **Merge Join:** `actual rows` у обоих дочерних Index (Only) Scan'ов = сколько строк слияние потянуло с каждой стороны (модель: `uRead`, `oRead`) — особенно на «заказы без пользователя» и «остановился на последнем пользователе»: ранняя остановка должна подтвердиться живьём (иначе чинится модель/текст виджета и об этом сообщается).
Если планировщик на малых таблицах отказывается выбрать алгоритм даже с флагами (или переставляет стороны, строя хеш по заказам) — записать фактический план и подобрать размеры/флаги так, чтобы алгоритм принудился; сторону build в Hash Join модель задаёт жёстко (внешняя таблица) — если живой план строит хеш по другой стороне, это расхождение с моделью: исправить модель/подпись или ограничить пресеты случаями, где сторона совпадает, и сказать об этом в тексте. Таблицу «модель | живой Postgres» (по трём алгоритмам × пресетам) и сырой вывод — в отчёт; расхождение = ошибка модели (живая база — авторитет). Таблицы `j_users`/`j_orders` и SQL-дамп в репозиторий НЕ коммитить; в конце `make pg-lab-down`.

- [ ] **Step 2: Подраздел в главе.** В `src/postgres-plans.md` — сразу ПОСЛЕ блока «> **Мораль, знакомая по всей книге.** …» (конец раздела 2) и ПЕРЕД `## 3. Сортировка и work_mem` — подраздел `### Посмотри пошагово: три способа соединить две таблицы` (простым языком; аналогия ДО определения — например «две стопки карточек: либо для каждой карточки из тонкой стопки бегать в картотеку; либо разложить тонкую стопку по ячейкам и один раз пройти всю толстую; либо отсортировать обе стопки и идти по ним пальцами»). Затем «Что смотреть» и три вкладки:

```html
<div class="algo-viz-tabs">
<div class="algo-viz" data-tab="Nested Loop" data-viz="pg-join-nl" data-users="1-12" data-orders="r24" data-filter="4"></div>
<div class="algo-viz" data-tab="Hash Join" data-viz="pg-join-hash" data-users="1-12" data-orders="r24" data-filter="4"></div>
<div class="algo-viz" data-tab="Merge Join" data-viz="pg-join-merge" data-users="1-12" data-orders="r24" data-filter="4"></div>
</div>
```

В тексте: связать с уже стоящими в главе числами (`loops=200000`/`loops=19`, `Batches: 2` — где уместно, только то, что уже в главе), привести таблицу «модель | живой Postgres» из Step 1 с реальными числами; предложение о том, что виджет считает только строки и обращения (не время, не стоимость, не кэш, не выбор планировщика — маленькие таблицы показывают механизм, а не план); `что смотреть` называет: у Nested Loop счётчик обращений равен числу внешних строк и растёт даже у пользователей без заказов; у Hash Join заказов прочитано всегда все; у Merge Join заказов прочитано меньше, когда кончились пользователи (если Step 1 это подтвердил); пресеты «внешняя сторона — 3 строки» и «заказы без пользователя». Никаких новых утверждений про Postgres, кроме измеренных в Step 1 или уже стоящих в главе; про «лучший алгоритм» — только в духе уже стоящей «Морали» (размер входа решает). Листингов ```go в главу не вставлять.

- [ ] **Step 3: `CLAUDE.md`** — в пункте «Инфраструктурные виджеты» одной фразой добавить типы `pg-join-nl|hash|merge` (модель: внутреннее соединение `users.id = orders.user_id`, `data-users`/`data-orders` в токенах `N`, `a-b`, `rK`, фильтр `u.id < K`); остальное не трогать.

- [ ] **Step 4: Полный прогон как в CI** — `mdbook build && node scripts/check-links.js && node scripts/check-registries.js && node scripts/check-viz.js && node scripts/infra-viz-check.js && node scripts/check-challenges.js && node scripts/progress-render-check.js`; из `exercises/`: `gofmt -l . && go run ./cmd/checksnippets -src ../src`; в фоне параллельно, ждать: `node scripts/viz-render-check.js` (~25 мин), `node scripts/check-viz-names.js` (~8 мин), `node scripts/predict-check.js`. Каждый скрипт с кодом выхода в отчёт; soft-skip не считается. Если `check-viz-names.js` или `viz-render-check.js` упали из-за новых типов — чинить причину (без записей в allow-list), перезапустить, сообщить.

- [ ] **Step 5: Браузер (Playwright MCP, инструменты — через ToolSearch)** — `mdbook serve` в фоне, страница `postgres-plans.html`: на каждой из трёх вкладок нажать все 4 пресета и кнопку «пример главы» (должна быть ОДНА), прошагать до конца, прочитать итоговые статусы и метрики и сравнить с таблицей Step 1; режим 🎯 на `for … {` (NL: `idx.Lookup` с пустым/непустым результатом) и `if`/`else if` у Merge — вопросы осмысленные; точки легенды окрашены и различимы во всех трёх вкладках; тёмная тема navy; ширина 360 px (ряды ячеек переносятся, без горизонтальной прокрутки страницы); стрелки ←/→ при фокусе на виджете не листают главу; переключение вкладок не теряет шаг. Скриншоты — в scratchpad, не в репозиторий. Остановить `mdbook serve`; проверить `git -C /home/idel/DevGo/algorithms-book status --short` на посторонние файлы Playwright и убрать только свои.

- [ ] **Step 6: Commit** — `git add src/postgres-plans.md CLAUDE.md assets scripts && git commit -m "Postgres: виджеты соединений в главе про планы, сверка с живой базой"`

---

## Self-review

- **Покрытие спеки (этот план):** виджет `pg-join` (спека: «Nested Loop, Hash Join, Merge Join шагами (связь с главами о хеш-таблице и слиянии)»), теория простым языком с аналогией, числа сверены с живой базой; разделение файла (рекомендация финального ревью плана 2, нужно до Redis/Kafka). Остальные Postgres-виджеты (`pg-index-to-heap`, `pg-mvcc`, `pg-vacuum`, `pg-wal`), Redis и Kafka — отдельные планы.
- **Плейсхолдеры:** первая запись INFRA (`pg-join-nl`) приведена целиком; для `pg-join-hash`/`pg-join-merge` перечислены ВСЕ отличающиеся поля (остальное — копия формы первой, как и в плане сканов); листинги и кадры — полным списком; тесты и код генераторов, рисунка и CSS — целиком.
- **Типы/имена:** `parseIds`, `joinPairs`, `bJoinNL/Hash/Merge`, шаг `{line, vars, info, U, O, cu, co, out, uRead, oRead, built, metric, hot?, done?}`, классы `iv-join__*`, атрибуты `data-pairs`/`data-oread`, ключи `pg-join-nl|hash|merge`, `core.plural/clampInt/mulberry32/shuffled`, `infraFiles/readInfra/infraScripts` — едины в Task 1–4; номера строк листингов (NL 0–8, Hash 0–12, Merge 0–14) совпадают с `line` в генераторах и `lineNotes`.
- **Review Focus:** п.1 — тест «Merge: остановился … 3 из 5» + живая сверка; п.2 — тест «Hash: прочитаны ВСЕ заказы»; п.3 — тест «NL: одно обращение на каждую внешнюю строку» + кадр «пусто»; п.4 — наборы `noOrders/noUsers/orphans/manyOne` + фаззинг 300 случаев; п.5 — Task 1 Step 4 (все прежние проверки без изменения ожиданий).
- **Известные риски:** (а) на малых таблицах планировщик может не принять алгоритм даже с `enable_*` или перестроить сторону build у Hash Join — Step 1 велит записать фактический план и подогнать размеры/текст, а не модель под ожидание; (б) после разделения файла `check-viz-names.js` и остальные скрипты парсят несколько файлов — Step 4 Task 1 проверяет, что числа типов/пресетов/allow-list не изменились; (в) `rK` заказов даёт одинаковые данные в виджете и в SQL только если SQL строится из вывода тех же `parseIds` — Step 1 обязывает так делать.
