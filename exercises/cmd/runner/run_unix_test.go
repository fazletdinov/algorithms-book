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
	// потолок режет поток посреди события — обрывок JSON читателю показывать незачем
	if strings.Contains(res.Output, `"Action"`) {
		t.Errorf("в выводе остался обрывок события go test -json: %.160q", res.Output)
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
	lim := runLimits{Deadline: 3 * time.Second, MaxOutput: 64 << 10}
	start := time.Now()
	resp := runTraceHarness(context.Background(), dir, "F", "p.F()", lim)
	if !resp.Timeout || resp.Reason == "" || time.Since(start) > 40*time.Second || len(resp.Steps) > lim.MaxOutput/13 {
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
	resp := runTraceHarness(context.Background(), dir, "F", "p.F()", runLimits{Deadline: 5 * time.Second, MaxOutput: maxRunOutput})
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
