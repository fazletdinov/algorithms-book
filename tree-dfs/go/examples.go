package main

import (
	"fmt"
	"math"
)

// Определение узла бинарного дерева
type TreeNode struct {
	Val   int
	Left  *TreeNode
	Right *TreeNode
}

// Пример 1: Pre-order обход (Корень -> Левое -> Правое)
//
// Задача: Вернуть значения узлов в порядке pre-order
// Временная сложность: O(n)
// Пространственная сложность: O(h), где h - высота дерева
func preorderTraversal(root *TreeNode) []int {
	var result []int

	var dfs func(*TreeNode)
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

// Пример 2: In-order обход (Левое -> Корень -> Правое)
//
// Задача: Вернуть значения узлов в порядке in-order
// Временная сложность: O(n)
// Пространственная сложность: O(h)
func inorderTraversal(root *TreeNode) []int {
	var result []int

	var dfs func(*TreeNode)
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

// Пример 3: Post-order обход (Левое -> Правое -> Корень)
//
// Задача: Вернуть значения узлов в порядке post-order
// Временная сложность: O(n)
// Пространственная сложность: O(h)
func postorderTraversal(root *TreeNode) []int {
	var result []int

	var dfs func(*TreeNode)
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

// Пример 4: Максимальная глубина дерева (DFS)
//
// Задача: Найти максимальную глубину бинарного дерева
// Временная сложность: O(n)
// Пространственная сложность: O(h)
func maxDepthDFS(root *TreeNode) int {
	if root == nil {
		return 0
	}

	leftDepth := maxDepthDFS(root.Left)
	rightDepth := maxDepthDFS(root.Right)

	return 1 + max(leftDepth, rightDepth)
}

// Пример 5: Проверка симметричности дерева
//
// Задача: Определить, является ли дерево симметричным
// Временная сложность: O(n)
// Пространственная сложность: O(h)
func isSymmetric(root *TreeNode) bool {
	if root == nil {
		return true
	}

	return isMirror(root.Left, root.Right)
}

func isMirror(left, right *TreeNode) bool {
	if left == nil && right == nil {
		return true
	}
	if left == nil || right == nil {
		return false
	}

	return left.Val == right.Val &&
		isMirror(left.Left, right.Right) &&
		isMirror(left.Right, right.Left)
}

// Пример 6: Проверка валидности BST
//
// Задача: Определить, является ли дерево валидным бинарным деревом поиска
// Временная сложность: O(n)
// Пространственная сложность: O(h)
func isValidBST(root *TreeNode) bool {
	return validate(root, nil, nil)
}

func validate(node *TreeNode, min, max *int) bool {
	if node == nil {
		return true
	}

	val := node.Val

	// Проверяем границы
	if min != nil && val <= *min {
		return false
	}
	if max != nil && val >= *max {
		return false
	}

	// Рекурсивно проверяем поддеревья
	return validate(node.Left, min, &val) &&
		validate(node.Right, &val, max)
}

// Пример 7: Сумма пути
//
// Задача: Проверить, существует ли путь от корня до листа с заданной суммой
// Временная сложность: O(n)
// Пространственная сложность: O(h)
func hasPathSum(root *TreeNode, targetSum int) bool {
	if root == nil {
		return false
	}

	remaining := targetSum - root.Val

	// Если это лист и сумма равна цели
	if root.Left == nil && root.Right == nil {
		return remaining == 0
	}

	// Рекурсивно проверяем левое и правое поддеревья
	return hasPathSum(root.Left, remaining) ||
		hasPathSum(root.Right, remaining)
}

// Пример 8: Максимальная сумма пути
//
// Задача: Найти максимальную сумму пути в дереве (путь может начинаться и заканчиваться где угодно)
// Временная сложность: O(n)
// Пространственная сложность: O(h)
func maxPathSum(root *TreeNode) int {
	maxSum := math.MinInt32

	var dfs func(*TreeNode) int
	dfs = func(node *TreeNode) int {
		if node == nil {
			return 0
		}

		leftSum := max(dfs(node.Left), 0)
		rightSum := max(dfs(node.Right), 0)

		// Текущая максимальная сумма с текущим узлом как корнем
		currentSum := node.Val + leftSum + rightSum
		maxSum = max(maxSum, currentSum)

		// Возвращаем максимальную сумму пути через текущий узел
		return node.Val + max(leftSum, rightSum)
	}

	dfs(root)
	return maxSum
}

// Вспомогательные функции
func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func createNode(val int) *TreeNode {
	return &TreeNode{Val: val}
}

// Примеры использования
func main() {
	// Создаем дерево:    3
	//                   / \
	//                  9   20
	//                     /  \
	//                    15   7
	root := createNode(3)
	root.Left = createNode(9)
	root.Right = createNode(20)
	root.Right.Left = createNode(15)
	root.Right.Right = createNode(7)

	fmt.Printf("Pre-order: %v\n", preorderTraversal(root))
	fmt.Printf("In-order: %v\n", inorderTraversal(root))
	fmt.Printf("Post-order: %v\n", postorderTraversal(root))
	fmt.Printf("Максимальная глубина: %d\n", maxDepthDFS(root))
	fmt.Printf("Симметричное дерево: %v\n", isSymmetric(root))
}

