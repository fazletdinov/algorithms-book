package main

import (
	"context"
	"errors"
	"runtime"
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
	if res.Build || res.NoTests || res.Timeout || res.Output != want {
		t.Fatalf("ошибка компиляции: build=%v noTests=%v timeout=%v output=%q", res.Build, res.NoTests, res.Timeout, res.Output)
	}
	// Фильтр -run не совпал ни с одним тестом. Поток снят с настоящего
	// `go test -json -run '^(TestNope)$'` (одинаков на 1.24.0 и 1.26.5): пакет собрался,
	// бинарник отработал, событий с полем Test нет. Раньше это была «Ошибка компиляции».
	res = parseTestOutput([]byte(strings.Join([]string{
		`{"Time":"2026-10-07T15:42:58.654286468+03:00","Action":"start","Package":"probe/ok"}`,
		`{"Time":"2026-10-07T15:42:58.655402624+03:00","Action":"output","Package":"probe/ok","Output":"testing: warning: no tests to run\n"}`,
		`{"Time":"2026-10-07T15:42:58.65544329+03:00","Action":"output","Package":"probe/ok","Output":"PASS\n"}`,
		`{"Time":"2026-10-07T15:42:58.655528425+03:00","Action":"output","Package":"probe/ok","Output":"ok  \tprobe/ok\t0.001s [no tests to run]\n"}`,
		`{"Time":"2026-10-07T15:42:58.65554106+03:00","Action":"pass","Package":"probe/ok","Elapsed":0.001}`,
	}, "\n")))
	if !res.Build || !res.NoTests || res.Passed != 0 || res.Failed != 0 || len(res.Tests) != 0 {
		t.Fatalf("фильтр не совпал: build=%v noTests=%v passed=%d failed=%d tests=%+v", res.Build, res.NoTests, res.Passed, res.Failed, res.Tests)
	}
	// Бинарник собрался и упал до первого теста (паника в переменной уровня пакета):
	// событий тестов тоже нет, но это не «тестов не нашлось» — пакет кончился fail.
	res = parseTestOutput([]byte(strings.Join([]string{
		`{"Time":"2026-10-07T15:42:58.870743104+03:00","Action":"start","Package":"probe/initpanic"}`,
		`{"Time":"2026-10-07T15:42:58.873917388+03:00","Action":"output","Package":"probe/initpanic","Output":"panic: boom at init\n"}`,
		`{"Time":"2026-10-07T15:42:58.874106936+03:00","Action":"output","Package":"probe/initpanic","Output":"FAIL\tprobe/initpanic\t0.003s\n"}`,
		`{"Time":"2026-10-07T15:42:58.874123215+03:00","Action":"fail","Package":"probe/initpanic","Elapsed":0.003}`,
	}, "\n")))
	if res.Build || res.NoTests || !strings.Contains(res.Output, "panic: boom at init") {
		t.Fatalf("паника до тестов: build=%v noTests=%v output=%q", res.Build, res.NoTests, res.Output)
	}
}

