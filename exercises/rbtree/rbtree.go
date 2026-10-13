//go:build !solution

// Package rbtree — красно-чёрное дерево: самобалансирующееся BST.
// Теория структуры — в книге: ../../src/red-black-tree-structure.md
//
//	go test ./rbtree/                 # твои решения
//	go test -tags solution ./rbtree/  # эталон
//
// Четыре правила: каждый узел красный или чёрный; корень чёрный; у красного
// оба ребёнка чёрные; на любом пути от узла до листьев одинаковое число чёрных
// (чёрная высота). Insert красит новый узел красным и чинит «красный-красный»
// вверх (перекраска / поворот). Delete: если ушёл чёрный — «двойной чёрный»,
// который гасят вверх по дереву. Удобно держать общий чёрный лист-страж nilNode.
package rbtree

// node — узел дерева. red=true — красный, false — чёрный (страж nilNode чёрный).
type node struct {
	val                 int
	red                 bool
	left, right, parent *node
}

// RBTree хранит корень и общий лист-страж nilNode (чёрный).
type RBTree struct {
	root    *node
	nilNode *node
}

// NewRBTree создаёт пустое дерево (корень = страж).
func NewRBTree() *RBTree {
	// TODO: создай nilNode (чёрный), его left/right/parent = сам nilNode,
	// root = nilNode. Верни &RBTree{...}.
	panic("TODO: реализуй NewRBTree")
}

// Insert добавляет значение (дубликаты игнорируются). O(log n).
func (t *RBTree) Insert(val int) {
	// TODO: вставь как в BST красным узлом (детьми — nilNode), затем чини
	// нарушение «красный-красный» вверх: дядя красный → перекраска; дядя
	// чёрный → поворот. В конце корень крась чёрным.
	panic("TODO: реализуй Insert")
}

// Search сообщает, есть ли значение в дереве. O(log n).
func (t *RBTree) Search(val int) bool {
	// TODO: обычный спуск по дереву поиска (лист — это nilNode).
	panic("TODO: реализуй Search")
}

// InOrder возвращает значения по возрастанию. Пустое дерево — пустой срез.
func (t *RBTree) InOrder() []int {
	// TODO: in-order обход (останавливайся на nilNode).
	panic("TODO: реализуй InOrder")
}

// Delete удаляет значение. Если его нет — дерево не меняется. O(log n).
func (t *RBTree) Delete(val int) {
	// TODO: удали как в BST (у узла с двумя детьми — через преемника,
	// копируя значение). Если физически ушёл ЧЁРНЫЙ узел — почини «двойной
	// чёрный» вверх (4 случая по цвету брата и его детей).
	panic("TODO: реализуй Delete")
}
