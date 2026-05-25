//go:build !solution

package linkedlist

// ReverseList разворачивает односвязный список «на месте» и возвращает новую
// голову. Для пустого списка верните nil.
//
// Пример: 1->2->3->nil  ==>  3->2->1->nil.
//
// Ожидаемая сложность: O(n) по времени, O(1) по памяти.
func ReverseList(head *ListNode) *ListNode {
	// TODO: идите по списку, на каждом шаге перенаправляя Next текущего узла
	// на предыдущий (prev). Храните три указателя: prev, current, next.
	panic("TODO: реализуйте ReverseList")
}
