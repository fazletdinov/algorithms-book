package fenwick

import (
	"reflect"
	"testing"
)

func TestFenwick(t *testing.T) {
	f := NewFenwick([]int{1, 2, 3, 4, 5})

	assert := func(name string, got, want int) {
		if got != want {
			t.Errorf("%s = %d, ожидалось %d", name, got, want)
		}
	}

	assert("PrefixSum(0)", f.PrefixSum(0), 1)
	assert("PrefixSum(4)", f.PrefixSum(4), 15)
	assert("PrefixSum(2)", f.PrefixSum(2), 6)
	assert("RangeSum(1,3)", f.RangeSum(1, 3), 9) // 2+3+4
	assert("RangeSum(0,4)", f.RangeSum(0, 4), 15)
	assert("RangeSum(2,2)", f.RangeSum(2, 2), 3)

	f.Add(2, 10) // index 2: 3 -> 13
	assert("после Add PrefixSum(4)", f.PrefixSum(4), 25)
	assert("после Add RangeSum(1,3)", f.RangeSum(1, 3), 19) // 2+13+4
	assert("после Add RangeSum(0,0)", f.RangeSum(0, 0), 1)
}

func TestFenwickSingle(t *testing.T) {
	f := NewFenwick([]int{7})
	if got := f.RangeSum(0, 0); got != 7 {
		t.Errorf("RangeSum(0,0) = %d, ожидалось 7", got)
	}
	f.Add(0, -3)
	if got := f.PrefixSum(0); got != 4 {
		t.Errorf("после Add PrefixSum(0) = %d, ожидалось 4", got)
	}
}

func TestCountInversions(t *testing.T) {
	tests := []struct {
		name string
		arr  []int
		want int
	}{
		{"пример", []int{2, 4, 1, 3, 5}, 3},
		{"убывающий", []int{5, 4, 3, 2, 1}, 10},
		{"возрастающий", []int{1, 2, 3}, 0},
		{"пустой", []int{}, 0},
		{"один элемент", []int{42}, 0},
		{"дубликаты", []int{2, 2, 2}, 0},
		{"отрицательные", []int{-1, -5, 0, -3}, 3},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if got := CountInversions(tc.arr); got != tc.want {
				t.Errorf("CountInversions(%v) = %d, ожидалось %d", tc.arr, got, tc.want)
			}
		})
	}
}

func TestCountSmallerToRight(t *testing.T) {
	tests := []struct {
		name string
		arr  []int
		want []int
	}{
		{"пример", []int{5, 2, 6, 1}, []int{2, 1, 1, 0}},
		{"дубликаты", []int{-1, -1}, []int{0, 0}},
		{"пустой", []int{}, []int{}},
		{"один элемент", []int{7}, []int{0}},
		{"возрастающий", []int{1, 2, 3}, []int{0, 0, 0}},
		{"убывающий", []int{3, 2, 1}, []int{2, 1, 0}},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if got := CountSmallerToRight(tc.arr); !reflect.DeepEqual(got, tc.want) {
				t.Errorf("CountSmallerToRight(%v) = %v, ожидалось %v", tc.arr, got, tc.want)
			}
		})
	}
}
