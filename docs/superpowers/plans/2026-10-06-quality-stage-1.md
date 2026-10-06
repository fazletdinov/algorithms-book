# Качество учебника, этап 1 «Не падает и не врёт» — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Типовая ошибка читателя в виджете «Реши прямо здесь» (бесконечный цикл, бесконечный рост памяти, печать в цикле) кончается понятным сообщением, а не упавшей машиной; 37 неверных утверждений в главах и ошибки в тестах, заготовках и движке виджетов исправлены.

**Architecture:** У runner'а три слоя защиты: `go test -timeout` (бинарник сам называет зависший тест), убийство группы процессов по запасному сроку, предел памяти — область cgroup (`systemd-run --user --scope`), запасной путь `prlimit --as` через `go test -exec`. Способ выбирается при старте, отдаётся в `/api/health`, виден в виджете. Правки глав — таблицей «место → правка → проверка»; правки виджетов и тестов — через падающую проверку.

**Tech Stack:** Go 1.24 (локально 1.26.5), systemd 255, util-linux `prlimit`, vanilla JS, jsdom, mdBook 0.5.2, Playwright MCP (Task 5).

**Spec:** `R` = `/home/idel/DevGo/algorithms-book/reports/Качество учебника и мировые курсы.md` (разделы «37 ошибок по существу» и «План», этап 1); `N/` = `/home/idel/DevGo/algorithms-book/research_notes/Качество учебника и мировые курсы/` (`practice.md`, `viz_live.md`, `theory_A…D.md`, `repetition.md`, `mutation_results.txt`). Лежат в основной копии, не в git — только читать.

## Global Constraints

- **Память.** 2026-10-06 решение «BFS без visited» за ~25 с заняло 28 ГБ и дважды уронило VS Code автора. Любой запуск `go test` / `go run` / `go vet` / собранных бинарников / jsdom-скриптов — только через `scripts/safe-run.sh` (`SAFE_MEM`, по умолчанию 2G; `SAFE_SECS`, по умолчанию 120; код 137 — память, 124 — время), не больше одного одновременно. Go пишется как `scripts/safe-run.sh go -C exercises …`. Мутации — только так же; мутант — временная правка, потом `git checkout -- <файл>`.
- **Пожиратель ограничен сам.** Тест предела памяти растёт не больше чем до 1 ГиБ и завершается сам: сломанный предел даёт красный тест, а не упавшую машину. `systemd-run --user --scope` изнутри `safe-run.sh` создаёт СОСЕДНЮЮ область — внешний предел на неё не действует. Живой «BFS без visited» не запускать нигде.
- **CI.** Тесты `cmd/runner` идут в `go test -tags solution ./...` и с `-race` на GitHub-раннере, где `systemd-run --user` может не быть: такие тесты пропускаются через `t.Skip` с причиной, запасной путь проверяется там, где есть `prlimit`. Локально `SKIP` cgroup-теста — не зелёный результат.
- **jsdom.** В рабочей копии нет `node_modules`: сначала `npm i --no-save jsdom`. «⏭ … пропускаю» = не пройдено.
- **Проверки.** Задача кончается зелёными проверками, которые её касаются: `gofmt -l exercises`; `go vet` с тегом `solution` и без; `go test -tags solution -count=1` затронутых пакетов; `go run ./cmd/checksnippets -src ../src`; `go run ./cmd/problembank -check`; `mdbook build`; `node scripts/check-links.js`, `check-registries.js`, `check-explain.js`, `explain-check.js`, `check-ladder.js`, `check-challenges.js`, `check-viz.js`, `predict-check.js`, `srs-check.js`, `mixed-check.js`. `check-viz-names.js` (~8 мин) — только в Task 5; `viz-render-check.js` (~25 мин) запускает координатор в конце этапа.
- **Правки текста глав.** Перед правкой исполнитель сам убеждается, что утверждение строки верно на текущем тексте (пересчётом или чтением кода); не подтвердилось — не править, написать в отчёте. Числа считаются кодом. Номера строк сняты на `8a42d7a` — искать по цитате. Тон как вокруг; объём главы не растёт больше, чем нужно.
- **Git.** Только `/home/idel/DevGo/algorithms-book/.worktrees/quality` (ветка `quality-stage-1`); основную копию и `.worktrees/kafka` не трогать. `git add` — названные пути, никогда `-A`; без push. Сообщения по-русски, «Область: что сделано», в конце `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Документация.** Меняется поведение или число из `CLAUDE.md` / `exercises/README.md` — правка документа в той же задаче.
- **Стиль Go** — как в `cmd/runner`: ошибки через `%w`, `context.Context` первым аргументом у того, что ходит наружу, ранний возврат, без новых глобальных синглтонов (состояние — в `server`), комментарии «почему» в плотности соседнего кода.
- **Вне этапа 1 (не делать):** прогон по одной функции в виджете главы; подсказки за кнопками; очередь повторений на каждой странице; утечка подсказок в режиме собеседования (`assets/mixed.js`); обещание в `assets/explain.js:185–186`; перестройка глав и лестниц; новые типы виджетов и главы; разброс интервалов и мягкий сброс в `srs.js`.

## Review Focus

1. **Бесконечный цикл в решении** (наивный `Fib`, `for {}`): ответ за срок теста, тест назван, сирот нет — `TestHandleRunHangingSolution`, `TestRunGoTestKillsWholeTree` (Task 1).
2. **Бесконечный рост памяти** (BFS без `visited`): остановка на пределе, сообщение называет предел и `visited` — `TestMemLimitCgroupStopsEater`, `TestMemLimitRlimitStopsEater` (Task 2).
3. **Печать в цикле**: вывод обрезан, сервер не растёт — `TestRunGoTestCapsOutput`, `TestTraceHarnessStopsFlood` (Task 1).
4. **Нет ни systemd, ни `prlimit`**: сервер стартует, сообщает `none`, виджет предупреждает — `TestMemLimiterCommand` (режим `none`), случай «none» в `runner-render-check.js` (Task 2).
5. **Верный ответ читателя засчитан неверным**: «Да» в «🎯» при пропущенной первой строке тела; `[][]int{}` вместо `nil` в 3Sum — сверка ключей по отступам (Task 5 Step 1), мутант `res := [][]int{}` (Task 6 Step 4).

---

### Task 1: Runner — время и честный отказ

**Files:**
- Create: `scripts/safe-run.sh`; `exercises/cmd/runner/run.go`, `proc_unix.go`, `proc_other.go`, `run_test.go`, `run_unix_test.go`; `scripts/runner-render-check.js`
- Modify: `exercises/cmd/runner/main.go` (`:58–91`, `:210–277`; `:279–394` переезжает в `run.go`), `main_test.go`, `trace.go:319–398`, `:491–542`; `assets/runner.js:271`, `:322–370`; `.github/workflows/ci.yml`; `CLAUDE.md`; `exercises/README.md:24–40`

**Interfaces:**
- Produces (Go): `type runLimits struct { Race bool; TestTimeout, Deadline time.Duration; MaxOutput int }`; `defaultLimits(race bool) runLimits`; `runGoTest(ctx context.Context, dir string, args []string, lim runLimits) testResult`; `parseTestOutput(out []byte) testResult`; `markUnfinished(res *testResult, why string) []string`; `groupCommand(ctx context.Context, name string, args ...string) *exec.Cmd`; `type cappedBuffer struct { buf bytes.Buffer; limit int; truncated bool }`; `type server struct { slot chan struct{}; limits func(race bool) runLimits; traceLimits func() runLimits }`, `newServer() *server`; `testArgs(pkg string, race bool, tests []string, timeout time.Duration) ([]string, error)`; `runTraceHarness(ctx context.Context, tmp, funcName, qualifiedCall string, lim runLimits) traceResponse`.
- Produces (ответ `/api/run`): новые поля `timeout`, `truncated` (bool), `reason` (готовая фраза), у `tests[]` — `killed`: `"timeout"` (Task 2 добавит `"memory"`).
- Produces (JS): `window.ALGO_RUNNER_VIEW = { result(out, res), status(res) → { text, cls } }`.

Замер плана (Go 1.26.5): `go test -json -timeout 2s` на зависшем тесте даёт `run` и строки `output` «panic: test timed out after 2s», «running tests:», «TestHang (2s)», стеки — всё приписано зависшему тесту; события `fail` у теста НЕТ (только у пакета).

- [ ] **Step 1: `scripts/safe-run.sh`** — дословная копия проверенной обёртки, `chmod +x`:

```sh
#!/bin/sh
# Запуск команды с жёстким пределом памяти и времени в отдельной cgroup-области.
# SAFE_MEM (по умолчанию 2G), SAFE_SECS (по умолчанию 120). Код 137 — упёрся в память, 124 — таймаут.
u="safe-$$-$(date +%s%N)"
systemd-run --user --scope -q --unit="$u" -p MemoryMax="${SAFE_MEM:-2G}" -p MemorySwapMax=0 -- timeout -k 5 "${SAFE_SECS:-120}" "$@"
rc=$?
systemctl --user kill --signal=KILL "$u.scope" >/dev/null 2>&1
systemctl --user stop "$u.scope" >/dev/null 2>&1
# Область, в которой сработал предел памяти, остаётся в состоянии failed до конца сеанса.
systemctl --user reset-failed "$u.scope" >/dev/null 2>&1
exit $rc
```

Проверить: `scripts/safe-run.sh true; echo $?` → `0`; `SAFE_SECS=2 scripts/safe-run.sh sleep 10; echo $?` → `124`; `SAFE_MEM=64M scripts/safe-run.sh python3 -c 'x = bytearray(300 * 1024 * 1024)'; echo $?` → `137`, и после этого `systemctl --user list-units --state=failed --no-legend --plain | grep -c '^safe-'` → `0`. Коммит `git add scripts/safe-run.sh` — «Скрипты: safe-run.sh — запуск под пределом памяти и времени».

- [ ] **Step 2: падающие тесты.** `main_test.go`: во всех трёх вызовах `testArgs` — четвёртый аргумент `20*time.Second`; в `TestTestArgs` после проверки `-race`:

```go
			if i := slices.Index(args, "-timeout"); i < 0 || args[i+1] != "20s" {
				t.Errorf("без -timeout 20s тестовый бинарник живёт 10 минут: %q", args)
			}
```

`run_test.go`:

```go
package main

import (
	"context"
	"strings"
	"testing"
	"time"
)

// Поток снят с настоящего `go test -json -timeout 2s`: у зависшего теста есть
// run и output, а события fail нет — оно только у пакета.
func TestParseTestOutput(t *testing.T) {
	res := parseTestOutput([]byte(strings.Join([]string{
		`{"Action":"run","Test":"TestQuick"}`,
		`{"Action":"pass","Test":"TestQuick"}`,
		`{"Action":"run","Test":"TestHang"}`,
		`{"Action":"output","Test":"TestHang","Output":"panic: test timed out after 2s\n"}`,
		`{"Action":"fail"}`,
	}, "\n")))
	want := "тест TestHang не уложился в 2s — похоже на бесконечный цикл"
	if !res.Timeout || res.Passed != 1 || res.Failed != 1 || res.Reason != want || res.Tests[1].Killed != "timeout" {
		t.Fatalf("зависание: %+v", res)
	}
	// обычное падение — не остановка: иначе любое красное стало бы «бесконечным циклом»
	res = parseTestOutput([]byte(`{"Action":"run","Test":"TestA"}` + "\n" + `{"Action":"fail","Test":"TestA"}`))
	if res.Timeout || res.Reason != "" || res.Tests[0].Killed != "" || res.Failed != 1 {
		t.Fatalf("обычное падение: %+v", res)
	}
}

func TestCappedBuffer(t *testing.T) {
	c := &cappedBuffer{limit: 10}
	for range 3 { // писатель обязан «принять» всё: ошибка записи убила бы процесс
		if n, err := c.Write([]byte("123456")); n != 6 || err != nil {
			t.Fatalf("Write = %d, %v", n, err)
		}
	}
	if c.buf.String() != "1234561234" || !c.truncated {
		t.Fatalf("буфер = %q, truncated = %v", c.buf.String(), c.truncated)
	}
}

func TestServerOneRunAtATime(t *testing.T) {
	s := newServer()
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()
	if !s.acquire(ctx) || s.acquire(ctx) {
		t.Fatal("окно должно пускать ровно один прогон")
	}
	s.release()
	if !s.acquire(context.Background()) {
		t.Fatal("после release окно не освободилось")
	}
}

// Срок вышел до запуска: исход — «остановлен по времени», а не «ошибка компиляции».
func TestRunGoTestDeadlineIsReported(t *testing.T) {
	lim := runLimits{TestTimeout: time.Second, Deadline: time.Nanosecond, MaxOutput: maxRunOutput}
	res := runGoTest(context.Background(), t.TempDir(), []string{"test", "./x/"}, lim)
	if !res.Timeout || res.OK || !strings.Contains(res.Reason, "остановлен целиком") {
		t.Fatalf("%+v", res)
	}
}
```

`run_unix_test.go` — настоящий `go test` на крошечных модулях во временном каталоге:

```go
//go:build unix

package main

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
	"testing"
	"time"
)