// Потоки для TestParseSubtestOutput сняты с настоящего `go test -json` на пробных
// пакетах; на Go 1.24.0 и 1.26.5 они совпадают событие в событие. Поле Time убрано.
const (
	// Табличный тест: случай «ноль» прошёл, «два» и «три» упали. Сообщение случая
	// приписано подтесту «TestDouble/два», самому TestDouble — только RUN и FAIL.
	streamTableTest = `{"Action":"start","Package":"probe/table"}
{"Action":"run","Package":"probe/table","Test":"TestQuick"}
{"Action":"output","Package":"probe/table","Test":"TestQuick","Output":"=== RUN   TestQuick\n"}
{"Action":"output","Package":"probe/table","Test":"TestQuick","Output":"--- PASS: TestQuick (0.00s)\n"}
{"Action":"pass","Package":"probe/table","Test":"TestQuick","Elapsed":0}
{"Action":"run","Package":"probe/table","Test":"TestDouble"}
{"Action":"output","Package":"probe/table","Test":"TestDouble","Output":"=== RUN   TestDouble\n"}
{"Action":"run","Package":"probe/table","Test":"TestDouble/ноль"}
{"Action":"output","Package":"probe/table","Test":"TestDouble/ноль","Output":"=== RUN   TestDouble/ноль\n"}
{"Action":"output","Package":"probe/table","Test":"TestDouble/ноль","Output":"--- PASS: TestDouble/ноль (0.00s)\n"}
{"Action":"pass","Package":"probe/table","Test":"TestDouble/ноль","Elapsed":0}
{"Action":"run","Package":"probe/table","Test":"TestDouble/два"}
{"Action":"output","Package":"probe/table","Test":"TestDouble/два","Output":"=== RUN   TestDouble/два\n"}
{"Action":"output","Package":"probe/table","Test":"TestDouble/два","Output":"    table_test.go:22: Double(2) = 5, ожидалось 4\n"}
{"Action":"output","Package":"probe/table","Test":"TestDouble/два","Output":"--- FAIL: TestDouble/два (0.00s)\n"}
{"Action":"fail","Package":"probe/table","Test":"TestDouble/два","Elapsed":0}
{"Action":"run","Package":"probe/table","Test":"TestDouble/три"}
{"Action":"output","Package":"probe/table","Test":"TestDouble/три","Output":"=== RUN   TestDouble/три\n"}
{"Action":"output","Package":"probe/table","Test":"TestDouble/три","Output":"    table_test.go:22: Double(3) = 7, ожидалось 6\n"}
{"Action":"output","Package":"probe/table","Test":"TestDouble/три","Output":"--- FAIL: TestDouble/три (0.00s)\n"}
{"Action":"fail","Package":"probe/table","Test":"TestDouble/три","Elapsed":0}
{"Action":"output","Package":"probe/table","Test":"TestDouble","Output":"--- FAIL: TestDouble (0.00s)\n"}
{"Action":"fail","Package":"probe/table","Test":"TestDouble","Elapsed":0}
{"Action":"output","Package":"probe/table","Output":"FAIL\n"}
{"Action":"output","Package":"probe/table","Output":"FAIL\tprobe/table\t0.001s\n"}
{"Action":"fail","Package":"probe/table","Elapsed":0.001}
`
	// «Решение» с забытой отладочной печатью (она идёт и в прошедшем случае), вложенные
	// подтесты и пропущенный случай.
	streamLoudSubtests = `{"Action":"start","Package":"probe/loud"}
{"Action":"run","Package":"probe/loud","Test":"TestTwice"}
{"Action":"output","Package":"probe/loud","Test":"TestTwice","Output":"=== RUN   TestTwice\n"}
{"Action":"run","Package":"probe/loud","Test":"TestTwice/один"}
{"Action":"output","Package":"probe/loud","Test":"TestTwice/один","Output":"=== RUN   TestTwice/один\n"}
{"Action":"output","Package":"probe/loud","Test":"TestTwice/один","Output":"отладка: x = 1\n"}
{"Action":"output","Package":"probe/loud","Test":"TestTwice/один","Output":"--- PASS: TestTwice/один (0.00s)\n"}
{"Action":"pass","Package":"probe/loud","Test":"TestTwice/один","Elapsed":0}
{"Action":"run","Package":"probe/loud","Test":"TestTwice/два"}
{"Action":"output","Package":"probe/loud","Test":"TestTwice/два","Output":"=== RUN   TestTwice/два\n"}
{"Action":"output","Package":"probe/loud","Test":"TestTwice/два","Output":"отладка: x = 2\n"}
{"Action":"output","Package":"probe/loud","Test":"TestTwice/два","Output":"    loud_test.go:24: Twice(2) = 5, ожидалось 4\n"}
{"Action":"output","Package":"probe/loud","Test":"TestTwice/два","Output":"--- FAIL: TestTwice/два (0.00s)\n"}
{"Action":"fail","Package":"probe/loud","Test":"TestTwice/два","Elapsed":0}
{"Action":"output","Package":"probe/loud","Test":"TestTwice","Output":"--- FAIL: TestTwice (0.00s)\n"}
{"Action":"fail","Package":"probe/loud","Test":"TestTwice","Elapsed":0}
{"Action":"run","Package":"probe/loud","Test":"TestNested"}
{"Action":"output","Package":"probe/loud","Test":"TestNested","Output":"=== RUN   TestNested\n"}
{"Action":"run","Package":"probe/loud","Test":"TestNested/тихий"}
{"Action":"output","Package":"probe/loud","Test":"TestNested/тихий","Output":"=== RUN   TestNested/тихий\n"}
{"Action":"output","Package":"probe/loud","Test":"TestNested/тихий","Output":"--- PASS: TestNested/тихий (0.00s)\n"}
{"Action":"pass","Package":"probe/loud","Test":"TestNested/тихий","Elapsed":0}
{"Action":"run","Package":"probe/loud","Test":"TestNested/группа"}
{"Action":"output","Package":"probe/loud","Test":"TestNested/группа","Output":"=== RUN   TestNested/группа\n"}
{"Action":"run","Package":"probe/loud","Test":"TestNested/группа/внутри"}
{"Action":"output","Package":"probe/loud","Test":"TestNested/группа/внутри","Output":"=== RUN   TestNested/группа/внутри\n"}
{"Action":"output","Package":"probe/loud","Test":"TestNested/группа/внутри","Output":"    loud_test.go:34: упал во вложенном\n"}
{"Action":"output","Package":"probe/loud","Test":"TestNested/группа/внутри","Output":"--- FAIL: TestNested/группа/внутри (0.00s)\n"}
{"Action":"fail","Package":"probe/loud","Test":"TestNested/группа/внутри","Elapsed":0}
{"Action":"output","Package":"probe/loud","Test":"TestNested/группа","Output":"--- FAIL: TestNested/группа (0.00s)\n"}
{"Action":"fail","Package":"probe/loud","Test":"TestNested/группа","Elapsed":0}
{"Action":"run","Package":"probe/loud","Test":"TestNested/пропуск"}
{"Action":"output","Package":"probe/loud","Test":"TestNested/пропуск","Output":"=== RUN   TestNested/пропуск\n"}
{"Action":"output","Package":"probe/loud","Test":"TestNested/пропуск","Output":"    loud_test.go:36: не на этой платформе\n"}
{"Action":"output","Package":"probe/loud","Test":"TestNested/пропуск","Output":"--- SKIP: TestNested/пропуск (0.00s)\n"}
{"Action":"skip","Package":"probe/loud","Test":"TestNested/пропуск","Elapsed":0}
{"Action":"output","Package":"probe/loud","Test":"TestNested","Output":"--- FAIL: TestNested (0.00s)\n"}
{"Action":"fail","Package":"probe/loud","Test":"TestNested","Elapsed":0}
{"Action":"output","Package":"probe/loud","Output":"FAIL\n"}
{"Action":"output","Package":"probe/loud","Output":"FAIL\tprobe/loud\t0.001s\n"}
{"Action":"fail","Package":"probe/loud","Elapsed":0.001}
`
	// Случай таблицы завис, сработал -timeout 2s: паника и список «running tests»
	// приписаны подтесту. Стек горутин (ещё 40 событий output того же подтеста) вырезан.
	streamHangingSubtest = `{"Action":"start","Package":"probe/hangsub"}
{"Action":"run","Package":"probe/hangsub","Test":"TestSpin"}
{"Action":"output","Package":"probe/hangsub","Test":"TestSpin","Output":"=== RUN   TestSpin\n"}
{"Action":"run","Package":"probe/hangsub","Test":"TestSpin/быстрый"}
{"Action":"output","Package":"probe/hangsub","Test":"TestSpin/быстрый","Output":"=== RUN   TestSpin/быстрый\n"}
{"Action":"output","Package":"probe/hangsub","Test":"TestSpin/быстрый","Output":"--- PASS: TestSpin/быстрый (0.00s)\n"}
{"Action":"pass","Package":"probe/hangsub","Test":"TestSpin/быстрый","Elapsed":0}
{"Action":"run","Package":"probe/hangsub","Test":"TestSpin/петля"}
{"Action":"output","Package":"probe/hangsub","Test":"TestSpin/петля","Output":"=== RUN   TestSpin/петля\n"}
{"Action":"output","Package":"probe/hangsub","Test":"TestSpin/петля","Output":"panic: test timed out after 2s\n"}
{"Action":"output","Package":"probe/hangsub","Test":"TestSpin/петля","Output":"\trunning tests:\n"}
{"Action":"output","Package":"probe/hangsub","Test":"TestSpin/петля","Output":"\t\tTestSpin (2s)\n"}
{"Action":"output","Package":"probe/hangsub","Test":"TestSpin/петля","Output":"\t\tTestSpin/петля (2s)\n"}
{"Action":"output","Package":"probe/hangsub","Output":"FAIL\tprobe/hangsub\t2.004s\n"}
{"Action":"fail","Package":"probe/hangsub","Elapsed":2.005}
`
)

