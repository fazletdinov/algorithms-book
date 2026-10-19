# Тесты масштаба — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** в 12 пакетах ядра функция, решённая на класс сложности хуже задуманного, падает отдельным тестом масштаба с понятной причиной; эталон проходит с запасом.

**Architecture:** общий помощник `exercises/internal/scaletest.Within` (горутина + срок 2 с) и по одному файлу `<pkg>_zscale_test.go` на пакет. В условие функции в заготовке и эталоне добавляется абзац «Ограничения: …». Каталог `internal` исключается из всех перечислений пакетов тренажёра. Банк `assets/problems.js` перегенерируется.

**Tech Stack:** Go 1.24 (`testing`, без внешних зависимостей), Node (скрипты проверок), mdBook.

**Spec:** `docs/superpowers/specs/2026-10-19-scale-tests-design.md`. Исполнитель читает спецификацию и этот план.

## Global Constraints

- Рабочая копия — worktree `.worktrees/scale-tests` на ветке `scale-tests` от `main` (коммит спецификации `0aa9903`). Корень worktree ниже — `$WT`.
- **Любой запуск мутанта или непроверенного кода — только через `scripts/safe-run.sh`** (из корня worktree): `scripts/safe-run.sh go -C exercises test …`. Код 137 — упор в память, 124 — срок. Без обёртки наивный граф на матрице смежности занимает около 10 ГБ; 2026-10-06 похожий мутант уронил VS Code.
- Останавливать только свои процессы по PID. Никаких `pkill` по имени и `mdbook serve`.
- Срок теста — `scaletest.Limit = 2 * time.Second`. Калибровка: эталон ≤ 50 мс на машине автора, наивное решение ≥ 6 с (3 срока) — иначе подбирать n.
- Тест ловит разрыв класса, а не лишний log: решение на сортировке там, где задумана куча, обязано пройти.
- Имя файла — `<pkg>_zscale_test.go`, без build-тега. Имя теста — `Test<Func>Scales` или `Test<Type>Scales`.
- Сообщение `what` — одна строка, по-русски, по шаблону `<Func>(<вход>) — похоже на <класс наивного> там, где нужен <класс эталона> (замер: эталон ~X мс, перебор ~Y с)`. X и Y — числа из замера; при перебор > 60 с пиши «перебор > 60 с»; если перебор не завершается — «перебор не завершается».
- Абзац условия начинается ровно с `Ограничения: ` и стоит перед абзацем «Ожидаемая сложность:». Текст абзаца одинаков в `<pkg>.go` и `<pkg>_solution.go`.
- Комментарии — по-русски и объясняют «почему». Стиль — как в соседних тестах пакета. `gofmt` обязателен.
- Сигнатуры функций и типов не меняются.
- `HouseRobber`, `ClimbStairs`, `Knapsack01`, `LIS`, `QuickSort`, `Power` — вне рамок. Их тесты не трогать.
- Коммиты — по-русски, в конце строка `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Ветка `quality-stage-4` (worktree `.worktrees/quality-4`) не слита и правит `CLAUDE.md`. Здесь `CLAUDE.md` правится только в Task 7, точечно, одним абзацем — чтобы слияние было простым.

## Review Focus

1. **Паника в решении на большом входе** (выход за границу, переполнение). Читатель должен увидеть «паника: …» с именем теста масштаба, а не немое падение бинарника. `Within` ловит панику в горутине — Task 1, тест `TestWithinReportsPanic`.
2. **Разумное, но не идеальное решение, которое должно пройти.** Куча вместо дека в `MaxSlidingWindow`, сортировка в `MinMeetingRooms`, бинарный поиск дополнения в `PairWithTargetSum`. Ловить лишний log нельзя. Каждая задача 3–6 гоняет мутант «на log хуже» и требует зелёного (шаг «мутант O(n log n) проходит»).
3. **«Умный перебор» с досрочным выходом,** который проскакивает худший вход (вложенный цикл с `break` по сумме > target). Входы подобраны так, что досрочного выхода нет. Мутант в задаче — именно такой наивный вариант.
4. **Утечка горутины после срока** тормозит соседние тесты пакета. Файл `_zscale` идёт последним, и `check-registries` требует это имя — Task 1.
5. **Владелец теста в банке.** `TestRangeSumsScales` обязан достаться `RangeSums`, иначе тест не попадёт в прогон одной функции и в собеседование. Это закрепляет Task 2 (`TestOwnerOf`), а после перегенерации банка в задачах 3–6 поле `t` проверяется руками.

---

## Карта файлов

- Create: `exercises/internal/scaletest/scaletest.go`, `exercises/internal/scaletest/scaletest_test.go`
- Create: `exercises/<pkg>/<pkg>_zscale_test.go` — для `slidingwindow`, `prefixsum`, `twopointers`, `stack`, `binarysearch`, `intervals`, `hashtable`, `binheap`, `treedfs`, `graphs`, `greedy`, `dp`; ещё `exercises/codereview/codereview_zscale_test.go` (перенос существующего теста)
- Modify: `exercises/codereview/codereview_test.go` (убрать `TestHasDuplicateScales`)
- Modify: `exercises/<pkg>/<pkg>.go` и `<pkg>_solution.go` — абзац «Ограничения:» у целевой функции
- Modify: `scripts/check-registries.js` (два перебора + правило `_zscale`), `scripts/srs-check.js:2140`, `exercises/cmd/problembank/main.go:138`, `exercises/cmd/tracescan/main.go:48`
- Modify: `exercises/cmd/internal/stubdoc/stubdoc_test.go` (случаи `TestOwnerOf`, `TestStatement`)
- Regenerate: `assets/problems.js`
- Modify (Task 7): `src/README.md`, `exercises/README.md`, `CLAUDE.md`

---

### Task 1: Помощник `scaletest`, исключение `internal`, правило имени файла

**Files:**
- Create: `exercises/internal/scaletest/scaletest.go`, `exercises/internal/scaletest/scaletest_test.go`
- Create: `exercises/codereview/codereview_zscale_test.go`; Modify: `exercises/codereview/codereview_test.go`
- Modify: `scripts/check-registries.js:304-308`, `:445-458`; `scripts/srs-check.js:2140`; `exercises/cmd/problembank/main.go:138`; `exercises/cmd/tracescan/main.go:48`

**Interfaces:**
- Produces: `package scaletest` с `const Limit = 2 * time.Second` и `func Within(t testing.TB, limit time.Duration, what string, run func())`. Импорт — `github.com/fazletdinov/algorithms-book/exercises/internal/scaletest`.

- [ ] **Step 0: Создать worktree**

```bash
cd /home/idel/DevGo/algorithms-book
git worktree add .worktrees/scale-tests -b scale-tests main
cd .worktrees/scale-tests
```

- [ ] **Step 1: Написать падающие тесты помощника**

`exercises/internal/scaletest/scaletest_test.go`:

```go
package scaletest

