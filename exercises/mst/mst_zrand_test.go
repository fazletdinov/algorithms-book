package mst

import (
	"math/rand"
	"testing"
)

// randGraphMST — неориентированный взвешенный граф: n вершин, случайные рёбра
// [u,v,w] без петель, w в [1..20]. Иногда связный, иногда нет.
func randGraphMST(rng *rand.Rand, n, m int) [][]int {
	edges := make([][]int, 0, m)
	for i := 0; i < m; i++ {
		u, v := rng.Intn(n), rng.Intn(n)
		if u == v {
			continue
		}
		edges = append(edges, []int{u, v, rng.Intn(20) + 1})
	}
	return edges
}

// components — число компонент связности по списку рёбер (union-find).
func components(n int, edges [][]int) int {
	p := make([]int, n)
	for i := range p {
		p[i] = i
	}
	var find func(int) int
	find = func(x int) int {
		for p[x] != x {
			p[x] = p[p[x]]
			x = p[x]
		}
		return x
	}
	cnt := n
	for _, e := range edges {
		ru, rv := find(e[0]), find(e[1])
		if ru != rv {
			p[ru] = rv
			cnt--
		}
	}
	return cnt
}

func TestMSTConsistencyRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(2301))
	for range 5000 {
		n := rng.Intn(7) + 1
		edges := randGraphMST(rng, n, rng.Intn(n*2+1))

		// Краскал и Прим — независимые алгоритмы, обязаны дать один вес.
		wk := MSTWeight(n, cloneEdges(edges))
		wp := MSTWeightPrim(n, cloneEdges(edges))
		if wk != wp {
			t.Fatalf("MSTWeight=%d, MSTWeightPrim=%d на n=%d edges=%v", wk, wp, n, edges)
		}

		// Связность определяет, существует ли остов вообще.
		connected := components(n, edges) == 1
		if connected == (wk == -1) {
			t.Fatalf("связность=%v, но MSTWeight=%d (n=%d edges=%v)", connected, wk, n, edges)
		}

		total, chosen := MSTWeightWithEdges(n, cloneEdges(edges))
		if total != wk {
			t.Fatalf("MSTWeightWithEdges total=%d != MSTWeight=%d", total, wk)
		}
		if wk == -1 {
			if chosen != nil {
				t.Fatalf("несвязный граф, но chosen=%v", chosen)
			}
			continue
		}
		// Выбранные рёбра должны образовывать остов: n-1 ребро, суммарный вес = total,
		// и они стягивают все вершины в одну компоненту.
		if len(chosen) != n-1 {
			t.Fatalf("chosen рёбер %d, ожидалось %d (n=%d)", len(chosen), n-1, n)
		}
		sum := 0
		for _, e := range chosen {
			sum += e[2]
		}
		if sum != total {
			t.Fatalf("сумма весов chosen=%d != total=%d", sum, total)
		}
		if components(n, chosen) != 1 {
			t.Fatalf("chosen=%v не стягивает все %d вершин", chosen, n)
		}
	}
}

func cloneEdges(edges [][]int) [][]int {
	out := make([][]int, len(edges))
	for i, e := range edges {
		out[i] = append([]int{}, e...)
	}
	return out
}
