package treedfs

import (
	"strconv"
	"testing"
)

// Дерево:    1
//
//	   / \
//	  2   3
//	 / \
//	4   5
func makeFull() *TreeNode {
	return &TreeNode{
		Val:   1,
		Left:  &TreeNode{Val: 2, Left: &TreeNode{Val: 4}, Right: &TreeNode{Val: 5}},
		Right: &TreeNode{Val: 3},
	}
}

func TestPreorderTraversal(t *testing.T) {
	tests := []struct {
		name string
		root *TreeNode
		want []int
	}{
		{"полное дерево", makeFull(), []int{1, 2, 4, 5, 3}},
		{"один узел", &TreeNode{Val: 42}, []int{42}},
		{"пустое дерево", nil, []int{}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := PreorderTraversal(tt.root); !eqInts(got, tt.want) {
				t.Errorf("PreorderTraversal(%s) = %v, ожидалось %v", treeString(tt.root), got, tt.want)
			}
		})
	}
}

func TestInorderTraversal(t *testing.T) {
	tests := []struct {
		name string
		root *TreeNode
		want []int
	}{
		{"полное дерево", makeFull(), []int{4, 2, 5, 1, 3}},
		{"один узел", &TreeNode{Val: 42}, []int{42}},
		{"пустое дерево", nil, []int{}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := InorderTraversal(tt.root); !eqInts(got, tt.want) {
				t.Errorf("InorderTraversal(%s) = %v, ожидалось %v", treeString(tt.root), got, tt.want)
			}
		})
	}
}

func TestPostorderTraversal(t *testing.T) {
	tests := []struct {
		name string
		root *TreeNode
		want []int
	}{
		{"полное дерево", makeFull(), []int{4, 5, 2, 3, 1}},
		{"один узел", &TreeNode{Val: 42}, []int{42}},
		{"пустое дерево", nil, []int{}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := PostorderTraversal(tt.root); !eqInts(got, tt.want) {
				t.Errorf("PostorderTraversal(%s) = %v, ожидалось %v", treeString(tt.root), got, tt.want)
			}
		})
	}
}

// Дерево для Path Sum:
//
//	      5
//	     / \
//	    4   8
//	   /   / \
//	  11  13  4
//	 /  \      \
//	7    2      1
func makePathSum() *TreeNode {
	return &TreeNode{
		Val: 5,
		Left: &TreeNode{
			Val:  4,
			Left: &TreeNode{Val: 11, Left: &TreeNode{Val: 7}, Right: &TreeNode{Val: 2}},
		},
		Right: &TreeNode{
			Val:   8,
			Left:  &TreeNode{Val: 13},
			Right: &TreeNode{Val: 4, Right: &TreeNode{Val: 1}},
		},
	}
}

func TestMaxDepth(t *testing.T) {
	tests := []struct {
		name string
		root *TreeNode
		want int
	}{
		{"полное дерево", makeFull(), 3},
		{"один узел", &TreeNode{Val: 42}, 1},
		{"пустое дерево", nil, 0},
		{"вырожденное в список", &TreeNode{Val: 1, Right: &TreeNode{Val: 2, Right: &TreeNode{Val: 3}}}, 3},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := MaxDepth(tt.root); got != tt.want {
				t.Errorf("MaxDepth(%s) = %v, ожидалось %v", treeString(tt.root), got, tt.want)
			}
		})
	}
}

func TestHasPathSum(t *testing.T) {
	tests := []struct {
		name   string
		root   *TreeNode
		target int
		want   bool
	}{
		{"путь существует", makePathSum(), 22, true},
		{"путь до другого листа", makePathSum(), 26, true},
		{"суммы нет", makePathSum(), 100, false},
		{"один узел совпадает", &TreeNode{Val: 7}, 7, true},
		{"один узел не совпадает", &TreeNode{Val: 7}, 0, false},
		{"пустое дерево", nil, 0, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := HasPathSum(tt.root, tt.target); got != tt.want {
				t.Errorf("HasPathSum(%s, %d) = %v, ожидалось %v", treeString(tt.root), tt.target, got, tt.want)
			}
		})
	}
}