// Тесты тренажёра табличные: случаи идут подтестами (t.Run), и `go test` приписывает
// сообщение упавшего случая подтесту «TestX/случай», а не TestX. Вывод подтестов
// отбрасывался, и в подробностях упавшего теста читатель видел «=== RUN / --- FAIL»
// без «F(вход) = получено, ожидалось …». Счёт и имена — по-прежнему по тестам
// верхнего уровня.
func TestParseSubtestOutput(t *testing.T) {
	check := func(name string, res testResult, passed, failed int, want map[string]string) {
		t.Helper()
		if res.Passed != passed || res.Failed != failed || len(res.Tests) != len(want) {
			t.Fatalf("%s: passed=%d failed=%d, тестов %d — ожидалось %d/%d и %d", name, res.Passed, res.Failed, len(res.Tests), passed, failed, len(want))
		}
		for _, te := range res.Tests {
			out, top := want[te.Name]
			if !top {
				t.Errorf("%s: в tests[] попал %q — там только тесты верхнего уровня", name, te.Name)
			} else if te.Output != out {
				t.Errorf("%s: вывод %s\nполучен:\n%s\nожидался:\n%s", name, te.Name, te.Output, out)
			}
		}
	}

	check("табличный тест", parseTestOutput([]byte(streamTableTest)), 1, 1, map[string]string{
		"TestQuick": "=== RUN   TestQuick\n--- PASS: TestQuick (0.00s)\n",
		// упавшие случаи — с именем и сообщением, по порядку; прошедший молча «ноль» не показан
		"TestDouble": "=== RUN   TestDouble\n" +
			"=== RUN   TestDouble/два\n    table_test.go:22: Double(2) = 5, ожидалось 4\n--- FAIL: TestDouble/два (0.00s)\n" +
			"=== RUN   TestDouble/три\n    table_test.go:22: Double(3) = 7, ожидалось 6\n--- FAIL: TestDouble/три (0.00s)\n" +
			"--- FAIL: TestDouble (0.00s)\n",
	})
	check("печать, вложенность, пропуск", parseTestOutput([]byte(streamLoudSubtests)), 0, 2, map[string]string{
		// прошедший случай что-то напечатал — его печать не прячем
		"TestTwice": "=== RUN   TestTwice\n" +
			"=== RUN   TestTwice/один\nотладка: x = 1\n--- PASS: TestTwice/один (0.00s)\n" +
			"=== RUN   TestTwice/два\nотладка: x = 2\n    loud_test.go:24: Twice(2) = 5, ожидалось 4\n--- FAIL: TestTwice/два (0.00s)\n" +
			"--- FAIL: TestTwice (0.00s)\n",
		"TestNested": "=== RUN   TestNested\n" +
			"=== RUN   TestNested/группа\n=== RUN   TestNested/группа/внутри\n    loud_test.go:34: упал во вложенном\n" +
			"--- FAIL: TestNested/группа/внутри (0.00s)\n--- FAIL: TestNested/группа (0.00s)\n" +
			"=== RUN   TestNested/пропуск\n    loud_test.go:36: не на этой платформе\n--- SKIP: TestNested/пропуск (0.00s)\n" +
			"--- FAIL: TestNested (0.00s)\n",
	})

	// Зависший случай: тест назван по верхнему уровню, как раньше, а в его выводе теперь
	// видно, какой случай не кончился.
	res := parseTestOutput([]byte(streamHangingSubtest))
	check("завис случай", res, 0, 1, map[string]string{
		"TestSpin": "=== RUN   TestSpin\n=== RUN   TestSpin/петля\npanic: test timed out after 2s\n\trunning tests:\n\t\tTestSpin (2s)\n\t\tTestSpin/петля (2s)\n",
	})
	if want := "тест TestSpin не уложился в 2s — похоже на бесконечный цикл"; !res.Timeout || res.Reason != want || res.Tests[0].Killed != "timeout" {
		t.Errorf("завис случай: timeout=%v killed=%q причина %q, ожидалась %q", res.Timeout, res.Tests[0].Killed, res.Reason, want)
	}
}

