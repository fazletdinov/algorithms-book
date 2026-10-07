//go:build unix

package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net"
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
	if err != nil {
		// Зомби собрали между kill и чтением — тогда процесса уже нет; либо /proc
		// нет вовсе (macOS) — тогда он жив. Различает повторный kill.
		return syscall.Kill(pid, 0) != nil
	}
	i := bytes.LastIndexByte(b, ')')
	return i >= 0 && i+2 < len(b) && b[i+2] == 'Z'
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

// Печать в бесконечном цикле: потолок вывода достигнут за миллисекунды, и ждать
// после него нечего — прогон останавливается сразу, а не по сроку теста. Раньше
// `go test` все эти секунды ещё и копил вывод теста у себя в памяти, без потолка
// (cmd/go: streamAndCacheOutput). Поэтому «цикл» здесь — 1 МиБ печати (в 16 раз
// больше потолка этого прогона) и сон на 25 с: без остановки тест красный по
// времени, но память не растёт. Печатает либо сам тест, либо его подтест — так
// устроены табличные тесты тренажёра, и потолок обязан держать оба случая.
func TestRunGoTestCapsOutput(t *testing.T) {
	const flood = "\tfor i := 0; i < 10000; i++ {\n\t\tfmt.Println(strings.Repeat(\"x\", 100))\n\t}\n\ttime.Sleep(25 * time.Second)\n"
	for name, body := range map[string]string{
		"печатает тест":    flood,
		"печатает подтест": "\tt.Run(\"случай\", func(t *testing.T) {\n" + flood + "\t})\n",
	} {
		t.Run(name, func(t *testing.T) {
			dir := writeModule(t, map[string]string{"flood/flood_test.go": "package flood\n\nimport (\n\t\"fmt\"\n\t\"strings\"\n\t\"testing\"\n\t\"time\"\n)\n\n" +
				"func TestQuick(t *testing.T) {}\n\nfunc TestFlood(t *testing.T) {\n" + body + "}\n"})
			lim := runLimits{TestTimeout: time.Minute, Deadline: 2 * time.Minute, MaxOutput: 64 << 10}
			args, _ := testArgs("flood", false, nil, lim.TestTimeout)
			sysTmp := t.TempDir()
			t.Setenv("TMPDIR", sysTmp) // сюда `go` положил бы рабочий каталог go-build…, не будь у прогона своего
			start := time.Now()
			res := runGoTest(context.Background(), dir, args, lim)
			if took := time.Since(start); took > 10*time.Second {
				t.Errorf("ответ пришёл через %s: прогон не остановлен на потолке вывода", took.Round(time.Millisecond))
			}
			// Убитый `go` свой рабочий каталог не убирает (в нём собранный тестовый бинарник —
			// мегабайты): он обязан лежать в копии модуля и исчезать вместе с ней, а не
			// копиться в системном каталоге с каждой такой остановкой.
			if left, _ := filepath.Glob(filepath.Join(sysTmp, "go-build*")); len(left) != 0 {
				t.Errorf("в системном временном каталоге остался рабочий каталог убитого go: %q", left)
			}
			kept := len(res.Output)
			for _, te := range res.Tests {
				kept += len(te.Output)
			}
			if !res.Truncated || res.OK || kept > lim.MaxOutput || !strings.Contains(res.Reason, "обрезан") {
				t.Fatalf("truncated=%v ok=%v сохранено %d байт, reason=%q", res.Truncated, res.OK, kept, res.Reason)
			}
			// напечатанное до потолка читателю показывается: в потоке событий на него приходится
			// меньше половины байт, остальное — обёртка JSON
			if kept < lim.MaxOutput/4 {
				t.Errorf("до ответа дошло %d байт вывода из %d до потолка: печать потеряна", kept, lim.MaxOutput)
			}
			// потолок режет поток посреди события — обрывок JSON читателю показывать незачем
			if strings.Contains(res.Output, `"Action"`) {
				t.Errorf("в выводе остался обрывок события go test -json: %.160q", res.Output)
			}
			// остановка по выводу — не срок и не память; тест, прошедший до неё, остаётся зелёным
			if res.Timeout || res.MemLimit || res.Passed != 1 || res.Failed != 1 {
				t.Errorf("timeout=%v memLimit=%v passed=%d failed=%d", res.Timeout, res.MemLimit, res.Passed, res.Failed)
			}
		})
	}
}

