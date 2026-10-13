//go:build !solution

// Package avl — самобалансирующееся дерево поиска (AVL).
// Теория структуры — в книге: ../../src/avl-tree-structure.md
//
//	go test ./avl/                 # твои решения
//	go test -tags solution ./avl/  # эталон
//
// Реализуй Insert/Search/InOrder/Height. После каждой вставки высоты левого и
// правого поддеревьев любого узла отличаются не более чем на 1 — это держится
// поворотами (малыми и большими). Дубликаты игнорируй.
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
	// TODO: верни &AVL{}.
	panic("TODO: реализуй NewAVL")
}

// Insert добавляет значение и восстанавливает баланс. O(log n).
func (t *AVL) Insert(val int) {
	// TODO: рекурсивная вставка как в BST, затем на обратном ходе обновляй
	// высоту узла и при |balance| > 1 делай поворот (LL/RR — один,
	// LR/RL — два). balance = height(left) - height(right).
	panic("TODO: реализуй Insert")
}

// Search сообщает, есть ли значение в дереве. O(log n).
func (t *AVL) Search(val int) bool {
	// TODO: обычный спуск по дереву поиска.
	panic("TODO: реализуй Search")
}

// Height возвращает высоту дерева (0 у пустого).
func (t *AVL) Height() int {
	// TODO: высота корня (поддерживай поле h при вставке/поворотах).
	panic("TODO: реализуй Height")
}

// InOrder возвращает значения по возрастанию. Пустое дерево — пустой срез.
func (t *AVL) InOrder() []int {
	// TODO: in-order обход.
	panic("TODO: реализуй InOrder")
}

// Delete удаляет значение и восстанавливает баланс. O(log n).
// Если значения нет — дерево не меняется.
func (t *AVL) Delete(val int) {
	// TODO: рекурсивное удаление как в BST (узел с двумя детьми — через
	// преемника: минимум правого поддерева), затем на обратном ходе
	// rebalance каждого узла пути. В отличие от вставки, баланс может
	// нарушиться на нескольких уровнях — балансируй до самого корня.
	panic("TODO: реализуй Delete")
}
