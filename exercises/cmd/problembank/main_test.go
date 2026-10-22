package main

import (
	"os"
	"path/filepath"
	"slices"
	"strings"
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/cmd/internal/stubdoc"
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
		{Pkg: "cryptography", Fn: "ModExp", Text: "Функция возвращает base^exp mod m.\nОграничения: m < 2⁶³."},
		{Pkg: "graphs", Fn: "BFS", Text: "Функция обходит граф."},
		{Pkg: "numbertheory", Fn: "PowMod", Text: "Функция возвращает base^exp mod m.\nОграничения: m ≤ 3·10⁹."},
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
			// «p.F: …» — ошибка метки в банке; «…/p.go: F: …» — та же метка, пойманная при разборе упражнений.
			if msg := err.Error(); !strings.Contains(msg, "p.F") && !strings.Contains(msg, "p.go: F: ") {
				t.Errorf("ошибка должна называть пакет и функцию: %v", err)
			}
		})
	}
}

// Банк настоящих заготовок: поля «эталон сложности» и «соседи»; разметку «Шаблон / Также
// решается / Признак» сверяет TestCollectRealBankMarks.
func TestCollectRealBankNewFields(t *testing.T) {
	ps, _, err := collect("../..")
	if err != nil {
		t.Fatal(err)
	}
	ps, _ = dedupe(ps) // как в main: счёт идёт по тому, что реально попадает в банк
	withComplexity := 0
	var needs []string
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
		if p.Needs != nil {
			needs = append(needs, p.Pkg+"."+p.Fn+" -> "+strings.Join(p.Needs, ","))
		}
	}
	if withComplexity != 200 {
		t.Errorf("задач с эталоном сложности %d, ожидалось 200 (абзацев «Ожидаемая сложность:» стало больше или меньше — "+
			"сверь с docs заготовок и поправь число)", withComplexity)
	}
	// n в банке — это needs из stubdoc (список пар лежит там: stubdoc/module_test.go, expectedNeeds);
	// здесь сверяем, что банк отдал его без искажений, и что поле вообще заполнено.
	for _, p := range ps {
		want := stubdocNeeds(t, p.Pkg, p.Fn)
		if !slices.Equal(p.Needs, want) {
			t.Errorf("%s.%s: n = %v, а stubdoc говорит %v", p.Pkg, p.Fn, p.Needs, want)
		}
	}
	if len(needs) < 10 {
		t.Errorf("записей банка с непустым n: %d — меньше ожидаемого", len(needs))
	}
	for _, spot := range []string{"parallelbfs.BFSLevelsConc -> BFSLevelsSeq", "numbertheory.LCM -> GCD"} {
		if !slices.Contains(needs, spot) {
			t.Errorf("в банке нет зависимости %q: %v", spot, needs)
		}
	}
}

// realMarks — разметка заготовок абзацами «Шаблон / Также решается / Признак»: глава-ответ c,
// альтернативы a и есть ли признак g. Каждая строка сверена с текстом глав: глава из a учит тот же
// приём на задаче такого вида (big-o — «следующий больший» как пример амортизации, sorting —
// QuickSelect и Sort Colors, merge-intervals — задача 435, dynamic-programming — Кадане и Фибоначчи,
// recursion — лестница как рекуррента Фибоначчи, greedy — «удали k цифр» доказана заменой, как
// жадность, union-find-structure — цикл в неориентированном графе). MaxSlidingWindow — без
// альтернативы: глава о монотонном стеке называет максимум окна в «Когда НЕ применять».
var realMarks = map[string]struct {
	c string
	a []string
}{
	"bigo.NextGreaterElement":         {"monotonic-stack", []string{"big-o"}},
	"bigo.DailyTemperatures":          {"monotonic-stack", []string{"big-o"}},
	"graphs.HasCycleUndirected":       {"graphs", []string{"union-find-structure"}},
	"topk.KthLargest":                 {"top-k-elements", []string{"sorting"}},
	"sorting.QuickSelect":             {"sorting", []string{"top-k-elements"}},
	"prefixsum.MaxSubarraySum":        {"prefix-sums", []string{"dynamic-programming"}},
	"greedy.MaxNonOverlapping":        {"greedy", []string{"merge-intervals"}},
	"twopointers.DutchFlagSort":       {"two-pointers", []string{"sorting"}},
	"slidingwindow.MaxSlidingWindow":  {"sliding-window", nil},
	"stack.RemoveKDigits":             {"monotonic-stack", []string{"greedy"}},
	"recursion.Fib":                   {"recursion", []string{"dynamic-programming"}},
	"dp.ClimbStairs":                  {"dynamic-programming", []string{"recursion"}},
	"prefixsum.CountSubarraysWithSum": {"prefix-sums", nil},
	"toposort.CanFinish":              {"topological-sort", nil},
	"hashtable.TwoSum":                {"hash-table-structure", nil},
	"hashtable.LongestConsecutive":    {"hash-table-structure", nil},
	// fresh — задачи без разбора в книге (P3 аудита): глава-ответ задаёт «Шаблон:».
	"fresh.BestClosingHour":       {"prefix-sums", nil},
	"fresh.CableMovesToConnect":   {"graphs", nil},
	"fresh.CanMergeLogs":          {"dynamic-programming", nil},
	"fresh.ClosestPrices":         {"bst-structure", []string{"modified-binary-search"}},
	"fresh.CountMagnetWords":      {"backtracking", []string{"subsets"}},
	"fresh.CountSteadyPairs":      {"hash-table-structure", []string{"sorting"}},
	"fresh.FastestRoutesCount":    {"graphs", nil},
	"fresh.FurthestStop":          {"top-k-elements", []string{"heap-structure", "modified-binary-search"}},
	"fresh.HIndex":                {"sorting", []string{"modified-binary-search"}},
	"fresh.HeaviestLevel":         {"tree-bfs", []string{"tree-dfs"}},
	"fresh.LastInCircle":          {"recursion", []string{"dynamic-programming"}},
	"fresh.LongestWarmingSpan":    {"monotonic-stack", []string{"sorting"}},
	"fresh.MaxOrdersInVan":        {"dynamic-programming", nil},
	"fresh.MaxSatisfiedCustomers": {"sliding-window", []string{"prefix-sums"}},
	"fresh.MaxTwinSum":            {"fast-slow-pointers", nil},
	"fresh.MaxUniqueParts":        {"backtracking", nil},
	"fresh.MinBoats":              {"two-pointers", []string{"greedy"}},
	"fresh.MinBuildTime":          {"topological-sort", []string{"dynamic-programming"}},
	"fresh.MinTicketCost":         {"dynamic-programming", nil},
	"fresh.MinTimeForTrips":       {"modified-binary-search", nil},
	"fresh.SplitBetweenOffices":   {"greedy", nil},
	"fresh.TimeToNotifyAll":       {"tree-dfs", []string{"tree-bfs"}},
	"fresh.TotalBusyTime":         {"merge-intervals", nil},
}

