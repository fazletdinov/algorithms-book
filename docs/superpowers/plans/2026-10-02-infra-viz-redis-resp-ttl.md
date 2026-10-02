# Infra-viz: Redis — виджеты `redis-resp` и `redis-ttl`, эталон из кода (golden) и лаборатория `redislab/` с настоящим Redis — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Показать, что идёт по проводу между клиентом и Redis (разбор RESP-запроса байт за байтом, как это делает `ReadCommand`) и как работает TTL с ленивым удалением (как это делает `Store.live` и команды `SET/GET/EXPIRE/TTL/DEL`), сверить модель виджетов с НАСТОЯЩИМ кодом мини-Redis из `exercises/miniredis` через «золотой» файл (без Docker), а различия между мини-Redis и НАСТОЯЩИМ Redis — измерить на лаборатории `redislab/` (Redis в контейнере по образцу `pglab/`), чтобы в главе вместо «по документации» стояли измеренные факты.

**Architecture:** Новый файл темы `assets/infra-redis.js` (первый файл темы после разделения: заголовок `var core = …`, блоки `INFRA`/`CODE` в 4-пробельном формате, своя регистрация; вписывается в `book.toml` вручную). Эталон: Go-тест `exercises/miniredis/golden_solution_test.go` (тег `solution`) гоняет реальные `ReadCommand`/`Dispatch` по сценариям и пишет `scripts/fixtures/redis-golden.json`; режим проверки (без `-update`) падает, если файл устарел, поэтому CI (`go test -tags solution ./...`) держит его свежим. Node-тесты прогоняют JS-модель по тем же сценариям и требуют полного совпадения. Лаборатория `redislab/` (`make redis-lab`) даёт настоящий Redis для замеров: байты на проводе, округление `TTL`, активное удаление; результаты замеров идут в главу как «измерено на Redis 7.4.x». Виджеты встраиваются в главу `miniredis.md` (этап 1 и этап 3).

**Tech Stack:** Go 1.24 (`bufio`, `bytes`, `encoding/json`), vanilla JS (без сборщика), mdBook, jsdom (`npm i --no-save jsdom`), Playwright MCP для проверки в браузере; Docker и образ `redis:7.4-alpine` — ТОЛЬКО в Task 4 (лаборатория и замеры); golden, модель и тесты от Docker не зависят и в CI Docker не нужен.

**Spec:** `docs/superpowers/specs/2026-10-01-infra-visualization-design.md` (виджеты Redis: `redis-resp`, `redis-ttl`; `redis-persist` — отдельный следующий план). Предыдущие планы (слиты): `…-foundation-pg-page.md`, `…-pg-scans.md`, `…-split-pg-join.md`.

## Global Constraints

- Язык контента русский, код листингов Go (спека).
- Формат файла темы (его разбирают регэкспами `check-viz.js` и остальные проверки): записи `    "тип": {` с отступом 4 пробела внутри `var INFRA = {`, листинги в `var CODE = {`, оба блока закрываются `\n  };`; регистрация `Object.keys(INFRA).forEach(…)` в конце файла; генераторы — чистые функции ДО строки-стража `if (typeof window === "undefined" || !window.ALGO_VIZ) return;` и экспортируются через `exportsForTest`; файл начинается с `var core = (typeof module !== "undefined" && module.exports) ? require("./infra-core.js") : window.ALGO_VIZ_INFRA;`; файл вписан в `book.toml` рядом с остальными (после `infra-pg.js`) — `infra-viz-check` падает, если не вписан.
- `register` бросает на дубликате типа или `codeKey`: имена `redis-resp`, `redis-ttl` и ключи листингов уникальны во всех файлах.
- Правила генераторов (CLAUDE.md): снимок = состояние ПОСЛЕ подсвеченной строки; одна строка листинга — один кадр (кроме явно описанных вызовов); чип — только переменная, живая на этой строке («—» до объявления, вне области видимости и на кадре `done`); имя чипа = идентификатор из листинга; листинг объявляет всё, что делает генератор; пресет задаёт РОВНО поля `inputs` типа и НЕ дублирует кнопку «пример главы» (её добавляет движок из исходных атрибутов).
- Уроки трёх предыдущих планов, обязательные здесь: (а) у каждого пункта легенды есть правило `.algo-tp__legdot--<cls>` с конкретным hex-цветом в `assets/infra-viz.css` (точки легенды вне виджета не видят его токенов) и тест выводит список классов из массива легенды в исходнике; легенда ПО ТИПАМ; (б) счётчики без «дробей-обманок», числа после двоеточия; (в) русские окончания через `core.plural` либо числа после двоеточия; (г) под виджетом в главе — предложение о том, что модель считает и чего нет; (д) никаких утверждений про НАСТОЯЩИЙ Redis без источника: то, что проверено кодом мини-Redis, подаётся как «в нашем мини-Redis»; то, что ИЗМЕРЕНО на `redislab/` (Task 4), подаётся как «измерено на Redis <точная версия из `INFO server`>» с воспроизводимой командой; только если образ скачать не удалось (Task 4 BLOCKED), допустимо «по документации Redis (здесь не мерили)» с ссылкой и явной пометкой; (е) терминология: слово «внешний/внутренний» тут не нужно.
- Эталон — реальный код: если модель расходится с golden, чинится МОДЕЛЬ (golden — правда о коде); если расхождение указывает на баг самого мини-Redis, сообщить, не править эталон молча.
- Критерии готовности: `node scripts/infra-viz-check.js`, `check-viz.js`, `check-registries.js`, `check-challenges.js`, `mdbook build` + `check-links.js`, `viz-render-check.js` (~25 мин), `check-viz-names.js` (~8 мин), `predict-check.js`, из `exercises/`: `gofmt -l .`, `go vet -tags solution ./...`, `go test -tags solution -count=1 ./...`, `go run ./cmd/checksnippets -src ../src` — зелёные; медленные jsdom-скрипты в фоне; soft-skip ≠ pass.
- Контекст среды: `main` опережает `origin` — ничего не пушить; работать в worktree (`.worktrees/`, в `.gitignore`); субагенты иногда падают с API 403 — `SendMessage`-resume обычно проходит; Docker Desktop может висеть — тогда работает системный Docker: `DOCKER_CONTEXT=default` (проверено в предыдущих планах); Docker используется только в Task 4.

## Review Focus

1. Парсер совпадает с реальным `ReadCommand` на КАЖДОМ golden-случае, включая: последние два байта bulk-строки не проверяются (Go читает `blen+2` и отбрасывает), пустая строка → `args = null`, `*0` → пустой массив, inline через `strings.Fields`, `\r\n` ВНУТРИ значения — это данные, а не конец, остаток после первой команды (конвейер) остаётся нетронутым, классификация EOF, число съеденных байт.
2. TTL: просроченный ключ остаётся в `data`, пока к нему не обратились (счётчик «в памяти»), и `GET/EXPIRE/TTL/DEL` лениво удаляют его через `live`; граница `now == exp` — уже просрочен; `SET` снимает TTL; `EXPIRE` с `sec ≤ 0` удаляет ключ и отвечает `1`; `TTL` отбрасывает дробную часть; `DEL` считает только живые.
3. Устаревший golden ловится: изменение эталона без `-update` роняет `go test -tags solution`; расхождение модели с golden роняет `infra-viz-check`.
4. Первый файл темы: запись в `book.toml` на месте и в правильном порядке, `check-viz` видит новые типы, дубликаты ловятся.
5. В главе нет неподтверждённых утверждений о настоящем Redis; поправлены обе формулировки «не подметает по таймеру» (глава и комментарий в `store.go`).
6. Каждое утверждение главы о настоящем Redis прослеживается до вывода замера в отчёте Task 4 (версия, команда, сырой вывод); лаборатория загружена только на loopback (включён `DEBUG`), воспроизводима (`make redis-lab`, скрипты в `redislab/`), не участвует в CI; расхождения «мини-Redis ≠ настоящий» показаны как расхождения, а не стёрты.

## File Structure

| Файл | Ответственность |
|---|---|
| `exercises/miniredis/golden_solution_test.go` (создать, тег `solution`) | сценарии разбора/ответов/TTL по реальному коду, пишет и сверяет `scripts/fixtures/redis-golden.json` |
| `scripts/fixtures/redis-golden.json` (создать, генерируется) | эталон для JS-тестов |
| `assets/infra-redis.js` (создать) | `bRespParse`/`respParse`/`respReply`, `parseScript`/`ttlExec`/`ttlSim`/`bTtl`, рисунки, записи INFRA (2), листинги CODE (2), регистрация |
| `assets/infra-viz.css` (изменить) | стили `.iv-redis*` + legdot-правила |
| `book.toml` (изменить) | подключить `assets/infra-redis.js` после `infra-pg.js` |
| `redislab/docker-compose.yml`, `redislab/measure.sh` (создать) | Redis в контейнере (loopback, порт 26379, `DEBUG` включён) и воспроизводимые замеры |
| `Makefile` (изменить) | цели `redis-lab`, `redis-cli`, `redis-lab-down` по образцу `pg-lab` |
| `scripts/infra-viz-check.js` (изменить) | golden-тесты модели, jsdom-тесты двух типов, легенда |
| `src/miniredis.md` (изменить) | подраздел про провод (этап 1), подраздел про ленивый TTL (этап 3), правка формулировки про Redis |
| `exercises/miniredis/store.go` (изменить, только комментарий) | исправить формулировку про «не подметает по таймеру» |
| `CLAUDE.md` (изменить) | пункт «Инфраструктурные виджеты»: Redis-типы, golden-механизм; абзац про `redislab/` рядом с `pglab/` |

---

### Task 1: Эталон — golden-тест по реальному коду мини-Redis

**Files:**
- Create: `exercises/miniredis/golden_solution_test.go`, `scripts/fixtures/redis-golden.json` (генерируется)

**Interfaces:**
- Produces: `scripts/fixtures/redis-golden.json` — объект `{ parse: [{name, raw, args, err, eof, consumed}], reply: [{name, preload, steps: [{args, reply}]}], ttl: [{name, script, steps: [{token, reply, data, expire}]}] }`; строки `raw`/`reply` — настоящие байты (в JSON с `\r\n`-экранированием); `args` — `null`, если `ReadCommand` вернул `nil`, иначе массив строк (в т.ч. пустой `[]`); `err` — `true`, если вернулась ошибка протокола, не связанная с концом потока; `eof` — `true`, если ошибка `io.EOF`/`io.ErrUnexpectedEOF`; `consumed` — сколько байт `raw` съел `ReadCommand`; `script` — токены через `"; "`; `data` — карта `data` ПОСЛЕ токена (включая просроченные, но не тронутые ключи); `expire` — карта ключ → смещение срока в миллисекундах от `t0`.
- Команда обновления: `cd exercises && go test -tags solution -run TestGolden -update ./miniredis/`; обычный запуск — проверка (без `-update`) и падение с этой подсказкой при расхождении или отсутствии файла.

- [ ] **Step 1: Падающий тест (файла golden ещё нет)** — создать `exercises/miniredis/golden_solution_test.go`:

