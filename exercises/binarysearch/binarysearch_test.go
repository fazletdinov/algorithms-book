package binarysearch

import (
	"math"
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
		{"два элемента, цель справа от поворота", []int{32, 31}, 31, 1},
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
		// Верх диапазона int: x+1 здесь переполняется, а m*m — тем более.
		{"самое большое int", math.MaxInt, 3037000499},
		{"самый большой квадрат в int", 3037000499 * 3037000499, 3037000499},
		{"перед ним", 3037000499*3037000499 - 1, 3037000498},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := IntSqrt(tt.x); got != tt.want {
				t.Errorf("IntSqrt(%d) = %d, ожидалось %d", tt.x, got, tt.want)
			}
		})
	}
}

func TestMinEatingSpeed(t *testing.T) {
	tests := []struct {
		name  string
		piles []int
		h     int
		want  int
	}{
		{"пример главы", []int{3, 6, 7, 11}, 8, 4},
		{"часов ровно по числу куч — самая большая куча", []int{30, 11, 23, 4, 20}, 5, 30},
		{"на час больше", []int{30, 11, 23, 4, 20}, 6, 23},
		{"одна куча", []int{10}, 3, 4},
		{"времени с запасом — скорость 1", []int{3, 6, 7, 11}, 100, 1},
		{"ровно впритык по сумме", []int{2, 2, 2}, 6, 1},
		{"огромная куча", []int{1000000000}, 2, 500000000},
		{"огромная куча и час на неё", []int{1000000000, 1}, 2, 1000000000},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := MinEatingSpeed(tt.piles, tt.h); got != tt.want {
				t.Errorf("MinEatingSpeed(%v, %d) = %d, ожидалось %d", tt.piles, tt.h, got, tt.want)
			}
		})
	}
}

func TestShipWithinDays(t *testing.T) {
	tests := []struct {
		name    string
		weights []int
		days    int
		want    int
	}{
		{"пример LeetCode", []int{1, 2, 3, 4, 5, 6, 7, 8, 9, 10}, 5, 15},
		{"три дня", []int{3, 2, 2, 4, 1, 4}, 3, 6},
		{"четыре дня", []int{1, 2, 3, 1, 1}, 4, 3},
		{"один день — сумма", []int{1, 2, 3}, 1, 6},
		{"дней по числу посылок — самая тяжёлая", []int{5, 1, 9, 2}, 4, 9},
		{"одна посылка", []int{7}, 1, 7},
		{"порядок важен: тяжёлые по краям", []int{10, 1, 1, 10}, 2, 11},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := ShipWithinDays(tt.weights, tt.days); got != tt.want {
				t.Errorf("ShipWithinDays(%v, %d) = %d, ожидалось %d", tt.weights, tt.days, got, tt.want)
			}
		})
	}
}