// Потоки для TestVerdictWithoutTests. Сбой systemd-run, убитый компоновщик и ошибка
// компиляции сняты с настоящих прогонов (Go 1.26.5, systemd 255; путь к компоновщику
// укорочен); два потока «бинарник запущен» — начало настоящего потока с другими
// именами пакета и теста.
const (
	// systemd-run без пользовательской шины: область не создана, код выхода 1, stdout пуст.
	streamNoBus = "Failed to connect to bus: No such file or directory\n"
	// Область на 32 МиБ: ядро убило компоновщик, `go` успел это напечатать.
	streamLinkKilled = `{"ImportPath":"probe/ok.test","Action":"build-output","Output":"probe/ok.test: /usr/local/go/pkg/tool/linux_amd64/link: signal: killed\n"}
{"ImportPath":"probe/ok.test","Action":"build-fail"}
{"Time":"2026-10-07T15:49:06.140093205+03:00","Action":"start","Package":"probe/ok"}
{"Time":"2026-10-07T15:49:06.140121302+03:00","Action":"output","Package":"probe/ok","Output":"FAIL\tprobe/ok [build failed]\n"}
{"Time":"2026-10-07T15:49:06.140127843+03:00","Action":"fail","Package":"probe/ok","Elapsed":0,"FailedBuild":"probe/ok.test"}
`
	// Тестовый бинарник запущен, первый тест идёт и не кончается.
	streamTestRunning = `{"Time":"2026-10-07T15:49:06.383119528+03:00","Action":"start","Package":"probe/hang"}
{"Time":"2026-10-07T15:49:06.384448983+03:00","Action":"run","Package":"probe/hang","Test":"TestHang"}
{"Time":"2026-10-07T15:49:06.384468479+03:00","Action":"output","Package":"probe/hang","Test":"TestHang","Output":"=== RUN   TestHang\n"}
`
	// Тестовый бинарник запущен, а до первого теста дело не дошло (init, TestMain).
	streamBinaryStarted = `{"Time":"2026-10-07T15:49:06.383119528+03:00","Action":"start","Package":"probe/hang"}
`
	streamCompileError = `{"ImportPath":"probe/b [probe/b.test]","Action":"build-output","Output":"# probe/b [probe/b.test]\n"}
{"ImportPath":"probe/b [probe/b.test]","Action":"build-output","Output":"b/b.go:3:28: undefined: undefinedName\n"}
{"ImportPath":"probe/b [probe/b.test]","Action":"build-fail"}
{"Time":"2026-10-06T13:04:32.862444448+03:00","Action":"start","Package":"probe/b"}
{"Time":"2026-10-06T13:04:32.862478237+03:00","Action":"output","Package":"probe/b","Output":"FAIL\tprobe/b [build failed]\n"}
{"Time":"2026-10-06T13:04:32.86248191+03:00","Action":"fail","Package":"probe/b","Elapsed":0,"FailedBuild":"probe/b [probe/b.test]"}
`
)

