package twopointers

import (
	"reflect"
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