func writeModule(t *testing.T, files map[string]string) string {
	t.Helper()
	dir := t.TempDir()
	if files["go.mod"] == "" {
		files["go.mod"] = "module probe\n\ngo 1.24\n"
	}
	for name, body := range files {
		p := filepath.Join(dir, name)
		if err := errors.Join(os.MkdirAll(filepath.Dir(p), 0o755), os.WriteFile(p, []byte(body), 0o644)); err != nil {
			t.Fatal(err)
		}
	}
	return dir
}

const hangTest = `package hang

import (
	"os"
	"strconv"
	"testing"
	"time"
)

func TestHang(t *testing.T) {
	os.WriteFile(os.Getenv("RUNNER_PIDFILE"), []byte(strconv.Itoa(os.Getpid())), 0o644)
	for {
		time.Sleep(20 * time.Millisecond)
	}
}
`

// processGone: процесса нет или он зомби (убит, но ещё не собран родителем).
func processGone(pid int) bool {
	if syscall.Kill(pid, 0) != nil {
		return true
	}
	b, err := os.ReadFile(fmt.Sprintf("/proc/%d/stat", pid))
	i := bytes.LastIndexByte(b, ')')
	return err == nil && i >= 0 && i+2 < len(b) && b[i+2] == 'Z'
}

// Отмена обязана убить и `go`, и тестовый бинарник: раньше бинарник оставался
// сиротой, а Wait висел на унаследованной им трубе.
func TestRunGoTestKillsWholeTree(t *testing.T) {
	dir := writeModule(t, map[string]string{"hang/hang_test.go": hangTest})
	pidFile := filepath.Join(t.TempDir(), "pid")
	t.Setenv("RUNNER_PIDFILE", pidFile)
	lim := runLimits{TestTimeout: time.Minute, Deadline: 2 * time.Minute, MaxOutput: maxRunOutput}
	args, _ := testArgs("hang", false, nil, lim.TestTimeout)
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan testResult, 1)
	go func() { done <- runGoTest(ctx, dir, args, lim) }()

	pid := 0
	for start := time.Now(); pid == 0 && time.Since(start) < 90*time.Second; time.Sleep(100 * time.Millisecond) {
		b, _ := os.ReadFile(pidFile)
		pid, _ = strconv.Atoi(string(b))
	}
	cancel() // «клиент ушёл»; срок прогона убивает тем же путём
	if pid == 0 {
		t.Fatal("тестовый бинарник не стартовал за 90 с")
	}
	select {
	case <-done:
	case <-time.After(10 * time.Second):
		t.Error("runGoTest не вернулся за 10 с после отмены")
	}
	for start := time.Now(); !processGone(pid) && time.Since(start) < 3*time.Second; {
		time.Sleep(50 * time.Millisecond)
	}
	if !processGone(pid) {
		syscall.Kill(pid, syscall.SIGKILL) // не оставляем сироту после красного теста
		t.Fatalf("тестовый бинарник (pid %d) пережил отмену: убит только процесс go", pid)
	}
}

func TestRunGoTestCapsOutput(t *testing.T) {
	dir := writeModule(t, map[string]string{"flood/flood_test.go": "package flood\n\nimport (\n\t\"fmt\"\n\t\"strings\"\n\t\"testing\"\n)\n\n" +
		"func TestFlood(t *testing.T) {\n\tfor i := 0; i < 20000; i++ {\n\t\tfmt.Println(strings.Repeat(\"x\", 100))\n\t}\n}\n"})
	lim := runLimits{TestTimeout: 30 * time.Second, Deadline: 2 * time.Minute, MaxOutput: 64 << 10}
	args, _ := testArgs("flood", false, nil, lim.TestTimeout)
	res := runGoTest(context.Background(), dir, args, lim)
	kept := len(res.Output)
	for _, te := range res.Tests {
		kept += len(te.Output)
	}
	if !res.Truncated || res.OK || kept > lim.MaxOutput || !strings.Contains(res.Reason, "обрезан") {
		t.Fatalf("truncated=%v ok=%v сохранено %d байт, reason=%q", res.Truncated, res.OK, kept, res.Reason)
	}
}

// Сквозной случай «читатель написал бесконечный цикл»: настоящий обработчик и
// go test. Закрепляет и имена полей ответа, которые читает runner.js.
func TestHandleRunHangingSolution(t *testing.T) {
	old := moduleRoot
	t.Cleanup(func() { moduleRoot = old })
	moduleRoot = writeModule(t, map[string]string{
		"spin/spin.go":      "package spin\n\nfunc Spin() int { panic(\"TODO\") }\n",
		"spin/spin_test.go": "package spin\n\nimport \"testing\"\n\nfunc TestQuick(t *testing.T) {}\n\nfunc TestSpin(t *testing.T) { Spin() }\n",
	})
	srv := newServer()
	srv.limits = func(bool) runLimits {
		return runLimits{TestTimeout: 2 * time.Second, Deadline: 2 * time.Minute, MaxOutput: maxRunOutput}
	}
	body := `{"pkg":"spin","code":"package spin\n\nfunc Spin() int { for {} }\n"}`
	rec := httptest.NewRecorder()
	srv.handleRun(rec, httptest.NewRequest(http.MethodPost, "/api/run", strings.NewReader(body)))
	for _, want := range []string{`"ok":false`, `"timeout":true`, `"passed":1`, `"killed":"timeout"`,
		`"reason":"тест TestSpin не уложился в 2s — похоже на бесконечный цикл"`} {
		if !strings.Contains(rec.Body.String(), want) {
			t.Errorf("в ответе нет %s:\n%.600s", want, rec.Body.String())
		}
	}
}

func TestTraceHarnessStopsFlood(t *testing.T) {
	dir := writeModule(t, map[string]string{"tracecmd/main.go": "package main\n\nimport \"fmt\"\n\nfunc main() {\n\tfor {\n\t\tfmt.Println(\"__TRACE__ {}\")\n\t}\n}\n"})
	lim := runLimits{Deadline: 3 * time.Second, MaxOutput: 64 << 10}
	start := time.Now()
	resp := runTraceHarness(context.Background(), dir, "F", "p.F()", lim)
	if !resp.Timeout || resp.Reason == "" || time.Since(start) > 40*time.Second || len(resp.Steps) > lim.MaxOutput/13 {
		t.Fatalf("timeout=%v reason=%q шагов=%d за %s", resp.Timeout, resp.Reason, len(resp.Steps), time.Since(start))
	}
}
```

- [ ] **Step 3: убедиться, что падает.** Run: `SAFE_SECS=300 scripts/safe-run.sh go -C exercises test -tags solution -count=1 ./cmd/runner/`. Expected: FAIL сборки — `undefined: parseTestOutput`, `undefined: runLimits`, `too many arguments in call to testArgs`.

- [ ] **Step 4: реализация.** `proc_unix.go` (`proc_other.go` — то же с `//go:build !unix`, без строк `SysProcAttr` и `Cancel`):

```go
//go:build unix

package main

import (
	"context"
	"os/exec"
	"syscall"
	"time"
)

// groupCommand готовит команду, у которой по отмене ctx умирает ВСЁ дерево.
// `go test` запускает тестовый бинарник дочерним процессом: SIGKILL одному
// `go` оставлял бинарник сиротой до его собственного таймаута, а Wait — висеть
// на трубе, которую сирота унаследовал (для этого WaitDelay).
func groupCommand(ctx context.Context, name string, args ...string) *exec.Cmd {
	cmd := exec.CommandContext(ctx, name, args...)
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	cmd.Cancel = func() error { return syscall.Kill(-cmd.Process.Pid, syscall.SIGKILL) }
	cmd.WaitDelay = 2 * time.Second
	return cmd
}
```

`run.go` (`package main`): сюда переезжают `testResult`, `testEvent`, `runGoTest` из `main.go:279–394`. В `testResult` добавить `Timeout bool \`json:"timeout,omitempty"\``, `Truncated bool \`json:"truncated,omitempty"\``, `Reason string \`json:"reason,omitempty"\``; в `testEvent` — `Killed string \`json:"killed,omitempty"\`` и `done bool` (пришло pass/fail/skip). Новое:

```go
// maxRunOutput — потолок сырого вывода прогона: решение с fmt.Println в
// бесконечном цикле иначе раздувало память самого сервера.
const maxRunOutput = 4 << 20

// runLimits — пределы одного прогона. TestTimeout уходит в `go test -timeout`:
// бинарник сам падает с «panic: test timed out», называет тест и печатает стек.
// Deadline — запасной срок на всё (сборка + тесты); по нему убивается группа.
type runLimits struct {
	Race        bool
	TestTimeout time.Duration
	Deadline    time.Duration
	MaxOutput   int
}

func defaultLimits(race bool) runLimits {
	lim := runLimits{Race: race, TestTimeout: 20 * time.Second, MaxOutput: maxRunOutput}
	if race {
		lim.TestTimeout = 45 * time.Second // -race в разы медленнее
	}
	lim.Deadline = lim.TestTimeout + 25*time.Second // запас на сборку: холодный кэш, -race
	return lim
}

// cappedBuffer копит не больше limit байт, остальное отбрасывает.
type cappedBuffer struct {
	buf       bytes.Buffer
	limit     int
	truncated bool
}

func (c *cappedBuffer) Write(p []byte) (int, error) {
	if room := c.limit - c.buf.Len(); room < len(p) {
		c.truncated = true
		c.buf.Write(p[:max(room, 0)])
		return len(p), nil // «приняли» всё: ошибка записи убила бы процесс и подменила картину
	}
	return c.buf.Write(p)
}

var timedOutRe = regexp.MustCompile(`panic: test timed out after (\S+)`)

// markUnfinished помечает тесты, которые стартовали и не завершились, и возвращает их имена.
func markUnfinished(res *testResult, why string) []string {
	var names []string
	for i := range res.Tests {
		if !res.Tests[i].done {
			res.Tests[i].Killed = why
			names = append(names, res.Tests[i].Name)
		}
	}
	return names
}

func runGoTest(ctx context.Context, dir string, args []string, lim runLimits) testResult {
	ctx, cancel := context.WithTimeout(ctx, lim.Deadline)
	defer cancel()
	out := &cappedBuffer{limit: lim.MaxOutput}
	cmd := groupCommand(ctx, "go", args...)
	cmd.Dir = dir
	cmd.Env = append(os.Environ(), "GOFLAGS=", "GOWORK=off") // прежний комментарий сохранить
	cmd.Stdout, cmd.Stderr = out, out

	start := time.Now()
	_ = cmd.Run() // код выхода не нужен: исход читается из событий и из ctx
	res := parseTestOutput(out.buf.Bytes())
	res.Duration = time.Since(start).Round(time.Millisecond).String()
	res.Truncated = out.truncated
	switch {
	case res.Timeout: // сработал -timeout бинарника: тест уже назван
	case ctx.Err() == context.DeadlineExceeded:
		res.Timeout = true
		markUnfinished(&res, "timeout")
		res.Reason = fmt.Sprintf("прогон не уложился в %s и остановлен целиком — похоже на бесконечный цикл", lim.Deadline)
	case out.truncated:
		res.Reason = fmt.Sprintf("вывод обрезан на %d КиБ — похоже на печать в бесконечном цикле; убери отладочный вывод и запусти снова", lim.MaxOutput>>10)
	}
	res.OK = res.Build && res.Failed == 0 && res.Passed > 0 && !res.Race && !res.Timeout && !res.Truncated
	return res
}
```

`parseTestOutput(out []byte) testResult` — чистая функция из прежнего разбора (`main.go:326–391`: цикл по строкам, `Build`, `Tests`, `Passed/Failed`, `Output`, `Race`) с тремя правками: (1) перед циклом `timeout := ""`, в цикле после удачного `json.Unmarshal` — `if m := timedOutRe.FindStringSubmatch(ev.Output); m != nil { timeout = m[1] }`; (2) в `switch ev.Action`: `case "pass": te.Pass, te.done = true, true` и `case "fail", "skip": te.Pass, te.done = false, true`; (3) `res.OK` здесь не считается, в конце:

```go
	if timeout != "" { // у зависшего теста события fail нет — он просто не завершён
		res.Timeout = true
		res.Reason = fmt.Sprintf("тест %s не уложился в %s — похоже на бесконечный цикл",
			strings.Join(markUnfinished(&res, "timeout"), ", "), timeout)
	}
	return res
```

`main.go`: `testArgs` получает `timeout time.Duration`, первая строка — `args := []string{"test", "-json", "-count=1", "-timeout", timeout.String()}`. Рядом с `validPkg`:

```go
// server — состояние между запросами. Окно slot (ёмкость 1) пускает один прогон
// за раз: два одновременных go test — два компилятора и два набора тестов в памяти.
type server struct {
	slot        chan struct{}
	limits      func(race bool) runLimits
	traceLimits func() runLimits
}

func newServer() *server {
	return &server{
		slot:        make(chan struct{}, 1),
		limits:      defaultLimits,
		traceLimits: func() runLimits { return runLimits{Deadline: 5 * time.Second, MaxOutput: maxRunOutput} },
	}
}

// acquire ждёт очереди на прогон; false — клиент ушёл, не дождавшись.
func (s *server) acquire(ctx context.Context) bool {
	select {
	case s.slot <- struct{}{}:
		return true
	case <-ctx.Done():
		return false
	}
}

func (s *server) release() { <-s.slot }
```