import (
	"fmt"
	"strings"
	"testing"
	"time"
)

// recorder подменяет Fatalf: тесту помощника нужно увидеть, ЧТО он сообщил
// бы читателю, и не упасть самому. Остальные методы — настоящего t.
type recorder struct {
	testing.TB
	failed bool
	msg    string
}

func (r *recorder) Helper()                     {}
func (r *recorder) Logf(string, ...any)         {}
func (r *recorder) Fatalf(f string, args ...any) { r.failed, r.msg = true, fmt.Sprintf(f, args...) }

func TestWithinPassesFastRun(t *testing.T) {
	r := &recorder{TB: t}
	Within(r, time.Second, "быстрый", func() {})
	if r.failed {
		t.Fatalf("быстрый run уронил тест: %s", r.msg)
	}
}

// Мутант «Within не ждёт срока» (вернуться сразу) сделал бы зелёным любой
// перебор — ловится только здесь.
func TestWithinFailsSlowRun(t *testing.T) {
	r := &recorder{TB: t}
	Within(r, 20*time.Millisecond, "медленный вход", func() { time.Sleep(300 * time.Millisecond) })
	if !r.failed {
		t.Fatal("run дольше срока не уронил тест")
	}
	if !strings.Contains(r.msg, "медленный вход") || !strings.Contains(r.msg, "20ms") {
		t.Fatalf("в сообщении нет описания входа или срока: %q", r.msg)
	}
}

// Паника в чужой горутине роняет бинарник без имени теста; Within переносит
// её в тест, чтобы читатель увидел, какой вход её вызвал.
func TestWithinReportsPanic(t *testing.T) {
	r := &recorder{TB: t}
	Within(r, time.Second, "вход с паникой", func() {
		var a []int
		_ = a[3]
	})
	if !r.failed || !strings.Contains(r.msg, "паника") || !strings.Contains(r.msg, "вход с паникой") {
		t.Fatalf("паника не превратилась в падение теста с описанием: failed=%v, %q", r.failed, r.msg)
	}
}
```

- [ ] **Step 2: Убедиться, что тесты не собираются**

Run: `go -C exercises test ./internal/scaletest/`
Expected: FAIL, `undefined: Within`.

- [ ] **Step 3: Написать помощник**

`exercises/internal/scaletest/scaletest.go`:

```go
// Package scaletest — общий помощник тестов масштаба (<pkg>_zscale_test.go).
//
// Тест масштаба проверяет не ответ, а сложность: на худшем входе решение,
// хуже задуманного на целый класс (n² вместо n, экспонента вместо полинома),
// не укладывается в срок. Лишний log он не ловит — и не должен.
package scaletest

import (
	"fmt"
	"runtime/debug"
	"testing"
	"time"
)

// Limit — срок по умолчанию. Входы тестов подобраны так, что эталон укладывается
// примерно в 50 мс, а решение хуже на класс — в 6 с и больше: запас на порядок в
// обе стороны выдерживает и машину CI (медленнее в 2–3 раза), и -race (~10×).
const Limit = 2 * time.Second

// Within выполняет run в горутине и роняет тест, если она не вернулась за limit
// или запаниковала. what — что гонялось и что значит падение: вход, ожидаемый
// класс, замеры. Ответ run проверяет сам тест после Within.
//
// После срока run продолжает работать до выхода тестового бинарника: остановить
// чужую горутину в Go нельзя. Поэтому файлы тестов масштаба идут последними.
func Within(t testing.TB, limit time.Duration, what string, run func()) {
	t.Helper()
	if testing.Short() {
		t.Skip("тест масштаба пропущен в -short")
		return
	}
	done := make(chan string, 1) // "" — вернулась, иначе текст паники
	start := time.Now()
	go func() {
		defer func() {
			if p := recover(); p != nil {
				done <- fmt.Sprintf("%v\n%s", p, debug.Stack())
			}
		}()
		run()
		done <- ""
	}()
	select {
	case p := <-done:
		if p != "" {
			t.Fatalf("паника на большом входе: %s — %s", what, p)
			return
		}
		t.Logf("уложилось за %v (срок %v)", time.Since(start).Round(time.Millisecond), limit)
	case <-time.After(limit):
		t.Fatalf("не уложилось в %v: %s", limit, what)
	}
}
```

- [ ] **Step 4: Тесты помощника зелёные, мутант ловится**

Run: `go -C exercises test -count=1 -v ./internal/scaletest/`
Expected: PASS, три теста.

Мутант: временно заменить тело `select` на `return` и прогнать. Expected: FAIL `TestWithinFailsSlowRun`. Затем вернуть файл: `git checkout -- exercises/internal/scaletest/scaletest.go`, или `git diff`, если файл ещё не закоммичен — откатить правку руками.

- [ ] **Step 5: Перенести `TestHasDuplicateScales` в `_zscale` на помощника**

Удалить функцию `TestHasDuplicateScales` из `exercises/codereview/codereview_test.go` вместе с её комментарием. Если после этого импорт `time` в файле не используется — удалить и его. Создать `exercises/codereview/codereview_zscale_test.go`:

```go
package codereview

import (
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
)

// TestHasDuplicateScales — не про правильность ответа (заготовка и так
// отвечает верно), а про то, что реализация обязана уложиться в разумное
// время на большом входе. Худший случай для повторного поиска — массив БЕЗ
// повторов: цикл не может выйти досрочно и обязан пройти все пары.
// O(n) через set укладывается на порядки быстрее срока; O(n²) — нет.
func TestHasDuplicateScales(t *testing.T) {
	n := 200000
	nums := make([]int, n)
	for i := range nums {
		nums[i] = i // все различны — худший случай, никакого досрочного return
	}
	var got bool
	scaletest.Within(t, scaletest.Limit,
		"HasDuplicate(n=200000, все различны) — похоже на O(n²) там, где нужен O(n)"+
			" (замер: заготовка ~4.8 с, исправленная версия ~7 мс)",
		func() { got = HasDuplicate(nums) })
	if got {
		t.Fatalf("HasDuplicate() = true на входе без дубликатов")
	}
}
```

Run: `scripts/safe-run.sh go -C exercises test -count=1 -run HasDuplicate ./codereview/`
Expected: FAIL `TestHasDuplicateScales` с «не уложилось в 2s: HasDuplicate(n=200000…» — заготовка codereview нарочно квадратична.

Run: `go -C exercises test -tags solution -count=1 -run HasDuplicate -v ./codereview/`
Expected: PASS, в логе «уложилось за …».

- [ ] **Step 6: Исключить `internal` из перечислений пакетов**

`scripts/check-registries.js:307` — фильтр каталогов:

```js
  .filter((d) => d.isDirectory() && d.name !== "cmd" && d.name !== "internal" && !d.name.startsWith("."))
