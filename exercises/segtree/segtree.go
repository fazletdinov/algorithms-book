//go:build !solution

// Package segtree — дерево отрезков для суммы на диапазоне.
// Теория паттерна — в книге: ../../src/segment-tree.md
//
//	go test ./segtree/                 # твои решения
//	go test -tags solution ./segtree/  # эталон
package segtree

// SegmentTree — дерево отрезков (сумма, точечное обновление).
//
// Ограничения: len(arr) ≤ 5·10⁵, до 2·10⁵ вызовов Update и Query, |arr[i]|, |val| ≤ 10⁹.
type SegmentTree struct {
	n    int
	tree []int
}

// NewSegmentTree строит дерево по массиву за O(n).
func NewSegmentTree(arr []int) *SegmentTree {
	// TODO: положи листья в [n, 2n), затем посчитай внутренние узлы
	// снизу вверх как сумму двух детей.
	panic("TODO: реализуй NewSegmentTree")
}

// Update устанавливает arr[i] = val за O(log n).
func (st *SegmentTree) Update(i, val int) {
	// TODO: обнови лист и всех его предков.
	panic("TODO: реализуй Update")
}

// Query возвращает сумму на ВКЛЮЧИТЕЛЬНОМ диапазоне [l, r] за O(log n).
func (st *SegmentTree) Query(l, r int) int {
	// TODO: поднимайся от листьев, добавляя к ответу узлы, целиком
	// попадающие в диапазон (классический итеративный обход).
	panic("TODO: реализуй Query")
}

// MinSegmentTree — дерево отрезков (минимум, точечное обновление).
//
// Ограничения: len(arr) ≤ 5·10⁵, до 2·10⁵ вызовов Update и Query, |arr[i]|, |val| ≤ 10⁹.
type MinSegmentTree struct {
	n    int
	tree []int
}

// NewMinSegmentTree строит дерево по массиву за O(n).
//
//	Пример: arr=[5,2,7,1,9]; Query(0,4)->1; Query(0,1)->2.
//
// Ожидаемая сложность: O(n).
func NewMinSegmentTree(arr []int) *MinSegmentTree {
	// TODO: положи листья в [n, 2n), затем посчитай внутренние узлы
	// снизу вверх как минимум двух детей.
	panic("TODO: реализуй NewMinSegmentTree")
}

// Update устанавливает arr[i] = val за O(log n).
//
//	Пример: Update(3,10) превращает [5,2,7,1,9] в [5,2,7,10,9].
//
// Ожидаемая сложность: O(log n).
func (st *MinSegmentTree) Update(i, val int) {
	// TODO: обнови лист и всех его предков (пересчёт как минимум детей).
	panic("TODO: реализуй MinSegmentTree.Update")
}

// Query возвращает минимум на ВКЛЮЧИТЕЛЬНОМ диапазоне [l, r] за O(log n).
//
//	Пример: arr=[5,2,7,1,9]; Query(0,4)->1; Query(0,1)->2;
//	после Update(3,10) Query(2,4)->7.
//
// Ожидаемая сложность: O(log n).
func (st *MinSegmentTree) Query(l, r int) int {
	// TODO: поднимайся от листьев, беря минимум по узлам, целиком
	// попадающим в диапазон (классический итеративный обход).
	panic("TODO: реализуй MinSegmentTree.Query")
}

// LazySegmentTree — дерево отрезков с отложенными обновлениями
// (диапазонная прибавка + диапазонная сумма).
//
// Ограничения: len(arr) ≤ 5·10⁵, до 2·10⁵ вызовов RangeUpdate и RangeQuery,
// |arr[i]|, |delta| ≤ 10⁴.
type LazySegmentTree struct {
	n          int
	tree, lazy []int
}

// NewLazySegmentTree строит дерево по массиву.
func NewLazySegmentTree(arr []int) *LazySegmentTree {
	// TODO: рекурсивно построй дерево; tree и lazy размера 4n.
	panic("TODO: реализуй NewLazySegmentTree")
}

// RangeUpdate прибавляет delta ко всем элементам включительного [l, r].
func (t *LazySegmentTree) RangeUpdate(l, r, delta int) {
	// TODO: если узел целиком в диапазоне — примени прибавку и отложи её
	// детям (lazy); иначе спускайся, не забыв push.
	panic("TODO: реализуй RangeUpdate")
}

// RangeQuery возвращает сумму на включительном [l, r].
func (t *LazySegmentTree) RangeQuery(l, r int) int {
	// TODO: перед спуском к детям проталкивай отложенные значения (push).
	panic("TODO: реализуй RangeQuery")
}
