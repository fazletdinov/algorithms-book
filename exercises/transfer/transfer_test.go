package transfer

import (
	"slices"
	"testing"
)

// normPeople приводит ответ MergeAccounts к одному виду: порядок людей условием не
// задан, поэтому сравниваем отсортированные списки.
func normPeople(people [][]string) [][]string {
	out := make([][]string, len(people))
	for i, p := range people {
		out[i] = slices.Clone(p)
	}
	slices.SortFunc(out, func(a, b []string) int { return slices.Compare(a, b) })
	return out
}

func TestMergeAccounts(t *testing.T) {
	tests := []struct {
		name     string
		accounts [][]string
		want     [][]string
	}{
		{"пример", [][]string{{"Аня", "a@x", "b@x"}, {"Борис", "c@x"}, {"Аня", "b@x", "d@x"}, {"Аня", "e@x"}},
			[][]string{{"Аня", "a@x", "b@x", "d@x"}, {"Аня", "e@x"}, {"Борис", "c@x"}}},
		{"одна запись, почты не по порядку", [][]string{{"Ваня", "z@x", "a@x", "m@x"}},
			[][]string{{"Ваня", "a@x", "m@x", "z@x"}}},
		{"повтор почты внутри записи", [][]string{{"Ваня", "a@x", "a@x"}},
			[][]string{{"Ваня", "a@x"}}},
		{"цепочка: A–B и B–C, у A и C общего нет", [][]string{{"Глеб", "a@x", "b@x"}, {"Глеб", "c@x", "d@x"}, {"Глеб", "b@x", "c@x"}},
			[][]string{{"Глеб", "a@x", "b@x", "c@x", "d@x"}}},
		{"тёзки без общей почты — разные люди", [][]string{{"Дина", "a@x"}, {"Дина", "b@x"}},
			[][]string{{"Дина", "a@x"}, {"Дина", "b@x"}}},
		{"полная копия записи", [][]string{{"Ева", "a@x", "b@x"}, {"Ева", "b@x", "a@x"}},
			[][]string{{"Ева", "a@x", "b@x"}}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := normPeople(MergeAccounts(tt.accounts))
			if !slices.EqualFunc(got, tt.want, slices.Equal[[]string]) {
				t.Errorf("MergeAccounts(%v) = %v, ожидалось %v (порядок людей не важен)", tt.accounts, got, tt.want)
			}
		})
	}
}

func TestProcessingOrder(t *testing.T) {
	tests := []struct {
		name  string
		tasks [][]int
		want  []int
	}{
		{"пример", [][]int{{1, 2}, {2, 4}, {3, 2}, {4, 1}}, []int{0, 2, 3, 1}},
		{"одна задача", [][]int{{5, 3}}, []int{0}},
		{"все сразу — по длительности, ничья по номеру", [][]int{{7, 10}, {7, 12}, {7, 5}, {7, 4}, {7, 2}}, []int{4, 3, 2, 0, 1}},
		{"короткая пришла позже, но процессор уже занят", [][]int{{1, 10}, {2, 1}, {2, 5}}, []int{0, 1, 2}},
		{"простой между задачами", [][]int{{1, 1}, {100, 1}, {50, 1}}, []int{0, 2, 1}},
		{"задачи не по порядку поступления", [][]int{{10, 1}, {1, 3}, {2, 2}}, []int{1, 2, 0}},
		{"большие времена без переполнения", [][]int{{1, 1000000000}, {2, 1000000000}, {3, 1}}, []int{0, 2, 1}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := ProcessingOrder(tt.tasks); !slices.Equal(got, tt.want) {
				t.Errorf("ProcessingOrder(%v) = %v, ожидалось %v", tt.tasks, got, tt.want)
			}
		})
	}
}

func TestIslandCounts(t *testing.T) {
	tests := []struct {
		name  string
		m, n  int
		cells [][]int
		want  []int
	}{
		{"пример", 3, 3, [][]int{{0, 0}, {0, 1}, {1, 2}, {2, 1}, {1, 1}}, []int{1, 1, 2, 3, 1}},
		{"одна клетка", 1, 1, [][]int{{0, 0}}, []int{1}},
		{"повторная засыпка", 2, 2, [][]int{{0, 0}, {0, 0}, {1, 1}, {1, 1}}, []int{1, 1, 2, 2}},
		{"по диагонали — разные острова", 2, 2, [][]int{{0, 0}, {1, 1}}, []int{1, 2}},
		{"кольцо: последняя клетка касается одного острова дважды", 2, 2, [][]int{{0, 0}, {0, 1}, {1, 0}, {1, 1}}, []int{1, 1, 1, 1}},
		{"ряд, заполняемый через клетку", 1, 5, [][]int{{0, 0}, {0, 2}, {0, 4}, {0, 1}, {0, 3}}, []int{1, 2, 3, 2, 1}},
		{"край строки не склеивается со следующей", 2, 3, [][]int{{0, 2}, {1, 0}}, []int{1, 2}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := IslandCounts(tt.m, tt.n, tt.cells); !slices.Equal(got, tt.want) {
				t.Errorf("IslandCounts(%d, %d, %v) = %v, ожидалось %v", tt.m, tt.n, tt.cells, got, tt.want)
			}
		})
	}
}