```go
//go:build solution

package miniredis

import (
	"bufio"
	"bytes"
	"encoding/json"
	"errors"
	"flag"
	"io"
	"os"
	"strconv"
	"strings"
	"testing"
	"time"
)

// Эталон для JS-виджетов (assets/infra-redis.js): РЕАЛЬНЫЙ ReadCommand/Dispatch/Store по
// сценариям. Файл лежит в scripts/fixtures, чтобы его читали node-скрипты проверки. Если
// поведение эталонной реализации меняется, golden устаревает, этот тест падает с подсказкой,
// после обновления падает node-проверка модели — так модель виджетов не расходится с кодом.
var updateGolden = flag.Bool("update", false, "переписать scripts/fixtures/redis-golden.json")

const goldenPath = "../../scripts/fixtures/redis-golden.json"

type goldenParse struct {
	Name     string   `json:"name"`
	Raw      string   `json:"raw"`
	Args     []string `json:"args"`
	Err      bool     `json:"err"`
	EOF      bool     `json:"eof"`
	Consumed int      `json:"consumed"`
}

type goldenReplyStep struct {
	Args  []string `json:"args"`
	Reply string   `json:"reply"`
}

type goldenReply struct {
	Name    string            `json:"name"`
	Preload map[string]string `json:"preload"`
	Steps   []goldenReplyStep `json:"steps"`
}

type goldenTTLStep struct {
	Token  string            `json:"token"`
	Reply  string            `json:"reply"`
	Data   map[string]string `json:"data"`
	Expire map[string]int64  `json:"expire"`
}

type goldenTTL struct {
	Name   string          `json:"name"`
	Script string          `json:"script"`
	Steps  []goldenTTLStep `json:"steps"`
}

type goldenFile struct {
	Parse []goldenParse `json:"parse"`
	Reply []goldenReply `json:"reply"`
	TTL   []goldenTTL   `json:"ttl"`
}

func isEOFErr(err error) bool {
	return errors.Is(err, io.EOF) || errors.Is(err, io.ErrUnexpectedEOF)
}

func goldenParseCases() []goldenParse {
	cases := []struct{ name, raw string }{
		{"multibulk SET", "*3\r\n$3\r\nSET\r\n$3\r\nfoo\r\n$3\r\nbar\r\n"},
		{"multibulk GET", "*2\r\n$3\r\nGET\r\n$3\r\nfoo\r\n"},
		{"inline PING", "PING\r\n"},
		{"inline SET", "SET foo bar\r\n"},
		{"inline несколько пробелов", "SET   foo    bar\r\n"},
		{"inline только пробелы", "   \r\n"},
		{"пустая строка", "\r\n"},
		{"LF без CR", "PING\n"},
		{"в значении \\r\\n", "*3\r\n$3\r\nSET\r\n$1\r\nk\r\n$4\r\na\r\nb\r\n"},
		{"пустое значение $0", "*2\r\n$4\r\nECHO\r\n$0\r\n\r\n"},
		{"массив из нуля", "*0\r\n"},
		{"две команды подряд", "*1\r\n$4\r\nPING\r\n*1\r\n$4\r\nPING\r\n"},
		{"хвост после inline", "PING\r\nGET x\r\n"},
		{"плохой заголовок *x", "*x\r\n"},
		{"отрицательный заголовок *-1", "*-1\r\n"},
		{"слишком длинный массив", "*2000000\r\n"},
		{"нет $", "*1\r\nGET\r\n"},
		{"плохая длина $x", "*1\r\n$x\r\nGET\r\n"},
		{"отрицательная длина $-1", "*1\r\n$-1\r\n"},
		{"слишком длинная строка", "*1\r\n$999999999\r\nabc\r\n"},
		{"нет \\n в заголовке", "*2"},
		{"оборвано на заголовке", "*2\r\n$3\r\nGET\r\n"},
		{"оборвано внутри строки", "*2\r\n$3\r\nGET\r\n$3\r\nfo"},
		{"не хватает завершающего \\r\\n", "*1\r\n$3\r\nGET"},
		{"последние два байта не \\r\\n", "*1\r\n$3\r\nGETxx"},
		{"знак в длине +", "*+1\r\n$+3\r\nGET\r\n"},
		{"пустой ввод", ""},
	}
	out := make([]goldenParse, 0, len(cases))
	for _, c := range cases {
		rd := bytes.NewReader([]byte(c.raw))
		br := bufio.NewReader(rd)
		args, err := ReadCommand(br)
		consumed := len(c.raw) - rd.Len() - br.Buffered()
		out = append(out, goldenParse{
			Name: c.name, Raw: c.raw, Args: args,
			Err: err != nil && !isEOFErr(err), EOF: err != nil && isEOFErr(err),
			Consumed: consumed,
		})
	}
	return out
}

func replyBytes(r Reply) string {
	var buf bytes.Buffer
	w := bufio.NewWriter(&buf)
	_ = r.WriteTo(w)
	_ = w.Flush()
	return buf.String()
}

func goldenReplyCases() []goldenReply {
	scenarios := []struct {
		name    string
		preload map[string]string
		cmds    [][]string
	}{
		{"служебные", map[string]string{}, [][]string{
			{"PING"}, {"PING", "привет"}, {"ping", "hi"}, {"PING", "a", "b"}, {"ECHO", "world"}, {"ECHO"}, {"FOO"}, {"foo", "x"},
		}},
		{"SET/GET/DEL", map[string]string{"foo": "bar"}, [][]string{
			{"GET", "foo"}, {"GET", "missing"}, {"SET", "n", "5"}, {"GET", "n"}, {"get", "n"}, {"SET", "k"}, {"GET"},
			{"DEL", "n"}, {"DEL", "n"}, {"DEL", "foo", "missing", "n"}, {"DEL"},
		}},
	}
	out := make([]goldenReply, 0, len(scenarios))
	for _, sc := range scenarios {
		store := NewStore()
		for k, v := range sc.preload {
			store.data[k] = v
		}
		g := goldenReply{Name: sc.name, Preload: sc.preload}
		for _, cmd := range sc.cmds {
			g.Steps = append(g.Steps, goldenReplyStep{Args: cmd, Reply: replyBytes(Dispatch(store, cmd))})
		}
		out = append(out, g)
	}
	return out
}

func goldenTTLCases() []goldenTTL {
	scripts := []struct {
		name   string
		tokens []string
	}{
		{"ленивое удаление по GET", []string{"SET session abc", "EXPIRE session 3", "+2", "TTL session", "+2", "GET session", "TTL session"}},
		{"просрочен, но лежит в памяти", []string{"SET a 1", "EXPIRE a 1", "+5", "SET b 2", "DEL b"}},
		{"SET снимает TTL", []string{"SET a 1", "EXPIRE a 2", "SET a 2", "+5", "TTL a", "GET a"}},
		{"TTL отбрасывает дробную часть", []string{"SET a 1", "EXPIRE a 3", "+0.5", "TTL a", "+2.4", "TTL a", "+0.1", "TTL a"}},
		{"EXPIRE 0 удаляет", []string{"SET a 1", "EXPIRE a 0", "GET a", "TTL a"}},
		{"EXPIRE отрицательный", []string{"SET a 1", "EXPIRE a -5", "GET a"}},
		{"DEL считает только живые", []string{"SET a 1", "EXPIRE a 1", "+2", "DEL a", "DEL a"}},
		{"граница now == exp", []string{"SET a 1", "EXPIRE a 2", "+1.999", "GET a", "+0.001", "GET a"}},
		{"EXPIRE на отсутствующем", []string{"EXPIRE nope 5", "TTL nope", "GET nope"}},
		{"TTL без срока", []string{"SET a 1", "TTL a"}},
		{"EXPIRE дважды сбрасывает срок", []string{"SET a 1", "EXPIRE a 2", "+1", "EXPIRE a 5", "+3", "TTL a"}},
		{"EXPIRE на просроченном", []string{"SET a 1", "EXPIRE a 1", "+2", "EXPIRE a 10", "GET a"}},
		{"TTL на просроченном", []string{"SET a 1", "EXPIRE a 1", "+2", "TTL a", "GET a"}},
	}
	out := make([]goldenTTL, 0, len(scripts))
	for _, sc := range scripts {
		t0 := time.Unix(1_700_000_000, 0)
		store, advance := newStoreForTest(t0)
		g := goldenTTL{Name: sc.name, Script: strings.Join(sc.tokens, "; ")}
		for _, tok := range sc.tokens {
			step := goldenTTLStep{Token: tok}
			if strings.HasPrefix(tok, "+") {
				sec, err := strconv.ParseFloat(tok[1:], 64)
				if err != nil {
					panic(err)
				}
				advance(time.Duration(sec * float64(time.Second)))
			} else {
				step.Reply = replyBytes(Dispatch(store, strings.Fields(tok)))
			}
			step.Data = make(map[string]string, len(store.data))
			for k, v := range store.data {
				step.Data[k] = v
			}
			step.Expire = make(map[string]int64, len(store.expire))
			for k, v := range store.expire {
				step.Expire[k] = v.Sub(t0).Milliseconds()
			}
			g.Steps = append(g.Steps, step)
		}
		out = append(out, g)
	}
	return out
}

func TestGolden(t *testing.T) {
	got, err := json.MarshalIndent(goldenFile{Parse: goldenParseCases(), Reply: goldenReplyCases(), TTL: goldenTTLCases()}, "", "  ")
	if err != nil {
		t.Fatal(err)
	}
	got = append(got, '\n')
	if *updateGolden {
		if err := os.WriteFile(goldenPath, got, 0o644); err != nil {
			t.Fatal(err)
		}
		return
	}
	want, err := os.ReadFile(goldenPath)
	if err != nil {
		t.Fatalf("нет %s: сгенерируй командой `go test -tags solution -run TestGolden -update ./miniredis/` (из exercises/): %v", goldenPath, err)
	}
	if !bytes.Equal(got, want) {
		t.Fatalf("%s устарел относительно эталонной реализации: `go test -tags solution -run TestGolden -update ./miniredis/` (из exercises/), затем проверь node scripts/infra-viz-check.js — модель виджетов должна совпасть с новым эталоном", goldenPath)
	}
}
```

Run (из `exercises/`): `go test -tags solution -run TestGolden -count=1 ./miniredis/` — Expected: FAIL «нет …/redis-golden.json: сгенерируй командой …».

- [ ] **Step 2: Сгенерировать эталон** — `mkdir -p ../scripts/fixtures && go test -tags solution -run TestGolden -update -count=1 ./miniredis/` (из `exercises/`; каталог `scripts/fixtures` создать заранее из корня репозитория), затем `go test -tags solution -run TestGolden -count=1 ./miniredis/` — Expected: PASS (идемпотентно: повторный `-update` не меняет файл — проверить `git diff --stat` пуст после второго `-update`).

- [ ] **Step 3: Прочитать эталон глазами** — открыть `scripts/fixtures/redis-golden.json` и убедиться по КАЖДОМУ случаю разбора, что поведение реального кода соответствует ожиданиям из Review Focus п.1 (например: «последние два байта не \r\n» → `args: ["GET"]`, `consumed: 14`, без ошибки; «пустая строка» → `args: null`; «массив из нуля» → `args: []`; «две команды подряд» → `consumed` равен длине ПЕРВОЙ команды; «в значении \r\n» → значение `a\r\nb`; «нет \n в заголовке» → `eof: true`). Если реальный код ведёт себя иначе, чем описано здесь, правда — golden; запиши расхождения в отчёт (они пойдут в модель и в текст главы).

- [ ] **Step 4: Проверки Go** — из `exercises/`: `gofmt -l .` (пусто), `go vet -tags solution ./...`, `go test -tags solution -count=1 ./...` (весь набор, чтобы golden не ломал соседей), и без тега — `go vet ./...` (заготовки компилируются). Expected: зелёные.

- [ ] **Step 5: Commit** — `git add exercises/miniredis/golden_solution_test.go scripts/fixtures/redis-golden.json && git commit -m "miniredis: golden-эталон для виджетов Redis (разбор, ответы, TTL)"`

---

### Task 2: `redis-resp` — файл темы `infra-redis.js`, разбор RESP, виджет

**Files:**
- Create: `assets/infra-redis.js`
- Modify: `book.toml` (строка `additional-js`: после `"assets/infra-pg.js"` добавить `"assets/infra-redis.js"`), `assets/infra-viz.css`, `scripts/infra-viz-check.js`

**Interfaces:**
- Consumes: `core` (из `infra-core.js`), `window.ALGO_VIZ.register/mkEl`, golden (Task 1).
- Produces (экспорт `exportsForTest`): `unescapeWire(s)`, `escapeWire(s)`, `respParse(raw) → {args|null, err: "header"|"expect"|"bulk"|null, eof, consumed}`, `bRespParse(raw) → steps[]`, `respReply(args, store) → {kind, raw} | null` (мутирует `store = {data: {…}}`; `null` — команда вне модели ответов: `EXPIRE`, `TTL` и прочие), `encodeCommand(args) → raw`.
- Шаг: `{ line, vars:{line,n,i,hdr,blen}, info, hot?, done?, raw, pos, mark:[from,to]|null, args:string[], res:{args,err,eof,consumed}|null }`.
- Поля ввода `redis-resp`: `data-wire` (по умолчанию `*3\r\n$3\r\nSET\r\n$3\r\nfoo\r\n$3\r\nbar\r\n`; запись escape-последовательностями `\r`, `\n`, `\t`, `\\`), `data-store` (предзаполненные ключи для ответов, `k=v,k2=v2`; по умолчанию `foo=bar`). Ввод ограничен ASCII и 300 символами (длины в модели — в символах; для не-ASCII считать нельзя — обрезать/заменять).
- Листинг `redis-resp` (индексы строк — для `line`; это сокращённый `ReadCommand` из `resp.go` с теми же ветками и константами):

```
0  func ReadCommand(r *bufio.Reader) ([]string, error) {
1      line, err := readLine(r) // читаем до \n, \r\n отбрасываем
2      if err != nil {
3          return nil, err // поток кончился: ждать больше нечего
4      }
5      if len(line) == 0 {
6          return nil, nil // пустая строка — не команда
7      }
8      if line[0] != '*' {
9          return strings.Fields(line), nil // inline: «PING», «SET foo bar»
10     }
11     n, err := strconv.Atoi(line[1:]) // «*3» — три аргумента
12     if err != nil || n < 0 || n > maxMultibulkLen {
13         return nil, errBadHeader // «*x», «*-1», слишком длинный
14     }
15     args := make([]string, 0, n)
16     for i := 0; i < n; i++ {
17         hdr, err := readLine(r) // «$3» — дальше ровно 3 байта
18         if err != nil {
19             return nil, err
20         }
21         if len(hdr) == 0 || hdr[0] != '$' {
22             return nil, errExpectBulk // ожидали «$…»
23         }
24         blen, err := strconv.Atoi(hdr[1:])
25         if err != nil || blen < 0 || blen > maxBulkLen {
26             return nil, errBadBulk // «$x», «$-1», слишком длинный
27         }
28         buf := make([]byte, blen+2) // +2 на завершающий \r\n
29         if _, err := io.ReadFull(r, buf); err != nil {
30             return nil, err // обрыв внутри строки
31         }
32         args = append(args, string(buf[:blen]))
33     }
34     return args, nil
35 }
```
  (`maxMultibulkLen` = 1048576, `maxBulkLen` = 536870912; `errBadHeader`/`errExpectBulk`/`errBadBulk` — сокращённые имена настоящих `fmt.Errorf`-ошибок `resp.go`.)
