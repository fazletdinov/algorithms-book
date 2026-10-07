//go:build unix

package main

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
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

func runEater(t *testing.T, mem memLimiter, race bool, eatMiB string) testResult {
	t.Helper()
	dir := writeModule(t, map[string]string{"eat/eat_test.go": eatTest})
	t.Setenv("RUNNER_EAT_MIB", eatMiB)
	deadline := 2 * time.Minute
	if race {
		// Единственный вызов с -race — контроль «маленький прогон проходит»: убить
		// ему нечего, а холодная сборка стандартной библиотеки под детектор (в CI
		// кэша ещё нет, и она идёт параллельно с десятками пакетов на четырёх
		// ядрах) легко съедает две минуты. Остальные прогоны идут без -race.
		deadline = 5 * time.Minute
	}
	lim := runLimits{Race: race, TestTimeout: time.Minute, Deadline: deadline, MaxOutput: maxRunOutput, Mem: mem}
	args, _ := testArgs("eat", race, nil, lim.TestTimeout)
	return runGoTest(context.Background(), dir, args, lim)
}

func wantStopped(t *testing.T, res testResult, limit string) {
	t.Helper()
	want := "TestEat: упёрлось в предел памяти " + limit + " — похоже на бесконечный рост (например, обход без visited)"
	if !res.MemLimit || res.OK || res.Reason != want || len(res.Tests) != 1 || res.Tests[0].Killed != "memory" {
		t.Fatalf("memLimit=%v ok=%v reason=%q tests=%+v\nвывод: %.400s", res.MemLimit, res.OK, res.Reason, res.Tests, res.Output)
	}
}

// RUNNER_REQUIRE_CGROUP=1 превращает пропуск в провал. Без него сломанная проба
// молча отправляет все cgroup-тесты в SKIP, набор печатает ok, а сервер уходит в
// режим prlimit: путь, который закрывает исходный случай (28 ГБ), остаётся
// непроверенным. Локально, где systemd есть, гоняй набор с этой переменной; в
// CI она не задана: без пользовательской сессии systemd проба не пройдёт.
func needCgroup(t *testing.T) {
	t.Helper()
	if cgroupWorks(context.Background()) {
		return
	}
	const why = "systemd-run --user --scope не ставит MemoryMax (нет пользовательского systemd или контроллера памяти)"
	if os.Getenv("RUNNER_REQUIRE_CGROUP") == "1" {
		t.Fatalf("RUNNER_REQUIRE_CGROUP=1, но проба cgroup не прошла: %s", why)
	}
	t.Skip(why)
}

func needPrlimit(t *testing.T) {
	t.Helper()
	if _, err := exec.LookPath("prlimit"); err != nil {
		t.Skip("нет prlimit (util-linux)")
	}
}

// Порядок выбора: область systemd, если предел в ней действует; иначе prlimit —
// и тогда не меньше 1 ГиБ адресов, сколько бы ни просил -mem-mb.
func TestDetectMemLimiterOrder(t *testing.T) {
	t.Run("cgroup", func(t *testing.T) {
		needCgroup(t)
		if got := detectMemLimiter(context.Background(), 512<<20); got != (memLimiter{memCgroup, 512 << 20}) {
			t.Fatalf("%+v", got)
		}
	})
	t.Run("prlimit", func(t *testing.T) {
		needPrlimit(t)
		prlimit, _ := exec.LookPath("prlimit")
		bin := t.TempDir()
		if err := os.Symlink(prlimit, filepath.Join(bin, "prlimit")); err != nil {
			t.Fatal(err)
		}
		t.Setenv("PATH", bin) // systemd-run не найти
		if got := detectMemLimiter(context.Background(), 512<<20); got != (memLimiter{memRlimit, 1 << 30}) {
			t.Fatalf("%+v", got)
		}
	})
}

func TestMemLimitCgroupStopsEater(t *testing.T) {
	needCgroup(t)
	wantStopped(t, runEater(t, memLimiter{Mode: memCgroup, Bytes: 512 << 20}, false, "900"), "512 МиБ")
}

func TestMemLimitRlimitStopsEater(t *testing.T) {
	needPrlimit(t)
	wantStopped(t, runEater(t, memLimiter{Mode: memRlimit, Bytes: 1 << 30}, false, "900"), "1 ГиБ")
}

