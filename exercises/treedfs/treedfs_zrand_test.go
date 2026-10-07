package treedfs

import (
	"math/rand"
	"testing"
)

// randTree — случайное бинарное дерево из size узлов случайной формы.
func randTree(rng *rand.Rand, size int) *TreeNode {
	if size == 0 {
		return nil
	}
	left := rng.Intn(size)
	right := size - 1 - left
	return &TreeNode{
		Val:   rng.Intn(20) - 10,
		Left:  randTree(rng, left),
		Right: randTree(rng, right),
	}
}

func eqInts(a, b []int) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}

// iterPre/iterIn/iterPost — итеративные обходы (стек), независимые от рекурсии эталона.
func iterPre(root *TreeNode) []int {
	res := []int{}
	var st []*TreeNode
	if root != nil {
		st = append(st, root)
	}
	for len(st) > 0 {
		n := st[len(st)-1]
		st = st[:len(st)-1]
		res = append(res, n.Val)
		if n.Right != nil {
			st = append(st, n.Right)
		}
		if n.Left != nil {
			st = append(st, n.Left)
		}
	}
	return res
}

func iterIn(root *TreeNode) []int {
	res := []int{}
	var st []*TreeNode
	cur := root
	for cur != nil || len(st) > 0 {
		for cur != nil {
			st = append(st, cur)
			cur = cur.Left
		}
		cur = st[len(st)-1]
		st = st[:len(st)-1]
		res = append(res, cur.Val)
		cur = cur.Right
	}
	return res
}

func iterPost(root *TreeNode) []int {
	// корень-право-лево, затем разворот → лево-право-корень
	var tmp []int
	var st []*TreeNode
	if root != nil {
		st = append(st, root)
	}
	for len(st) > 0 {
		n := st[len(st)-1]
		st = st[:len(st)-1]
		tmp = append(tmp, n.Val)
		if n.Left != nil {
			st = append(st, n.Left)
		}
		if n.Right != nil {
			st = append(st, n.Right)
		}
	}
	res := make([]int, 0, len(tmp))
	for i := len(tmp) - 1; i >= 0; i-- {
		res = append(res, tmp[i])
	}
	return res
}

func TestTraversalsRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(1601))
	for range 3000 {
		root := randTree(rng, rng.Intn(20))
		if got := PreorderTraversal(root); !eqInts(got, iterPre(root)) {
			t.Fatalf("PreorderTraversal(%s) = %v, want %v", treeString(root), got, iterPre(root))
		}
		if got := InorderTraversal(root); !eqInts(got, iterIn(root)) {
			t.Fatalf("InorderTraversal(%s) = %v, want %v", treeString(root), got, iterIn(root))
		}
		if got := PostorderTraversal(root); !eqInts(got, iterPost(root)) {
			t.Fatalf("PostorderTraversal(%s) = %v, want %v", treeString(root), got, iterPost(root))
		}
	}
}

// bfsDepth — глубина через обход по уровням (независимо от рекурсии эталона).
func bfsDepth(root *TreeNode) int {
	if root == nil {
		return 0
	}
	depth := 0
	level := []*TreeNode{root}
	for len(level) > 0 {
		depth++
		var next []*TreeNode
		for _, n := range level {
			if n.Left != nil {
				next = append(next, n.Left)
			}
			if n.Right != nil {
				next = append(next, n.Right)
			}
		}
		level = next
	}
	return depth
}

func TestMaxDepthRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(1602))
	for range 3000 {
		root := randTree(rng, rng.Intn(25))
		if got, want := MaxDepth(root), bfsDepth(root); got != want {
			t.Fatalf("MaxDepth(%s) = %d, want %d", treeString(root), got, want)
		}
	}
}

// leafPathSums — суммы всех путей корень→лист.
func leafPathSums(root *TreeNode) []int {
	if root == nil {
		return nil
	}
	if root.Left == nil && root.Right == nil {
		return []int{root.Val}
	}
	var res []int
	for _, s := range append(leafPathSums(root.Left), leafPathSums(root.Right)...) {
		res = append(res, s+root.Val)
	}
	return res
}

func TestHasPathSumRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(1603))
	for range 3000 {
		root := randTree(rng, rng.Intn(20))
		sums := leafPathSums(root)
		set := map[int]bool{}
		for _, s := range sums {
			set[s] = true
		}
		// иногда берём реальную сумму пути, иногда произвольную
		var target int
		if len(sums) > 0 && rng.Intn(2) == 0 {
			target = sums[rng.Intn(len(sums))]
		} else {
			target = rng.Intn(40) - 20
		}
		if got, want := HasPathSum(root, target), set[target]; got != want {
			t.Fatalf("HasPathSum(%s, target=%d) = %v, want %v (sums=%v)", treeString(root), target, got, want, sums)
		}
	}
}

// bruteDiameter — диаметр (в рёбрах) как максимум попарных расстояний: строим
// неориентированный граф узлов и пускаем BFS из каждого.
func bruteDiameter(root *TreeNode) int {
	var nodes []*TreeNode
	idx := map[*TreeNode]int{}
	var collect func(n *TreeNode)
	collect = func(n *TreeNode) {
		if n == nil {
			return
		}
		idx[n] = len(nodes)
		nodes = append(nodes, n)
		collect(n.Left)
		collect(n.Right)
	}
	collect(root)
	m := len(nodes)
	if m == 0 {
		return 0
	}
	adj := make([][]int, m)
	for _, n := range nodes {
		for _, c := range []*TreeNode{n.Left, n.Right} {
			if c != nil {
				adj[idx[n]] = append(adj[idx[n]], idx[c])
				adj[idx[c]] = append(adj[idx[c]], idx[n])
			}
		}
	}
	best := 0
	for s := 0; s < m; s++ {
		dist := make([]int, m)
		for i := range dist {
			dist[i] = -1
		}
		dist[s] = 0
		q := []int{s}
		for len(q) > 0 {
			v := q[0]
			q = q[1:]
			for _, w := range adj[v] {
				if dist[w] == -1 {
					dist[w] = dist[v] + 1
					if dist[w] > best {
						best = dist[w]
					}
					q = append(q, w)
				}
			}
		}
	}
	return best
}

func TestDiameterOfTreeRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(1604))
	for range 3000 {
		root := randTree(rng, rng.Intn(25))
		if got, want := DiameterOfTree(root), bruteDiameter(root); got != want {
			t.Fatalf("DiameterOfTree(%s) = %d, want %d", treeString(root), got, want)
		}
	}
}
