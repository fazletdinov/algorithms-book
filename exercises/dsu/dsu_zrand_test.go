package dsu

import (
	"math/rand"
	"testing"
)

// Эталон — наивные метки компонент: при слиянии перекрашиваем всю компоненту
// одного цвета в другой за O(n). Другой алгоритм, чем DSU со сжатием путей,
// поэтому ловит ошибки в обоих.
func TestUnionFindRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(99))
	for range 300 {
		n := rng.Intn(20) + 2
		uf := NewUnionFind(n)
		label := make([]int, n)
		for i := range label {
			label[i] = i
		}
		comps := n
		for range 100 {
			x, y := rng.Intn(n), rng.Intn(n)
			wantMerge := label[x] != label[y]
			if got := uf.Union(x, y); got != wantMerge {
				t.Fatalf("Union(%d,%d) = %v, want %v", x, y, got, wantMerge)
			}
			if wantMerge {
				from, to := label[y], label[x]
				for i := range label {
					if label[i] == from {
						label[i] = to
					}
				}
				comps--
			}
			a, b := rng.Intn(n), rng.Intn(n)
			if got, want := uf.Connected(a, b), label[a] == label[b]; got != want {
				t.Fatalf("Connected(%d,%d) = %v, want %v", a, b, got, want)
			}
			if uf.Count() != comps {
				t.Fatalf("Count() = %d, want %d", uf.Count(), comps)
			}
		}
	}
}

// connectedNaive — есть ли путь u→v по рёбрам adj (обход в ширину с нуля).
func connectedNaive(adj [][]int, u, v int) bool {
	seen := make([]bool, len(adj))
	seen[u] = true
	queue := []int{u}
	for len(queue) > 0 {
		x := queue[0]
		queue = queue[1:]
		if x == v {
			return true
		}
		for _, y := range adj[x] {
			if !seen[y] {
				seen[y] = true
				queue = append(queue, y)
			}
		}
	}
	return false
}

// Модель ValidTree — обход с нуля перед каждым ребром: медленно, зато без DSU,
// поэтому ловит ошибки другого рода.
func TestValidTreeRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(261))
	for range 500 {
		n := rng.Intn(9) + 1
		// ValidTree: случайный набор различных рёбер
		var edges [][]int
		used := map[[2]int]bool{}
		for range rng.Intn(n + 2) {
			a, b := rng.Intn(n), rng.Intn(n)
			if a == b || used[[2]int{a, b}] || used[[2]int{b, a}] {
				continue
			}
			used[[2]int{a, b}] = true
			edges = append(edges, []int{a, b})
		}
		adj := make([][]int, n)
		want := len(edges) == n-1
		for _, e := range edges {
			if connectedNaive(adj, e[0], e[1]) {
				want = false
			}
			adj[e[0]] = append(adj[e[0]], e[1])
			adj[e[1]] = append(adj[e[1]], e[0])
		}
		if got := ValidTree(n, edges); got != want {
			t.Fatalf("ValidTree(%d, %v) = %v, ожидалось %v", n, edges, got, want)
		}
	}
}

// Модель FindRedundantConnection — по определению: с конца пробуем выбросить
// связь и обходом проверяем, что остальные связывают все узлы.
func TestFindRedundantConnectionRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(684))
	for range 500 {
		// случайное дерево на 1…m плюс одна лишняя связь, всё вперемешку
		m := rng.Intn(9) + 3
		var tree [][]int
		for v := 2; v <= m; v++ {
			tree = append(tree, []int{rng.Intn(v-1) + 1, v})
		}
		for {
			a, b := rng.Intn(m)+1, rng.Intn(m)+1
			dup := a == b
			for _, e := range tree {
				if (e[0] == a && e[1] == b) || (e[0] == b && e[1] == a) {
					dup = true
				}
			}
			if !dup {
				tree = append(tree, []int{a, b})
				break
			}
		}
		rng.Shuffle(len(tree), func(i, j int) { tree[i], tree[j] = tree[j], tree[i] })
		for _, e := range tree {
			if rng.Intn(2) == 0 {
				e[0], e[1] = e[1], e[0]
			}
		}
		// ответ модели: самая поздняя связь, без которой остаётся дерево
		var wantE []int
		for i := len(tree) - 1; i >= 0 && wantE == nil; i-- {
			adj := make([][]int, m+1)
			for j, e := range tree {
				if j != i {
					adj[e[0]] = append(adj[e[0]], e[1])
					adj[e[1]] = append(adj[e[1]], e[0])
				}
			}
			all := true
			for v := 2; v <= m; v++ {
				all = all && connectedNaive(adj, 1, v)
			}
			if all {
				wantE = tree[i]
			}
		}
		in := make([][]int, len(tree))
		for i, e := range tree {
			in[i] = []int{e[0], e[1]}
		}
		got := FindRedundantConnection(in)
		if len(got) != 2 || got[0] != wantE[0] || got[1] != wantE[1] {
			t.Fatalf("FindRedundantConnection(%v) = %v, ожидалось %v", tree, got, wantE)
		}
	}
}

// Модель EquationsPossible — перебор значений: переменных до 4, значения 0…3
// (больше различных значений, чем переменных, не нужно).
func TestEquationsPossibleRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(990))
	names := []string{"a", "b", "ab", "ba"}
	for range 2000 {
		var eqs []string
		type rel struct {
			x, y  int
			equal bool
		}
		var rels []rel
		for range rng.Intn(6) {
			x, y, equal := rng.Intn(4), rng.Intn(4), rng.Intn(2) == 0
			op := "!="
			if equal {
				op = "=="
			}
			eqs = append(eqs, names[x]+op+names[y])
			rels = append(rels, rel{x, y, equal})
		}
		want := false
		for code := 0; code < 256 && !want; code++ {
			val := [4]int{code & 3, code >> 2 & 3, code >> 4 & 3, code >> 6 & 3}
			ok := true
			for _, r := range rels {
				if (val[r.x] == val[r.y]) != r.equal {
					ok = false
				}
			}
			want = ok
		}
		if got := EquationsPossible(eqs); got != want {
			t.Fatalf("EquationsPossible(%q) = %v, ожидалось %v", eqs, got, want)
		}
	}
}