func TestDiameterOfTree(t *testing.T) {
	tests := []struct {
		name string
		root *TreeNode
		want int
	}{
		{"полное дерево", makeFull(), 3},
		{"один узел", &TreeNode{Val: 42}, 0},
		{"пустое дерево", nil, 0},
		{"путь не через корень", &TreeNode{
			Val: 1,
			Left: &TreeNode{
				Val:   2,
				Left:  &TreeNode{Val: 4, Left: &TreeNode{Val: 6}},
				Right: &TreeNode{Val: 5, Right: &TreeNode{Val: 7}},
			},
			Right: &TreeNode{Val: 3},
		}, 4},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := DiameterOfTree(tt.root); got != tt.want {
				t.Errorf("DiameterOfTree(%s) = %v, ожидалось %v", treeString(tt.root), got, tt.want)
			}
		})
	}
}

// eqPaths сравнивает списки путей по порядку: nil и пустой срез равны.
func eqPaths(a, b [][]int) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if !eqInts(a[i], b[i]) {
			return false
		}
	}
	return true
}

func TestIsBalanced(t *testing.T) {
	// Корень сбалансирован (слева и справа высота 3), а узлы 2 и 5 — нет:
	// у каждого цепочка из двух узлов с одной стороны и пусто с другой.
	rootOnly := &TreeNode{
		Val:   1,
		Left:  &TreeNode{Val: 2, Left: &TreeNode{Val: 3, Left: &TreeNode{Val: 4}}},
		Right: &TreeNode{Val: 5, Right: &TreeNode{Val: 6, Right: &TreeNode{Val: 7}}},
	}
	// Разница высот ровно 1 в каждом узле — граница условия.
	fib := &TreeNode{
		Val: 1,
		Left: &TreeNode{
			Val:   2,
			Left:  &TreeNode{Val: 4, Left: &TreeNode{Val: 7}},
			Right: &TreeNode{Val: 5},
		},
		Right: &TreeNode{Val: 3, Left: &TreeNode{Val: 6}},
	}
	tests := []struct {
		name string
		root *TreeNode
		want bool
	}{
		{"полное дерево", makeFull(), true},
		{"пустое дерево", nil, true},
		{"один узел", &TreeNode{Val: 42}, true},
		{"два узла", &TreeNode{Val: 1, Left: &TreeNode{Val: 2}}, true},
		{"цепочка из трёх", &TreeNode{Val: 1, Left: &TreeNode{Val: 2, Left: &TreeNode{Val: 3}}}, false},
		{"корень в порядке, ниже — нет", rootOnly, false},
		{"разница ровно 1 в каждом узле", fib, true},
		{"дерево из условия Path Sum", makePathSum(), false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := IsBalanced(tt.root); got != tt.want {
				t.Errorf("IsBalanced(%s) = %v, ожидалось %v", treeString(tt.root), got, tt.want)
			}
		})
	}
}

func TestIsSymmetric(t *testing.T) {
	sym := func() *TreeNode {
		return &TreeNode{
			Val:   1,
			Left:  &TreeNode{Val: 2, Left: &TreeNode{Val: 3}, Right: &TreeNode{Val: 4}},
			Right: &TreeNode{Val: 2, Left: &TreeNode{Val: 4}, Right: &TreeNode{Val: 3}},
		}
	}
	// Поддеревья одинаковые, а не зеркальные.
	copies := &TreeNode{
		Val:   1,
		Left:  &TreeNode{Val: 2, Left: &TreeNode{Val: 3}, Right: &TreeNode{Val: 4}},
		Right: &TreeNode{Val: 2, Left: &TreeNode{Val: 3}, Right: &TreeNode{Val: 4}},
	}
	sameSide := &TreeNode{
		Val:   1,
		Left:  &TreeNode{Val: 2, Right: &TreeNode{Val: 3}},
		Right: &TreeNode{Val: 2, Right: &TreeNode{Val: 3}},
	}
	deepDiff := sym()
	deepDiff.Right.Right.Val = 9
	tests := []struct {
		name string
		root *TreeNode
		want bool
	}{
		{"зеркальное дерево", sym(), true},
		{"одинаковые, а не зеркальные поддеревья", copies, false},
		{"оба ребёнка справа", sameSide, false},
		{"значения различаются в глубине", deepDiff, false},
		{"дети корня разные", &TreeNode{Val: 1, Left: &TreeNode{Val: 2}, Right: &TreeNode{Val: 3}}, false},
		{"только один ребёнок", &TreeNode{Val: 1, Left: &TreeNode{Val: 2}}, false},
		{"один узел", &TreeNode{Val: 42}, true},
		{"пустое дерево", nil, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := IsSymmetric(tt.root); got != tt.want {
				t.Errorf("IsSymmetric(%s) = %v, ожидалось %v", treeString(tt.root), got, tt.want)
			}
		})
	}
}

