package treedfs

import (
	"reflect"
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
			if got := PreorderTraversal(tt.root); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("PreorderTraversal() = %v, ожидалось %v", got, tt.want)
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
			if got := InorderTraversal(tt.root); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("InorderTraversal() = %v, ожидалось %v", got, tt.want)
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
			if got := PostorderTraversal(tt.root); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("PostorderTraversal() = %v, ожидалось %v", got, tt.want)
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
				t.Errorf("MaxDepth() = %v, ожидалось %v", got, tt.want)
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
				t.Errorf("HasPathSum() = %v, ожидалось %v", got, tt.want)
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
				t.Errorf("DiameterOfTree() = %v, ожидалось %v", got, tt.want)
			}
		})
	}
}