- Кадры (после какой строки какое состояние; `mark` — последний прочитанный кусок `[from,to)`, `pos` — съедено байт; `readLine` = «до первого `\n`; нет `\n` — вернуть ошибку EOF, всё оставшееся съедено; иначе обрезать хвостовые `\r`/`\n`»):
  - line 1: `readLine` (`vars.line` = строка в кавычках, при EOF — пустая); line 2: `if err != nil` (кадр на каждое выполнение); при EOF line 3 (`done`, `res.eof`).
  - line 5 (`if len(line)==0`) → при `true` line 6 (`done`, `args: null`); line 8 (`if line[0] != '*'`) → при `true` line 9 (`done`, `args` = поля по пробельным символам, `res.args` — массив, возможно пустой).
  - line 11: `n` (Atoi: `[+-]?\d+`, иначе ошибка и `n=0`; чип — число или 0 при ошибке); line 12 (`if` ошибка/диапазон) → при `true` line 13 (`done`, `err: "header"`); line 15: `args` пуст.
  - для каждого `i` от 0 до `n−1`: line 16 (`vars.i`); line 17 (`hdr`); line 18 (`if err`) → при EOF line 19 (`done`, `eof`); line 21 (`if` нет `$`) → при `true` line 22 (`done`, `err: "expect"`); line 24 (`blen`, Atoi как выше); line 25 (`if` ошибка/диапазон) → при `true` line 26 (`done`, `err: "bulk"`); line 28 (буфер на `blen+2`); line 29 (`ReadFull`: если осталось меньше `blen+2` символов — `pos` = конец ввода, `mark` = остаток, далее line 30 (`done`, `eof`); иначе `pos += blen+2`, `mark` = прочитанные `blen+2`; если последние два символа не `\r\n` — кадр `hot: true`, в тексте сказано, что Go их НЕ проверяет); line 32: `args` пополнен значением `blen` символов.
  - после цикла line 34 (`done`, `res.args` = аргументы). `n = 0` → цикл не выполняется, кадр заголовка цикла не пишется.
  - Кадр `done` обнуляет чипы в «—» и считает `res.consumed = pos`.
- Ответы `respReply`: поддерживает `PING [msg]`, `ECHO x`, `SET k v`, `GET k`, `DEL k…` и ошибки (`ERR unknown command '<как набрано>'`, `ERR wrong number of arguments for '<имя маленькими>' command`, пустой `args` → `ERR empty command`); тексты и кодировка (`+`, `-`, `:`, `$n`, `$-1`) — в точности как у golden `reply`; команда регистронезависима. `EXPIRE`/`TTL`/остальное → `null`.

- [ ] **Step 1: Падающие тесты** — в `scripts/infra-viz-check.js` перед `process.exit` (рядом: `infra`, `eq`, `last`, `JSDOM`, `read`, `readInfra`, `infraScripts` уже есть; добавить `const redis = require(path.join(root, "assets", "infra-redis.js"));` и загрузку golden):

```js
// --- Redis: эталон из настоящего кода (golden) ---
{
  const redis = require(path.join(root, "assets", "infra-redis.js"));
  const golden = JSON.parse(fs.readFileSync(path.join(root, "scripts", "fixtures", "redis-golden.json"), "utf8"));
  golden.parse.forEach((c) => {
    const r = redis.respParse(c.raw);
    eq(`resp golden «${c.name}»`, { args: r.args, err: !!r.err, eof: !!r.eof, consumed: r.consumed }, { args: c.args, err: c.err, eof: c.eof, consumed: c.consumed });
  });
  golden.reply.forEach((sc) => {
    const store = { data: Object.assign({}, sc.preload) };
    sc.steps.forEach((s) => {
      const r = redis.respReply(s.args, store);
      eq(`reply golden «${sc.name}»: ${s.args.join(" ")}`, r && r.raw, s.reply);
    });
  });
  eq("golden: есть разбор, ответы и TTL", [golden.parse.length > 20, golden.reply.length >= 2, golden.ttl.length >= 10], [true, true, true]);
  eq("unescapeWire/escapeWire обратимы", redis.unescapeWire(redis.escapeWire("a\r\nb\t\\x")), "a\r\nb\t\\x");
  eq("encodeCommand собирает multibulk", redis.encodeCommand(["SET", "foo", "bar"]), "*3\r\n$3\r\nSET\r\n$3\r\nfoo\r\n$3\r\nbar\r\n");
  // кадры: точные последовательности строк листинга
  const seq = (raw) => redis.bRespParse(raw).map((s) => s.line).join(",");
  eq("кадры inline PING", seq("PING\r\n"), "1,2,5,8,9");
  eq("кадры пустой строки", seq("\r\n"), "1,2,5,6");
  eq("кадры EOF без \\n", seq("*2"), "1,2,3");
  eq("кадры *x", seq("*x\r\n"), "1,2,5,8,11,12,13");
  eq("кадры GET foo", seq("*2\r\n$3\r\nGET\r\n$3\r\nfoo\r\n"), "1,2,5,8,11,12,15,16,17,18,21,24,25,28,29,32,16,17,18,21,24,25,28,29,32,34");
  eq("кадры оборвано внутри строки", seq("*1\r\n$3\r\nGE"), "1,2,5,8,11,12,15,16,17,18,21,24,25,28,29,30");
  eq("кадры *0", seq("*0\r\n"), "1,2,5,8,11,12,15,34");
  eq("кадры нет $", seq("*1\r\nGET\r\n"), "1,2,5,8,11,12,15,16,17,18,21,22");
  // чипы: «—» вне области видимости и на done; значения живые
  const st = redis.bRespParse("*1\r\n$3\r\nGET\r\n");
  eq("чипы: до объявления n и после done", [st[0].vars.n, st[st.length - 1].vars.line, st[st.length - 1].vars.blen], ["—", "—", "—"]);
  eq("чип line после readLine", st[0].vars.line, "\"*1\"");
  eq("последние два байта не проверяются: кадр hot", redis.bRespParse("*1\r\n$3\r\nGETxx").some((s) => s.line === 29 && s.hot), true);
  eq("конвейер: остаток не съеден", (() => { const r = redis.respParse("*1\r\n$4\r\nPING\r\n*1\r\n$4\r\nPING\r\n"); return r.consumed < 28; })(), true);
  // фаззинг: модель = golden-логика на случайных входах не падает, один done, pos монотонен
  let seed = 4242; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const alpha = ["*", "$", "\r", "\n", "1", "2", "3", "x", "-", "+", "A", " "];
  let bad = 0;
  for (let t = 0; t < 500; t++) {
    let raw = ""; const len = Math.floor(rnd() * 24);
    for (let i = 0; i < len; i++) raw += alpha[Math.floor(rnd() * alpha.length)];
    const steps = redis.bRespParse(raw);
    const fin = steps[steps.length - 1];
    if (!fin.done || steps.filter((s) => s.done).length !== 1) bad++;
    for (let i = 1; i < steps.length; i++) if (steps[i].pos < steps[i - 1].pos) bad++;
    if (fin.res.consumed > raw.length) bad++;
    if (steps.some((s) => s.line < 0 || s.line > 35)) bad++;
  }
  eq("фаззинг 500 входов: один done, pos монотонен, строки в листинге", bad, 0);
}
```

И jsdom-блок для виджета (в том же стиле, что у `pg-scan-*`; хелперы `run`/`infraScripts` уже используются в соседних блоках):

```js
{
  const run = (attrs) => {
    const div = `<div class="algo-viz" id="w" tabindex="0" data-viz="redis-resp" ${attrs}></div>`;
    const dom = new JSDOM(`<!DOCTYPE html><html><body>${div}<script>${read("algo-viz.js")}</script>${infraScripts()}</body></html>`, { runScripts: "dangerously", pretendToBeVisual: true });
    dom.window.document.dispatchEvent(new dom.window.Event("DOMContentLoaded"));
    const el = dom.window.document.getElementById("w");
    for (let i = 0; i < 300; i++) el.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    return el;
  };
  const wire = "*3\\r\\n$3\\r\\nSET\\r\\n$3\\r\\nfoo\\r\\n$3\\r\\nbar\\r\\n";
  const el = run(`data-wire="${wire}" data-store="foo=bar"`);
  eq("redis-resp: построен без ошибок и дошёл до итога", [el.classList.contains("algo-viz--ready") && !/Ошибка визуализации|Неизвестный тип/.test(el.textContent), /Итог:/.test(el.textContent)], [true, true]);
  eq("redis-resp: байтовая лента — по ячейке на символ", el.querySelectorAll(".iv-redis__wire .iv-redis__ch").length, 3 + 0 + ("*3\r\n$3\r\nSET\r\n$3\r\nfoo\r\n$3\r\nbar\r\n").length - 3);
  eq("redis-resp: ответ показан (+OK)", /\+OK/.test(el.querySelector(".iv-redis__reply").textContent), true);
  const bad = run('data-wire="*x\\r\\n" data-store=""');
  eq("redis-resp: ошибка протокола — без падения и с итогом", bad.classList.contains("algo-viz--ready") && /Итог:/.test(bad.textContent) && !/Ошибка визуализации/.test(bad.textContent), true);
  const hostile = run('data-wire="<img src=x onerror=alert(1)>\\r\\n" data-store=""');
  eq("redis-resp: HTML во вводе не создаёт элементов", hostile.querySelectorAll("img").length, 0);
  const empty = run('data-wire="" data-store=""');
  eq("redis-resp: пустой ввод — без падения", empty.classList.contains("algo-viz--ready") && !/Ошибка визуализации/.test(empty.textContent), true);
  // легенда: правило legdot с цветом для каждого класса (урок плана 2), 4 пункта
  const src = readInfra(), css = read("infra-viz.css");
  const legBlock = (src.match(/var respLegend = \[([\s\S]*?)\n  \];/) || [])[1] || "";
  const classes = [...legBlock.matchAll(/cls: "([^"]+)"/g)].map((m) => m[1]);
  eq("redis-resp: в легенде 4 класса", classes.length, 4);
  classes.forEach((c) => eq(`redis-resp: legdot-правило с цветом для ${c}`, new RegExp("\\.algo-tp__legdot--" + c.replace(/[-_]/g, (x) => "\\" + x) + "\\s*\\{[^}]*#[0-9a-fA-F]{6}").test(css), true));
  // пресеты: ровно два поля, нет дубля «пример главы», каждый строится
  const body = src.slice(src.indexOf('    "redis-resp": {'));
  const block = (body.match(/presets: \[\n([\s\S]*?)\n      \],/) || [])[1] || "";
  const presets = [...block.matchAll(/set: \{([^}]*)\}/g)].map((m) => Object.fromEntries([...m[1].matchAll(/"(data-[a-z-]+)":\s*"([^"]*)"/g)].map((x) => [x[1], x[2]])));
  eq("redis-resp: 6 пресетов, ровно два поля, нет дубля «пример главы»", [presets.length, presets.every((p) => Object.keys(p).sort().join() === "data-store,data-wire"), /label: "пример главы/.test(block)], [6, true, false]);
  presets.forEach((p, i) => {
    const e = run(Object.keys(p).map((k) => `${k}="${p[k]}"`).join(" "));
    eq(`redis-resp: пресет ${i + 1} строится`, e.classList.contains("algo-viz--ready") && !/Ошибка визуализации/.test(e.textContent) && /Итог:/.test(e.textContent), true);
  });
}
```
(тест количества ячеек ленты в первом jsdom-блоке упростить до `== длина unescape(wire)`: вычислить через `redis.unescapeWire(wire).length`.)

Run: `node scripts/infra-viz-check.js` — Expected: FAIL (`infra-redis.js` нет).

- [ ] **Step 2: Каркас файла темы и модель** — создать `assets/infra-redis.js`:

