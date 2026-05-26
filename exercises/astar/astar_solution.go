//go:build solution

package astar

import "container/heap"

type node struct{ r, c, f int }
type nodePQ []node

func (p nodePQ) Len() int           { return len(p) }
func (p nodePQ) Less(i, j int) bool { return p[i].f < p[j].f }
func (p nodePQ) Swap(i, j int)      { p[i], p[j] = p[j], p[i] }
func (p *nodePQ) Push(x any)        { *p = append(*p, x.(node)) }
func (p *nodePQ) Pop() any {
	old := *p
	n := len(old)
	it := old[n-1]
	*p = old[:n-1]
	return it
}

func abs(x int) int {
	if x < 0 {
		return -x
	}
	return x
}

func ShortestPath(grid [][]int) int {
	rows := len(grid)
	if rows == 0 {
		return -1
	}
	cols := len(grid[0])
	gr, gc := rows-1, cols-1
	if grid[0][0] == 1 || grid[gr][gc] == 1 {
		return -1
	}
	h := func(r, c int) int { return abs(gr-r) + abs(gc-c) }

	const inf = 1 << 30
	g := make([][]int, rows)
	for i := range g {
		g[i] = make([]int, cols)
		for j := range g[i] {
			g[i][j] = inf
		}
	}
	g[0][0] = 0

	open := &nodePQ{{r: 0, c: 0, f: h(0, 0)}}
	dirs := [4][2]int{{-1, 0}, {1, 0}, {0, -1}, {0, 1}}
	for open.Len() > 0 {
		cur := heap.Pop(open).(node)
		if cur.r == gr && cur.c == gc {
			return g[gr][gc]
		}
		for _, d := range dirs {
			nr, nc := cur.r+d[0], cur.c+d[1]
			if nr < 0 || nr >= rows || nc < 0 || nc >= cols || grid[nr][nc] == 1 {
				continue
			}
			if tentative := g[cur.r][cur.c] + 1; tentative < g[nr][nc] {
				g[nr][nc] = tentative
				heap.Push(open, node{r: nr, c: nc, f: tentative + h(nr, nc)})
			}
		}
	}
	return -1
}
