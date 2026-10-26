package twopointers

import (
	"reflect"
	"slices"
	"sort"
	"testing"
)

// sortTriples приводит список троек к каноническому порядку, чтобы сравнивать
// результаты независимо от порядка их генерации.
func sortTriples(t [][]int) {
	sort.Slice(t, func(i, j int) bool {
		a, b := t[i], t[j]
		for k := 0; k < len(a) && k < len(b); k++ {
			if a[k] != b[k] {
				return a[k] < b[k]
			}
		}
		return len(a) < len(b)
	})
}

func TestPairWithTargetSum(t *testing.T) {
	tests := []struct {
		name   string
		arr    []int
		target int
		want   []int
	}{
		{"пара в середине", []int{1, 2, 3, 4, 6}, 6, []int{1, 3}},
		{"крайние элементы", []int{2, 5, 9, 11}, 11, []int{0, 2}},
		{"нет пары", []int{1, 2, 3}, 100, []int{-1, -1}},
		{"пустой массив", []int{}, 5, []int{-1, -1}},
		{"один элемент дважды брать нельзя", []int{1, 3, 4}, 6, []int{-1, -1}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := PairWithTargetSum(tt.arr, tt.target); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("PairWithTargetSum(%v, %d) = %v, ожидалось %v", tt.arr, tt.target, got, tt.want)
			}
		})
	}
}

func TestRemoveDuplicates(t *testing.T) {
	tests := []struct {
		name    string
		arr     []int
		wantLen int
		wantArr []int
	}{
		{"с дубликатами", []int{2, 3, 3, 3, 6, 9, 9}, 4, []int{2, 3, 6, 9}},
		{"без дубликатов", []int{1, 2, 3}, 3, []int{1, 2, 3}},
		{"все одинаковые", []int{5, 5, 5}, 1, []int{5}},
		{"пустой", []int{}, 0, []int{}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			orig := append([]int{}, tt.arr...)
			got := RemoveDuplicates(tt.arr)
			if got != tt.wantLen {
				t.Fatalf("RemoveDuplicates(%v) вернул длину %d, ожидалось %d", orig, got, tt.wantLen)
			}
			if !reflect.DeepEqual(tt.arr[:got], tt.wantArr) {
				t.Errorf("RemoveDuplicates(%v): первые %d элементов = %v, ожидалось %v", orig, got, tt.arr[:got], tt.wantArr)
			}
		})
	}
}

func TestSortedSquares(t *testing.T) {
	tests := []struct {
		name string
		arr  []int
		want []int
	}{
		{"с отрицательными", []int{-2, -1, 0, 2, 3}, []int{0, 1, 4, 4, 9}},
		{"все отрицательные", []int{-5, -3, -1}, []int{1, 9, 25}},
		{"все неотрицательные", []int{1, 2, 3}, []int{1, 4, 9}},
		{"один элемент", []int{-4}, []int{16}},
		{"пустой", []int{}, []int{}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := SortedSquares(tt.arr); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("SortedSquares(%v) = %v, ожидалось %v", tt.arr, got, tt.want)
			}
		})
	}
}

func TestTripletsSumToZero(t *testing.T) {
	tests := []struct {
		name string
		arr  []int
		want [][]int
	}{
		{"стандартный", []int{-3, 0, 1, 2, -1, 1, -2}, [][]int{
			{-3, 1, 2}, {-2, 0, 2}, {-2, 1, 1}, {-1, 0, 1},
		}},
		{"с дубликатами нулей", []int{0, 0, 0, 0}, [][]int{{0, 0, 0}}},
		{"нет троек", []int{1, 2, 3}, nil},
		{"меньше трёх элементов", []int{1, -1}, nil},
		{"пустой", []int{}, nil},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := TripletsSumToZero(tt.arr)
			sortTriples(got)
			sortTriples(tt.want)
			// nil и пустой срез равны: задача не про это.
			if !equalTriples(got, tt.want) {
				t.Errorf("TripletsSumToZero(%v) = %v, ожидалось %v", tt.arr, got, tt.want)
			}
		})
	}
}

