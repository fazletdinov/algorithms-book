//go:build solution

package treebfs

func LevelOrder(root *TreeNode) [][]int {
	result := make([][]int, 0)
	if root == nil {
		return result
	}
	queue := []*TreeNode{root}
	for len(queue) > 0 {
		n := len(queue)
		level := make([]int, 0, n)
		for i := 0; i < n; i++ {
			node := queue[0]
			queue = queue[1:]
			level = append(level, node.Val)
			if node.Left != nil {
				queue = append(queue, node.Left)
			}
			if node.Right != nil {
				queue = append(queue, node.Right)
			}
		}
		result = append(result, level)
	}
	return result
}

func ZigzagLevelOrder(root *TreeNode) [][]int {
	result := make([][]int, 0)
	if root == nil {
		return result
	}
	queue := []*TreeNode{root}
	leftToRight := true
	for len(queue) > 0 {
		n := len(queue)
		level := make([]int, n)
		for i := 0; i < n; i++ {
			node := queue[0]
			queue = queue[1:]
			if leftToRight {
				level[i] = node.Val
			} else {
				level[n-1-i] = node.Val
			}
			if node.Left != nil {
				queue = append(queue, node.Left)
			}
			if node.Right != nil {
				queue = append(queue, node.Right)
			}
		}
		result = append(result, level)
		leftToRight = !leftToRight
	}
	return result
}

func RightSideView(root *TreeNode) []int {
	result := make([]int, 0)
	if root == nil {
		return result
	}
	queue := []*TreeNode{root}
	for len(queue) > 0 {
		n := len(queue)
		for i := 0; i < n; i++ {
			node := queue[0]
			queue = queue[1:]
			if i == n-1 {
				result = append(result, node.Val)
			}
			if node.Left != nil {
				queue = append(queue, node.Left)
			}
			if node.Right != nil {
				queue = append(queue, node.Right)
			}
		}
	}
	return result
}

func LevelAverages(root *TreeNode) []float64 {
	result := make([]float64, 0)
	if root == nil {
		return result
	}
	queue := []*TreeNode{root}
	for len(queue) > 0 {
		n := len(queue)
		sum := 0
		for i := 0; i < n; i++ {
			node := queue[0]
			queue = queue[1:]
			sum += node.Val
			if node.Left != nil {
				queue = append(queue, node.Left)
			}
			if node.Right != nil {
				queue = append(queue, node.Right)
			}
		}
		result = append(result, float64(sum)/float64(n))
	}
	return result
}

func MinDepth(root *TreeNode) int {
	if root == nil {
		return 0
	}
	queue := []*TreeNode{root}
	depth := 0
	for len(queue) > 0 {
		depth++
		n := len(queue)
		for i := 0; i < n; i++ {
			node := queue[0]
			queue = queue[1:]
			if node.Left == nil && node.Right == nil {
				return depth
			}
			if node.Left != nil {
				queue = append(queue, node.Left)
			}
			if node.Right != nil {
				queue = append(queue, node.Right)
			}
		}
	}
	return depth
}

func WidthOfBinaryTree(root *TreeNode) int {
	if root == nil {
		return 0
	}
	type item struct {
		node *TreeNode
		pos  int
	}
	queue := []item{{root, 0}}
	best := 0
	for len(queue) > 0 {
		n := len(queue)
		// Номер места считаем от первого узла уровня: так он не больше
		// 2·(число мест на уровне) и не переполняется на цепочке.
		first := queue[0].pos
		last := queue[n-1].pos
		if w := last - first + 1; w > best {
			best = w
		}
		for i := 0; i < n; i++ {
			it := queue[0]
			queue = queue[1:]
			p := it.pos - first
			if it.node.Left != nil {
				queue = append(queue, item{it.node.Left, 2*p + 1})
			}
			if it.node.Right != nil {
				queue = append(queue, item{it.node.Right, 2*p + 2})
			}
		}
	}
	return best
}

func IsCousins(root *TreeNode, x, y int) bool {
	if root == nil {
		return false
	}
	type item struct {
		node, parent *TreeNode
	}
	queue := []item{{root, nil}}
	for len(queue) > 0 {
		n := len(queue)
		var px, py *TreeNode
		foundX, foundY := false, false
		for i := 0; i < n; i++ {
			it := queue[0]
			queue = queue[1:]
			switch it.node.Val {
			case x:
				foundX, px = true, it.parent
			case y:
				foundY, py = true, it.parent
			}
			if it.node.Left != nil {
				queue = append(queue, item{it.node.Left, it.node})
			}
			if it.node.Right != nil {
				queue = append(queue, item{it.node.Right, it.node})
			}
		}
		if foundX || foundY {
			return foundX && foundY && px != py
		}
	}
	return false
}