```js
/* Инфраструктурные виджеты темы Redis. Регистрируются в движке через window.ALGO_VIZ.register.
 * Модель сверяется с настоящим кодом мини-Redis через golden (scripts/fixtures/redis-golden.json,
 * генерируется exercises/miniredis/golden_solution_test.go). Генераторы — чистые функции. */
(function () {
  "use strict";
  var exportsForTest = {};
  if (typeof module !== "undefined" && module.exports) module.exports = exportsForTest;
  var core = (typeof module !== "undefined" && module.exports) ? require("./infra-core.js") : window.ALGO_VIZ_INFRA;

  var MAX_MULTIBULK = 1048576, MAX_BULK = 536870912;

  // Ввод в атрибуте — с видимыми escape-последовательностями; считаем ASCII: длины в модели — в
  // символах, а Go считает байты (для не-ASCII результат был бы другим).
  function unescapeWire(s) { return String(s == null ? "" : s).replace(/\\(r|n|t|\\)/g, function (_, c) { return c === "r" ? "\r" : c === "n" ? "\n" : c === "t" ? "\t" : "\\"; }); }
  function escapeWire(s) { return String(s).replace(/\\/g, "\\\\").replace(/\r/g, "\\r").replace(/\n/g, "\\n").replace(/\t/g, "\\t"); }
  function encodeCommand(args) { return "*" + args.length + "\r\n" + args.map(function (a) { return "$" + a.length + "\r\n" + a + "\r\n"; }).join(""); }
  function atoi(s) { return /^[+-]?\d+$/.test(s) ? parseInt(s, 10) : NaN; } // как strconv.Atoi: знак и десятичные цифры
  function q(s) { return "\"" + escapeWire(s) + "\""; }

  // bufio.Reader.ReadString('\n') + TrimRight(line, "\r\n"): нет \n — отдаёт остаток вместе с EOF
  function readLineAt(raw, pos) {
    var i = raw.indexOf("\n", pos);
    if (i < 0) return { eof: true, end: raw.length, line: "" };
    return { eof: false, end: i + 1, line: raw.slice(pos, i + 1).replace(/[\r\n]+$/, "") };
  }

  function bRespParse(raw) {
    var steps = [], pos = 0, args = [], mark = null;
    var V = { line: "—", n: "—", i: "—", hdr: "—", blen: "—" };
    function snap(line, info, extra) {
      var s = { line: line, vars: { line: V.line, n: V.n, i: V.i, hdr: V.hdr, blen: V.blen }, info: info, raw: raw, pos: pos, mark: mark ? mark.slice() : null, args: args.slice(), res: null };
      for (var k in extra) s[k] = extra[k];
      steps.push(s);
    }
    function finish(line, info, res, hot) {
      V = { line: "—", n: "—", i: "—", hdr: "—", blen: "—" };
      res.consumed = pos;
      snap(line, "Итог: " + info, { done: true, hot: !!hot, res: res });
      return steps;
    }
    var rl = readLineAt(raw, pos);
    mark = [pos, rl.end]; pos = rl.end;
    V.line = q(rl.line);
    snap(1, rl.eof ? "readLine: до конца ввода нет «\\n» — ReadString отдаёт всё, что было, и ошибку EOF" : "readLine: строка " + q(rl.line) + " (завершающие \\r\\n отброшены)");
    snap(2, rl.eof ? "err != nil — да" : "err != nil — нет");
    if (rl.eof) return finish(3, "поток кончился (клиент закрыл соединение или не дописал). Если клиент просто ещё не дописал, сервер ждал бы байт дальше — EOF только когда соединение закрыто.", { args: null, err: null, eof: true });
    snap(5, rl.line.length === 0 ? "len(line) == 0 — да" : "len(line) == 0 — нет");
    if (rl.line.length === 0) return finish(6, "пустая строка — не команда: ReadCommand возвращает nil, сервер ничего не отвечает", { args: null, err: null, eof: false });
    var inline = rl.line.charAt(0) !== "*";
    snap(8, inline ? "line[0] != '*' — да: это inline-формат" : "line[0] != '*' — нет: это RESP-массив");
    if (inline) {
      var fields = rl.line.split(/\s+/).filter(Boolean);
      return finish(9, "inline: аргументы по пробелам — " + (fields.length ? fields.map(q).join(", ") : "их нет"), { args: fields, err: null, eof: false });
    }
    var n = atoi(rl.line.slice(1));
    V.n = String(isNaN(n) ? 0 : n);
    snap(11, isNaN(n) ? "Atoi(" + q(rl.line.slice(1)) + ") — ошибка, n = 0" : "n = " + n + ": клиент обещает " + n + " аргумент(ов)");
    var badN = isNaN(n) || n < 0 || n > MAX_MULTIBULK;
    snap(12, badN ? "ошибка или n вне допустимого — да" : "ошибка или n вне допустимого — нет");
    if (badN) return finish(13, "битый заголовок массива — протокольная ошибка, соединение закроют", { args: null, err: "header", eof: false });
    snap(15, "args := make([]string, 0, " + n + ")");
    for (var i = 0; i < n; i++) {
      V.i = String(i);
      snap(16, "i = " + i + ": читаем аргумент " + (i + 1) + " из " + n);
      var hl = readLineAt(raw, pos);
      mark = [pos, hl.end]; pos = hl.end;
      V.hdr = q(hl.line);
      snap(17, hl.eof ? "readLine: нет «\\n» — EOF" : "hdr = " + q(hl.line));
      snap(18, hl.eof ? "err != nil — да" : "err != nil — нет");
      if (hl.eof) return finish(19, "поток кончился на заголовке аргумента", { args: null, err: null, eof: true });
      var noDollar = hl.line.length === 0 || hl.line.charAt(0) !== "$";
      snap(21, noDollar ? "len(hdr) == 0 || hdr[0] != '$' — да" : "len(hdr) == 0 || hdr[0] != '$' — нет");
      if (noDollar) return finish(22, "ожидали «$длина», пришло " + q(hl.line), { args: null, err: "expect", eof: false });
      var bl = atoi(hl.line.slice(1));
      V.blen = String(isNaN(bl) ? 0 : bl);
      snap(24, isNaN(bl) ? "Atoi(" + q(hl.line.slice(1)) + ") — ошибка, blen = 0" : "blen = " + bl + ": дальше ровно " + bl + " байт данных и \\r\\n");
      var badB = isNaN(bl) || bl < 0 || bl > MAX_BULK;
      snap(25, badB ? "ошибка или blen вне допустимого — да" : "ошибка или blen вне допустимого — нет");
      if (badB) return finish(26, "недопустимая длина строки " + q(hl.line), { args: null, err: "bulk", eof: false });
      snap(28, "buf := make([]byte, " + (bl + 2) + "): " + bl + " байт данных + 2 на \\r\\n");
      var need = bl + 2;
      if (raw.length - pos < need) {
        mark = [pos, raw.length]; pos = raw.length;
        snap(29, "ReadFull: байт не хватило — ошибка (io.ErrUnexpectedEOF)");
        return finish(30, "поток оборвался внутри значения", { args: null, err: null, eof: true });
      }
      var value = raw.substr(pos, bl), tail = raw.substr(pos + bl, 2);
      mark = [pos, pos + need]; pos += need;
      var odd = tail !== "\r\n";
      snap(29, "ReadFull прочитал " + need + " байт: данные " + q(value) + " и ещё два байта" + (odd ? " " + q(tail) + ", а не \\r\\n — Go их НЕ проверяет, просто отбрасывает" : " (\\r\\n)"), { hot: odd });
      args.push(value);
      snap(32, "args[" + i + "] = " + q(value) + " (\\r\\n внутри значения — это данные, а не конец: длину задал клиент)");
    }
    return finish(34, args.length ? "аргументы: " + args.map(q).join(", ") + (pos < raw.length ? ". Остаток (" + (raw.length - pos) + " символов) не тронут — это следующая команда конвейера" : "") : "пустой массив", { args: args.slice(), err: null, eof: false });
  }
  function respParse(raw) {
    var st = bRespParse(raw), r = st[st.length - 1].res;
    return { args: r.args, err: r.err, eof: r.eof, consumed: r.consumed };
  }

  // Ответы Dispatch для команд без часов; тексты — как у golden (реальные).
  function respReply(args, store) {
    function simple(s) { return { kind: "simple", raw: "+" + s + "\r\n" }; }
    function err(s) { return { kind: "error", raw: "-" + s + "\r\n" }; }
    function int(n) { return { kind: "integer", raw: ":" + n + "\r\n" }; }
    function bulk(s) { return { kind: "bulk", raw: "$" + s.length + "\r\n" + s + "\r\n" }; }
    if (!args || !args.length) return err("ERR empty command");
    var name = String(args[0]).toUpperCase(), a = args.slice(1);
    function arity(n) { return err("ERR wrong number of arguments for '" + n + "' command"); }
    var has = function (k) { return Object.prototype.hasOwnProperty.call(store.data, k); };
    switch (name) {
      case "PING": return a.length === 0 ? simple("PONG") : a.length === 1 ? bulk(a[0]) : arity("ping");
      case "ECHO": return a.length === 1 ? bulk(a[0]) : arity("echo");
      case "SET": if (a.length !== 2) return arity("set"); store.data[a[0]] = a[1]; return simple("OK");
      case "GET": if (a.length !== 1) return arity("get"); return has(a[0]) ? bulk(store.data[a[0]]) : { kind: "nil", raw: "$-1\r\n" };
      case "DEL": if (a.length === 0) return arity("del"); var n = 0; a.forEach(function (k) { if (has(k)) { delete store.data[k]; n++; } }); return int(n);
      case "EXPIRE": case "TTL": return null;
      default: return err("ERR unknown command '" + args[0] + "'");
    }
  }
  exportsForTest.unescapeWire = unescapeWire;
  exportsForTest.escapeWire = escapeWire;
  exportsForTest.encodeCommand = encodeCommand;
  exportsForTest.bRespParse = bRespParse;
  exportsForTest.respParse = respParse;
  exportsForTest.respReply = respReply;

  if (typeof window === "undefined" || !window.ALGO_VIZ) return;

  // …рисунок, легенда, INFRA/CODE и регистрация — Step 4 и далее
})();
```

  Расхождения модели с golden на Step 3 чинятся ПО golden (например, если реальный `GET` по несуществующему ключу, `PING` с аргументами или имя команды в `unknown command` ведут себя иначе, чем здесь записано).

- [ ] **Step 3: Модель проходит golden** — Run: `node scripts/infra-viz-check.js` до jsdom-блоков (временно можно запускать только golden-часть): Expected: все `resp golden …`, `reply golden …` и кадровые проверки `✓`. Любое расхождение — чинить модель по golden; не менять golden.

- [ ] **Step 4: Рисунок, легенда, записи INFRA/CODE, регистрация.** Заменить заглушку в конце файла на (по образцу `pg-scan-*`/`pg-join-*` в `infra-pg.js` — прочитать их сначала):

```js
  var respLegend = [
    { cls: "iv-redis__ch--eaten", label: "уже прочитано" },
    { cls: "iv-redis__ch--cur", label: "читается этим шагом" },
    { cls: "iv-redis__ch--ctl", label: "служебные байты \\r \\n" },
    { cls: "iv-redis__ch--rest", label: "ещё не читалось" }
  ];

  function replyTypeText(kind) {
    return { simple: "простая строка (+)", error: "ошибка (−)", integer: "целое число (:)", bulk: "bulk-строка ($длина)", nil: "«пусто» ($-1)" }[kind] || kind;
  }

  function respViz(panel, ctx) {
    var H = window.ALGO_VIZ;
    var wrap = H.mkEl("div", "iv-redis");
    panel.appendChild(wrap);
    var parsedOnce = respParse(ctx.raw);
    return function (s) {
      wrap.innerHTML = "";
      var w = H.mkEl("div", "iv-redis__wire");
      w.appendChild(H.mkEl("div", "iv-redis__label", "Байты запроса (клиент → сервер)"));
      var strip = H.mkEl("div", "iv-redis__strip");
      for (var i = 0; i < s.raw.length; i++) {
        var c = s.raw.charAt(i), shown = c === "\r" ? "␍" : c === "\n" ? "␊" : c === "\t" ? "⇥" : c === " " ? "·" : c;
        var cls = "iv-redis__ch" + (i < s.pos ? " iv-redis__ch--eaten" : " iv-redis__ch--rest") + (c === "\r" || c === "\n" ? " iv-redis__ch--ctl" : "") + (s.mark && i >= s.mark[0] && i < s.mark[1] ? " iv-redis__ch--cur" : "");
        strip.appendChild(H.mkEl("span", cls, shown));
        if (c === "\n") strip.appendChild(H.mkEl("span", "iv-redis__br", ""));
      }
      if (!s.raw.length) strip.appendChild(H.mkEl("span", "iv-redis__empty", "пусто"));
      w.appendChild(strip);
      wrap.appendChild(w);
      var a = H.mkEl("div", "iv-redis__args");
      a.appendChild(H.mkEl("div", "iv-redis__label", "Аргументы команды"));
      var shownArgs = s.done ? (s.res.args || []) : s.args;
      if (!shownArgs.length) a.appendChild(H.mkEl("span", "iv-redis__empty", s.done && s.res.args === null ? "нет (nil)" : "пока нет"));
      shownArgs.forEach(function (v) { a.appendChild(H.mkEl("span", "iv-redis__arg", "\"" + escapeWire(v) + "\"")); });
      wrap.appendChild(a);
      var r = H.mkEl("div", "iv-redis__reply");
      r.appendChild(H.mkEl("div", "iv-redis__label", "Ответ сервера (Dispatch → WriteTo)"));
      if (!s.done) r.appendChild(H.mkEl("span", "iv-redis__empty", "появится после разбора"));
      else if (s.res.err) r.appendChild(H.mkEl("span", "iv-redis__empty", "протокольная ошибка — ответа нет, сервер закрывает соединение"));
      else if (s.res.eof) r.appendChild(H.mkEl("span", "iv-redis__empty", "команда не дочитана — ответа нет"));
      else if (!s.res.args || !s.res.args.length) r.appendChild(H.mkEl("span", "iv-redis__empty", "пустая команда — ответа нет"));
      else {
        var rep = respReply(s.res.args, { data: Object.assign({}, ctx.store) });
        if (rep) {
          r.appendChild(H.mkEl("span", "iv-redis__rawreply", escapeWire(rep.raw)));
          r.appendChild(H.mkEl("span", "iv-redis__kind", replyTypeText(rep.kind)));
        } else r.appendChild(H.mkEl("span", "iv-redis__empty", "ответ зависит от часов — смотри виджет про TTL ниже"));
      }
      wrap.appendChild(r);
    };
  }
```

  Записи INFRA/CODE (4 пробела, как у `pg-page`): `var CODE = {` с листингом `"redis-resp": [ … 36 строк из «Interfaces» … ]`, затем `var INFRA = {` с записью (поля `codeKey`, `inputs:` одной строкой, `presets:` блоком по строке на пресет, `lineNotes: {…}` одной строкой без вложенных скобок — литералами):