// Прогон кончился без единого события теста. Виновата тогда сборка или запуск, а не
// решение: «Ошибка компиляции», «бесконечный цикл» и «обход без visited» здесь были
// неправдой. Рядом с каждой веткой — контроль: тот же конец прогона при запущенном
// бинарнике объясняется по-прежнему.
func TestVerdictWithoutTests(t *testing.T) {
	const (
		growth    = " — похоже на бесконечный рост (например, обход без visited)"
		coldCache = ", пока кэш компилятора пуст; запусти ещё раз — уже собранное осталось в кэше"
	)
	exit1 := errors.New("exit status 1")
	killed := errors.New("signal: killed")
	cgroup := runLimits{Deadline: 45 * time.Second, Mem: memLimiter{Mode: memCgroup, Bytes: 128 << 20}}
	rlimit := runLimits{Deadline: 45 * time.Second, Mem: memLimiter{Mode: memRlimit, Bytes: 2 << 30}}
	race := runLimits{Race: true, Deadline: 70 * time.Second, Mem: memLimiter{Mode: memCgroup, Bytes: 2 << 30}}
	for _, tt := range []struct {
		name              string
		stream            string
		end               runEnd
		lim               runLimits
		memLimit, timeout bool
		reason            string
		killed            string // пометка незавершённого теста, если он в потоке есть
	}{
		{name: "ограничитель не создал область", stream: streamNoBus, end: runEnd{runErr: exit1}, lim: cgroup,
			reason: "прогон не запустился: Failed to connect to bus: No such file or directory"},
		{name: "ограничителя нет в PATH", end: runEnd{runErr: errors.New(`exec: "systemd-run": executable file not found in $PATH`)}, lim: cgroup,
			reason: `прогон не запустился: exec: "systemd-run": executable file not found in $PATH`},
		{name: "контроль: ошибка компиляции — не «не запустился»", stream: streamCompileError, end: runEnd{runErr: exit1}, lim: cgroup},
		{name: "контроль: обычное падение теста — тоже", end: runEnd{runErr: exit1}, lim: cgroup,
			stream: `{"Action":"run","Test":"TestA"}` + "\n" + `{"Action":"fail","Test":"TestA"}` + "\n" + `{"Action":"fail"}` + "\n"},

		{name: "память кончилась на сборке: убит компоновщик", stream: streamLinkKilled, end: runEnd{hitMem: true, runErr: exit1}, lim: cgroup, memLimit: true,
			reason: "сборка упёрлась в предел памяти 128 МиБ, до тестов дело не дошло — предел мал для компилятора: перезапусти runner с -mem-mb побольше"},
		// область на 16 МиБ: ядро убивает сам `go`, он не успевает напечатать ничего
		{name: "память кончилась на сборке: убит сам go", end: runEnd{hitMem: true, runErr: killed}, lim: cgroup, memLimit: true,
			reason: "сборка упёрлась в предел памяти 128 МиБ, до тестов дело не дошло — предел мал для компилятора: перезапусти runner с -mem-mb побольше"},
		// prlimit ставится одному тестовому бинарнику: сборку под ним убивает ядро (docker --memory)
		{name: "память кончилась на сборке без своего предела", stream: streamLinkKilled, end: runEnd{hitMem: true, runErr: exit1}, lim: rlimit, memLimit: true,
			reason: "сборке не хватило памяти машины или контейнера, до тестов дело не дошло — освободи память или подними предел контейнера (docker --memory)"},
		{name: "контроль: память кончилась в запущенном бинарнике", stream: streamBinaryStarted, end: runEnd{hitMem: true, runErr: exit1}, lim: cgroup, memLimit: true,
			reason: "прогон: упёрлось в предел памяти 128 МиБ" + growth},
		{name: "контроль: память кончилась в тесте", stream: streamTestRunning, end: runEnd{hitMem: true, runErr: exit1}, lim: cgroup, memLimit: true,
			reason: "TestHang: упёрлось в предел памяти 128 МиБ" + growth, killed: "memory"},

		{name: "срок вышел на сборке", end: runEnd{ctxErr: context.DeadlineExceeded, runErr: killed}, lim: cgroup, timeout: true,
			reason: "прогон не уложился в 45s и остановлен целиком: не успела закончиться сборка — так бывает на первом запуске" + coldCache},
		{name: "срок вышел на сборке с -race", end: runEnd{ctxErr: context.DeadlineExceeded, runErr: killed}, lim: race, timeout: true,
			reason: "прогон не уложился в 1m10s и остановлен целиком: не успела закончиться сборка — так бывает на первом запуске с -race" + coldCache},
		{name: "контроль: срок вышел в запущенном бинарнике", stream: streamBinaryStarted, end: runEnd{ctxErr: context.DeadlineExceeded, runErr: killed}, lim: cgroup, timeout: true,
			reason: "прогон не уложился в 45s и остановлен целиком — похоже на бесконечный цикл"},
		{name: "контроль: срок вышел в тесте", stream: streamTestRunning, end: runEnd{ctxErr: context.DeadlineExceeded, runErr: killed}, lim: cgroup, timeout: true,
			reason: "прогон не уложился в 45s и остановлен целиком — похоже на бесконечный цикл", killed: "timeout"},
		// ушёл клиент или останавливается сервер: это не «не запустился»
		{name: "контроль: отмена до первого события", end: runEnd{ctxErr: context.Canceled, runErr: killed}, lim: cgroup},
	} {
		t.Run(tt.name, func(t *testing.T) {
			res := parseTestOutput([]byte(tt.stream))
			verdict(&res, tt.end, tt.lim)
			if res.Reason != tt.reason || res.MemLimit != tt.memLimit || res.Timeout != tt.timeout || res.OK || res.NoTests {
				t.Fatalf("memLimit=%v timeout=%v ok=%v noTests=%v\nпричина:   %q\nожидалась: %q", res.MemLimit, res.Timeout, res.OK, res.NoTests, res.Reason, tt.reason)
			}
			if tt.stream == streamTestRunning && (len(res.Tests) != 1 || res.Tests[0].Killed != tt.killed) {
				t.Fatalf("незавершённый тест не помечен %q: %+v", tt.killed, res.Tests)
			}
		})
	}
}

