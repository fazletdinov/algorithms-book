// Прогон `go test` на коде читателя: пределы времени и вывода и разбор потока
// событий `go test -json` в ответ /api/run.
package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

// maxRunOutput — потолок сырого вывода прогона: решение с fmt.Println в
// бесконечном цикле иначе раздувало память самого сервера.
const maxRunOutput = 4 << 20

// runLimits — пределы одного прогона. TestTimeout уходит в `go test -timeout`:
// бинарник сам падает с «panic: test timed out», называет тест и печатает стек.
// Deadline — запасной срок на всё (сборка + тесты); по нему убивается группа.
// BuildTimeout — срок сборки харнесса трассы: она идёт отдельной командой, и
// Deadline у трассы — срок одного запуска. Mem — предел памяти (mem.go); нулевое
// значение — без предела.
type runLimits struct {
	Race         bool
	TestTimeout  time.Duration
	Deadline     time.Duration
	BuildTimeout time.Duration
	MaxOutput    int
	Mem          memLimiter
}

func defaultLimits(race bool) runLimits {
	lim := runLimits{Race: race, TestTimeout: 20 * time.Second, MaxOutput: maxRunOutput}
	if race {
		lim.TestTimeout = 45 * time.Second // -race в разы медленнее
	}
	lim.Deadline = lim.TestTimeout + 25*time.Second // запас на сборку: холодный кэш, -race
	return lim
}

// cappedBuffer копит не больше limit байт, остальное отбрасывает. onFull зовётся
// один раз, когда вывод упёрся в потолок: читать дальше нечего, и владелец буфера
// останавливает процесс сразу, а не ждёт его срока.
type cappedBuffer struct {
	buf       bytes.Buffer
	limit     int
	truncated bool
	onFull    func()
}

func (c *cappedBuffer) Write(p []byte) (int, error) {
	if room := c.limit - c.buf.Len(); room < len(p) {
		if !c.truncated && c.onFull != nil {
			c.onFull()
		}
		c.truncated = true
		c.buf.Write(p[:max(room, 0)])
		return len(p), nil // «приняли» всё: ошибка записи убила бы процесс и подменила картину
	}
	return c.buf.Write(p)
}

type testResult struct {
	OK       bool        `json:"ok"`       // все тесты прошли, сборка успешна, гонок и остановок нет
	Build    bool        `json:"build"`    // компиляция удалась
	Race     bool        `json:"race"`     // детектор -race нашёл гонку данных
	Passed   int         `json:"passed"`   //
	Failed   int         `json:"failed"`   //
	Tests    []testEvent `json:"tests"`    // по тесту
	Output   string      `json:"output"`   // сырой вывод (ошибка сборки / отчёт о гонке)
	Duration string      `json:"duration"` //
	// Filtered — гонялись не все тесты пакета, а только запрошенные. Тогда
	// OK значит «эта функция готова», а не «пакет решён», и клиент не должен
	// записывать пакет в решённые.
	Filtered bool `json:"filtered,omitempty"`
	// Timeout и Truncated — прогон не дошёл до конца сам: вышел срок (теста или
	// всего прогона) либо вывод упёрся в потолок. Reason — готовая фраза для
	// читателя; без неё зависшее решение выглядело как немое «есть падения».
	Timeout   bool   `json:"timeout,omitempty"`
	Truncated bool   `json:"truncated,omitempty"`
	Reason    string `json:"reason,omitempty"`
	// MemLimit — прогон упёрся в предел памяти (mem.go); Timeout при этом ложен:
	// остановила память, а не срок.
	MemLimit bool `json:"memLimit,omitempty"`
	// NoTests — пакет собрался и отработал, но ни один тест не запустился: фильтр
	// tests не совпал ни с одним именем. Build при этом истинен, OK ложен.
	NoTests bool `json:"noTests,omitempty"`

	// Докуда дошёл прогон по потоку событий. В ответ не идут — по ним verdict
	// называет причину, когда до тестов дело не дошло.
	events  bool // go test напечатал хоть одно событие: команда запустилась
	started bool // сборка удалась, тестовый бинарник запущен
}

