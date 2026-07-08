//go:build solution

package maxflow

// MaxFlow — алгоритм Эдмондса—Карпа: пока в остаточной сети есть дополняющий
// путь (ищем его BFS — кратчайшим по числу рёбер), проталкиваем вдоль него
// поток, равный узкому месту. Обратные рёбра позволяют «отменить» ранее
// протолкнутый поток, что и гарантирует оптимум.
func MaxFlow(n int, edges [][]int, s, t int) int {
	if s == t {
		return 0
	}
	// Остаточные пропускные способности как матрица; для каждого ребра u→v
	// заводим и обратное v→u (изначально 0).
	cap := make([][]int, n)
	for i := range cap {
		cap[i] = make([]int, n)
	}
	adj := make([][]int, n)
	for _, e := range edges {
		u, v, c := e[0], e[1], e[2]
		adj[u] = append(adj[u], v)
		adj[v] = append(adj[v], u) // остаточное обратное ребро
		cap[u][v] += c
	}

	const inf = 1 << 62
	flow := 0
	for {
		// BFS ищет кратчайший путь s→t по рёбрам с положительной остаточной
		// пропускной способностью.
		parent := make([]int, n)
		for i := range parent {
			parent[i] = -1
		}
		parent[s] = s
		queue := []int{s}
		for len(queue) > 0 && parent[t] == -1 {
			u := queue[0]
			queue = queue[1:]
			for _, v := range adj[u] {
				if parent[v] == -1 && cap[u][v] > 0 {
					parent[v] = u
					queue = append(queue, v)
				}
			}
		}
		if parent[t] == -1 {
			break // дополняющего пути больше нет — поток максимален
		}
		// Узкое место — минимум остаточной пропускной способности вдоль пути.
		bottleneck := inf
		for v := t; v != s; v = parent[v] {
			u := parent[v]
			if cap[u][v] < bottleneck {
				bottleneck = cap[u][v]
			}
		}
		// Проталкиваем поток: прямым рёбрам −bottleneck, обратным +bottleneck.
		for v := t; v != s; v = parent[v] {
			u := parent[v]
			cap[u][v] -= bottleneck
			cap[v][u] += bottleneck
		}
		flow += bottleneck
	}
	return flow
}

// MaxBipartiteMatching — алгоритм Куна: для каждой левой вершины ищем
// увеличивающую цепь (DFS). Если соседняя правая вершина свободна или её
// текущего партнёра можно пересадить в другое место — занимаем.
func MaxBipartiteMatching(nLeft, nRight int, edges [][]int) int {
	adj := make([][]int, nLeft)
	for _, e := range edges {
		adj[e[0]] = append(adj[e[0]], e[1])
	}
	matchR := make([]int, nRight)
	for i := range matchR {
		matchR[i] = -1
	}
	var try func(u int, seen []bool) bool
	try = func(u int, seen []bool) bool {
		for _, v := range adj[u] {
			if seen[v] {
				continue
			}
			seen[v] = true
			if matchR[v] == -1 || try(matchR[v], seen) {
				matchR[v] = u
				return true
			}
		}
		return false
	}
	result := 0
	for u := 0; u < nLeft; u++ {
		seen := make([]bool, nRight)
		if try(u, seen) {
			result++
		}
	}
	return result
}
