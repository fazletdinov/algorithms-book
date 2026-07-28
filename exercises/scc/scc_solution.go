//go:build solution

package scc

import "sort"

// SCC — алгоритм Косарайю: DFS №1 запоминает порядок завершения вершин,
// DFS №2 идёт по транспонированному графу в обратном порядке завершения,
// каждый его запуск собирает ровно одну компоненту сильной связности.
func SCC(n int, edges [][]int) [][]int {
	adj := make([][]int, n)
	radj := make([][]int, n)
	for _, e := range edges {
		u, v := e[0], e[1]
		adj[u] = append(adj[u], v)
		radj[v] = append(radj[v], u)
	}

	// DFS №1: порядок завершения (вершина попадает в order ПОСЛЕ соседей).
	visited := make([]bool, n)
	order := make([]int, 0, n)
	var dfs1 func(v int)
	dfs1 = func(v int) {
		visited[v] = true
		for _, w := range adj[v] {
			if !visited[w] {
				dfs1(w)
			}
		}
		order = append(order, v)
	}
	for v := 0; v < n; v++ {
		if !visited[v] {
			dfs1(v)
		}
	}

	// DFS №2: транспонированный граф, обратный порядок завершения.
	assigned := make([]bool, n)
	var comp []int
	var dfs2 func(v int)
	dfs2 = func(v int) {
		assigned[v] = true
		comp = append(comp, v)
		for _, w := range radj[v] {
			if !assigned[w] {
				dfs2(w)
			}
		}
	}
	var comps [][]int
	for i := n - 1; i >= 0; i-- {
		if v := order[i]; !assigned[v] {
			comp = nil
			dfs2(v)
			sort.Ints(comp)
			comps = append(comps, comp)
		}
	}
	sort.Slice(comps, func(i, j int) bool { return comps[i][0] < comps[j][0] })
	return comps
}

// arc — полуребро списка смежности: сосед + индекс исходного ребра.
// Индекс нужен, чтобы при DFS не возвращаться к родителю по ТОМУ ЖЕ ребру,
// но честно видеть параллельное ребро как обратное (кратные рёбра!).
type arc struct{ to, id int }

func undirectedAdj(n int, edges [][]int) [][]arc {
	adj := make([][]arc, n)
	for id, e := range edges {
		u, v := e[0], e[1]
		if u == v {
			continue // петля не влияет ни на мосты, ни на точки сочленения
		}
		adj[u] = append(adj[u], arc{v, id})
		adj[v] = append(adj[v], arc{u, id})
	}
	return adj
}

// Bridges — low-link (Тарьян): мост (v, to) <=> low[to] > tin[v], то есть из
// поддерева to нет обратного ребра в v или выше.
func Bridges(n int, edges [][]int) [][]int {
	adj := undirectedAdj(n, edges)
	tin := make([]int, n)
	low := make([]int, n)
	for i := range tin {
		tin[i] = -1
	}
	timer := 0
	var res [][]int
	var dfs func(v, fromEdge int)
	dfs = func(v, fromEdge int) {
		tin[v], low[v] = timer, timer
		timer++
		for _, a := range adj[v] {
			if a.id == fromEdge {
				continue // к родителю по тому же ребру не возвращаемся
			}
			if tin[a.to] == -1 { // древесное ребро
				dfs(a.to, a.id)
				if low[a.to] < low[v] {
					low[v] = low[a.to]
				}
				if low[a.to] > tin[v] {
					u, w := v, a.to
					if u > w {
						u, w = w, u
					}
					res = append(res, []int{u, w})
				}
			} else if tin[a.to] < low[v] {
				low[v] = tin[a.to] // обратное ребро: берём tin, а не low!
			}
		}
	}
	for v := 0; v < n; v++ {
		if tin[v] == -1 {
			dfs(v, -1)
		}
	}
	sort.Slice(res, func(i, j int) bool {
		if res[i][0] != res[j][0] {
			return res[i][0] < res[j][0]
		}
		return res[i][1] < res[j][1]
	})
	return res
}

// ArticulationPoints — тот же low-link: не-корень v — точка сочленения, если у
// какого-то ребёнка low[child] >= tin[v]; корень — если у него >= 2 детей в
// DFS-дереве.
func ArticulationPoints(n int, edges [][]int) []int {
	adj := undirectedAdj(n, edges)
	tin := make([]int, n)
	low := make([]int, n)
	for i := range tin {
		tin[i] = -1
	}
	timer := 0
	isCut := make([]bool, n)
	var dfs func(v, fromEdge int)
	dfs = func(v, fromEdge int) {
		tin[v], low[v] = timer, timer
		timer++
		children := 0
		for _, a := range adj[v] {
			if a.id == fromEdge {
				continue
			}
			if tin[a.to] == -1 { // древесное ребро
				children++
				dfs(a.to, a.id)
				if low[a.to] < low[v] {
					low[v] = low[a.to]
				}
				if fromEdge != -1 && low[a.to] >= tin[v] {
					isCut[v] = true // поддерево не дотягивается ВЫШЕ v
				}
			} else if tin[a.to] < low[v] {
				low[v] = tin[a.to]
			}
		}
		if fromEdge == -1 && children >= 2 {
			isCut[v] = true // особый случай корня DFS-дерева
		}
	}
	for v := 0; v < n; v++ {
		if tin[v] == -1 {
			dfs(v, -1)
		}
	}
	var res []int
	for v, cut := range isCut {
		if cut {
			res = append(res, v)
		}
	}
	return res
}
