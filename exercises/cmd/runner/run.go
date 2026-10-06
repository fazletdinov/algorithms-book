// Прогон `go test` на коде читателя: пределы времени и вывода и разбор потока
// событий `go test -json` в ответ /api/run.
package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"os"
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
type runLimits struct {
	Race        bool
	TestTimeout time.Duration
	Deadline    time.Duration
	MaxOutput   int
}

func defaultLimits(race bool) runLimits {
	lim := runLimits{Race: race, TestTimeout: 20 * time.Second, MaxOutput: maxRunOutput}
	if race {
		lim.TestTimeout = 45 * time.Second // -race в разы медленнее
	}
	lim.Deadline = lim.TestTimeout + 25*time.Second // запас на сборку: холодный кэш, -race
	return lim
}

// cappedBuffer копит не больше limit байт, остальное отбрасывает.
type cappedBuffer struct {
	buf       bytes.Buffer
	limit     int
	truncated bool
}

func (c *cappedBuffer) Write(p []byte) (int, error) {
	if room := c.limit - c.buf.Len(); room < len(p) {
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
}

type testEvent struct {
	Name   string `json:"name"`
	Pass   bool   `json:"pass"`
	Output string `json:"output"`
	// Killed — почему тест не завершился сам ("timeout"); пусто у обычных
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

func runGoTest(ctx context.Context, dir string, args []string, lim runLimits) testResult {
	ctx, cancel := context.WithTimeout(ctx, lim.Deadline)
	defer cancel()
	out := &cappedBuffer{limit: lim.MaxOutput}
	cmd := groupCommand(ctx, "go", args...)
	cmd.Dir = dir
	// GOFLAGS= — не тащим внешние теги; GOWORK=off — изолируем тест во временной
	// копии от go.work в корне репозитория (иначе модуль резолвится в настоящий
	// ./exercises и правки пользователя игнорируются).
	cmd.Env = append(os.Environ(), "GOFLAGS=", "GOWORK=off")
	cmd.Stdout, cmd.Stderr = out, out

	start := time.Now()
	_ = cmd.Run() // код выхода не нужен: исход читается из событий и из ctx
	raw := out.buf.Bytes()
	if out.truncated {
		// Потолок режет поток посреди события: обрывок JSON ушёл бы в вывод как есть.
		raw = raw[:bytes.LastIndexByte(raw, '\n')+1]
	}
	res := parseTestOutput(raw)
	res.Duration = time.Since(start).Round(time.Millisecond).String()
	res.Truncated = out.truncated
	switch {
	case res.Timeout: // сработал -timeout бинарника: тест уже назван
	case ctx.Err() == context.DeadlineExceeded:
		res.Timeout = true
		markUnfinished(&res, "timeout")
		res.Reason = fmt.Sprintf("прогон не уложился в %s и остановлен целиком — похоже на бесконечный цикл", lim.Deadline)
	case out.truncated:
		res.Reason = fmt.Sprintf("вывод обрезан на %d КиБ — похоже на печать в бесконечном цикле; убери отладочный вывод и запусти снова", lim.MaxOutput>>10)
	}
	res.OK = res.Build && res.Failed == 0 && res.Passed > 0 && !res.Race && !res.Timeout && !res.Truncated
	return res
}

// parseTestOutput собирает результат из вывода `go test -json`. Чистая функция:
// поток событий проверяется тестом без запуска go. OK здесь не считается — его
// знает только runGoTest (срок прогона и обрезка вывода в потоке не видны).
func parseTestOutput(out []byte) testResult {
	var res testResult

	// go test -json пишет поток JSON-событий, НО отчёт детектора гонок (-race) и
	// паники рантайма печатаются сырым текстом в stderr — они не валидный JSON.
	// Поэтому разбираем построчно: валидный JSON → событие, иначе → в extra
	// (там окажется «WARNING: DATA RACE», stack trace и т.п.), чтобы не потерять.
	events := map[string]*testEvent{}
	var order []string
	var pkgOut, extra strings.Builder
	timeout := ""
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
		if m := timedOutRe.FindStringSubmatch(ev.Output); m != nil {
			timeout = m[1]
		}
		if ev.Test == "" {
			if ev.Action == "output" {
				pkgOut.WriteString(ev.Output)
			}
			continue
		}
		te := events[ev.Test]
		if te == nil {
			te = &testEvent{Name: ev.Test}
			events[ev.Test] = te
			order = append(order, ev.Test)
		}
		switch ev.Action {
		case "output":
			te.Output += ev.Output
		case "pass":
			te.Pass, te.done = true, true
		case "fail", "skip":
			te.Pass, te.done = false, true
		}
	}

	if len(order) == 0 {
		// Нет событий по тестам — пакет не собрался (или паника до тестов).
		res.Build = false
		res.Output = strings.TrimSpace(pkgOut.String() + "\n" + extra.String())
	} else {
		res.Build = true
		for _, name := range order {
			te := events[name]
			// показываем только верхнеуровневые тесты (без подтестов с '/')
			if strings.Contains(name, "/") {
				continue
			}
			res.Tests = append(res.Tests, *te)
			if te.Pass {
				res.Passed++
			} else {
				res.Failed++
			}
		}
		// в общий вывод добавляем сырой текст (отчёт о гонке / паника), если был
		res.Output = strings.TrimSpace(pkgOut.String() + "\n" + extra.String())
	}

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
