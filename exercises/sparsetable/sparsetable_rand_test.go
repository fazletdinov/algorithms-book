package sparsetable

import (
	"math/rand"
	"testing"
)

// Эталон — прямой проход по срезу для минимума на [l, r]. O(n) против O(1)
// разреженной таблицы: разные способы, сверяем результат.
func TestSparseRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(123))
	for range 200 {
		n := rng.Intn(60) + 1
		arr := make([]int, n)
		for i := range arr {
			arr[i] = rng.Intn(1000) - 500
		}
		s := NewSparse(arr)
		for range 100 {
			l := rng.Intn(n)
			r := l + rng.Intn(n-l)
			want := arr[l]
			for i := l + 1; i <= r; i++ {
				if arr[i] < want {
					want = arr[i]
				}
			}
			if got := s.Query(l, r); got != want {
				t.Fatalf("Query(%d,%d) = %d, want %d (arr=%v)", l, r, got, want, arr)
			}
		}
	}
}
