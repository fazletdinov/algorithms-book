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
		t.Fatalf("нет %s: сгенерируй командой `go test -tags solution -run TestGolden ./miniredis/ -update` (из exercises/): %v", goldenPath, err)
	}
	if !bytes.Equal(got, want) {
		t.Fatalf("%s устарел относительно эталонной реализации: `go test -tags solution -run TestGolden ./miniredis/ -update` (из exercises/), затем проверь node scripts/infra-viz-check.js — модель виджетов должна совпасть с новым эталоном", goldenPath)
	}
}
