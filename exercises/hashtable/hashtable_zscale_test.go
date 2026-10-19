package hashtable

import (
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
)

// TestHashMapScales — сложность, а не ответ. Таблица без расширения остаётся
// на четырёх бакетах: цепочки растут до n/4, и Put/Get становятся O(n).
// TestHashMapResize на 100 ключах этого не видит — там цепочки короткие.
func TestHashMapScales(t *testing.T) {
	const n = 300000
	h := NewHashMap()
	bad := -1
	scaletest.Within(t, scaletest.Limit,
		"HashMap: 300000 Put, затем 300000 Get — похоже на O(n) на операцию там, где нужен O(1)"+
			" (таблица не расширяется?) (замер: эталон ~30 мс, без расширения ~9.8 с)",
		func() {
			for k := 0; k < n; k++ {
				h.Put(k, k*2)
			}
			for k := 0; k < n; k++ {
				if v, ok := h.Get(k); !ok || v != k*2 {
					bad = k
					return
				}
			}
		})
	if bad >= 0 {
		t.Fatalf("Get(%d) после Put(%d, %d) вернул не то значение", bad, bad, bad*2)
	}
}
