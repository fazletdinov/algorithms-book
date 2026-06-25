//go:build !solution

package listcrud

// InsertAt вставляет новый узел со значением val на позицию pos (0 — новая
// голова). Если pos больше длины — узел добавляется в конец. Возвращает голову.
func InsertAt(head *ListNode, val, pos int) *ListNode {
	// TODO: пройдите pos шагов от dummy (не дальше конца), вставьте узел между
	// prev и prev.Next, верните dummy.Next.
	panic("TODO: реализуйте InsertAt")
}

// Search возвращает индекс первого узла со значением target или -1.
func Search(head *ListNode, target int) int {
	// TODO: линейный проход со счётчиком индекса.
	panic("TODO: реализуйте Search")
}

// DeleteVal удаляет первый узел со значением target (если есть) и возвращает
// голову (возможно новую, если удалили первый узел).
func DeleteVal(head *ListNode, target int) *ListNode {
	// TODO: идите по списку с dummy; найдя prev.Next.Val == target, перецепите
	// prev.Next = prev.Next.Next и выйдите.
	panic("TODO: реализуйте DeleteVal")
}