```

`scripts/check-registries.js:448`:

```js
  if (pkg === "cmd" || pkg === "internal" || !fs.statSync(dir).isDirectory()) continue;
```

`scripts/srs-check.js:2140`:

```js
  const pkgs = fs.readdirSync(ex).filter((d) => d !== "cmd" && d !== "internal" && fs.statSync(path.join(ex, d)).isDirectory());
```

`exercises/cmd/problembank/main.go:138`:

```go
		if !e.IsDir() || e.Name() == "cmd" || e.Name() == "internal" || strings.HasPrefix(e.Name(), ".") {
```

`exercises/cmd/tracescan/main.go:48`:

```go
		if e.IsDir() && e.Name() != "cmd" && e.Name() != "internal" && !strings.HasPrefix(e.Name(), ".") {
```

Над каждой правкой — комментарий в одну строку: `// internal — служебные пакеты тестов (scaletest), не пакеты тренажёра`. В JS — `//` того же текста.

- [ ] **Step 7: Правило имени `_zscale` в check-registries**

В `scripts/check-registries.js` внутри цикла раздела 6 (рядом с проверкой `_rand_test.go`, строка ~449) добавить:

```js
    if (f.endsWith("_test.go") && !f.endsWith("_zscale_test.go")) {
      const src = fs.readFileSync(path.join(dir, f), "utf8");
      const m = src.match(/^func (Test\w*Scales)\(/m);
      if (m) {
        errors.push(
          `exercises/${pkg}/${f}: ${m[1]} — тест масштаба, он лежит в <пакет>_zscale_test.go: ` +
            `после срока перебор работает до выхода бинарника и не должен тормозить остальные тесты`
        );
      }
    }
```

Комментарий раздела 6 дополнить одной фразой: «Тесты масштаба (`Test*Scales`) — только в `_zscale_test.go`, по той же причине порядка.»

Проверка правила поломкой: временно переименовать `codereview_zscale_test.go` в `codereview_scale_test.go`, запустить `node scripts/check-registries.js`. Expected: ошибка с `TestHasDuplicateScales`. Вернуть имя. Expected: `✅`.

- [ ] **Step 8: Прогнать затронутое**

```bash
node scripts/check-registries.js
go -C exercises run ./cmd/problembank -check
go -C exercises vet -tags solution ./...
go -C exercises vet ./...
gofmt -l exercises
npm ls jsdom >/dev/null 2>&1 || npm i --no-save jsdom
node scripts/srs-check.js
```

Expected: всё зелёное, `gofmt -l` пуст, счёт пакетов прежний — 72.

- [ ] **Step 9: Commit**

```bash
git add exercises/internal exercises/codereview scripts/check-registries.js scripts/srs-check.js exercises/cmd/problembank/main.go exercises/cmd/tracescan/main.go
git commit -m "Тесты масштаба: помощник scaletest.Within, файлы _zscale, internal вне списка пакетов

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Закрепить в stubdoc владельца теста и абзац «Ограничения»

**Files:**
- Modify: `exercises/cmd/internal/stubdoc/stubdoc_test.go` (`TestOwnerOf` ~строка 10, `TestStatement` ~строка 64)

**Interfaces:**
- Consumes: `stubdoc.OwnerOf(test string, funcs []string) string`, `stubdoc.Statement(doc string) (text, hint string)` — без изменений.

- [ ] **Step 1: Добавить случаи**

В таблицу `TestOwnerOf`, перед блоком «Продолжение со строчной буквы»:

```go
		// Тест масштаба достаётся своей функции: попадает в прогон одной функции и в собеседование.
		{"TestRangeSumsScales", []string{"RangeSums", "RangeSum"}, "RangeSums"},
		{"TestMaxSlidingWindowScales", []string{"MaxSlidingWindow", "MaxSumSubarray"}, "MaxSlidingWindow"},
		// Тест масштаба типа — ничей: идёт с группой типа.
		{"TestHashMapScales", []string{"HashMap.Put", "HashMap.Get"}, ""},
```

В таблицу `TestStatement`:

```go
		{
			name: "«Ограничения:» — часть условия, а не подсказка",
			doc: "RangeSums отвечает на запросы.\n\nОграничения: n, q ≤ 10⁵.\n\n" +
				"Ожидаемая сложность: O(n + q).\n",
			wantText: "RangeSums отвечает на запросы.\nОграничения: n, q ≤ 10⁵.",
			wantHint: "Ожидаемая сложность: O(n + q).",
		},
```

- [ ] **Step 2: Прогнать**

Run: `go -C exercises test -count=1 -run 'TestOwnerOf|TestStatement' ./cmd/internal/stubdoc/`
Expected: PASS. Это тесты-характеристики: они закрепляют нынешнее поведение. Если случай `TestHashMapScales` падает, выяснить, как `funcs` называют методы (`AssignTests` в `stubdoc.go:396`), и поправить СЛУЧАЙ под настоящую форму имён, не код. Если же тест масштаба типа достаётся какому-то методу — записать это в отчёт задачи: тогда группа типа его не получит.

- [ ] **Step 3: Commit**

```bash
git add exercises/cmd/internal/stubdoc/stubdoc_test.go
git commit -m "stubdoc: тест масштаба достаётся своей функции, «Ограничения:» остаётся в условии

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Порядок задач 3–6 (одинаков для каждого пакета)

Для каждого пакета задачи:

1. Создать `<pkg>_zscale_test.go` с кодом из задачи. В строке `what` пока стоит `(замер: эталон ~X мс, перебор ~Y с)`.
2. Эталон: `go -C exercises test -tags solution -count=1 -run '<Тест>$' -v ./<pkg>/`. Взять время из строки «уложилось за». Больше 50 мс — уменьшить n (и в тесте, и в `what`) и повторить.
3. Мутант-перебор: ВРЕМЕННО заменить тело функции в `<pkg>_solution.go` кодом из столбца «перебор» задачи и запустить `SAFE_SECS=300 scripts/safe-run.sh go -C exercises test -tags solution -count=1 -run '<Тест>$|<ТабличныйТест>$' ./<pkg>/`. Expected: табличный тест PASS, тест масштаба FAIL с «не уложилось в 2s». Время перебора замерить отдельно: в мутанте поднять срок до `60*time.Second` локальной правкой вызова и запустить с `-v`. Меньше 6 с — увеличить n.
4. Мутант «на log хуже», где он указан: тело — из задачи. Expected: тест масштаба PASS.
5. Вернуть эталон: `git checkout -- exercises/<pkg>/<pkg>_solution.go`. Подставить X и Y в `what`.
6. Добавить абзац «Ограничения:» в `<pkg>.go` и `<pkg>_solution.go`: одинаковый текст из задачи, перед «Ожидаемая сложность:».
7. Заготовка падает: `scripts/safe-run.sh go -C exercises test -count=1 ./<pkg>/` → FAIL (паника TODO).

После всех пакетов задачи:

```bash
go -C exercises run ./cmd/problembank
grep -o '"<Func>"[^}]*"t":\[[^]]*\]' assets/problems.js   # в t есть Test<Func>Scales (для функций, не типов)
go -C exercises test -tags solution -count=1 ./<pkg1>/ ./<pkg2>/ ./<pkg3>/
gofmt -l exercises
node scripts/check-registries.js
go -C exercises run ./cmd/problembank -check
```

Если форма `problems.js` не совпадает с `grep`, найти запись функции в файле руками и убедиться, что `Test<Func>Scales` есть в её списке тестов.

Commit: `git add exercises/<pkg1> exercises/<pkg2> exercises/<pkg3> assets/problems.js` и сообщение `Тесты масштаба: <pkg1>, <pkg2>, <pkg3>` с подписью Co-Authored-By.

---

### Task 3: `slidingwindow`, `prefixsum`, `twopointers`

**Files:**
- Create: `exercises/slidingwindow/slidingwindow_zscale_test.go`, `exercises/prefixsum/prefixsum_zscale_test.go`, `exercises/twopointers/twopointers_zscale_test.go`
- Modify: `exercises/slidingwindow/slidingwindow{,_solution}.go` (doc `MaxSlidingWindow`), `exercises/prefixsum/prefixsum{,_solution}.go` (doc `RangeSums`), `exercises/twopointers/twopointers{,_solution}.go` (doc `PairWithTargetSum`); regenerate `assets/problems.js`

**Interfaces:**
- Consumes: `scaletest.Within`, `scaletest.Limit` (Task 1); `MaxSlidingWindow(arr []int, k int) []int`, `RangeSums(nums []int, queries [][2]int) []int`, `PairWithTargetSum(arr []int, target int) []int`.

- [ ] **Step 1: `slidingwindow_zscale_test.go`**

```go
package slidingwindow

import (
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
)

// TestMaxSlidingWindowScales — не про ответ, а про сложность. На строго
// убывающем ряду в каждом окне все элементы — кандидаты в будущие максимумы,
// и пересчёт максимума заново стоит k на окно: O(n·k). Монотонный дек — O(n),
// куча — O(n log k), обе укладываются.
func TestMaxSlidingWindowScales(t *testing.T) {
	const n, k = 200000, 100000
	arr := make([]int, n)
	for i := range arr {
		arr[i] = n - i
	}
	var got []int
	scaletest.Within(t, scaletest.Limit,
		"MaxSlidingWindow(n=200000, k=100000, убывающий ряд) — похоже на O(n·k) там, где нужен O(n)"+
			" (замер: эталон ~X мс, перебор ~Y с)",
		func() { got = MaxSlidingWindow(arr, k) })
	// окно с началом i — это arr[i..i+k-1], его максимум arr[i] = n-i
	if len(got) != n-k+1 || got[0] != n || got[len(got)-1] != k {
		t.Fatalf("MaxSlidingWindow: len=%d, первый=%v, последний=%v; ожидалось len=%d, %d, %d",
			len(got), first(got), last(got), n-k+1, n, k)
	}
}

func first(a []int) any {
	if len(a) == 0 {
		return "нет"
	}
	return a[0]
}

func last(a []int) any {
	if len(a) == 0 {
		return "нет"
	}
	return a[len(a)-1]
}
```

Перед созданием проверить, нет ли в пакете функций `first`/`last` (`grep -n 'func first\|func last' exercises/slidingwindow/*.go`). Если есть — назвать `scaleFirst`/`scaleLast`.

Перебор (мутант):

```go
	if k <= 0 || k > len(arr) {
		return []int{}
	}
	res := make([]int, 0, len(arr)-k+1)
	for i := 0; i+k <= len(arr); i++ {
		m := arr[i]
		for j := i + 1; j < i+k; j++ {
			if arr[j] > m {
				m = arr[j]
			}
		}
		res = append(res, m)
	}
	return res
```

На log хуже (должен пройти) — куча пар (значение, индекс) с ленивым удалением через `container/heap`. Исполнитель пишет её сам по образцу `exercises/topk`. Ожидание: PASS.

Абзац условия: `Ограничения: 1 ≤ len(arr) ≤ 2·10⁵, k ≤ len(arr).`

- [ ] **Step 2: `prefixsum_zscale_test.go`**

```go
package prefixsum

import (
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
)

// TestRangeSumsScales — сложность, а не ответ. Каждый запрос — на весь ряд:
// сложение отрезка заново стоит n на запрос, O(n·q). Префиксные суммы — один
// проход и O(1) на запрос.
func TestRangeSumsScales(t *testing.T) {
	const n, q = 100000, 100000
	nums := make([]int, n)
	for i := range nums {
		nums[i] = 1
	}
	queries := make([][2]int, q)
	for i := range queries {
		queries[i] = [2]int{0, n - 1}
	}
	var got []int
	scaletest.Within(t, scaletest.Limit,
		"RangeSums(n=100000, q=100000, все запросы на весь ряд) — похоже на O(n·q) там, где нужен O(n + q)"+
			" (замер: эталон ~X мс, перебор ~Y с)",
		func() { got = RangeSums(nums, queries) })
	if len(got) != q || got[0] != n || got[q-1] != n {
		t.Fatalf("RangeSums: len=%d; ожидалось %d ответов, каждый = %d", len(got), q, n)
	}
}
```

Перебор:

```go
	res := make([]int, 0, len(queries))
	for _, qr := range queries {
		s := 0
		for i := qr[0]; i <= qr[1]; i++ {
			s += nums[i]
		}
		res = append(res, s)
	}
	return res
```

Абзац условия: `Ограничения: len(nums), len(queries) ≤ 10⁵.`

- [ ] **Step 3: `twopointers_zscale_test.go`**

```go
package twopointers

import (
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
)

// TestPairWithTargetSumScales — сложность, а не ответ. target больше любой
// суммы пары, поэтому пары нет, а перебор пар с досрочным выходом «сумма уже
// больше target» не выходит ни разу: O(n²). Указатели с двух концов — O(n),
// бинарный поиск дополнения — O(n log n), оба укладываются.
func TestPairWithTargetSumScales(t *testing.T) {
	const n = 100000
	arr := make([]int, n)
	for i := range arr {
		arr[i] = i
	}
	target := 2 * n // наибольшая сумма пары — (n-2) + (n-1) < 2n
	var got []int
	scaletest.Within(t, scaletest.Limit,
		"PairWithTargetSum(n=100000, пары нет) — похоже на O(n²) там, где нужен O(n)"+
			" (замер: эталон ~X мс, перебор ~Y с)",
		func() { got = PairWithTargetSum(arr, target) })
	if len(got) != 2 || got[0] != -1 || got[1] != -1 {
		t.Fatalf("PairWithTargetSum = %v, ожидалось [-1 -1]", got)
	}
}
```

Перебор (с «умным» досрочным выходом — он и проверяется):

```go
	for i := 0; i < len(arr); i++ {
		for j := i + 1; j < len(arr); j++ {
			s := arr[i] + arr[j]
			if s == target {
				return []int{i, j}
			}
			if s > target {
				break
			}
		}
	}
	return []int{-1, -1}
```

На log хуже (должен пройти):

```go
	for i, x := range arr {
		j := sort.SearchInts(arr[i+1:], target-x)
		if i+1+j < len(arr) && arr[i+1+j] == target-x {
			return []int{i, i + 1 + j}
		}
	}
	return []int{-1, -1}
```

(в мутанте временно добавить импорт `sort`)

Абзац условия: `Ограничения: 2 ≤ len(arr) ≤ 10⁵.`

- [ ] **Step 4: Общий конец задачи** — по разделу «Порядок задач 3–6»: банк, проверки, коммит `Тесты масштаба: slidingwindow, prefixsum, twopointers`.

---

### Task 4: `stack`, `binarysearch`, `intervals`

**Files:**
- Create: `exercises/stack/stack_zscale_test.go`, `exercises/binarysearch/binarysearch_zscale_test.go`, `exercises/intervals/intervals_zscale_test.go`
- Modify: doc `LargestRectangle` в `exercises/stack/stack{,_solution}.go`, doc `FindFirstLast` в `exercises/binarysearch/binarysearch{,_solution}.go`, doc `MinMeetingRooms` в `exercises/intervals/intervals{,_solution}.go` (НЕ в `meetingrooms` — там своя функция с тем же именем); regenerate `assets/problems.js`

**Interfaces:**
- Consumes: `scaletest.Within`, `scaletest.Limit`; `LargestRectangle(heights []int) int`, `FindFirstLast(arr []int, target int) []int`, `MinMeetingRooms(intervals [][]int) int`.

- [ ] **Step 1: `stack_zscale_test.go`**

```go
package stack

import (
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
)

// TestLargestRectangleScales — сложность, а не ответ. Все столбики равны:
// расширение от каждого столбика влево и вправо проходит весь ряд, O(n²).
// Стек индексов — O(n).
func TestLargestRectangleScales(t *testing.T) {
	const n, h = 100000, 7
	heights := make([]int, n)
	for i := range heights {
		heights[i] = h
	}
	var got int
	scaletest.Within(t, scaletest.Limit,
		"LargestRectangle(n=100000, все высоты равны) — похоже на O(n²) там, где нужен O(n)"+
			" (замер: эталон ~X мс, перебор ~Y с)",
		func() { got = LargestRectangle(heights) })
	if got != n*h {
		t.Fatalf("LargestRectangle = %d, ожидалось %d", got, n*h)
	}
}
```

Перебор:

```go
	best := 0
	for i, h := range heights {
		l, r := i, i
		for l > 0 && heights[l-1] >= h {
			l--
		}
		for r < len(heights)-1 && heights[r+1] >= h {
			r++
		}
		if a := h * (r - l + 1); a > best {
			best = a
		}
	}
	return best
```

Абзац условия: `Ограничения: len(heights) ≤ 10⁵, heights[i] ≤ 10⁴.`

- [ ] **Step 2: `binarysearch_zscale_test.go`**

```go
package binarysearch

import (
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
)

// TestFindFirstLastScales — сложность, а не ответ. Все элементы равны target:
// «нашёл бинарным поиском, потом иду влево и вправо» проходит весь массив,
// O(n) на вызов. Два бинарных поиска границ — O(log n).
func TestFindFirstLastScales(t *testing.T) {
	const n, calls, target = 1000000, 10000, 5
	arr := make([]int, n)
	for i := range arr {
		arr[i] = target
	}
	var got []int
	scaletest.Within(t, scaletest.Limit,
		"FindFirstLast(n=1000000, все равны target, 10000 вызовов) — похоже на O(n) там, где нужен O(log n)"+
			" (замер: эталон ~X мс, перебор ~Y с)",
		func() {
			for i := 0; i < calls; i++ {
				got = FindFirstLast(arr, target)
			}
		})
	if len(got) != 2 || got[0] != 0 || got[1] != n-1 {
		t.Fatalf("FindFirstLast = %v, ожидалось [0 %d]", got, n-1)
	}
}
```

Перебор («нашёл — иди вбок»):

```go
	lo, hi := 0, len(arr)-1
	for lo <= hi {
		mid := lo + (hi-lo)/2
		switch {
		case arr[mid] < target:
			lo = mid + 1
		case arr[mid] > target:
			hi = mid - 1
		default:
			l, r := mid, mid
			for l > 0 && arr[l-1] == target {
				l--
			}
			for r < len(arr)-1 && arr[r+1] == target {
				r++
			}
			return []int{l, r}
		}
	}
	return []int{-1, -1}
```

Абзац условия: `Ограничения: len(arr) ≤ 10⁶; функцию вызывают много раз на одном массиве.`

- [ ] **Step 3: `intervals_zscale_test.go`**

```go
package intervals

import (
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
)

// TestMinMeetingRoomsScales — сложность, а не ответ. Все встречи попарно
// пересекаются ([i, i+n]), комнат нужно n: поиск свободной комнаты перебором
// всех занятых — O(n²). Две отсортированные последовательности или куча
// концов — O(n log n).
func TestMinMeetingRoomsScales(t *testing.T) {
	const n = 100000
	in := make([][]int, n)
	for i := range in {
		in[i] = []int{i, i + n}
	}
	var got int
	scaletest.Within(t, scaletest.Limit,
		"MinMeetingRooms(n=100000, все встречи пересекаются) — похоже на O(n²) там, где нужен O(n log n)"+
			" (замер: эталон ~X мс, перебор ~Y с)",
		func() { got = MinMeetingRooms(in) })
	if got != n {
		t.Fatalf("MinMeetingRooms = %d, ожидалось %d", got, n)
	}
}
```

Перебор (в мутанте нужен импорт `sort`):

```go
	if len(intervals) == 0 {
		return 0
	}
	sorted := append([][]int(nil), intervals...)
	sort.Slice(sorted, func(i, j int) bool { return sorted[i][0] < sorted[j][0] })
	var ends []int // конец последней встречи в каждой комнате
	for _, iv := range sorted {
		placed := false
		for r := range ends {
			if ends[r] <= iv[0] {
				ends[r], placed = iv[1], true
				break
			}
		}
		if !placed {
			ends = append(ends, iv[1])
		}
	}
	return len(ends)
```

Абзац условия: `Ограничения: len(intervals) ≤ 10⁵.`

- [ ] **Step 4: Общий конец задачи** — коммит `Тесты масштаба: stack, binarysearch, intervals`.

---

### Task 5: `hashtable`, `binheap`, `treedfs`

**Files:**
- Create: `exercises/hashtable/hashtable_zscale_test.go`, `exercises/binheap/binheap_zscale_test.go`, `exercises/treedfs/treedfs_zscale_test.go`
- Modify: doc `Put` в `exercises/hashtable/hashtable{,_solution}.go`, doc `Push` в `exercises/binheap/binheap{,_solution}.go`, doc `DiameterOfTree` в `exercises/treedfs/treedfs{,_solution}.go`; regenerate `assets/problems.js`

**Interfaces:**
- Consumes: `scaletest.Within`, `scaletest.Limit`; `NewHashMap() *HashMap`, `(*HashMap).Put(key, val int)`, `(*HashMap).Get(key int) (int, bool)`; `NewHeap() *Heap`, `(*Heap).Push(val int)`, `(*Heap).Pop() (int, bool)`; `DiameterOfTree(root *TreeNode) int`, `TreeNode{Val int; Left, Right *TreeNode}`.

- [ ] **Step 1: `hashtable_zscale_test.go`**

```go
package hashtable

import (
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
)

// TestHashMapScales — сложность, а не ответ. Таблица без расширения остаётся
// на четырёх бакетах: цепочки растут до n/4, и Put/Get становятся O(n).
// TestHashMapResize на 100 ключах этого не видит — там цепочки короткие.
func TestHashMapScales(t *testing.T) {
	const n = 200000
	h := NewHashMap()
	bad := -1
	scaletest.Within(t, scaletest.Limit,
		"HashMap: 200000 Put, затем 200000 Get — похоже на O(n) на операцию там, где нужен O(1)"+
			" (таблица не расширяется?) (замер: эталон ~X мс, без расширения ~Y с)",
		func() {
			for k := 0; k < n; k++ {
				h.Put(k, k*2)
			}
			for k := 0; k < n; k++ {
				if v, ok := h.Get(k); !ok || v != k*2 {
					bad = k
					return
				}
			}
		})
	if bad >= 0 {
		t.Fatalf("Get(%d) после Put(%d, %d) вернул не то значение", bad, bad, bad*2)
	}
}
```

Перебор: в `hashtable_solution.go` закомментировать вызов расширения в `Put` (строку, где по `load factor` вызывается `resize`/`grow`; найти её в файле). Expected: тест масштаба FAIL, `TestHashMapResize` PASS. Если `TestHashMapResize` при этом падает, значит он всё-таки проверяет расширение. Записать это в отчёт; мутант всё равно обязан уронить тест масштаба.

Абзац условия у `Put`: `Ограничения: до 2·10⁵ операций.`

- [ ] **Step 2: `binheap_zscale_test.go`**

```go
package binheap

import (
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
)

// TestHeapScales — сложность, а не ответ. Pop линейным поиском минимума в
// неупорядоченном срезе — O(n) на операцию, O(n²) на всё. Куча — O(log n).
func TestHeapScales(t *testing.T) {
	const n = 200000
	h := NewHeap()
	bad, want := -1, 0
	scaletest.Within(t, scaletest.Limit,
		"Heap: 200000 Push, затем 200000 Pop — похоже на O(n) на Pop там, где нужен O(log n)"+
			" (замер: эталон ~X мс, перебор ~Y с)",
		func() {
			for v := n; v >= 1; v-- {
				h.Push(v)
			}
			for want = 1; want <= n; want++ {
				if v, ok := h.Pop(); !ok || v != want {
					bad = v
					return
				}
			}
		})
	if bad >= 0 {
		t.Fatalf("Pop вернул %d, ожидался минимум %d", bad, want)
	}
}
```

Перебор: `Push` — `h.data = append(h.data, val)`. `Pop`:

```go
	if len(h.data) == 0 {
		return 0, false
	}
	mi := 0
	for i, v := range h.data {
		if v < h.data[mi] {
			mi = i
		}
	}
	m := h.data[mi]
	last := len(h.data) - 1
	h.data[mi] = h.data[last]
	h.data = h.data[:last]
	return m, true
```

Если в пакете есть `Peek`, а табличные тесты требуют кучу на `Peek`, мутант `Peek` — тот же линейный поиск без удаления. Мутант обязан проходить табличные тесты: проверять он должен время, а не правильность.

Абзац условия у `Push`: `Ограничения: до 2·10⁵ операций.`

- [ ] **Step 3: `treedfs_zscale_test.go`**

```go
package treedfs

import (
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
)

// TestDiameterOfTreeScales — сложность, а не ответ. На левой цепочке
// «посчитай высоты детей заново в каждом узле» проходит всё поддерево под
// каждым узлом: O(n²). Высота из ответов детей за один обход — O(n).
// Глубина рекурсии — n и у эталона; стек горутины в Go растёт, 10⁵ уровней
// ему по силам.
func TestDiameterOfTreeScales(t *testing.T) {
	const n = 100000
	root := &TreeNode{Val: 0}
	cur := root
	for i := 1; i < n; i++ {
		cur.Left = &TreeNode{Val: i}
		cur = cur.Left
	}
	var got int
	scaletest.Within(t, scaletest.Limit,
		"DiameterOfTree(левая цепочка, n=100000) — похоже на O(n²) там, где нужен O(n)"+
			" (замер: эталон ~X мс, перебор ~Y с)",
		func() { got = DiameterOfTree(root) })
	if got != n-1 {
		t.Fatalf("DiameterOfTree = %d, ожидалось %d", got, n-1)
	}
}
```

Перебор (вспомогательная функция — в том же мутанте, локальным замыканием, чтобы не конфликтовать с именами пакета):

```go
	var height func(*TreeNode) int
	height = func(n *TreeNode) int {
		if n == nil {
			return 0
		}
		return 1 + max(height(n.Left), height(n.Right))
	}
	var walk func(*TreeNode) int
	walk = func(n *TreeNode) int {
		if n == nil {
			return 0
		}
		return max(height(n.Left)+height(n.Right), walk(n.Left), walk(n.Right))
	}
	return walk(root)
```

Абзац условия: `Ограничения: до 10⁵ узлов; дерево может выродиться в цепочку.`

- [ ] **Step 4: Общий конец задачи** — коммит `Тесты масштаба: hashtable, binheap, treedfs`. У `TestHashMapScales` и `TestHeapScales` в банке владельца нет — это ожидаемо (Task 2).

---

### Task 6: `graphs`, `greedy`, `dp`

**Files:**
- Create: `exercises/graphs/graphs_zscale_test.go`, `exercises/greedy/greedy_zscale_test.go`, `exercises/dp/dp_zscale_test.go`
- Modify: doc `ShortestPathUnweighted` в `exercises/graphs/graphs{,_solution}.go`, doc `CanJump` в `exercises/greedy/greedy{,_solution}.go`, doc `CoinChange` в `exercises/dp/dp{,_solution}.go`; regenerate `assets/problems.js`

**Interfaces:**
- Consumes: `scaletest.Within`, `scaletest.Limit`; `ShortestPathUnweighted(n int, edges [][]int, src, dst int) int`, `CanJump(nums []int) bool`, `CoinChange(coins []int, amount int) int`.

- [ ] **Step 1: `graphs_zscale_test.go`**

```go
package graphs

import (
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
)

// TestShortestPathUnweightedScales — сложность, а не ответ. Граф — путь из n
// вершин. Поиск соседей перебором всего списка рёбер на каждой вершине —
// O(V·E); BFS по списку смежности — O(V + E).
//
// Осторожно с ручным прогоном: матрица смежности на 10⁵ вершин — около 10 ГБ.
// Runner книги остановит такой прогон пределом памяти, голый go test — нет.
func TestShortestPathUnweightedScales(t *testing.T) {
	const n = 100000
	edges := make([][]int, 0, n-1)
	for i := 0; i+1 < n; i++ {
		edges = append(edges, []int{i, i + 1})
	}
	var got int
	scaletest.Within(t, scaletest.Limit,
		"ShortestPathUnweighted(путь из 100000 вершин) — похоже на O(V·E) там, где нужен O(V + E)"+
			" (замер: эталон ~X мс, перебор ~Y с)",
		func() { got = ShortestPathUnweighted(n, edges, 0, n-1) })
	if got != n-1 {
		t.Fatalf("ShortestPathUnweighted = %d, ожидалось %d", got, n-1)
	}
}
```

Перебор (BFS, соседей ищет по всем рёбрам):

```go
	if src == dst {
		return 0
	}
	dist := make([]int, n)
	for i := range dist {
		dist[i] = -1
	}
	dist[src] = 0
	queue := []int{src}
	for len(queue) > 0 {
		u := queue[0]
		queue = queue[1:]
		for _, e := range edges {
			v := -1
			if e[0] == u {
				v = e[1]
			} else if e[1] == u {
				v = e[0]
			}
			if v >= 0 && dist[v] < 0 {
				dist[v] = dist[u] + 1
				if v == dst {
					return dist[v]
				}
				queue = append(queue, v)
			}
		}
	}
	return -1
```

Абзац условия: `Ограничения: n ≤ 10⁵, len(edges) ≤ 2·10⁵.`

- [ ] **Step 2: `greedy_zscale_test.go`**

```go
package greedy

import (
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
)

// TestCanJumpScales — сложность, а не ответ. Из каждой позиции i ≤ m можно
// допрыгнуть ровно до m, где стоит 0, и последний индекс m+1 недостижим.
// Разметка «отметь всё, куда прыгаешь из i» стоит nums[i] на позицию —
// Σ(m−i) = O(n²). Самая дальняя достижимая позиция — O(n).
func TestCanJumpScales(t *testing.T) {
	const m = 100000
	nums := make([]int, m+2)
	for i := 0; i <= m; i++ {
		nums[i] = m - i // nums[m] = 0
	}
	var got bool
	scaletest.Within(t, scaletest.Limit,
		"CanJump(n=100002, лестница к нулю) — похоже на O(n²) там, где нужен O(n)"+
			" (замер: эталон ~X мс, перебор ~Y с)",
		func() { got = CanJump(nums) })
	if got {
		t.Fatalf("CanJump = true, а последний индекс недостижим")
	}
}
```

Перебор:

```go
	reach := make([]bool, len(nums))
	reach[0] = true
	for i := range nums {
		if !reach[i] {
			continue
		}
		for j := i + 1; j <= i+nums[i] && j < len(nums); j++ {
			reach[j] = true
		}
	}
	return reach[len(reach)-1]
```

Абзац условия: `Ограничения: len(nums) ≤ 2·10⁵, nums[i] ≤ 10⁵.`

- [ ] **Step 3: `dp_zscale_test.go`**

```go
package dp

import (
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
)

// TestCoinChangeScales — сложность, а не ответ. Монеты чётные, сумма нечётная —
// ответ −1, и рекурсия без запоминания перебирает все разложения: число вызовов
// растёт экспоненциально. Таблица dp или рекурсия с мемоизацией —
// O(amount · len(coins)).
//
// Рекурсия без мемоизации после срока крутится в горутине до выхода бинарника —
// поэтому тест масштаба стоит в файле, который идёт последним.
func TestCoinChangeScales(t *testing.T) {
	coins := []int{4, 6, 10}
	const amount = 10001
	var got int
	scaletest.Within(t, scaletest.Limit,
		"CoinChange(coins=[4 6 10], amount=10001) — похоже на экспоненциальный перебор там, где нужен"+
			" O(amount · len(coins)) (замер: эталон ~X мс, перебор не завершается)",
		func() { got = CoinChange(coins, amount) })
	if got != -1 {
		t.Fatalf("CoinChange = %d, ожидалось -1", got)
	}
}
```

Перебор:

```go
	var rec func(a int) int
	rec = func(a int) int {
		if a == 0 {
			return 0
		}
		best := -1
		for _, c := range coins {
			if c <= a {
				if r := rec(a - c); r >= 0 && (best < 0 || r+1 < best) {
					best = r + 1
				}
			}
		}
		return best
	}
	return rec(amount)
```

Для перебора времени не замеряют: он не завершается. Достаточно увидеть FAIL теста масштаба. Если табличные тесты `CoinChange` сами виснут на этом мутанте (большие суммы), это записывается в отчёт как наблюдение: значит, перебор ловился и раньше, но без причины.

Абзац условия: `Ограничения: amount ≤ 10⁴, len(coins) ≤ 12.`

- [ ] **Step 4: Общий конец задачи** — коммит `Тесты масштаба: graphs, greedy, dp`.

---

### Task 7: Тексты, полный набор CI, живая проверка runner'а

**Files:**
- Modify: `src/README.md` (раздел «Когда глава сдана»), `exercises/README.md`, `CLAUDE.md` (раздел «Архитектура Go-тренажёра», абзац после «Файл случайных тестов…»; раздел «Покрытие тренажёра», команда подсчёта пакетов)

- [ ] **Step 1: `src/README.md`**

Найти раздел «Когда глава сдана» (`grep -n 'Когда глава сдана' src/README.md`) и добавить после абзаца о зелёных тестах одну фразу:

```markdown
Тесты проверяют и сложность: в двенадцати пакетах ядра есть тест масштаба, и решение перебором там, где глава учит линейному проходу, остаётся красным с причиной — «не уложилось в 2 с … похоже на O(n²) там, где нужен O(n)». Лишний логарифм тест не ловит: куча вместо дека — тоже честное решение.
```

- [ ] **Step 2: `exercises/README.md`**

Рядом с описанием тройки файлов пакета добавить абзац:

```markdown
**Тест масштаба** — `<пакет>_zscale_test.go` в двенадцати пакетах ядра. Он проверяет не ответ, а сложность: функция гоняется на большом худшем входе и обязана уложиться в 2 с (эталон — десятки миллисекунд, перебор — секунды или вечность). Условие функции называет размеры входа абзацем «Ограничения:». Общий помощник — `internal/scaletest` (это не пакет тренажёра). Файл идёт последним, потому что зависший перебор после срока работает до конца прогона. `go test -short` тесты масштаба пропускает.
```

- [ ] **Step 3: `CLAUDE.md`**

В «Архитектура Go-тренажёра» после абзаца про `<pkg>_zrand_test.go`:

```markdown
Тест масштаба — `<pkg>_zscale_test.go` (имя держит `check-registries.js`: `Test*Scales` только там), сейчас в 12 пакетах ядра и в `codereview`: `scaletest.Within(t, scaletest.Limit, what, run)` из служебного `exercises/internal/scaletest` гоняет функцию в горутине на худшем входе и роняет тест через 2 с или на панике. Входы калиброваны: эталон ≤ 50 мс, перебор ≥ 6 с, — поэтому без пропуска под `-race`, но с пропуском под `-short`. Ловит разрыв класса, а не лишний log (куча вместо дека проходит). `Test<Func>Scales` достаётся функции по `stubdoc.OwnerOf` и потому входит в прогон одной функции и в собеседование: перебор не сдаёт задачу. Размеры входа — абзац «Ограничения:» в условии, часть условия, а не подсказка. Каталог `internal` — не пакет тренажёра: его пропускают `check-registries.js`, `srs-check.js`, `problembank`, `tracescan`. Мутанты калибровки — только под `scripts/safe-run.sh` (матрица смежности на 10⁵ вершин — ~10 ГБ).
```

В «Покрытие тренажёра» заменить `ls -d exercises/*/ | grep -v cmd | wc -l` на `ls -d exercises/*/ | grep -v 'cmd\|internal' | wc -l`.

- [ ] **Step 4: Полный набор CI**

```bash
gofmt -l exercises                                         # пусто
go -C exercises vet -tags solution ./...
go -C exercises vet ./...
time go -C exercises test -tags solution -count=1 ./...    # сравнить с тем же на main
go -C exercises run ./cmd/checksnippets -src ../src
go -C exercises run ./cmd/problembank -check
node scripts/check-registries.js
node scripts/srs-check.js
node scripts/mixed-check.js
mdbook build && node scripts/check-links.js
```

Шаг CI «Заготовки ещё не решены» — скопировать цикл из `.github/workflows/ci.yml` (строки ~66–85) и выполнить из `exercises/`, обернув каждый `go test` в `scripts/safe-run.sh`. Expected: каждый пакет с `_solution.go` падает без тега.

Прибавка времени: прогнать `time go -C exercises test -tags solution -count=1 ./...` и в `main`-копии (`/home/idel/DevGo/algorithms-book`). Разница по сумме тестовых времён — меньше 2 с (критерий 3 спецификации); если больше — найти тест-виновник по `-v` и уменьшить его n.

- [ ] **Step 5: Живая проверка runner'а**

```bash
cd exercises && go run ./cmd/runner &   # запомнить PID: RUNNER=$!
```

Отправить на `/api/run` перебор `MaxSlidingWindow` в пакете `slidingwindow`, только его тесты. Поле с кодом и формат запроса взять из `exercises/cmd/runner/main.go` (обработчик `/api/run`), перебор — из Task 3. Пример:

```bash
curl -s localhost:8080/api/run -H 'Content-Type: application/json' \
  -d "$(jq -n --arg code "$(cat /path/to/naive-slidingwindow.go)" \
        '{pkg:"slidingwindow", code:$code, tests:["TestMaxSlidingWindow","TestMaxSlidingWindowScales"]}')" | jq '{ok, reason, tests: [.tests[] | {name, pass: .pass, output}]}'
```

Файл перебора — полная копия заготовки `slidingwindow.go`, где у `MaxSlidingWindow` тело перебора, а остальные функции — из эталона без тега. Expected: `ok: false`, `TestMaxSlidingWindow` проходит, у `TestMaxSlidingWindowScales` в `output` — строка «не уложилось в 2s: MaxSlidingWindow(n=200000…». Записать, что показывает `reason`. Если там не первая строка падения, а общая фраза, отметить в отчёте: правка виджета — вне рамок, это кандидат на следующий шаг. Остановить runner: `kill $RUNNER`.

- [ ] **Step 6: Commit**

```bash
git add src/README.md exercises/README.md CLAUDE.md
git commit -m "Тесты масштаба: тексты книги, README тренажёра, CLAUDE.md

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
