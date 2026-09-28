package prefixsum

import (
	"reflect"
	"testing"
)

func TestRangeSums(t *testing.T) {
	tests := []struct {
		name    string
		nums    []int
		queries [][2]int
		want    []int
	}{
		{"пример из условия", []int{3, -1, 4, 1, 5}, [][2]int{{0, 2}, {1, 3}, {4, 4}}, []int{6, 4, 5}},
		{"весь массив", []int{1, 2, 3, 4}, [][2]int{{0, 3}}, []int{10}},
		{"отрезок с начала", []int{5, 5, 5}, [][2]int{{0, 0}, {0, 1}}, []int{5, 10}},
		{"отрицательные гасят друг друга", []int{2, -2, 2, -2}, [][2]int{{0, 3}, {1, 2}}, []int{0, 0}},
		{"повторный запрос", []int{7, 1}, [][2]int{{0, 1}, {0, 1}}, []int{8, 8}},
		{"нет запросов", []int{1, 2}, [][2]int{}, []int{}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := RangeSums(tt.nums, tt.queries); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("RangeSums(%v, %v) = %v, ожидалось %v", tt.nums, tt.queries, got, tt.want)
			}
		})
	}
}

func TestCountSubarraysWithSum(t *testing.T) {
	tests := []struct {
		name string
		nums []int
		k    int
		want int
	}{
		{"пример из условия", []int{1, 2, 3}, 3, 2},
		{"одинаковые единицы", []int{1, 1, 1}, 2, 2},
		{"подмассив с самого начала", []int{3, 4}, 3, 1},
		{"нули дают много ответов", []int{0, 0, 0}, 0, 6},
		{"отрицательные числа", []int{1, -1, 0}, 0, 3},
		{"окно бы не справилось", []int{3, 4, -7, 3, 1, 3, 1, -4, -2, -2}, 7, 3},
		{"нет подходящих", []int{1, 2}, 5, 0},
		{"пустой вход", []int{}, 0, 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := CountSubarraysWithSum(tt.nums, tt.k); got != tt.want {
				t.Errorf("CountSubarraysWithSum(%v, %d) = %d, ожидалось %d", tt.nums, tt.k, got, tt.want)
			}
		})
	}
}

func TestLongestBalanced(t *testing.T) {
	tests := []struct {
		name string
		bits []int
		want int
	}{
		{"пример из условия", []int{0, 1, 0}, 2},
		{"баланс в середине", []int{0, 1, 1, 0, 1, 1, 1, 0}, 4},
		{"весь массив сбалансирован", []int{1, 0, 0, 1}, 4},
		{"баланс не с начала", []int{1, 1, 0, 0, 0}, 4},
		{"одни единицы", []int{1, 1, 1}, 0},
		{"один элемент", []int{0}, 0},
		{"пустой вход", []int{}, 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := LongestBalanced(tt.bits); got != tt.want {
				t.Errorf("LongestBalanced(%v) = %d, ожидалось %d", tt.bits, got, tt.want)
			}
		})
	}
}

func TestCountDivisibleSubarrays(t *testing.T) {
	tests := []struct {
		name string
		nums []int
		k    int
		want int
	}{
		{"пример из условия", []int{4, 5, 0, -2, -3, 1}, 5, 7},
		{"не делится", []int{5}, 9, 0},
		{"отрицательное кратное", []int{-5}, 5, 1},
		// Ловит остаток без приведения к [0, k): префиксы -1 и 4 равны по модулю 5,
		// а голый % в Go даёт -1 и 4 — разные ключи.
		{"отрицательный остаток", []int{-1, 5}, 5, 1},
		{"k = 1 — делится всё", []int{1, 2, 3}, 1, 6},
		{"пустой вход", []int{}, 3, 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := CountDivisibleSubarrays(tt.nums, tt.k); got != tt.want {
				t.Errorf("CountDivisibleSubarrays(%v, %d) = %d, ожидалось %d", tt.nums, tt.k, got, tt.want)
			}
		})
	}
}

