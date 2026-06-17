package dsu

import (
	"math/rand"
	"testing"
)

// Эталон — наивные метки компонент: при слиянии перекрашиваем всю компоненту
// одного цвета в другой за O(n). Другой алгоритм, чем DSU со сжатием путей,
// поэтому ловит ошибки в обоих.
func TestUnionFindRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(99))
	for range 300 {
		n := rng.Intn(20) + 2
		uf := NewUnionFind(n)
		label := make([]int, n)
		for i := range label {
			label[i] = i
		}
		comps := n
		for range 100 {
			x, y := rng.Intn(n), rng.Intn(n)
			wantMerge := label[x] != label[y]
			if got := uf.Union(x, y); got != wantMerge {
				t.Fatalf("Union(%d,%d) = %v, want %v", x, y, got, wantMerge)
			}
			if wantMerge {
				from, to := label[y], label[x]
				for i := range label {
					if label[i] == from {
						label[i] = to
					}
				}
				comps--
			}
			a, b := rng.Intn(n), rng.Intn(n)
			if got, want := uf.Connected(a, b), label[a] == label[b]; got != want {
				t.Fatalf("Connected(%d,%d) = %v, want %v", a, b, got, want)
			}
			if uf.Count() != comps {
				t.Fatalf("Count() = %d, want %d", uf.Count(), comps)
			}
		}
	}
}