`handleRun` и `handleTrace` становятся методами `(s *server)`; в `main()` — `srv := newServer()`, `withCORS(srv.handleRun)`, `withCORS(srv.handleTrace)`. В `handleRun`: `lim := s.limits(req.Race)`; `testArgs(req.Pkg, req.Race, req.Tests, lim.TestTimeout)`; перед `os.MkdirTemp` — `if !s.acquire(r.Context()) { return }` и `defer s.release()`; в конце `res := runGoTest(r.Context(), tmp, args, lim)`. Лишние импорты убрать.

`trace.go`: в `handleTrace` перед `os.MkdirTemp` (`:357`) — те же `acquire`/`release`; вызов `runTraceHarness(r.Context(), tmp, funcName, qualifiedCall, s.traceLimits())`. В `runTraceHarness`: оба контекста — от `ctx`; `build` и `run` — через `groupCommand`; срок запуска — `lim.Deadline`; вместо `bytes.Buffer` — `stdout, stderr := &cappedBuffer{limit: lim.MaxOutput}, &cappedBuffer{limit: lim.MaxOutput}` (читать `stdout.buf.String()`); ветка таймаута:

```go
	if runCtx.Err() == context.DeadlineExceeded || stdout.truncated {
		reason := fmt.Sprintf("выполнение не уложилось в %s — похоже на бесконечный цикл", lim.Deadline)
		if stdout.truncated {
			reason = fmt.Sprintf("трасса не поместилась в %d КиБ — похоже на очень длинный или бесконечный цикл; возьми вход поменьше", lim.MaxOutput>>10)
		}
		return traceResponse{Timeout: true, Reason: reason, Steps: steps, Duration: duration}
	}
```

- [ ] **Step 5: зелёное.** Run: `SAFE_SECS=300 scripts/safe-run.sh go -C exercises test -tags solution -count=1 ./cmd/runner/...` → `ok`; то же с `-race` → `ok`; `gofmt -l exercises` → пусто; `scripts/safe-run.sh go -C exercises vet -tags solution ./cmd/runner/...` и без тега → без вывода. Мутации (каждая роняет названный тест, затем `git checkout`): убрать `cmd.Cancel` → `TestRunGoTestKillsWholeTree`; убрать `"-timeout", timeout.String()` → `TestTestArgs`; `return room, nil` в `cappedBuffer.Write` → `TestCappedBuffer`.

- [ ] **Step 6: виджет — падающий смоук.** `scripts/runner-render-check.js`:

```js
#!/usr/bin/env node
// Смоук вида результата runner'а (assets/runner.js) без сервера: готовые ответы /api/run
// подаются в ALGO_RUNNER_VIEW. Зависание раньше выглядело как немое «✗ есть падения» —
// здесь закреплено, что читатель видит причину первой строкой.
// Если jsdom не найден — мягкий пропуск (exit 0), как в остальных смоуках.
"use strict";
const fs = require("fs");
const path = require("path");
let JSDOM;
try { ({ JSDOM } = require("jsdom")); } catch (e) {
  console.log("⏭  runner-render-check: jsdom не установлен — пропускаю (npm i jsdom).");
  process.exit(0);
}
const js = fs.readFileSync(path.join(__dirname, "..", "assets", "runner.js"), "utf8");
const dom = new JSDOM(`<!DOCTYPE html><html><body><div id="out"></div><script>${js}</script></body></html>`,
  { runScripts: "dangerously", url: "http://localhost:3000/x.html" });
const V = dom.window.ALGO_RUNNER_VIEW, out = dom.window.document.getElementById("out");
if (!V) { console.error("❌ runner-render-check: runner.js не отдаёт ALGO_RUNNER_VIEW"); process.exit(1); }
const fails = [];
const expect = (ok, msg) => { if (!ok) fails.push(msg); };

const hang = { ok: false, build: true, timeout: true, passed: 1, failed: 1, duration: "20.1s",
  reason: "тест TestFibRandom не уложился в 20s — похоже на бесконечный цикл",
  tests: [{ name: "TestFib", pass: true, output: "" }, { name: "TestFibRandom", pass: false, killed: "timeout", output: "panic: …" }] };
V.result(out, hang);
expect(/TestFibRandom не уложился в 20s/.test(out.firstChild.textContent), "зависание: причина не стоит первой строкой");
expect(/⏱/.test(out.querySelector(".algo-runner__test.is-err").textContent), "зависший тест не помечен ⏱");
expect(/^⏱/.test(V.status(hang).text), `статус зависания: «${V.status(hang).text}»`);

V.result(out, { ok: false, build: false, timeout: true, duration: "45s", output: "", reason: "прогон не уложился в 45s и остановлен целиком" });
expect(!/Ошибка компиляции/.test(out.textContent), "остановка по сроку показана как ошибка компиляции");

const plain = { ok: false, build: true, passed: 0, failed: 1, duration: "0.4s", tests: [{ name: "TestA", pass: false, output: "got 1" }] };
V.result(out, plain);
expect(/^✗ есть падения/.test(V.status(plain).text) && /✗/.test(out.querySelector(".algo-runner__test").textContent), "обычное падение перестало выглядеть обычным");
expect(/^✓/.test(V.status({ ok: true, duration: "1s" }).text), "зелёный статус сломан");

if (fails.length) { console.error("❌ runner-render-check:\n  - " + fails.join("\n  - ")); process.exit(1); }
console.log("✅ runner-render-check: остановка показана причиной, обычное падение и зелёный прогон — как раньше");
```

Run: `npm i --no-save jsdom && scripts/safe-run.sh node scripts/runner-render-check.js`. Expected: `❌ … не отдаёт ALGO_RUNNER_VIEW`.

- [ ] **Step 7: `assets/runner.js`.** Перед `initWidget`:

```js
  // runStatus — строка состояния после прогона. Отдельная функция: её проверяет смоук без сервера.
  function runStatus(res) {
    if (res.ok) return { text: "✓ всё зелёное · " + res.duration, cls: "ok" };
    if (res.timeout) return { text: "⏱ не уложилось по времени · " + res.duration, cls: "err" };
    if (res.race) return { text: "🏁 гонка данных · " + res.duration, cls: "err" };
    return { text: "✗ есть падения · " + res.duration, cls: "err" };
  }
  function killMark(res) { return res.timeout ? "⏱ " : "✂ "; }
```

Строку `setStatus(res.ok ? …)` (`:271`) → `var st = runStatus(res); setStatus(st.text, st.cls);`. Начало `renderResult` (`:323–329`):

```js
    out.innerHTML = "";
    // Остановка по времени или по потолку вывода — не «упал тест»: сначала говорим, что случилось.
    if (res.reason) out.appendChild(el("div", "algo-runner__verdict is-err", killMark(res) + res.reason));
    if (!res.build) {
      if (!res.reason) out.appendChild(el("div", "algo-runner__verdict is-err", "✗ Ошибка компиляции"));
      if (res.output || !res.reason) out.appendChild(pre(res.output || "(нет вывода)"));
      return;
    }
```

Метка теста (`:357`): `t.pass ? "✓" : (t.killed === "timeout" ? "⏱" : t.killed === "memory" ? "💾" : "✗")`. Рядом с `window.ALGO_RUNNER_INIT`: `window.ALGO_RUNNER_VIEW = { result: renderResult, status: runStatus };`. Run смоук → `✅`; `scripts/safe-run.sh node scripts/keys-check.js` → `✅`.

- [ ] **Step 8: CI, документы, коммит.** `.github/workflows/ci.yml`, job `assets-check`, после «Смоук клавиш виджетов» — шаг «Смоук вида результата runner'а (jsdom)»: `run: node scripts/runner-render-check.js`. `CLAUDE.md`, раздел «In-book runner»: сроки (20 с / 45 с с `-race` через `-timeout`, запасной срок +25 с, группа процессов), поля `timeout`/`truncated`/`reason`/`tests[].killed`, потолок вывода 4 МиБ, один прогон за раз, новый смоук; в «Команды» — `scripts/safe-run.sh`. `exercises/README.md:24–40` — фраза о сроке. `git add exercises/cmd/runner assets/runner.js scripts/runner-render-check.js .github/workflows/ci.yml CLAUDE.md exercises/README.md` — «Runner: срок теста, убийство дерева процессов, причина зависания, потолок вывода, один прогон за раз».

---

### Task 2: Runner — предел памяти

**Files:**
- Create: `exercises/cmd/runner/mem.go`, `mem_test.go`, `mem_unix_test.go`
- Modify: `exercises/cmd/runner/run.go`, `main.go`, `trace.go`, тесты Task 1 (вызов `newServer`); `assets/runner.js`, `runner.css`, `trace-viz.js:300–301`; `scripts/runner-render-check.js`; `Makefile:43–45`; `CLAUDE.md`; `exercises/README.md`

**Interfaces:**
- Consumes (Task 1): `runLimits`, `runGoTest`, `groupCommand`, `markUnfinished`, `server`, `writeModule`, `ALGO_RUNNER_VIEW`.
- Produces (Go): `type memMode string` (`memCgroup = "cgroup"`, `memRlimit = "rlimit"`, `memNone = "none"`); `type memLimiter struct { Mode memMode; Bytes int64 }` с методами `command(ctx context.Context, unit string, race bool, args []string) *exec.Cmd`, `binary(ctx context.Context, unit, path string) *exec.Cmd`, `addressSpace(race bool) int64`, `hitLimit(ctx context.Context, unit string, out []byte) bool`; `detectMemLimiter(ctx context.Context, limit int64) memLimiter`; `cgroupWorks(ctx context.Context) bool`; `humanBytes(n int64) string`; поле `runLimits.Mem memLimiter`; `newServer(mem memLimiter) *server`; флаг `-mem-mb` (МиБ, по умолчанию 2048, 0 — без предела).
- Produces (ответы): `/api/run` — `memLimit` (bool), `tests[].killed = "memory"`; `/api/trace` — `memLimit` + `reason`; `/api/health` — `limits: { memory: "cgroup"|"rlimit"|"none", memoryBytes, memoryText, testTimeout: "20s", raceTimeout: "45s" }`.
- Produces (JS): `ALGO_RUNNER_VIEW.limits(lim) → { text, cls, title } | null`.

Замеры плана (2026-10-06, Go 1.26.5, systemd 255; пожиратель кусками по 16 МиБ, ограничен 600–900 МиБ): (1) область `MemoryMax=400M`: сборка и компоновка крошечного теста проходят; на пределе ядро убивает бинарник, systemd гасит область — `go` получает SIGTERM (код 143), вывод обрывается на `=== RUN`, `systemctl --user show <unit>.scope -p Result` сразу даёт `oom-kill`; (2) внутри пробной области `memory.max` = `67108864`; (3) `prlimit --as` 768 МиБ: первое же выделение 16 МиБ падает — `runtime: out of memory: cannot allocate 16777216-byte block (3866624 in use)`; 1 ГиБ — то же при ≈326 МБ в куче; (4) `-race`: 2 ГиБ адресов — `fatal error: too many address space collisions for -race mode` на первом выделении; 4 ГиБ — `ThreadSanitizer failed to allocate …` до 600 МиБ. Вывод: 768 МиБ / 2 ГиБ из `N/practice.md:529–535` — пороги запуска пустого бинарника, не рабочие значения; нижние границы здесь — 1 ГиБ и 4 ГиБ с `-race`.

- [ ] **Step 1: падающие тесты.** `mem_test.go`:

```go
package main

import (
	"context"
	"strings"
	"testing"
)

func TestHumanBytes(t *testing.T) {
	for n, want := range map[int64]string{2 << 30: "2 ГиБ", 1536 << 20: "1.5 ГиБ", 512 << 20: "512 МиБ"} {
		if got := humanBytes(n); got != want {
			t.Errorf("humanBytes(%d) = %q, ожидалось %q", n, got, want)
		}
	}
}

func TestMemLimiterCommand(t *testing.T) {
	args := []string{"test", "-json", "./dp/"}
	cmd := func(m memLimiter, race bool) string {
		return strings.Join(m.command(context.Background(), "u1", race, args).Args, " ")
	}
	for want, got := range map[string]string{
		"systemd-run --user --scope -q --unit=u1 -p MemoryMax=2147483648 -p MemorySwapMax=0 -- go test -json ./dp/": cmd(memLimiter{memCgroup, 2 << 30}, false),
		"go test -exec prlimit --as=2147483648 -- -json ./dp/":                                                       cmd(memLimiter{memRlimit, 2 << 30}, false),
		// с -race адресов не меньше 4 ГиБ: на 2 ГиБ бинарник падает на первом крупном выделении
		"go test -exec prlimit --as=4294967296 -- -json ./dp/": cmd(memLimiter{memRlimit, 2 << 30}, true),
		"go test -json ./dp/":                                  cmd(memLimiter{Mode: memNone}, false),
	} {
		if got != want {
			t.Errorf("команда:\n %s\nожидалось\n %s", got, want)
		}
	}
}

func TestHitLimitMarkers(t *testing.T) {
	m := memLimiter{Mode: memRlimit, Bytes: 1 << 30}
	for _, s := range []string{
		"runtime: out of memory: cannot allocate 16777216-byte block (326598656 in use)",
		"fatal error: too many address space collisions for -race mode",
		"ThreadSanitizer failed to allocate 0x8000000 (134217728) bytes",
		"signal: killed",
	} {
		if !m.hitLimit(context.Background(), "u", []byte("x\n"+s+"\n")) {
			t.Errorf("не распознан упор в предел: %q", s)
		}
	}
	if m.hitLimit(context.Background(), "u", []byte("--- FAIL: TestA\n")) {
		t.Error("обычное падение принято за упор в предел")
	}
}
```

