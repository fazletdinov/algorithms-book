package graphs

import (
	"math/rand"
	"sort"
	"testing"
)

// randGraph — простой неориентированный граф: n вершин, случайное подмножество
// рёбер без петель и кратных рёбер.
func randGraph(rng *rand.Rand, n int) [][]int {
	var all [][]int
	for i := 0; i < n; i++ {
		for j := i + 1; j < n; j++ {
			all = append(all, []int{i, j})
		}
	}
	rng.Shuffle(len(all), func(i, j int) { all[i], all[j] = all[j], all[i] })
	m := rng.Intn(len(all) + 1)
	edges := all[:m]
	// случайно переставим концы ребра — порядок не должен влиять
	for _, e := range edges {
		if rng.Intn(2) == 0 {
			e[0], e[1] = e[1], e[0]
		}
	}
	return edges
}

func buildAdj(n int, edges [][]int) [][]int {
	adj := make([][]int, n)
	for _, e := range edges {
		adj[e[0]] = append(adj[e[0]], e[1])
		adj[e[1]] = append(adj[e[1]], e[0])
	}
	return adj
}

// bruteComponents — число компонент через систему непересекающихся множеств
// (независимо от DFS-эталона).
func bruteComponents(n int, edges [][]int) int {
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
	for _, e := range edges {
		parent[find(e[0])] = find(e[1])
	}
	cnt := 0
	for i := 0; i < n; i++ {
		if find(i) == i {
			cnt++
		}
	}
	return cnt
}

func TestCountComponentsRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(1301))
	for range 3000 {
		n := rng.Intn(7) + 1
		edges := randGraph(rng, n)
		if got, want := CountComponents(n, edges), bruteComponents(n, edges); got != want {
			t.Fatalf("CountComponents(%d, %v) = %d, want %d", n, edges, got, want)
		}
	}
}

// randMultigraph — неориентированный мультиграф: до 2n рёбер, концы которых выбираются
// независимо, так что бывают петли [v, v] и повторы одной пары (в любом порядке концов).
func randMultigraph(rng *rand.Rand, n int) [][]int {
	m := rng.Intn(2*n + 1)
	edges := make([][]int, m)
	for i := range edges {
		edges[i] = []int{rng.Intn(n), rng.Intn(n)}
	}
	return edges
}

// unionFindHasCycle — система непересекающихся множеств: ребро, оба конца которого уже в одном
// множестве, замыкает цикл (петля и повтор пары — тоже). Это прежний эталон — модель, не
// зависящая от обхода в эталоне нынешнем.
func unionFindHasCycle(n int, edges [][]int) bool {
	parent := make([]int, n)
	for i := range parent {
		parent[i] = i
	}
	find := func(x int) int {
		for parent[x] != x {
			x = parent[x]
		}
		return x
	}
	for _, e := range edges {
		rx, ry := find(e[0]), find(e[1])
		if rx == ry {
			return true
		}
		parent[ry] = rx
	}
	return false
}

func TestHasCycleUndirectedRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(1302))
	for range 3000 {
		n := rng.Intn(7) + 1
		edges := randGraph(rng, n)
		if got, want := HasCycleUndirected(n, edges), unionFindHasCycle(n, edges); got != want {
			t.Fatalf("HasCycleUndirected(%d, %v) = %v, want %v", n, edges, got, want)
		}
	}
}

// На мультиграфах цикл бывает длины 1 (петля) и 2 (кратное ребро): обход по множеству соседей
// (map[int]bool вместо списка) склеивает кратное ребро и здесь расходится с моделью.
func TestHasCycleUndirectedMultigraphRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(1306))
	for range 3000 {
		n := rng.Intn(6) + 1
		edges := randMultigraph(rng, n)
		if got, want := HasCycleUndirected(n, edges), unionFindHasCycle(n, edges); got != want {
			t.Fatalf("HasCycleUndirected(%d, %v) = %v, want %v", n, edges, got, want)
		}
	}
}

