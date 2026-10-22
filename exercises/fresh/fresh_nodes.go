package fresh

// Типы узлов объявлены здесь, без build-тега: они нужны и заготовке, и эталону, и тестам.

// ListNode — узел односвязного списка.
type ListNode struct {
	Val  int
	Next *ListNode
}

// TreeNode — узел двоичного дерева.
type TreeNode struct {
	Val   int
	Left  *TreeNode
	Right *TreeNode
}