func TestMaxSubarraySum(t *testing.T) {
	tests := []struct {
		name string
		nums []int
		want int
	}{
		{"пример из условия", []int{-2, 1, -3, 4, -1, 2, 1, -5, 4}, 6},
		{"все отрицательные", []int{-3, -1, -2}, -1},
		{"один элемент", []int{-7}, -7},
		{"все положительные — весь массив", []int{1, 2, 3}, 6},
		{"лучше не брать префикс", []int{-5, 3, 4}, 7},
		{"лучше не брать хвост", []int{3, 4, -10}, 7},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := MaxSubarraySum(tt.nums); got != tt.want {
				t.Errorf("MaxSubarraySum(%v) = %d, ожидалось %d", tt.nums, got, tt.want)
			}
		})
	}
}

func TestProductExceptSelf(t *testing.T) {
	tests := []struct {
		name string
		nums []int
		want []int
	}{
		{"пример из условия", []int{1, 2, 3, 4}, []int{24, 12, 8, 6}},
		{"один ноль", []int{-1, 1, 0, -3, 3}, []int{0, 0, 9, 0, 0}},
		{"два нуля", []int{0, 4, 0}, []int{0, 0, 0}},
		{"два элемента", []int{5, 7}, []int{7, 5}},
		{"отрицательные", []int{-2, -3, 4}, []int{-12, -8, 6}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			in := append([]int(nil), tt.nums...)
			if got := ProductExceptSelf(in); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("ProductExceptSelf(%v) = %v, ожидалось %v", tt.nums, got, tt.want)
			}
		})
	}
}

func TestApplyRangeAdds(t *testing.T) {
	tests := []struct {
		name    string
		n       int
		updates [][3]int
		want    []int
	}{
		{"пример из условия", 5, [][3]int{{1, 3, 2}, {2, 4, 3}, {0, 2, -2}}, []int{-2, 0, 3, 5, 3}},
		{"до последнего индекса", 3, [][3]int{{0, 2, 1}}, []int{1, 1, 1}},
		{"одна точка", 4, [][3]int{{2, 2, 9}}, []int{0, 0, 9, 0}},
		{"гасящие обновления", 3, [][3]int{{0, 1, 5}, {0, 1, -5}}, []int{0, 0, 0}},
		{"без обновлений", 2, [][3]int{}, []int{0, 0}},
		{"пустой массив", 0, [][3]int{}, []int{}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := ApplyRangeAdds(tt.n, tt.updates); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("ApplyRangeAdds(%d, %v) = %v, ожидалось %v", tt.n, tt.updates, got, tt.want)
			}
		})
	}
}

func TestMatrixRegionSums(t *testing.T) {
	m := [][]int{
		{3, 0, 1, 4, 2},
		{5, 6, 3, 2, 1},
		{1, 2, 0, 1, 5},
		{4, 1, 0, 1, 7},
		{1, 0, 3, 0, 5},
	}
	tests := []struct {
		name    string
		matrix  [][]int
		queries [][4]int
		want    []int
	}{
		{"пример из условия", [][]int{{3, 0, 1}, {5, 6, 3}, {1, 2, 0}}, [][4]int{{1, 1, 2, 2}, {0, 0, 0, 2}}, []int{11, 4}},
		{"классика LeetCode 304", m, [][4]int{{2, 1, 4, 3}, {1, 1, 2, 2}, {1, 2, 2, 4}}, []int{8, 11, 12}},
		{"вся матрица", [][]int{{1, 2}, {3, 4}}, [][4]int{{0, 0, 1, 1}}, []int{10}},
		{"одна клетка", [][]int{{1, 2}, {3, 4}}, [][4]int{{1, 0, 1, 0}}, []int{3}},
		{"один столбец", [][]int{{1}, {-2}, {3}}, [][4]int{{0, 0, 2, 0}, {1, 0, 2, 0}}, []int{2, 1}},
		{"нет запросов", [][]int{{1}}, [][4]int{}, []int{}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := MatrixRegionSums(tt.matrix, tt.queries); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("MatrixRegionSums(%v, %v) = %v, ожидалось %v", tt.matrix, tt.queries, got, tt.want)
			}
		})
	}
}
