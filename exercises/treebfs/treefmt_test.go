package treebfs

import (
	"strconv"
	"strings"
	"testing"
)

// treeString печатает дерево по уровням, как в условиях LeetCode: [1,2,3,null,4].
// Нужна сообщениям тестов: «MaxDepth = 3, want 4» без самого дерева не воспроизвести.
func treeString(root *TreeNode) string {
	var parts []string
	queue := []*TreeNode{root}
	for len(queue) > 0 {
		n := queue[0]
		queue = queue[1:]
		if n == nil {
			parts = append(parts, "null")
			continue
		}
		parts = append(parts, strconv.Itoa(n.Val))
		queue = append(queue, n.Left, n.Right)
	}
	for len(parts) > 0 && parts[len(parts)-1] == "null" {
		parts = parts[:len(parts)-1]
	}
	return "[" + strings.Join(parts, ",") + "]"
}

func TestTreeString(t *testing.T) {
	gap := &TreeNode{Val: 1, Right: &TreeNode{Val: 2, Left: &TreeNode{Val: 3}}}
	for want, root := range map[string]*TreeNode{"[]": nil, "[7]": {Val: 7}, "[1,null,2,3]": gap} {
		if got := treeString(root); got != want {
			t.Errorf("treeString = %s, ожидалось %s", got, want)
		}
	}
}
