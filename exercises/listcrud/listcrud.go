//go:build !solution

// Package listcrud — базовые операции односвязного списка (CRUD).
// Теория — в книге: ../../src/linked-list-structure.md
//
//	go test ./listcrud/                 # твои решения
//	go test -tags solution ./listcrud/  # эталон
package listcrud

// InsertAt вставляет новый узел со значением val на позицию pos (0 — новая
// голова). Если pos больше длины — узел добавляется в конец. Возвращает голову.
func InsertAt(head *ListNode, val, pos int) *ListNode {
	// TODO: пройди pos шагов от dummy (не дальше конца), вставь узел между
	// prev и prev.Next, верни dummy.Next.
	panic("TODO: реализуй InsertAt")
}

// Search возвращает индекс первого узла со значением target или -1.
func Search(head *ListNode, target int) int {
	// TODO: линейный проход со счётчиком индекса.
	panic("TODO: реализуй Search")
}

// DeleteVal удаляет первый узел со значением target (если есть) и возвращает
// голову (возможно новую, если удалили первый узел).
func DeleteVal(head *ListNode, target int) *ListNode {
	// TODO: иди по списку с dummy; найдя prev.Next.Val == target, перецепи
	// prev.Next = prev.Next.Next и выйди.
	panic("TODO: реализуй DeleteVal")
}