`mem_unix_test.go`:

```go
//go:build unix

package main

import (
	"context"
	"os/exec"
	"testing"
	"time"
)

// Пожиратель растёт кусками по 16 МиБ до RUNNER_EAT_MIB и САМ завершается.
// Потолок 900 МиБ: сломанный предел даёт красный тест, а не упавшую машину.
const eatTest = `package eat

import (
	"os"
	"strconv"
	"testing"
)

var keep [][]byte

func TestEat(t *testing.T) {
	limit, _ := strconv.Atoi(os.Getenv("RUNNER_EAT_MIB"))
	for mb := 0; mb < limit && mb < 900; mb += 16 {
		b := make([]byte, 16<<20)
		for i := 0; i < len(b); i += 4096 {
			b[i] = 1
		}
		keep = append(keep, b)
	}
}
`

func runEater(t *testing.T, mem memLimiter, eatMiB string) testResult {
	t.Helper()
	dir := writeModule(t, map[string]string{"eat/eat_test.go": eatTest})
	t.Setenv("RUNNER_EAT_MIB", eatMiB)
	lim := runLimits{TestTimeout: time.Minute, Deadline: 2 * time.Minute, MaxOutput: maxRunOutput, Mem: mem}
	args, _ := testArgs("eat", false, nil, lim.TestTimeout)
	return runGoTest(context.Background(), dir, args, lim)
}

func wantStopped(t *testing.T, res testResult, limit string) {
	t.Helper()
	want := "TestEat: упёрлось в предел памяти " + limit + " — похоже на бесконечный рост (например, обход без visited)"
	if !res.MemLimit || res.OK || res.Reason != want || len(res.Tests) != 1 || res.Tests[0].Killed != "memory" {
		t.Fatalf("memLimit=%v ok=%v reason=%q tests=%+v\nвывод: %.400s", res.MemLimit, res.OK, res.Reason, res.Tests, res.Output)
	}
}

func TestMemLimitCgroupStopsEater(t *testing.T) {
	if !cgroupWorks(context.Background()) {
		t.Skip("systemd-run --user --scope не ставит MemoryMax (нет пользовательского systemd или контроллера памяти)")
	}
	wantStopped(t, runEater(t, memLimiter{Mode: memCgroup, Bytes: 512 << 20}, "900"), "512 МиБ")
}

func TestMemLimitRlimitStopsEater(t *testing.T) {
	if _, err := exec.LookPath("prlimit"); err != nil {
		t.Skip("нет prlimit (util-linux)")
	}
	wantStopped(t, runEater(t, memLimiter{Mode: memRlimit, Bytes: 1 << 30}, "900"), "1 ГиБ")
}

// Контроль самой проверки: без предела маленький пожиратель дорастает, тест зелёный.
func TestEaterFinishesWithoutLimit(t *testing.T) {
	if res := runEater(t, memLimiter{Mode: memNone}, "64"); !res.OK || res.MemLimit {
		t.Fatalf("ok=%v memLimit=%v reason=%q", res.OK, res.MemLimit, res.Reason)
	}
}
```

Run: `SAFE_SECS=300 scripts/safe-run.sh go -C exercises test -tags solution -count=1 ./cmd/runner/`. Expected: FAIL сборки — `undefined: memLimiter`, `undefined: humanBytes`, `unknown field Mem`.

- [ ] **Step 2: `mem.go`.**

```go
package main

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"time"
)

type memMode string

const (
	memCgroup memMode = "cgroup" // область systemd с MemoryMax: ядро считает настоящую память всего дерева
	memRlimit memMode = "rlimit" // prlimit --as на тестовый бинарник: предел АДРЕСОВ, грубее
	memNone   memMode = "none"   // предела нет — виджет предупреждает
)

// Ниже этих значений предел адресов бессмыслен: ~700 МиБ адресов рантайм занимает
// сам, а детектор гонок на 2 ГиБ падает на первом крупном выделении (замеры — CLAUDE.md).
const (
	minAS     = 1 << 30
	minRaceAS = 4 << 30
)

// memLimiter — как сервер ограничивает память прогона. Выбирается один раз при старте.
type memLimiter struct {
	Mode  memMode
	Bytes int64
}

func humanBytes(n int64) string {
	if n >= 1<<30 {
		return strconv.FormatFloat(float64(n)/(1<<30), 'f', -1, 64) + " ГиБ"
	}
	return strconv.FormatInt(n>>20, 10) + " МиБ"
}

func unitName() string { return fmt.Sprintf("algorunner-%d-%d", os.Getpid(), time.Now().UnixNano()) }

// detectMemLimiter: cgroup, если ядро действительно ставит предел в
// пользовательской области; иначе prlimit; иначе ничего.
func detectMemLimiter(ctx context.Context, limit int64) memLimiter {
	switch {
	case limit <= 0:
		return memLimiter{Mode: memNone}
	case cgroupWorks(ctx):
		return memLimiter{Mode: memCgroup, Bytes: limit}
	}
	if _, err := exec.LookPath("prlimit"); err == nil {
		return memLimiter{Mode: memRlimit, Bytes: max(limit, minAS)}
	}
	return memLimiter{Mode: memNone}
}

// cgroupWorks запускает пробную область с MemoryMax=64M и читает ИЗНУТРИ её
// memory.max. Успешный запуск systemd-run сам ничего не доказывает: без
// делегированного контроллера памяти область создаётся, а предел не действует.
func cgroupWorks(ctx context.Context) bool {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	unit := unitName()
	defer cleanupUnit(context.WithoutCancel(ctx), unit)
	out, err := exec.CommandContext(ctx, "systemd-run", append(scopeArgs(unit, 64<<20),
		"sh", "-c", `cat "/sys/fs/cgroup$(sed -n 's/^0:://p' /proc/self/cgroup)/memory.max"`)...).Output()
	return err == nil && strings.TrimSpace(string(out)) == "67108864"
}

func scopeArgs(unit string, limit int64) []string {
	// MemorySwapMax=0: иначе процесс уйдёт в подкачку и машина встанет раньше, чем сработает предел.
	return []string{"--user", "--scope", "-q", "--unit=" + unit,
		"-p", "MemoryMax=" + strconv.FormatInt(limit, 10), "-p", "MemorySwapMax=0", "--"}
}

// cleanupUnit снимает всё дерево области и убирает её запись.
func cleanupUnit(ctx context.Context, unit string) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	for _, args := range [][]string{{"kill", "--signal=KILL"}, {"stop"}, {"reset-failed"}} {
		_ = exec.CommandContext(ctx, "systemctl", append(append([]string{"--user"}, args...), unit+".scope")...).Run()
	}
}

func (m memLimiter) addressSpace(race bool) int64 {
	if race { // теневая память детектора гонок
		return max(2*m.Bytes, minRaceAS)
	}
	return m.Bytes
}

// command строит `go <args>` под пределом. cgroup: вся команда уходит в область
// unit. rlimit: предел ставится только тестовому бинарнику через `go test -exec`
// — компилятору и компоновщику адреса не режем.
func (m memLimiter) command(ctx context.Context, unit string, race bool, args []string) *exec.Cmd {
	switch m.Mode {
	case memCgroup:
		return groupCommand(ctx, "systemd-run", append(append(scopeArgs(unit, m.Bytes), "go"), args...)...)
	case memRlimit:
		exe := fmt.Sprintf("prlimit --as=%d --", m.addressSpace(race))
		args = append([]string{args[0], "-exec", exe}, args[1:]...)
	}
	return groupCommand(ctx, "go", args...)
}

// binary — запуск готового бинарника (трасса) под тем же пределом.
func (m memLimiter) binary(ctx context.Context, unit, path string) *exec.Cmd {
	switch m.Mode {
	case memCgroup:
		return groupCommand(ctx, "systemd-run", append(scopeArgs(unit, m.Bytes), path)...)
	case memRlimit:
		return groupCommand(ctx, "prlimit", fmt.Sprintf("--as=%d", m.Bytes), "--", path)
	}
	return groupCommand(ctx, path)
}

// memMarkers — как упор выглядит в выводе: рантайм Go и детектор гонок под
// prlimit; «signal: killed» — бинарник убило ядро (cgroup, docker --memory).
var memMarkers = []string{
	"runtime: out of memory", "fatal error: out of memory",
	"ThreadSanitizer failed to allocate", "ThreadSanitizer: out of memory",
	"too many address space collisions for -race mode", "failed to reserve page summary memory",
	"signal: killed",
}

// hitLimit сообщает, упёрся ли прогон в предел памяти. В области cgroup systemd
// гасит `go` раньше, чем тот напечатает причину, — поэтому первым спрашиваем итог области.
func (m memLimiter) hitLimit(ctx context.Context, unit string, out []byte) bool {
	if m.Mode == memCgroup {
		ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
		defer cancel()
		res, _ := exec.CommandContext(ctx, "systemctl", "--user", "show", unit+".scope", "-p", "Result", "--value").Output()
		if strings.TrimSpace(string(res)) == "oom-kill" {
			return true
		}
	}
	for _, mk := range memMarkers {
		if bytes.Contains(out, []byte(mk)) {
			return true
		}
	}
	return false
}
```

- [ ] **Step 3: встроить.** `run.go`: поле `Mem memLimiter` в `runLimits`; `MemLimit bool \`json:"memLimit,omitempty"\`` в `testResult`; в `runGoTest` вместо `groupCommand(ctx, "go", args...)` — `unit := unitName()` и `cmd := lim.Mem.command(ctx, unit, lim.Race, args)`; сразу после `cmd.Run()`:

```go
	bg := context.WithoutCancel(ctx) // срок прогона мог выйти, а итог области ещё нужен
	hit := lim.Mem.hitLimit(bg, unit, out.buf.Bytes())
	if lim.Mem.Mode == memCgroup {
		cleanupUnit(bg, unit)
	}
```

первая ветка `switch` (перед `case res.Timeout`) и `&& !res.MemLimit` в `res.OK`:

```go
	case hit:
		res.MemLimit, res.Timeout = true, false
		limit := "машины"
		if lim.Mem.Mode == memRlimit {
			limit = humanBytes(lim.Mem.addressSpace(lim.Race))
		} else if lim.Mem.Mode == memCgroup {
			limit = humanBytes(lim.Mem.Bytes)
		}
		who := strings.Join(markUnfinished(&res, "memory"), ", ")
		if who == "" {
			who = "прогон"
		}
		res.Reason = fmt.Sprintf("%s: упёрлось в предел памяти %s — похоже на бесконечный рост (например, обход без visited)", who, limit)
```

`main.go`: флаг `memMB := flag.Int("mem-mb", 2048, "предел памяти одного прогона, МиБ (0 — без предела)")`; после `flag.Parse()` — `limiter := detectMemLimiter(context.Background(), int64(*memMB)<<20)`, строка лога по режиму (для `memNone` при `*memMB > 0`: «ВНИМАНИЕ: предела памяти нет — ни systemd --user, ни prlimit; бесконечный рост в решении может занять всю память машины»), `srv := newServer(limiter)`. `newServer(mem memLimiter)` подмешивает предел: `limits: func(race bool) runLimits { lim := defaultLimits(race); lim.Mem = mem; return lim }`, то же в `traceLimits`. `handleHealth` — метод `server`:

```go
func (s *server) handleHealth(w http.ResponseWriter, _ *http.Request) {
	lim := s.limits(false)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "module": moduleRoot, "limits": map[string]any{
		"memory": lim.Mem.Mode, "memoryBytes": lim.Mem.Bytes, "memoryText": humanBytes(lim.Mem.Bytes),
		"testTimeout": lim.TestTimeout.String(), "raceTimeout": s.limits(true).TestTimeout.String(),
	}})
}
```

Вызовы `newServer()` в тестах Task 1 → `newServer(memLimiter{Mode: memNone})`. `trace.go`: `unit := unitName()`, `run := lim.Mem.binary(runCtx, unit, binPath)`, после `run.Run()` — те же `hitLimit`/`cleanupUnit`; при `hit` — `return traceResponse{Build: true, MemLimit: true, Reason: "выполнение упёрлось в предел памяти " + humanBytes(lim.Mem.Bytes) + " — похоже на бесконечный рост (например, обход без visited)", Steps: steps, Duration: duration}`; поле `MemLimit bool \`json:"memLimit,omitempty"\`` в `traceResponse`.

- [ ] **Step 4: зелёное.** Run: `SAFE_SECS=300 scripts/safe-run.sh go -C exercises test -tags solution -count=1 -v -run 'Mem|Eater|HitLimit|Human' ./cmd/runner/`. Expected: все `PASS`, строки `SKIP` НЕТ (cgroup на этой машине доступен; `SKIP` — причина остановиться). Затем `SAFE_SECS=300 scripts/safe-run.sh go -C exercises test -tags solution -count=1 ./cmd/runner/...` и то же с `-race` → `ok`; `gofmt -l exercises` → пусто; `scripts/safe-run.sh go -C exercises vet -tags solution ./cmd/runner/...` и без тега → без вывода. Мутации: `MemoryMax=` → `MemoryHigh=` в `scopeArgs` → `TestMemLimitCgroupStopsEater`, `TestMemLimiterCommand`; убрать `"-exec", exe` → `TestMemLimitRlimitStopsEater`; убрать ветку `case hit` → оба `…StopsEater`.

