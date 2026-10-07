package toposort

import "testing"

// equalInts сравнивает по длине и элементам: nil и пустой срез равны, задача не про это.
func equalInts(a, b []int) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}

// isValidTopo проверяет, что order — корректная топологическая сортировка:
// содержит все вершины 0..n-1 ровно один раз и для каждого ребра b->a
// вершина b встречается раньше a.
func isValidTopo(n int, prerequisites [][]int, order []int) bool {
	if len(order) != n {
		return false
	}
	pos := make([]int, n)
	seen := make([]bool, n)
	for i, v := range order {
		if v < 0 || v >= n || seen[v] {
			return false
		}
		seen[v] = true
		pos[v] = i
	}
	for _, p := range prerequisites {
		a, b := p[0], p[1]
		if pos[b] > pos[a] {
			return false
		}
	}
	return true
}

func TestTopologicalSort(t *testing.T) {
	tests := []struct {
		name          string
		numCourses    int
		prerequisites [][]int
		wantCycle     bool // true -> ожидаем пустой результат
	}{
		{"без зависимостей", 3, [][]int{}, false},
		{"цепочка", 4, [][]int{{1, 0}, {2, 1}, {3, 2}}, false},
		{"ромб", 4, [][]int{{1, 0}, {2, 0}, {3, 1}, {3, 2}}, false},
		{"две компоненты", 5, [][]int{{1, 0}, {3, 2}}, false},
		{"простой цикл", 2, [][]int{{1, 0}, {0, 1}}, true},
		{"цикл из трёх", 3, [][]int{{1, 0}, {2, 1}, {0, 2}}, true},
		{"хвост перед циклом", 3, [][]int{{1, 0}, {2, 1}, {1, 2}}, true},
		{"изолированная вершина рядом с циклом", 3, [][]int{{1, 0}, {0, 1}}, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := TopologicalSort(tt.numCourses, tt.prerequisites)
			if tt.wantCycle {
				if len(got) != 0 {
					t.Errorf("TopologicalSort(%d, %v) = %v, ожидался пустой срез (цикл)", tt.numCourses, tt.prerequisites, got)
				}
				return
			}
			if !isValidTopo(tt.numCourses, tt.prerequisites, got) {
				t.Errorf("TopologicalSort(%d, %v) = %v — не является корректной топологической сортировкой", tt.numCourses, tt.prerequisites, got)
			}
		})
	}
}

func TestFindOrderLexSmallest(t *testing.T) {
	tests := []struct {
		name          string
		numCourses    int
		prerequisites [][]int
		want          []int
	}{
		{"ромб", 4, [][]int{{1, 0}, {2, 0}, {3, 1}, {3, 2}}, []int{0, 1, 2, 3}},
		{"без зависимостей", 3, [][]int{}, []int{0, 1, 2}},
		{"цепочка", 4, [][]int{{1, 0}, {2, 1}, {3, 2}}, []int{0, 1, 2, 3}},
		{"выбор меньшей вершины", 4, [][]int{{0, 2}}, []int{1, 2, 0, 3}},
		{"простой цикл", 2, [][]int{{0, 1}, {1, 0}}, []int{}},
		{"цикл из трёх", 3, [][]int{{1, 0}, {2, 1}, {0, 2}}, []int{}},
		{"хвост перед циклом", 3, [][]int{{1, 0}, {2, 1}, {1, 2}}, []int{}},
		{"после вершины открылись сразу три — берём меньшую", 5, [][]int{{3, 2}, {0, 4}, {3, 4}, {1, 4}}, []int{2, 4, 0, 1, 3}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := FindOrderLexSmallest(tt.numCourses, tt.prerequisites)
			if !equalInts(got, tt.want) {
				t.Errorf("FindOrderLexSmallest(%d, %v) = %v, ожидалось %v", tt.numCourses, tt.prerequisites, got, tt.want)
			}
		})
	}
}

// isValidAlienOrder проверяет, что order содержит ровно все буквы слов и
// для каждой пары соседних слов соблюдён порядок: на первой различающейся
// позиции буква из левого слова идёт раньше буквы из правого в order.
func isValidAlienOrder(words []string, order string) bool {
	pos := make(map[byte]int)
	for i := 0; i < len(order); i++ {
		if _, ok := pos[order[i]]; ok {
			return false // дубликат буквы
		}
		pos[order[i]] = i
	}
	letters := make(map[byte]bool)
	for _, w := range words {
		for i := 0; i < len(w); i++ {
			letters[w[i]] = true
		}
	}
	if len(letters) != len(order) {
		return false
	}
	for c := range letters {
		if _, ok := pos[c]; !ok {
			return false
		}
	}
	for i := 0; i+1 < len(words); i++ {
		w1, w2 := words[i], words[i+1]
		minLen := len(w1)
		if len(w2) < minLen {
			minLen = len(w2)
		}
		matched := false
		for j := 0; j < minLen; j++ {
			if w1[j] != w2[j] {
				if pos[w1[j]] > pos[w2[j]] {
					return false
				}
				matched = true
				break
			}
		}
		if !matched && len(w1) > len(w2) {
			return false
		}
	}
	return true
}

func TestAlienOrder(t *testing.T) {
	tests := []struct {
		name      string
		words     []string
		wantExact string // если != "", проверяем точное совпадение
		valid     bool   // ожидаем валидный (непустой) порядок
	}{
		{"классический пример", []string{"wrt", "wrf", "er", "ett", "rftt"}, "wertf", true},
		{"противоречие z-x-z", []string{"z", "x", "z"}, "", false},
		{"цикл с хвостом", []string{"x", "a", "b", "a"}, "", false},
		{"одна буква", []string{"z", "x"}, "zx", true},
		{"префикс длиннее", []string{"abc", "ab"}, "", false},
		{"несколько валидных", []string{"ac", "ab", "zc", "zb"}, "", true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := AlienOrder(tt.words)
			if !tt.valid {
				if got != "" {
					t.Errorf("AlienOrder(%v) = %q, ожидался пустой результат (противоречие)", tt.words, got)
				}
				return
			}
			if tt.wantExact != "" {
				if got != tt.wantExact {
					t.Errorf("AlienOrder(%v) = %q, ожидалось %q", tt.words, got, tt.wantExact)
				}
				return
			}
			if got == "" || !isValidAlienOrder(tt.words, got) {
				t.Errorf("AlienOrder(%v) = %q — не является корректным порядком алфавита", tt.words, got)
			}
		})
	}
}

func TestCanFinish(t *testing.T) {
	tests := []struct {
		name          string
		numCourses    int
		prerequisites [][]int
		want          bool
	}{
		{"одна зависимость", 2, [][]int{{1, 0}}, true},
		{"взаимная зависимость", 2, [][]int{{1, 0}, {0, 1}}, false},
		{"корректный DAG", 4, [][]int{{1, 0}, {2, 0}, {3, 1}, {3, 2}}, true},
		{"без зависимостей", 3, [][]int{}, true},
		{"цикл из трёх", 3, [][]int{{1, 0}, {2, 1}, {0, 2}}, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := CanFinish(tt.numCourses, tt.prerequisites); got != tt.want {
				t.Errorf("CanFinish(%d, %v) = %v, ожидалось %v", tt.numCourses, tt.prerequisites, got, tt.want)
			}
		})
	}
}