func TestDutchFlagSort(t *testing.T) {
	tests := []struct {
		name string
		arr  []int
		want []int
	}{
		{"перемешанный", []int{2, 0, 2, 1, 1, 0}, []int{0, 0, 1, 1, 2, 2}},
		{"уже отсортирован", []int{0, 1, 2}, []int{0, 1, 2}},
		{"обратный порядок", []int{2, 2, 1, 1, 0, 0}, []int{0, 0, 1, 1, 2, 2}},
		{"только двойки", []int{2, 2, 2}, []int{2, 2, 2}},
		{"один элемент", []int{1}, []int{1}},
		{"пустой", []int{}, []int{}},
		{"после обмена с high пришёл ноль", []int{1, 2, 0}, []int{0, 1, 2}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			orig := append([]int{}, tt.arr...)
			DutchFlagSort(tt.arr)
			if !reflect.DeepEqual(tt.arr, tt.want) {
				t.Errorf("DutchFlagSort(%v) → %v, ожидалось %v", orig, tt.arr, tt.want)
			}
		})
	}
}

func TestMoveZeroes(t *testing.T) {
	tests := []struct {
		name string
		arr  []int
		want []int
	}{
		{"пример", []int{0, 1, 0, 3, 12}, []int{1, 3, 12, 0, 0}},
		{"один ноль", []int{0}, []int{0}},
		{"без нулей", []int{4, 2, 7}, []int{4, 2, 7}},
		{"одни нули", []int{0, 0, 0}, []int{0, 0, 0}},
		{"нули уже в конце", []int{1, 2, 0, 0}, []int{1, 2, 0, 0}},
		{"отрицательные и дубли", []int{-1, 0, -1, 0, 5}, []int{-1, -1, 5, 0, 0}},
		{"пустой", []int{}, []int{}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			orig := append([]int{}, tt.arr...)
			MoveZeroes(tt.arr)
			if !reflect.DeepEqual(tt.arr, tt.want) {
				t.Errorf("MoveZeroes(%v) = %v, ожидалось %v", orig, tt.arr, tt.want)
			}
		})
	}
}

func TestMaxArea(t *testing.T) {
	tests := []struct {
		name   string
		height []int
		want   int
	}{
		{"пример", []int{1, 8, 6, 2, 5, 4, 8, 3, 7}, 49},
		{"две стенки", []int{1, 1}, 1},
		{"одна стенка", []int{5}, 0},
		{"пустой", []int{}, 0},
		{"лучшая пара не у краёв", []int{1, 2, 4, 3}, 4},
		{"высокие стенки внутри", []int{1, 9, 1, 1, 9, 1}, 27},
		{"нулевые стенки", []int{0, 0, 0}, 0},
		{"равные края", []int{3, 1, 2, 3}, 9},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := MaxArea(tt.height); got != tt.want {
				t.Errorf("MaxArea(%v) = %d, ожидалось %d", tt.height, got, tt.want)
			}
		})
	}
}

func TestMergeSorted(t *testing.T) {
	tests := []struct {
		name  string
		nums1 []int
		m     int
		nums2 []int
		want  []int
	}{
		{"пример", []int{1, 2, 3, 0, 0, 0}, 3, []int{2, 5, 6}, []int{1, 2, 2, 3, 5, 6}},
		{"nums2 пуст", []int{1}, 1, []int{}, []int{1}},
		{"nums1 пуст", []int{0}, 0, []int{1}, []int{1}},
		{"оба пусты", []int{}, 0, []int{}, []int{}},
		{"все nums2 меньше", []int{4, 5, 6, 0, 0, 0}, 3, []int{1, 2, 3}, []int{1, 2, 3, 4, 5, 6}},
		{"все nums2 больше", []int{1, 2, 0, 0}, 2, []int{3, 4}, []int{1, 2, 3, 4}},
		{"вперемешку с дублями и отрицательными", []int{-3, 0, 0, 7, 0, 0, 0}, 4, []int{-5, 0, 7}, []int{-5, -3, 0, 0, 0, 7, 7}},
		{"мусор в свободных ячейках", []int{2, 9, 9}, 1, []int{1, 3}, []int{1, 2, 3}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			orig := append([]int{}, tt.nums1...)
			MergeSorted(tt.nums1, tt.m, tt.nums2, len(tt.nums2))
			if !reflect.DeepEqual(tt.nums1, tt.want) {
				t.Errorf("MergeSorted(%v, %d, %v, %d) -> nums1 = %v, ожидалось %v",
					orig, tt.m, tt.nums2, len(tt.nums2), tt.nums1, tt.want)
			}
		})
	}
}