// Банк настоящих заготовок: размеченные функции получили ровно свою главу-ответ и свои
// альтернативы, у каждой есть признак; у остальных ни альтернатив, ни признака нет — метка не
// расползлась по соседним функциям и не потерялась при правке заготовки.
func TestCollectRealBankMarks(t *testing.T) {
	ps, _, err := collect("../..")
	if err != nil {
		t.Fatal(err)
	}
	ps, _ = dedupe(ps)
	found := map[string]bool{}
	for _, p := range ps {
		id := p.Pkg + "." + p.Fn
		want, marked := realMarks[id]
		if !marked {
			if len(p.Also) != 0 || p.Sign != "" {
				t.Errorf("%s: разметка не из списка realMarks (a=%v g=%q) — сверь её с главами и внеси в список", id, p.Also, p.Sign)
			}
			continue
		}
		found[id] = true
		if p.Chapter != want.c {
			t.Errorf("%s: c = %q, ожидалось %q", id, p.Chapter, want.c)
		}
		if !slices.Equal(p.Also, want.a) {
			t.Errorf("%s: a = %v, ожидалось %v", id, p.Also, want.a)
		}
		if p.Sign == "" {
			t.Errorf("%s: размечена, а признака g нет", id)
		}
	}
	for id := range realMarks {
		if !found[id] {
			t.Errorf("%s: нет в банке — функцию переименовали или условие стало короче порога", id)
		}
	}
}

// stubdocNeeds — needs функции по данным stubdoc, посчитанные независимо от collect.
func stubdocNeeds(t *testing.T, pkg, fn string) []string {
	t.Helper()
	dir := filepath.Join("..", "..", pkg)
	stub, err := os.ReadFile(filepath.Join(dir, pkg+".go"))
	if err != nil {
		t.Fatal(err)
	}
	solution, _ := os.ReadFile(filepath.Join(dir, pkg+"_solution.go"))
	exercises, err := stubdoc.Exercises(stub, solution)
	if err != nil {
		t.Fatal(err)
	}
	links, err := stubdoc.LinkTests(dir, stub, solution, exercises)
	if err != nil {
		t.Fatal(err)
	}
	return links[fn].Needs
}

func TestRenderNewFields(t *testing.T) {
	out := string(render([]problem{
		{Pkg: "p", Fn: "F", Chapter: "c", Text: "s", Hint: "h", Tests: []string{"TestF"},
			Complexity: "O(n)", Also: []string{"a", "b"}, Sign: "g", Needs: []string{"H", "K"}},
		{Pkg: "p", Fn: "G", Chapter: "c", Text: "s", Hint: "", Tests: nil},
	}))
	for _, want := range []string{
		`{ p: "p", f: "F", c: "c", s: "s", h: "h", t: ["TestF"], x: "O(n)", a: ["a", "b"], g: "g", n: ["H", "K"] },`,
		`{ p: "p", f: "G", c: "c", s: "s", h: "", t: [], x: "", a: [], g: "", n: [] },`,
	} {
		if !strings.Contains(out, want) {
			t.Errorf("в банке нет строки %s:\n%s", want, out)
		}
	}
	for _, field := range []string{"x — эталон сложности", "a — слаги глав", "g — признак", "n — другие упражнения"} {
		if !strings.Contains(out, field) {
			t.Errorf("шапка файла не описывает поле %q", field)
		}
	}
}
