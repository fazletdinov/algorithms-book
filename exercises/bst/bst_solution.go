//go:build solution

package bst

type node struct {
	val         int
	left, right *node
}

type BST struct {
	root *node
}

func NewBST() *BST { return &BST{} }

func (t *BST) Search(val int) bool {
	n := t.root
	for n != nil {
		switch {
		case val == n.val:
			return true
		case val < n.val:
			n = n.left
		default:
			n = n.right
		}
	}
	return false
}

func (t *BST) Insert(val int) {
	t.root = insert(t.root, val)
}

func insert(n *node, val int) *node {
	if n == nil {
		return &node{val: val}
	}
	switch {
	case val < n.val:
		n.left = insert(n.left, val)
	case val > n.val:
		n.right = insert(n.right, val)
	}
	return n // равно — дубликат, ничего не меняем
}

func (t *BST) Delete(val int) bool {
	var existed bool
	t.root, existed = remove(t.root, val)
	return existed
}

func remove(n *node, val int) (*node, bool) {
	if n == nil {
		return nil, false
	}
	switch {
	case val < n.val:
		var ok bool
		n.left, ok = remove(n.left, val)
		return n, ok
	case val > n.val:
		var ok bool
		n.right, ok = remove(n.right, val)
		return n, ok
	}
	// нашли узел: 0 или 1 ребёнок — отдаём другого ребёнка
	if n.left == nil {
		return n.right, true
	}
	if n.right == nil {
		return n.left, true
	}
	// два ребёнка: берём минимум правого поддерева (in-order преемник)
	succ := n.right
	for succ.left != nil {
		succ = succ.left
	}
	n.val = succ.val
	n.right, _ = remove(n.right, succ.val)
	return n, true
}

func (t *BST) InOrder() []int {
	out := []int{}
	var walk func(n *node)
	walk = func(n *node) {
		if n == nil {
			return
		}
		walk(n.left)
		out = append(out, n.val)
		walk(n.right)
	}
	walk(t.root)
	return out
}
