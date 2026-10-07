package toposort

import (
	"math/rand"
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
