package toposort

import (
	"math/rand"
	"slices"
	"testing"
)

// randDAG — гарантированно ацикличный набор prereq. Берём случайный топопорядок
// perm и добавляем рёбра только «вперёд» по нему: prereq [a,b] значит b раньше a,
// поэтому b ставим раньше a в perm.
func randDAG(rng *rand.Rand, n int) [][]int {
	perm := rng.Perm(n)
	var prereq [][]int
	for i := 0; i < n; i++ {
		for j := i + 1; j < n; j++ {
			if rng.Intn(3) == 0 {
				prereq = append(prereq, []int{perm[j], perm[i]}) // perm[j] требует perm[i]
			}
		}
	}
	return prereq
}

func TestTopologicalSortRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(1501))
	for range 3000 {
		n := rng.Intn(8) + 1
		prereq := randDAG(rng, n)
		got := TopologicalSort(n, prereq)
		if !isValidTopo(n, prereq, got) {
			t.Fatalf("TopologicalSort(%d, %v) = %v — не валидный топопорядок", n, prereq, got)
		}
	}
}

// permutations — все перестановки 0..n-1.
func permutations(n int) [][]int {
	var res [][]int
	cur := make([]int, 0, n)
	used := make([]bool, n)
	var rec func()
	rec = func() {
		if len(cur) == n {
			res = append(res, append([]int{}, cur...))
			return
		}
		for i := 0; i < n; i++ {
			if used[i] {
				continue
			}
			used[i] = true
			cur = append(cur, i)
			rec()
			cur = cur[:len(cur)-1]
			used[i] = false
		}
	}
	rec()
	return res
}

func lessSeq(a, b []int) bool {
	for i := range a {
		if a[i] != b[i] {
			return a[i] < b[i]
		}
	}
	return false
}

// bruteLexTopo — перебираем все перестановки, оставляем валидные топопорядки,
// берём лексикографически наименьший.
func bruteLexTopo(n int, prereq [][]int) []int {
	var best []int
	for _, p := range permutations(n) {
		if isValidTopo(n, prereq, p) {
			if best == nil || lessSeq(p, best) {
				best = p
			}
		}
	}
	if best == nil {
		return []int{}
	}
	return best
}

func TestFindOrderLexSmallestRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(1502))
	for range 2000 {
		n := rng.Intn(6) + 1 // n<=6: перебор n! терпим
		prereq := randDAG(rng, n)
		got := FindOrderLexSmallest(n, prereq)
		want := bruteLexTopo(n, prereq)
		if len(got) != len(want) {
			t.Fatalf("FindOrderLexSmallest(%d, %v) = %v, want %v", n, prereq, got, want)
		}
		for i := range got {
			if got[i] != want[i] {
				t.Fatalf("FindOrderLexSmallest(%d, %v) = %v, want %v", n, prereq, got, want)
			}
		}
	}
}

// randDirected — произвольный ориентированный граф (возможно с циклами).
// prereq [a,b]: ребро b -> a.
func randDirected(rng *rand.Rand, n int) [][]int {
	var prereq [][]int
	m := rng.Intn(n*2 + 1)
	for i := 0; i < m; i++ {
		a := rng.Intn(n)
		b := rng.Intn(n)
		if a != b {
			prereq = append(prereq, []int{a, b})
		}
	}
	return prereq
}

// bruteCanFinish — обнаружение цикла трёхцветным DFS на графе b -> a.
func bruteCanFinish(n int, prereq [][]int) bool {
	adj := make([][]int, n)
	for _, p := range prereq {
		adj[p[1]] = append(adj[p[1]], p[0]) // b -> a
	}
	color := make([]int, n) // 0 бел, 1 серый, 2 чёрный
	var dfs func(v int) bool
	dfs = func(v int) bool {
		color[v] = 1
		for _, w := range adj[v] {
			if color[w] == 1 {
				return false
			}
			if color[w] == 0 && !dfs(w) {
				return false
			}
		}
		color[v] = 2
		return true
	}
	for i := 0; i < n; i++ {
		if color[i] == 0 && !dfs(i) {
			return false
		}
	}
	return true
}

func TestCanFinishRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(1503))
	for range 3000 {
		n := rng.Intn(8) + 1
		prereq := randDirected(rng, n)
		if got, want := CanFinish(n, prereq), bruteCanFinish(n, prereq); got != want {
			t.Fatalf("CanFinish(%d, %v) = %v, want %v", n, prereq, got, want)
		}
	}
}

