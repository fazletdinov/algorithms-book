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
	// Ошибка компиляции. Поток снят с настоящего go test -json (одинаков на 1.24.0 и
	// 1.26.5): текст компилятора идёт событиями build-output с ImportPath вместо
	// Package, а output у пакета — одна строка FAIL. Без build-output читатель видел
	// «Ошибка компиляции» и ни слова о том, где она.
	res = parseTestOutput([]byte(strings.Join([]string{
		`{"ImportPath":"probe/b [probe/b.test]","Action":"build-output","Output":"# probe/b [probe/b.test]\n"}`,
		`{"ImportPath":"probe/b [probe/b.test]","Action":"build-output","Output":"b/b.go:3:28: undefined: undefinedName\n"}`,
		`{"ImportPath":"probe/b [probe/b.test]","Action":"build-fail"}`,
		`{"Time":"2026-10-06T13:04:32.862444448+03:00","Action":"start","Package":"probe/b"}`,
		`{"Time":"2026-10-06T13:04:32.862478237+03:00","Action":"output","Package":"probe/b","Output":"FAIL\tprobe/b [build failed]\n"}`,
		`{"Time":"2026-10-06T13:04:32.86248191+03:00","Action":"fail","Package":"probe/b","Elapsed":0,"FailedBuild":"probe/b [probe/b.test]"}`,
	}, "\n")))
	want = "# probe/b [probe/b.test]\nb/b.go:3:28: undefined: undefinedName\nFAIL\tprobe/b [build failed]"
	if res.Build || res.Timeout || res.Output != want {
		t.Fatalf("ошибка компиляции: build=%v timeout=%v output=%q", res.Build, res.Timeout, res.Output)
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
	s := newServer(memLimiter{Mode: memNone})
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
