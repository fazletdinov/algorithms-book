package binheap

import (
	"math/rand"
	"sort"
	"testing"
)

// Эталон — сортировка: последовательность Pop из кучи должна совпадать с
// отсортированным входом (heapsort ↔ sort.Ints — другой алгоритм). Заодно
// проверяем, что Peek всегда равен очередному Pop.
func TestHeapRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(42))
	for range 500 {
		n := rng.Intn(50)
		vals := make([]int, n)
		for i := range vals {
			vals[i] = rng.Intn(200) - 100
		}
		h := NewHeap()
		for _, v := range vals {
			h.Push(v)
		}
		if h.Len() != n {
			t.Fatalf("Len() = %d, want %d", h.Len(), n)
		}
		got := make([]int, 0, n)
		for h.Len() > 0 {
			p, _ := h.Peek()
			v, ok := h.Pop()
			if !ok || v != p {
				t.Fatalf("Pop=%d, но Peek было %d (ok=%v)", v, p, ok)
			}
			got = append(got, v)
		}
		want := append([]int(nil), vals...)
		sort.Ints(want)
		for i := range want {
			if got[i] != want[i] {
				t.Fatalf("извлечение: got=%v, want=%v", got, want)
			}
		}
	}
}
