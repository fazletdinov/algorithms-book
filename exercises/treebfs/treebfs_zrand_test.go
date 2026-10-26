package treebfs

import (
	"math"
	"math/rand"
	"testing"
)

func randTree(rng *rand.Rand, size int) *TreeNode {
	if size == 0 {
		return nil
	}
	left := rng.Intn(size)
	return &TreeNode{
		Val:   rng.Intn(40) - 20,
		Left:  randTree(rng, left),
		Right: randTree(rng, size-1-left),
	}
}

// levelsBrute — значения по уровням через DFS-рекурсию с глубиной (независимо от
// очереди эталона). Внутри уровня порядок слева направо: DFS обходит левое
// поддерево целиком раньше правого.
func levelsBrute(root *TreeNode) [][]int {
	res := [][]int{}
	var rec func(n *TreeNode, d int)
	rec = func(n *TreeNode, d int) {
		if n == nil {
			return
		}
		if d == len(res) {
			res = append(res, []int{})
		}
		res[d] = append(res[d], n.Val)
		rec(n.Left, d+1)
		rec(n.Right, d+1)
	}
	rec(root, 0)
	return res
}

func eqLevels(a, b [][]int) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if len(a[i]) != len(b[i]) {
			return false
		}
		for j := range a[i] {
			if a[i][j] != b[i][j] {
				return false
			}
		}
	}
	return true
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

func TestLevelOrderRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(2701))
	for range 4000 {
		root := randTree(rng, rng.Intn(20))
		if got := LevelOrder(root); !eqLevels(got, levelsBrute(root)) {
			t.Fatalf("LevelOrder(%s) = %v, want %v", treeString(root), got, levelsBrute(root))
		}
	}
}

func TestZigzagLevelOrderRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(2702))
	for range 4000 {
		root := randTree(rng, rng.Intn(20))
		want := levelsBrute(root)
		for i := range want {
			if i%2 == 1 {
				for l, r := 0, len(want[i])-1; l < r; l, r = l+1, r-1 {
					want[i][l], want[i][r] = want[i][r], want[i][l]
				}
			}
		}
		if got := ZigzagLevelOrder(root); !eqLevels(got, want) {
			t.Fatalf("ZigzagLevelOrder(%s) = %v, want %v", treeString(root), got, want)
		}
	}
}

func TestRightSideViewRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(2703))
	for range 4000 {
		root := randTree(rng, rng.Intn(20))
		levels := levelsBrute(root)
		want := make([]int, len(levels))
		for i, lv := range levels {
			want[i] = lv[len(lv)-1]
		}
		if got := RightSideView(root); !eqInts(got, want) {
			t.Fatalf("RightSideView(%s) = %v, want %v", treeString(root), got, want)
		}
	}
}

func TestLevelAveragesRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(2704))
	for range 4000 {
		root := randTree(rng, rng.Intn(20))
		levels := levelsBrute(root)
		got := LevelAverages(root)
		if len(got) != len(levels) {
			t.Fatalf("LevelAverages(%s): длина %d, want %d", treeString(root), len(got), len(levels))
		}
		for i, lv := range levels {
			sum := 0
			for _, v := range lv {
				sum += v
			}
			want := float64(sum) / float64(len(lv))
			if math.Abs(got[i]-want) > 1e-9 {
				t.Fatalf("LevelAverages(%s)[%d] = %v, want %v", treeString(root), i, got[i], want)
			}
		}
	}
}

func minDepthBrute(n *TreeNode) int {
	if n == nil {
		return 0
	}
	if n.Left == nil && n.Right == nil {
		return 1
	}
	if n.Left == nil {
		return 1 + minDepthBrute(n.Right)
	}
	if n.Right == nil {
		return 1 + minDepthBrute(n.Left)
	}
	l, r := minDepthBrute(n.Left), minDepthBrute(n.Right)
	if l < r {
		return 1 + l
	}
	return 1 + r
}

func TestMinDepthRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(2705))
	for range 4000 {
		root := randTree(rng, rng.Intn(25))
		if got, want := MinDepth(root), minDepthBrute(root); got != want {
			t.Fatalf("MinDepth(%s) = %d, want %d", treeString(root), got, want)
		}
	}
}

// widthBrute — ширина через DFS с номером места от корня: на деревьях до 25
// узлов номер меньше 2²⁵ и не переполняется. Для каждой глубины — крайние места.
func widthBrute(root *TreeNode) int {
	lo, hi := map[int]int{}, map[int]int{}
	var rec func(n *TreeNode, d, pos int)
	rec = func(n *TreeNode, d, pos int) {
		if n == nil {
			return
		}
		if v, ok := lo[d]; !ok || pos < v {
			lo[d] = pos
		}
		if v, ok := hi[d]; !ok || pos > v {
			hi[d] = pos
		}
		rec(n.Left, d+1, 2*pos+1)
		rec(n.Right, d+1, 2*pos+2)
	}
	rec(root, 0, 0)
	best := 0
	for d := range lo {
		best = max(best, hi[d]-lo[d]+1)
	}
	return best
}

func TestWidthOfBinaryTreeRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(662))
	for range 4000 {
		root := randTree(rng, rng.Intn(25))
		if got, want := WidthOfBinaryTree(root), widthBrute(root); got != want {
			t.Fatalf("WidthOfBinaryTree(%s) = %d, want %d", treeString(root), got, want)
		}
	}
}

// relabel даёт узлам различные значения 1..n в прямом порядке: в IsCousins
// значения уникальны по условию.
func relabel(root *TreeNode) int {
	next := 0
	var rec func(n *TreeNode)
	rec = func(n *TreeNode) {
		if n == nil {
			return
		}
		next++
		n.Val = next
		rec(n.Left)
		rec(n.Right)
	}
	rec(root)
	return next
}

func TestIsCousinsRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(993))
	for range 3000 {
		root := randTree(rng, rng.Intn(20))
		n := relabel(root)
		depth, parent := map[int]int{}, map[int]int{}
		var rec func(nd *TreeNode, d, p int)
		rec = func(nd *TreeNode, d, p int) {
			if nd == nil {
				return
			}
			depth[nd.Val], parent[nd.Val] = d, p
			rec(nd.Left, d+1, nd.Val)
			rec(nd.Right, d+1, nd.Val)
		}
		rec(root, 0, 0)
		// n+1 — значение, которого в дереве нет.
		for x := 1; x <= n+1; x++ {
			for y := 1; y <= n+1; y++ {
				if x == y {
					continue
				}
				dx, okx := depth[x]
				dy, oky := depth[y]
				want := okx && oky && dx == dy && parent[x] != parent[y]
				if got := IsCousins(root, x, y); got != want {
					t.Fatalf("IsCousins(%s, %d, %d) = %v, want %v", treeString(root), x, y, got, want)
				}
			}
		}
	}
}