// TestMergeSortedNoAllocs — «на месте» буквально: слияние с конца пишет прямо в
// свободный хвост nums1 и не заводит копию. Слияние с начала через вспомогательный
// срез даёт тот же ответ за то же O(m + n) — его ловит только счёт аллокаций.
func TestMergeSortedNoAllocs(t *testing.T) {
	const m, n = 1000, 1000
	base := make([]int, m+n)
	nums2 := make([]int, n)
	for i := 0; i < m; i++ {
		base[i] = 2 * i
	}
	for i := range nums2 {
		nums2[i] = 2*i + 1
	}
	nums1 := make([]int, m+n)
	allocs := testing.AllocsPerRun(20, func() {
		copy(nums1, base)
		MergeSorted(nums1, m, nums2, n)
	})
	if allocs > 0 {
		t.Fatalf("MergeSorted: %.0f аллокаций за вызов, ожидалось 0 — слияние «на месте» не заводит копий", allocs)
	}
	for i := range nums1 {
		if nums1[i] != i {
			t.Fatalf("MergeSorted: nums1[%d] = %d, ожидалось %d", i, nums1[i], i)
		}
	}
}

func TestIsSubsequence(t *testing.T) {
	tests := []struct {
		name string
		s, t string
		want bool
	}{
		{"пример: да", "abc", "ahbgdc", true},
		{"пример: нет", "axc", "ahbgdc", false},
		{"порядок важен", "ba", "ab", false},
		{"кратность важна", "aab", "ab", false},
		{"повторы есть в t", "aab", "xaxab", true},
		{"пустая s", "", "abc", true},
		{"пустая t", "a", "", false},
		{"обе пустые", "", "", true},
		{"s длиннее t", "abcd", "abc", false},
		{"строки равны", "abc", "abc", true},
		{"последняя буква — в самом конце", "ac", "abbbbc", true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := IsSubsequence(tt.s, tt.t); got != tt.want {
				t.Errorf("IsSubsequence(%q, %q) = %v, ожидалось %v", tt.s, tt.t, got, tt.want)
			}
		})
	}
}

func TestIntersectSorted(t *testing.T) {
	tests := []struct {
		name         string
		nums1, nums2 []int
		want         []int
	}{
		{"пример", []int{1, 2, 2, 3, 5}, []int{2, 2, 2, 5, 7}, []int{2, 2, 5}},
		{"общих нет", []int{1, 3}, []int{2, 4}, nil},
		{"повторов меньше во втором", []int{4, 4, 4}, []int{4}, []int{4}},
		{"повторов меньше в первом", []int{4}, []int{1, 4, 4, 4}, []int{4}},
		{"массивы равны", []int{1, 1, 2}, []int{1, 1, 2}, []int{1, 1, 2}},
		{"отрицательные", []int{-3, -1, 0, 2}, []int{-3, -2, 0}, []int{-3, 0}},
		{"один пустой", []int{}, []int{1, 2}, nil},
		{"оба nil", nil, nil, nil},
		{"один короче и внутри другого", []int{5, 6}, []int{1, 2, 3, 4, 5, 6, 7}, []int{5, 6}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := IntersectSorted(tt.nums1, tt.nums2)
			if !equalInts(got, tt.want) {
				t.Errorf("IntersectSorted(%v, %v) = %v, ожидалось %v", tt.nums1, tt.nums2, got, tt.want)
			}
		})
	}
}

func TestThreeSumClosest(t *testing.T) {
	tests := []struct {
		name   string
		nums   []int
		target int
		want   int
	}{
		{"пример", []int{-1, 2, 1, -4}, 1, 2},
		{"три нуля", []int{0, 0, 0}, 1, 0},
		{"сумма ровно target", []int{1, 2, 3, 4, 5}, 9, 9},
		{"target меньше всех сумм", []int{5, 6, 7, 8}, -100, 18},
		{"target больше всех сумм", []int{5, 6, 7, 8}, 100, 21},
		{"ничья — меньшая сумма", []int{1, 2, 3, 5}, 7, 6},
		{"отрицательные", []int{-5, -4, -3, -2}, -10, -10},
		{"дубли", []int{1, 1, 1, 1}, 0, 3},
		{"нужен самый правый", []int{-10, 0, 1, 2, 30}, 32, 32},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := ThreeSumClosest(slices.Clone(tt.nums), tt.target); got != tt.want {
				t.Errorf("ThreeSumClosest(%v, %d) = %d, ожидалось %d", tt.nums, tt.target, got, tt.want)
			}
		})
	}
}