- [ ] **Step 5: виджет.** В `scripts/runner-render-check.js` перед итогом (RED: `V.limits is not a function`):

```js
const mem = { ok: false, build: true, memLimit: true, passed: 0, failed: 1, duration: "3.1s",
  reason: "TestBFSOrder: упёрлось в предел памяти 2 ГиБ — похоже на бесконечный рост (например, обход без visited)",
  tests: [{ name: "TestBFSOrder", pass: false, killed: "memory", output: "" }] };
V.result(out, mem);
expect(/^💾 TestBFSOrder: упёрлось в предел памяти 2 ГиБ/.test(out.firstChild.textContent), "упор в память: причина не первой строкой");
expect(/💾/.test(out.querySelector(".algo-runner__test").textContent) && /^💾/.test(V.status(mem).text), "упор в память не помечен 💾");
const L = (memory, memoryText) => V.limits({ memory, memoryText, testTimeout: "20s", raceTimeout: "45s" });
expect(L("cgroup", "2 ГиБ").text === "предел 2 ГиБ · 20 с", `предел cgroup: «${L("cgroup", "2 ГиБ").text}»`);
expect(/адресов 2 ГиБ/.test(L("rlimit", "2 ГиБ").text), "предел адресов не назван адресами");
expect(/без предела памяти/.test(L("none", "0 МиБ").text) && L("none", "0 МиБ").cls === "warn", "отсутствие предела не показано предупреждением");
expect(V.limits(undefined) === null, "старый сервер без limits должен давать null");
```

`assets/runner.js`: в `runStatus` перед строкой `res.timeout` — `if (res.memLimit) return { text: "💾 предел памяти · " + res.duration, cls: "err" };`; `killMark` — `res.memLimit ? "💾 " : res.timeout ? "⏱ " : "✂ "`; в `ALGO_RUNNER_VIEW` — `limits: limitsBadge`:

```js
  // limitsBadge — что показать в шапке про действующие пределы (ответ /api/health).
  function limitsBadge(lim) {
    if (!lim) return null;
    var t = parseInt(lim.testTimeout, 10) + " с";
    if (lim.memory === "none") return { text: "⚠ без предела памяти · " + t, cls: "warn",
      title: "Runner не смог включить предел памяти (нет ни systemd --user, ни prlimit). Бесконечный рост — например, обход без visited — может занять всю память машины. Безопасный вариант: make docker-runner." };
    if (lim.memory === "rlimit") return { text: "предел адресов " + lim.memoryText + " · " + t, cls: "",
      title: "Память ограничена через адресное пространство тестового бинарника (prlimit): грубее настоящего предела, но бесконечный рост останавливает." };
    return { text: "предел " + lim.memoryText + " · " + t, cls: "", title: "Прогон идёт в отдельной области с пределом памяти; тест, не уложившийся в срок, останавливается." };
  }
```

Один запрос на страницу: рядом с `cmPromise` — `var healthPromise = null; function health() { if (!healthPromise) healthPromise = api("/api/health", {}); return healthPromise; }`; в `initWidget` после `setStatus("сервер на связи", "ok")` — `health().then(function (h) { var b = limitsBadge(h.limits); if (!b) return; var s = el("span", "algo-runner__limits" + (b.cls ? " is-" + b.cls : ""), b.text); s.title = b.title; head.insertBefore(s, status); }).catch(function () {});`. `assets/runner.css` после `.algo-runner__race`: `.algo-runner__limits { font-size: 11px; opacity: 0.8; }`, `.algo-runner__limits.is-warn { color: var(--ar-warn); opacity: 1; font-weight: 700; }`. `assets/trace-viz.js:300–301`: условие `resp.timeout || resp.memLimit`, значок `resp.memLimit ? "💾" : "⏱"`. Run смоук и `keys-check.js` → `✅`.

- [ ] **Step 6: контейнер и живая проверка.** `Makefile:44`: `docker run --rm --memory=2g --memory-swap=2g -p 127.0.0.1:8080:8080 …`; те же флаги — в команде `assets/runner.js:392` и в док-комментарии `main.go:25–26` (в контейнере systemd нет: работают `prlimit` и предел самого контейнера, упор виден как `signal: killed`). Живая проверка без роста памяти: `SAFE_SECS=60 scripts/safe-run.sh go -C exercises run ./cmd/runner` в фоне; `curl -s localhost:8080/api/health` → `"memory":"cgroup"`, `"memoryText":"2 ГиБ"`, `"testTimeout":"20s"`; в логе — строка о режиме.

- [ ] **Step 7: документы и коммит.** `CLAUDE.md`, раздел runner: способ (cgroup → prlimit → нет), флаг `-mem-mb`, `limits` в `/api/health`, `memLimit` и `killed: "memory"`, четыре замера из шапки задачи, флаги `make docker-runner`, «пожиратель в тестах ограничен 900 МиБ; вложенный systemd-run уходит в соседнюю область»; «без песочницы» уточнить: песочницы нет, пределы времени и памяти есть. `exercises/README.md` — фраза о пределе. `git add exercises/cmd/runner assets/runner.js assets/runner.css assets/trace-viz.js scripts/runner-render-check.js Makefile CLAUDE.md exercises/README.md` — «Runner: предел памяти — cgroup, запасной prlimit; действующий предел виден в виджете».

---

### Task 3: Ошибки в главах, строки 1–19

**Files:** Modify `src/big-o.md`, `invariants.md`, `hash-table-structure.md`, `linked-list-structure.md`, `sorting.md`, `sliding-window.md`, `two-pointers.md`, `fast-slow-pointers.md`, `merge-intervals.md`; `assets/algo-viz.js:1439`.

**Interfaces:** Consumes: строки 1–19 таблицы `R`. Produces: сигнатура `insertAt(head, val, pos)` в главе и в листинге виджета `ll-insert`.

- [ ] **Step 1: по каждой строке — подтвердить, затем править.** «→» читается «заменить на»; текст из заметки переносится дословно.

| № | Где | Правка | Проверка |
|---|---|---|---|
| 1 | `big-o.md:175` | ячейка «10–12» у `O(n!)` → «10–11» | кодом: 12! = 479 001 600 — 4,8 с при 10⁸/с; 11! — 0,4 с |
| 2 | `big-o.md:239` | «(1M × 8 байт)» → «(2²⁰ × 8 байт = 8 388 608)» | `exercises/bigo/append_bench_test.go:14` |
| 3 | `invariants.md:195` | «`for !allDone` против `for anyPending` — разные циклы» → «`for !allDone` (пока хоть кто-то не готов) и `for !anyDone` (пока не готов никто) — разные циклы, хотя на слух оба — «пока не готово»» | `:164`: `!allDone` ≡ `anyPending` |
| 4 | `invariants.md:95`, `:204` | `:95`, ячейки: «число вершин, ещё не извлечённых из очереди» / «каждая итерация извлекает одну, а попасть в очередь вершина может лишь раз». `:204`: первый вариант ответа — те же две мысли одной фразой; в объяснении «Убывает число НЕпосещённых вершин» → «Убывает число ещё не извлечённых вершин (непосещённые — не вариант: итерация без новых соседей никого не помечает)» | BFS на звезде из 3 вершин: непосещённых 0, 0, 0 (`N/theory_A.md:260–267`); в вариантах нет вертикальной черты (ею они разделены) |
| 5 | `hash-table-structure.md:379` | убрать «; переключатель — `GODEBUG=swissmap`» | `grep -rI swissmap $(go env GOROOT)/src/runtime/*.go` пуст |
| 6 | `hash-table-structure.md:34` | `[Trie](trie-structure.md)` → `<a href="trie-structure.md">Trie</a>` (как в `tree-bfs.md:55`) | после `mdbook build` в `book/hash-table-structure.html` нет `[Trie](` |
| 7 | `linked-list-structure.md:104`, `:187`, `:286`; `assets/algo-viz.js:1439` | `insertAt(head *ListNode, pos, val int)` → `insertAt(head *ListNode, val, pos int)` в главе и в листинге виджета; `insertAt(head, 2, 9)` → `insertAt(head, 9, 2)`; после «(ровно те, что показаны виджетами выше)» — «с одним отличием: `Search` там возвращает не узел, а его **индекс** (или `-1`) — узлы тест сравнить не может, а числа может. Проход тот же, добавь счётчик.» | `exercises/listcrud/listcrud.go:12`, `:19`; `node scripts/check-viz.js` |
| 8 | `linked-list-structure.md:212` | «теперь у выреза **четыре** конца, и забытый один из них» → «вставка переписывает **четыре** ссылки вместо двух, удаление — две вместо одной, и забытая одна из них» | `:209` |
| 9 | `linked-list-structure.md:6` | «Приём разворота и задачи — в следующей главе.» → «Приём разворота — в отдельной главе расширения «Reverse Linked List».» | `src/SUMMARY.md:20–22` |
| 10 | `sorting.md:362–365`, `:48`, `:356` | «нужно ≥ log₂(n!) листьев, а log₂(n!) = Θ(n log n) (формула Стирлинга). Значит, **никакой** алгоритм сравнениями не обгонит O(n log n) в худшем случае.» → «дереву нужно ≥ `n!` листьев, значит его высота — число сравнений в худшем случае — не меньше log₂(n!) = Θ(n log n) (формула Стирлинга). **Любому** алгоритму на сравнениях в худшем случае нужно Ω(n log n) сравнений: это нижняя граница **задачи**, а не оценка алгоритма ([Big-O](big-o.md)).» В `:48` и `:356` у нижней границы `O(n log n)` → `Ω(n log n)`; заголовок `:360` не трогать (якорь) | `big-o.md:94–104` |
| 11 | `sorting.md:389` | «снова линейно/логарифмически» → «снова `O(n)` у QuickSelect и `O(n log n)` у быстрой сортировки» | `:385–386` |
| 12 | `sorting.md:399` | «если рекурсия заходит слишком глубоко» → «когда слишком много разбиений подряд вышли перекошенными (кончился лимит плохих разбиений)» | `$(go env GOROOT)/src/slices/zsortordered.go:79–83` |
| 13 | `sliding-window.md:43`, `:600` | `:43`: «<b>left</b> догоняет, только когда условие нарушено — <b>сжимает</b> окно;» → «<b>left</b> идёт только вперёд и <b>сжимает</b> окно: в задачах «самое длинное при ограничении» — пока окно сломано, в задачах «самое короткое при пороге» — пока оно ещё годится;». `:600`: вопрос → «Окно «самое длинное при ограничении»: когда двигаем left (сжимаем слева)?»; в объяснении убрать «сумма ≥ target» из списка и дописать «В зеркальной семье («сумма ≥ target») наоборот: сжимают, пока порог ещё набран.» | `minSubArrayLen` `:545`; подсказка `:643–645` |
| 14 | `two-pointers.md:458` | «запись, перешагнули дубль `-1` слева» → «запись, `left++` и `right--`» | `:446–447`; прогон кода `:407–436`: перешагиваний 0 и 0 |
| 15 | `two-pointers.md:30` | пункт «порядок элементов важно сохранить (для фильтрации на месте)» → «нужны исходные индексы, а массив пришлось бы сортировать → хеш-таблица» | `:493`, `:319–322` |
| 16 | `fast-slow-pointers.md:240`, `:253–258` | эталон и абзац про «зазор» → текст `N/theory_B.md:610–614` (в эталоне — с `<code>`); остальные «зазор» в главе — в том же смысле («сколько `fast` осталось до `slow`») | прогон на списке `:137`: «впереди на» 2 → 3 → 0, «осталось» 2 → 1 → 0; `check-explain.js` |
| 17 | `fast-slow-pointers.md:313–314` | пункт 4 → «**Лишние особые случаи** — пустой список, один узел и петлю на себя закрывает само условие цикла `fast != nil && fast.Next != nil`; отдельные проверки не нужны. Убедись в этом на трёх тестах.» | прогон шаблона `:118` на трёх входах |
| 18 | `merge-intervals.md:287–289` | совет «копируй перед сортировкой: `cp := …`» → текст `N/theory_C.md:108–112`, дальше прежнее «Это `O(n)` памяти…» | запуск шаблона `:114–126` на копии `[[8,10],[1,3],[2,6]]`: оригинал становится `[[8,10],[1,6],[2,6]]` |
| 19 | `merge-intervals.md:265` | «*Burst Balloons*» → «*Minimum Number of Arrows to Burst Balloons*, LeetCode 452» | LeetCode 312 — ДП по отрезкам |

- [ ] **Step 2: проверки.** `scripts/safe-run.sh go -C exercises run ./cmd/checksnippets -src ../src`; `mdbook build`; `node scripts/check-links.js`, `check-challenges.js`, `check-explain.js`, `check-ladder.js`, `check-registries.js`, `check-viz.js`; `scripts/safe-run.sh node scripts/explain-check.js` → всё `✅`.
- [ ] **Step 3: коммит.** `git add` девяти глав и `assets/algo-viz.js` — «Главы: 19 ошибок по существу, от Big-O до слияния интервалов». Неподтвердившиеся строки — в отчёт.