```js
    "redis-resp": {
      badge: "Redis · разбор запроса (RESP)",
      desc: "ReadCommand читает запрос байт за байтом: сначала строка-заголовок («*3» — три аргумента), потом для каждого аргумента «$длина» и ровно столько байт. Длину задаёт клиент, поэтому \\r\\n внутри значения — просто данные.",
      valuesLabel: "", codeKey: "redis-resp", fillRange: false,
      complexity: { time: "O(байт запроса)", space: "O(байт запроса)", good: "★ по длине, без поиска разделителей" },
      varOrder: ["line", "n", "i", "hdr", "blen"],
      varDesc: { line: "Первая строка запроса", n: "Сколько аргументов обещано", i: "Номер аргумента", hdr: "Заголовок аргумента", blen: "Длина данных" },
      lineNotes: { 1: "Читаем до \\n, \\r\\n отбрасываем", 5: "Пустая строка — не команда", 8: "Не «*» — значит inline: просто слова через пробел", 11: "«*3» — клиент обещает три аргумента", 17: "«$3» — дальше ровно три байта данных", 28: "+2 — завершающий \\r\\n после данных", 29: "Читаем ровно blen+2 байт; последние два Go не проверяет", 32: "Значение может содержать \\r\\n — длину знаем заранее" },
      rules: [{ head: "длина", body: "задаёт клиент", cls: "eq" }, { head: "значение", body: "любые байты, даже \\r\\n", cls: "gt" }, { head: "остаток", body: "ждёт следующего чтения", cls: "lt" }],
      legend: respLegend,
      presets: [
        { label: "GET существующего ключа", set: { "data-wire": "*2\\r\\n$3\\r\\nGET\\r\\n$3\\r\\nfoo\\r\\n", "data-store": "foo=bar" }, hint: "ответ — bulk-строка" },
        { label: "inline: просто PING", set: { "data-wire": "PING\\r\\n", "data-store": "" }, hint: "так пишет nc" },
        { label: "в значении есть \\r\\n", set: { "data-wire": "*3\\r\\n$3\\r\\nSET\\r\\n$1\\r\\nk\\r\\n$4\\r\\na\\r\\nb\\r\\n", "data-store": "" }, hint: "длина важнее разделителя" },
        { label: "две команды подряд", set: { "data-wire": "*1\\r\\n$4\\r\\nPING\\r\\n*1\\r\\n$4\\r\\nPING\\r\\n", "data-store": "" }, hint: "остаток не тронут" },
        { label: "клиент не дописал", set: { "data-wire": "*2\\r\\n$3\\r\\nGET\\r\\n$3\\r\\nfo", "data-store": "" }, hint: "ReadFull ждёт ещё байты" },
        { label: "битый заголовок", set: { "data-wire": "*x\\r\\n", "data-store": "" }, hint: "ошибка протокола" }
      ],
      parse: function (root) {
        var wAttr = root.getAttribute("data-wire"), sAttr = root.getAttribute("data-store");
        var raw = unescapeWire(wAttr == null ? "*3\\r\\n$3\\r\\nSET\\r\\n$3\\r\\nfoo\\r\\n$3\\r\\nbar\\r\\n" : wAttr).replace(/[^\\x00-\\x7f]/g, "?").slice(0, 300);
        var store = {};
        String(sAttr == null ? "foo=bar" : sAttr).split(",").forEach(function (p) { var i = p.indexOf("="); if (i > 0) store[p.slice(0, i).trim()] = p.slice(i + 1).trim(); });
        return { raw: raw, store: store, steps: bRespParse(raw) };
      },
      inputs: [{ attr: "data-wire", label: "Байты запроса (\\r \\n — escape-последовательностями)" }, { attr: "data-store", label: "Ключи в базе (k=v,k2=v2)" }],
      values: function () { return []; },
      title: function (ctx) { return "Разбор запроса: " + ctx.raw.length + " символов на проводе"; },
      pointers: function () { return { lo: -1, hi: -1 }; },
      sumCells: ["Съедено", "Всего"],
      sumValues: function (s) { return [{ text: s.pos, cls: "gt" }, { text: s.raw.length }]; },
      status: function (s, idx, total) { if (s.done) return { kind: "ok", icon: "✓", head: "Готово", text: s.info }; return { kind: "info", hot: !!s.hot, icon: idx + 1, head: "Шаг " + (idx + 1) + " из " + total, text: s.info }; },
      stepCard: function (s) { return { a: "съедено " + s.pos, b: "аргументов " + s.args.length, c: "", cls: "gt" }; },
      varsOf: function (s) { return { line: s.vars.line, n: s.vars.n, i: s.vars.i, hdr: s.vars.hdr, blen: s.vars.blen }; },
      customViz: respViz
    }
```
  (в литералах JS внутри файла обратные слэши экранируются как в обычных строках: `"\\r\\n"` — два символа «\r», «\n» для читателя; в атрибутах HTML главы они пишутся одиночными `\r\n`.) Регистрация в конце файла — как в `infra-pg.js`: `Object.keys(INFRA).forEach(function (t) { window.ALGO_VIZ.register(t, INFRA[t], CODE[INFRA[t].codeKey]); });`.

  CSS в `assets/infra-viz.css` (токены `--iv-r-*`; карточка виджета всегда тёмная; legdot-правила с литеральными цветами):

```css
.iv-redis { --iv-r-eaten:#1d4ed8; --iv-r-cur:#f59e0b; --iv-r-ctl:#a78bfa; --iv-r-rest:#334155; --iv-r-fg:#e2e8f0; }
.iv-redis__label { flex:0 0 100%; font:600 11px/1.2 system-ui,sans-serif; color:var(--iv-r-fg); opacity:.85; margin-bottom:4px; }
.iv-redis__strip { display:flex; flex-wrap:wrap; gap:2px; margin-bottom:8px; }
.iv-redis__br { flex:0 0 100%; height:0; }
.iv-redis__ch { min-width:16px; height:22px; display:flex; align-items:center; justify-content:center; border-radius:3px; border:2px solid transparent; font:600 12px/1 ui-monospace,monospace; color:#fff; }
.iv-redis__ch--rest { background:var(--iv-r-rest); }
.iv-redis__ch--eaten { background:var(--iv-r-eaten); }
.iv-redis__ch--ctl { color:#fde68a; }
.iv-redis__ch--cur { border-color:var(--iv-r-cur); }
.iv-redis__args, .iv-redis__reply { display:flex; flex-wrap:wrap; align-items:center; gap:6px; margin-bottom:8px; color:var(--iv-r-fg); }
.iv-redis__arg { padding:2px 8px; border-radius:4px; background:#0f766e; font:600 12px/1.4 ui-monospace,monospace; color:#fff; }
.iv-redis__rawreply { padding:2px 8px; border-radius:4px; background:#7c3aed; font:600 12px/1.4 ui-monospace,monospace; color:#fff; word-break:break-all; }
.iv-redis__kind, .iv-redis__empty { font:12px/1.3 system-ui,sans-serif; opacity:.85; }
.algo-tp__legdot--iv-redis__ch--eaten { background:#1d4ed8; }
.algo-tp__legdot--iv-redis__ch--rest { background:#334155; }
.algo-tp__legdot--iv-redis__ch--ctl { background:#334155; box-shadow:0 0 0 2px #a78bfa; }
.algo-tp__legdot--iv-redis__ch--cur { background:#334155; box-shadow:0 0 0 2px #f59e0b; }
@media (max-width:520px) { .iv-redis__ch { min-width:14px; height:20px; font-size:11px; } }
```
  (класс `--ctl` в ленте — это ДОПОЛНИТЕЛЬНЫЙ модификатор к `--eaten/--rest`; поэтому в легенде у него цвет-кольцо, а не заливка; тест легенды требует `#hex` в правиле — кольцо `#a78bfa` его содержит.)

  В `book.toml`: `additional-js = ["assets/algo-viz.js", "assets/infra-core.js", "assets/infra-pg.js", "assets/infra-redis.js", …остальное как было…]`.

- [ ] **Step 5: Тесты зелёные** — Run: `node scripts/infra-viz-check.js && node scripts/check-viz.js && node --check assets/infra-redis.js && node scripts/check-registries.js` — Expected: зелёные (check-viz: +1 тип; у `redis-resp` есть `codeKey`, `lineNotes` в пределах листинга 0–35, пресеты = поля `inputs`, 6 пресетов; проверка `book.toml` из плана 3 видит `infra-redis.js`). Ошибки по правилам — править по тексту.

- [ ] **Step 6: Commit** — `git add assets book.toml scripts && git commit -m "infra-viz: файл темы infra-redis.js, виджет redis-resp (разбор RESP)"`

---

### Task 3: `redis-ttl` — ленивое удаление по TTL

**Files:**
- Modify: `assets/infra-redis.js` (перед страж-строкой: `parseScript`, `ttlExec`, `ttlSim`, `bTtl`; после неё: `ttlViz`, легенда, записи INFRA/CODE), `assets/infra-viz.css`, `scripts/infra-viz-check.js`

**Interfaces:**
- Produces (экспорт): `parseScript(str) → {tokens:[{op:"advance", ms}|{op:"cmd", name, args}], bad:[строки]}`, `ttlSim(tokens) → [{reply, data, expire}]` (по токену; `reply` — сырые байты ответа или `""` для `advance`; `data` — карта; `expire` — карта ключ → абсолютный срок в мс от 0; часы стартуют с 0), `bTtl(tokens) → steps[]`.
- Скрипт (`data-script`): токены через `;`; `+N` — прибавить N секунд (десятичные допустимы, `0 < N ≤ 3600`); команды `SET k v`, `GET k`, `DEL k`, `EXPIRE k n` (`n` — целое со знаком), `TTL k`; не больше 14 токенов; ключи и значения — слова без пробелов; нераспознанные токены попадают в `bad` и показываются заметкой, виджет строится по остальным. По умолчанию: `SET session abc; EXPIRE session 3; +2; TTL session; +2; GET session; TTL session`.
- Модель команд — РОВНО как реальный код (проверено golden): `SET` пишет `data` и снимает TTL, ответ `+OK`; `GET` — через `live`, ответ bulk или `$-1`; `DEL` — один ключ, через `live`, ответ `:1`/`:0`; `EXPIRE k n` — через `live` (нет → `:0`), `n ≤ 0` → удалить оба поля и `:1`, иначе `expire[k] = t + n·1000` и `:1`; `TTL k` — через `live` (нет → `:-2`), нет срока → `:-1`, иначе `trunc((exp − t)/1000)`; `live`: нет в `data` → нет; есть срок и `t ≥ exp` (то есть `!now.Before(exp)`) → лениво удалить из `data` и `expire`, нет; иначе жив. Часы — целые миллисекунды (`Math.round(sec·1000)`).
- Листинг `redis-ttl` (индексы строк — для `line`; это `Store.live` и команды из `miniredis_solution.go` без проверок числа аргументов и без `mu.Lock`, что оговорено первой строкой комментария):

```
0  // сокращено: без проверки числа аргументов и без блокировки mu
1  func (s *Store) live(key string) (string, bool) {
2      v, exists := s.data[key]
3      if !exists {
4          return "", false
5      }
6      exp, hasTTL := s.expire[key]
7      if hasTTL && !s.now().Before(exp) {
8          delete(s.data, key) // ленивое удаление: только при обращении
9          delete(s.expire, key)
10         return "", false
11     }
12     return v, true
13 }
14 // SET key value
15 func set(s *Store, key, value string) {
16     s.data[key] = value
17     delete(s.expire, key) // новый SET снимает TTL
18 }
19 // GET key
20 func get(s *Store, key string) (string, bool) {
21     v, ok := s.live(key)
22     return v, ok
23 }
24 // EXPIRE key seconds
25 func expire(s *Store, key string, sec int) int {
26     _, ok := s.live(key)
27     if !ok {
28         return 0
29     }
30     if sec <= 0 {
31         delete(s.data, key)
32         delete(s.expire, key)
33         return 1
34     }
35     s.expire[key] = s.now().Add(time.Duration(sec) * time.Second)
36     return 1
37 }
38 // TTL key
39 func ttl(s *Store, key string) int64 {
40     _, ok := s.live(key)
41     if !ok {
42         return -2
43     }
44     exp, hasTTL := s.expire[key]
45     if !hasTTL {
46         return -1
47     }
48     return int64(exp.Sub(s.now()).Seconds()) // дробная часть отбрасывается
49 }
50 // DEL key
51 func del(s *Store, key string) int {
52     _, ok := s.live(key)
53     if !ok {
54         return 0
55     }
56     delete(s.data, key)
57     delete(s.expire, key)
58     return 1
59 }
```
- Кадры. `live` (вызывается из `get`/`expire`/`ttl`/`del` на их строках-вызовах): line 2; line 3 (`if !exists`) → при `true` line 4 и возврат; иначе line 6, line 7 (`if hasTTL && !Before`) → при `true` line 8, 9, 10; иначе line 12. Остальные кадры по командам: **SET** — 16, 17. **GET** — 21 (вызов), кадры `live`, 22 (`done` команды). **EXPIRE** — 26 (вызов), кадры `live`, 27 (`if !ok`) → `true`: 28; иначе 30 (`if sec <= 0`) → `true`: 31, 32, 33; иначе 35, 36. **TTL** — 40, `live`, 41 → `true`: 42; иначе 44, 45 → `true`: 46; иначе 48. **DEL** — 52, `live`, 53 → `true`: 54; иначе 56, 57, 58. Кадр вызова (21/26/40/52) — ДО кадров `live` (состояние не меняется, в тексте «вызываем live(key)»); кадры `live` подсвечивают строки `live`; чипы по областям: внутри `live` — `key, v, exists, exp, hasTTL`; в `set` — `key, value`; в `get` — `key, v, ok`; в `expire` — `key, sec, ok`; в `ttl` — `key, ok, exp, hasTTL`; в `del` — `key, ok`; всё остальное «—»; на кадре `done` команды (последний кадр её функции) чипы остаются живыми в пределах этой функции, а после ПОСЛЕДНЕЙ команды скрипта итоговый кадр (`done: true`, строка последнего кадра) обнуляет все чипы в «—». Токен `+N` отдельного кадра не имеет: часы сдвигаются в состоянии ПЕРВОГО кадра следующей команды (`info` начинается «прошло N с, часы: T с. …»); если скрипт кончается на `+N`, сдвиг виден на итоговом кадре.
- Шаг: `{ line, vars, info, hot?, done?, t, rows:[{key, value, expireAt|null, state:"live"|"stale"|"nottl"}], log:[{cmd, reply}], mem:{keys, stale}, bad }`. `state`: `stale` — ключ в `data`, срок вышел (`t ≥ expireAt`), но ключ ещё не тронут; `nottl` — живой без срока; `live` — живой со сроком. `log` пополняется на последнем кадре команды.
- Чипы значения: `exp` — «срок T с» (мс → секунды с точкой) или «—»; `hasTTL`/`exists`/`ok` — `true`/`false`; `v` — значение в кавычках или `""`.

