package main

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestHumanBytes(t *testing.T) {
	for n, want := range map[int64]string{2 << 30: "2 ГиБ", 1536 << 20: "1.5 ГиБ", 512 << 20: "512 МиБ",
		2500 << 20: "2500 МиБ"} { // не «2.44140625 ГиБ»: значение приходит из -mem-mb как есть

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
		"go test -exec prlimit --as=2147483648 -- -json ./dp/":                                                      cmd(memLimiter{memRlimit, 2 << 30}, false),
		// с -race адресов не меньше 4 ГиБ: на 2 ГиБ бинарник падает на первом крупном выделении
		"go test -exec prlimit --as=4294967296 -- -json ./dp/": cmd(memLimiter{memRlimit, 2 << 30}, true),
		"go test -json ./dp/": cmd(memLimiter{Mode: memNone}, false),
	} {
		if got != want {
			t.Errorf("команда:\n %s\nожидалось\n %s", got, want)
		}
	}
}

// Трасса запускает готовый бинарник: предел ставится ему самому, без go test -exec.
func TestMemLimiterBinary(t *testing.T) {
	bin := func(m memLimiter) string {
		return strings.Join(m.binary(context.Background(), "u1", "/tmp/x/.tracebin").Args, " ")
	}
	for want, got := range map[string]string{
		"systemd-run --user --scope -q --unit=u1 -p MemoryMax=2147483648 -p MemorySwapMax=0 -- /tmp/x/.tracebin": bin(memLimiter{memCgroup, 2 << 30}),
		"prlimit --as=2147483648 -- /tmp/x/.tracebin":                                                            bin(memLimiter{memRlimit, 2 << 30}),
		"/tmp/x/.tracebin": bin(memLimiter{Mode: memNone}),
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

// Ограничитель стоит перед `go`, и не запуститься теперь может он (systemd-run
// пропал после старта сервера). Вывода при этом нет вовсе — без причины читатель
// видел бы «Ошибка компиляции / (нет вывода)».
func TestRunGoTestReportsLaunchFailure(t *testing.T) {
	t.Setenv("PATH", t.TempDir()) // ни systemd-run, ни go
	lim := runLimits{TestTimeout: time.Second, Deadline: time.Minute, MaxOutput: maxRunOutput,
		Mem: memLimiter{Mode: memCgroup, Bytes: 1 << 30}}
	res := runGoTest(context.Background(), t.TempDir(), []string{"test", "./x/"}, lim)
	if res.OK || res.Timeout || res.MemLimit || !strings.HasPrefix(res.Reason, `прогон не запустился: exec: "systemd-run"`) {
		t.Fatalf("%+v", res)
	}
}

// Без предела сервер остаётся в двух случаях: читатель выключил его сам
// (-mem-mb 0) или на машине нет ни systemd-run, ни prlimit (macOS, Windows).
// Во втором сервер обязан стартовать и честно сообщить «none», а не упасть.
func TestDetectMemLimiterNone(t *testing.T) {
	if got := detectMemLimiter(context.Background(), 0); got != (memLimiter{Mode: memNone}) {
		t.Errorf("выключенный предел: %+v", got)
	}
	t.Setenv("PATH", t.TempDir())
	if got := detectMemLimiter(context.Background(), 2<<30); got != (memLimiter{Mode: memNone}) {
		t.Errorf("без systemd-run и prlimit: %+v", got)
	}
}

// Имена полей limits читает runner.js (limitsBadge) — закреплены здесь.
func TestHealthReportsLimits(t *testing.T) {
	rec := httptest.NewRecorder()
	newServer(memLimiter{memCgroup, 2 << 30}).handleHealth(rec, httptest.NewRequest(http.MethodGet, "/api/health", nil))
	for _, want := range []string{`"ok":true`, `"memory":"cgroup"`, `"memoryBytes":2147483648`, `"memoryText":"2 ГиБ"`,
		`"testTimeout":"20s"`, `"raceTimeout":"45s"`} {
		if !strings.Contains(rec.Body.String(), want) {
			t.Errorf("в ответе нет %s:\n%s", want, rec.Body.String())
		}
	}
}
