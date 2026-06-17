package sparsetable

import "testing"

func TestSparseBasic(t *testing.T) {
	arr := []int{5, 2, 4, 7, 6, 3, 1, 2}
	s := NewSparse(arr)

	cases := []struct {
		l, r, want int
	}{
		{0, 0, 5},
		{0, 7, 1}, // минимум всего массива
		{1, 3, 2},
		{3, 4, 6},
		{4, 7, 1},
		{5, 6, 1},
		{6, 7, 1},
		{2, 5, 3},
	}
	for _, c := range cases {
		if got := s.Query(c.l, c.r); got != c.want {
			t.Errorf("Query(%d,%d) = %d, ожидалось %d", c.l, c.r, got, c.want)
		}
	}
}

func TestSparseSingleElement(t *testing.T) {
	s := NewSparse([]int{42})
	if got := s.Query(0, 0); got != 42 {
		t.Errorf("Query(0,0) = %d, ожидалось 42", got)
	}
}