- [ ] **Step 1: Падающие тесты** — в `scripts/infra-viz-check.js` (рядом с блоками `redis-resp`):

```js
{
  const redis = require(path.join(root, "assets", "infra-redis.js"));
  const golden = JSON.parse(fs.readFileSync(path.join(root, "scripts", "fixtures", "redis-golden.json"), "utf8"));
  golden.ttl.forEach((sc) => {
    const ps = redis.parseScript(sc.script);
    eq(`ttl golden «${sc.name}»: скрипт разобран без остатка`, ps.bad, []);
    const sim = redis.ttlSim(ps.tokens);
    eq(`ttl golden «${sc.name}»: ответ/data/expire на каждом токене`, sim.map((r) => ({ reply: r.reply, data: r.data, expire: r.expire })), sc.steps.map((s) => ({ reply: s.reply, data: s.data, expire: s.expire })));
    // кадры строятся тем же кодом: итог последнего кадра = состояние после последнего токена
    const st = redis.bTtl(ps.tokens), fin = st[st.length - 1];
    eq(`ttl «${sc.name}»: один done, последним`, [!!fin.done, st.filter((s) => s.done).length], [true, 1]);
    eq(`ttl «${sc.name}»: строки в пределах листинга`, st.every((s) => s.line >= 0 && s.line <= 59), true);
    eq(`ttl «${sc.name}»: итог совпадает с golden`, fin.rows.map((r) => r.key + "=" + (st.length ? 1 : 0)).sort(), Object.keys(sc.steps[sc.steps.length - 1].data).map((k) => k + "=1").sort());
  });
  const seq = (script) => redis.bTtl(redis.parseScript(script).tokens).filter((s) => !s.done).map((s) => s.line).join(","); // без итогового кадра
  eq("кадры SET", seq("SET a 1"), "16,17");
  eq("кадры GET отсутствующего", seq("GET a"), "21,2,3,4,22");
  eq("кадры GET живого без TTL", seq("SET a 1; GET a").split(",").slice(2).join(","), "21,2,3,6,7,12,22");
  eq("кадры GET просроченного (ленивое удаление)", seq("SET a 1; EXPIRE a 1; +2; GET a").split(",").slice(9).join(","), "21,2,3,6,7,8,9,10,22");
  eq("кадры EXPIRE на отсутствующем", seq("EXPIRE a 5"), "26,2,3,4,27,28");
  eq("кадры EXPIRE 0", seq("SET a 1; EXPIRE a 0").split(",").slice(2).join(","), "26,2,3,6,7,12,27,30,31,32,33");
  eq("кадры TTL без срока", seq("SET a 1; TTL a").split(",").slice(2).join(","), "40,2,3,6,7,12,41,44,45,46");
  eq("кадры DEL живого", seq("SET a 1; DEL a").split(",").slice(2).join(","), "52,2,3,6,7,12,53,56,57,58");
  // главное свойство: просроченный ключ лежит в памяти до обращения
  const st = redis.bTtl(redis.parseScript("SET a 1; EXPIRE a 1; +5; SET b 2; DEL b").tokens);
  const lastRows = st[st.length - 1].rows;
  eq("просрочен, но лежит в памяти и никто не тронул", [lastRows.map((r) => r.key + ":" + r.state).join(","), st[st.length - 1].mem], ["a:stale", { keys: 1, stale: 1 }]);
  const lazy = redis.bTtl(redis.parseScript("SET a 1; EXPIRE a 1; +5; GET a").tokens);
  const first = lazy.find((s) => s.line === 21);
  eq("перед ленивым удалением ключ виден как «просрочен»", [first.rows[0].state, first.t], ["stale", 5000]);
  eq("после GET ключа в памяти нет", lazy[lazy.length - 1].mem, { keys: 0, stale: 0 });
  // чипы: «—» вне области видимости
  const sg = redis.bTtl(redis.parseScript("SET a 1; GET a").tokens);
  eq("чипы: в set живы key/value, остальные «—»", [sg[0].vars.key, sg[0].vars.value, sg[0].vars.ok, sg[0].vars.exists], ["a", "1", "—", "—"]);
  eq("чипы: на итоговом кадре всё «—»", Object.values(sg[sg.length - 1].vars).every((v) => v === "—"), true);
  // разбор скрипта
  eq("parseScript: плохие токены отделены, остальное разобрано", (() => { const r = redis.parseScript("SET a 1; FOO; +x; GET a; EXPIRE a q; +0; +4000"); return [r.tokens.length, r.bad.length]; })(), [2, 5]);
  eq("parseScript: не больше 14 токенов", redis.parseScript(Array.from({ length: 30 }, () => "GET a").join("; ")).tokens.length, 14);
  eq("parseScript: дробные секунды в мс", redis.parseScript("+0.5; +1.25").tokens.map((t) => t.ms), [500, 1250]);
  eq("parseScript: пусто", redis.parseScript(""), { tokens: [], bad: [] });
  // фаззинг: случайные скрипты — один done, строки в листинге, счётчики согласованы
  let seed = 777; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const cmds = ["SET a 1", "SET b 2", "GET a", "GET b", "DEL a", "DEL b", "EXPIRE a 2", "EXPIRE b 1", "EXPIRE a 0", "TTL a", "TTL b", "+1", "+0.5", "+3"];
  let bad = 0;
  for (let t = 0; t < 300; t++) {
    const n = 1 + Math.floor(rnd() * 12);
    const script = Array.from({ length: n }, () => cmds[Math.floor(rnd() * cmds.length)]).join("; ");
    const st2 = redis.bTtl(redis.parseScript(script).tokens), fin = st2[st2.length - 1];
    if (!fin.done || st2.filter((s) => s.done).length !== 1) bad++;
    if (st2.some((s) => s.line < 0 || s.line > 58)) bad++;
    if (st2.some((s) => s.mem.keys !== s.rows.length || s.mem.stale !== s.rows.filter((r) => r.state === "stale").length)) bad++;
    for (let i = 1; i < st2.length; i++) if (st2[i].t < st2[i - 1].t) bad++;
  }
  eq("фаззинг 300 скриптов: один done, строки в листинге, счётчики согласованы, часы не идут назад", bad, 0);
}
```

И jsdom-блок для `redis-ttl` (по образцу блока `redis-resp`: ready/без ошибок/«Итог:»; ряды таблицы ключей = `mem.keys` итогового кадра; видимая строка «в памяти: N, из них просрочено: M»; пресеты (5, ровно поле `data-script`, нет дубля «пример главы», каждый строится); мусорный ввод `data-script="FOO; ;;"` не падает; HTML во вводе не создаёт элементов; легенда `ttlLegend` — 3 пункта и legdot-правила с цветом; на финальном кадре пресета «просрочен, но лежит в памяти» в DOM есть ряд с классом `iv-redis__row--stale`, а в легенде — «срок вышел, но лежит в памяти»).

Run: `node scripts/infra-viz-check.js` — Expected: FAIL (`parseScript is not a function`).

- [ ] **Step 2: Реализация модели** — в `assets/infra-redis.js` перед страж-строкой добавить (структура: `ttlExec` — одна функция, которая и считает, и (если передан `frame`) выпускает кадры; `ttlSim` = `ttlExec` без кадров; `bTtl` = `ttlExec` с кадрами):

