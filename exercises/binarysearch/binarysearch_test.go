package binarysearch

import "testing"

func TestSearch(t *testing.T) {
	tests := []struct {
		name   string
		arr    []int
		target int
		want   int
	}{
		{"в середине", []int{1, 3, 5, 7, 9}, 5, 2},
		{"первый", []int{1, 3, 5, 7, 9}, 1, 0},
		{"последний", []int{1, 3, 5, 7, 9}, 9, 4},
		{"нет элемента", []int{1, 3, 5, 7, 9}, 4, -1},
		{"пустой массив", []int{}, 5, -1},
		{"один элемент", []int{42}, 42, 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := Search(tt.arr, tt.target); got != tt.want {
				t.Errorf("Search(%v, %d) = %d, ожидалось %d", tt.arr, tt.target, got, tt.want)
			}
		})
	}
}

func TestFindCeiling(t *testing.T) {
	tests := []struct {
		name string
		arr  []int
		key  int
		want int
	}{
		{"точное совпадение", []int{1, 3, 8, 10, 15}, 8, 2},
		{"между элементами", []int{1, 3, 8, 10, 15}, 12, 4},
		{"меньше всех", []int{1, 3, 8, 10, 15}, 0, 0},
		{"больше всех", []int{1, 3, 8, 10, 15}, 16, -1},
		{"пустой массив", []int{}, 5, -1},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := FindCeiling(tt.arr, tt.key); got != tt.want {
				t.Errorf("FindCeiling(%v, %d) = %d, ожидалось %d", tt.arr, tt.key, got, tt.want)
			}
		})
	}
}
