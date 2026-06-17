//go:build !solution

// Package avl — самобалансирующееся дерево поиска (AVL).
// Теория структуры — в книге: ../../src/avl-tree-structure.md
//
//	go test ./avl/                 # ваши решения
//	go test -tags solution ./avl/  # эталон
//
// Реализуйте Insert/Search/InOrder/Height. После каждой вставки высоты левого и
// правого поддеревьев любого узла отличаются не более чем на 1 — это держится
// поворотами (малыми и большими). Дубликаты игнорируйте.
package avl

// node хранит значение, высоту поддерева и детей.
type node struct {
	val         int
	h           int
	left, right *node
}

// AVL — сбалансированное дерево поиска.
type AVL struct {
	root *node
}

// NewAVL создаёт пустое дерево.
func NewAVL() *AVL {
	// TODO: верните &AVL{}.
	panic("TODO: реализуйте NewAVL")
}

// Insert добавляет значение и восстанавливает баланс. O(log n).
func (t *AVL) Insert(val int) {
	// TODO: рекурсивная вставка как в BST, затем на обратном ходе обновляйте
	// высоту узла и при |balance| > 1 делайте поворот (LL/RR — один,
	// LR/RL — два). balance = height(left) - height(right).
	panic("TODO: реализуйте Insert")
}

// Search сообщает, есть ли значение в дереве. O(log n).
func (t *AVL) Search(val int) bool {
	// TODO: обычный спуск по дереву поиска.
	panic("TODO: реализуйте Search")
}

// Height возвращает высоту дерева (0 у пустого).
func (t *AVL) Height() int {
	// TODO: высота корня (поддерживайте поле h при вставке/поворотах).
	panic("TODO: реализуйте Height")
}

// InOrder возвращает значения по возрастанию. Пустое дерево — пустой срез.
func (t *AVL) InOrder() []int {
	// TODO: in-order обход.
	panic("TODO: реализуйте InOrder")
}
