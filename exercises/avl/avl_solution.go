//go:build solution

package avl

type node struct {
	val         int
	h           int
	left, right *node
}

type AVL struct {
	root *node
}

func NewAVL() *AVL { return &AVL{} }

func height(n *node) int {
	if n == nil {
		return 0
	}
	return n.h
}

func balanceFactor(n *node) int {
	return height(n.left) - height(n.right)
}

// fix пересчитывает высоту узла по детям.
func fix(n *node) {
	l, r := height(n.left), height(n.right)
	if l > r {
		n.h = l + 1
	} else {
		n.h = r + 1
	}
}

func rotateRight(y *node) *node {
	x := y.left
	y.left = x.right
	x.right = y
	fix(y)
	fix(x)
	return x
}

func rotateLeft(x *node) *node {
	y := x.right
	x.right = y.left
	y.left = x
	fix(x)
	fix(y)
	return y
}

func rebalance(n *node) *node {
	fix(n)
	switch bf := balanceFactor(n); {
	case bf > 1: // левый перевес
		if balanceFactor(n.left) < 0 {
			n.left = rotateLeft(n.left) // Left-Right
		}
		return rotateRight(n)
	case bf < -1: // правый перевес
		if balanceFactor(n.right) > 0 {
			n.right = rotateRight(n.right) // Right-Left
		}
		return rotateLeft(n)
	default:
		return n
	}
}

func (t *AVL) Insert(val int) {
	t.root = insert(t.root, val)
}

func insert(n *node, val int) *node {
	if n == nil {
		return &node{val: val, h: 1}
	}
	switch {
	case val < n.val:
		n.left = insert(n.left, val)
	case val > n.val:
		n.right = insert(n.right, val)
	default:
		return n // дубликат
	}
	return rebalance(n)
}

func (t *AVL) Search(val int) bool {
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

func (t *AVL) Height() int { return height(t.root) }

func (t *AVL) InOrder() []int {
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