---

### Task 4: Ошибки в главах, строки 20–37, и «С трудом»

**Files:** Modify `src/modified-binary-search.md`, `bst-structure.md`, `tree-bfs.md`, `tree-dfs.md`, `heap-structure.md`, `top-k-elements.md`, `graphs.md`, `topological-sort.md`, `greedy.md`, `dynamic-programming.md`, `README.md`, `review.md`, `pattern-selection-guide.md`; `assets/progress.js:118`; `assets/srs.js:192`; `scripts/srs-check.js:238`; `CLAUDE.md`.

**Interfaces:** Consumes: строки 20–37 таблицы `R`. Produces: `schedule(card, "hard", now)` растит интервал не меньше чем на день — на это опирается текст `review.md`.

- [ ] **Step 1: «С трудом» — падающая проверка.** В `scripts/srs-check.js` после проверки `afterHard.iv !== 24`:

```js
  // «С трудом» обязано растить интервал и на коротких: round(1 × 1.2) = 1 возвращал
  // карточку каждый день без конца.
  for (const [iv, want] of [[0, 1], [1, 2], [2, 3], [3, 4]]) {
    const d = await newDom({ algoSRS: JSON.stringify({ [id]: Object.assign({}, base, { iv, reps: iv ? 2 : 0 }) }) });
    click(d, "С трудом");
    const got = cards(d)[id].iv;
    if (got !== want) errors.push(`«С трудом» при интервале ${iv}: стало ${got}, ожидалось ${want} (рост не меньше чем на день)`);
  }
```

Run: `scripts/safe-run.sh node scripts/srs-check.js`. Expected: `❌`, две строки — при интервале 1 стало 1, при интервале 2 стало 2.

- [ ] **Step 2: правка.** `assets/srs.js:192`: `card.iv = Math.max((card.iv || 0) + 1, Math.round((card.iv || 1) * 1.2));`. Run → `✅`. `CLAUDE.md`, описание расписания: «„С трудом“ растит интервал на 20 %, но не меньше чем на день».

- [ ] **Step 3: один замер BFS (строка 29).** Run: `SAFE_SECS=300 scripts/safe-run.sh go -C exercises test -tags solution -run '^$' -bench . -benchtime 2s -count 5 -p 1 ./parallelbfs/`. Медианы `BenchmarkSeq` / `Conc` / `ConcLocal` в пределах ±15 % от `parallel-algorithms.md:154–156` (0.12 / 10.5 / 1.7 мс) — та глава не меняется, `graphs.md` получает её цифры. Расходятся — остановиться и вернуть координатору оба набора: от решения зависят `parallel-algorithms.md:9`, `:39`, `:116`, `:141`, `:145`, `:158`, `:332` и `CLAUDE.md`. Сырой вывод — в отчёт.

- [ ] **Step 4: по каждой строке — подтвердить, затем править.**

| № | Где | Правка | Проверка |
|---|---|---|---|
| 20 | `modified-binary-search.md:44`, `:405–406` | `:44`: пункт → «<code>left &lt;= right</code> идёт в паре с <code>mid±1</code> — так ищут значение, а границу — запоминая кандидата; <code>left &lt; right</code> идёт в паре с <code>right = mid</code> — вторая форма поиска границы. Пары не смешивают;». `:405`: «`left <= right` идёт в паре с `mid±1` (границу так тоже ищут — запоминая кандидата, как в «первом вхождении»), `left < right` — в паре с `right = mid`. Смешивать пары нельзя.» | код `:187–203` ищет границу через `left <= right` |
| 21 | `modified-binary-search.md:385–387`, `:490–491` | слова «конвенция `[lo, hi)`» убрать в обоих местах, вместо них — текст `N/theory_C.md:217–218` («Ответ всегда внутри `[lo, hi]`, оба конца включены; `mid` до `hi` не дотягивается, поэтому `hi = mid` сужает отрезок»); запрет смешивать с `lo <= hi` + `mid±1` оставить | `:366–371` (`hi = max(piles)`), `:466` |
| 22 | `bst-structure.md:110–111` | «Половина оставшегося дерева отбрасывается на каждом шаге — отсюда O(h).» → текст `N/theory_C.md:321–322` | `:104–106` |
| 23 | `bst-structure.md:230` | после вопроса о вставке `9` добавить « (Ответ: три — два в спуске, с <code>5</code> и <code>8</code>, и ещё одно при подцеплении листа: код заново сравнивает с <code>parent</code>.)» | счётчик сравнений в коде `:148–165` на `5,3,8,2,4,7,9`; не 3 — не править |
| 24 | `tree-bfs.md:435–436` | «(`2i`, `2i+1`)» → «(дети узла `i` — `2i+1` и `2i+2`)» | `heap-structure.md:49` |
| 25 | `tree-dfs.md:317` | пункт 4 → «**Перецепили ссылку раньше, чем прошли по ней** — менять дерево в обходе можно (Invert Binary Tree из разогрева так и делает), но сначала обойди или сохрани ребёнка, а потом переписывай `node.Left`/`node.Right`: иначе рекурсия уйдёт по уже новой ссылке.» | лестница `:477` |
| 26 | `heap-structure.md:214`, `:217` | `n·Σ(k/2ᵏ) ≤ 2n` → `n·Σ(k/2^(k+1)) ≈ n ≤ 2n`; «сходится к 2 — вот откуда линейность» → «сходится к 2, здесь от него половина — вот откуда линейность» | кодом: сумма высот узлов при n = 1023 равна 1013 |
| 27 | `top-k-elements.md:236`, `:371` | первое предложение абзаца → текст `N/theory_C.md:691–694`; после «в порядке `(1,3), (2,2), (3,1)`» — « (порядок обхода `map` в Go случаен и меняется от запуска к запуску; ответ от него не зависит, а путь к нему — да)» | шаблон `:114–119`, код `:351` |
| 28 | `graphs.md:285–288`, `:510`, `:545–546` | `:285`: абзац → «Если просто перенести пометку `visited[next] = true` к моменту **извлечения**, вершина, к которой ведут две дороги, попадёт в очередь дважды и будет обработана дважды — ответ уже неверен: на графе виджета выше `order = [0,1,2,3,3,4,5]`. Копий становится столько, сколько к вершине кратчайших путей: на слоистом графе из 25 вершин и 46 рёбер такой обход достаёт из очереди 8191 элемент вместо 25. (Помечать при извлечении можно, если первым делом проверять «уже обработана — пропусти»: ответ верен и время то же, но очередь вырастает до числа рёбер.)» `:510`, объяснение: «Результат обхода останется верным, но на плотном графе очередь раздувается и O(V+E) ломается.» → «Вершина будет обработана несколько раз, и порядок обхода уже неверен; на графе со многими кратчайшими путями число копий растёт лавиной.» `:545`: «и оценка `O(V+E)` развалится» → «и в ответ тоже» | оба числа — своим прогоном (граф виджета `:109`; слоистый граф — `N/theory_D.md:199–209`, `:759–794`), через `safe-run.sh` и только на этих двух графах |
| 29 | `graphs.md:567`, `:614`, `:644–648` | «в 70 раз» → «почти в 90 раз»; «(≈15 мс против ≈0.2 мс)» → «(≈10.5 мс против ≈0.12 мс)»; таблица: 0.12 мс / 10.5 мс, «почти ×90» / 1.7 мс, «почти ×15»; «в **7 раз** … в 9 раз» → «в **6 раз** … почти в 15 раз» | Step 3; `grep -n 'в 70 раз' src/*.md` и `grep -n '0\.22 мс' src/*.md` пусты |
| 30 | `topological-sort.md:110`, `:528` | «очередь почти всё время держит **две** готовые вершины» → «в очереди то и дело **две** готовые вершины (её размер по шагам — 2, 1, 2, 1, 2, 1)»; «релаксируем степени соседей» → «уменьшаем степени соседей» | прогон Кана на `A-C,B-C,B-D,C-E,D-E,D-F` с печатью размера очереди |
| 31 | `greedy.md:229`, `:261` | «<code>O \ {a} ∪ {g}</code> тоже оптимально» → «расписание <code>O</code>, в котором <code>a</code> заменена на <code>g</code>, тоже оптимально»; «Это строгая форма интуиции «жадный остаётся впереди».» → «Это и есть доказательство заменой; «жадный остаётся впереди» — другой приём из списка выше, здесь он не использован.» | `:159–162`; `check-explain.js` |
| 32 | `dynamic-programming.md:411` | перед `res := []int{}` — три строки: `if dp[amount] >= INF { // сумма недостижима: цикл ниже иначе не закончится`, `return nil`, `}` | прогон с ограничителем на `coins=[2]`, `amount=3`; `checksnippets` |
| 33 | `dynamic-programming.md:421` | `→ [5, 5, 1]` → `→ [1, 5, 5]` | прогон `restoreCoins` на `amount=11`, `coins=[1,2,5]` |
| 34 | `README.md:112`, `assets/progress.js:118` | «Ничто в ядре на этих главах не держится.» → «Ядро на них почти не опирается; четыре исключения названы в самих главах: дек — перед обходом дерева в ширину, подмножества — перед перебором с возвратом, разворот списка и Union-Find — по одной задаче «основы».»; в `progress.js` убрать хвост « — ничего в ядре на этой главе не держится» | `tree-bfs.md:55`, `backtracking.md:55`, `fast-slow-pointers.md:471`, `graphs.md:536`; `progress-render-check.js` |
| 35 | `README.md:173–175`, `CLAUDE.md:154` | «У пяти глав-устройств (инварианты, хеш-таблица, …» → «У четырёх глав-устройств (хеш-таблица, связный список, BST, куча) лестницы нет: там глава сдана, когда пакет тренажёра в виджете «💻 Реши прямо здесь» стал зелёным целиком. У главы об инвариантах нет ни лестницы, ни пакета: она сдана, когда задачи в её тексте решены без подсказок.»; в `CLAUDE.md` «там практика это пакет тренажёра» → «у четырёх практика — пакет тренажёра, у главы об инвариантах — задачи в тексте» | `grep -c algo-runner src/invariants.md` → 0 |
| 36 | `review.md:17–24`, `:31`, `:37` | строка смешанной, третья ячейка → «на карточке — само условие: назови шаблон, нажми «Показать ответ» и только потом оценивай»; две новые строки: «**Сложность (собеседование)** / в режиме собеседования сложность своего решения оценена неверно / назвать сложность по времени и памяти и объяснить, откуда она» и «**Предсказание шага** / в режиме «🎯» виджета исход развилки предсказан неверно / открыть виджет по ссылке и пройти развилку ещё раз»; «растёт всего на 20%» → «растёт на 20 %, но не меньше чем на день»; «1 день, 3, ~8, ~20, ~50» → «1 день, 3, 8, 22, 60» | шапка `assets/srs.js:10–30` (8 видов карточек); лестница — пятью вызовами `schedule()` с «Помню» |
| 37 | `pattern-selection-guide.md:645–646` | «### Sliding Window + Heap» → «### Sliding Window + монотонный дек»; «Поиск максимума/минимума в скользящем окне» → «Максимум/минимум в скользящем окне за `O(n)`: дек хранит кандидатов по убыванию ([разбор](sliding-window.md)); с кучей вышло бы `O(n log k)`» | `sliding-window.md:423–449`; `grep -rn 'sliding-window--heap' src` пуст |

- [ ] **Step 5: проверки.** `scripts/safe-run.sh go -C exercises run ./cmd/checksnippets -src ../src`; `mdbook build`; `node scripts/check-links.js`, `check-challenges.js`, `check-explain.js`, `check-ladder.js`, `check-registries.js`; `scripts/safe-run.sh node scripts/explain-check.js`, `srs-check.js`, `progress-render-check.js`, `review-render-check.js` → всё `✅`.
- [ ] **Step 6: коммит.** `git add` перечисленных файлов — «Главы: ошибки 20–37; „С трудом“ растит интервал не меньше чем на день».

---

### Task 5: Четыре правки виджетов

**Files:** Modify `assets/algo-viz.js` (`:2448–2478`, `:16357`, `:3262`, `:4031`, `:9519`, `:9760`, `:9794`); `assets/algo-viz.css` (после `:1999`); `scripts/predict-check.js`; `scripts/check-viz.js`; `src/heap-structure.md:142–146`, `fast-slow-pointers.md:381–387`, `top-k-elements.md:365–368`; `CLAUDE.md` (`:233`, `:240`, `:323`, абзац «Телефон»).

**Interfaces:** Produces: `root.__algoPredict = { qs, lines, code }` на узле виджета (`qs[k].entered`; `lines[k]` — номер строки шага; `code` — строки листинга) — читает только `predict-check.js`.

- [ ] **Step 1: ключ «🎯» — падающая сверка.** `assets/algo-viz.js`, сразу после `var predQs = predictionQuestions(steps, codeLines);` (`:16357`): `root.__algoPredict = { qs: predQs, lines: steps.map(function (s) { return s.line; }), code: codeLines }; // для scripts/predict-check.js`. В `scripts/predict-check.js` рядом с `pending`:

```js
// Независимый от движка признак «шаг M внутри тела блока строки L» — отступы: тело —
// строки с отступом глубже заголовка. Движок считает по парной скобке; способы обязаны сойтись.
const indentOf = (s) => s.match(/^\s*/)[0].length;
function insideByIndent(code, L, M) {
  if (M <= L) return false;
  for (let j = L + 1; j <= M; j++) if (code[j].trim() !== "" && indentOf(code[j]) <= indentOf(code[L])) return false;
  return true;
}
async function keyMismatches() {
  const tags = [];
  for (const f of fs.readdirSync(path.join(root, "src")).filter((n) => n.endsWith(".md")).sort()) {
    for (const m of fs.readFileSync(path.join(root, "src", f), "utf8").matchAll(/<div class="algo-viz"[^>]*><\/div>/g)) tags.push({ f, tag: m[0] });
  }
  const d = new JSDOM(`<!DOCTYPE html><html><body>${tags.map((t, i) => t.tag.replace("<div ", `<div id="k${i}" `)).join("\n")}<script>${js}</script>${infraScriptTags(root)}</body></html>`, {
    runScripts: "dangerously", virtualConsole: vc, pretendToBeVisual: true, url: "http://localhost:3000/x.html",
    beforeParse(win) {
      Object.defineProperty(win.HTMLElement.prototype, "offsetWidth", { get() { return 40; } });
      Object.defineProperty(win.HTMLElement.prototype, "offsetHeight", { get() { return 40; } });
    },
  });
  const el = (i) => d.window.document.getElementById("k" + i);
  for (let t0 = Date.now(); tags.some((_, i) => !el(i).classList.contains("algo-viz--ready")) && Date.now() - t0 < 60000;) await new Promise((r) => setTimeout(r, 200));
  const bad = []; let asked = 0, widgets = 0;
  tags.forEach((t, i) => {
    const p = el(i).__algoPredict, type = t.tag.match(/data-viz="([^"]+)"/)[1];
    if (!p) { bad.push(`${t.f}: ${type} — движок не отдал __algoPredict`); return; }
    const ks = Object.keys(p.qs);
    if (ks.length) widgets++;
    for (const k of ks) {
      asked++;
      const q = p.qs[k], truth = insideByIndent(p.code, q.line, p.lines[+k + 1]);
      if (q.entered !== truth) bad.push(`${t.f}: ${type}, шаг ${+k + 1}, строка ${q.line + 1} «${p.code[q.line].trim()}» — ключ «${q.entered ? "да" : "нет"}», а следующий шаг (строка ${p.lines[+k + 1] + 1}) ${truth ? "внутри" : "вне"} тела`);
    }
  });
  d.window.close();
  return { bad, asked, widgets };
}
```

В начале главного `setTimeout`: `const keys = await keyMismatches(); keys.bad.forEach((b) => fails.push("ключ: " + b));`; в итоговую строку — `ключи ${keys.asked} вопросов у ${keys.widgets} виджетов сверены по отступам`. Пункт 4 (`:107`): `const entered = insideByIndent(el.__algoPredict.code, qLine, activeLine(el));`; в комментариях `:13–14`, `:101` — «в тело блока» вместо «строка L+1». Run: `SAFE_SECS=300 scripts/safe-run.sh node scripts/predict-check.js`. Expected: `❌`, 8 строк «ключ: …» в 6 типах — `num-provinces` ×3, `three-sum-naive`, `move-zeroes`, `search-range-naive`, `combination-sum`, `jump-game-dp` (`N/viz_live.md:353–361`; аудит смотрел только ядро — у виджетов вне ядра могут найтись ещё). Фактический список — в отчёт до правки.

- [ ] **Step 2: ключ — правка.** `assets/algo-viz.js`, перед `predictionQuestions`:

```js
  // Конец блока, открытого строкой L: номер строки с парной «}» (-1 — не нашли).
  // Скобки в строках, рунах и комментариях не считаются.
  function blockEnd(code, L) {
    var depth = 1;
    for (var j = L + 1; j < code.length; j++) {
      var t = String(code[j]).replace(/"(?:[^"\\]|\\.)*"/g, "").replace(/'(?:[^'\\]|\\.)*'/g, "").replace(/`[^`]*`/g, "").replace(/\/\/.*$/, "");
      for (var i = 0; i < t.length; i++) {
        if (t[i] === "{") depth++;
        else if (t[i] === "}" && --depth === 0) return j;
      }
    }
    return -1;
  }
