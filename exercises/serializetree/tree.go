// Package serializetree — сериализация/десериализация бинарного дерева:
// DFS (прямой обход) + парсинг (комбинация паттернов). Разбор — в книге:
// ../../src/pattern-combinations.md (раздел «Serialize / Deserialize Binary Tree»).
//
//	go test ./serializetree/                 # ваши решения
//	go test -tags solution ./serializetree/  # эталон
//
// Тип TreeNode и хелперы — без build-тега (общие для заготовки, эталона и тестов).
// Реализуйте Serialize (дерево → строка) и Deserialize (строка → дерево) так, чтобы
// Deserialize(Serialize(t)) давало исходное дерево. Подсказка: прямой обход
// (корень, лево, право) с ЯВНЫМ маркером пустого узла — без него форму не восстановить.
package serializetree

// TreeNode — узел бинарного дерева.
type TreeNode struct {
	Val         int
	Left, Right *TreeNode
}

// sameTree сравнивает два дерева по структуре и значениям (для тестов).
func sameTree(a, b *TreeNode) bool {
	if a == nil || b == nil {
		return a == b
	}
	return a.Val == b.Val && sameTree(a.Left, b.Left) && sameTree(a.Right, b.Right)
}
