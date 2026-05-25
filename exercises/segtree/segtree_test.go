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