// brokenSystemdRun оставляет в PATH `go` и подставной systemd-run, который ведёт
// себя как настоящий без пользовательской шины (текст и код выхода сняты с
// systemd 255): область не создана, команда под ним не запущена.
func brokenSystemdRun(t *testing.T) {
	t.Helper()
	goOnlyPath(t) // после него PATH — один каталог
	script := "#!/bin/sh\necho 'Failed to connect to bus: No such file or directory' >&2\nexit 1\n"
	if err := os.WriteFile(filepath.Join(os.Getenv("PATH"), "systemd-run"), []byte(script), 0o755); err != nil {
		t.Fatal(err)
	}
}

// Ограничитель памяти стоит перед `go` и запустился, но область не создал: `go`
// не стартовал, событий нет. Раньше текст systemd шёл под заголовком «Ошибка компиляции».
func TestRunGoTestReportsLimiterFailure(t *testing.T) {
	dir := writeModule(t, map[string]string{"ok/ok_test.go": "package ok\n\nimport \"testing\"\n\nfunc TestOne(t *testing.T) {}\n"})
	brokenSystemdRun(t)
	lim := runLimits{TestTimeout: time.Minute, Deadline: 2 * time.Minute, MaxOutput: maxRunOutput, Mem: memLimiter{Mode: memCgroup, Bytes: 1 << 30}}
	args, _ := testArgs("ok", false, nil, lim.TestTimeout)
	res := runGoTest(context.Background(), dir, args, lim)
	want := "прогон не запустился: Failed to connect to bus: No such file or directory"
	if res.Reason != want || res.OK || res.Build || res.Timeout || res.MemLimit || res.NoTests {
		t.Fatalf("reason=%q ok=%v build=%v timeout=%v memLimit=%v noTests=%v output=%q",
			res.Reason, res.OK, res.Build, res.Timeout, res.MemLimit, res.NoTests, res.Output)
	}
}

// То же для трассы: харнесс собрался, а под ограничителем не запустился. Раньше
// текст systemd шёл как «Паника во время выполнения».
func TestTraceReportsLimiterFailure(t *testing.T) {
	dir := writeModule(t, map[string]string{"tracecmd/main.go": "package main\n\nfunc main() {}\n"})
	brokenSystemdRun(t)
	lim := runLimits{Deadline: time.Minute, BuildTimeout: time.Minute, MaxOutput: maxRunOutput, Mem: memLimiter{Mode: memCgroup, Bytes: 1 << 30}}
	resp := runTraceHarness(context.Background(), dir, "F", "p.F()", lim)
	want := "трасса не запустилась: Failed to connect to bus: No such file or directory"
	if resp.Reason != want || !resp.Build || resp.OK || resp.Panic || resp.Timeout || resp.MemLimit {
		t.Fatalf("reason=%q build=%v ok=%v panic=%v timeout=%v memLimit=%v message=%q",
			resp.Reason, resp.Build, resp.OK, resp.Panic, resp.Timeout, resp.MemLimit, resp.Message)
	}
}

// handleTraceJSON прогоняет настоящий /api/trace на крошечном модуле: инструментация,
// харнесс из шаблона, сборка, запуск.
func handleTraceJSON(t *testing.T, srv *server, code string) string {
	t.Helper()
	old := moduleRoot
	t.Cleanup(func() { moduleRoot = old })
	// харнесс импортирует пакет читателя по настоящему пути модуля
	moduleRoot = writeModule(t, map[string]string{"go.mod": "module " + moduleImportPath + "\n\ngo 1.24\n", "dp/dp.go": code})
	body, err := json.Marshal(map[string]string{"pkg": "dp", "code": code, "func": "ClimbStairs", "call": "ClimbStairs(3)"})
	if err != nil {
		t.Fatal(err)
	}
	rec := httptest.NewRecorder()
	srv.handleTrace(rec, httptest.NewRequest(http.MethodPost, "/api/trace", bytes.NewReader(body)))
	return rec.Body.String()
}

// «Не запустилась» — только когда харнесс не дошёл до main. Код читателя, который
// завершил процесс сам, не паникуя, — по-прежнему сбой во время выполнения: первой
// строкой main харнесс сообщает, что стартовал.
func TestHandleTraceTellsCrashFromLaunchFailure(t *testing.T) {
	const loop = "package dp\n\nimport (\n\t\"fmt\"\n\t\"os\"\n)\n\nfunc ClimbStairs(n int) int {\n\tways := 0\n\tfor i := 0; i < n; i++ {\n\t\tways += i\n%s\t}\n\treturn ways\n}\n\nvar _, _ = fmt.Sprint, os.Exit\n"
	srv := newServer(memLimiter{Mode: memNone})
	if got := handleTraceJSON(t, srv, fmt.Sprintf(loop, "")); !strings.Contains(got, `"ok":true`) || !strings.Contains(got, `"result":"3"`) {
		t.Fatalf("обычная трасса не построилась:\n%.600s", got)
	}
	crash := fmt.Sprintf(loop, "\t\tif i == 1 {\n\t\t\tfmt.Fprintln(os.Stderr, \"fatal: решение вышло само\")\n\t\t\tos.Exit(3)\n\t\t}\n")
	got := handleTraceJSON(t, srv, crash)
	for _, want := range []string{`"panic":true`, `"message":"fatal: решение вышло само"`, `"build":true`} {
		if !strings.Contains(got, want) {
			t.Errorf("в ответе нет %s:\n%.600s", want, got)
		}
	}
	if strings.Contains(got, "не запустилась") {
		t.Errorf("сбой в коде читателя назван «трасса не запустилась»:\n%.600s", got)
	}
}

