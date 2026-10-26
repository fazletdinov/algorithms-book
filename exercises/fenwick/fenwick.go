//go:build !solution

// Package fenwick — дерево Фенвика (Binary Indexed Tree) для префиксных сумм.
// Теория паттерна — в книге: ../../src/fenwick-tree.md
//
//	go test ./fenwick/                 # твои решения
//	go test -tags solution ./fenwick/  # эталон
package fenwick

// Fenwick — дерево Фенвика (1-индексация внутри, 0-индексация снаружи).
//
// Ограничения: len(arr) ≤ 5·10⁵, до 2·10⁵ вызовов Add, PrefixSum и RangeSum,
// |arr[i]|, |delta| ≤ 10⁹.
type Fenwick struct {
	n    int
	tree []int
}

// NewFenwick строит дерево по массиву.
func NewFenwick(arr []int) *Fenwick {
	// TODO: создай tree длины len(arr)+1 и прибавь каждый элемент через
	// внутреннюю операцию обновления.
	panic("TODO: реализуй NewFenwick")
}

// Add прибавляет delta к элементу с 0-индексом i (добавление, не запись).
func (f *Fenwick) Add(i, delta int) {
	// TODO: иди вверх по дереву, прибавляя младший бит: i += i & (-i).
	panic("TODO: реализуй Add")
}

// PrefixSum возвращает сумму элементов [0..i] включительно (0-индексация).
func (f *Fenwick) PrefixSum(i int) int {
	// TODO: иди вниз, вычитая младший бит: i -= i & (-i).
	panic("TODO: реализуй PrefixSum")
}

// RangeSum возвращает сумму на включительном диапазоне [l, r].
func (f *Fenwick) RangeSum(l, r int) int {
	// TODO: вырази через PrefixSum.
	panic("TODO: реализуй RangeSum")
}

// CountInversions возвращает число инверсий — пар индексов i < j,
// для которых arr[i] > arr[j].
//
// Пример: [2,4,1,3,5] -> 3; [5,4,3,2,1] -> 10; [1,2,3] -> 0; [] -> 0.
//
// Ограничения: len(arr) ≤ 2·10⁵, |arr[i]| ≤ 10⁹.
//
// Ожидаемая сложность: O(n log n) через BIT с координатным сжатием.
func CountInversions(arr []int) int {
	// TODO: сожми значения в ранги, иди справа налево (или слева направо),
	// для каждого элемента спроси у BIT, сколько уже встречено меньших,
	// затем добавь текущий ранг в BIT.
	panic("TODO: реализуй CountInversions")
}

// CountSmallerToRight возвращает срез, где для каждого элемента указано число
// меньших элементов, стоящих правее него.
//
// Пример: [5,2,6,1] -> [2,1,1,0]; [-1,-1] -> [0,0]; [] -> []int{}.
//
// Ограничения: len(arr) ≤ 2·10⁵, |arr[i]| ≤ 10⁹.
//
// Ожидаемая сложность: O(n log n) через BIT с координатным сжатием.
func CountSmallerToRight(arr []int) []int {
	// TODO: сожми значения в ранги, иди справа налево; для каждого элемента
	// спроси у BIT сумму на префиксе строго меньших рангов, затем добавь
	// текущий ранг в BIT.
	panic("TODO: реализуй CountSmallerToRight")
}
