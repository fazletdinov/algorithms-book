package hashtable

import (
	"slices"
	"strings"
	"testing"
)

func TestHashMapBasic(t *testing.T) {
	h := NewHashMap()
	if h.Len() != 0 {
		t.Fatalf("пустая таблица: Len() = %d, ожидалось 0", h.Len())
	}

	// При 4 бакетах ключи 1 и 5 дают один бакет (коллизия) — цепочка.
	h.Put(1, 10)
	h.Put(5, 50)
	h.Put(3, 30)
	if h.Len() != 3 {
		t.Fatalf("после трёх вставок Len() = %d, ожидалось 3", h.Len())
	}

	if v, ok := h.Get(5); !ok || v != 50 {
		t.Errorf("Get(5) = (%d, %v), ожидалось (50, true) — коллизия с 1", v, ok)
	}
	if v, ok := h.Get(1); !ok || v != 10 {
		t.Errorf("Get(1) = (%d, %v), ожидалось (10, true)", v, ok)
	}
	if _, ok := h.Get(7); ok {
		t.Errorf("Get(7) = _, true, ожидалось false (ключа нет)")
	}

	// Повторный Put обновляет значение, не увеличивая размер.
	h.Put(1, 99)
	if v, _ := h.Get(1); v != 99 {
		t.Errorf("после Put(1,99) Get(1) = %d, ожидалось 99", v)
	}
	if h.Len() != 3 {
		t.Errorf("обновление значения изменило Len() = %d, ожидалось 3", h.Len())
	}

	// Delete: первый раз true, повторный — false.
	if !h.Delete(5) {
		t.Errorf("Delete(5) = false, ожидалось true (ключ был)")
	}
	if _, ok := h.Get(5); ok {
		t.Errorf("после Delete(5) Get(5) даёт true, ожидалось false")
	}
	if v, ok := h.Get(1); !ok || v != 99 {
		t.Errorf("Delete(5) задел соседа по цепочке: Get(1) = (%d, %v)", v, ok)
	}
	if h.Delete(5) {
		t.Errorf("повторный Delete(5) = true, ожидалось false")
	}
	if h.Len() != 2 {
		t.Errorf("после удаления Len() = %d, ожидалось 2", h.Len())
	}
}

// Рост: 100 ключей переживают несколько перехеширований без потерь.
func TestHashMapResize(t *testing.T) {
	h := NewHashMap()
	const n = 100
	for i := range n {
		h.Put(i, i*i)
	}
	if h.Len() != n {
		t.Fatalf("Len() = %d, ожидалось %d", h.Len(), n)
	}
	for i := range n {
		if v, ok := h.Get(i); !ok || v != i*i {
			t.Fatalf("после роста Get(%d) = (%d, %v), ожидалось (%d, true)", i, v, ok, i*i)
		}
	}
}

// Отрицательные ключи: индекс бакета должен нормализовать знак.
func TestHashMapNegativeKeys(t *testing.T) {
	h := NewHashMap()
	for _, k := range []int{-7, -3, -1, 0, 2} {
		h.Put(k, k*10)
	}
	for _, k := range []int{-7, -3, -1, 0, 2} {
		if v, ok := h.Get(k); !ok || v != k*10 {
			t.Errorf("Get(%d) = (%d, %v), ожидалось (%d, true)", k, v, ok, k*10)
		}
	}
}

func TestTwoSum(t *testing.T) {
	tests := []struct {
		name   string
		nums   []int
		target int
		want   []int
	}{
		{"пример главы", []int{3, 8, 4, 1, 9, 5}, 10, []int{3, 4}},
		{"пара в начале", []int{2, 7, 11, 15}, 9, []int{0, 1}},
		{"половина target встречается один раз — сама с собой не пара", []int{3, 2, 4}, 6, []int{1, 2}},
		{"два одинаковых числа", []int{3, 3}, 6, []int{0, 1}},
		{"отрицательные и ноль", []int{-3, 4, 3, 90}, 0, []int{0, 2}},
		{"дополнение правее и левее", []int{5, 1, 7, 2}, 9, []int{2, 3}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := TwoSum(slices.Clone(tt.nums), tt.target); !slices.Equal(got, tt.want) {
				t.Errorf("TwoSum(%v, %d) = %v, ожидалось %v", tt.nums, tt.target, got, tt.want)
			}
		})
	}
}

