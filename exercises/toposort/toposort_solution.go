//go:build solution

package toposort

import "container/heap"

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
