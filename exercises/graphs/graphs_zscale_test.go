package graphs

import (
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
)

// TestShortestPathUnweightedScales — сложность, а не ответ. Граф — путь из n
// вершин. Поиск соседей перебором всего списка рёбер на каждой вершине —
// O(V·E); BFS по списку смежности — O(V + E).
//
// Осторожно с ручным прогоном: матрица смежности на 10⁵ вершин — около 10 ГБ.
// Runner книги остановит такой прогон пределом памяти, голый go test — нет.
func TestShortestPathUnweightedScales(t *testing.T) {
	const n = 100000
	edges := make([][]int, 0, n-1)
	for i := 0; i+1 < n; i++ {
		edges = append(edges, []int{i, i + 1})
	}
	var got int
	scaletest.Within(t, scaletest.Limit,
		"ShortestPathUnweighted(путь из 100000 вершин) — похоже на O(V·E) там, где нужен O(V + E)"+
			" (замер: эталон ~12 мс, перебор ~9.2 с)",
		func() { got = ShortestPathUnweighted(n, edges, 0, n-1) })
	if got != n-1 {
		t.Fatalf("ShortestPathUnweighted = %d, ожидалось %d", got, n-1)
	}
}
