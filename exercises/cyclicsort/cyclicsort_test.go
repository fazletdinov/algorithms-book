package cyclicsort

import (
	"reflect"
	"testing"
)

func TestCyclicSort(t *testing.T) {
	tests := []struct {
		name string
		in   []int
		want []int
	}{
		{"перемешанный", []int{3, 1, 5, 4, 2}, []int{1, 2, 3, 4, 5}},
		{"уже отсортирован", []int{1, 2, 3}, []int{1, 2, 3}},
		{"обратный порядок", []int{4, 3, 2, 1}, []int{1, 2, 3, 4}},
		{"один элемент", []int{1}, []int{1}},
		{"пустой", []int{}, []int{}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			CyclicSort(tt.in)
			if !reflect.DeepEqual(tt.in, tt.want) {
				t.Errorf("после CyclicSort = %v, ожидалось %v", tt.in, tt.want)
			}
		})
	}
}

func TestFindMissingNumber(t *testing.T) {
	tests := []struct {
		name string
		nums []int
		want int
	}{
		{"пропущено в середине", []int{4, 0, 3, 1}, 2},
		{"пропущен ноль", []int{1, 2, 3}, 0},
		{"пропущено последнее", []int{0, 1, 2, 3}, 4},
		{"один элемент 0", []int{1}, 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := FindMissingNumber(tt.nums); got != tt.want {
				t.Errorf("FindMissingNumber(%v) = %d, ожидалось %d", tt.nums, got, tt.want)
			}
		})
	}
}
