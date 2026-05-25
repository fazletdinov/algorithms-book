package slidingwindow

import "testing"

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
