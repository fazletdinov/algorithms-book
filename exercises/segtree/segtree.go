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

// LazySegmentTree — дерево отрезков с отложенными обновлениями
// (диапазонная прибавка + диапазонная сумма).
type LazySegmentTree struct {
	n          int
	tree, lazy []int
}

// NewLazySegmentTree строит дерево по массиву.
func NewLazySegmentTree(arr []int) *LazySegmentTree {
	// TODO: рекурсивно постройте дерево; tree и lazy размера 4n.
	panic("TODO: реализуйте NewLazySegmentTree")
}

// RangeUpdate прибавляет delta ко всем элементам включительного [l, r].
func (t *LazySegmentTree) RangeUpdate(l, r, delta int) {
	// TODO: если узел целиком в диапазоне — примените прибавку и отложите её
	// детям (lazy); иначе спускайтесь, не забыв push.
	panic("TODO: реализуйте RangeUpdate")
}

// RangeQuery возвращает сумму на включительном [l, r].
func (t *LazySegmentTree) RangeQuery(l, r int) int {
	// TODO: перед спуском к детям проталкивайте отложенные значения (push).
	panic("TODO: реализуйте RangeQuery")
}
