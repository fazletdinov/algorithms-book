package main

import (
	"net/http"
	"net/http/httptest"
	"regexp"
	"slices"
	"strings"
	"testing"
	"time"
)

func TestTestArgs(t *testing.T) {
	tests := []struct {
		name    string
		race    bool
		filter  []string
		wantRun string // "" — флага -run быть не должно
		wantErr bool
	}{
		{name: "без фильтра гоняется весь пакет"},
		{name: "один тест", filter: []string{"TestCoinChange"}, wantRun: "^(TestCoinChange)$"},
		{
			name:    "несколько тестов через ИЛИ",
			filter:  []string{"TestCoinChange", "TestCoinChangeRandom"},
			wantRun: "^(TestCoinChange|TestCoinChangeRandom)$",
		},
		{name: "race и фильтр вместе", race: true, filter: []string{"TestSum"}, wantRun: "^(TestSum)$"},
		{name: "метасимвол регэкспа отвергается", filter: []string{"TestA|.*"}, wantErr: true},
		{name: "скобка отвергается", filter: []string{"TestA)"}, wantErr: true},
		{name: "не тест вообще", filter: []string{"BenchmarkSort"}, wantErr: true},
		{name: "пустое имя", filter: []string{""}, wantErr: true},
		{name: "пробел внутри", filter: []string{"TestA B"}, wantErr: true},
		{name: "слишком длинный список", filter: slices.Repeat([]string{"TestX"}, maxTestFilter+1), wantErr: true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			args, err := testArgs("dp", tt.race, tt.filter, 20*time.Second)
			if tt.wantErr {
				if err == nil {
					t.Fatalf("ожидалась ошибка, получены аргументы %q", args)
				}
				return
			}
			if err != nil {
				t.Fatalf("неожиданная ошибка: %v", err)
			}
			if args[len(args)-1] != "./dp/" {
				t.Errorf("пакет должен идти последним: %q", args)
			}
			if got := slices.Contains(args, "-race"); got != tt.race {
				t.Errorf("-race = %v, ожидалось %v: %q", got, tt.race, args)
			}
			if i := slices.Index(args, "-timeout"); i < 0 || args[i+1] != "20s" {
				t.Errorf("без -timeout 20s тестовый бинарник живёт 10 минут: %q", args)
			}
			i := slices.Index(args, "-run")
			if tt.wantRun == "" {
				if i >= 0 {
					t.Errorf("фильтра не было, а -run есть: %q", args)
				}
				return
			}
			if i < 0 || i+1 >= len(args) || args[i+1] != tt.wantRun {
				t.Errorf("-run: получено %q, ожидалось %q", args, tt.wantRun)
			}
		})
	}
}

// Якоря ^(...)$ — не формальность: без них фильтр задачи CoinChange запустил
// бы и тесты соседней функции CoinChangeTwo, а та ещё panic("TODO").
func TestTestArgsFilterIsExact(t *testing.T) {
	args, err := testArgs("dp", false, []string{"TestCoinChange"}, 20*time.Second)
	if err != nil {
		t.Fatal(err)
	}
	re := regexp.MustCompile(args[slices.Index(args, "-run")+1])
	for name, want := range map[string]bool{
		"TestCoinChange":    true,
		"TestCoinChangeTwo": false,
		"XTestCoinChange":   false,
	} {
		if got := re.MatchString(name); got != want {
			t.Errorf("%s: совпадение = %v, ожидалось %v", name, got, want)
		}
	}
}

// Свой тест читателя проверяется до копии модуля: битый файл — 400 с причиной, а не прогон.
func TestUserTestNames(t *testing.T) {
	for _, tt := range []struct {
		name, src string
		want      []string
		err       string
	}{
		{"два теста и помощник", "package p\n\nimport \"testing\"\n\nfunc helper() {}\n\nfunc TestA(t *testing.T) {}\n\nfunc TestB_2(t *testing.T) {}\n", []string{"TestA", "TestB_2"}, ""},
		{"чужой пакет", "package q\n\nfunc TestA(t *testing.T) {}\n", nil, "package q, а нужен package p"},
		{"нет тестов", "package p\n\nfunc helper() {}\n", nil, "нет ни одной func TestX"},
		{"не разбирается", "package p\n\nfunc TestA(t *testing.T) {\n", nil, "не разбирается"},
		{"имя не для фильтра", "package p\n\nfunc TestЖ(t *testing.T) {}\n", nil, "недопустимое имя теста"},
		{"слишком длинный", "package p\n//" + strings.Repeat("x", maxUserTest) + "\n", nil, "длиннее"},
	} {
		t.Run(tt.name, func(t *testing.T) {
			got, err := userTestNames("p", tt.src)
			if tt.err != "" {
				if err == nil || !strings.Contains(err.Error(), tt.err) {
					t.Fatalf("err = %v, ожидалось «%s»", err, tt.err)
				}
				return
			}
			if err != nil || strings.Join(got, ",") != strings.Join(tt.want, ",") {
				t.Fatalf("= %v, %v; ожидалось %v", got, err, tt.want)
			}
		})
	}
}

// Свой тест и фильтр tests вместе — 400: свой тест не смешивается с проверкой задачи.
func TestHandleRunUserTestWithFilterRejected(t *testing.T) {
	useRealModule(t)
	rec := httptest.NewRecorder()
	body := `{"pkg":"slidingwindow","code":"package slidingwindow","tests":["TestA"],"userTest":"package slidingwindow\nfunc TestB(t *testing.T){}"}`
	newServer(memLimiter{Mode: memNone}).handleRun(rec, httptest.NewRequest(http.MethodPost, "/api/run", strings.NewReader(body)))
	if rec.Code != http.StatusBadRequest || !strings.Contains(rec.Body.String(), "отдельно") {
		t.Errorf("код %d: %s", rec.Code, rec.Body.String())
	}
}