// Пакет собрался, а запускать нечего: причину называет обработчик — имена из
// фильтра знает только он.
func TestNoTestsReason(t *testing.T) {
	for want, filter := range map[string][]string{
		"ни один тест не запустился — в пакете нет тестов с такими именами: TestNope":          {"TestNope"},
		"ни один тест не запустился — в пакете нет тестов с такими именами: TestNope, TestZzz": {"TestNope", "TestZzz"},
		"ни один тест не запустился — в пакете нет тестов":                                     nil,
	} {
		if got := noTestsReason(filter); got != want {
			t.Errorf("noTestsReason(%q) = %q, ожидалось %q", filter, got, want)
		}
	}
}

// Вывод одного теста склеивался через `+=` — квадрат от числа событий. Меряем
// выделенные байты, а не время: от машины они не зависят. Замер на потоке у потолка
// (4 МиБ, 18 893 события): прежний код — 17 345 МиБ и 2,9 с, новый — 20 МиБ, под
// -race — 187 МиБ. Порог 1 ГиБ стоит между ними с запасом в обе стороны.
func TestParseLongOutputIsLinear(t *testing.T) {
	for _, printer := range []string{"TestFlood", "TestFlood/случай"} { // печатает сам тест либо его подтест
		line := `{"Time":"2026-10-07T15:49:06.384468479+03:00","Action":"output","Package":"probe/flood","Test":"` + printer + `","Output":"` +
			strings.Repeat("x", 100) + `\n"}` + "\n"
		stream := []byte(`{"Action":"run","Package":"probe/flood","Test":"TestFlood"}` + "\n" + strings.Repeat(line, maxRunOutput/len(line)))
		var before, after runtime.MemStats
		runtime.ReadMemStats(&before)
		res := parseTestOutput(stream)
		runtime.ReadMemStats(&after)
		if len(res.Tests) != 1 || len(res.Tests[0].Output) != 101*(maxRunOutput/len(line)) {
			t.Fatalf("%s: вывод теста потерян: тестов %d", printer, len(res.Tests))
		}
		if got, limit := after.TotalAlloc-before.TotalAlloc, uint64(256*len(stream)); got > limit {
			t.Fatalf("%s: на поток в %d МиБ выделено %d МиБ, допустимо %d: склейка вывода теста не линейна", printer, len(stream)>>20, got>>20, limit>>20)
		}
	}
}

