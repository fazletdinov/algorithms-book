package main

import (
	"fmt"
)

// Определение узла бинарного дерева
type TreeNode struct {
	Val   int
	Left  *TreeNode
	Right *TreeNode
}

// Пример 1: Обход дерева по уровням
//
// Задача: Вернуть значения узлов, сгруппированные по уровням
// Временная сложность: O(n)
// Пространственная сложность: O(n)
func levelOrder(root *TreeNode) [][]int {
	var result [][]int

	if root == nil {
		return result
	}

	queue := []*TreeNode{root}

	for len(queue) > 0 {
		levelSize := len(queue)
		var currentLevel []int

		for i := 0; i < levelSize; i++ {
			node := queue[0]
			queue = queue[1:]

			currentLevel = append(currentLevel, node.Val)

			if node.Left != nil {
				queue = append(queue, node.Left)
			}
			if node.Right != nil {
				queue = append(queue, node.Right)
			}
		}

		result = append(result, currentLevel)
	}

	return result
}

// Пример 2: Среднее значение каждого уровня
//
// Задача: Вычислить среднее значение узлов на каждом уровне
// Временная сложность: O(n)
// Пространственная сложность: O(n)
func averageOfLevels(root *TreeNode) []float64 {
	var result []float64

	if root == nil {
		return result
	}

	queue := []*TreeNode{root}

	for len(queue) > 0 {
		levelSize := len(queue)
		sum := 0

		for i := 0; i < levelSize; i++ {
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

		result = append(result, float64(sum)/float64(levelSize))
	}

	return result
}

// Пример 3: Вид дерева справа
//
// Задача: Вернуть значения узлов, видимых справа на каждом уровне
// Временная сложность: O(n)
// Пространственная сложность: O(n)
func rightSideView(root *TreeNode) []int {
	var result []int

	if root == nil {
		return result
	}

	queue := []*TreeNode{root}

	for len(queue) > 0 {
		levelSize := len(queue)
		var rightmost int

		for i := 0; i < levelSize; i++ {
			node := queue[0]
			queue = queue[1:]

			rightmost = node.Val

			if node.Left != nil {
				queue = append(queue, node.Left)
			}
			if node.Right != nil {
				queue = append(queue, node.Right)
			}
		}

		result = append(result, rightmost)
	}

	return result
}

// Пример 4: Зигзагообразный обход дерева
//
// Задача: Обойти дерево зигзагообразно (слева направо, затем справа налево)
// Временная сложность: O(n)
// Пространственная сложность: O(n)
func zigzagLevelOrder(root *TreeNode) [][]int {
	var result [][]int

	if root == nil {
		return result
	}

	queue := []*TreeNode{root}
	leftToRight := true

	for len(queue) > 0 {
		levelSize := len(queue)
		var currentLevel []int

		for i := 0; i < levelSize; i++ {
			node := queue[0]
			queue = queue[1:]

			currentLevel = append(currentLevel, node.Val)

			if node.Left != nil {
				queue = append(queue, node.Left)
			}
			if node.Right != nil {
				queue = append(queue, node.Right)
			}
		}

		if !leftToRight {
			// Разворачиваем уровень
			for i, j := 0, len(currentLevel)-1; i < j; i, j = i+1, j-1 {
				currentLevel[i], currentLevel[j] = currentLevel[j], currentLevel[i]
			}
		}

		result = append(result, currentLevel)
		leftToRight = !leftToRight
	}

	return result
}

// Пример 5: Максимальная глубина дерева (BFS подход)
//
// Задача: Найти максимальную глубину бинарного дерева
// Временная сложность: O(n)
// Пространственная сложность: O(n)
func maxDepthBFS(root *TreeNode) int {
	if root == nil {
		return 0
	}

	queue := []*TreeNode{root}
	depth := 0

	for len(queue) > 0 {
		levelSize := len(queue)
		depth++

		for i := 0; i < levelSize; i++ {
			node := queue[0]
			queue = queue[1:]

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

// Пример 6: Минимальная глубина дерева
//
// Задача: Найти минимальную глубину дерева (до ближайшего листа)
// Временная сложность: O(n)
// Пространственная сложность: O(n)
func minDepth(root *TreeNode) int {
	if root == nil {
		return 0
	}

	queue := []*TreeNode{root}
	depth := 0

	for len(queue) > 0 {
		levelSize := len(queue)
		depth++

		for i := 0; i < levelSize; i++ {
			node := queue[0]
			queue = queue[1:]

			// Если это лист, возвращаем текущую глубину
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

// Вспомогательная функция для создания дерева
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

	fmt.Printf("Обход по уровням: %v\n", levelOrder(root))
	fmt.Printf("Средние значения уровней: %v\n", averageOfLevels(root))
	fmt.Printf("Вид справа: %v\n", rightSideView(root))
	fmt.Printf("Зигзагообразный обход: %v\n", zigzagLevelOrder(root))
	fmt.Printf("Максимальная глубина: %d\n", maxDepthBFS(root))
	fmt.Printf("Минимальная глубина: %d\n", minDepth(root))
}

