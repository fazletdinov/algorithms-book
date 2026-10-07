// Предел памяти прогона: решение с бесконечным ростом (обход без visited) иначе
// занимало всю память машины раньше, чем срабатывал срок теста.
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

// humanBytes пишет ГиБ, только если выходит целое число четвертей: -mem-mb 2500
// честнее показать как «2500 МиБ», чем как «2.44140625 ГиБ».
func humanBytes(n int64) string {
	if n >= 1<<30 && n%(1<<28) == 0 {
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

// limitText — как назвать читателю предел, в который упёрся прогон. Без своего
// предела упор виден только когда процесс убило ядро (docker --memory, OOM-killer).
func (m memLimiter) limitText(race bool) string {
	switch m.Mode {
	case memCgroup:
		return humanBytes(m.Bytes)
	case memRlimit:
		return humanBytes(m.addressSpace(race))
	}
	return "машины"
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
	if m.Mode == memCgroup && scopeOOMKilled(ctx, unit) {
		return true
	}
	for _, mk := range memMarkers {
		if bytes.Contains(out, []byte(mk)) {
			return true
		}
	}
	return false
}

// scopeSettle — сколько ждём, пока systemd заметит конец области.
const scopeSettle = 300 * time.Millisecond

// scopeOOMKilled спрашивает у systemd итог области. Когда ядро убивает по памяти
// сам главный процесс области (предела не хватило даже на `go`), Run возвращается
// раньше, чем systemd это обработает: замер — через 4 мс область ещё `active` с
// Result=success, через 12 мс — `failed` с `oom-kill`. Итогу живой области верить
// нельзя, поэтому ждём, пока она перестанет быть active.
func scopeOOMKilled(ctx context.Context, unit string) bool {
	ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	for start := time.Now(); ; time.Sleep(10 * time.Millisecond) {
		res, _ := exec.CommandContext(ctx, "systemctl", "--user", "show", unit+".scope", "-p", "ActiveState", "-p", "Result").Output()
		if !bytes.Contains(res, []byte("ActiveState=active\n")) || time.Since(start) > scopeSettle {
			return bytes.Contains(res, []byte("Result=oom-kill\n"))
		}
	}
}