func TestCappedBuffer(t *testing.T) {
	full := 0
	c := &cappedBuffer{limit: 10, onFull: func() { full++ }}
	for i := range 3 { // писатель обязан «принять» всё: ошибка записи убила бы процесс
		if n, err := c.Write([]byte("123456")); n != 6 || err != nil {
			t.Fatalf("Write = %d, %v", n, err)
		}
		if want := min(i, 1); full != want { // потолок — на второй записи, и сообщают о нём один раз
			t.Fatalf("после записи %d onFull вызван %d раз, ожидалось %d", i+1, full, want)
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
	// ни один тест не стартовал: винить бесконечный цикл в решении не в чем
	if strings.Contains(res.Reason, "бесконечный цикл") || !strings.Contains(res.Reason, "не успела закончиться сборка") {
		t.Fatalf("срок вышел на сборке, а причина — %q", res.Reason)
	}
}

// Срок вышел на сборке харнесса трассы: это не «код не скомпилировался» —
// trace-viz.js узнаёт ошибку сборки по build === false и показал бы пустой вывод
// компилятора. Отмена (ушёл клиент, останавливается сервер) — тоже не она.
func TestTraceBuildTimeout(t *testing.T) {
	lim := runLimits{Deadline: 5 * time.Second, BuildTimeout: time.Nanosecond, MaxOutput: maxRunOutput}
	resp := runTraceHarness(context.Background(), t.TempDir(), "F", "p.F()", lim)
	want := "сборка трассы не уложилась в 1ns — так бывает на первом запуске, пока кэш компилятора пуст; запусти ещё раз — уже собранное осталось в кэше"
	if !resp.Build || !resp.Timeout || resp.OK || resp.Reason != want || resp.Output != "" {
		t.Fatalf("срок сборки: build=%v timeout=%v ok=%v reason=%q output=%q", resp.Build, resp.Timeout, resp.OK, resp.Reason, resp.Output)
	}
	gone, cancel := context.WithCancel(context.Background())
	cancel()
	lim.BuildTimeout = time.Minute
	resp = runTraceHarness(gone, t.TempDir(), "F", "p.F()", lim)
	if !resp.Build || resp.Timeout || resp.OK || resp.Reason != "сборка трассы прервана: runner останавливается или запрос отменён" {
		t.Fatalf("отмена сборки: build=%v timeout=%v ok=%v reason=%q", resp.Build, resp.Timeout, resp.OK, resp.Reason)
	}
}
