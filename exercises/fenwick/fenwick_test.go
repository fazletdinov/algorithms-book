package fenwick

import "testing"

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

	f.Update(2, 10) // index 2: 3 -> 13
	assert("после Update PrefixSum(4)", f.PrefixSum(4), 25)
	assert("после Update RangeSum(1,3)", f.RangeSum(1, 3), 19) // 2+13+4
	assert("после Update RangeSum(0,0)", f.RangeSum(0, 0), 1)
}

func TestFenwickSingle(t *testing.T) {
	f := NewFenwick([]int{7})
	if got := f.RangeSum(0, 0); got != 7 {
		t.Errorf("RangeSum(0,0) = %d, ожидалось 7", got)
	}
	f.Update(0, -3)
	if got := f.PrefixSum(0); got != 4 {
		t.Errorf("после Update PrefixSum(0) = %d, ожидалось 4", got)
	}
}
