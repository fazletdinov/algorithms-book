//go:build solution

package bellmanford

func ShortestPath(n int, edges [][]int, src, dst int) (int, bool) {
	const inf = 1 << 62
	dist := make([]int, n)
	for i := range dist {
		dist[i] = inf
	}
	dist[src] = 0

	for i := 0; i < n-1; i++ {
		for _, e := range edges {
			u, v, w := e[0], e[1], e[2]
			if dist[u] != inf && dist[u]+w < dist[v] {
				dist[v] = dist[u] + w
			}
		}
	}

	if dist[dst] == inf {
		return 0, false
	}
	return dist[dst], true
}
