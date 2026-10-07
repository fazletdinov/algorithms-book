package stubdoc

import (
	"os"
	"path/filepath"
	"slices"
	"testing"
)

func TestOwnerOf(t *testing.T) {
	tests := []struct {
		test  string
		funcs []string
		want  string
	}{
		{"TestCoinChange", []string{"CoinChange", "ClimbStairs"}, "CoinChange"},
		{"TestCoinChangeRandom", []string{"CoinChange"}, "CoinChange"},
		{"TestSum_Empty", []string{"Sum"}, "Sum"},
		{"TestLIS2", []string{"LIS"}, "LIS"},
		// Четыре реальные коллизии банка: спорный тест уходит самому длинному имени.
		{"TestSubsetsWithDup", []string{"Subsets", "SubsetsWithDup"}, "SubsetsWithDup"},
		{"TestSubsetsWithDupRandom", []string{"Subsets", "SubsetsWithDup"}, "SubsetsWithDup"},
		{"TestShortestPathWithAtMostKEdges", []string{"ShortestPath", "ShortestPathWithAtMostKEdges"}, "ShortestPathWithAtMostKEdges"},
		{"TestMSTWeightPrim", []string{"MSTWeight", "MSTWeightPrim"}, "MSTWeightPrim"},
		{"TestBFSLevelsConcLocalMatchesSeq", []string{"BFSLevelsConc", "BFSLevelsConcLocal"}, "BFSLevelsConcLocal"},
		// Продолжение со строчной буквы — это другое слово, а не вариант функции.
		{"TestFoo", []string{"Fo"}, ""},
		{"TestSortedness", []string{"Sort"}, ""},
		// Тест, не похожий ни на одну функцию, не достаётся никому.
		{"TestRandomAgainstNaive", []string{"CoinChange"}, ""},
	}
	for _, tt := range tests {
		if got := OwnerOf(tt.test, tt.funcs); got != tt.want {
			t.Errorf("OwnerOf(%q, %v) = %q, ожидалось %q", tt.test, tt.funcs, got, tt.want)
		}
	}
}

func TestIsHint(t *testing.T) {
	tests := []struct {
		para string
		want bool
	}{
		{"Подсказка: используйте A*.", true},
		{"Ожидаемая сложность: O(n).", true},
		{"Не забудьте про пустой вход.", true},
		{"Ограничение-отсечение: глубина не больше k.", true},
		{"Внимание: порядок важен.", true},
		{"Совет: начните с перебора.", true},
		{"Требование: без дополнительной памяти.", true},
		// «Требование» без двоеточия — обычное слово условия.
		{"Требования к входу описаны ниже.", false},
		{"Пример: arr=[2,1,5], k=2 -> 6.", false},
		{"Возвращает максимум. Подсказка в середине абзаца не считается.", false},
		{"", false},
	}
	for _, tt := range tests {
		if got := IsHint(tt.para); got != tt.want {
			t.Errorf("IsHint(%q) = %v, ожидалось %v", tt.para, got, tt.want)
		}
	}
}

func TestStatement(t *testing.T) {
	tests := []struct {
		name, doc, wantText, wantHint string
	}{
		{
			name: "условие и подсказки делятся, переносы внутри абзаца схлопываются",
			doc: "Sum считает сумму\nэлементов среза.\n\nПример: [1,2] -> 3.\n\n" +
				"Подсказка: один проход.\n\nОжидаемая сложность: O(n).\n",
			wantText: "Sum считает сумму элементов среза.\nПример: [1,2] -> 3.",
			wantHint: "Подсказка: один проход.\nОжидаемая сложность: O(n).",
		},
		{name: "подсказок нет", doc: "Только условие.\n", wantText: "Только условие.", wantHint: ""},
		{name: "пустые абзацы пропускаются", doc: "A.\n\n\n\nB.\n", wantText: "A.\nB.", wantHint: ""},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			text, hint := Statement(tt.doc)
			if text != tt.wantText || hint != tt.wantHint {
				t.Errorf("Statement() = (%q, %q), ожидалось (%q, %q)", text, hint, tt.wantText, tt.wantHint)
			}
		})
	}
}

func writeFiles(t *testing.T, dir string, files map[string]string) {
	t.Helper()
	for name, src := range files {
		if err := os.WriteFile(filepath.Join(dir, name), []byte(src), 0o644); err != nil {
			t.Fatal(err)
		}
	}
}

func TestAssignTests(t *testing.T) {
	dir := t.TempDir()
	writeFiles(t, dir, map[string]string{
		"a_test.go": "package a\n\nimport \"testing\"\n\n" +
			"func TestSubsets(t *testing.T) {}\n" +
			"func TestSubsetsWithDup(t *testing.T) {}\n" +
			"func TestSubsetsRandom(t *testing.T) {}\n" +
			"func TestMain(m *testing.M) {}\n" +
			"func helper() {}\n" +
			"func BenchmarkSubsets(b *testing.B) {}\n",
		"a_zrand_test.go": "package a\n\nimport \"testing\"\n\n" +
			"func TestSubsetsWithDupRandom(t *testing.T) {}\nfunc TestStray(t *testing.T) {}\n",
		"not_a_test.go": "package a\n\nfunc TestIgnored() {}\n",
	})

	got, err := AssignTests(dir, []string{"Subsets", "SubsetsWithDup"})
	if err != nil {
		t.Fatal(err)
	}
	want := map[string][]string{
		"Subsets":        {"TestSubsets", "TestSubsetsRandom"},
		"SubsetsWithDup": {"TestSubsetsWithDup", "TestSubsetsWithDupRandom"},
	}
	for fn, tests := range want {
		if !slices.Equal(got[fn], tests) {
			t.Errorf("AssignTests[%s] = %v, ожидалось %v", fn, got[fn], tests)
		}
	}
	if len(got) != len(want) {
		t.Errorf("лишние ключи в результате: %v", got)
	}
}

func TestAssignTestsReportsBrokenTestFile(t *testing.T) {
	dir := t.TempDir()
	writeFiles(t, dir, map[string]string{"x_test.go": "package x\nfunc ("})
	if _, err := AssignTests(dir, []string{"X"}); err == nil {
		t.Fatal("ожидалась ошибка разбора тестового файла")
	}
}