// TestMinSemestersRandom — сверка с моделью «семестр курса = 1 + самый поздний
// семестр его требований» на случайных DAG (с 1-нумерацией и парой [prev, next])
// и на тех же DAG с добавленным обратным ребром (цикл → -1).
func TestMinSemestersRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(1136))
	for range 3000 {
		n := rng.Intn(8) + 1
		perm := rng.Perm(n)
		var rel [][]int
		for i := 0; i < n; i++ {
			for j := i + 1; j < n; j++ {
				if rng.Intn(3) == 0 {
					rel = append(rel, []int{perm[i] + 1, perm[j] + 1})
				}
			}
		}
		// Модель: идём по perm — требования курса встречаются раньше него.
		sem := make([]int, n+1)
		want := 0
		for _, v := range perm {
			s := 1
			for _, r := range rel {
				if r[1] == v+1 && sem[r[0]]+1 > s {
					s = sem[r[0]] + 1
				}
			}
			sem[v+1] = s
			if s > want {
				want = s
			}
		}
		if got := MinSemesters(n, rel); got != want {
			t.Fatalf("MinSemesters(%d, %v) = %d, ожидалось %d", n, rel, got, want)
		}
		if len(rel) > 0 {
			r := rel[rng.Intn(len(rel))]
			cyc := append(append([][]int{}, rel...), []int{r[1], r[0]})
			if got := MinSemesters(n, cyc); got != -1 {
				t.Fatalf("MinSemesters(%d, %v) = %d, ожидалось -1 (цикл)", n, cyc, got)
			}
		}
	}
}

// TestFindMinHeightTreesRandom — сверка с перебором «подвесь за каждую вершину и
// посчитай высоту обходом в ширину» на случайных деревьях.
func TestFindMinHeightTreesRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(310))
	for range 3000 {
		n := rng.Intn(12) + 1
		var edges [][]int
		adj := make([][]int, n)
		for v := 1; v < n; v++ {
			p := rng.Intn(v)
			edges = append(edges, []int{v, p})
			adj[v] = append(adj[v], p)
			adj[p] = append(adj[p], v)
		}
		// Номера перемешаны, чтобы корень 0 не был особым.
		perm := rng.Perm(n)
		shuffled := make([][]int, len(edges))
		for i, e := range edges {
			shuffled[i] = []int{perm[e[0]], perm[e[1]]}
		}
		height := func(root int) int {
			dist := make([]int, n)
			for i := range dist {
				dist[i] = -1
			}
			dist[root] = 0
			queue, h := []int{root}, 0
			for len(queue) > 0 {
				v := queue[0]
				queue = queue[1:]
				h = max(h, dist[v])
				for _, u := range adj[v] {
					if dist[u] < 0 {
						dist[u] = dist[v] + 1
						queue = append(queue, u)
					}
				}
			}
			return h
		}
		best := n
		var want []int
		for v := 0; v < n; v++ {
			h := height(v)
			if h < best {
				best, want = h, nil
			}
			if h == best {
				want = append(want, perm[v])
			}
		}
		slices.Sort(want)
		if got := FindMinHeightTrees(n, shuffled); !equalInts(got, want) {
			t.Fatalf("FindMinHeightTrees(%d, %v) = %v, ожидалось %v", n, shuffled, got, want)
		}
	}
}

// TestTopologicalSortDFSRandom — случайные графы до 6 вершин, с циклами и без.
// Модель — перебор всех перестановок: порядок существует, если петель [v, v]
// нет и хоть одна перестановка уважает все рёбра (от обхода в глубину и от Кана
// не зависит; петлю isValidTopo не видит — pos[v] > pos[v] ложно).
func TestTopologicalSortDFSRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(1507))
	for range 1500 {
		n := rng.Intn(6) + 1
		var prereq [][]int
		if rng.Intn(2) == 0 {
			prereq = randDAG(rng, n)
		} else {
			for range rng.Intn(2*n + 1) {
				prereq = append(prereq, []int{rng.Intn(n), rng.Intn(n)})
			}
		}
		exists := len(bruteLexTopo(n, prereq)) == n
		for _, p := range prereq {
			if p[0] == p[1] {
				exists = false
			}
		}
		got := TopologicalSortDFS(n, prereq)
		if !exists {
			if len(got) != 0 {
				t.Fatalf("TopologicalSortDFS(%d, %v) = %v, ожидался пустой срез (цикл)", n, prereq, got)
			}
			continue
		}
		if !isValidTopo(n, prereq, got) {
			t.Fatalf("TopologicalSortDFS(%d, %v) = %v — не валидный топопорядок", n, prereq, got)
		}
	}
}
