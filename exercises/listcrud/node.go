// Package listcrud — базовые операции односвязного списка: вставка по позиции,
// поиск значения, удаление значения. Виджеты-визуализации этих операций
// (ll-insert/ll-search/ll-delete) — в книге: ../../src/linked-list-structure.md
//
//	go test ./listcrud/                 # твои решения
//	go test -tags solution ./listcrud/  # эталон
//
// Тип ListNode и хелперы объявлены без build-тега — общие для заготовки,
// эталона и тестов. Совет: веди операции через фиктивную голову (dummy),
// тогда вставка/удаление в начале не требует особого случая.
package listcrud

// ListNode — узел односвязного списка.
type ListNode struct {
	Val  int
	Next *ListNode
}

// fromSlice строит список из среза значений (для тестов).
func fromSlice(vals []int) *ListNode {
	dummy := &ListNode{}
	cur := dummy
	for _, v := range vals {
		cur.Next = &ListNode{Val: v}
		cur = cur.Next
	}
	return dummy.Next
}

// toSlice разворачивает список обратно в срез (для тестов).
func toSlice(head *ListNode) []int {
	out := []int{}
	for n := head; n != nil; n = n.Next {
		out = append(out, n.Val)
	}
	return out
}
