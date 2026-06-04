package slidingwindow

import (
	"reflect"
	"testing"
)

func TestMaxSumSubarray(t *testing.T) {
	tests := []struct {
		name string
		arr  []int
		k    int
		want int
	}{
		{"обычный случай", []int{2, 1, 5, 1, 3, 2}, 3, 9},
		{"растущий массив", []int{1, 2, 3, 4, 5, 6}, 3, 15},
		{"k равно длине", []int{1, 2, 3}, 3, 6},
		{"k больше длины", []int{1, 2}, 5, 0},
		{"k нулевой", []int{1, 2, 3}, 0, 0},
		{"отрицательные числа", []int{-1, -2, -3, -4}, 2, -3},
		{"пустой массив", []int{}, 3, 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := MaxSumSubarray(tt.arr, tt.k); got != tt.want {
				t.Errorf("MaxSumSubarray(%v, %d) = %d, ожидалось %d", tt.arr, tt.k, got, tt.want)
			}
		})
	}
}

func TestLongestSubstringKDistinct(t *testing.T) {
	tests := []struct {
		name string
		s    string
		k    int
		want int
	}{
		{"два различных", "araaci", 2, 4},
		{"один различный", "araaci", 1, 2},
		{"три различных", "cbbebi", 3, 5},
		{"вся строка подходит", "abc", 5, 3},
		{"пустая строка", "", 2, 0},
		{"k нулевой", "abc", 0, 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := LongestSubstringKDistinct(tt.s, tt.k); got != tt.want {
				t.Errorf("LongestSubstringKDistinct(%q, %d) = %d, ожидалось %d", tt.s, tt.k, got, tt.want)
			}
		})
	}
}

func TestSmallestSubarrayWithSum(t *testing.T) {
	tests := []struct {
		name   string
		arr    []int
		target int
		want   int
	}{
		{"окно из двух элементов", []int{2, 1, 5, 2, 3, 2}, 7, 2},
		{"окно из трёх элементов", []int{2, 1, 5, 2, 3, 2}, 8, 3},
		{"вся сумма не достигает target", []int{1, 1, 1}, 10, 0},
		{"одного элемента достаточно", []int{1, 4, 4}, 4, 1},
		{"вся строка ровно равна target", []int{1, 2, 3, 4}, 10, 4},
		{"пустой массив", []int{}, 5, 0},
		{"последний элемент покрывает", []int{1, 1, 1, 100}, 100, 1},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := SmallestSubarrayWithSum(tt.arr, tt.target); got != tt.want {
				t.Errorf("SmallestSubarrayWithSum(%v, %d) = %d, ожидалось %d", tt.arr, tt.target, got, tt.want)
			}
		})
	}
}

func TestLongestSubstringNoRepeat(t *testing.T) {
	tests := []struct {
		name string
		s    string
		want int
	}{
		{"abcabcbb", "abcabcbb", 3},
		{"все одинаковые", "bbbbb", 1},
		{"пустая строка", "", 0},
		{"pwwkew", "pwwkew", 3},
		{"один символ", "a", 1},
		{"вся строка уникальна", "abcdef", 6},
		{"повтор через окно", "abba", 2},
		{"пробелы и цифры", "a1 a1 ", 3},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := LongestSubstringNoRepeat(tt.s); got != tt.want {
				t.Errorf("LongestSubstringNoRepeat(%q) = %d, ожидалось %d", tt.s, got, tt.want)
			}
		})
	}
}

func TestMaxSlidingWindow(t *testing.T) {
	tests := []struct {
		name string
		arr  []int
		k    int
		want []int
	}{
		{"обычный случай", []int{1, 3, -1, -3, 5, 3, 6, 7}, 3, []int{3, 3, 5, 5, 6, 7}},
		{"окно равно длине", []int{2, 1, 5}, 3, []int{5}},
		{"окно из одного элемента", []int{4, 2, 12, 11}, 1, []int{4, 2, 12, 11}},
		{"убывающий массив", []int{5, 4, 3, 2, 1}, 2, []int{5, 4, 3, 2}},
		{"растущий массив", []int{1, 2, 3, 4}, 2, []int{2, 3, 4}},
		{"k больше длины", []int{1, 2}, 5, []int{}},
		{"k нулевой", []int{1, 2, 3}, 0, []int{}},
		{"пустой массив", []int{}, 3, []int{}},
		{"одинаковые элементы", []int{7, 7, 7}, 2, []int{7, 7}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := MaxSlidingWindow(tt.arr, tt.k); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("MaxSlidingWindow(%v, %d) = %v, ожидалось %v", tt.arr, tt.k, got, tt.want)
			}
		})
	}
}