```

В `predictionQuestions` вместо `var entered = M === L + 1;`:

```js
      // «Вошли в тело» — следующий шаг внутри блока строки L. Раньше считалось по L+1, и
      // генератор, пропустивший первую строку тела, превращал верное «Да» в промах.
      var E = blockEnd(code, L);
      var entered = E < 0 ? M === L + 1 : (M > L && M < E);
```

Комментарий над `branchOf` (`:2452`) — «попал ли шаг k+1 в тело блока (между строкой L и парной скобкой)». Run → `✅`. Осталось расхождение — это листинг с неровным отступом (поправить листинг) или случай вне правила (в отчёт; проверку не подгонять). Мутация: вернуть `M === L + 1` → снова 8 строк.

- [ ] **Step 3: рёбра BST — падающий линт.** В `scripts/check-viz.js` перед `if (errors.length)` (и пункт 7 в шапку файла):

```js
// (7) SVG рёбер дерева рисуется в пикселях узлов. Узлы стоят в px от края хоста, а SVG без
// width/height растягивался на ширину СЖАТОГО хоста (max-width: 100%) — на телефоне рёбра
// трёх виджетов BST отрывались от узлов на десятки пикселей.
js.split("\n").forEach((line, i) => {
  if (/"algo-tp__bstsvg"/.test(line) && !(/setAttribute\("width", W\)/.test(line) && /setAttribute\("height", H\)/.test(line))) {
    errors.push(`assets/algo-viz.js:${i + 1}: SVG рёбер (algo-tp__bstsvg) без width/height в пикселях`);
  }
});
```

Run: `node scripts/check-viz.js` → `❌`, 5 строк (`:3262`, `:4031`, `:9519`, `:9760`, `:9794`).

- [ ] **Step 4: рёбра — правка.** В каждой из пяти строк после `svg.setAttribute("viewBox", …);` — `svg.setAttribute("width", W); svg.setAttribute("height", H);` (образец — `:5826`). Run → `✅`. Живая проверка: `mdbook build`, Playwright 390×844, `file://<рабочая копия>/book/bst-structure.html`: у `bst-search`, `bst-insert`, `bst-delete` каждый конец каждого ребра не дальше 20 px от центра ближайшего узла (было до 83 px; `getBoundingClientRect` линий и узлов); на 1280 px — как раньше (19 px). Числа — в отчёт.

- [ ] **Step 5: три примера.** (а) `src/heap-structure.md:146`: `data-heap="1,3,5,7,4,6" data-val="2"`; абзац «💡 Демонстрация вставки» (`:142–144`) → «В кучу `[1,3,5,7,4,6]` добавляем `2`. Новый лист встаёт в конец (индекс 6), его родитель — индекс 2, там `5`: `5 <= 2` ложно — обмен. Новый родитель — корень `1`: `1 <= 2` истинно — стоп. `2` остановилась посреди дерева: всплытие идёт не до корня, а до первого родителя, который не больше. Подставь `0` — всплывёт до самого корня.» (б) `src/fast-slow-pointers.md:387` — две вкладки (порядок атрибутов как в `two-pointers.md:103–106`):

```html
<div class="algo-viz-tabs">
<div class="algo-viz" data-tab="Пример из условия" data-viz="list-cycle-entry" data-list="3,2,0,-4" data-cycle="1"></div>
<div class="algo-viz" data-tab="Длинный хвост" data-viz="list-cycle-entry" data-list="1,2,3,4,5,6,7,8,9,10" data-cycle="3"></div>
</div>
```

в абзаце выше «в «Граничных случаях» есть «длинный хвост»» → «во вкладке «Длинный хвост»». (в) `src/top-k-elements.md:368` — вкладки «Пример из условия» (прежние атрибуты) и «Новичок вытесняет старого» (`data-array="1,2,2,3,3,3,4,4,4,4" data-k="2"`); к абзацу выше — «Во второй вкладке частоты растут, и каждая новая пара вытесняет старую: порог поднимается 1 → 2 → 3.» Пройти до конца в Playwright: у `heap-push` один обмен и остановка на `1 <= 2`; у «Длинного хвоста» в фазе 2 три шага, `a = 3, b = 4, L = 7`; у второй вкладки Top-K два вытеснения — `(1,1)` и `(2,2)`, итог `{3, 4}`. Движок показал иное — править текст по движку и записать в отчёт.

- [ ] **Step 6: управление на телефоне.** Заметка предлагает одну вставку CSS по образцу полноэкранного режима, но `position: sticky` отсчитывает низ от ближайшего предка-прокрутки, а у mdBook это `.content` (`overflow-y: auto` без высоты — `book/css/general-*.css`): сам он не прокручивается, и прилипание в нём не сработает. Поэтому вставок две. Замер «до» (Playwright 390×844, `recursion.html`, `hanoi`: верх холста у верха окна → низ ряда `.algo-tp__ctrl` ниже 844). В `assets/algo-viz.css` после блока `@container algo-tp (max-width: 520px)` (`:1985–1999`):

```css
/* Телефон: у 16 виджетов ядра холст выше экрана, и «›» уезжала под сгиб — каждый шаг
   требовал прокрутки между кнопкой и рисунком. Управление прилипает к низу окна, пока
   виджет на экране (в полноэкранном режиме так было всегда). */
@container algo-tp (max-width: 520px) {
  .algo-tp--compact:not(.algo-tp--fs) > .algo-tp__ctrl { position: sticky; bottom: 0; z-index: 5; box-shadow: 0 -8px 16px -6px rgba(0, 0, 0, 0.55); }
}
/* sticky отсчитывает низ от ближайшего предка-прокрутки, а у mdBook это .content
   (overflow-y: auto без высоты). На узком экране снимаем у него прокрутку; flow-root
   оставляет тот же контекст форматирования, что давал overflow. */
@media (max-width: 620px) { .content { overflow: visible; display: flow-root; } }
```

Замер «после» на `recursion.html` (`hanoi`), `hash-table-structure.html` (`hash-resize`), `modified-binary-search.html`: пока холст на экране, низ ряда управления ≤ 844; при прокрутке к листингу ряд уходит вместе с виджетом; `document.documentElement.scrollWidth <= innerWidth` на них и на `postgres-plans.html`; боковое меню открывается; на 1280 px — без изменений. Не выполняется хоть одно — обе вставки убрать и написать в отчёте «не сделано: причина»; `!important` и JS не добавлять.

- [ ] **Step 7: документы и проверки.** `CLAUDE.md`: `:233` — «попал ли следующий шаг в тело блока (между строкой и парной скобкой; по `L+1` верное «Да» становилось промахом у генераторов, пропускающих первую строку тела)»; `:240` — «ключи всех виджетов книги сверяются с отступами листинга»; `:323` — новое время `predict-check` (замерить); абзац «Телефон» — прилипание и причина правки `.content`; рядом с «Рисунки деревьев» — фраза про `width`/`height` у SVG рёбер. Run: `node scripts/check-viz.js`, `check-registries.js`, `check-links.js` (после `mdbook build`); `scripts/safe-run.sh node scripts/predict-check.js`, `keys-check.js`, `infra-viz-check.js` → `✅`; `SAFE_SECS=900 scripts/safe-run.sh node scripts/check-viz-names.js` → `✅` (≈8 мин, в фоне).
- [ ] **Step 8: коммит.** `git add assets/algo-viz.js assets/algo-viz.css scripts/predict-check.js scripts/check-viz.js src/heap-structure.md src/fast-slow-pointers.md src/top-k-elements.md CLAUDE.md` — «Виджеты: ключ 🎯 по телу блока, рёбра BST на узком экране, три примера, управление на телефоне».

---

### Task 6: Тесты и заготовки

**Files:**
- Rename: 67 файлов `exercises/*/*_rand_test.go` → `*_zrand_test.go`
- Create: `exercises/treedfs/treefmt_test.go`, `exercises/treebfs/treefmt_test.go`
- Modify: тесты `toposort`, `graphs`, `binarysearch`, `twopointers`, `treedfs`, `treebfs`; заготовки `toposort.go:27–28`, `graphs.go:23–24`, `bigo.go:51–63`, `greedy.go:49–51`, `twopointers.go:49–59`, `topk.go:14`, `sorting.go:67` и шапки восьми заготовок; `scripts/check-registries.js`; `assets/problems.js` (генерируется); `CLAUDE.md:640`, `:731`; `exercises/README.md:83`; `src/miniredis.md:740`; `exercises/miniredis/resp_fuzz_test.go:11`

**Interfaces:** Produces: имя файла случайных тестов `<pkg>_zrand_test.go`; `treeString(root *TreeNode) string` (тестовый помощник в двух пакетах); обновлённый `assets/problems.js`. Сигнатуры функций пакетов не меняются.

- [ ] **Step 1: переименование (отдельный коммит).** `go test` исполняет тесты в порядке файлов, а `<pkg>_rand_test.go` по алфавиту раньше `<pkg>_test.go`: нетронутая заготовка `slidingwindow` первой требовала `MaxSlidingWindow` — пятую и самую трудную функцию. Сначала страж в `scripts/check-registries.js` (перед итоговым выводом; пункт 6 в шапку):