func TestLowestCommonAncestor(t *testing.T) {
	// Дерево из условия:
	//
	//	      3
	//	     / \
	//	    5   1
	//	   / \ / \
	//	  6  2 0  8
	//	    / \
	//	   7   4
	n7, n4 := &TreeNode{Val: 7}, &TreeNode{Val: 4}
	n2 := &TreeNode{Val: 2, Left: n7, Right: n4}
	n6 := &TreeNode{Val: 6}
	n5 := &TreeNode{Val: 5, Left: n6, Right: n2}
	n0, n8 := &TreeNode{Val: 0}, &TreeNode{Val: 8}
	n1 := &TreeNode{Val: 1, Left: n0, Right: n8}
	n3 := &TreeNode{Val: 3, Left: n5, Right: n1}

	// Все значения одинаковые: узлы различаются только указателями.
	sameLeaf := &TreeNode{Val: 7}
	sameMid := &TreeNode{Val: 7, Left: sameLeaf}
	sameRoot := &TreeNode{Val: 7, Left: sameMid, Right: &TreeNode{Val: 7}}

	child := &TreeNode{Val: 2}
	pair := &TreeNode{Val: 1, Right: child}

	tests := []struct {
		name       string
		root, p, q *TreeNode
		want       *TreeNode
	}{
		{"по разные стороны от корня", n3, n5, n1, n3},
		{"p — предок q", n3, n5, n4, n5},
		{"q — предок p", n3, n4, n5, n5},
		{"братья в глубине", n3, n7, n4, n2},
		{"разные уровни в одном поддереве", n3, n6, n4, n5},
		{"листья в разных половинах", n3, n7, n8, n3},
		{"корень и его ребёнок", pair, pair, child, pair},
		{"одинаковые значения — сравнивай узлы", sameRoot, sameLeaf, sameMid, sameMid},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := LowestCommonAncestor(tt.root, tt.p, tt.q); got != tt.want {
				t.Errorf("LowestCommonAncestor(%s, p=%d, q=%d) = %s, ожидался узел %d",
					treeString(tt.root), tt.p.Val, tt.q.Val, nodeName(got), tt.want.Val)
			}
		})
	}
}

// nodeName печатает найденный узел для сообщения теста: nil — отдельно.
func nodeName(n *TreeNode) string {
	if n == nil {
		return "nil"
	}
	return "узел " + strconv.Itoa(n.Val)
}

