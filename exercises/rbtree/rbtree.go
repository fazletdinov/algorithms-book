//go:build !solution

// Package rbtree — красно-чёрное дерево: самобалансирующееся BST.
// Теория структуры — в книге: ../../src/red-black-tree-structure.md
//
//	go test ./rbtree/                 # ваши решения
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
	// TODO: создайте nilNode (чёрный), его left/right/parent = сам nilNode,
	// root = nilNode. Верните &RBTree{...}.
	panic("TODO: реализуйте NewRBTree")
}

// Insert добавляет значение (дубликаты игнорируются). O(log n).
func (t *RBTree) Insert(val int) {
	// TODO: вставьте как в BST красным узлом (детьми — nilNode), затем чините
	// нарушение «красный-красный» вверх: дядя красный → перекраска; дядя
	// чёрный → поворот. В конце корень красьте чёрным.
	panic("TODO: реализуйте Insert")
}

// Search сообщает, есть ли значение в дереве. O(log n).
func (t *RBTree) Search(val int) bool {
	// TODO: обычный спуск по дереву поиска (лист — это nilNode).
	panic("TODO: реализуйте Search")
}

// InOrder возвращает значения по возрастанию. Пустое дерево — пустой срез.
func (t *RBTree) InOrder() []int {
	// TODO: in-order обход (останавливайтесь на nilNode).
	panic("TODO: реализуйте InOrder")
}

// Delete удаляет значение. Если его нет — дерево не меняется. O(log n).
func (t *RBTree) Delete(val int) {
	// TODO: удалите как в BST (у узла с двумя детьми — через преемника,
	// копируя значение). Если физически ушёл ЧЁРНЫЙ узел — почините «двойной
	// чёрный» вверх (4 случая по цвету брата и его детей).
	panic("TODO: реализуйте Delete")
}
