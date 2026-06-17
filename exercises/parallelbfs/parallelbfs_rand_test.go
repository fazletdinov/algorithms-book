package parallelbfs

import (
	"math/rand"
	"reflect"
	"sort"
	"testing"
)

// refLevels — независимый эталон: BFS с массивом расстояний, затем группировка
// вершин по dist. Другой способ, чем волна-фронт в решении.
func refLevels(adj [][]int, start int) [][]int {
	n := len(adj)
	out := [][]int{}
	if n == 0 || start < 0 || start >= n {
		return out
	}
	dist := make([]int, n)
	for i := range dist {
		dist[i] = -1
	}
	dist[start] = 0
	queue := []int{start}
	maxd := 0
	for len(queue) > 0 {
		u := queue[0]
		queue = queue[1:]
		for _, v := range adj[u] {
			if dist[v] == -1 {
				dist[v] = dist[u] + 1
				if dist[v] > maxd {
					maxd = dist[v]
				}
				queue = append(queue, v)
			}
		}
	}
	for d := 0; d <= maxd; d++ {
		var lvl []int
		for v := range n {
			if dist[v] == d {
				lvl = append(lvl, v)
			}
		}
		sort.Ints(lvl)
		out = append(out, lvl)
	}
	return out
}

// Случайные неориентированные графы: и Seq, и Conc должны совпасть с эталоном.
// Запуск под -race ловит незащищённый доступ к visited/next в Conc.
func TestBFSRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(2026))
	for range 300 {
		n := rng.Intn(15) + 1
		adj := make([][]int, n)
		for u := range n {
			for v := u + 1; v < n; v++ {
				if rng.Intn(4) == 0 {
					adj[u] = append(adj[u], v)
					adj[v] = append(adj[v], u)
				}
			}
		}
		start := rng.Intn(n)
		want := refLevels(adj, start)
		if got := BFSLevelsSeq(adj, start); !reflect.DeepEqual(got, want) {
			t.Fatalf("Seq(start=%d) = %v, want %v", start, got, want)
		}
		if got := BFSLevelsConc(adj, start); !reflect.DeepEqual(got, want) {
			t.Fatalf("Conc(start=%d) = %v, want %v", start, got, want)
		}
		if got := BFSLevelsConcLocal(adj, start); !reflect.DeepEqual(got, want) {
			t.Fatalf("ConcLocal(start=%d) = %v, want %v", start, got, want)
		}
	}
}