// Сквозной случай «фильтр не совпал ни с одним тестом»: пакет собрался, запускать
// нечего. Закрепляет поле noTests, которое читает runner.js.
func TestHandleRunFilterMatchesNothing(t *testing.T) {
	old := moduleRoot
	t.Cleanup(func() { moduleRoot = old })
	moduleRoot = writeModule(t, map[string]string{
		"spin/spin.go":      "package spin\n\nfunc Spin() int { panic(\"TODO\") }\n",
		"spin/spin_test.go": "package spin\n\nimport \"testing\"\n\nfunc TestSpin(t *testing.T) { Spin() }\n",
	})
	body := `{"pkg":"spin","code":"package spin\n\nfunc Spin() int { return 1 }\n","tests":["TestNope","TestZzz"]}`
	rec := httptest.NewRecorder()
	newServer(memLimiter{Mode: memNone}).handleRun(rec, httptest.NewRequest(http.MethodPost, "/api/run", strings.NewReader(body)))
	for _, want := range []string{`"ok":false`, `"build":true`, `"noTests":true`, `"filtered":true`, `"passed":0`, `"failed":0`,
		`"reason":"ни один тест не запустился — в пакете нет тестов с такими именами: TestNope, TestZzz"`} {
		if !strings.Contains(rec.Body.String(), want) {
			t.Errorf("в ответе нет %s:\n%.600s", want, rec.Body.String())
		}
	}
}

