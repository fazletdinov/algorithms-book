//go:build solution

package bst

import "math"

type BST struct {
	root *Node
}

func NewBST() *BST { return &BST{} }

func (t *BST) Search(val int) bool {
	n := t.root
	for n != nil {
		switch {
		case val == n.Val:
			return true
		case val < n.Val:
			n = n.Left
		default:
			n = n.Right
		}
	}
	return false
}

func (t *BST) Insert(val int) {
	t.root = insert(t.root, val)
}

func insert(n *Node, val int) *Node {
	if n == nil {
		return &Node{Val: val}
	}
	switch {
	case val < n.Val:
		n.Left = insert(n.Left, val)
	case val > n.Val:
		n.Right = insert(n.Right, val)
	}
	return n // равно — дубликат, ничего не меняем
}

func (t *BST) Delete(val int) bool {
	var existed bool
	t.root, existed = remove(t.root, val)
	return existed
}

func remove(n *Node, val int) (*Node, bool) {
	if n == nil {
		return nil, false
	}
	switch {
	case val < n.Val:
		var ok bool
		n.Left, ok = remove(n.Left, val)
		return n, ok
	case val > n.Val:
		var ok bool
		n.Right, ok = remove(n.Right, val)
		return n, ok
	}
	// нашли узел: 0 или 1 ребёнок — отдаём другого ребёнка
	if n.Left == nil {
		return n.Right, true
	}
	if n.Right == nil {
		return n.Left, true
	}
	// два ребёнка: берём минимум правого поддерева (in-order преемник)
	succ := n.Right
	for succ.Left != nil {
		succ = succ.Left
	}
	n.Val = succ.Val
	n.Right, _ = remove(n.Right, succ.Val)
	return n, true
}

func (t *BST) InOrder() []int {
	out := []int{}
	var walk func(n *Node)
	walk = func(n *Node) {
		if n == nil {
			return
		}
		walk(n.Left)
		out = append(out, n.Val)
		walk(n.Right)
	}
	walk(t.root)
	return out
}

func IsValidBST(root *Node) bool {
	return validIn(root, math.MinInt, math.MaxInt)
}

// validIn: все значения поддерева n обязаны лежать строго между lo и hi —
// границами, которые оставили предки по дороге от корня.
func validIn(n *Node, lo, hi int) bool {
	if n == nil {
		return true
	}
	if n.Val <= lo || n.Val >= hi {
		return false
	}
	// влево — всё меньше n.Val (верхняя граница сжимается), вправо — больше
	return validIn(n.Left, lo, n.Val) && validIn(n.Right, n.Val, hi)
}

func KthSmallest(root *Node, k int) int {
	val, _ := kthIn(root, &k)
	return val
}

// kthIn — in-order с остановкой: k — сколько узлов ещё осталось выдать.
// Второй результат — нашли ли ответ в этом поддереве (тогда дальше не идём).
func kthIn(n *Node, k *int) (int, bool) {
	if n == nil {
		return 0, false
	}
	if val, ok := kthIn(n.Left, k); ok {
		return val, true
	}
	*k--
	if *k == 0 {
		return n.Val, true
	}
	return kthIn(n.Right, k)
}

func LowestCommonAncestor(root *Node, p, q int) int {
	n := root
	for n != nil {
		switch {
		case p < n.Val && q < n.Val:
			n = n.Left // оба меньше — общий предок слева
		case p > n.Val && q > n.Val:
			n = n.Right // оба больше — справа
		default:
			return n.Val // пути к p и q здесь расходятся (или узел — один из них)
		}
	}
	return 0 // недостижимо: p и q есть в дереве
}
