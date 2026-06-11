package dijkstra

import (
	"math/rand"
	"testing"
)

const big = 1 << 60

// randWeighted — m случайных рёбер [u,v,w], w в [1..10] (Дейкстра требует
// неотрицательных весов). Рёбра годятся и как ориентированные, и как
// неориентированные — эталон интерпретирует их по-разному в разных функциях.
func randWeighted(rng *rand.Rand, n, m int) [][]int {
	edges := make([][]int, m)
	for i := range edges {
		edges[i] = []int{rng.Intn(n), rng.Intn(n), rng.Intn(10) + 1}
	}
	return edges
}

// floydUndirected — все кратчайшие пути в НЕориентированном графе (Floyd–Warshall),
// независимо от Дейкстры.
func floydUndirected(n int, edges [][]int) [][]int {
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
		if u != v && w < d[u][v] {
			d[u][v] = w
			d[v][u] = w
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

// bfDirected — кратчайшие пути из src в ОРИЕНТИРОВАННОМ графе (Беллман–Форд).
func bfDirected(n int, edges [][]int, src int) []int {
	dist := make([]int, n)
	for i := range dist {
		dist[i] = big
	}
	dist[src] = 0
	for it := 0; it < n-1; it++ {
		for _, e := range edges {
			u, v, w := e[0], e[1], e[2]
			if dist[u] != big && dist[u]+w < dist[v] {
				dist[v] = dist[u] + w
			}
		}
	}
	return dist
}

func TestShortestPathRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(2101))
	for range 4000 {
		n := rng.Intn(7) + 1
		edges := randWeighted(rng, n, rng.Intn(n*2+1))
		src, dst := rng.Intn(n), rng.Intn(n)
		d := floydUndirected(n, edges)[src][dst]
		want := d
		if d == big {
			want = -1
		}
		if got := ShortestPath(n, edges, src, dst); got != want {
			t.Fatalf("ShortestPath(%d, %v, %d, %d) = %d, want %d", n, edges, src, dst, got, want)
		}
	}
}

func TestShortestPathsFromRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(2102))
	for range 4000 {
		n := rng.Intn(7) + 1
		edges := randWeighted(rng, n, rng.Intn(n*2+1))
		src := rng.Intn(n)
		ref := bfDirected(n, edges, src)
		got := ShortestPathsFrom(n, edges, src)
		if len(got) != n {
			t.Fatalf("ShortestPathsFrom: длина %d, want %d", len(got), n)
		}
		for i := 0; i < n; i++ {
			want := ref[i]
			if want == big {
				want = -1
			}
			if got[i] != want {
				t.Fatalf("ShortestPathsFrom(%d, %v, %d)[%d] = %d, want %d", n, edges, src, i, got[i], want)
			}
		}
	}
}

func TestNetworkDelayTimeRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(2103))
	for range 4000 {
		n := rng.Intn(7) + 1
		edges := randWeighted(rng, n, rng.Intn(n*2+1))
		src := rng.Intn(n)
		ref := bfDirected(n, edges, src)
		want := 0
		for _, d := range ref {
			if d == big {
				want = -1
				break
			}
			if d > want {
				want = d
			}
		}
		if got := NetworkDelayTime(n, edges, src); got != want {
			t.Fatalf("NetworkDelayTime(%d, %v, %d) = %d, want %d", n, edges, src, got, want)
		}
	}
}
