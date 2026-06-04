package bits

import (
	"reflect"
	"testing"
)

func TestSingleNumber(t *testing.T) {
	tests := []struct {
		name string
		nums []int
		want int
	}{
		{"пример", []int{4, 1, 2, 1, 2}, 4},
		{"один элемент", []int{7}, 7},
		{"первый уникальный", []int{2, 3, 3}, 2},
		{"с отрицательными", []int{-1, -1, -5}, -5},
		{"ноль уникальный", []int{0, 4, 4}, 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := SingleNumber(tt.nums); got != tt.want {
				t.Errorf("SingleNumber(%v) = %d, ожидалось %d", tt.nums, got, tt.want)
			}
		})
	}
}

func TestIsPowerOfTwo(t *testing.T) {
	tests := []struct {
		name string
		n    int
		want bool
	}{
		{"16 степень двойки", 16, true},
		{"18 не степень", 18, false},
		{"1 степень двойки", 1, true},
		{"0 не степень", 0, false},
		{"отрицательное", -8, false},
		{"1024 степень двойки", 1024, true},
		{"3 не степень", 3, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := IsPowerOfTwo(tt.n); got != tt.want {
				t.Errorf("IsPowerOfTwo(%d) = %v, ожидалось %v", tt.n, got, tt.want)
			}
		})
	}
}

func TestHammingWeight(t *testing.T) {
	tests := []struct {
		name string
		n    uint32
		want int
	}{
		{"11 (1011b)", 11, 3},
		{"ноль", 0, 0},
		{"все единицы", 0xFFFFFFFF, 32},
		{"один бит", 128, 1},
		{"старший бит", 0x80000000, 1},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := HammingWeight(tt.n); got != tt.want {
				t.Errorf("HammingWeight(%d) = %d, ожидалось %d", tt.n, got, tt.want)
			}
		})
	}
}

func TestMissingNumber(t *testing.T) {
	tests := []struct {
		name string
		nums []int
		want int
	}{
		{"пример", []int{3, 0, 1}, 2},
		{"отсутствует последний", []int{0, 1}, 2},
		{"один элемент", []int{0}, 1},
		{"отсутствует ноль", []int{1}, 0},
		{"вразброс", []int{9, 6, 4, 2, 3, 5, 7, 0, 1}, 8},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := MissingNumber(tt.nums); got != tt.want {
				t.Errorf("MissingNumber(%v) = %d, ожидалось %d", tt.nums, got, tt.want)
			}
		})
	}
}

func TestCountBits(t *testing.T) {
	tests := []struct {
		name string
		n    int
		want []int
	}{
		{"пример", 5, []int{0, 1, 1, 2, 1, 2}},
		{"ноль", 0, []int{0}},
		{"два", 2, []int{0, 1, 1}},
		{"восемь", 8, []int{0, 1, 1, 2, 1, 2, 2, 3, 1}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := CountBits(tt.n); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("CountBits(%d) = %v, ожидалось %v", tt.n, got, tt.want)
			}
		})
	}
}

func TestTwoSingleNumbers(t *testing.T) {
	tests := []struct {
		name string
		nums []int
		want []int
	}{
		{"пример", []int{1, 2, 3, 2, 1, 4}, []int{3, 4}},
		{"с отрицательными", []int{-1, 0, -1, 2}, []int{0, 2}},
		{"два элемента", []int{5, 7}, []int{5, 7}},
		{"обратный порядок", []int{4, 4, 9, 1}, []int{1, 9}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := TwoSingleNumbers(tt.nums); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("TwoSingleNumbers(%v) = %v, ожидалось %v", tt.nums, got, tt.want)
			}
		})
	}
}
