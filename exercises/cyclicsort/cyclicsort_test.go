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

func TestFindAllMissingNumbers(t *testing.T) {
	tests := []struct {
		name string
		nums []int
		want []int
	}{
		{"несколько пропусков", []int{2, 3, 1, 8, 2, 3, 5, 1}, []int{4, 6, 7}},
		{"один пропуск", []int{1, 1}, []int{2}},
		{"все на месте", []int{1, 2, 3, 4}, []int{}},
		{"один элемент", []int{1}, []int{}},
		{"пустой", []int{}, []int{}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := FindAllMissingNumbers(tt.nums); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("FindAllMissingNumbers(%v) = %v, ожидалось %v", tt.nums, got, tt.want)
			}
		})
	}
}

func TestFindDuplicate(t *testing.T) {
	tests := []struct {
		name string
		nums []int
		want int
	}{
		{"дубликат в середине", []int{1, 4, 4, 3, 2}, 4},
		{"дубликат тройка", []int{2, 1, 3, 3, 5, 4}, 3},
		{"дубликат единица", []int{1, 1}, 1},
		{"дубликат в конце", []int{3, 1, 2, 4, 4}, 4},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := FindDuplicate(tt.nums); got != tt.want {
				t.Errorf("FindDuplicate(%v) = %d, ожидалось %d", tt.nums, got, tt.want)
			}
		})
	}
}

func TestFindAllDuplicates(t *testing.T) {
	tests := []struct {
		name string
		nums []int
		want []int
	}{
		{"два дубликата", []int{3, 4, 4, 5, 5}, []int{4, 5}},
		{"без дубликатов", []int{1, 2, 3}, []int{}},
		{"один дубликат", []int{4, 3, 2, 7, 8, 2, 3, 1}, []int{2, 3}},
		{"один элемент", []int{1}, []int{}},
		{"пустой", []int{}, []int{}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := FindAllDuplicates(tt.nums); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("FindAllDuplicates(%v) = %v, ожидалось %v", tt.nums, got, tt.want)
			}
		})
	}
}