```js
  // ===== TTL: ленивое удаление ================================================
  function fmtT(ms) { return (ms / 1000).toString().replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "") + " с"; }

  function parseScript(str) {
    var tokens = [], bad = [];
    String(str == null ? "" : str).split(";").forEach(function (raw) {
      var t = raw.trim();
      if (!t) return;
      if (tokens.length >= 14) return;
      var m = /^\+(\d+(?:\.\d+)?)$/.exec(t);
      if (m) { var sec = parseFloat(m[1]); if (sec > 0 && sec <= 3600) tokens.push({ op: "advance", ms: Math.round(sec * 1000) }); else bad.push(t); return; }
      var w = t.split(/\s+/), name = w[0].toUpperCase(), a = w.slice(1);
      var ok = (name === "SET" && a.length === 2) || ((name === "GET" || name === "DEL" || name === "TTL") && a.length === 1) || (name === "EXPIRE" && a.length === 2 && /^[+-]?\d+$/.test(a[1]));
      if (ok) tokens.push({ op: "cmd", name: name, args: a }); else bad.push(t);
    });
    return { tokens: tokens, bad: bad };
  }

  function ttlExec(tokens, frame) {
    var st = { t: 0, data: {}, expire: {} }, results = [], log = [], pendingAdv = 0;
    function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
    function chips(o) { var r = { key: "—", v: "—", exists: "—", exp: "—", hasTTL: "—", ok: "—", sec: "—", value: "—" }; for (var k in o) r[k] = o[k]; return r; }
    function qv(s) { return "\"" + s + "\""; }
    function rows() {
      return Object.keys(st.data).map(function (k) {
        var e = has(st.expire, k) ? st.expire[k] : null;
        return { key: k, value: st.data[k], expireAt: e, state: e === null ? "nottl" : st.t >= e ? "stale" : "live" };
      });
    }
    var cur = { cmd: "", rep: "" }; // текущая команда: журнал пополняется на её ПОСЛЕДНЕМ кадре
    function emit(line, vars, info, extra) {
      if (extra && extra.last) log.push({ cmd: cur.cmd, reply: cur.rep });
      lastLine = line;
      if (!frame) return;
      var rs = rows();
      var adv = pendingAdv ? "Прошло " + fmtT(pendingAdv) + ", часы: " + fmtT(st.t) + ". " : "";
      pendingAdv = 0;
      var s = { line: line, vars: chips(vars), info: adv + info, t: st.t, rows: rs, log: log.slice(), mem: { keys: rs.length, stale: rs.filter(function (r) { return r.state === "stale"; }).length }, bad: [] };
      if (extra && extra.hot) s.hot = true;
      frame(s);
    }
    var lastLine = 0;
    // live: возвращает {ok, v}; кадры — по строкам листинга 2..12; callerVars не нужны: чипы live — свои
    function live(key) {
      var ex = has(st.data, key), v = ex ? st.data[key] : "";
      emit(2, { key: key, v: qv(v), exists: ex }, ex ? "v, exists := s.data[" + key + "] — ключ в data есть" : "v, exists := s.data[" + key + "] — ключа в data нет");
      emit(3, { key: key, v: qv(v), exists: ex }, ex ? "!exists — нет" : "!exists — да");
      if (!ex) { emit(4, { key: key, v: qv(v), exists: ex }, "ключа нет — вернули «нет»"); return { ok: false, v: "" }; }
      var hasT = has(st.expire, key), exp = hasT ? st.expire[key] : null;
      emit(6, { key: key, v: qv(v), exists: ex, exp: exp === null ? "—" : fmtT(exp), hasTTL: hasT }, hasT ? "срок: " + fmtT(exp) + ", часы: " + fmtT(st.t) : "срока у ключа нет");
      var expired = hasT && st.t >= exp;
      emit(7, { key: key, v: qv(v), exists: ex, exp: exp === null ? "—" : fmtT(exp), hasTTL: hasT }, hasT ? (expired ? "hasTTL && !Before(exp) — да: часы " + fmtT(st.t) + " ≥ срок " + fmtT(exp) : "hasTTL && !Before(exp) — нет: срок ещё не вышел") : "hasTTL && !Before(exp) — нет: срока нет");
      if (!expired) { emit(12, { key: key, v: qv(v), exists: ex, exp: exp === null ? "—" : fmtT(exp), hasTTL: hasT }, "ключ жив — вернули значение"); return { ok: true, v: v }; }
      delete st.data[key];
      emit(8, { key: key, v: qv(v), exists: ex, exp: fmtT(exp), hasTTL: true }, "ленивое удаление: ключ убирается из data ТОЛЬКО сейчас, потому что к нему обратились", { hot: true });
      delete st.expire[key];
      emit(9, { key: key, v: qv(v), exists: ex, exp: fmtT(exp), hasTTL: true }, "и из expire");
      emit(10, { key: key, v: qv(v), exists: ex, exp: fmtT(exp), hasTTL: true }, "для вызывающего ключа больше нет");
      return { ok: false, v: "" };
    }
    function reply(kind, text) { return kind === "int" ? ":" + text + "\r\n" : kind === "simple" ? "+" + text + "\r\n" : kind === "nil" ? "$-1\r\n" : "$" + text.length + "\r\n" + text + "\r\n"; }

    tokens.forEach(function (tk) {
      if (tk.op === "advance") { st.t += tk.ms; pendingAdv += tk.ms; results.push({ reply: "", data: copy(st.data), expire: copy(st.expire) }); return; }
      var a = tk.args, key = a[0];
      cur.cmd = tk.name + " " + a.join(" "); cur.rep = "";
      if (tk.name === "SET") {
        st.data[key] = a[1];
        emit(16, { key: key, value: qv(a[1]) }, "s.data[" + key + "] = " + qv(a[1]));
        delete st.expire[key];
        cur.rep = reply("simple", "OK");
        emit(17, { key: key, value: qv(a[1]) }, "срок (если был) снимается: новый SET — это новое значение без TTL. Ответ: +OK", { last: true });
      } else if (tk.name === "GET") {
        emit(21, { key: key }, "GET " + key + ": вызываем live(" + key + ")");
        var g = live(key);
        cur.rep = g.ok ? reply("bulk", g.v) : reply("nil");
        emit(22, { key: key, v: qv(g.v), ok: g.ok }, g.ok ? "GET отвечает значением " + qv(g.v) : "GET отвечает «пусто» ($-1)", { last: true });
      } else if (tk.name === "EXPIRE") {
        var sec = parseInt(a[1], 10), S = String(sec);
        emit(26, { key: key, sec: S }, "EXPIRE " + key + " " + sec + ": вызываем live(" + key + ")");
        var e = live(key);
        emit(27, { key: key, sec: S, ok: e.ok }, e.ok ? "!ok — нет" : "!ok — да");
        if (!e.ok) { cur.rep = reply("int", "0"); emit(28, { key: key, sec: S, ok: false }, "ключа нет — EXPIRE отвечает 0", { last: true }); }
        else {
          emit(30, { key: key, sec: S, ok: true }, sec <= 0 ? "sec <= 0 — да" : "sec <= 0 — нет");
          cur.rep = reply("int", "1");
          if (sec <= 0) {
            delete st.data[key];
            emit(31, { key: key, sec: S, ok: true }, "ключ удаляется сразу");
            delete st.expire[key];
            emit(32, { key: key, sec: S, ok: true }, "и срок тоже");
            emit(33, { key: key, sec: S, ok: true }, "EXPIRE отвечает 1", { last: true });
          } else {
            st.expire[key] = st.t + sec * 1000;
            emit(35, { key: key, sec: S, ok: true }, "срок: часы " + fmtT(st.t) + " + " + sec + " с = " + fmtT(st.expire[key]));
            emit(36, { key: key, sec: S, ok: true }, "EXPIRE отвечает 1", { last: true });
          }
        }
      } else if (tk.name === "TTL") {
        emit(40, { key: key }, "TTL " + key + ": вызываем live(" + key + ")");
        var tl = live(key);
        emit(41, { key: key, ok: tl.ok }, tl.ok ? "!ok — нет" : "!ok — да");
        if (!tl.ok) { cur.rep = reply("int", "-2"); emit(42, { key: key, ok: false }, "ключа нет — TTL отвечает -2", { last: true }); }
        else {
          var h = has(st.expire, key), ex2 = h ? st.expire[key] : null;
          emit(44, { key: key, ok: true, exp: ex2 === null ? "—" : fmtT(ex2), hasTTL: h }, h ? "срок: " + fmtT(ex2) : "срока нет");
          emit(45, { key: key, ok: true, exp: ex2 === null ? "—" : fmtT(ex2), hasTTL: h }, h ? "!hasTTL — нет" : "!hasTTL — да");
          if (!h) { cur.rep = reply("int", "-1"); emit(46, { key: key, ok: true, hasTTL: false }, "срока нет — TTL отвечает -1", { last: true }); }
          else { var left = Math.trunc((ex2 - st.t) / 1000); cur.rep = reply("int", String(left)); emit(48, { key: key, ok: true, exp: fmtT(ex2), hasTTL: true }, "осталось " + ((ex2 - st.t) / 1000) + " с, а мини-Redis отвечает целым: " + left + " (дробная часть отбрасывается)", { last: true }); }
        }
      } else if (tk.name === "DEL") {
        emit(52, { key: key }, "DEL " + key + ": вызываем live(" + key + ")");
        var d = live(key);
        emit(53, { key: key, ok: d.ok }, d.ok ? "!ok — нет" : "!ok — да");
        if (!d.ok) { cur.rep = reply("int", "0"); emit(54, { key: key, ok: false }, "ключа нет (или он уже просрочен) — DEL отвечает 0", { last: true }); }
        else {
          delete st.data[key];
          emit(56, { key: key, ok: true }, "delete(s.data, " + key + ")");
          delete st.expire[key];
          emit(57, { key: key, ok: true }, "delete(s.expire, " + key + ")");
          cur.rep = reply("int", "1");
          emit(58, { key: key, ok: true }, "DEL отвечает 1", { last: true });
        }
      }
      results.push({ reply: cur.rep, data: copy(st.data), expire: copy(st.expire) });
    });
    // итоговый кадр: чипы обнулены; строка — последняя выполненная (0, если команд не было)
    if (frame) {
      var rsF = rows(), stale = rsF.filter(function (r) { return r.state === "stale"; }).length;
      var advF = pendingAdv ? "Прошло " + fmtT(pendingAdv) + ", часы: " + fmtT(st.t) + ". " : "";
      frame({ line: lastLine, vars: chips({}), info: advF + "Итог: в памяти ключей " + rsF.length + ", из них просрочено: " + stale + (stale ? " — они лежат, пока к ним не обратятся" : ""), t: st.t, rows: rsF, log: log.slice(), mem: { keys: rsF.length, stale: stale }, bad: [], done: true });
    }
    return results;
  }
  function copy(o) { var r = {}; for (var k in o) r[k] = o[k]; return r; }
  function ttlSim(tokens) { return ttlExec(tokens, null); }

  function bTtl(tokens) {
    var steps = [];
    ttlExec(tokens, function (s) { steps.push(s); });
    return steps;
  }
```
  Итоговый кадр скрипта строится внутри `ttlExec` (`done: true`, чипы «—», `info` «Итог: …»); для скрипта без команд (только `+N` или пусто) он единственный и имеет `line: 0`. `bad` в кадрах заполняет `parse` виджета из `parseScript(...).bad` (генератор кладёт пустой массив).

- [ ] **Step 3: Модель проходит тесты** — Run: `node scripts/infra-viz-check.js` до jsdom-блока TTL — Expected: все `ttl golden …`, кадровые и фаззинг-проверки `✓`. Расхождения с golden чинить в модели.

- [ ] **Step 4: Рисунок, легенда, записи, регистрация.** `ttlLegend` (3 пункта): `iv-redis__row--live` «жив, у него есть срок», `iv-redis__row--nottl` «жив, срока нет», `iv-redis__row--stale` «срок вышел, но ключ ещё лежит в памяти». Рисунок `ttlViz`: сверху — «Часы: T с · в памяти ключей: K, из них просрочено: M» (числа после двоеточия, без «из» как дроби); таблица ключей (`.iv-redis__rows`; ряд = `key`, значение, срок или «—», состояние словами; класс ряда по `state`); журнал команд — строки «команда → ответ (сырые байты)»; заметка `bad` («не понял: …») если есть. Всё через `mkEl`/`textContent`. Запись INFRA `redis-ttl`: `badge «Redis · TTL и ленивое удаление»`; `desc` — «Ключ с TTL не исчезает сам: мини-Redis проверяет срок только когда к ключу обращаются (GET, TTL, EXPIRE, DEL) и тогда же удаляет его. До этого просроченный ключ лежит в памяти.»; `codeKey: "redis-ttl"`; `varOrder: ["key","v","exists","exp","hasTTL","ok","sec","value"]`; `varDesc` по смыслу; `lineNotes` (одной строкой): `{ 3: "Ключа нет в data — жив быть не может", 7: "Срок вышел, когда часы ≥ срока", 8: "Ленивое удаление: только сейчас, при обращении", 17: "Новый SET снимает TTL", 22: "GET отдаёт то, что решил live", 30: "EXPIRE с нулём или минусом удаляет ключ", 35: "Срок = часы + секунды", 48: "Дробная часть секунд отбрасывается" }`; `rules`; `legend: ttlLegend`; `inputs: [{ attr: "data-script", label: "Сценарий (команды и +секунды через «;»)" }]`; `parse` с значением по умолчанию `SET session abc; EXPIRE session 3; +2; TTL session; +2; GET session; TTL session`; пресеты (5, поле `data-script`, без дубля «примера главы»):

| label | data-script | hint |
|---|---|---|
| «просрочен, но лежит в памяти» | `SET a 1; EXPIRE a 1; +5; SET b 2; DEL b` | «a просрочен, но никто не спросил» |
| «SET снимает TTL» | `SET a 1; EXPIRE a 2; SET a 2; +5; TTL a; GET a` | «срок пропал — ключ вечен» |
| «TTL отбрасывает дробную часть» | `SET a 1; EXPIRE a 3; +0.5; TTL a` | «осталось 2.5 с, ответ 2» |
| «EXPIRE 0 удаляет» | `SET a 1; EXPIRE a 0; GET a` | «ключ исчез сразу» |
| «DEL считает только живые» | `SET a 1; EXPIRE a 1; +2; DEL a; DEL a` | «первый DEL тоже 0: ключ уже просрочен» |

  (значения `hint` проверить расчётом по модели; если расчёт показывает иное — исправить подпись.) Листинг в `CODE` — 60 строк из «Interfaces». CSS (`.iv-redis__rows*`, цвета рядов, legdot-правила с литеральными hex) — в `infra-viz.css`; требования те же, что у `redis-resp` (тёмная карточка, `≤520px`, `legdot` правило на каждый класс легенды).

- [ ] **Step 5: Все тесты зелёные** — `node scripts/infra-viz-check.js && node scripts/check-viz.js && node --check assets/infra-redis.js && node scripts/check-registries.js` (check-viz: +1 тип, пресеты = поля `inputs`).

- [ ] **Step 6: Commit** — `git add assets scripts && git commit -m "infra-viz: виджет redis-ttl (ленивое удаление по TTL)"`

---

### Task 4: Лаборатория `redislab/` и замеры настоящего Redis

**Files:**
- Create: `redislab/docker-compose.yml`, `redislab/measure.sh`
- Modify: `Makefile` (цели, `.PHONY`, шапка с описанием целей — по образцу `pg-lab`)

**Interfaces:**
- Produces: `make redis-lab` (поднять и дождаться `PONG`), `make redis-cli` (интерактивный `redis-cli` внутри контейнера), `make redis-lab-down` (погасить и стереть); `redislab/measure.sh wire|ttl|active|all` — воспроизводимые замеры, печатают сырой вывод; контейнер `algo-redislab`, порт наружу `127.0.0.1:26379` (ниже эфемерного диапазона Linux 32768–60999, как у `pglab`; ТОЛЬКО loopback — в лаборатории включена команда `DEBUG`), образ `redis:7.4-alpine` (версия пришпилена, как у `pglab`; точная версия берётся из `INFO server` и печатается скриптом).
- В CI лаборатория НЕ участвует (как `pglab/`): ни один скрипт CI от неё не зависит.

- [ ] **Step 1: Лаборатория** — `redislab/docker-compose.yml`:

```yaml
# Лаборатория к главе «Капстоун: мини-Redis»: настоящий Redis для сверки с нашим мини-Redis.
#
#   make redis-lab       — поднять
#   make redis-cli       — redis-cli внутри контейнера
#   make redis-lab-down  — погасить и стереть
#   redislab/measure.sh  — воспроизвести замеры из главы
#
# Порт наружу — 26379 и только на loopback: в лаборатории включена команда DEBUG
# (нужна для DEBUG SET-ACTIVE-EXPIRE), а с DEBUG порт нельзя выставлять в сеть.
# Версия образа пришпилена: ответы и поведение сняты именно с 7.4. Если Docker Desktop
# не отвечает, а системный Docker работает: DOCKER_CONTEXT=default make redis-lab.
services:
  redis:
    image: redis:7.4-alpine
    container_name: algo-redislab
    command: ["redis-server", "--save", "", "--appendonly", "no", "--enable-debug-command", "yes"]
    ports:
      - "127.0.0.1:26379:6379"
```

  Цели `Makefile` (в стиле соседних; `redis-lab` ждёт `PONG` через `docker exec algo-redislab redis-cli ping` до 60 секунд и пишет подсказку, `redis-lab-down` — `docker compose down -v`); добавить цели в `.PHONY` и в комментарий-шапку Makefile. Проверка: `make redis-lab` (если образа нет — скачается; если скачать не удалось из-за сети/Docker Hub — Task 4 BLOCKED: сообщить, лабораторию и скрипты всё равно закоммитить; замеры не выдумывать, глава в Task 5 останется с пометкой «по документации, здесь не мерили»).

