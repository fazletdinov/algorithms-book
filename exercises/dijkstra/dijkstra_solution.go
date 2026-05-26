//go:build solution

package dijkstra

import "container/heap"

type item struct{ node, dist int }
type pq []item

func (p pq) Len() int           { return len(p) }
func (p pq) Less(i, j int) bool { return p[i].dist < p[j].dist }
func (p pq) Swap(i, j int)      { p[i], p[j] = p[j], p[i] }
func (p *pq) Push(x any)        { *p = append(*p, x.(item)) }
func (p *pq) Pop() any {
	old := *p
	n := len(old)
	it := old[n-1]
	*p = old[:n-1]
	return it
}

func ShortestPath(n int, edges [][]int, src, dst int) int {
	const inf = 1 << 62
	adj := make([][][2]int, n)
	for _, e := range edges {
		u, v, w := e[0], e[1], e[2]
		adj[u] = append(adj[u], [2]int{v, w})
		adj[v] = append(adj[v], [2]int{u, w})
	}

	dist := make([]int, n)
	for i := range dist {
		dist[i] = inf
	}
	dist[src] = 0

	h := &pq{{node: src, dist: 0}}
	for h.Len() > 0 {
		cur := heap.Pop(h).(item)
		if cur.dist > dist[cur.node] {
			continue
		}
		for _, e := range adj[cur.node] {
			to, w := e[0], e[1]
			if nd := cur.dist + w; nd < dist[to] {
				dist[to] = nd
				heap.Push(h, item{node: to, dist: nd})
			}
		}
	}

	if dist[dst] == inf {
		return -1
	}
	return dist[dst]
}
