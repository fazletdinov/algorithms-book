//go:build !solution

// Package segtree — дерево отрезков для суммы на диапазоне.
//
//	go test ./segtree/                 # ваши решения
//	go test -tags solution ./segtree/  # эталон
package segtree

// SegmentTree — дерево отрезков (сумма, точечное обновление).
type SegmentTree struct {
	n    int
	tree []int
}

// NewSegmentTree строит дерево по массиву за O(n).
func NewSegmentTree(arr []int) *SegmentTree {
	// TODO: положите листья в [n, 2n), затем посчитайте внутренние узлы
	// снизу вверх как сумму двух детей.
	panic("TODO: реализуйте NewSegmentTree")
}

// Update устанавливает arr[i] = val за O(log n).
func (st *SegmentTree) Update(i, val int) {
	// TODO: обновите лист и всех его предков.
	panic("TODO: реализуйте Update")
}

// Query возвращает сумму на ВКЛЮЧИТЕЛЬНОМ диапазоне [l, r] за O(log n).
func (st *SegmentTree) Query(l, r int) int {
	// TODO: поднимайтесь от листьев, добавляя к ответу узлы, целиком
	// попадающие в диапазон (классический итеративный обход).
	panic("TODO: реализуйте Query")
}
