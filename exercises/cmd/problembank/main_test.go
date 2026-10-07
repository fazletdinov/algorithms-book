package main

import (
	"os"
	"path/filepath"
	"slices"
	"strings"
	"testing"
)

func TestNeutral(t *testing.T) {
	tests := []struct {
		name, text, fn, want string
	}{
		{"имя в начале становится словом", "SieveOfEratosthenes возвращает простые до n.", "SieveOfEratosthenes",
			"Функция возвращает простые до n."},
		{"имя в примере становится f", "Binomial возвращает C(n, k).\nПример: Binomial(5, 2) = 10; Binomial(5, 7) = 0.", "Binomial",
			"Функция возвращает C(n, k).\nПример: f(5, 2) = 10; f(5, 7) = 0."},
		// Имя внутри другого идентификатора — не имя функции: ShortestPath не трогает
		// ShortestPathWithAtMostKEdges.
		{"чужой идентификатор не трогаем", "ShortestPath ищет путь, как ShortestPathWithAtMostKEdges.", "ShortestPath",
			"Функция ищет путь, как ShortestPathWithAtMostKEdges."},
		{"без имени в начале", "Возвращает n-е число: Fib(1)=1.", "Fib", "Возвращает n-е число: f(1)=1."},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := neutral(tt.text, tt.fn); got != tt.want {
				t.Errorf("neutral() = %q, ожидалось %q", got, tt.want)
			}
		})
	}
}

func TestDedupe(t *testing.T) {
	ps := []problem{
		{Pkg: "cryptography", Fn: "ModExp", Text: "Функция возвращает base^exp mod m."},
		{Pkg: "graphs", Fn: "BFS", Text: "Функция обходит граф."},
		{Pkg: "numbertheory", Fn: "PowMod", Text: "Функция возвращает base^exp mod m."},
	}
	got, dups := dedupe(ps)
	if len(got) != 2 || got[0].Fn != "ModExp" || got[1].Fn != "BFS" {
		t.Fatalf("dedupe оставил %+v, ожидались ModExp и BFS в исходном порядке", got)
	}
	if len(dups) != 1 {
		t.Fatalf("dedupe сообщил о %d дублях, ожидался 1: %v", len(dups), dups)
	}
}

