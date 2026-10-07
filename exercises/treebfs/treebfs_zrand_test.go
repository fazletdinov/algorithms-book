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
			t.Fatalf("LevelOrder = %v, want %v", got, levelsBrute(root))
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
			t.Fatalf("ZigzagLevelOrder = %v, want %v", got, want)
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
			t.Fatalf("RightSideView = %v, want %v", got, want)
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
			t.Fatalf("LevelAverages: длина %d, want %d", len(got), len(levels))
		}
		for i, lv := range levels {
			sum := 0
			for _, v := range lv {
				sum += v
			}
			want := float64(sum) / float64(len(lv))
			if math.Abs(got[i]-want) > 1e-9 {
				t.Fatalf("LevelAverages[%d] = %v, want %v", i, got[i], want)
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
			t.Fatalf("MinDepth = %d, want %d", got, want)
		}
	}
}
