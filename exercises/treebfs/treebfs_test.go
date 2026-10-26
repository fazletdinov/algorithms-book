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

// chainLeft — цепочка из n узлов влево со значениями 0..n-1; возвращает корень и низ.
func chainLeft(n int) (root, bottom *TreeNode) {
	root = &TreeNode{Val: 0}
	bottom = root
	for i := 1; i < n; i++ {
		bottom.Left = &TreeNode{Val: i}
		bottom = bottom.Left
	}
	return root, bottom
}

func TestWidthOfBinaryTree(t *testing.T) {
	// Пример условия: 1,3,2,5,3,null,9 — на нижнем уровне места 3..6, место 5 пустое.
	example := &TreeNode{
		Val:   1,
		Left:  &TreeNode{Val: 3, Left: &TreeNode{Val: 5}, Right: &TreeNode{Val: 3}},
		Right: &TreeNode{Val: 2, Right: &TreeNode{Val: 9}},
	}
	// Крайние узлы уровня далеко друг от друга, между ними пусто: места 3 и 6.
	gaps := &TreeNode{
		Val:   1,
		Left:  &TreeNode{Val: 2, Left: &TreeNode{Val: 4}},
		Right: &TreeNode{Val: 3, Right: &TreeNode{Val: 7}},
	}
	// «Галочка»: две цепочки расходятся от корня, на глубине 3 — места 7 и 14.
	vee := &TreeNode{
		Val:   1,
		Left:  &TreeNode{Val: 2, Left: &TreeNode{Val: 4, Left: &TreeNode{Val: 8}}},
		Right: &TreeNode{Val: 3, Right: &TreeNode{Val: 7, Right: &TreeNode{Val: 15}}},
	}
	// Глубокая цепочка, внизу два листа: номер места от корня здесь давно
	// переполнил бы int, а ширина нижнего уровня всё равно 2.
	deep, bottom := chainLeft(200)
	bottom.Left = &TreeNode{Val: -1}
	bottom.Right = &TreeNode{Val: -2}

	tests := []struct {
		name string
		root *TreeNode
		want int
	}{
		{"пример условия", example, 4},
		{"пустые места между крайними", gaps, 4},
		{"галочка", vee, 8},
		{"полное дерево", newFull(), 2},
		{"один узел", &TreeNode{Val: 42}, 1},
		{"пустое дерево", nil, 0},
		{"глубокая цепочка с двумя листами внизу", deep, 2},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := WidthOfBinaryTree(tt.root); got != tt.want {
				t.Errorf("WidthOfBinaryTree(%s) = %v, ожидалось %v", treeString(tt.root), got, tt.want)
			}
		})
	}
}

func TestIsCousins(t *testing.T) {
	// Дерево:    1
	//           / \
	//          2   3
	//         / \   \
	//        4   5   6
	tree := func() *TreeNode {
		return &TreeNode{
			Val:   1,
			Left:  &TreeNode{Val: 2, Left: &TreeNode{Val: 4}, Right: &TreeNode{Val: 5}},
			Right: &TreeNode{Val: 3, Right: &TreeNode{Val: 6}},
		}
	}
	tests := []struct {
		name string
		root *TreeNode
		x, y int
		want bool
	}{
		{"двоюродные", tree(), 4, 6, true},
		{"двоюродные в другом порядке", tree(), 6, 5, true},
		{"братья: общий родитель", tree(), 4, 5, false},
		{"разная глубина", tree(), 2, 4, false},
		{"дети корня — братья", tree(), 2, 3, false},
		{"корень и узел", tree(), 1, 6, false},
		{"одного значения нет", tree(), 4, 9, false},
		{"обоих значений нет", tree(), 8, 9, false},
		{"пустое дерево", nil, 1, 2, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := IsCousins(tt.root, tt.x, tt.y); got != tt.want {
				t.Errorf("IsCousins(%s, %d, %d) = %v, ожидалось %v", treeString(tt.root), tt.x, tt.y, got, tt.want)
			}
		})
	}
}
