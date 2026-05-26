//go:build solution

package mst

import "sort"

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
