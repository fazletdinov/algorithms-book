//go:build !solution

// Package serializetree — связка «DFS прямого обхода + парсинг токенов»:
// сериализация дерева в строку и восстановление обратно.
// Теория — в книге: ../../src/pattern-combinations.md
//
//	go test ./serializetree/                 # твои решения
//	go test -tags solution ./serializetree/  # эталон
package serializetree

// Serialize превращает дерево в строку (прямой обход с маркерами пустых узлов).
func Serialize(root *TreeNode) string {
	// TODO: рекурсивный DFS; для nil пиши маркер (например "# "), иначе значение,
	// затем левое и правое поддеревья. Собирай в strings.Builder.
	panic("TODO: реализуй Serialize")
}

// Deserialize восстанавливает дерево из строки, полученной Serialize.
func Deserialize(data string) *TreeNode {
	// TODO: разбей на токены (strings.Fields); рекурсивно потребляй их в ТОМ ЖЕ
	// порядке (корень, лево, право), общий индекс-курсор — через замыкание.
	panic("TODO: реализуй Deserialize")
}
