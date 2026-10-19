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

func (r *recorder) Helper()                      {}
func (r *recorder) Logf(string, ...any)          {}
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
	if !strings.Contains(r.msg, "медленный вход") || !strings.Contains(r.msg, (20*time.Millisecond*raceFactor).String()) {
		t.Fatalf("в сообщении нет описания входа или срока: %q", r.msg)
	}
}

// Паника в чужой горутине роняет бинарник без имени теста; Within переносит
// её в тест, чтобы читатель увидел, какой вход её вызвал.
func TestWithinReportsPanic(t *testing.T) {
	r := &recorder{TB: t}
	Within(r, time.Second, "вход с паникой", func() {
		a, i := []int{1}, 3
		_ = a[i]
	})
	if !r.failed || !strings.Contains(r.msg, "паника") || !strings.Contains(r.msg, "вход с паникой") {
		t.Fatalf("паника не превратилась в падение теста с описанием: failed=%v, %q", r.failed, r.msg)
	}
}
