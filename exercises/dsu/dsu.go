//go:build !solution

// Package dsu — система непересекающихся множеств (Union-Find / DSU).
// Теория структуры — в книге: ../../src/union-find-structure.md
//
//	go test ./dsu/                 # твои решения
//	go test -tags solution ./dsu/  # эталон
//
// Реализуй Find/Union/Connected/Count. Сжатие путей в Find и объединение по
// размеру в Union дают почти O(1) на операцию (обратная функция Аккермана).
// Count — текущее число непересекающихся множеств.
package dsu

// UnionFind — лес деревьев: parent[i] — родитель i (корень указывает на себя),
// size[i] — размер дерева с корнем i, count — число множеств.
type UnionFind struct {
	parent []int
	size   []int
	count  int
}

// NewUnionFind создаёт n одноэлементных множеств 0..n-1.
func NewUnionFind(n int) *UnionFind {
	// TODO: parent[i]=i, size[i]=1, count=n.
	panic("TODO: реализуй NewUnionFind")
}

// Find возвращает корень множества с x, попутно сжимая путь.
func (uf *UnionFind) Find(x int) int {
	// TODO: иди по parent до корня; по дороге укорачивай путь
	// (например, parent[x] = parent[parent[x]] — path halving).
	panic("TODO: реализуй Find")
}

// Union объединяет множества x и y. Возвращает false, если они уже были в
// одном множестве (ничего не меняется), иначе true.
func (uf *UnionFind) Union(x, y int) bool {
	// TODO: найди корни; если совпали — false; иначе подвесь меньшее
	// дерево под большее, обнови size и уменьши count; верни true.
	panic("TODO: реализуй Union")
}

// Connected сообщает, лежат ли x и y в одном множестве.
func (uf *UnionFind) Connected(x, y int) bool {
	panic("TODO: реализуй Connected")
}

// Count возвращает текущее число непересекающихся множеств.
func (uf *UnionFind) Count() int {
	panic("TODO: реализуй Count")
}
