package treebfs

import "testing"

// eqFloats сравнивает по длине и элементам: nil и пустой срез равны, задача не про это.
func eqFloats(a, b []float64) bool {
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

func TestLevelOrder(t *testing.T) {
	// Дерево:    1
	//           / \
	//          2   3
	//         / \
	//        4   5
	full := &TreeNode{
		Val:   1,
		Left:  &TreeNode{Val: 2, Left: &TreeNode{Val: 4}, Right: &TreeNode{Val: 5}},
		Right: &TreeNode{Val: 3},
	}

	tests := []struct {
		name string
		root *TreeNode
		want [][]int
	}{
		{"полное дерево", full, [][]int{{1}, {2, 3}, {4, 5}}},
		{"один узел", &TreeNode{Val: 42}, [][]int{{42}}},
		{"пустое дерево", nil, [][]int{}},
		{"вырожденное вправо",
			&TreeNode{Val: 1, Right: &TreeNode{Val: 2, Right: &TreeNode{Val: 3}}},
			[][]int{{1}, {2}, {3}}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := LevelOrder(tt.root); !eqLevels(got, tt.want) {
				t.Errorf("LevelOrder(%s) = %v, ожидалось %v", treeString(tt.root), got, tt.want)
			}
		})
	}
}

// full — дерево, общее для тестов ниже:
//
//	    1
//	   / \
//	  2   3
//	 / \
//	4   5
func newFull() *TreeNode {
	return &TreeNode{
		Val:   1,
		Left:  &TreeNode{Val: 2, Left: &TreeNode{Val: 4}, Right: &TreeNode{Val: 5}},
		Right: &TreeNode{Val: 3},
	}
}

func TestZigzagLevelOrder(t *testing.T) {
	tests := []struct {
		name string
		root *TreeNode
		want [][]int
	}{
		{"полное дерево", newFull(), [][]int{{1}, {3, 2}, {4, 5}}},
		{"один узел", &TreeNode{Val: 42}, [][]int{{42}}},
		{"пустое дерево", nil, [][]int{}},
		{"вырожденное вправо",
			&TreeNode{Val: 1, Right: &TreeNode{Val: 2, Right: &TreeNode{Val: 3}}},
			[][]int{{1}, {2}, {3}}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := ZigzagLevelOrder(tt.root); !eqLevels(got, tt.want) {
				t.Errorf("ZigzagLevelOrder(%s) = %v, ожидалось %v", treeString(tt.root), got, tt.want)
			}
		})
	}
}

func TestRightSideView(t *testing.T) {
	tests := []struct {
		name string
		root *TreeNode
		want []int
	}{
		{"полное дерево", newFull(), []int{1, 3, 5}},
		{"один узел", &TreeNode{Val: 42}, []int{42}},
		{"пустое дерево", nil, []int{}},
		{"вырожденное влево",
			&TreeNode{Val: 1, Left: &TreeNode{Val: 2, Left: &TreeNode{Val: 3}}},
			[]int{1, 2, 3}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := RightSideView(tt.root); !eqInts(got, tt.want) {
				t.Errorf("RightSideView(%s) = %v, ожидалось %v", treeString(tt.root), got, tt.want)
			}
		})
	}
}

func TestLevelAverages(t *testing.T) {
	tests := []struct {
		name string
		root *TreeNode
		want []float64
	}{
		{"полное дерево", newFull(), []float64{1, 2.5, 4.5}},
		{"один узел", &TreeNode{Val: 42}, []float64{42}},
		{"пустое дерево", nil, []float64{}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := LevelAverages(tt.root); !eqFloats(got, tt.want) {
				t.Errorf("LevelAverages(%s) = %v, ожидалось %v", treeString(tt.root), got, tt.want)
			}
		})
	}
}

func TestMinDepth(t *testing.T) {
	tests := []struct {
		name string
		root *TreeNode
		want int
	}{
		{"полное дерево", newFull(), 2},
		{"один узел", &TreeNode{Val: 42}, 1},
		{"пустое дерево", nil, 0},
		{"вырожденное вправо",
			&TreeNode{Val: 1, Right: &TreeNode{Val: 2, Right: &TreeNode{Val: 3}}},
			3},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := MinDepth(tt.root); got != tt.want {
				t.Errorf("MinDepth(%s) = %v, ожидалось %v", treeString(tt.root), got, tt.want)
			}
		})
	}
}