// Предела не хватило на саму сборку (-mem-mb слишком мал): убит компоновщик или сам
// `go`, а не решение. Раньше причина и здесь говорила про бесконечный рост и обход
// без visited. Пожиратель до запуска не доходит.
func TestMemLimitCgroupStarvedBuild(t *testing.T) {
	needCgroup(t)
	res := runEater(t, memLimiter{Mode: memCgroup, Bytes: 16 << 20}, false, "0")
	want := "сборка упёрлась в предел памяти 16 МиБ, до тестов дело не дошло — предел мал для компилятора: перезапусти runner с -mem-mb побольше"
	if !res.MemLimit || res.OK || res.Build || res.Timeout || res.Reason != want || len(res.Tests) != 0 {
		t.Fatalf("memLimit=%v ok=%v build=%v timeout=%v tests=%+v\nпричина:   %q\nожидалась: %q\nвывод: %.400s",
			res.MemLimit, res.OK, res.Build, res.Timeout, res.Tests, res.Reason, want, res.Output)
	}
}

// Контроль самой проверки: без предела маленький пожиратель дорастает, тест зелёный.
func TestEaterFinishesWithoutLimit(t *testing.T) {
	if res := runEater(t, memLimiter{Mode: memNone}, false, "64"); !res.OK || res.MemLimit {
		t.Fatalf("ok=%v memLimit=%v reason=%q", res.OK, res.MemLimit, res.Reason)
	}
}

// Контроль с другой стороны: под каждым пределом обычное решение проходит. В
// cgroup-области идёт и сборка; под prlimit рантайму нужен запас адресов, а с
// -race — не меньше 4 ГиБ (на 2 ГиБ детектор гонок падает на первом выделении).
func TestMemLimitSparesSmallRun(t *testing.T) {
	for _, tt := range []struct {
		name string
		need func(*testing.T)
		mem  memLimiter
		race bool
	}{
		{"cgroup", needCgroup, memLimiter{Mode: memCgroup, Bytes: 512 << 20}, false},
		{"rlimit", needPrlimit, memLimiter{Mode: memRlimit, Bytes: 1 << 30}, false},
		{"rlimit с -race", needPrlimit, memLimiter{Mode: memRlimit, Bytes: 2 << 30}, true},
	} {
		t.Run(tt.name, func(t *testing.T) {
			tt.need(t)
			if res := runEater(t, tt.mem, tt.race, "64"); !res.OK || res.MemLimit {
				t.Fatalf("ok=%v memLimit=%v reason=%q\nвывод: %.600s", res.OK, res.MemLimit, res.Reason, res.Output)
			}
		})
	}
}

// Без своего предела упор виден только по «signal: killed» от go test: так
// выглядит бинарник, убитый ядром (docker --memory, OOM-killer). Здесь он убит
// после последнего теста — незавершённых нет, винить некого, но зелёным такой
// прогон быть не должен.
func TestMemLimitKilledAfterLastTest(t *testing.T) {
	dir := writeModule(t, map[string]string{"late/late_test.go": "package late\n\nimport (\n\t\"os\"\n\t\"syscall\"\n\t\"testing\"\n)\n\n" +
		"func TestDone(t *testing.T) {}\n\nfunc TestMain(m *testing.M) {\n\tm.Run()\n\tsyscall.Kill(os.Getpid(), syscall.SIGKILL)\n}\n"})
	lim := runLimits{TestTimeout: time.Minute, Deadline: 2 * time.Minute, MaxOutput: maxRunOutput}
	args, _ := testArgs("late", false, nil, lim.TestTimeout)
	res := runGoTest(context.Background(), dir, args, lim)
	want := "прогон: упёрлось в предел памяти машины — похоже на бесконечный рост (например, обход без visited)"
	if !res.MemLimit || res.OK || res.Passed != 1 || res.Reason != want {
		t.Fatalf("memLimit=%v ok=%v passed=%d reason=%q\nвывод: %.400s", res.MemLimit, res.OK, res.Passed, res.Reason, res.Output)
	}
}

// Тот же пожиратель в роли харнесса трассы: /api/trace запускает собранный
// бинарник сам, без go test, — предел и его распознавание там свои.
const eatMain = `package main

import (
	"fmt"
	"os"
	"strconv"
)

var keep [][]byte

func main() {
	limit, _ := strconv.Atoi(os.Getenv("RUNNER_EAT_MIB"))
	for mb := 0; mb < limit && mb < 900; mb += 16 {
		b := make([]byte, 16<<20)
		for i := 0; i < len(b); i += 4096 {
			b[i] = 1
		}
		keep = append(keep, b)
	}
	fmt.Println("__TRACE_RESULT__ null")
}
`

