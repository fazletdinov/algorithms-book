package bellmanford

import (
	"math/rand"
	"testing"
)

const big = 1 << 60

// randDAG — ориентированный ацикличный граф (рёбра только «вперёд» по случайному
// топопорядку), веса в [-5..9]. Ацикличность гарантирует отсутствие отрицательных
// циклов → дистанции Беллмана–Форда корректны и сверяемы с Floyd–Warshall.
func randDAG(rng *rand.Rand, n int) [][]int {
	perm := rng.Perm(n)
	var edges [][]int
	for i := 0; i < n; i++ {
		for j := i + 1; j < n; j++ {
			if rng.Intn(3) == 0 {
				edges = append(edges, []int{perm[i], perm[j], rng.Intn(15) - 5})
			}
		}
	}
	return edges
}

// floydDirected — все кратчайшие пути в ориентированном графе без отрицательных
// циклов (Floyd–Warshall), независимый от Беллмана–Форда оракул.
func floydDirected(n int, edges [][]int) [][]int {
	d := make([][]int, n)
	for i := range d {
		d[i] = make([]int, n)
		for j := range d[i] {
			if i != j {
				d[i][j] = big
			}
		}
	}
	for _, e := range edges {
		u, v, w := e[0], e[1], e[2]
		if w < d[u][v] {
			d[u][v] = w
		}
	}
	for k := 0; k < n; k++ {
		for i := 0; i < n; i++ {
			if d[i][k] == big {
				continue
			}
			for j := 0; j < n; j++ {
				if d[k][j] != big && d[i][k]+d[k][j] < d[i][j] {
					d[i][j] = d[i][k] + d[k][j]
				}
			}
		}
	}
	return d
}

func TestShortestPathRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(2201))
	for range 4000 {
		n := rng.Intn(7) + 1
		edges := randDAG(rng, n)
		src, dst := rng.Intn(n), rng.Intn(n)
		ref := floydDirected(n, edges)[src][dst]
		gotDist, gotOk := ShortestPath(n, edges, src, dst)
		wantOk := ref != big
		if gotOk != wantOk {
			t.Fatalf("ShortestPath(%d, %v, %d, %d): reachable=%v, want %v", n, edges, src, dst, gotOk, wantOk)
		}
		if wantOk && gotDist != ref {
			t.Fatalf("ShortestPath(%d, %v, %d, %d) = %d, want %d", n, edges, src, dst, gotDist, ref)
		}
	}
}

// randDirected — произвольный ориентированный граф (возможны циклы и петли),
// веса в [-3..5] — отрицательные циклы вполне вероятны.
func randDirected(rng *rand.Rand, n, m int) [][]int {
	edges := make([][]int, m)
	for i := range edges {
		edges[i] = []int{rng.Intn(n), rng.Intn(n), rng.Intn(9) - 3}
	}
	return edges
}

// hasNegCycleFloyd — детекция любого отрицательного цикла через Floyd–Warshall:
// он существует ⇔ есть вершина с d[i][i] < 0.
func hasNegCycleFloyd(n int, edges [][]int) bool {
	d := make([][]int, n)
	for i := range d {
		d[i] = make([]int, n)
		for j := range d[i] {
			if i != j {
				d[i][j] = big
			}
		}
	}
	for _, e := range edges {
		u, v, w := e[0], e[1], e[2]
		if w < d[u][v] {
			d[u][v] = w
		}
	}
	for k := 0; k < n; k++ {
		for i := 0; i < n; i++ {
			if d[i][k] == big {
				continue
			}
			for j := 0; j < n; j++ {
				if d[k][j] != big && d[i][k]+d[k][j] < d[i][j] {
					d[i][j] = d[i][k] + d[k][j]
				}
			}
		}
	}
	for i := 0; i < n; i++ {
		if d[i][i] < 0 {
			return true
		}
	}
	return false
}

func TestHasNegativeCycleRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(2202))
	for range 5000 {
		n := rng.Intn(6) + 1
		edges := randDirected(rng, n, rng.Intn(n*2+1))
		if got, want := HasNegativeCycle(n, edges), hasNegCycleFloyd(n, edges); got != want {
			t.Fatalf("HasNegativeCycle(%d, %v) = %v, want %v", n, edges, got, want)
		}
	}
}

// atMostKBrute — минимальная стоимость пути src→dst не более чем за k рёбер,
// прямым перебором всех блужданий длины ≤k (веса неотрицательны → перебор конечен
// и лишние рёбра не помогают). -1, если не дойти.
func atMostKBrute(n int, edges [][]int, src, dst, k int) int {
	adj := make([][][2]int, n)
	for _, e := range edges {
		adj[e[0]] = append(adj[e[0]], [2]int{e[1], e[2]})
	}
	best := big
	var dfs func(node, used, cost int)
	dfs = func(node, used, cost int) {
		if node == dst && cost < best {
			best = cost
		}
		if used == k {
			return
		}
		for _, e := range adj[node] {
			dfs(e[0], used+1, cost+e[1])
		}
	}
	dfs(src, 0, 0)
	if best == big {
		return -1
	}
	return best
}

func TestShortestPathWithAtMostKEdgesRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(2203))
	for range 4000 {
		n := rng.Intn(6) + 1
		m := rng.Intn(n * 2)
		edges := make([][]int, m)
		for i := range edges {
			edges[i] = []int{rng.Intn(n), rng.Intn(n), rng.Intn(9) + 1} // веса ≥1
		}
		src, dst := rng.Intn(n), rng.Intn(n)
		k := rng.Intn(5) // ≤4 ребра — перебор блужданий ограничен
		if got, want := ShortestPathWithAtMostKEdges(n, edges, src, dst, k), atMostKBrute(n, edges, src, dst, k); got != want {
			t.Fatalf("ShortestPathWithAtMostKEdges(%d, %v, %d, %d, %d) = %d, want %d", n, edges, src, dst, k, got, want)
		}
	}
}
