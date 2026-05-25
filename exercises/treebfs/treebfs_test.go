package treebfs

import (
	"reflect"
	"testing"
)

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
			if got := LevelOrder(tt.root); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("LevelOrder() = %v, ожидалось %v", got, tt.want)
			}
		})
	}
}
