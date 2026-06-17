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
