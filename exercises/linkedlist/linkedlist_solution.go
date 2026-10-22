//go:build solution

package linkedlist

func ReverseList(head *ListNode) *ListNode {
	var prev *ListNode
	for head != nil {
		next := head.Next
		head.Next = prev
		prev = head
		head = next
	}
	return prev
}

func ReverseSublist(head *ListNode, p, q int) *ListNode {
	if head == nil || p >= q {
		return head
	}
	dummy := &ListNode{Next: head}
	prev := dummy
	for i := 1; i < p; i++ {
		prev = prev.Next
	}
	cur := prev.Next
	for i := 0; i < q-p; i++ {
		next := cur.Next
		cur.Next = next.Next
		next.Next = prev.Next
		prev.Next = next
	}
	return dummy.Next
}

func ReverseKGroup(head *ListNode, k int) *ListNode {
	if head == nil || k <= 1 {
		return head
	}
	dummy := &ListNode{Next: head}
	groupPrev := dummy
	for {
		kth := groupPrev
		for i := 0; i < k && kth != nil; i++ {
			kth = kth.Next
		}
		if kth == nil {
			break
		}
		groupNext := kth.Next
		prev, cur := groupNext, groupPrev.Next
		for cur != groupNext {
			next := cur.Next
			cur.Next = prev
			prev = cur
			cur = next
		}
		newGroupPrev := groupPrev.Next
		groupPrev.Next = kth
		groupPrev = newGroupPrev
	}
	return dummy.Next
}

func IsPalindrome(head *ListNode) bool {
	if head == nil || head.Next == nil {
		return true
	}
	slow, fast := head, head
	for fast != nil && fast.Next != nil {
		slow = slow.Next
		fast = fast.Next.Next
	}
	// Узел перед slow по-прежнему указывает на slow, поэтому второй разворот
	// той же половины возвращает список в исходный вид.
	right := reverseHalf(slow)
	result := true
	for l, r := head, right; r != nil; l, r = l.Next, r.Next {
		if l.Val != r.Val {
			result = false
			break
		}
	}
	reverseHalf(right)
	return result
}

// reverseHalf — тот же разворот, что ReverseList, своей копией: IsPalindrome
// решается без соседней функции.
func reverseHalf(head *ListNode) *ListNode {
	var prev *ListNode
	for head != nil {
		head.Next, prev, head = prev, head, head.Next
	}
	return prev
}
