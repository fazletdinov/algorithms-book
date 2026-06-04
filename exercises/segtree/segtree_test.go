package segtree

import "testing"

func TestSegmentTree(t *testing.T) {
	st := NewSegmentTree([]int{1, 3, 5, 7, 9, 11})

	assert := func(name string, got, want int) {
		if got != want {
			t.Errorf("%s = %d, ожидалось %d", name, got, want)
		}
	}

	assert("Query(0,5)", st.Query(0, 5), 36)
	assert("Query(1,3)", st.Query(1, 3), 15) // 3+5+7
	assert("Query(3,3)", st.Query(3, 3), 7)
	assert("Query(0,0)", st.Query(0, 0), 1)

	st.Update(1, 10) // было 3
	assert("после Update Query(0,5)", st.Query(0, 5), 43)
	assert("после Update Query(1,1)", st.Query(1, 1), 10)
	assert("после Update Query(0,2)", st.Query(0, 2), 16) // 1+10+5
}

func TestSegmentTreeSingle(t *testing.T) {
	st := NewSegmentTree([]int{5})
	if got := st.Query(0, 0); got != 5 {
		t.Errorf("Query(0,0) = %d, ожидалось 5", got)
	}
	st.Update(0, 8)
	if got := st.Query(0, 0); got != 8 {
		t.Errorf("после Update Query(0,0) = %d, ожидалось 8", got)
	}
}

func TestMinSegmentTree(t *testing.T) {
	st := NewMinSegmentTree([]int{5, 2, 7, 1, 9})

	assert := func(name string, got, want int) {
		if got != want {
			t.Errorf("%s = %d, ожидалось %d", name, got, want)
		}
	}

	assert("Query(0,4)", st.Query(0, 4), 1)
	assert("Query(0,1)", st.Query(0, 1), 2)
	assert("Query(2,2)", st.Query(2, 2), 7)
	assert("Query(0,0)", st.Query(0, 0), 5)

	st.Update(3, 10) // [5,2,7,10,9]
	assert("после Update(3,10) Query(2,4)", st.Query(2, 4), 7)
	assert("после Update(3,10) Query(3,3)", st.Query(3, 3), 10)
	assert("после Update(3,10) Query(0,4)", st.Query(0, 4), 2)
}

func TestMinSegmentTreeSingle(t *testing.T) {
	st := NewMinSegmentTree([]int{5})
	if got := st.Query(0, 0); got != 5 {
		t.Errorf("Query(0,0) = %d, ожидалось 5", got)
	}
	st.Update(0, 3)
	if got := st.Query(0, 0); got != 3 {
		t.Errorf("после Update Query(0,0) = %d, ожидалось 3", got)
	}
}

func TestLazySegmentTree(t *testing.T) {
	lt := NewLazySegmentTree([]int{1, 2, 3, 4, 5})

	assert := func(name string, got, want int) {
		if got != want {
			t.Errorf("%s = %d, ожидалось %d", name, got, want)
		}
	}

	assert("RangeQuery(0,4)", lt.RangeQuery(0, 4), 15)
	assert("RangeQuery(1,3)", lt.RangeQuery(1, 3), 9)

	lt.RangeUpdate(1, 3, 10) // +10 к индексам 1,2,3 -> [1,12,13,14,5]
	assert("после RangeUpdate(1,3,+10) RangeQuery(0,4)", lt.RangeQuery(0, 4), 45)
	assert("RangeQuery(1,3)", lt.RangeQuery(1, 3), 39)
	assert("RangeQuery(0,0)", lt.RangeQuery(0, 0), 1)
	assert("RangeQuery(2,2)", lt.RangeQuery(2, 2), 13)

	lt.RangeUpdate(0, 4, 1) // +1 ко всем -> [2,13,14,15,6]
	assert("после RangeUpdate(0,4,+1) RangeQuery(0,4)", lt.RangeQuery(0, 4), 50)
	assert("RangeQuery(4,4)", lt.RangeQuery(4, 4), 6)
}
