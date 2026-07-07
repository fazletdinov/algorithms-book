//go:build solution

package btree

type node struct {
	keys     []int
	children []*node
	leaf     bool
}

type BTree struct {
	root *node
	t    int
}

func NewBTree(t int) *BTree {
	if t < 2 {
		t = 2
	}
	return &BTree{root: &node{leaf: true}, t: t}
}

func (bt *BTree) Search(k int) bool {
	return search(bt.root, k)
}

func search(n *node, k int) bool {
	i := 0
	for i < len(n.keys) && k > n.keys[i] {
		i++
	}
	if i < len(n.keys) && n.keys[i] == k {
		return true
	}
	if n.leaf {
		return false
	}
	return search(n.children[i], k)
}

func (bt *BTree) Insert(k int) {
	if bt.Search(k) {
		return // дубликаты игнорируем
	}
	r := bt.root
	if len(r.keys) == 2*bt.t-1 { // корень полон — дерево растёт вверх
		s := &node{leaf: false, children: []*node{r}}
		bt.root = s
		bt.splitChild(s, 0)
		bt.insertNonFull(s, k)
	} else {
		bt.insertNonFull(r, k)
	}
}

// splitChild делит полного ребёнка x.children[i] (2t-1 ключей) на два по t-1
// ключей; средний ключ поднимается в x на позицию i.
func (bt *BTree) splitChild(x *node, i int) {
	t := bt.t
	y := x.children[i]
	z := &node{leaf: y.leaf}
	z.keys = append(z.keys, y.keys[t:]...) // старшие t-1 ключей — в z
	if !y.leaf {
		z.children = append(z.children, y.children[t:]...)
		y.children = y.children[:t]
	}
	mid := y.keys[t-1]
	y.keys = y.keys[:t-1] // младшие t-1 ключей остаются у y

	// вставляем z как ребёнка x сразу после i
	x.children = append(x.children, nil)
	copy(x.children[i+2:], x.children[i+1:])
	x.children[i+1] = z
	// поднимаем mid в keys[i]
	x.keys = append(x.keys, 0)
	copy(x.keys[i+1:], x.keys[i:])
	x.keys[i] = mid
}

// insertNonFull вставляет k в узел x, который заведомо не полон.
func (bt *BTree) insertNonFull(x *node, k int) {
	i := len(x.keys) - 1
	if x.leaf {
		x.keys = append(x.keys, 0)
		for i >= 0 && k < x.keys[i] {
			x.keys[i+1] = x.keys[i]
			i--
		}
		x.keys[i+1] = k
		return
	}
	for i >= 0 && k < x.keys[i] {
		i--
	}
	i++
	if len(x.children[i].keys) == 2*bt.t-1 { // делим полного ребёнка до спуска
		bt.splitChild(x, i)
		if k > x.keys[i] {
			i++
		}
	}
	bt.insertNonFull(x.children[i], k)
}

func (bt *BTree) InOrder() []int {
	out := []int{}
	var walk func(n *node)
	walk = func(n *node) {
		for i := range n.keys {
			if !n.leaf {
				walk(n.children[i])
			}
			out = append(out, n.keys[i])
		}
		if !n.leaf {
			walk(n.children[len(n.keys)])
		}
	}
	walk(bt.root)
	return out
}

func (bt *BTree) Delete(k int) {
	deleteKey(bt.root, k, bt.t)
	if len(bt.root.keys) == 0 && !bt.root.leaf {
		bt.root = bt.root.children[0] // корень опустел — высота уменьшается
	}
}

func deleteKey(n *node, k, t int) {
	i := 0
	for i < len(n.keys) && k > n.keys[i] {
		i++
	}
	if i < len(n.keys) && n.keys[i] == k { // ключ в этом узле
		if n.leaf {
			n.keys = append(n.keys[:i], n.keys[i+1:]...)
			return
		}
		switch {
		case len(n.children[i].keys) >= t: // левый ребёнок не беден → предшественник
			pred := maxKey(n.children[i])
			n.keys[i] = pred
			deleteKey(n.children[i], pred, t)
		case len(n.children[i+1].keys) >= t: // правый не беден → преемник
			succ := minKey(n.children[i+1])
			n.keys[i] = succ
			deleteKey(n.children[i+1], succ, t)
		default: // оба бедны → слияние и удаление в слитом
			mergeChildren(n, i)
			deleteKey(n.children[i], k, t)
		}
		return
	}
	if n.leaf {
		return // ключа нет
	}
	atLast := i == len(n.keys)
	if len(n.children[i].keys) < t {
		fill(n, i, t)
	}
	if atLast && i > len(n.keys) { // слияние с последним сдвинуло индекс
		deleteKey(n.children[i-1], k, t)
	} else {
		deleteKey(n.children[i], k, t)
	}
}

func maxKey(n *node) int {
	for !n.leaf {
		n = n.children[len(n.children)-1]
	}
	return n.keys[len(n.keys)-1]
}

func minKey(n *node) int {
	for !n.leaf {
		n = n.children[0]
	}
	return n.keys[0]
}

// mergeChildren сливает children[i], разделитель keys[i] и children[i+1] в children[i].
func mergeChildren(n *node, i int) {
	c := n.children[i]
	r := n.children[i+1]
	c.keys = append(c.keys, n.keys[i])
	c.keys = append(c.keys, r.keys...)
	if !c.leaf {
		c.children = append(c.children, r.children...)
	}
	n.keys = append(n.keys[:i], n.keys[i+1:]...)
	n.children = append(n.children[:i+1], n.children[i+2:]...)
}

// fill докармливает бедного ребёнка children[i] (t-1 ключей) до >= t.
func fill(n *node, i, t int) {
	switch {
	case i > 0 && len(n.children[i-1].keys) >= t:
		borrowFromPrev(n, i)
	case i < len(n.children)-1 && len(n.children[i+1].keys) >= t:
		borrowFromNext(n, i)
	case i < len(n.children)-1:
		mergeChildren(n, i)
	default:
		mergeChildren(n, i-1)
	}
}

// borrowFromPrev: разделитель родителя спускается в c, крайний ключ левого брата — вверх.
func borrowFromPrev(n *node, i int) {
	c := n.children[i]
	l := n.children[i-1]
	c.keys = append([]int{n.keys[i-1]}, c.keys...)
	n.keys[i-1] = l.keys[len(l.keys)-1]
	l.keys = l.keys[:len(l.keys)-1]
	if !c.leaf {
		c.children = append([]*node{l.children[len(l.children)-1]}, c.children...)
		l.children = l.children[:len(l.children)-1]
	}
}

// borrowFromNext: разделитель родителя спускается в c, первый ключ правого брата — вверх.
func borrowFromNext(n *node, i int) {
	c := n.children[i]
	r := n.children[i+1]
	c.keys = append(c.keys, n.keys[i])
	n.keys[i] = r.keys[0]
	r.keys = r.keys[1:]
	if !c.leaf {
		c.children = append(c.children, r.children[0])
		r.children = r.children[1:]
	}
}