// normGroups — группы в каноническом виде: слова внутри группы и сами группы
// отсортированы. Порядок, в котором решение отдало группы, не важен.
func normGroups(groups [][]string) [][]string {
	out := make([][]string, 0, len(groups))
	for _, g := range groups {
		c := slices.Clone(g)
		slices.Sort(c)
		out = append(out, c)
	}
	slices.SortFunc(out, func(a, b []string) int {
		return strings.Compare(strings.Join(a, ","), strings.Join(b, ","))
	})
	return out
}

func equalGroups(a, b [][]string) bool {
	return slices.EqualFunc(normGroups(a), normGroups(b), slices.Equal[[]string])
}

func TestGroupAnagrams(t *testing.T) {
	tests := []struct {
		name  string
		words []string
		want  [][]string
	}{
		{"пример", []string{"eat", "tea", "tan", "ate", "nat", "bat"},
			[][]string{{"eat", "tea", "ate"}, {"tan", "nat"}, {"bat"}}},
		{"пустая строка — тоже слово", []string{""}, [][]string{{""}}},
		{"одно слово", []string{"a"}, [][]string{{"a"}}},
		{"одинаковые слова — в одну группу", []string{"ab", "ba", "ab"}, [][]string{{"ab", "ba", "ab"}}},
		{"те же буквы, другое число повторов — не анаграммы", []string{"aab", "abb", "bab"},
			[][]string{{"aab"}, {"abb", "bab"}}},
		{"разная длина — разные группы", []string{"a", "aa", "aaa"}, [][]string{{"a"}, {"aa"}, {"aaa"}}},
		{"равная сумма кодов букв — ещё не анаграммы", []string{"ad", "bc", "da"}, [][]string{{"ad", "da"}, {"bc"}}},
		{"пустой вход", []string{}, [][]string{}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := GroupAnagrams(slices.Clone(tt.words)); !equalGroups(got, tt.want) {
				t.Errorf("GroupAnagrams(%q) = %q, ожидались группы %q", tt.words, got, tt.want)
			}
		})
	}
}

func TestLongestConsecutive(t *testing.T) {
	tests := []struct {
		name string
		nums []int
		want int
	}{
		{"пример", []int{100, 4, 200, 1, 3, 2}, 4},
		{"цепочка вперемешку с повтором", []int{0, 3, 7, 2, 5, 8, 4, 6, 0, 1}, 9},
		{"повтор не удлиняет цепочку", []int{1, 2, 0, 1}, 3},
		{"пусто", []int{}, 0},
		{"одно число", []int{7}, 1},
		{"все одинаковые", []int{5, 5, 5}, 1},
		{"отрицательные", []int{-1, -3, -2, 10, 11}, 3},
		{"две цепочки, длинная вторая", []int{1, 2, 10, 11, 12, 13}, 4},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := LongestConsecutive(slices.Clone(tt.nums)); got != tt.want {
				t.Errorf("LongestConsecutive(%v) = %d, ожидалось %d", tt.nums, got, tt.want)
			}
		})
	}
}

func TestFirstUniqueChar(t *testing.T) {
	tests := []struct {
		s    string
		want int
	}{
		{"leetcode", 0},
		{"loveleetcode", 2},
		{"aabb", -1},
		{"", -1},
		{"z", 0},
		{"aabbc", 4},
		{"abab", -1},
		{"abcabd", 2},
	}
	for _, tt := range tests {
		t.Run(tt.s, func(t *testing.T) {
			if got := FirstUniqueChar(tt.s); got != tt.want {
				t.Errorf("FirstUniqueChar(%q) = %d, ожидалось %d", tt.s, got, tt.want)
			}
		})
	}
}
