//go:build solution

package treedfs

func PreorderTraversal(root *TreeNode) []int {
	result := make([]int, 0)
	var dfs func(node *TreeNode)
	dfs = func(node *TreeNode) {
		if node == nil {
			return
		}
		result = append(result, node.Val)
		dfs(node.Left)
		dfs(node.Right)
	}
	dfs(root)
	return result
}

func InorderTraversal(root *TreeNode) []int {
	result := make([]int, 0)
	var dfs func(node *TreeNode)
	dfs = func(node *TreeNode) {
		if node == nil {
			return
		}
		dfs(node.Left)
		result = append(result, node.Val)
		dfs(node.Right)
	}
	dfs(root)
	return result
}

func PostorderTraversal(root *TreeNode) []int {
	result := make([]int, 0)
	var dfs func(node *TreeNode)
	dfs = func(node *TreeNode) {
		if node == nil {
			return
		}
		dfs(node.Left)
		dfs(node.Right)
		result = append(result, node.Val)
	}
	dfs(root)
	return result
}

func MaxDepth(root *TreeNode) int {
	if root == nil {
		return 0
	}
	left := MaxDepth(root.Left)
	right := MaxDepth(root.Right)
	if left > right {
		return left + 1
	}
	return right + 1
}

func HasPathSum(root *TreeNode, target int) bool {
	if root == nil {
		return false
	}
	if root.Left == nil && root.Right == nil {
		return target == root.Val
	}
	rest := target - root.Val
	return HasPathSum(root.Left, rest) || HasPathSum(root.Right, rest)
}

func DiameterOfTree(root *TreeNode) int {
	diameter := 0
	var height func(node *TreeNode) int
	height = func(node *TreeNode) int {
		if node == nil {
			return 0
		}
		left := height(node.Left)
		right := height(node.Right)
		if left+right > diameter {
			diameter = left + right
		}
		if left > right {
			return left + 1
		}
		return right + 1
	}
	height(root)
	return diameter
}

func IsBalanced(root *TreeNode) bool {
	// height возвращает высоту поддерева или −1, если в нём есть
	// несбалансированный узел: высота не бывает отрицательной, и −1 — сигнал
	// «ответ уже известен», который поднимается до корня без лишних подсчётов.
	var height func(node *TreeNode) int
	height = func(node *TreeNode) int {
		if node == nil {
			return 0
		}
		l := height(node.Left)
		if l < 0 {
			return -1
		}
		r := height(node.Right)
		if r < 0 {
			return -1
		}
		if l-r > 1 || r-l > 1 {
			return -1
		}
		return 1 + max(l, r)
	}
	return height(root) >= 0
}

func IsSymmetric(root *TreeNode) bool {
	var mirror func(a, b *TreeNode) bool
	mirror = func(a, b *TreeNode) bool {
		if a == nil || b == nil {
			return a == b
		}
		return a.Val == b.Val && mirror(a.Left, b.Right) && mirror(a.Right, b.Left)
	}
	if root == nil {
		return true
	}
	return mirror(root.Left, root.Right)
}

func LowestCommonAncestor(root, p, q *TreeNode) *TreeNode {
	if root == nil || root == p || root == q {
		return root
	}
	left := LowestCommonAncestor(root.Left, p, q)
	right := LowestCommonAncestor(root.Right, p, q)
	if left != nil && right != nil {
		return root
	}
	if left != nil {
		return left
	}
	return right
}

func PathSumAll(root *TreeNode, target int) [][]int {
	result := make([][]int, 0)
	var path []int
	var dfs func(node *TreeNode, rest int)
	dfs = func(node *TreeNode, rest int) {
		if node == nil {
			return
		}
		path = append(path, node.Val)
		rest -= node.Val
		if node.Left == nil && node.Right == nil && rest == 0 {
			// Копия: path переиспользуется дальше, и без неё все пути в
			// result смотрели бы в одну и ту же меняющуюся память.
			result = append(result, append([]int(nil), path...))
		}
		dfs(node.Left, rest)
		dfs(node.Right, rest)
		path = path[:len(path)-1]
	}
	dfs(root, target)
	return result
}

func BuildTree(preorder, inorder []int) *TreeNode {
	// pos — место каждого значения в inorder: без неё корень приходилось бы
	// искать проходом по отрезку, и на цепочке это O(n²).
	pos := make(map[int]int, len(inorder))
	for i, v := range inorder {
		pos[v] = i
	}
	next := 0 // следующий корень в preorder
	var build func(lo, hi int) *TreeNode
	build = func(lo, hi int) *TreeNode {
		if lo > hi {
			return nil
		}
		node := &TreeNode{Val: preorder[next]}
		next++
		mid := pos[node.Val]
		// preorder сначала перечисляет всё левое поддерево — его и строим первым.
		node.Left = build(lo, mid-1)
		node.Right = build(mid+1, hi)
		return node
	}
	return build(0, len(inorder)-1)
}

func IsSubtree(root, sub *TreeNode) bool {
	var same func(a, b *TreeNode) bool
	same = func(a, b *TreeNode) bool {
		if a == nil || b == nil {
			return a == b
		}
		return a.Val == b.Val && same(a.Left, b.Left) && same(a.Right, b.Right)
	}
	// Обход root: в каждом узле — полная сверка с sub (Same Tree). Совпадение
	// обрывает обход: || не вызывает правую часть, если левая уже true.
	var walk func(node *TreeNode) bool
	walk = func(node *TreeNode) bool {
		if node == nil {
			return false
		}
		return same(node, sub) || walk(node.Left) || walk(node.Right)
	}
	return sub == nil || walk(root)
}

func CountPathsWithSum(root *TreeNode, target int) int {
	// seen[s] — сколько раз накопленная сумма s встретилась на пути от корня
	// до текущего узла, не считая его самого. Пустой префикс (сумма 0) —
	// один раз: так считается путь, начавшийся в корне.
	seen := map[int]int{0: 1}
	count := 0
	var dfs func(node *TreeNode, sum int)
	dfs = func(node *TreeNode, sum int) {
		if node == nil {
			return
		}
		sum += node.Val
		count += seen[sum-target]
		seen[sum]++
		dfs(node.Left, sum)
		dfs(node.Right, sum)
		// Откат: соседняя ветвь не лежит под этим узлом, и его сумма ей не префикс.
		seen[sum]--
	}
	dfs(root, 0)
	return count
}