// reachable — множество достижимых из start вершин (флуд по списку смежности).
func reachable(n int, edges [][]int, start int) []int {
	adj := buildAdj(n, edges)
	seen := make([]bool, n)
	stack := []int{start}
	seen[start] = true
	var res []int
	for len(stack) > 0 {
		v := stack[len(stack)-1]
		stack = stack[:len(stack)-1]
		res = append(res, v)
		for _, w := range adj[v] {
			if !seen[w] {
				seen[w] = true
				stack = append(stack, w)
			}
		}
	}
	sort.Ints(res)
	return res
}

// checkTraversal — порядок начинается со start, без повторов, и как множество
// равен достижимому множеству.
func checkTraversal(t *testing.T, name string, order []int, n int, edges [][]int, start int) {
	t.Helper()
	if len(order) == 0 || order[0] != start {
		t.Fatalf("%s(%d, %v, %d) = %v: не начинается со start", name, n, edges, start, order)
	}
	seen := map[int]bool{}
	for _, v := range order {
		if seen[v] {
			t.Fatalf("%s = %v: повтор вершины %d", name, order, v)
		}
		seen[v] = true
	}
	set := append([]int{}, order...)
	sort.Ints(set)
	want := reachable(n, edges, start)
	if len(set) != len(want) {
		t.Fatalf("%s(%d, %v, %d) = %v, достижимо %v", name, n, edges, start, order, want)
	}
	for i := range set {
		if set[i] != want[i] {
			t.Fatalf("%s(%d, %v, %d) = %v, достижимо %v", name, n, edges, start, order, want)
		}
	}
}

func TestBFSDFSOrderRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(1303))
	for range 3000 {
		n := rng.Intn(7) + 1
		edges := randGraph(rng, n)
		start := rng.Intn(n)
		checkTraversal(t, "BFSOrder", BFSOrder(n, edges, start), n, edges, start)
		checkTraversal(t, "DFSOrder", DFSOrder(n, edges, start), n, edges, start)
	}
}

// bruteShortest — независимый BFS по уровням, возвращает дистанцию или -1.
func bruteShortest(n int, edges [][]int, src, dst int) int {
	adj := buildAdj(n, edges)
	dist := make([]int, n)
	for i := range dist {
		dist[i] = -1
	}
	dist[src] = 0
	queue := []int{src}
	for len(queue) > 0 {
		v := queue[0]
		queue = queue[1:]
		for _, w := range adj[v] {
			if dist[w] == -1 {
				dist[w] = dist[v] + 1
				queue = append(queue, w)
			}
		}
	}
	return dist[dst]
}

func TestShortestPathUnweightedRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(1304))
	for range 3000 {
		n := rng.Intn(7) + 1
		edges := randGraph(rng, n)
		src, dst := rng.Intn(n), rng.Intn(n)
		if got, want := ShortestPathUnweighted(n, edges, src, dst), bruteShortest(n, edges, src, dst); got != want {
			t.Fatalf("ShortestPathUnweighted(%d, %v, %d, %d) = %d, want %d", n, edges, src, dst, got, want)
		}
	}
}

// bruteBipartite — двухцветная раскраска через DFS (независимо от BFS-эталона).
func bruteBipartite(n int, edges [][]int) bool {
	adj := buildAdj(n, edges)
	color := make([]int, n)
	var dfs func(v, c int) bool
	dfs = func(v, c int) bool {
		color[v] = c
		for _, w := range adj[v] {
			if color[w] == 0 {
				if !dfs(w, -c) {
					return false
				}
			} else if color[w] == c {
				return false
			}
		}
		return true
	}
	for i := 0; i < n; i++ {
		if color[i] == 0 && !dfs(i, 1) {
			return false
		}
	}
	return true
}

func TestIsBipartiteRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(1305))
	for range 3000 {
		n := rng.Intn(7) + 1
		edges := randGraph(rng, n)
		if got, want := IsBipartite(n, edges), bruteBipartite(n, edges); got != want {
			t.Fatalf("IsBipartite(%d, %v) = %v, want %v", n, edges, got, want)
		}
	}
}

func TestShortestPathRouteRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(1307))
	for range 3000 {
		n := rng.Intn(7) + 1
		edges := randGraph(rng, n)
		src, dst := rng.Intn(n), rng.Intn(n)
		route := ShortestPathRoute(n, edges, src, dst)
		checkRoute(t, n, edges, src, dst, route, bruteShortest(n, edges, src, dst))
	}
}

// bellmanFord — модель для Dijkstra: n−1 проход релаксации по всем рёбрам, без
// кучи и без «закрытых» вершин (на неотрицательных весах ответ тот же).
func bellmanFord(n int, edges [][]int, src int) []int {
	dist := make([]int, n)
	for i := range dist {
		dist[i] = -1
	}
	dist[src] = 0
	for range n - 1 {
		for _, e := range edges {
			u, v, w := e[0], e[1], e[2]
			if dist[u] != -1 && (dist[v] == -1 || dist[u]+w < dist[v]) {
				dist[v] = dist[u] + w
			}
		}
	}
	return dist
}

// randWeighted — ориентированный мультиграф: до 3n рёбер со случайными концами (бывают
// петли и повторы пары) и весами 0…9 — нули и равные веса дают ничьи в куче.
func randWeighted(rng *rand.Rand, n int) [][]int {
	edges := make([][]int, rng.Intn(3*n+1))
	for i := range edges {
		edges[i] = []int{rng.Intn(n), rng.Intn(n), rng.Intn(10)}
	}
	return edges
}

func TestDijkstraRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(1308))
	for range 3000 {
		n := rng.Intn(7) + 1
		edges := randWeighted(rng, n)
		src := rng.Intn(n)
		got, want := Dijkstra(n, edges, src), bellmanFord(n, edges, src)
		if len(got) != n {
			t.Fatalf("Dijkstra(%d, %v, %d) = %v, ожидалось %v", n, edges, src, got, want)
		}
		for i := range want {
			if got[i] != want[i] {
				t.Fatalf("Dijkstra(%d, %v, %d) = %v, ожидалось %v", n, edges, src, got, want)
			}
		}
	}
}

// kahnHasCycle — модель для HasCycleDirected, не зависящая от обхода в глубину:
// снимаем вершины без входящих стрелок; остались неснятые — есть цикл.
func kahnHasCycle(n int, edges [][]int) bool {
	adj := make([][]int, n)
	indeg := make([]int, n)
	for _, e := range edges {
		adj[e[0]] = append(adj[e[0]], e[1])
		indeg[e[1]]++
	}
	var queue []int
	for v := 0; v < n; v++ {
		if indeg[v] == 0 {
			queue = append(queue, v)
		}
	}
	taken := 0
	for len(queue) > 0 {
		v := queue[0]
		queue = queue[1:]
		taken++
		for _, u := range adj[v] {
			indeg[u]--
			if indeg[u] == 0 {
				queue = append(queue, u)
			}
		}
	}
	return taken < n
}

// TestHasCycleDirectedRandom — случайные ориентированные графы до 7 вершин, с
// петлями и кратными стрелками; половина — заведомо без цикла (стрелки только
// вперёд по случайной перестановке), чтобы ответ false встречался часто.
func TestHasCycleDirectedRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(1603))
	for range 3000 {
		n := rng.Intn(7) + 1
		perm := rng.Perm(n)
		acyclic := rng.Intn(2) == 0
		m := rng.Intn(2*n + 1)
		edges := make([][]int, 0, m)
		for range m {
			u, v := rng.Intn(n), rng.Intn(n)
			if acyclic {
				if u == v {
					continue
				}
				if u > v {
					u, v = v, u
				}
				u, v = perm[u], perm[v]
			}
			edges = append(edges, []int{u, v})
		}
		want := kahnHasCycle(n, edges)
		if got := HasCycleDirected(n, edges); got != want {
			t.Fatalf("HasCycleDirected(%d, %v) = %v, ожидалось %v", n, edges, got, want)
		}
	}
}
