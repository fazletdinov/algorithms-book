//go:build solution

package mst

import (
	"container/heap"
	"sort"
)

func MSTWeight(n int, edges [][]int) int {
	parent := make([]int, n)
	rank := make([]int, n)
	for i := range parent {
		parent[i] = i
	}
	var find func(int) int
	find = func(x int) int {
		for parent[x] != x {
			parent[x] = parent[parent[x]]
			x = parent[x]
		}
		return x
	}
	union := func(x, y int) bool {
		rx, ry := find(x), find(y)
		if rx == ry {
			return false
		}
		if rank[rx] < rank[ry] {
			rx, ry = ry, rx
		}
		parent[ry] = rx
		if rank[rx] == rank[ry] {
			rank[rx]++
		}
		return true
	}

	sorted := make([][]int, len(edges))
	copy(sorted, edges)
	sort.Slice(sorted, func(i, j int) bool { return sorted[i][2] < sorted[j][2] })

	total, used := 0, 0
	for _, e := range sorted {
		if union(e[0], e[1]) {
			total += e[2]
			used++
		}
	}
	if used != n-1 {
		return -1
	}
	return total
}

type primEdge struct {
	node, weight int
}

type primPQ []primEdge

func (pq primPQ) Len() int            { return len(pq) }
func (pq primPQ) Less(i, j int) bool  { return pq[i].weight < pq[j].weight }
func (pq primPQ) Swap(i, j int)       { pq[i], pq[j] = pq[j], pq[i] }
func (pq *primPQ) Push(x interface{}) { *pq = append(*pq, x.(primEdge)) }
func (pq *primPQ) Pop() interface{} {
	old := *pq
	n := len(old)
	e := old[n-1]
	*pq = old[:n-1]
	return e
}

func MSTWeightPrim(n int, edges [][]int) int {
	adj := make([][]primEdge, n)
	for _, e := range edges {
		u, v, w := e[0], e[1], e[2]
		adj[u] = append(adj[u], primEdge{node: v, weight: w})
		adj[v] = append(adj[v], primEdge{node: u, weight: w})
	}

	visited := make([]bool, n)
	pq := &primPQ{{node: 0, weight: 0}}
	total, count := 0, 0
	for pq.Len() > 0 {
		e := heap.Pop(pq).(primEdge)
		if visited[e.node] {
			continue
		}
		visited[e.node] = true
		total += e.weight
		count++
		for _, nb := range adj[e.node] {
			if !visited[nb.node] {
				heap.Push(pq, nb)
			}
		}
	}
	if count != n {
		return -1
	}
	return total
}

func MSTWeightWithEdges(n int, edges [][]int) (int, [][]int) {
	parent := make([]int, n)
	rank := make([]int, n)
	for i := range parent {
		parent[i] = i
	}
	var find func(int) int
	find = func(x int) int {
		for parent[x] != x {
			parent[x] = parent[parent[x]]
			x = parent[x]
		}
		return x
	}
	union := func(x, y int) bool {
		rx, ry := find(x), find(y)
		if rx == ry {
			return false
		}
		if rank[rx] < rank[ry] {
			rx, ry = ry, rx
		}
		parent[ry] = rx
		if rank[rx] == rank[ry] {
			rank[rx]++
		}
		return true
	}

	sorted := make([][]int, len(edges))
	copy(sorted, edges)
	sort.Slice(sorted, func(i, j int) bool { return sorted[i][2] < sorted[j][2] })

	total := 0
	chosen := make([][]int, 0, n-1)
	for _, e := range sorted {
		if union(e[0], e[1]) {
			total += e[2]
			chosen = append(chosen, []int{e[0], e[1], e[2]})
		}
	}
	if len(chosen) != n-1 {
		return -1, nil
	}
	return total, chosen
}