// testEvent — тест верхнего уровня. Output — его вывод вместе с выводом подтестов
// (случаев таблицы) в порядке печати; случаи, прошедшие молча, опущены.
type testEvent struct {
	Name   string `json:"name"`
	Pass   bool   `json:"pass"`
	Output string `json:"output"`
	// Killed — почему тест не завершился сам ("timeout", "memory"); пусто у обычных
	// pass/fail.
	Killed string `json:"killed,omitempty"`
	done   bool   // пришло pass/fail/skip: тест завершился сам
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

// goEnv — окружение `go` во временной копии модуля dir. GOFLAGS= — не тащим внешние
// теги; GOWORK=off — изолируем копию от go.work в корне репозитория (иначе модуль
// резолвится в настоящий ./exercises и правки пользователя игнорируются). GOTMPDIR
// — рабочий каталог go (go-build…, в нём собранный бинарник) внутрь копии: `go`,
// убитый SIGKILL по сроку или на потолке вывода, его за собой не убирает, и в
// системном /tmp с каждой такой остановки оставались мегабайты.
func goEnv(dir string) []string {
	env := append(os.Environ(), "GOFLAGS=", "GOWORK=off")
	if tmp := filepath.Join(dir, ".gotmp"); os.MkdirAll(tmp, 0o755) == nil {
		env = append(env, "GOTMPDIR="+tmp)
	}
	return env
}

func runGoTest(ctx context.Context, dir string, args []string, lim runLimits) testResult {
	ctx, cancel := context.WithTimeout(ctx, lim.Deadline)
	defer cancel()
	// Потолок вывода — остановка сразу (cancel убивает группу): иначе читатель ждал
	// ответа весь срок теста, а `go test` всё это время копил вывод теста у себя в
	// памяти — у него потолка нет (cmd/go, streamAndCacheOutput).
	out := &cappedBuffer{limit: lim.MaxOutput, onFull: cancel}
	unit := unitName()
	cmd := lim.Mem.command(ctx, unit, lim.Race, args)
	cmd.Dir = dir
	cmd.Env = goEnv(dir)
	cmd.Stdout, cmd.Stderr = out, out

	start := time.Now()
	runErr := cmd.Run() // код выхода не нужен (исход — в событиях и в ctx), важно только «не запустилась вовсе»
	// Срок и длительность снимаем сразу: опрос области и разбор полного буфера идут
	// секунды, и прогон, закончившийся у самого срока, получал бы «остановлен целиком».
	ctxErr := ctx.Err()
	duration := time.Since(start).Round(time.Millisecond).String()
	bg := context.WithoutCancel(ctx) // срок прогона мог выйти, а итог области ещё нужен
	hit := lim.Mem.hitLimit(bg, unit, out.buf.Bytes())
	if lim.Mem.Mode == memCgroup {
		cleanupUnit(bg, unit)
	}
	raw := out.buf.Bytes()
	if out.truncated {
		// Потолок режет поток посреди события: обрывок JSON ушёл бы в вывод как есть.
		raw = raw[:bytes.LastIndexByte(raw, '\n')+1]
	}
	res := parseTestOutput(raw)
	res.Duration = duration
	verdict(&res, runEnd{hitMem: hit, ctxErr: ctxErr, runErr: runErr, truncated: out.truncated}, lim)
	return res
}

// runEnd — чем кончился прогон помимо потока событий: то, что runGoTest видит сам.
type runEnd struct {
	hitMem    bool  // упёрся в предел памяти (memLimiter.hitLimit)
	ctxErr    error // контекст сразу после Run: вышел запасной срок или ушёл клиент
	runErr    error // что вернул cmd.Run
	truncated bool  // вывод упёрся в потолок
}

// verdict дописывает в разобранный поток исход прогона: вид остановки, причину и
// OK. Чистая функция — ветки проверяются таблицей, без запуска go. Пока тестовый
// бинарник не запущен (res.started ложно), остановлена сборка, а не решение: винить
// «бесконечный цикл» и «обход без visited» тогда не в чем.
func verdict(res *testResult, end runEnd, lim runLimits) {
	res.Truncated = end.truncated
	switch {
	case end.hitMem: // первой: у самого предела тест может ещё и не уложиться в срок, но причина — память
		res.MemLimit, res.Timeout = true, false
		if !res.started {
			res.Reason = starvedBuild(lim.Mem)
			break
		}
		who := strings.Join(markUnfinished(res, "memory"), ", ")
		if who == "" {
			who = "прогон"
		}
		res.Reason = fmt.Sprintf("%s: упёрлось в предел памяти %s — похоже на бесконечный рост (например, обход без visited)", who, lim.Mem.limitText(lim.Race))
	case res.Timeout: // сработал -timeout бинарника: тест уже назван
	case end.ctxErr == context.DeadlineExceeded:
		res.Timeout = true
		stopped := fmt.Sprintf("прогон не уложился в %s и остановлен целиком", lim.Deadline)
		if !res.started {
			res.Reason = stopped + ": не успела закончиться сборка — " + slowBuildHint(lim.Race)
			break
		}
		markUnfinished(res, "timeout")
		res.Reason = stopped + " — похоже на бесконечный цикл"
	case end.ctxErr == nil && end.runErr != nil && !res.events:
		// Ни одного события go test: не запустился он сам или ограничитель памяти
		// перед ним (systemd-run не создал область). Без причины это выглядело бы
		// ошибкой компиляции с чужим текстом вместо вывода компилятора.
		res.Reason = "прогон не запустился: " + launchCause(end.runErr, res.Output)
	case end.truncated:
		res.Reason = fmt.Sprintf("вывод обрезан на %d КиБ, прогон остановлен — похоже на печать в бесконечном цикле; убери отладочный вывод и запусти снова", lim.MaxOutput>>10)
	}
	res.OK = res.Build && res.Failed == 0 && res.Passed > 0 && !res.Race && !res.Timeout && !res.Truncated && !res.MemLimit
}

// Причины остановки до тестов — общие для прогона и трассы (trace.go).

// launchCause — что помешало запуску: первая строка вывода (ею объясняются
// systemd-run, prlimit и сам go), а без вывода — ошибка запуска команды.
func launchCause(runErr error, out string) string {
	if line, _, _ := strings.Cut(strings.TrimSpace(out), "\n"); line != "" {
		return strings.TrimSpace(line)
	}
	return runErr.Error()
}

// slowBuildHint — что сказать, когда срок вышел на сборке.
func slowBuildHint(race bool) string {
	first := "на первом запуске"
	if race { // под детектор гонок стандартная библиотека собирается заново
		first += " с -race"
	}
	return "так бывает " + first + ", пока кэш компилятора пуст; запусти ещё раз — уже собранное осталось в кэше"
}

// starvedBuild — упор в память до запуска тестов. Свой предел сборке ставит только
// область cgroup (prlimit — одному тестовому бинарнику); в остальных режимах
// компилятор убивает ядро: кончилась память машины или контейнера.
func starvedBuild(m memLimiter) string {
	if m.Mode == memCgroup {
		return fmt.Sprintf("сборка упёрлась в предел памяти %s, до тестов дело не дошло — предел мал для компилятора: перезапусти runner с -mem-mb побольше", humanBytes(m.Bytes))
	}
	return "сборке не хватило памяти машины или контейнера, до тестов дело не дошло — освободи память или подними предел контейнера (docker --memory)"
}

// noTestsReason — пакет собрался, а запускать оказалось нечего (testResult.NoTests).
// Зовёт обработчик: имена из фильтра знает только он.
func noTestsReason(filter []string) string {
	if len(filter) == 0 {
		return "ни один тест не запустился — в пакете нет тестов"
	}
	return "ни один тест не запустился — в пакете нет тестов с такими именами: " + strings.Join(filter, ", ")
}

// frameworkLine — служебная строка тестового бинарника («=== RUN   TestX/случай»,
// «--- PASS: TestX/случай (0.00s)»), а не то, что напечатал тест или решение.
func frameworkLine(s string) bool {
	return strings.HasPrefix(s, "=== ") || strings.HasPrefix(s, "--- ")
}

// parseTestOutput собирает результат из вывода `go test -json`. Чистая функция:
// поток событий проверяется тестом без запуска go. OK здесь не считается — его
// знает только verdict (срок прогона и обрезка вывода в потоке не видны).
func parseTestOutput(out []byte) testResult {
	var res testResult

	// go test -json пишет поток JSON-событий, НО отчёт детектора гонок (-race) и
	// паники рантайма печатаются сырым текстом в stderr — они не валидный JSON.
	// Поэтому разбираем построчно: валидный JSON → событие, иначе → в extra
	// (там окажется «WARNING: DATA RACE», stack trace и т.п.), чтобы не потерять.
	//
	// В ответе строки только у тестов верхнего уровня: по ним идут счёт, фильтр tests
	// и карточки повторений. Но случаи табличного теста — подтесты (t.Run), и сообщение
	// упавшего случая `go test` приписывает подтесту «TestX/случай», а самому TestX —
	// только «=== RUN» и «--- FAIL». Поэтому вывод подтестов вливается в вывод их теста,
	// в порядке событий — как это печатает сам `go test`.
	type subtest struct {
		passed bool // пришло событие pass
		loud   bool // печатал что-то кроме служебных строк
	}
	type chunk struct {
		sub  *subtest // nil — печатал сам тест верхнего уровня
		text string
	}
	type running struct {
		testEvent
		chunks []chunk // куски, а не `Output += …`: тот на 4 МиБ вывода одного теста давал квадрат и секунды
		subs   map[string]*subtest
	}
	tests := map[string]*running{}
	var order []string
	var pkgOut, extra strings.Builder
	timeout := ""
	pkgStarted, pkgPassed, buildFailed := false, false, false
	for _, line := range bytes.Split(out, []byte("\n")) {
		if len(bytes.TrimSpace(line)) == 0 {
			continue
		}
		var ev struct {
			Action string `json:"Action"`
			Test   string `json:"Test"`
			Output string `json:"Output"`
		}
		if err := json.Unmarshal(line, &ev); err != nil {
			extra.Write(line)
			extra.WriteByte('\n')
			continue
		}
		res.events = res.events || ev.Action != ""
		if m := timedOutRe.FindStringSubmatch(ev.Output); m != nil {
			timeout = m[1]
		}
		if ev.Test == "" {
			switch ev.Action {
			case "output", "build-output":
				// build-output — текст компилятора: с Go 1.24 он идёт событиями, а не
				// сырыми строками, и без этой ветки от ошибки компиляции оставалось
				// одно «FAIL … [build failed]».
				pkgOut.WriteString(ev.Output)
			case "build-fail":
				buildFailed = true
			case "start":
				pkgStarted = true
			case "pass":
				pkgPassed = true
			}
			continue
		}
		top, _, nested := strings.Cut(ev.Test, "/")
		te := tests[top]
		if te == nil {
			te = &running{testEvent: testEvent{Name: top}, subs: map[string]*subtest{}}
			tests[top] = te
			order = append(order, top)
		}
		var sub *subtest
		if nested {
			if sub = te.subs[ev.Test]; sub == nil {
				sub = &subtest{}
				te.subs[ev.Test] = sub
			}
		}
		switch {
		case ev.Action == "output":
			te.chunks = append(te.chunks, chunk{sub, ev.Output})
			if sub != nil && !frameworkLine(ev.Output) {
				sub.loud = true
			}
		case sub != nil: // исход подтеста на счёт и на исход его теста не влияет
			sub.passed = sub.passed || ev.Action == "pass"
		case ev.Action == "pass":
			te.Pass, te.done = true, true
		case ev.Action == "fail", ev.Action == "skip":
			te.Pass, te.done = false, true
		}
	}

	// Событие start у пакета приходит и после неудачной сборки (за ним — «FAIL …
	// [build failed]»), поэтому одного его мало.
	res.started = len(order) > 0 || pkgStarted && !buildFailed
	// Событий тестов нет, а пакет прошёл: он собрался, но запускать было нечего —
	// фильтр -run не совпал ни с одним именем. Без pass у пакета это по-прежнему «не
	// собрался» (или бинарник упал до первого теста: паника в init, TestMain).
	res.NoTests = len(order) == 0 && pkgPassed
	res.Build = len(order) > 0 || res.NoTests
	for _, name := range order {
		te := tests[name]
		var output strings.Builder
		for _, c := range te.chunks {
			// Случай, который прошёл молча, в подробностях только заслонял бы упавшие:
			// от него остались бы «=== RUN» и «--- PASS». Если он что-то печатал
			// (отладочная печать читателя) — показываем целиком.
			if c.sub != nil && c.sub.passed && !c.sub.loud {
				continue
			}
			output.WriteString(c.text)
		}
		te.Output = output.String()
		res.Tests = append(res.Tests, te.testEvent)
		if te.Pass {
			res.Passed++
		} else {
			res.Failed++
		}
	}
	// текст компилятора либо сырой текст рядом с событиями (отчёт о гонке, паника)
	res.Output = strings.TrimSpace(pkgOut.String() + "\n" + extra.String())

	// Отчёт детектора гонок -race приходит как per-test output ("WARNING: DATA
	// RACE"), поэтому ищем по всему сырому выводу, а не только в extra.
	res.Race = bytes.Contains(out, []byte("DATA RACE"))

	if timeout != "" { // у зависшего теста события fail нет — он просто не завершён
		res.Timeout = true
		res.Reason = fmt.Sprintf("тест %s не уложился в %s — похоже на бесконечный цикл",
			strings.Join(markUnfinished(&res, "timeout"), ", "), timeout)
	}
	return res
}
