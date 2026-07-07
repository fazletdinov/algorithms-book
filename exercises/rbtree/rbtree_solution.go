//go:build solution

package rbtree

type node struct {
	val                 int
	red                 bool
	left, right, parent *node
}

type RBTree struct {
	root    *node
	nilNode *node
}

func NewRBTree() *RBTree {
	nilNode := &node{red: false}
	nilNode.left, nilNode.right, nilNode.parent = nilNode, nilNode, nilNode
	return &RBTree{nilNode: nilNode, root: nilNode}
}

func (t *RBTree) leftRotate(x *node) {
	y := x.right
	x.right = y.left
	if y.left != t.nilNode {
		y.left.parent = x
	}
	y.parent = x.parent
	switch {
	case x.parent == t.nilNode:
		t.root = y
	case x == x.parent.left:
		x.parent.left = y
	default:
		x.parent.right = y
	}
	y.left = x
	x.parent = y
}

func (t *RBTree) rightRotate(x *node) {
	y := x.left
	x.left = y.right
	if y.right != t.nilNode {
		y.right.parent = x
	}
	y.parent = x.parent
	switch {
	case x.parent == t.nilNode:
		t.root = y
	case x == x.parent.right:
		x.parent.right = y
	default:
		x.parent.left = y
	}
	y.right = x
	x.parent = y
}

func (t *RBTree) Insert(val int) {
	y, x := t.nilNode, t.root
	for x != t.nilNode {
		y = x
		switch {
		case val < x.val:
			x = x.left
		case val > x.val:
			x = x.right
		default:
			return // дубликат
		}
	}
	z := &node{val: val, red: true, left: t.nilNode, right: t.nilNode, parent: y}
	switch {
	case y == t.nilNode:
		t.root = z
	case val < y.val:
		y.left = z
	default:
		y.right = z
	}
	t.insertFixup(z)
}

func (t *RBTree) insertFixup(z *node) {
	for z.parent.red {
		if z.parent == z.parent.parent.left {
			u := z.parent.parent.right
			if u.red { // дядя красный → перекраска
				z.parent.red = false
				u.red = false
				z.parent.parent.red = true
				z = z.parent.parent
			} else { // дядя чёрный → поворот
				if z == z.parent.right {
					z = z.parent
					t.leftRotate(z)
				}
				z.parent.red = false
				z.parent.parent.red = true
				t.rightRotate(z.parent.parent)
			}
		} else {
			u := z.parent.parent.left
			if u.red {
				z.parent.red = false
				u.red = false
				z.parent.parent.red = true
				z = z.parent.parent
			} else {
				if z == z.parent.left {
					z = z.parent
					t.rightRotate(z)
				}
				z.parent.red = false
				z.parent.parent.red = true
				t.leftRotate(z.parent.parent)
			}
		}
	}
	t.root.red = false
}

func (t *RBTree) Search(val int) bool {
	x := t.root
	for x != t.nilNode {
		switch {
		case val == x.val:
			return true
		case val < x.val:
			x = x.left
		default:
			x = x.right
		}
	}
	return false
}

func (t *RBTree) InOrder() []int {
	out := []int{}
	var walk func(n *node)
	walk = func(n *node) {
		if n == t.nilNode {
			return
		}
		walk(n.left)
		out = append(out, n.val)
		walk(n.right)
	}
	walk(t.root)
	return out
}

func (t *RBTree) find(val int) *node {
	x := t.root
	for x != t.nilNode && x.val != val {
		if val < x.val {
			x = x.left
		} else {
			x = x.right
		}
	}
	return x
}

func (t *RBTree) minimum(x *node) *node {
	for x.left != t.nilNode {
		x = x.left
	}
	return x
}

// transplant заменяет поддерево u поддеревом v.
func (t *RBTree) transplant(u, v *node) {
	switch {
	case u.parent == t.nilNode:
		t.root = v
	case u == u.parent.left:
		u.parent.left = v
	default:
		u.parent.right = v
	}
	v.parent = u.parent // корректно и для v == nilNode
}

func (t *RBTree) Delete(val int) {
	z := t.find(val)
	if z == t.nilNode {
		return
	}
	// приводим к удалению узла с <= 1 ребёнком (вариант с копированием значения)
	toRemove := z
	if z.left != t.nilNode && z.right != t.nilNode {
		s := t.minimum(z.right)
		z.val = s.val
		toRemove = s
	}
	var x *node
	if toRemove.left != t.nilNode {
		x = toRemove.left
	} else {
		x = toRemove.right
	}
	removedRed := toRemove.red
	t.transplant(toRemove, x)
	if !removedRed { // ушёл чёрный → чиним «двойной чёрный»
		t.deleteFixup(x)
	}
}

func (t *RBTree) deleteFixup(x *node) {
	for x != t.root && !x.red {
		if x == x.parent.left {
			w := x.parent.right
			if w.red { // случай 1: брат красный
				w.red = false
				x.parent.red = true
				t.leftRotate(x.parent)
				w = x.parent.right
			}
			if !w.left.red && !w.right.red { // случай 2: оба ребёнка брата чёрные
				w.red = true
				x = x.parent
			} else {
				if !w.right.red { // случай 3 → сводим к случаю 4
					w.left.red = false
					w.red = true
					t.rightRotate(w)
					w = x.parent.right
				}
				w.red = x.parent.red // случай 4
				x.parent.red = false
				w.right.red = false
				t.leftRotate(x.parent)
				x = t.root
			}
		} else {
			w := x.parent.left
			if w.red {
				w.red = false
				x.parent.red = true
				t.rightRotate(x.parent)
				w = x.parent.left
			}
			if !w.right.red && !w.left.red {
				w.red = true
				x = x.parent
			} else {
				if !w.left.red {
					w.right.red = false
					w.red = true
					t.leftRotate(w)
					w = x.parent.left
				}
				w.red = x.parent.red
				x.parent.red = false
				w.left.red = false
				t.rightRotate(x.parent)
				x = t.root
			}
		}
	}
	x.red = false
}
