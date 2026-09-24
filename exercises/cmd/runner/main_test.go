package main

import (
	"regexp"
	"slices"
	"testing"
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
			args, err := testArgs("dp", tt.race, tt.filter)
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
	args, err := testArgs("dp", false, []string{"TestCoinChange"})
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