```js
// ---------- 6. случайные тесты идут после табличных ----------
// go test исполняет тесты в порядке файлов: «_rand_test.go» шёл раньше «_test.go», и первым
// падал тест самой трудной функции пакета. Имя «_zrand_test.go» сортируется после.
for (const pkg of fs.readdirSync(exDir)) {
  const dir = path.join(exDir, pkg);
  if (pkg === "cmd" || !fs.statSync(dir).isDirectory()) continue;
  for (const f of fs.readdirSync(dir)) {
    if (f.endsWith("_rand_test.go")) errors.push(`exercises/${pkg}/${f}: случайные тесты называются <пакет>_zrand_test.go — иначе они исполняются раньше табличных`);
  }
}
```

Run: `node scripts/check-registries.js` → `❌`, 67 строк. Затем `for f in exercises/*/*_rand_test.go; do git mv "$f" "${f%_rand_test.go}_zrand_test.go"; done`; в `CLAUDE.md:640`, `:731`, `exercises/README.md:83`, `src/miniredis.md:740`, `exercises/miniredis/resp_fuzz_test.go:11` — `_rand_test.go` → `_zrand_test.go`; в `README.md:83` дописать «(буква `z` — чтобы файл шёл после табличного: `go test` исполняет тесты в порядке файлов, и первое падение должно быть на именованном случае)». Run: `node scripts/check-registries.js` → `✅`; `scripts/safe-run.sh go -C exercises test -count=1 ./slidingwindow/ 2>&1 | grep -m1 -- '--- FAIL'` → `--- FAIL: TestMaxSumSubarray`; `scripts/safe-run.sh go -C exercises vet ./...` → без вывода. Коммит: `git add -u exercises && git add scripts/check-registries.js CLAUDE.md exercises/README.md src/miniredis.md` (здесь `-u` допустим: в каталоге только переименования и одна правка комментария — сверить `git status --short`) — «Тренажёр: случайные тесты идут после табличных (_zrand_test.go)».

- [ ] **Step 2: «цикл с хвостом» в `toposort` (мутант TS1).** Чистый цикл не ловит пропущенную проверку: вершин с нулевой степенью входа нет, и Кан сам возвращает пустой ответ. В `toposort_test.go`:

```go
// TestTopologicalSort — после «цикл из трёх»:
		{"хвост перед циклом", 3, [][]int{{1, 0}, {2, 1}, {1, 2}}, true},
		{"изолированная вершина рядом с циклом", 3, [][]int{{1, 0}, {0, 1}}, true},
// TestFindOrderLexSmallest — после «цикл из трёх»:
		{"хвост перед циклом", 3, [][]int{{1, 0}, {2, 1}, {1, 2}}, []int{}},
		{"после вершины открылись сразу три — берём меньшую", 5, [][]int{{3, 2}, {0, 4}, {3, 4}, {1, 4}}, []int{2, 4, 0, 1, 3}},
// TestAlienOrder — после «противоречие z-x-z»:
		{"цикл с хвостом", []string{"x", "a", "b", "a"}, "", false},
```

Run: `scripts/safe-run.sh go -C exercises test -tags solution -count=1 ./toposort/` → `ok`. Доказательство мутацией (три раза: правка, прогон, `git checkout -- exercises/toposort/toposort_solution.go`): заменить на `if false {` (1) первое `if len(result) != numCourses {` → `--- FAIL: TestTopologicalSort/хвост_перед_циклом`, текст `= [0], ожидался пустой срез (цикл)`; (2) второе → `TestFindOrderLexSmallest/хвост_перед_циклом`; (3) `if len(result) != len(inDegree) {` → `TestAlienOrder/цикл_с_хвостом`, `= "x"`. Строки `FAIL` — в отчёт: это и есть «TS1 убит».

- [ ] **Step 3: порядок соседей и именованные случаи.** `graphs_test.go`:

```go
// TestCountComponents:
		{"ребро записано от большей вершины к меньшей", 5, [][]int{{0, 1}, {1, 2}, {4, 1}}, 2},
// TestHasCycleUndirected:
		{"цикл замыкает последнее ребро, концы в разных поддеревьях", 4, [][]int{{1, 3}, {2, 0}, {1, 0}, {3, 2}}, true},
// TestBFSOrder и TestDFSOrder — в обе таблицы:
		{"рёбра в обратном порядке — соседей всё равно по возрастанию", 4, [][]int{{0, 3}, {0, 2}, {0, 1}}, 0, []int{0, 1, 2, 3}},
```

`binarysearch_test.go`, `TestSearchRotated`: `{"два элемента, цель справа от поворота", []int{32, 31}, 31, 1},`. `twopointers_test.go`: `TestPairWithTargetSum` — `{"один элемент дважды брать нельзя", []int{1, 3, 4}, 6, []int{-1, -1}},`; `TestDutchFlagSort` — `{"после обмена с high пришёл ноль", []int{1, 2, 0}, []int{0, 1, 2}},`. Run: `scripts/safe-run.sh go -C exercises test -tags solution -count=1 ./graphs/ ./binarysearch/ ./twopointers/` → `ok`. Мутация порядка: в `graphs_solution.go` `sort.Ints(adj[i])` → `_ = i` → падают `TestBFSOrder/рёбра_в_обратном_порядке…` (`= [0 3 2 1]`) и `TestDFSOrder/…`; `git checkout`. Мутанты GR1, GR2, BS3, TP1, TP3 — в `N/mutation_results.txt`, повторять не обязательно. Мутант GR3 (BFS без `visited`) НЕ запускать.

- [ ] **Step 4: `nil` против пустого среза.** Увидеть дефект: в `twopointers_solution.go` `var res [][]int` → `res := [][]int{}`; Run `scripts/safe-run.sh go -C exercises test -tags solution -count=1 -run 'TestTripletsSumToZero$' ./twopointers/` → `FAIL` с неотличимым от успеха `TripletsSumToZero([1 2 3]) = [], ожидалось []`. Правка `twopointers_test.go`: в `TestTripletsSumToZero` `!reflect.DeepEqual(got, tt.want)` → `!equalTriples(got, tt.want)` (помощник из `twopointers_zrand_test.go` сравнивает по длине и элементам), комментарий «nil и пустой срез равны: задача не про это». В док-комментарий `TripletsSumToZero` (`twopointers.go`) перед «Пример:» — абзац «Если троек нет — пустой результат (nil или пустой срез: тест их не различает).» Run с мутантом → `ok`; `git checkout -- exercises/twopointers/twopointers_solution.go`; Run → `ok`.

- [ ] **Step 5: вход в сообщениях.** `exercises/treedfs/treefmt_test.go` (и такой же с `package treebfs`):

```go
package treedfs

import (
	"strconv"
	"strings"
	"testing"
)

// treeString печатает дерево по уровням, как в условиях LeetCode: [1,2,3,null,4].
// Нужна сообщениям тестов: «MaxDepth = 3, want 4» без самого дерева не воспроизвести.
func treeString(root *TreeNode) string {
	var parts []string
	queue := []*TreeNode{root}
	for len(queue) > 0 {
		n := queue[0]
		queue = queue[1:]
		if n == nil {
			parts = append(parts, "null")
			continue
		}
		parts = append(parts, strconv.Itoa(n.Val))
		queue = append(queue, n.Left, n.Right)
	}
	for len(parts) > 0 && parts[len(parts)-1] == "null" {
		parts = parts[:len(parts)-1]
	}
	return "[" + strings.Join(parts, ",") + "]"
}

func TestTreeString(t *testing.T) {
	gap := &TreeNode{Val: 1, Right: &TreeNode{Val: 2, Left: &TreeNode{Val: 3}}}
	for want, root := range map[string]*TreeNode{"[]": nil, "[7]": {Val: 7}, "[1,null,2,3]": gap} {
		if got := treeString(root); got != want {
			t.Errorf("treeString = %s, ожидалось %s", got, want)
		}
	}
}
```

Порядок: сначала только `TestTreeString` → Run → `undefined: treeString` → функция → `ok`. Затем дерево — первым аргументом во всех сообщениях без входа: `treedfs_test.go:35`, `:54`, `:73`, `:117`, `:140`, `:168` и `treebfs_test.go:35`, `:72`, `:94`, `:113`, `:135` — вида `"MaxDepth(%s) = %v, ожидалось %v", treeString(tt.root), got, tt.want`; `treedfs_zrand_test.go:102`, `:105`, `:108`, `:141`, `:178`, `:242` и `treebfs_zrand_test.go:76`, `:94`, `:109`, `:121`, `:130`, `:161` — вида `"MaxDepth(%s) = %d, want %d", treeString(root), got, want`. Функции «на месте»: в `TestDutchFlagSortRandom` перед вызовом `orig := append([]int{}, arr...)`, сообщение `"DutchFlagSort(%v) → %v, want %v", orig, arr, want`; так же в `twopointers_test.go` у `TestDutchFlagSort` и `TestRemoveDuplicates` (`"RemoveDuplicates(%v) вернул длину %d, ожидалось %d"`). Run: `scripts/safe-run.sh go -C exercises test -tags solution -count=1 ./treedfs/ ./treebfs/ ./twopointers/` → `ok`; `scripts/safe-run.sh go -C exercises vet ./treedfs/ ./treebfs/ ./twopointers/` → без вывода (глаголы и аргументы сходятся).

- [ ] **Step 6: условия и подсказки заготовок.** Предложение, называющее приём, уходит в отдельный абзац «Подсказка:» после примера: `cmd/problembank` кладёт его в поле `h`, которое смешанная тренировка показывает после ответа. Условие остаётся не короче 120 символов (`minStatement`).
  - `bigo.go:51–53`: из первого абзаца убрать «Монотонный стек даёт амортизированно O(n): каждый индекс кладётся и снимается ровно один раз.» → «Подсказка: монотонный стек даёт амортизированно O(n): …».
  - `bigo.go:62–63`: убрать «Тот же монотонный стек, амортизированно O(n).» → «Подсказка: тот же монотонный стек, амортизированно O(n).»
  - `graphs.go:23–24`: убрать «Удобно решать через Union-Find: если оба конца ребра уже в одном множестве — ребро замыкает цикл.» → «Подсказка: удобно решать через Union-Find: …».
  - `greedy.go:49–51`: первый абзац кончается на «(в каждый момент в руках не больше одной акции).»; «Подсказка: ответ — сумма всех положительных приростов цены между соседними днями.»
  - `toposort.go:27–28`: первый абзац — «CanFinish сообщает, можно ли пройти все курсы. Каждый элемент prerequisites[i] = [a, b] означает, что курс b нужно пройти ПЕРЕД курсом a.»; «Подсказка: это вопрос, существует ли топологический порядок, то есть нет ли в графе зависимостей цикла.»
  - `topk.go:14`: «(пустой непустой срез)» → «(пустой срез, не nil)». `sorting.go:67`: «k-й по величине наименьший элемент» → «k-й по возрастанию элемент».
  - `twopointers.go:58–59`, `// TODO:`: «пропуская дубликаты и i, и left/right» → «пропуская дубликаты i, а после найденной тройки — дубликаты left (одной стороны достаточно: для пары (i, left) правое значение единственно)».
  - Шапки `slidingwindow.go`, `recursion.go`, `bigo.go`, `cryptography.go`, `combinatorics.go`, `sampling.go`, `numbertheory.go`, `sorting.go`: «Чтобы посмотреть эталонное решение:» → «Эталон лежит в <пакет>_solution.go; убедиться, что он проходит те же тесты:» (команда гоняет тесты, а не показывает решение).

- [ ] **Step 7: банк и проверки.** Run: `scripts/safe-run.sh go -C exercises run ./cmd/problembank` (перезаписывает `assets/problems.js`), затем `… run ./cmd/problembank -check` → без ошибок. `git diff assets/problems.js`: меняются только записи функций из Step 4 и Step 6; `grep -c '{ p:' assets/problems.js` до и после одинаков; у `bigo.NextGreaterElement` в поле `s` нет слова «стек». `gofmt -l exercises` → пусто; `scripts/safe-run.sh go -C exercises vet -tags solution ./...` и без тега → без вывода; `SAFE_SECS=300 scripts/safe-run.sh go -C exercises test -tags solution -count=1 ./toposort/ ./graphs/ ./binarysearch/ ./twopointers/ ./treedfs/ ./treebfs/ ./bigo/ ./greedy/ ./topk/ ./sorting/ ./cmd/problembank/` → `ok`; заготовки по-прежнему красные: `scripts/safe-run.sh go -C exercises test -count=1 ./toposort/` → `FAIL` (panic TODO); `node scripts/check-registries.js`; `mdbook build` и `scripts/safe-run.sh node scripts/mixed-check.js` → `✅`.

- [ ] **Step 8: коммит.** `git add exercises/toposort exercises/graphs exercises/binarysearch exercises/twopointers exercises/treedfs exercises/treebfs exercises/bigo exercises/greedy exercises/topk exercises/sorting exercises/slidingwindow exercises/recursion exercises/cryptography exercises/combinatorics exercises/sampling exercises/numbertheory assets/problems.js` — «Тренажёр: цикл с хвостом, порядок соседей, именованные случаи, вход в сообщениях, условия без названия приёма».
