package binarysearch

import (
	"reflect"
	"testing"
)

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

func TestFindFloor(t *testing.T) {
	tests := []struct {
		name   string
		arr    []int
		target int
		want   int
	}{
		{"точное совпадение", []int{1, 3, 8, 10, 15}, 8, 2},
		{"между элементами", []int{1, 3, 8, 10, 15}, 12, 3},
		{"меньше всех", []int{1, 3, 8, 10, 15}, 0, -1},
		{"больше всех", []int{1, 3, 8, 10, 15}, 16, 4},
		{"первый элемент", []int{1, 3, 8, 10, 15}, 1, 0},
		{"пустой массив", []int{}, 5, -1},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := FindFloor(tt.arr, tt.target); got != tt.want {
				t.Errorf("FindFloor(%v, %d) = %d, ожидалось %d", tt.arr, tt.target, got, tt.want)
			}
		})
	}
}

func TestSearchRotated(t *testing.T) {
	tests := []struct {
		name   string
		arr    []int
		target int
		want   int
	}{
		{"в правой половине", []int{4, 5, 7, 9, 10, 0, 1, 3}, 10, 4},
		{"в конце", []int{4, 5, 7, 9, 10, 0, 1, 3}, 3, 7},
		{"нет элемента", []int{4, 5, 7, 9, 10, 0, 1, 3}, 6, -1},
		{"первый", []int{4, 5, 7, 9, 10, 0, 1, 3}, 4, 0},
		{"точка поворота", []int{4, 5, 7, 9, 10, 0, 1, 3}, 0, 5},
		{"без поворота", []int{1, 2, 3, 4, 5}, 4, 3},
		{"один элемент", []int{5}, 5, 0},
		{"пустой массив", []int{}, 5, -1},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := SearchRotated(tt.arr, tt.target); got != tt.want {
				t.Errorf("SearchRotated(%v, %d) = %d, ожидалось %d", tt.arr, tt.target, got, tt.want)
			}
		})
	}
}

func TestFindFirstLast(t *testing.T) {
	tests := []struct {
		name   string
		arr    []int
		target int
		want   []int
	}{
		{"диапазон дубликатов", []int{1, 3, 3, 3, 5}, 3, []int{1, 3}},
		{"нет элемента", []int{1, 3, 3, 3, 5}, 4, []int{-1, -1}},
		{"один в начале", []int{1, 3, 3, 3, 5}, 1, []int{0, 0}},
		{"один в конце", []int{1, 3, 3, 3, 5}, 5, []int{4, 4}},
		{"все одинаковые", []int{2, 2, 2}, 2, []int{0, 2}},
		{"пустой массив", []int{}, 1, []int{-1, -1}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := FindFirstLast(tt.arr, tt.target); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("FindFirstLast(%v, %d) = %v, ожидалось %v", tt.arr, tt.target, got, tt.want)
			}
		})
	}
}

func TestIntSqrt(t *testing.T) {
	tests := []struct {
		name string
		x    int
		want int
	}{
		{"точный квадрат", 16, 4},
		{"не точный квадрат", 8, 2},
		{"ноль", 0, 0},
		{"единица", 1, 1},
		{"большое число", 1000000, 1000},
		{"перед квадратом", 15, 3},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := IntSqrt(tt.x); got != tt.want {
				t.Errorf("IntSqrt(%d) = %d, ожидалось %d", tt.x, got, tt.want)
			}
		})
	}
}
