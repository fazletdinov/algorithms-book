//go:build solution

package toposort

import (
	"container/heap"
	"slices"
)

func TopologicalSort(numCourses int, prerequisites [][]int) []int {
	graph := make([][]int, numCourses)
	inDegree := make([]int, numCourses)
	for _, p := range prerequisites {
		a, b := p[0], p[1]
		graph[b] = append(graph[b], a)
		inDegree[a]++
	}

	queue := []int{}
	for i := 0; i < numCourses; i++ {
		if inDegree[i] == 0 {
			queue = append(queue, i)
		}
	}

	result := []int{}
	for len(queue) > 0 {
		node := queue[0]
		queue = queue[1:]
		result = append(result, node)
		for _, next := range graph[node] {
			inDegree[next]--
			if inDegree[next] == 0 {
				queue = append(queue, next)
			}
		}
	}

	if len(result) != numCourses {
		return []int{}
	}
	return result
}

func CanFinish(numCourses int, prerequisites [][]int) bool {
	return len(TopologicalSort(numCourses, prerequisites)) == numCourses
}

type minHeap []int

func (h minHeap) Len() int           { return len(h) }
func (h minHeap) Less(i, j int) bool { return h[i] < h[j] }
func (h minHeap) Swap(i, j int)      { h[i], h[j] = h[j], h[i] }
func (h *minHeap) Push(x any)        { *h = append(*h, x.(int)) }
func (h *minHeap) Pop() any {
	old := *h
	n := len(old)
	v := old[n-1]
	*h = old[:n-1]
	return v
}

func FindOrderLexSmallest(numCourses int, prerequisites [][]int) []int {
	graph := make([][]int, numCourses)
	inDegree := make([]int, numCourses)
	for _, p := range prerequisites {
		a, b := p[0], p[1]
		graph[b] = append(graph[b], a)
		inDegree[a]++
	}

	h := &minHeap{}
	heap.Init(h)
	for i := 0; i < numCourses; i++ {
		if inDegree[i] == 0 {
			heap.Push(h, i)
		}
	}

	result := []int{}
	for h.Len() > 0 {
		node := heap.Pop(h).(int)
		result = append(result, node)
		for _, next := range graph[node] {
			inDegree[next]--
			if inDegree[next] == 0 {
				heap.Push(h, next)
			}
		}
	}

	if len(result) != numCourses {
		return []int{}
	}
	return result
}

func AlienOrder(words []string) string {
	graph := make(map[byte]map[byte]bool)
	inDegree := make(map[byte]int)
	for _, w := range words {
		for i := 0; i < len(w); i++ {
			if _, ok := inDegree[w[i]]; !ok {
				inDegree[w[i]] = 0
				graph[w[i]] = make(map[byte]bool)
			}
		}
	}

	for i := 0; i+1 < len(words); i++ {
		w1, w2 := words[i], words[i+1]
		minLen := len(w1)
		if len(w2) < minLen {
			minLen = len(w2)
		}
		found := false
		for j := 0; j < minLen; j++ {
			if w1[j] != w2[j] {
				if !graph[w1[j]][w2[j]] {
					graph[w1[j]][w2[j]] = true
					inDegree[w2[j]]++
				}
				found = true
				break
			}
		}
		if !found && len(w1) > len(w2) {
			return ""
		}
	}

	queue := []byte{}
	for c, d := range inDegree {
		if d == 0 {
			queue = append(queue, c)
		}
	}

	result := []byte{}
	for len(queue) > 0 {
		c := queue[0]
		queue = queue[1:]
		result = append(result, c)
		for next := range graph[c] {
			inDegree[next]--
			if inDegree[next] == 0 {
				queue = append(queue, next)
			}
		}
	}

	if len(result) != len(inDegree) {
		return ""
	}
	return string(result)
}

func MinSemesters(n int, relations [][]int) int {
	graph := make([][]int, n+1)
	inDegree := make([]int, n+1)
	for _, r := range relations {
		prev, next := r[0], r[1]
		graph[prev] = append(graph[prev], next)
		inDegree[next]++
	}

	queue := []int{}
	for v := 1; v <= n; v++ {
		if inDegree[v] == 0 {
			queue = append(queue, v)
		}
	}

	semesters, taken := 0, 0
	for len(queue) > 0 {
		semesters++
		levelSize := len(queue) // курсы этого семестра; ставшие готовыми — в следующий
		for i := 0; i < levelSize; i++ {
			v := queue[i]
			taken++
			for _, next := range graph[v] {
				inDegree[next]--
				if inDegree[next] == 0 {
					queue = append(queue, next)
				}
			}
		}
		queue = queue[levelSize:]
	}

	if taken != n {
		return -1
	}
	return semesters
}

func FindMinHeightTrees(n int, edges [][]int) []int {
	if n == 1 {
		return []int{0}
	}
	adj := make([][]int, n)
	degree := make([]int, n)
	for _, e := range edges {
		a, b := e[0], e[1]
		adj[a] = append(adj[a], b)
		adj[b] = append(adj[b], a)
		degree[a]++
		degree[b]++
	}

	leaves := []int{}
	for v := 0; v < n; v++ {
		if degree[v] == 1 {
			leaves = append(leaves, v)
		}
	}

	// Снимаем листья слоями, пока не останется одна или две вершины — середина
	// самого длинного пути.
	remaining := n
	for remaining > 2 {
		remaining -= len(leaves)
		next := []int{}
		for _, leaf := range leaves {
			for _, nb := range adj[leaf] {
				degree[nb]--
				if degree[nb] == 1 {
					next = append(next, nb)
				}
			}
		}
		leaves = next
	}

	slices.Sort(leaves)
	return leaves
}

func TopologicalSortDFS(numCourses int, prerequisites [][]int) []int {
	const (
		white = iota // ещё не были
		gray         // вызов идёт
		black        // вызов закончен, вершина уже в post
	)
	graph := make([][]int, numCourses)
	for _, p := range prerequisites {
		a, b := p[0], p[1]
		graph[b] = append(graph[b], a)
	}
	color := make([]uint8, numCourses)
	post := make([]int, 0, numCourses) // вершины в порядке выхода из вызова
	var dfs func(v int) bool
	dfs = func(v int) bool {
		color[v] = gray
		for _, next := range graph[v] {
			if color[next] == gray {
				return false // ребро в вершину на текущем пути — цикл
			}
			if color[next] == white && !dfs(next) {
				return false
			}
		}
		color[v] = black
		post = append(post, v) // всё, что идёт после v, уже в post
		return true
	}
	for v := 0; v < numCourses; v++ {
		if color[v] == white && !dfs(v) {
			return []int{}
		}
	}
	slices.Reverse(post)
	return post
}
