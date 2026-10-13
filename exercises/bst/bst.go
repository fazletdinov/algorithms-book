//go:build !solution

// Package bst — двоичное дерево поиска (без балансировки).
// Теория структуры — в книге: ../../src/bst-structure.md
//
//	go test ./bst/                 # твои решения
//	go test -tags solution ./bst/  # эталон
//
// Реализуй Search/Insert/Delete/InOrder. Инвариант BST: для любого узла все
// ключи слева меньше его, справа — больше. Дубликаты игнорируй (множество).
// Тонкий случай — Delete узла с двумя детьми: замени его значением преемника
// (минимум правого поддерева) и удали преемника.
package bst

// node — узел дерева. BST хранит только корень.
type node struct {
	val         int
	left, right *node
}

// BST — двоичное дерево поиска.
type BST struct {
	root *node
}

// NewBST создаёт пустое дерево.
func NewBST() *BST {
	// TODO: верни &BST{}.
	panic("TODO: реализуй NewBST")
}

// Search сообщает, есть ли значение в дереве. В среднем O(h).
func (t *BST) Search(val int) bool {
	// TODO: спускайся от корня: меньше — влево, больше — вправо, равно — нашли.
	panic("TODO: реализуй Search")
}

// Insert добавляет значение (дубликаты игнорируются).
func (t *BST) Insert(val int) {
	// TODO: рекурсивно или циклом найди место (nil) и подвесь новый узел.
	panic("TODO: реализуй Insert")
}

// Delete удаляет значение и возвращает true, если оно было; иначе false.
func (t *BST) Delete(val int) bool {
	// TODO: спустись к узлу; 0/1 ребёнок — подставь поддерево; 2 ребёнка —
	// перепиши значение из минимума правого поддерева и удали тот минимум.
	panic("TODO: реализуй Delete")
}

// InOrder возвращает значения по возрастанию (in-order обход). Пустое дерево
// даёт пустой (не nil) срез.
func (t *BST) InOrder() []int {
	// TODO: in-order обход: левое поддерево, узел, правое поддерево.
	panic("TODO: реализуй InOrder")
}
