// Package linkedlist — задачи на шаблон «Разворот связного списка».
//
//	go test ./linkedlist/                 # ваши решения
//	go test -tags solution ./linkedlist/  # эталон
//
// Тип ListNode и хелперы объявлены здесь (без build-тега), чтобы быть
// доступными в заготовке, эталоне и тестах.
package linkedlist

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
