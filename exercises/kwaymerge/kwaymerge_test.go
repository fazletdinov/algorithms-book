package kwaymerge

import (
	"reflect"
	"testing"
)

func TestMergeKSortedArrays(t *testing.T) {
	tests := []struct {
		name   string
		arrays [][]int
		want   []int
	}{
		{"три массива", [][]int{{2, 6, 8}, {3, 6, 7}, {1, 3, 4}}, []int{1, 2, 3, 3, 4, 6, 6, 7, 8}},
		{"один массив", [][]int{{1, 2, 3}}, []int{1, 2, 3}},
		{"разная длина", [][]int{{1, 5}, {2}, {0, 3, 4, 9}}, []int{0, 1, 2, 3, 4, 5, 9}},
		{"часть массивов пуста", [][]int{{}, {2, 4}, {}, {1, 3}}, []int{1, 2, 3, 4}},
		{"все пустые", [][]int{{}, {}}, []int{}},
		{"пустой ввод", [][]int{}, []int{}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := MergeKSortedArrays(tt.arrays); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("MergeKSortedArrays(%v) = %v, ожидалось %v", tt.arrays, got, tt.want)
			}
		})
	}
}

func TestKthSmallestInSortedArrays(t *testing.T) {
	tests := []struct {
		name   string
		arrays [][]int
		k      int
		want   int
	}{
		{"пятый элемент", [][]int{{2, 6, 8}, {3, 6, 7}, {1, 3, 4}}, 5, 4},
		{"первый элемент", [][]int{{2, 6, 8}, {3, 6, 7}, {1, 3, 4}}, 1, 1},
		{"последний элемент", [][]int{{2, 6, 8}, {3, 6, 7}, {1, 3, 4}}, 9, 8},
		{"один массив", [][]int{{5, 10, 15}}, 2, 10},
		{"разная длина с пустыми", [][]int{{}, {2, 4}, {1, 3, 5}}, 4, 4},
		{"k слишком велик", [][]int{{1, 2}, {3}}, 10, 0},
		{"k ноль", [][]int{{1, 2, 3}}, 0, 0},
		{"k отрицательный", [][]int{{1, 2, 3}}, -1, 0},
		{"все пустые", [][]int{{}, {}}, 1, 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := KthSmallestInSortedArrays(tt.arrays, tt.k); got != tt.want {
				t.Errorf("KthSmallestInSortedArrays(%v, %d) = %d, ожидалось %d", tt.arrays, tt.k, got, tt.want)
			}
		})
	}
}

func TestSmallestRange(t *testing.T) {
	tests := []struct {
		name   string
		arrays [][]int
		want   []int
	}{
		{"три списка", [][]int{{4, 10, 15, 24, 26}, {0, 9, 12, 20}, {5, 18, 22, 30}}, []int{20, 24}},
		{"все одинаковые", [][]int{{1, 2, 3}, {1, 2, 3}, {1, 2, 3}}, []int{1, 1}},
		{"один список", [][]int{{1, 5, 9}}, []int{1, 1}},
		{"два списка", [][]int{{1, 2, 3}, {1, 2, 3}}, []int{1, 1}},
		{"пустой список делает покрытие невозможным", [][]int{{1, 2}, {}}, []int{}},
		{"списков нет", [][]int{}, []int{}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := SmallestRange(tt.arrays); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("SmallestRange(%v) = %v, ожидалось %v", tt.arrays, got, tt.want)
			}
		})
	}
}

func TestKthSmallestInMatrix(t *testing.T) {
	tests := []struct {
		name   string
		matrix [][]int
		k      int
		want   int
	}{
		{"восьмой элемент", [][]int{{1, 5, 9}, {10, 11, 13}, {12, 13, 15}}, 8, 13},
		{"матрица 1x1", [][]int{{-5}}, 1, -5},
		{"первый элемент", [][]int{{1, 5, 9}, {10, 11, 13}, {12, 13, 15}}, 1, 1},
		{"последний элемент", [][]int{{1, 5, 9}, {10, 11, 13}, {12, 13, 15}}, 9, 15},
		{"матрица 2x2", [][]int{{1, 2}, {1, 3}}, 2, 1},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := KthSmallestInMatrix(tt.matrix, tt.k); got != tt.want {
				t.Errorf("KthSmallestInMatrix(%v, %d) = %d, ожидалось %d", tt.matrix, tt.k, got, tt.want)
			}
		})
	}
}
