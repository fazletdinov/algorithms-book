package sparsetable

import (
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
)

// TestSparseScales — сложность, а не ответ. Query проходом по отрезку — O(r−l)
// на запрос, и на отрезках длины n/2 запросы стоят O(n·q). Построение, которое
// считает каждую клетку table[k][i] заново проходом по её 2^k элементам, —
// O(n²) на построение. Разреженная таблица — O(n log n) на построение и O(1)
// на запрос. Ответы сверяются с минимумом скользящего окна длины n/2+1
// (монотонный дек), посчитанным здесь же за O(n).
func TestSparseScales(t *testing.T) {
	const n = 200000
	const w = n/2 + 1 // длина отрезка запроса
	arr := make([]int, n)
	x := uint32(20261022)
	for i := range arr {
		x ^= x << 13
		x ^= x >> 17
		x ^= x << 5
		arr[i] = int(x%2000001) - 1000000
	}
	// want[l] — минимум на [l, l+w−1]: монотонный дек индексов
	want := make([]int, n-w+1)
	var dq []int
	for i := range arr {
		for len(dq) > 0 && arr[dq[len(dq)-1]] >= arr[i] {
			dq = dq[:len(dq)-1]
		}
		dq = append(dq, i)
		if dq[0] <= i-w {
			dq = dq[1:]
		}
		if i >= w-1 {
			want[i-w+1] = arr[dq[0]]
		}
	}
	const q = 200000
	got := make([]int, q)
	scaletest.Within(t, scaletest.Limit,
		"Sparse: NewSparse(n=200000), затем 200000 запросов Query на отрезках длины n/2+1 —"+
			" похоже на O(длина отрезка) на запрос там, где нужен O(1)"+
			" (замер: эталон ~14 мс, Query проходом ~7.8 с, построение пересчётом клеток ~15 с)",
		func() {
			s := NewSparse(arr)
			for k := 0; k < q; k++ {
				l := k % len(want)
				got[k] = s.Query(l, l+w-1)
			}
		})
	for k := 0; k < q; k++ {
		l := k % len(want)
		if got[k] != want[l] {
			t.Fatalf("Query(%d, %d) = %d, ожидалось %d", l, l+w-1, got[k], want[l])
		}
	}
}
