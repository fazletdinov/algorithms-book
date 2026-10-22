//go:build solution

package listcrud

func InsertAt(head *ListNode, val, pos int) *ListNode {
	dummy := &ListNode{Next: head}
	prev := dummy
	for i := 0; i < pos && prev.Next != nil; i++ {
		prev = prev.Next
	}
	prev.Next = &ListNode{Val: val, Next: prev.Next}
	return dummy.Next
}

func Search(head *ListNode, target int) int {
	idx := 0
	for n := head; n != nil; n = n.Next {
		if n.Val == target {
			return idx
		}
		idx++
	}
	return -1
}

func DeleteVal(head *ListNode, target int) *ListNode {
	dummy := &ListNode{Next: head}
	for prev := dummy; prev.Next != nil; prev = prev.Next {
		if prev.Next.Val == target {
			prev.Next = prev.Next.Next
			break
		}
	}
	return dummy.Next
}

func RemoveNthFromEnd(head *ListNode, n int) *ListNode {
	dummy := &ListNode{Next: head}
	fast, slow := dummy, dummy
	for i := 0; i < n; i++ {
		fast = fast.Next // fast уходит вперёд на n узлов
	}
	for fast.Next != nil { // идут вместе, отставание n сохраняется
		fast = fast.Next
		slow = slow.Next
	}
	slow.Next = slow.Next.Next // slow — перед n-м с конца
	return dummy.Next
}

func MergeTwoSorted(a, b *ListNode) *ListNode {
	dummy := &ListNode{}
	tail := dummy
	for a != nil && b != nil {
		if a.Val <= b.Val { // при равенстве — сначала из a
			tail.Next = a
			a = a.Next
		} else {
			tail.Next = b
			b = b.Next
		}
		tail = tail.Next
	}
	if a != nil {
		tail.Next = a
	} else {
		tail.Next = b
	}
	return dummy.Next
}
