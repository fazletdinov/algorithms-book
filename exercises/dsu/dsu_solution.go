//go:build solution

package dsu

type UnionFind struct {
	parent []int
	size   []int
	count  int
}

func NewUnionFind(n int) *UnionFind {
	uf := &UnionFind{
		parent: make([]int, n),
		size:   make([]int, n),
		count:  n,
	}
	for i := range n {
		uf.parent[i] = i
		uf.size[i] = 1
	}
	return uf
}

func (uf *UnionFind) Find(x int) int {
	for uf.parent[x] != x {
		uf.parent[x] = uf.parent[uf.parent[x]] // сжатие путей (path halving)
		x = uf.parent[x]
	}
	return x
}

func (uf *UnionFind) Union(x, y int) bool {
	rx, ry := uf.Find(x), uf.Find(y)
	if rx == ry {
		return false
	}
	if uf.size[rx] < uf.size[ry] { // меньшее дерево — под большее
		rx, ry = ry, rx
	}
	uf.parent[ry] = rx
	uf.size[rx] += uf.size[ry]
	uf.count--
	return true
}

func (uf *UnionFind) Connected(x, y int) bool {
	return uf.Find(x) == uf.Find(y)
}

func (uf *UnionFind) Count() int { return uf.count }

// Эталоны задач ниже не зовут UnionFind пакета: у каждой своя короткая копия
// (parent + find со сжатием пути), чтобы задачу можно было решать отдельно —
// без готового Find/Union из первой части пакета.

func FindRedundantConnection(edges [][]int) []int {
	parent := make([]int, len(edges)+1) // узлы 1…n, n = len(edges)
	for i := range parent {
		parent[i] = i
	}
	find := func(x int) int {
		for parent[x] != x {
			parent[x] = parent[parent[x]]
			x = parent[x]
		}
		return x
	}
	for _, e := range edges {
		ra, rb := find(e[0]), find(e[1])
		if ra == rb { // концы уже связаны — эта связь замкнула цикл
			return e
		}
		parent[ra] = rb
	}
	return nil
}

func ValidTree(n int, edges [][]int) bool {
	if len(edges) != n-1 { // у дерева на n вершинах ровно n−1 ребро
		return false
	}
	parent := make([]int, n)
	for i := range parent {
		parent[i] = i
	}
	find := func(x int) int {
		for parent[x] != x {
			parent[x] = parent[parent[x]]
			x = parent[x]
		}
		return x
	}
	for _, e := range edges {
		ra, rb := find(e[0]), find(e[1])
		if ra == rb { // цикл: при n−1 ребре значит, что кто-то отрезан
			return false
		}
		parent[ra] = rb
	}
	return true
}

func EquationsPossible(equations []string) bool {
	id := make(map[string]int, len(equations))
	parent := make([]int, 0, len(equations))
	idOf := func(name string) int {
		if v, ok := id[name]; ok {
			return v
		}
		id[name] = len(parent)
		parent = append(parent, len(parent))
		return id[name]
	}
	find := func(x int) int {
		for parent[x] != x {
			parent[x] = parent[parent[x]]
			x = parent[x]
		}
		return x
	}
	split := func(eq string) (x, y string, equal bool) {
		i := 0
		for eq[i] != '=' && eq[i] != '!' {
			i++
		}
		return eq[:i], eq[i+2:], eq[i] == '='
	}
	// Проход 1: склеиваем все равенства, неравенства откладываем — проверить
	// неравенство можно, только когда склеены все группы.
	var unequal [][2]int
	for _, eq := range equations {
		x, y, equal := split(eq)
		a, b := idOf(x), idOf(y)
		if equal {
			parent[find(a)] = find(b)
		} else {
			unequal = append(unequal, [2]int{a, b})
		}
	}
	// Проход 2: неравенство нарушено, если его концы в одной группе.
	for _, p := range unequal {
		if find(p[0]) == find(p[1]) {
			return false
		}
	}
	return true
}