// writeTree собирает минимальный модуль: <base>/exercises/<pkg>/<pkg>.go и главы
// <base>/src/<слаг>.md — так, как collect их ищет (../src относительно root).
func writeTree(t *testing.T, pkg, stub string, chapters ...string) (root string) {
	t.Helper()
	base := t.TempDir()
	root = filepath.Join(base, "exercises")
	write := func(path, src string) {
		t.Helper()
		if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(path, []byte(src), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	write(filepath.Join(root, pkg, pkg+".go"), stub)
	for _, c := range chapters {
		write(filepath.Join(base, "src", c+".md"), "# "+c+"\n")
	}
	return root
}

// stubWith — заготовка пакета p с одной задачей F: к условию (оно длиннее порога
// minStatement) дописываются переданные абзацы док-комментария.
func stubWith(paragraphs ...string) string {
	doc := "// F считает нечто достаточно подробное, чтобы условие прошло порог длины и попало в банк:\n" +
		"// проход по входным данным, накопление результата и возврат итога в виде одного числа.\n"
	for _, p := range paragraphs {
		doc += "//\n// " + p + "\n"
	}
	return "//go:build !solution\n\n// Package p — тест.\n// Теория: ../../src/dp.md\npackage p\n\n" +
		doc + "func F() int {\n\tpanic(\"TODO: реализуйте F\")\n}\n"
}

func TestCollectMarks(t *testing.T) {
	root := writeTree(t, "p", stubWith(
		"Ожидаемая сложность: O(n log n).",
		"Шаблон: greedy",
		"Также решается: two-pointers, sliding-window",
		"Признак: ответ зависит от порядка.",
		"Подсказка: отсортируйте.",
	), "dp", "greedy", "two-pointers", "sliding-window")
	ps, _, err := collect(root)
	if err != nil {
		t.Fatal(err)
	}
	if len(ps) != 1 {
		t.Fatalf("задач %d, ожидалась одна: %+v", len(ps), ps)
	}
	p := ps[0]
	if p.Chapter != "greedy" {
		t.Errorf("Шаблон: глава = %q, ожидалась greedy (а не глава пакета dp)", p.Chapter)
	}
	if !slices.Equal(p.Also, []string{"two-pointers", "sliding-window"}) {
		t.Errorf("Also = %v", p.Also)
	}
	if p.Sign != "ответ зависит от порядка." {
		t.Errorf("Sign = %q", p.Sign)
	}
	if p.Complexity != "O(n log n)" {
		t.Errorf("Complexity = %q", p.Complexity)
	}
	for _, field := range []string{p.Text, p.Hint} {
		for _, bad := range []string{"Шаблон", "Также решается", "Признак"} {
			if strings.Contains(field, bad) {
				t.Errorf("служебный абзац %q попал в условие или подсказки: %q", bad, field)
			}
		}
	}
	if p.Hint != "Ожидаемая сложность: O(n log n).\nПодсказка: отсортируйте." {
		t.Errorf("Hint = %q: подсказки остаются как были", p.Hint)
	}
}

func TestCollectWithoutMarksKeepsPackageChapter(t *testing.T) {
	ps, _, err := collect(writeTree(t, "p", stubWith(), "dp"))
	if err != nil {
		t.Fatal(err)
	}
	p := ps[0]
	if p.Chapter != "dp" || p.Also != nil || p.Sign != "" || p.Complexity != "" {
		t.Errorf("без меток: %+v", p)
	}
}

func TestCollectRejectsBadMarks(t *testing.T) {
	tests := []struct {
		name       string
		paragraphs []string
		chapters   []string
	}{
		{"шаблон — несуществующая глава", []string{"Шаблон: no-such-chapter"}, []string{"dp"}},
		{"также решается — несуществующая глава", []string{"Также решается: greedy, no-such-chapter"}, []string{"dp", "greedy"}},
		{"также решается содержит главу пакета", []string{"Также решается: dp"}, []string{"dp"}},
		{"также решается содержит шаблон", []string{"Шаблон: greedy", "Также решается: greedy"}, []string{"dp", "greedy"}},
		{"слаг с путём", []string{"Шаблон: ../README"}, []string{"dp"}},
		{"два шаблона", []string{"Шаблон: greedy", "Шаблон: dp"}, []string{"dp", "greedy"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, _, err := collect(writeTree(t, "p", stubWith(tt.paragraphs...), tt.chapters...))
			if err == nil {
				t.Fatal("ожидалась ошибка")
			}
			if !strings.Contains(err.Error(), "p.F") {
				t.Errorf("ошибка должна называть пакет и функцию (p.F): %v", err)
			}
		})
	}
}

// Банк настоящих заготовок: поля «эталон сложности», «также решается» и «признак».
func TestCollectRealBankNewFields(t *testing.T) {
	ps, _, err := collect("../..")
	if err != nil {
		t.Fatal(err)
	}
	ps, _ = dedupe(ps) // как в main: счёт идёт по тому, что реально попадает в банк
	withComplexity := 0
	for _, p := range ps {
		if p.Complexity != "" {
			withComplexity++
		}
		if p.Pkg == "dp" && p.Fn == "CoinChange" && p.Complexity != "O(amount · len(coins))" {
			t.Errorf("dp.CoinChange: Complexity = %q", p.Complexity)
		}
		if strings.HasSuffix(p.Complexity, ".") || strings.HasPrefix(p.Complexity, "Ожидаемая") {
			t.Errorf("%s.%s: в эталоне сложности остались префикс или точка: %q", p.Pkg, p.Fn, p.Complexity)
		}
		// Размечать заготовки абзацами «Шаблон/Также решается/Признак» начнёт Task 7.
		if len(p.Also) != 0 || p.Sign != "" {
			t.Errorf("%s.%s: метки появились раньше разметки заготовок: also=%v sign=%q", p.Pkg, p.Fn, p.Also, p.Sign)
		}
	}
	if withComplexity != 162 {
		t.Errorf("задач с эталоном сложности %d, ожидалось 162", withComplexity)
	}
}

func TestRenderNewFields(t *testing.T) {
	out := string(render([]problem{
		{Pkg: "p", Fn: "F", Chapter: "c", Text: "s", Hint: "h", Tests: []string{"TestF"},
			Complexity: "O(n)", Also: []string{"a", "b"}, Sign: "g"},
		{Pkg: "p", Fn: "G", Chapter: "c", Text: "s", Hint: "", Tests: nil},
	}))
	for _, want := range []string{
		`{ p: "p", f: "F", c: "c", s: "s", h: "h", t: ["TestF"], x: "O(n)", a: ["a", "b"], g: "g" },`,
		`{ p: "p", f: "G", c: "c", s: "s", h: "", t: [], x: "", a: [], g: "" },`,
	} {
		if !strings.Contains(out, want) {
			t.Errorf("в банке нет строки %s:\n%s", want, out)
		}
	}
	if !strings.Contains(out, "x — эталон сложности") {
		t.Errorf("шапка файла не описывает поле x")
	}
}
