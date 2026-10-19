package binheap

import (
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
)

// TestHeapScales — сложность, а не ответ. Pop линейным поиском минимума в
// неупорядоченном срезе — O(n) на операцию, O(n²) на всё. Куча — O(log n).
func TestHeapScales(t *testing.T) {
	const n = 200000
	h := NewHeap()
	bad, want := -1, 0
	scaletest.Within(t, scaletest.Limit,
		"Heap: 200000 Push, затем 200000 Pop — похоже на O(n) на Pop там, где нужен O(log n)"+
			" (замер: эталон ~18 мс, перебор ~10.4 с)",
		func() {
			for v := n; v >= 1; v-- {
				h.Push(v)
			}
			for want = 1; want <= n; want++ {
				if v, ok := h.Pop(); !ok || v != want {
					bad = v
					return
				}
			}
		})
	if bad >= 0 {
		t.Fatalf("Pop вернул %d, ожидался минимум %d", bad, want)
	}
}
