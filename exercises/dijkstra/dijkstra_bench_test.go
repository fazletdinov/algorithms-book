package dijkstra

import (
	"fmt"
	"testing"
)

// benchGraph — детерминированный связный граф на n вершинах с m ≈ 4n рёбрами:
// кольцо 0-1-...-(n-1)-0 гарантирует достижимость всех вершин, поверх него —
// 3n псевдослучайных рёбер (xorshift с фиксированным сидом, воспроизводимо).
func benchGraph(n int) [][]int {
	edges := make([][]int, 0, 4*n)
	x := uint32(362436069)
	rnd := func(m int) int {
		x ^= x << 13
		x ^= x >> 17
		x ^= x << 5
		return int(x % uint32(m))
	}
	for i := 0; i < n; i++ {
		edges = append(edges, []int{i, (i + 1) % n, 1 + rnd(1000)})
	}
	for i := 0; i < 3*n; i++ {
		edges = append(edges, []int{rnd(n), rnd(n), 1 + rnd(1000)})
	}
	return edges
}

// BenchmarkShortestPathsFrom — главный бенч для проверки асимптотики Дейкстры.
//
// ShortestPathsFrom заявлена как O((V + E) · log V) — мин-куча, из которой
// извлекается ближайшая вершина. Классическая «учебная» ошибка — искать минимум
// линейным проходом по массиву dist: это O(V²) и на разреженном графе (здесь
// E ≈ 4V) проигрывает на порядки.
//
// Граф разреженный, поэтому при росте n в 10 раз (1k → 10k → 100k)
// правильная реализация O((V+E) log V) растёт ~×10–12 на шаг, а квадратичная
// O(V²) — ~×100 на шаг (на n=100k — уже десятки секунд на итерацию).
//
//	go test -tags solution -bench=ShortestPathsFrom ./dijkstra/
func BenchmarkShortestPathsFrom(b *testing.B) {
	for _, n := range []int{1000, 10000, 100000} {
		edges := benchGraph(n)
		b.Run(fmt.Sprintf("n=%d_m=%d", n, len(edges)), func(b *testing.B) {
			b.ResetTimer()
			for i := 0; i < b.N; i++ {
				_ = ShortestPathsFrom(n, edges, 0)
			}
		})
	}
}