- [ ] **Step 2: Скрипт замеров** — `redislab/measure.sh` (POSIX `sh`, `set -eu`, работает через `docker exec algo-redislab …`, учитывает `DOCKER_CONTEXT` из окружения; без зависимостей, кроме docker и `od`): подкоманды печатают заголовок, команду и СЫРОЙ вывод (байты — через `od -An -c`):
  - `wire`: сырые запросы через `nc` внутри контейнера (`printf '…' | docker exec -i algo-redislab nc -w1 localhost 6379 | od -An -c`) для случаев golden-разбора, где настоящий Redis может ответить иначе или так же: inline `PING`; multibulk `SET foo bar`, `GET foo`, `GET missing`, `ECHO` с пустой строкой; значение с `\r\n` внутри; неизвестная команда; неверное число аргументов; битый заголовок `*x`; `*-1`; `*0`; `$`-заголовок без `$`; последние два байта bulk-строки не `\r\n`; две команды в одном пакете (конвейер); запрос без `\n` (сервер ждёт — таймаут `nc -w1`, ответа нет); сравнить с golden и сказать, где ответы совпали побайтно, а где расходятся (в тексте главы — только измеренные расхождения). Версия — `redis-cli INFO server | grep redis_version`.
  - `ttl`: те же сценарии, что в golden `ttl` (токены «+N» — настоящий `sleep N`), токены команд — `redis-cli`; печатает ответы построчно и сравнивает с golden-ответами (расхождения помечены); отдельно — округление `TTL`: `SET a 1; EXPIRE a 3` и затем `TTL`/`PTTL` через 0.4, 0.6, 1.2, 2.4, 2.6 с.
  - `active`: (1) настоящее поведение: 1000 ключей `SET k<i> v EX 1`, затем опрос `DBSIZE` каждые 0.5 с БЕЗ обращений к ключам до нуля (печатать время и `DBSIZE`, плюс `INFO stats` → `expired_keys`); (2) `DEBUG SET-ACTIVE-EXPIRE 0`: `SET a 1 EX 1`, пауза 3 с, `DBSIZE` (ожидаемо 1 — просроченный ключ лежит в памяти), `GET a` (nil), `DBSIZE` (0) — это поведение нашего мини-Redis; в конце ВЕРНУТЬ `DEBUG SET-ACTIVE-EXPIRE 1`.
  Скрипт должен быть идемпотентным (начинает с `FLUSHALL`) и не оставлять изменённых настроек; коды выхода — ненулевой, если контейнер недоступен (с понятным сообщением).

- [ ] **Step 3: Прогнать замеры и записать результаты** — `make redis-lab && redislab/measure.sh all`; сырой вывод и таблицы сверки «мини-Redis (golden) | настоящий Redis» — в отчёт Task 4: версия (`redis_version`), по каждому случаю `wire` и `ttl` — совпало / расходится (с самими байтами), округление `TTL` по точкам времени, активное удаление (время до нуля `DBSIZE`, `expired_keys`), поведение с выключенным активным удалением. Если расхождение указывает на баг самого мини-Redis (а не на осознанное упрощение капстоуна) — сообщить, эталонную реализацию молча НЕ править. В конце `make redis-lab-down`.

- [ ] **Step 4: Проверки** — `sh -n redislab/measure.sh` (синтаксис), `docker compose -f redislab/docker-compose.yml config` (валидность), `make -n redis-lab redis-cli redis-lab-down` (цели существуют), `node scripts/check-registries.js` (на случай счётчиков). Docker Desktop завис → `DOCKER_CONTEXT=default`; сказать в отчёте, какой контекст использован.

- [ ] **Step 5: Commit** — `git add redislab Makefile && git commit -m "redislab: Redis в контейнере и воспроизводимые замеры"`

---

### Task 5: Глава, исправление формулировок, полный прогон, браузер

**Files:**
- Modify: `src/miniredis.md`, `exercises/miniredis/store.go` (только комментарий), `CLAUDE.md`

- [ ] **Step 1: Подраздел про провод (этап 1).** В `src/miniredis.md` сразу ПОСЛЕ абзаца «Оба способа говорят с сервером одним и тем же RESP-протоколом …» и ДО цитаты «💡 Если `redis-cli` выведет предупреждение про HELLO/RESP3…» добавить подраздел `### Посмотри, что на самом деле идёт по проводу` (простым языком; аналогия ДО определения: «письмо с конвертом, на котором написана длина письма — получатель не ищет конец, а отсчитывает нужное число байт»; затем что такое RESP-массив из bulk-строк, чем inline отличается; почему `\r\n` внутри значения ничего не ломает; что в `ReadCommand` не проверяются два последних байта; что остаток после команды ждёт следующего чтения — конвейер). Виджет:

```html
<div class="algo-viz" data-viz="redis-resp" data-wire="*3\r\n$3\r\nSET\r\n$3\r\nfoo\r\n$3\r\nbar\r\n" data-store="foo=bar"></div>
```
  «Что смотреть» над виджетом: чипы `n`, `i`, `blen`; жёлтая рамка — читаемый кусок; пресеты «в значении есть \r\n», «две команды подряд», «клиент не дописал», «битый заголовок»; режим 🎯 на `if` (inline или массив; хватило ли байт). Короткая таблица «мини-Redis | настоящий Redis» (только случаи из замеров Task 4 `wire`, где ответы расходятся или заслуживают внимания, сырые байты в `text`-блоке; версия Redis названа; воспроизведение — `make redis-lab && redislab/measure.sh wire`). Предложение о границах модели: виджет разбирает ASCII и показывает ответы только для `PING/ECHO/SET/GET/DEL`; ответы `EXPIRE/TTL` зависят от часов — в виджете ниже; это не сетевой сервер: «обрыв» — это конец ввода (на настоящем сокете `ReadString` блокировался бы в ожидании байт, а EOF приходит при закрытии соединения). Ссылка на спецификацию RESP (она уже в главе).

- [ ] **Step 2: Подраздел про ленивый TTL (этап 3) и исправление формулировки.** (а) В абзаце про `live` (строки ~141–143: «…ровно так ведёт себя настоящий Redis: не подметает по таймеру, а проверяет при обращении…») заменить утверждение о настоящем Redis на точное: «в нашем мини-Redis ключ удаляется ТОЛЬКО лениво — когда к нему обратились. Настоящий Redis делает это и лениво, и активно: ниже — замер на `redislab/` (Redis <версия из отчёта Task 4>): ключи с TTL исчезают сами, без единого обращения (время до нуля `DBSIZE` — из замера), а с выключенным активным удалением (`DEBUG SET-ACTIVE-EXPIRE 0`) просроченный ключ лежит в `DBSIZE` до первого обращения — ровно как в мини-Redis». Ссылка на https://redis.io/docs/latest/commands/expire/ — как на описание алгоритма (проверить, что страница существует; смысл документации передавать без выдумок), но факты в тексте — измеренные. Если Task 4 был BLOCKED (образ не скачался), оставить формулировку «по документации Redis (здесь не мерили)» и явно сказать об этом. (б) То же исправление в doc-комментарии `Store.live` в `exercises/miniredis/store.go` (~строки 48–49): только комментарий, поведение не менять; `gofmt -l .` пусто. (в) Подраздел `### Посмотри, как ключ живёт после срока` (после абзаца про `live` и «часы» — перед «**Что нужно сделать**» этапа 3, не разрывая список функций): аналогия («молоко в холодильнике с датой: оно не исчезает в полночь — пока никто не открыл холодильник, пачка стоит; выбросят, когда её возьмут»), затем виджет:

```html
<div class="algo-viz" data-viz="redis-ttl" data-script="SET session abc; EXPIRE session 3; +2; TTL session; +2; GET session; TTL session"></div>
```
  «Что смотреть»: после второго `+2` ключ `session` помечен «срок вышел, но лежит в памяти» — счётчик «в памяти» его ещё считает; он исчезает ТОЛЬКО на кадрах `delete` внутри `live` при `GET`; пресеты «просрочен, но лежит в памяти» (ключ остаётся навсегда, пока не тронут), «SET снимает TTL», «TTL отбрасывает дробную часть», «EXPIRE 0 удаляет», «DEL считает только живые». Предложение о границах модели (часы идут только по `+N`, один ключ на команду, без `ZADD`/сети; настоящий Redis дополнительно чистит ключи сам — это измерено, см. ниже) и небольшая таблица «TTL: мини-Redis | настоящий Redis» из замера `ttl` Task 4 (округление `TTL` по точкам времени, остальные сценарии golden — «совпало побайтно»), с версией Redis и командой воспроизведения (`make redis-lab && redislab/measure.sh ttl`). Все утверждения о поведении мини-Redis — из golden/кода; всё о настоящем Redis — из замеров Task 4 (с версией и командой воспроизведения); ничего вне замеров не выдумывать. Листингов ```go в главу не добавлять сверх уже имеющихся.

- [ ] **Step 3: `CLAUDE.md`** — в пункте «Инфраструктурные виджеты» дописать: типы `redis-resp`/`redis-ttl` в `assets/infra-redis.js` (первый файл темы после разделения); механизм golden: `exercises/miniredis/golden_solution_test.go` пишет `scripts/fixtures/redis-golden.json` (обновление — `cd exercises && go test -tags solution -run TestGolden -update ./miniredis/`; CI проверяет свежесть в `go test -tags solution ./...`), `infra-viz-check` требует совпадения модели с golden. Рядом с абзацем про `pglab/` добавить короткий абзац про `redislab/` (порт 26379 только на loopback, образ `redis:7.4-alpine`, `DEBUG` включён, `make redis-lab`/`redis-cli`/`redis-lab-down`, `redislab/measure.sh wire|ttl|active`; в CI не участвует; при зависшем Docker Desktop — `DOCKER_CONTEXT=default`). Остальное не трогать.

- [ ] **Step 4: Полный прогон как в CI** — `mdbook build && node scripts/check-links.js && node scripts/check-registries.js && node scripts/check-viz.js && node scripts/infra-viz-check.js && node scripts/check-challenges.js && node scripts/progress-render-check.js && node scripts/keys-check.js`; из `exercises/`: `gofmt -l . && go vet -tags solution ./... && go vet ./... && go test -tags solution -count=1 ./... && go run ./cmd/checksnippets -src ../src`; в фоне параллельно, ждать: `node scripts/viz-render-check.js` (~25 мин), `node scripts/check-viz-names.js` (~8 мин), `node scripts/predict-check.js`. Каждый скрипт с кодом выхода в отчёт; soft-skip не считается; если упали из-за новых типов — чинить причину (без записей в allow-list), перезапустить, сообщить. Проверка «Заготовки ещё не решены» (untagged-тесты пакетов с эталоном должны падать): `golden_solution_test.go` с тегом `solution` её не затрагивает — убедиться: `cd exercises && go test -count=1 ./miniredis/ 2>&1 | tail -3` по-прежнему падает на заготовках.

- [ ] **Step 5: Браузер (Playwright MCP, инструменты — через ToolSearch)** — `mdbook serve` на свободном порту (не убивать чужие процессы), страница `miniredis.html`: оба виджета на дефолтных данных — прошагать до конца, прочитать итоговый статус; нажать все пресеты каждого (кнопка «пример главы» ОДНА), прошагать, сравнить итоги с golden/ожиданиями; `redis-resp`: ячейки ленты окрашены по состояниям, жёлтая рамка идёт за чтением, на «клиент не дописал» ответ «команда не дочитана», на «две команды подряд» остаток «не тронут»; `redis-ttl`: на кадре перед `GET` ключ помечен «срок вышел, но лежит в памяти», счётчик «в памяти … просрочено»; точки легенды окрашены и различимы (4 у resp, 3 у ttl); 🎯 вопросы осмысленны на `if`-строках обоих листингов; тёмная тема navy; 360 px (ряды переносятся, нет горизонтальной прокрутки страницы); стрелки ←/→ при фокусе на виджете не листают главу. Скриншоты — в scratchpad, не в репозиторий. Остановить `mdbook serve`; проверить `git -C <корень> status --short` на посторонние файлы Playwright и убрать только свои.

- [ ] **Step 6: Commit** — `git add src exercises/miniredis/store.go CLAUDE.md assets scripts && git commit -m "Redis: виджеты разбора запроса и ленивого TTL в главе miniredis, исправлена формулировка про удаление"`

---

## Self-review

- **Покрытие спеки (этот план):** `redis-resp` («кадры RESP байт за байтом») и `redis-ttl` («ленивое и активное удаление») из списка Redis; теория простым языком с аналогиями; числа и поведение сверены с настоящим кодом через golden (Docker не нужен). Активное удаление настоящего Redis в виджете НЕ моделируется, но измерено на `redislab/` (Task 4) и описано в тексте главы; `redis-persist` (атомарный снапшот vs AOF), Kafka и остаток Postgres — отдельные планы.
- **Плейсхолдеры:** нет — `ttlExec` приведён целиком (журнал пополняется на последнем кадре команды через `{last:true}`, итоговый кадр строится в конце); листинги, кадры, golden-сценарии, парсер RESP, ответы, тесты и CSS приведены целиком.
- **Типы/имена:** `respParse/bRespParse/respReply/encodeCommand/unescapeWire/escapeWire`, `parseScript/ttlExec/ttlSim/bTtl`, шаг `{line, vars, info, hot?, done?, raw, pos, mark, args, res}` (resp) и `{line, vars, info, t, rows, log, mem, …}` (ttl), классы `iv-redis__*`, ключи `redis-resp`/`redis-ttl`, `data-wire`/`data-store`/`data-script`, `respLegend`/`ttlLegend`, фикстура `scripts/fixtures/redis-golden.json` — едины в Task 1–4; номера строк листингов (resp 0–35, ttl 0–59) совпадают с `line` в генераторах и `lineNotes`.
- **Review Focus:** п.1 — golden-случаи + тесты кадров и «последние два байта»; п.2 — golden TTL-сценарии + тесты «лежит в памяти»; п.3 — Task 1 Step 2/4 и Task 2 Step 3; п.4 — Task 2 Step 5; п.5 — Task 4 Step 2.
- **Известные риски:** (а) хвост JS-файла в Task 2 Step 4 пишется по образцу `infra-pg.js` — исполнитель сначала читает его; (б) `ttlExec` — самый сложный кусок плана: тесты Step 1 жёсткие (golden на каждом токене + точные последовательности кадров); (в) образ `redis:7.4-alpine` может не скачаться (сеть/Docker Hub) или Docker Desktop может висеть: Task 4 тогда BLOCKED для замеров (`DOCKER_CONTEXT=default` — первый шаг), а глава честно остаётся с пометкой «по документации»; ссылка на документацию Redis проверяется при написании главы; (г) модель ASCII-only — это сказано в тексте и в тестах.
