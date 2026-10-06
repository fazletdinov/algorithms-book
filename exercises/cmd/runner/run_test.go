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
