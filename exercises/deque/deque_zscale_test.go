package deque

import (
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
)

// TestDequeScales — сложность, а не ответ. Три медленных дека и один прогон
// против всех. Вставка в начало через append([]int{x}, d...) — O(n) на PushFront:
// каждый раз копируется весь срез. Снятие с начала сдвигом copy(d, d[1:]) — O(n)
// на PopFront. Кольцо, которое растёт на один элемент вместо удвоения, —
// O(n) на каждую вставку при полном буфере. Кольцевой буфер с удвоением —
// амортизированно O(1) на операцию.
func TestDequeScales(t *testing.T) {
	const n = 500000
	d := NewDeque()
	failed, what, got, want := false, "", 0, 0
	scaletest.Within(t, scaletest.Limit,
		"Deque: 500000 PushFront, 500000 PushBack, затем поочерёдно PopFront/PopBack до пустого —"+
			" похоже на O(n) на операцию там, где нужен амортизированный O(1)"+
			" (замер: эталон ~16 мс, PushFront через append(…) > 60 с, PopFront сдвигом > 60 с, рост на 1 > 60 с)",
		func() {
			for i := 0; i < n; i++ {
				d.PushFront(i) // спереди: n−1, …, 1, 0
			}
			for i := 0; i < n; i++ {
				d.PushBack(n + i) // сзади: n, …, 2n−1
			}
			// в деке: n−1, n−2, …, 0, n, n+1, …, 2n−1
			for k := 0; k < n; k++ {
				v, ok := d.PopFront()
				if want = n - 1 - k; !ok || v != want {
					failed, what, got = true, "PopFront", v
					return
				}
				v, ok = d.PopBack()
				if want = 2*n - 1 - k; !ok || v != want {
					failed, what, got = true, "PopBack", v
					return
				}
			}
		})
	if failed {
		t.Fatalf("%s вернул %d, ожидалось %d", what, got, want)
	}
	if d.Len() != 0 {
		t.Fatalf("Len() = %d после снятия всех элементов, ожидалось 0", d.Len())
	}
}
