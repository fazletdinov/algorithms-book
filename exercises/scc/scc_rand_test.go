package scc

import (
	"math/rand"
	"sort"
	"testing"
)

// randPairs — m случайных рёбер [u, v]; петли и кратные рёбра допускаются
// (контракты SCC/Bridges/ArticulationPoints их разрешают, а low-link с
// пропуском родителя по индексу ребра обязан их переживать).
func randPairs(rng *rand.Rand, n, m int) [][]int {
	edges := make([][]int, m)
	for i := range edges {
		edges[i] = []int{rng.Intn(n), rng.Intn(n)}
	}
	return edges
}

// naiveSCC — компоненты сильной связности через взаимную достижимость:
// BFS из каждой вершины (независимо от Косарайю/Тарьяна в эталоне).
func naiveSCC(n int, edges [][]int) [][]int {
	adj := make([][]int, n)
	for _, e := range edges {
		adj[e[0]] = append(adj[e[0]], e[1])
	}
	reach := make([][]bool, n)
	for s := 0; s < n; s++ {
		reach[s] = make([]bool, n)
		reach[s][s] = true
		queue := []int{s}
		for len(queue) > 0 {
			v := queue[0]
			queue = queue[1:]
			for _, w := range adj[v] {
				if !reach[s][w] {
					reach[s][w] = true
					queue = append(queue, w)
				}
			}
		}
	}
	assigned := make([]bool, n)
	var comps [][]int
	for v := 0; v < n; v++ {
		if assigned[v] {
			continue
		}
		var comp []int
		for w := v; w < n; w++ {
			if !assigned[w] && reach[v][w] && reach[w][v] {
				assigned[w] = true
				comp = append(comp, w)
			}
		}
		comps = append(comps, comp)
	}
	return comps
}

// componentsCount — число компонент связности неориентированного графа,
// игнорируя ребро с индексом skipEdge и вершину skipVertex (-1 = ничего не
// игнорировать). Простая система непересекающихся множеств.
func componentsCount(n int, edges [][]int, skipEdge, skipVertex int) int {
	parent := make([]int, n)
	for i := range parent {
		parent[i] = i
	}
	var find func(int) int
	find = func(x int) int {
		for parent[x] != x {
			x = parent[x]
		}
		return x
	}
	for id, e := range edges {
		if id == skipEdge {
			continue
		}
		u, v := e[0], e[1]
		if u == skipVertex || v == skipVertex {
			continue
		}
		parent[find(u)] = find(v)
	}
	cnt := 0
	for i := 0; i < n; i++ {
		if i == skipVertex {
			continue
		}
		if find(i) == i {
			cnt++
		}
	}
	return cnt
}

// naiveBridges — «удали ребро и посчитай компоненты»: O(E·(V+E)).
func naiveBridges(n int, edges [][]int) [][]int {
	base := componentsCount(n, edges, -1, -1)
	var res [][]int
	for id, e := range edges {
		if e[0] == e[1] {
			continue // петля мостом не бывает
		}
		if componentsCount(n, edges, id, -1) > base {
			u, v := e[0], e[1]
			if u > v {
				u, v = v, u
			}
			res = append(res, []int{u, v})
		}
	}
	sort.Slice(res, func(i, j int) bool {
		if res[i][0] != res[j][0] {
			return res[i][0] < res[j][0]
		}
		return res[i][1] < res[j][1]
	})
	return res
}

// naiveArticulationPoints — «удали вершину и посчитай компоненты»: O(V·(V+E)).
func naiveArticulationPoints(n int, edges [][]int) []int {
	base := componentsCount(n, edges, -1, -1)
	var res []int
	for v := 0; v < n; v++ {
		if componentsCount(n, edges, -1, v) > base {
			res = append(res, v)
		}
	}
	return res
}

func checkSCC(t *testing.T, n int, edges [][]int) {
	t.Helper()
	if got, want := SCC(n, edges), naiveSCC(n, edges); !equal2D(got, want) {
		t.Fatalf("SCC(%d, %v) = %v, want %v", n, edges, got, want)
	}
}

func TestSCCRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(2501))
	for range 3000 {
		n := rng.Intn(8) + 1
		checkSCC(t, n, randPairs(rng, n, rng.Intn(2*n+1)))
	}
}

func TestSCCRandomLarge(t *testing.T) {
	rng := rand.New(rand.NewSource(2502))
	for range 200 {
		n := rng.Intn(30) + 20
		checkSCC(t, n, randPairs(rng, n, n+rng.Intn(n+1)))
	}
}

func checkBridges(t *testing.T, n int, edges [][]int) {
	t.Helper()
	if got, want := Bridges(n, edges), naiveBridges(n, edges); !equal2D(got, want) {
		t.Fatalf("Bridges(%d, %v) = %v, want %v", n, edges, got, want)
	}
}

func TestBridgesRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(2503))
	for range 3000 {
		n := rng.Intn(8) + 1
		checkBridges(t, n, randPairs(rng, n, rng.Intn(2*n+1)))
	}
}

func TestBridgesRandomLarge(t *testing.T) {
	rng := rand.New(rand.NewSource(2504))
	for range 200 {
		n := rng.Intn(30) + 20
		checkBridges(t, n, randPairs(rng, n, n+rng.Intn(n+1)))
	}
}

func checkArticulation(t *testing.T, n int, edges [][]int) {
	t.Helper()
	got := ArticulationPoints(n, edges)
	want := naiveArticulationPoints(n, edges)
	if !equal1D(got, want) {
		t.Fatalf("ArticulationPoints(%d, %v) = %v, want %v", n, edges, got, want)
	}
}

func TestArticulationPointsRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(2505))
	for range 3000 {
		n := rng.Intn(8) + 1
		checkArticulation(t, n, randPairs(rng, n, rng.Intn(2*n+1)))
	}
}

func TestArticulationPointsRandomLarge(t *testing.T) {
	rng := rand.New(rand.NewSource(2506))
	for range 200 {
		n := rng.Intn(30) + 20
		checkArticulation(t, n, randPairs(rng, n, n+rng.Intn(n+1)))
	}
}
