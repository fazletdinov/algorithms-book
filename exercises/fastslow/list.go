package fastslow

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

// fromSliceWithCycle строит список из среза и замыкает хвост на узел с индексом
// pos (0-based). При pos < 0 цикла нет. Возвращает голову списка.
func fromSliceWithCycle(vals []int, pos int) *ListNode {
	head := fromSlice(vals)
	if pos < 0 || head == nil {
		return head
	}

	// Находим узел, на который замыкаем (по индексу pos), и хвост.
	var target *ListNode
	cur := head
	idx := 0
	for {
		if idx == pos {
			target = cur
		}
		if cur.Next == nil {
			break
		}
		cur = cur.Next
		idx++
	}
	cur.Next = target
	return head
}

// nodeAt возвращает узел списка по индексу pos (0-based), либо nil (для тестов).
// Список считается ациклическим.
func nodeAt(head *ListNode, pos int) *ListNode {
	if pos < 0 {
		return nil
	}
	cur := head
	for i := 0; i < pos && cur != nil; i++ {
		cur = cur.Next
	}
	return cur
}
