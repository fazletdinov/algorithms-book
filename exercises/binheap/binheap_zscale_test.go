package binheap

import (
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
)

// TestHeapScales — сложность, а не ответ. Два квадратичных подхода и один вход
// против обоих. Pop линейным поиском минимума — O(n) на операцию при любом порядке.
// Отсортированный срез с вставкой сдвигом — O(n) на Push, если значения приходят
// вперемешку: 1, n, 2, n−1, … — большие встают в начало среза и сдвигают всё.
// Куча — O(log n) на операцию.
func TestHeapScales(t *testing.T) {
	const n = 500000
	h := NewHeap()
	failed, got, want := false, 0, 0
	scaletest.Within(t, scaletest.Limit,
		"Heap: 500000 Push вперемешку, затем 500000 Pop — похоже на O(n) на операцию там, где нужен O(log n)"+
			" (замер: эталон ~45 мс, линейный Pop > 60 с, вставка сдвигом ~29.5 с)",
		func() {
			for k := 0; k < n; k++ {
				v := k/2 + 1 // чётные k: 1, 2, 3, …
				if k%2 == 1 {
					v = n - k/2 // нечётные k: n, n−1, …
				}
				h.Push(v)
			}
			for want = 1; want <= n; want++ {
				v, ok := h.Pop()
				if !ok || v != want {
					failed, got = true, v
					return
				}
			}
		})
	if failed {
		t.Fatalf("Pop вернул %d, ожидался минимум %d", got, want)
	}
}