func TestMaxMinGap(t *testing.T) {
	tests := []struct {
		name   string
		points []int
		k      int
		want   int
	}{
		{"пример", []int{1, 2, 3, 4, 7}, 3, 3},
		{"две станции — по краям", []int{5, 1}, 2, 4},
		{"не отсортированы", []int{9, 1, 8, 2, 4}, 3, 3},
		{"все места заняты", []int{3, 1, 2}, 3, 1},
		{"ответ не равен ни одной разности соседей", []int{0, 3, 4, 7, 10}, 3, 4},
		{"нуль и большая координата", []int{0, 1000000000, 500000000}, 3, 500000000},
		{"скучились у края", []int{0, 1, 2, 3, 100}, 3, 3},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			in := slices.Clone(tt.points)
			if got := MaxMinGap(in, tt.k); got != tt.want {
				t.Errorf("MaxMinGap(%v, %d) = %d, ожидалось %d", tt.points, tt.k, got, tt.want)
			}
		})
	}
}

func TestShortestRemoval(t *testing.T) {
	tests := []struct {
		name string
		nums []int
		p    int
		want int
	}{
		{"пример", []int{3, 1, 4, 2}, 6, 1},
		{"кусок из двух в конце", []int{6, 3, 5, 2}, 9, 2},
		{"подходит только весь массив", []int{1, 2, 3}, 7, -1},
		{"уже делится", []int{1, 2, 3}, 3, 0},
		{"один элемент, не делится", []int{5}, 3, -1},
		{"один элемент, делится", []int{6}, 3, 0},
		{"кусок в начале", []int{4, 1, 1, 1}, 3, 1},
		{"кусок в середине", []int{3, 3, 1, 3, 3}, 3, 1},
		{"ближний префикс, а не первый", []int{1, 3, 3, 3, 1, 2}, 4, 1},
		{"большие числа без переполнения", []int{1000000000, 1000000000, 1000000000}, 1000000000, 0},
		{"p = 1", []int{7, 8}, 1, 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := ShortestRemoval(tt.nums, tt.p); got != tt.want {
				t.Errorf("ShortestRemoval(%v, %d) = %d, ожидалось %d", tt.nums, tt.p, got, tt.want)
			}
		})
	}
}

func TestSmallestUniqueLetters(t *testing.T) {
	tests := []struct {
		name string
		s    string
		want string
	}{
		{"пример 1", "bcabc", "abc"},
		{"пример 2", "cbacdcbc", "acdb"},
		{"одна буква", "a", "a"},
		{"одна буква много раз", "zzzz", "z"},
		{"все разные — ничего не вычеркнуть", "dcba", "dcba"},
		{"большую нельзя выкинуть: дальше её нет", "bab", "ab"},
		{"меньшая не вытесняет единственную большую", "cab", "cab"},
		{"уже взятая буква пропускается", "abacb", "abc"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := SmallestUniqueLetters(tt.s); got != tt.want {
				t.Errorf("SmallestUniqueLetters(%q) = %q, ожидалось %q", tt.s, got, tt.want)
			}
		})
	}
}

func TestOpenLock(t *testing.T) {
	tests := []struct {
		name   string
		traps  []string
		target string
		want   int
	}{
		{"пример", []string{"0201", "0101", "0102", "1212", "2002"}, "0202", 6},
		{"через 9 и 0", []string{"8888"}, "0009", 1},
		{"уже открыт", nil, "0000", 0},
		{"старт — ловушка", []string{"0000"}, "8888", -1},
		{"все соседи цели — ловушки", []string{"8887", "8889", "8878", "8898", "8788", "8988", "7888", "9888"}, "8888", -1},
		{"цель — ловушка", []string{"0001"}, "0001", -1},
		{"самая дальняя комбинация", nil, "5555", 20},
		{"обход ловушки", []string{"0001", "0009"}, "0002", 4},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := OpenLock(tt.traps, tt.target); got != tt.want {
				t.Errorf("OpenLock(%v, %q) = %d, ожидалось %d", tt.traps, tt.target, got, tt.want)
			}
		})
	}
}

func TestMaxDistinctSum(t *testing.T) {
	tests := []struct {
		name string
		nums []int
		k    int
		want int
	}{
		{"пример", []int{1, 5, 4, 2, 9, 9, 9}, 3, 15},
		{"нет отрезка без повторов", []int{4, 4, 4}, 3, 0},
		{"k = 1 — просто максимум", []int{3, 8, 2}, 1, 8},
		{"k = n, все разные", []int{1, 2, 3}, 3, 6},
		{"k = n, есть повтор", []int{1, 2, 1}, 3, 0},
		{"повтор уходит из окна", []int{2, 2, 3, 4}, 3, 9},
		{"дорогой отрезок с повтором не в счёт", []int{100, 100, 1, 2}, 2, 101},
		{"большие числа", []int{1000000000, 999999999, 1000000000}, 2, 1999999999},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := MaxDistinctSum(tt.nums, tt.k); got != tt.want {
				t.Errorf("MaxDistinctSum(%v, %d) = %d, ожидалось %d", tt.nums, tt.k, got, tt.want)
			}
		})
	}
}