func TestPathSumAll(t *testing.T) {
	// Дерево из условия:
	//
	//	      5
	//	     / \
	//	    4   8
	//	   /   / \
	//	  11  13  4
	//	 /  \    / \
	//	7    2  5   1
	example := func() *TreeNode {
		return &TreeNode{
			Val:  5,
			Left: &TreeNode{Val: 4, Left: &TreeNode{Val: 11, Left: &TreeNode{Val: 7}, Right: &TreeNode{Val: 2}}},
			Right: &TreeNode{
				Val:   8,
				Left:  &TreeNode{Val: 13},
				Right: &TreeNode{Val: 4, Left: &TreeNode{Val: 5}, Right: &TreeNode{Val: 1}},
			},
		}
	}
	negatives := &TreeNode{
		Val:   1,
		Left:  &TreeNode{Val: -2, Left: &TreeNode{Val: 1, Left: &TreeNode{Val: -1}}, Right: &TreeNode{Val: 3}},
		Right: &TreeNode{Val: -3, Left: &TreeNode{Val: -2}},
	}
	zeros := &TreeNode{Val: 0, Left: &TreeNode{Val: 0}, Right: &TreeNode{Val: 0}}
	tests := []struct {
		name   string
		root   *TreeNode
		target int
		want   [][]int
	}{
		{"два пути с общим началом", example(), 22, [][]int{{5, 4, 11, 2}, {5, 8, 4, 5}}},
		{"один путь", example(), 26, [][]int{{5, 8, 13}}},
		{"путей нет", example(), 100, [][]int{}},
		{"отрицательные значения", negatives, -1, [][]int{{1, -2, 1, -1}}},
		{"одинаковые пути из нулей", zeros, 0, [][]int{{0, 0}, {0, 0}}},
		{"сумма сошлась не в листе", &TreeNode{Val: 1, Left: &TreeNode{Val: 2, Left: &TreeNode{Val: 3}}}, 3, [][]int{}},
		{"один узел", &TreeNode{Val: 7}, 7, [][]int{{7}}},
		{"пустое дерево", nil, 0, [][]int{}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := PathSumAll(tt.root, tt.target)
			if !eqPaths(got, tt.want) {
				t.Errorf("PathSumAll(%s, %d) = %v, ожидалось %v", treeString(tt.root), tt.target, got, tt.want)
			}
		})
	}
}

func TestBuildTree(t *testing.T) {
	// Пример из условия: 3(9, 20(15, 7)).
	example := &TreeNode{
		Val:   3,
		Left:  &TreeNode{Val: 9},
		Right: &TreeNode{Val: 20, Left: &TreeNode{Val: 15}, Right: &TreeNode{Val: 7}},
	}
	leftChain := &TreeNode{Val: 1, Left: &TreeNode{Val: 2, Left: &TreeNode{Val: 3}}}
	rightChain := &TreeNode{Val: 1, Right: &TreeNode{Val: 2, Right: &TreeNode{Val: 3}}}
	// Зигзаг: 1 -> левый 2 -> правый 3 -> левый 4. Корень то в конце своего
	// куска inorder, то в начале.
	zigzag := &TreeNode{Val: 1, Left: &TreeNode{Val: 2, Right: &TreeNode{Val: 3, Left: &TreeNode{Val: 4}}}}
	negatives := &TreeNode{Val: -1, Left: &TreeNode{Val: -5}, Right: &TreeNode{Val: 0, Right: &TreeNode{Val: 8}}}
	tests := []struct {
		name              string
		preorder, inorder []int
		want              *TreeNode
	}{
		{"пример из условия", []int{3, 9, 20, 15, 7}, []int{9, 3, 15, 20, 7}, example},
		{"полное дерево", []int{1, 2, 4, 5, 3}, []int{4, 2, 5, 1, 3}, makeFull()},
		{"цепочка влево", []int{1, 2, 3}, []int{3, 2, 1}, leftChain},
		{"цепочка вправо", []int{1, 2, 3}, []int{1, 2, 3}, rightChain},
		{"зигзаг", []int{1, 2, 3, 4}, []int{2, 4, 3, 1}, zigzag},
		{"отрицательные значения", []int{-1, -5, 0, 8}, []int{-5, -1, 0, 8}, negatives},
		{"один узел", []int{42}, []int{42}, &TreeNode{Val: 42}},
		{"пустые обходы", []int{}, []int{}, nil},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := BuildTree(tt.preorder, tt.inorder)
			if g, w := treeString(got), treeString(tt.want); g != w {
				t.Errorf("BuildTree(%v, %v) = %s, ожидалось %s", tt.preorder, tt.inorder, g, w)
			}
		})
	}
}

