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

// heightBrute — высота поддерева заново, без запоминания.
func heightBrute(n *TreeNode) int {
	if n == nil {
		return 0
	}
	return 1 + max(heightBrute(n.Left), heightBrute(n.Right))
}

// balancedBrute — определение дословно: разница высот в каждом узле.
func balancedBrute(n *TreeNode) bool {
	if n == nil {
		return true
	}
	d := heightBrute(n.Left) - heightBrute(n.Right)
	return d >= -1 && d <= 1 && balancedBrute(n.Left) && balancedBrute(n.Right)
}

func TestIsBalancedRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(110))
	for range 4000 {
		root := randTree(rng, rng.Intn(20))
		if got, want := IsBalanced(root), balancedBrute(root); got != want {
			t.Fatalf("IsBalanced(%s) = %v, want %v", treeString(root), got, want)
		}
	}
}

// mirrorCopy — зеркальная копия дерева.
func mirrorCopy(n *TreeNode) *TreeNode {
	if n == nil {
		return nil
	}
	return &TreeNode{Val: n.Val, Left: mirrorCopy(n.Right), Right: mirrorCopy(n.Left)}
}

// symmetricBrute — дерево симметрично, если совпадает со своей зеркальной копией.
func symmetricBrute(root *TreeNode) bool {
	return treeString(root) == treeString(mirrorCopy(root))
}

func TestIsSymmetricRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(101))
	for range 4000 {
		// Половина деревьев — симметричные по построению, иногда с порчей одного
		// узла: случайное дерево почти никогда не бывает симметричным.
		var root *TreeNode
		if rng.Intn(2) == 0 {
			root = randTree(rng, rng.Intn(15))
		} else {
			half := randTree(rng, rng.Intn(10))
			root = &TreeNode{Val: rng.Intn(5), Left: half, Right: mirrorCopy(half)}
			if half != nil && rng.Intn(3) == 0 {
				root.Right.Val++
			}
		}
		if got, want := IsSymmetric(root), symmetricBrute(root); got != want {
			t.Fatalf("IsSymmetric(%s) = %v, want %v", treeString(root), got, want)
		}
	}
}

func TestLowestCommonAncestorRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(236))
	for range 2000 {
		root := randTree(rng, 2+rng.Intn(20))
		var nodes []*TreeNode
		parent := map[*TreeNode]*TreeNode{}
		var rec func(n, par *TreeNode)
		rec = func(n, par *TreeNode) {
			if n == nil {
				return
			}
			nodes = append(nodes, n)
			parent[n] = par
			rec(n.Left, n)
			rec(n.Right, n)
		}
		rec(root, nil)
		for range 5 {
			p := nodes[rng.Intn(len(nodes))]
			q := nodes[rng.Intn(len(nodes))]
			if p == q {
				continue
			}
			// Предки p (вместе с ним), затем первый из предков q в этом множестве.
			anc := map[*TreeNode]bool{}
			for a := p; a != nil; a = parent[a] {
				anc[a] = true
			}
			want := q
			for !anc[want] {
				want = parent[want]
			}
			if got := LowestCommonAncestor(root, p, q); got != want {
				t.Fatalf("LowestCommonAncestor(%s, p=%d, q=%d) = %s, ожидался узел %d",
					treeString(root), p.Val, q.Val, nodeName(got), want.Val)
			}
		}
	}
}

// pathsBrute — все пути корень→лист с суммой target, каждый путь собран заново.
func pathsBrute(n *TreeNode, target int) [][]int {
	if n == nil {
		return nil
	}
	if n.Left == nil && n.Right == nil {
		if n.Val == target {
			return [][]int{{n.Val}}
		}
		return nil
	}
	var res [][]int
	for _, sub := range append(pathsBrute(n.Left, target-n.Val), pathsBrute(n.Right, target-n.Val)...) {
		res = append(res, append([]int{n.Val}, sub...))
	}
	return res
}

func TestPathSumAllRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(113))
	for range 3000 {
		root := randTree(rng, rng.Intn(20))
		sums := leafPathSums(root)
		target := rng.Intn(40) - 20
		if len(sums) > 0 && rng.Intn(3) > 0 {
			target = sums[rng.Intn(len(sums))]
		}
		if got, want := PathSumAll(root, target), pathsBrute(root, target); !eqPaths(got, want) {
			t.Fatalf("PathSumAll(%s, %d) = %v, want %v", treeString(root), target, got, want)
		}
	}
}

// distinctTree — случайное дерево той же формы, что randTree, но с различными
// значениями (случайная перестановка, в том числе отрицательных).
func distinctTree(rng *rand.Rand, size int) *TreeNode {
	root := randTree(rng, size)
	vals := rng.Perm(size)
	i := 0
	var rec func(n *TreeNode)
	rec = func(n *TreeNode) {
		if n == nil {
			return
		}
		n.Val = vals[i] - size/2
		i++
		rec(n.Left)
		rec(n.Right)
	}
	rec(root)
	return root
}

func TestBuildTreeRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(105))
	for range 3000 {
		want := distinctTree(rng, rng.Intn(25))
		pre, in := iterPre(want), iterIn(want)
		if got := BuildTree(pre, in); treeString(got) != treeString(want) {
			t.Fatalf("BuildTree(%v, %v) = %s, want %s", pre, in, treeString(got), treeString(want))
		}
	}
}

// copyTree — независимая копия дерева.
func copyTree(n *TreeNode) *TreeNode {
	if n == nil {
		return nil
	}
	return &TreeNode{Val: n.Val, Left: copyTree(n.Left), Right: copyTree(n.Right)}
}

// subtreeBrute — sub есть в root, если запись sub по уровням совпала с записью
// поддерева какого-нибудь узла root.
func subtreeBrute(root, sub *TreeNode) bool {
	if sub == nil {
		return true
	}
	want := treeString(sub)
	found := false
	var rec func(n *TreeNode)
	rec = func(n *TreeNode) {
		if n == nil || found {
			return
		}
		found = treeString(n) == want
		rec(n.Left)
		rec(n.Right)
	}
	rec(root)
	return found
}

func TestIsSubtreeRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(572))
	for range 4000 {
		root := randTree(rng, rng.Intn(20))
		for _, n := range allNodes(root) {
			n.Val = rng.Intn(3) // мало значений — много почти-совпадений
		}
		var sub *TreeNode
		if nodes := allNodes(root); len(nodes) > 0 && rng.Intn(4) > 0 {
			// Копия настоящего поддерева, иногда с порчей: значение или лишний лист.
			sub = copyTree(nodes[rng.Intn(len(nodes))])
			switch rng.Intn(3) {
			case 0:
				sub.Val++
			case 1:
				leaf := sub
				for leaf.Left != nil {
					leaf = leaf.Left
				}
				leaf.Left = &TreeNode{Val: rng.Intn(3)}
			}
		} else {
			sub = randTree(rng, rng.Intn(4))
			for _, n := range allNodes(sub) {
				n.Val = rng.Intn(3)
			}
		}
		if got, want := IsSubtree(root, sub), subtreeBrute(root, sub); got != want {
			t.Fatalf("IsSubtree(%s, %s) = %v, want %v", treeString(root), treeString(sub), got, want)
		}
	}
}

// allNodes — все узлы дерева в прямом порядке.
func allNodes(n *TreeNode) []*TreeNode {
	if n == nil {
		return nil
	}
	return append(append([]*TreeNode{n}, allNodes(n.Left)...), allNodes(n.Right)...)
}

// downSums — число путей вниз с суммой target, начиная ровно в узле n.
func downSums(n *TreeNode, target int) int {
	if n == nil {
		return 0
	}
	c := 0
	if n.Val == target {
		c = 1
	}
	return c + downSums(n.Left, target-n.Val) + downSums(n.Right, target-n.Val)
}

func TestCountPathsWithSumRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(437))
	for range 4000 {
		root := randTree(rng, rng.Intn(25))
		target := rng.Intn(21) - 10
		want := 0
		for _, n := range allNodes(root) {
			want += downSums(n, target)
		}
		if got := CountPathsWithSum(root, target); got != want {
			t.Fatalf("CountPathsWithSum(%s, %d) = %d, want %d", treeString(root), target, got, want)
		}
	}
}
