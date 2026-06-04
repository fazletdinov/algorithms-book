//go:build !solution

// Package fenwick — дерево Фенвика (Binary Indexed Tree) для префиксных сумм.
//
//	go test ./fenwick/                 # ваши решения
//	go test -tags solution ./fenwick/  # эталон
package fenwick

// Fenwick — дерево Фенвика (1-индексация внутри, 0-индексация снаружи).
type Fenwick struct {
	n    int
	tree []int
}

// NewFenwick строит дерево по массиву.
func NewFenwick(arr []int) *Fenwick {
	// TODO: создайте tree длины len(arr)+1 и прибавьте каждый элемент через
	// внутреннюю операцию обновления.
	panic("TODO: реализуйте NewFenwick")
}

// Update прибавляет delta к элементу с 0-индексом i (добавление, не запись).
func (f *Fenwick) Update(i, delta int) {
	// TODO: идите вверх по дереву, прибавляя младший бит: i += i & (-i).
	panic("TODO: реализуйте Update")
}

// PrefixSum возвращает сумму элементов [0..i] включительно (0-индексация).
func (f *Fenwick) PrefixSum(i int) int {
	// TODO: идите вниз, вычитая младший бит: i -= i & (-i).
	panic("TODO: реализуйте PrefixSum")
}

// RangeSum возвращает сумму на включительном диапазоне [l, r].
func (f *Fenwick) RangeSum(l, r int) int {
	// TODO: выразите через PrefixSum.
	panic("TODO: реализуйте RangeSum")
}

// CountInversions возвращает число инверсий — пар индексов i < j,
// для которых arr[i] > arr[j].
//
// Пример: [2,4,1,3,5] -> 3; [5,4,3,2,1] -> 10; [1,2,3] -> 0; [] -> 0.
//
// Ожидаемая сложность: O(n log n) через BIT с координатным сжатием.
func CountInversions(arr []int) int {
	// TODO: сожмите значения в ранги, идите справа налево (или слева направо),
	// для каждого элемента спросите у BIT, сколько уже встречено меньших,
	// затем добавьте текущий ранг в BIT.
	panic("TODO: реализуйте CountInversions")
}

// CountSmallerToRight возвращает срез, где для каждого элемента указано число
// меньших элементов, стоящих правее него.
//
// Пример: [5,2,6,1] -> [2,1,1,0]; [-1,-1] -> [0,0]; [] -> []int{}.
//
// Ожидаемая сложность: O(n log n) через BIT с координатным сжатием.
func CountSmallerToRight(arr []int) []int {
	// TODO: сожмите значения в ранги, идите справа налево; для каждого элемента
	// спросите у BIT сумму на префиксе строго меньших рангов, затем добавьте
	// текущий ранг в BIT.
	panic("TODO: реализуйте CountSmallerToRight")
}