func traceEater(t *testing.T, mem memLimiter, eatMiB string) traceResponse {
	t.Helper()
	dir := writeModule(t, map[string]string{"tracecmd/main.go": eatMain})
	t.Setenv("RUNNER_EAT_MIB", eatMiB)
	lim := runLimits{Deadline: time.Minute, BuildTimeout: time.Minute, MaxOutput: maxRunOutput, Mem: mem}
	return runTraceHarness(context.Background(), dir, "F", "p.F()", lim)
}

func wantTraceStopped(t *testing.T, resp traceResponse, limit string) {
	t.Helper()
	want := "выполнение упёрлось в предел памяти " + limit + " — похоже на бесконечный рост (например, обход без visited)"
	// Build: true — trace-viz.js проверяет build раньше остальных веток
	if !resp.MemLimit || !resp.Build || resp.OK || resp.Timeout || resp.Panic || resp.Reason != want {
		t.Fatalf("memLimit=%v build=%v ok=%v timeout=%v panic=%v reason=%q message=%.300q",
			resp.MemLimit, resp.Build, resp.OK, resp.Timeout, resp.Panic, resp.Reason, resp.Message)
	}
}

func TestTraceMemLimitCgroupStopsEater(t *testing.T) {
	needCgroup(t)
	wantTraceStopped(t, traceEater(t, memLimiter{Mode: memCgroup, Bytes: 512 << 20}, "900"), "512 МиБ")
}

func TestTraceMemLimitRlimitStopsEater(t *testing.T) {
	needPrlimit(t)
	wantTraceStopped(t, traceEater(t, memLimiter{Mode: memRlimit, Bytes: 1 << 30}, "900"), "1 ГиБ")
}

// Те же два контроля для трассы: без предела и под каждым пределом маленький
// запуск доходит до конца.
func TestTraceMemLimitSparesSmallRun(t *testing.T) {
	for _, tt := range []struct {
		name string
		need func(*testing.T)
		mem  memLimiter
	}{
		{"без предела", func(*testing.T) {}, memLimiter{Mode: memNone}},
		{"cgroup", needCgroup, memLimiter{Mode: memCgroup, Bytes: 512 << 20}},
		{"rlimit", needPrlimit, memLimiter{Mode: memRlimit, Bytes: 1 << 30}},
	} {
		t.Run(tt.name, func(t *testing.T) {
			tt.need(t)
			if resp := traceEater(t, tt.mem, "64"); !resp.OK || resp.MemLimit {
				t.Fatalf("ok=%v memLimit=%v reason=%q message=%.300q", resp.OK, resp.MemLimit, resp.Reason, resp.Message)
			}
		})
	}
}

// goOnlyPath оставляет в PATH один `go`: харнесс собирается, а ограничитель
// памяти перед его бинарником не находится.
func goOnlyPath(t *testing.T) {
	t.Helper()
	root, err := exec.Command("go", "env", "GOROOT").Output()
	if err != nil {
		t.Fatal(err)
	}
	bin := t.TempDir()
	if err := os.Symlink(filepath.Join(strings.TrimSpace(string(root)), "bin", "go"), filepath.Join(bin, "go")); err != nil {
		t.Fatal(err)
	}
	t.Setenv("PATH", bin)
}

// Харнесс собрался, а запустить его под пределом не вышло: это не паника в коде
// читателя и не «Паника во время выполнения:» с пустым текстом.
func TestTraceReportsLaunchFailure(t *testing.T) {
	dir := writeModule(t, map[string]string{"tracecmd/main.go": "package main\n\nfunc main() {}\n"})
	goOnlyPath(t)
	lim := runLimits{Deadline: time.Minute, BuildTimeout: time.Minute, MaxOutput: maxRunOutput, Mem: memLimiter{Mode: memRlimit, Bytes: 1 << 30}}
	resp := runTraceHarness(context.Background(), dir, "F", "p.F()", lim)
	if !resp.Build || resp.OK || resp.Panic || resp.MemLimit || !strings.HasPrefix(resp.Reason, `трасса не запустилась: exec: "prlimit"`) {
		t.Fatalf("build=%v ok=%v panic=%v memLimit=%v reason=%q message=%q output=%.300q",
			resp.Build, resp.OK, resp.Panic, resp.MemLimit, resp.Reason, resp.Message, resp.Output)
	}
}
