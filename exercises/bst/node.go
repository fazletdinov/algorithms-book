package bst

// Node — узел дерева поиска: значение и две ссылки, как в главе. Пустое
// поддерево — nil. Тип объявлен без build-тега — общий для заготовки, эталона
// и тестов: им пользуются и BST, и функции, которые получают корень дерева
// (IsValidBST, KthSmallest, LowestCommonAncestor).
type Node struct {
	Val   int
	Left  *Node // поддерево со значениями < Val
	Right *Node // поддерево со значениями > Val
}
