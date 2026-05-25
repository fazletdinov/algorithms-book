package twopointers

import (
	"reflect"
	"testing"
)

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
			got := RemoveDuplicates(tt.arr)
			if got != tt.wantLen {
				t.Fatalf("RemoveDuplicates вернул длину %d, ожидалось %d", got, tt.wantLen)
			}
			if !reflect.DeepEqual(tt.arr[:got], tt.wantArr) {
				t.Errorf("первые %d элементов = %v, ожидалось %v", got, tt.arr[:got], tt.wantArr)
			}
		})
	}
}
