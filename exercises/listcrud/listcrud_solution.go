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
