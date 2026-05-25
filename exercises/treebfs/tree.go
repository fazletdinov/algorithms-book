// Package treebfs — задачи на шаблон «Обход дерева в ширину».
//
//	go test ./treebfs/                 # ваши решения
//	go test -tags solution ./treebfs/  # эталон
//
// Тип TreeNode объявлен здесь (без build-тега), чтобы он был доступен и в
// заготовке, и в эталоне, и в тестах.
package treebfs

// TreeNode — узел бинарного дерева.
type TreeNode struct {
	Val   int
	Left  *TreeNode
	Right *TreeNode
}