func TestIsSubtree(t *testing.T) {
	// root из условия: 3(4(1, 2), 5).
	example := func() *TreeNode {
		return &TreeNode{
			Val:   3,
			Left:  &TreeNode{Val: 4, Left: &TreeNode{Val: 1}, Right: &TreeNode{Val: 2}},
			Right: &TreeNode{Val: 5},
		}
	}
	sub := func() *TreeNode { return &TreeNode{Val: 4, Left: &TreeNode{Val: 1}, Right: &TreeNode{Val: 2}} }
	// У узла 2 появился ребёнок: под 4 уже не то же, что в sub.
	deeper := example()
	deeper.Left.Right.Left = &TreeNode{Val: 0}
	// Слева почти совпадение (лишний узел 0), справа — точная копия sub.
	secondTry := example()
	secondTry.Left.Right.Left = &TreeNode{Val: 0}
	secondTry.Right.Left = sub()
	tests := []struct {
		name      string
		root, sub *TreeNode
		want      bool
	}{
		{"пример из условия", example(), sub(), true},
		{"внизу лишний узел", deeper, sub(), false},
		{"совпадение только во второй попытке", secondTry, sub(), true},
		{"sub — всё дерево", example(), example(), true},
		{"sub — лист", example(), &TreeNode{Val: 5}, true},
		{"верх совпал, низ нет", &TreeNode{Val: 1, Left: &TreeNode{Val: 2}, Right: &TreeNode{Val: 3}},
			&TreeNode{Val: 1, Left: &TreeNode{Val: 2}}, false},
		{"те же значения, другая сторона", &TreeNode{Val: 1, Left: &TreeNode{Val: 1}},
			&TreeNode{Val: 1, Right: &TreeNode{Val: 1}}, false},
		{"значения нет в дереве", example(), &TreeNode{Val: 7}, false},
		{"пустое sub", example(), nil, true},
		{"пустое root", nil, &TreeNode{Val: 1}, false},
		{"оба пустые", nil, nil, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := IsSubtree(tt.root, tt.sub); got != tt.want {
				t.Errorf("IsSubtree(%s, %s) = %v, ожидалось %v",
					treeString(tt.root), treeString(tt.sub), got, tt.want)
			}
		})
	}
}

func TestCountPathsWithSum(t *testing.T) {
	// Дерево из условия: 10(5(3(3, -2), 2(_, 1)), -3(_, 11)).
	example := &TreeNode{
		Val: 10,
		Left: &TreeNode{
			Val:   5,
			Left:  &TreeNode{Val: 3, Left: &TreeNode{Val: 3}, Right: &TreeNode{Val: -2}},
			Right: &TreeNode{Val: 2, Right: &TreeNode{Val: 1}},
		},
		Right: &TreeNode{Val: -3, Right: &TreeNode{Val: 11}},
	}
	negatives := &TreeNode{
		Val:   1,
		Left:  &TreeNode{Val: -2, Left: &TreeNode{Val: 1, Left: &TreeNode{Val: -1}}, Right: &TreeNode{Val: 3}},
		Right: &TreeNode{Val: -3, Left: &TreeNode{Val: -2}},
	}
	zeros := &TreeNode{Val: 0, Left: &TreeNode{Val: 0, Left: &TreeNode{Val: 0}}}
	// Соседняя ветвь — не префикс: сумма до узла 2 равна 3, и у узла 3
	// (сумма 4) без отката нашёлся бы «путь» 2 -> 3, которого в дереве нет.
	siblings := &TreeNode{Val: 1, Left: &TreeNode{Val: 2}, Right: &TreeNode{Val: 3}}
	big := &TreeNode{Val: 1e9, Left: &TreeNode{Val: 1e9, Left: &TreeNode{Val: 1e9}}}
	tests := []struct {
		name   string
		root   *TreeNode
		target int
		want   int
	}{
		{"пример из условия", example, 8, 3},
		{"путь из одного узла посередине", example, 2, 1},
		{"отрицательные значения", negatives, -1, 4},
		{"цепочка нулей: все её куски", zeros, 0, 6},
		{"сосед не продолжает путь", siblings, 1, 1},
		{"большие значения", big, 2e9, 2},
		{"один узел, совпал", &TreeNode{Val: 7}, 7, 1},
		{"один узел, не совпал", &TreeNode{Val: 7}, 3, 0},
		{"пустое дерево", nil, 0, 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := CountPathsWithSum(tt.root, tt.target); got != tt.want {
				t.Errorf("CountPathsWithSum(%s, %d) = %d, ожидалось %d", treeString(tt.root), tt.target, got, tt.want)
			}
		})
	}
}
