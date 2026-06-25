//go:build solution

package serializetree

import (
	"strconv"
	"strings"
)

func Serialize(root *TreeNode) string {
	var sb strings.Builder
	var dfs func(*TreeNode)
	dfs = func(n *TreeNode) {
		if n == nil {
			sb.WriteString("# ")
			return
		}
		sb.WriteString(strconv.Itoa(n.Val))
		sb.WriteByte(' ')
		dfs(n.Left)
		dfs(n.Right)
	}
	dfs(root)
	return sb.String()
}

func Deserialize(data string) *TreeNode {
	tokens := strings.Fields(data)
	i := 0
	var build func() *TreeNode
	build = func() *TreeNode {
		if i >= len(tokens) {
			return nil
		}
		tok := tokens[i]
		i++
		if tok == "#" {
			return nil
		}
		val, _ := strconv.Atoi(tok)
		n := &TreeNode{Val: val}
		n.Left = build()
		n.Right = build()
		return n
	}
	return build()
}