// Сквозной случай «неверное решение, табличный тест» — самый частый красный прогон
// в книге. Сообщение упавшего случая обязано дойти до ответа в выводе своего теста;
// счёт и имена остаются по тестам верхнего уровня — на них стоят фильтр tests и
// карточки повторений.
func TestHandleRunShowsFailedCaseMessage(t *testing.T) {
	old := moduleRoot
	t.Cleanup(func() { moduleRoot = old })
	moduleRoot = writeModule(t, map[string]string{
		"twice/twice.go": "package twice\n\nfunc Twice(x int) int { panic(\"TODO\") }\n",
		"twice/twice_test.go": "package twice\n\nimport \"testing\"\n\nfunc TestQuick(t *testing.T) {}\n\nfunc TestTwice(t *testing.T) {\n" +
			"\tfor _, tt := range []struct {\n\t\tname    string\n\t\tx, want int\n\t}{{\"один\", 1, 2}, {\"два\", 2, 4}, {\"три\", 3, 6}} {\n" +
			"\t\tt.Run(tt.name, func(t *testing.T) {\n\t\t\tif got := Twice(tt.x); got != tt.want {\n" +
			"\t\t\t\tt.Errorf(\"Twice(%d) = %d, ожидалось %d\", tt.x, got, tt.want)\n\t\t\t}\n\t\t})\n\t}\n}\n",
	})
	const message = "twice_test.go:14: Twice(2) = 5, ожидалось 4"
	code, err := json.Marshal("package twice\n\nfunc Twice(x int) int {\n\tif x == 2 {\n\t\treturn 5\n\t}\n\treturn 2 * x\n}\n")
	if err != nil {
		t.Fatal(err)
	}
	for _, tt := range []struct {
		name, filter   string
		passed, failed int
		tests          []string
	}{
		{"весь пакет", "", 1, 1, []string{"TestQuick", "TestTwice"}},
		{"фильтр по имени теста гонит все его случаи", `,"tests":["TestTwice"]`, 0, 1, []string{"TestTwice"}},
	} {
		t.Run(tt.name, func(t *testing.T) {
			rec := httptest.NewRecorder()
			body := `{"pkg":"twice","code":` + string(code) + tt.filter + `}`
			newServer(memLimiter{Mode: memNone}).handleRun(rec, httptest.NewRequest(http.MethodPost, "/api/run", strings.NewReader(body)))
			var res struct {
				Passed, Failed int
				Tests          []struct {
					Name   string
					Pass   bool
					Output string
				}
			}
			if err := json.Unmarshal(rec.Body.Bytes(), &res); err != nil {
				t.Fatalf("%v:\n%.600s", err, rec.Body.String())
			}
			var names []string
			failedOutput := ""
			for _, te := range res.Tests {
				names = append(names, te.Name)
				if te.Name == "TestTwice" {
					failedOutput = te.Output
				}
			}
			if res.Passed != tt.passed || res.Failed != tt.failed || strings.Join(names, " ") != strings.Join(tt.tests, " ") {
				t.Errorf("passed=%d failed=%d tests=%q — ожидалось %d/%d и %q", res.Passed, res.Failed, names, tt.passed, tt.failed, tt.tests)
			}
			if !strings.Contains(failedOutput, message) || !strings.Contains(failedOutput, "--- FAIL: TestTwice/два") {
				t.Errorf("в выводе TestTwice нет сообщения упавшего случая %q:\n%s", message, failedOutput)
			}
			if n := strings.Count(rec.Body.String(), message); n != 1 {
				t.Errorf("сообщение случая встречается в ответе %d раз, ожидался один:\n%.900s", n, rec.Body.String())
			}
			// прошедшие молча случаи в подробности не идут
			if strings.Contains(failedOutput, "TestTwice/один") || strings.Contains(failedOutput, "TestTwice/три") {
				t.Errorf("в выводе TestTwice остались прошедшие случаи:\n%s", failedOutput)
			}
		})
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
	srv := newServer(memLimiter{Mode: memNone})
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

// Сквозной случай «опечатка в решении». Как печатает ошибку эта версия go —
// сырым текстом (до 1.24) или событиями build-output, — не важно: читатель
// обязан получить строку компилятора, а не одно «[build failed]».
func TestHandleRunShowsCompileError(t *testing.T) {
	old := moduleRoot
	t.Cleanup(func() { moduleRoot = old })
	moduleRoot = writeModule(t, map[string]string{
		"spin/spin.go":      "package spin\n\nfunc Spin() int { panic(\"TODO\") }\n",
		"spin/spin_test.go": "package spin\n\nimport \"testing\"\n\nfunc TestSpin(t *testing.T) { Spin() }\n",
	})
	body := `{"pkg":"spin","code":"package spin\n\nfunc Spin() int { return undefinedName }\n"}`
	rec := httptest.NewRecorder()
	newServer(memLimiter{Mode: memNone}).handleRun(rec, httptest.NewRequest(http.MethodPost, "/api/run", strings.NewReader(body)))
	for _, want := range []string{`"build":false`, `spin.go:3:26: undefined: undefinedName`} {
		if !strings.Contains(rec.Body.String(), want) {
			t.Errorf("в ответе нет %s:\n%.600s", want, rec.Body.String())
		}
	}
}

// Ctrl+C в терминале и `kill 0` в make serve шлют сигнал группе runner'а, а
// прогон живёт в своей (groupCommand) и сам сигнала не получит. Остановка
// сервера обязана дойти до него через базовый контекст запросов.
func TestServeStopKillsRunningTests(t *testing.T) {
	old := moduleRoot
	t.Cleanup(func() { moduleRoot = old })
	moduleRoot = writeModule(t, map[string]string{
		"hang/hang.go":      "package hang\n",
		"hang/hang_test.go": hangTest,
	})
	pidFile := filepath.Join(t.TempDir(), "pid")
	t.Setenv("RUNNER_PIDFILE", pidFile)
	srv := newServer(memLimiter{Mode: memNone})
	srv.limits = func(bool) runLimits { // сроки далеко: остановить прогон может только сервер
		return runLimits{TestTimeout: time.Minute, Deadline: 2 * time.Minute, MaxOutput: maxRunOutput}
	}
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	ctx, stop := context.WithCancel(context.Background())
	defer stop()
	served := make(chan error, 1)
	go func() { served <- serve(ctx, ln, http.HandlerFunc(srv.handleRun)) }()
	go func() { // клиент ждёт ответа всё время прогона, как виджет
		resp, err := http.Post("http://"+ln.Addr().String()+"/api/run", "application/json",
			strings.NewReader(`{"pkg":"hang","code":"package hang\n"}`))
		if err == nil {
			resp.Body.Close()
		}
	}()

	pid := 0
	for start := time.Now(); pid == 0 && time.Since(start) < 90*time.Second; time.Sleep(100 * time.Millisecond) {
		b, _ := os.ReadFile(pidFile)
		pid, _ = strconv.Atoi(string(b))
	}
	if pid == 0 {
		t.Fatal("тестовый бинарник не стартовал за 90 с")
	}
	stop() // то, что в main делает SIGINT/SIGTERM
	select {
	case err := <-served:
		if err != nil {
			t.Errorf("serve вернул ошибку вместо штатной остановки: %v", err)
		}
	case <-time.After(shutdownGrace + 5*time.Second):
		t.Error("serve не вернулся после остановки")
	}
	for start := time.Now(); !processGone(pid) && time.Since(start) < 3*time.Second; {
		time.Sleep(50 * time.Millisecond)
	}
	if !processGone(pid) {
		syscall.Kill(pid, syscall.SIGKILL) // не оставляем сироту после красного теста
		t.Fatalf("тестовый бинарник (pid %d) пережил остановку сервера", pid)
	}
}

// Окно стоит в самих обработчиках: пока оно занято, запрос ждёт, а не запускает
// второй компилятор рядом. Клиент здесь уже ушёл — обработчик обязан вернуться,
// ничего не запустив и ничего не ответив.
func TestHandlersWaitForSlot(t *testing.T) {
	old := moduleRoot
	t.Cleanup(func() { moduleRoot = old })
	const code = "package dp\n\nfunc ClimbStairs(n int) int {\n\tways := 0\n\tfor i := 0; i < n; i++ {\n\t\tways += i\n\t}\n\treturn ways\n}\n"
	moduleRoot = writeModule(t, map[string]string{"dp/dp.go": code})
	srv := newServer(memLimiter{Mode: memNone})
	srv.acquire(context.Background()) // окно занято другим прогоном
	gone, cancel := context.WithCancel(context.Background())
	cancel()
	body, err := json.Marshal(map[string]string{"pkg": "dp", "code": code, "func": "ClimbStairs", "call": "ClimbStairs(3)"})
	if err != nil {
		t.Fatal(err)
	}
	for path, handle := range map[string]http.HandlerFunc{"/api/run": srv.handleRun, "/api/trace": srv.handleTrace} {
		rec := httptest.NewRecorder()
		handle(rec, httptest.NewRequest(http.MethodPost, path, bytes.NewReader(body)).WithContext(gone))
		if rec.Body.Len() != 0 {
			t.Errorf("%s не ждал окна и ответил: %.300s", path, rec.Body.String())
		}
	}
}

func TestTraceHarnessStopsFlood(t *testing.T) {
	dir := writeModule(t, map[string]string{"tracecmd/main.go": "package main\n\nimport \"fmt\"\n\nfunc main() {\n\tfor {\n\t\tfmt.Println(\"__TRACE__ {}\")\n\t}\n}\n"})
	// Срок запуска далеко: остановить поток шагов может только потолок трассы, и сразу.
	lim := runLimits{Deadline: time.Minute, BuildTimeout: time.Minute, MaxOutput: 64 << 10}
	start := time.Now()
	resp := runTraceHarness(context.Background(), dir, "F", "p.F()", lim)
	if !resp.Timeout || !strings.Contains(resp.Reason, "трасса не поместилась") || time.Since(start) > 20*time.Second || len(resp.Steps) > lim.MaxOutput/13 {
		t.Fatalf("timeout=%v reason=%q шагов=%d за %s", resp.Timeout, resp.Reason, len(resp.Steps), time.Since(start))
	}
	// trace-viz.js проверяет build раньше, чем timeout: остановленный запуск — собранный код
	if !resp.Build {
		t.Error("остановка трассы помечена build=false — виджет показал бы её как ошибку компиляции")
	}
}

// trace-viz.js узнаёт ошибку сборки по resp.build === false. С omitempty ложное
// поле из ответа пропадало, и читатель видел голое «Не удалось построить трассу»
// вместо вывода компилятора.
func TestTraceBuildErrorReachesWidget(t *testing.T) {
	dir := writeModule(t, map[string]string{"tracecmd/main.go": "package main\n\nfunc main() { undefinedName() }\n"})
	lim := runLimits{Deadline: 5 * time.Second, BuildTimeout: time.Minute, MaxOutput: maxRunOutput}
	resp := runTraceHarness(context.Background(), dir, "F", "p.F()", lim)
	body, err := json.Marshal(resp)
	if err != nil {
		t.Fatal(err)
	}
	for _, want := range []string{`"build":false`, `main.go:3:15: undefined: undefinedName`} {
		if !strings.Contains(string(body), want) {
			t.Errorf("в ответе нет %s:\n%.600s", want, body)
		}
	}
}
