package main

import (
	"fmt"
)

// Пример 1: Топологическая сортировка (алгоритм Кана)
//
// Задача: Найти топологический порядок вершин в графе
// Временная сложность: O(V + E)
// Пространственная сложность: O(V + E)
func topologicalSort(numCourses int, prerequisites [][]int) []int {
	graph := make([][]int, numCourses)
	inDegree := make([]int, numCourses)

	// Строим граф и подсчитываем входящие степени
	for _, prereq := range prerequisites {
		from := prereq[1]
		to := prereq[0]
		graph[from] = append(graph[from], to)
		inDegree[to]++
	}

	// Находим все вершины с in-degree = 0
	queue := []int{}
	for i := 0; i < numCourses; i++ {
		if inDegree[i] == 0 {
			queue = append(queue, i)
		}
	}

	result := []int{}

	// Обрабатываем вершины
	for len(queue) > 0 {
		node := queue[0]
		queue = queue[1:]
		result = append(result, node)

		// Уменьшаем in-degree соседних вершин
		for _, neighbor := range graph[node] {
			inDegree[neighbor]--
			if inDegree[neighbor] == 0 {
				queue = append(queue, neighbor)
			}
		}
	}

	// Если не все вершины обработаны, есть цикл
	if len(result) == numCourses {
		return result
	}
	return []int{}
}

// Пример 2: Проверка возможности завершения курсов
//
// Задача: Определить, можно ли завершить все курсы (нет циклов)
// Временная сложность: O(V + E)
// Пространственная сложность: O(V + E)
func canFinish(numCourses int, prerequisites [][]int) bool {
	graph := make([][]int, numCourses)
	inDegree := make([]int, numCourses)

	for _, prereq := range prerequisites {
		from := prereq[1]
		to := prereq[0]
		graph[from] = append(graph[from], to)
		inDegree[to]++
	}

	queue := []int{}
	for i := 0; i < numCourses; i++ {
		if inDegree[i] == 0 {
			queue = append(queue, i)
		}
	}

	count := 0

	for len(queue) > 0 {
		node := queue[0]
		queue = queue[1:]
		count++

		for _, neighbor := range graph[node] {
			inDegree[neighbor]--
			if inDegree[neighbor] == 0 {
				queue = append(queue, neighbor)
			}
		}
	}

	return count == numCourses
}

// Пример 3: Топологическая сортировка с DFS
//
// Задача: Найти топологический порядок используя DFS
// Временная сложность: O(V + E)
// Пространственная сложность: O(V + E)
func topologicalSortDFS(numCourses int, prerequisites [][]int) []int {
	graph := make([][]int, numCourses)

	for _, prereq := range prerequisites {
		from := prereq[1]
		to := prereq[0]
		graph[from] = append(graph[from], to)
	}

	visited := make([]int, numCourses) // 0: не посещено, 1: посещено, 2: обработано
	result := []int{}

	var dfs func(int) bool
	dfs = func(node int) bool {
		if visited[node] == 1 {
			// Обнаружен цикл
			return false
		}
		if visited[node] == 2 {
			return true
		}

		visited[node] = 1
		for _, neighbor := range graph[node] {
			if !dfs(neighbor) {
				return false
			}
		}
		visited[node] = 2
		result = append(result, node)
		return true
	}

	for i := 0; i < numCourses; i++ {
		if visited[i] == 0 {
			if !dfs(i) {
				return []int{}
			}
		}
	}

	// Разворачиваем результат
	for i, j := 0, len(result)-1; i < j; i, j = i+1, j-1 {
		result[i], result[j] = result[j], result[i]
	}

	return result
}

// Пример 4: Минимальная высота деревьев
//
// Задача: Найти корни деревьев минимальной высоты в неориентированном графе
// Временная сложность: O(V + E)
// Пространственная сложность: O(V + E)
func findMinHeightTrees(n int, edges [][]int) []int {
	if n == 1 {
		return []int{0}
	}

	graph := make([][]int, n)
	degree := make([]int, n)

	for _, edge := range edges {
		u := edge[0]
		v := edge[1]
		graph[u] = append(graph[u], v)
		graph[v] = append(graph[v], u)
		degree[u]++
		degree[v]++
	}

	// Начинаем с листьев (степень = 1)
	queue := []int{}
	for i := 0; i < n; i++ {
		if degree[i] == 1 {
			queue = append(queue, i)
		}
	}

	remaining := n

	// Удаляем листья слой за слоем
	for remaining > 2 {
		size := len(queue)
		remaining -= size

		for i := 0; i < size; i++ {
			leaf := queue[0]
			queue = queue[1:]
			for _, neighbor := range graph[leaf] {
				degree[neighbor]--
				if degree[neighbor] == 1 {
					queue = append(queue, neighbor)
				}
			}
		}
	}

	return queue
}

// Примеры использования
func main() {
	// Пример 1: Проверка возможности завершения курсов
	prerequisites1 := [][]int{{1, 0}, {0, 1}}
	fmt.Printf("Можно завершить курсы (с циклом): %v\n", canFinish(2, prerequisites1))

	prerequisites2 := [][]int{{1, 0}}
	fmt.Printf("Можно завершить курсы (без цикла): %v\n", canFinish(2, prerequisites2))

	// Пример 2: Топологическая сортировка
	prerequisites3 := [][]int{{1, 0}, {2, 0}, {3, 1}, {3, 2}}
	fmt.Printf("Топологический порядок: %v\n", topologicalSort(4, prerequisites3))

	// Пример 3: Минимальная высота деревьев
	edges := [][]int{{1, 0}, {1, 2}, {1, 3}}
	fmt.Printf("Корни деревьев минимальной высоты: %v\n", findMinHeightTrees(4, edges))
}

