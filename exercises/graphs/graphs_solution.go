//go:build solution

package graphs

import (
	"container/heap"
	"sort"
)

func sortedAdjacency(n int, edges [][]int) [][]int {
	adj := make([][]int, n)
	for _, e := range edges {
		adj[e[0]] = append(adj[e[0]], e[1])
		adj[e[1]] = append(adj[e[1]], e[0])
	}
	for i := range adj {
		sort.Ints(adj[i])
	}
	return adj
}

func CountComponents(n int, edges [][]int) int {
	adj := make([][]int, n)
	for _, e := range edges {
		adj[e[0]] = append(adj[e[0]], e[1])
		adj[e[1]] = append(adj[e[1]], e[0])
	}
	visited := make([]bool, n)
	var dfs func(int)
	dfs = func(node int) {
		visited[node] = true
		for _, next := range adj[node] {
			if !visited[next] {
				dfs(next)
			}
		}
	}
	count := 0
	for i := 0; i < n; i++ {
		if !visited[i] {
			count++
			dfs(i)
		}
	}
	return count
}

// arc — ребро в списке смежности: куда ведёт и его номер в edges. С номером правило «пропусти
// ребро, по которому пришёл» буквально: второе ребро между той же парой вершин — уже другое ребро.
type arc struct{ to, id int }

func HasCycleUndirected(n int, edges [][]int) bool {
	adj := make([][]arc, n)
	for id, e := range edges {
		adj[e[0]] = append(adj[e[0]], arc{e[1], id})
		adj[e[1]] = append(adj[e[1]], arc{e[0], id}) // у петли [v, v] — вторая запись у той же v
	}
	visited := make([]bool, n)
	// dfs сообщает, есть ли цикл в компоненте node; from — номер ребра, по которому в неё пришли.
	// В неориентированном обходе любое другое ребро в уже посещённую вершину замыкает цикл.
	var dfs func(node, from int) bool
	dfs = func(node, from int) bool {
		visited[node] = true
		for _, a := range adj[node] {
			if a.id == from {
				continue
			}
			if visited[a.to] || dfs(a.to, a.id) {
				return true
			}
		}
		return false
	}
	for v := 0; v < n; v++ {
		if !visited[v] && dfs(v, -1) {
			return true
		}
	}
	return false
}

func BFSOrder(n int, edges [][]int, start int) []int {
	adj := sortedAdjacency(n, edges)
	visited := make([]bool, n)
	order := []int{}
	queue := []int{start}
	visited[start] = true
	for len(queue) > 0 {
		node := queue[0]
		queue = queue[1:]
		order = append(order, node)
		for _, next := range adj[node] {
			if !visited[next] {
				visited[next] = true
				queue = append(queue, next)
			}
		}
	}
	return order
}

func DFSOrder(n int, edges [][]int, start int) []int {
	adj := sortedAdjacency(n, edges)
	visited := make([]bool, n)
	order := []int{}
	var dfs func(int)
	dfs = func(node int) {
		visited[node] = true
		order = append(order, node)
		for _, next := range adj[node] {
			if !visited[next] {
				dfs(next)
			}
		}
	}
	dfs(start)
	return order
}

func ShortestPathUnweighted(n int, edges [][]int, src, dst int) int {
	if src == dst {
		return 0
	}
	adj := sortedAdjacency(n, edges)
	dist := make([]int, n)
	for i := range dist {
		dist[i] = -1
	}
	dist[src] = 0
	queue := []int{src}
	for len(queue) > 0 {
		node := queue[0]
		queue = queue[1:]
		for _, next := range adj[node] {
			if dist[next] == -1 {
				dist[next] = dist[node] + 1
				if next == dst {
					return dist[next]
				}
				queue = append(queue, next)
			}
		}
	}
	return -1
}

func IsBipartite(n int, edges [][]int) bool {
	adj := sortedAdjacency(n, edges)
	color := make([]int, n) // 0 — не окрашена, 1 и -1 — два цвета
	for s := 0; s < n; s++ {
		if color[s] != 0 {
			continue
		}
		color[s] = 1
		queue := []int{s}
		for len(queue) > 0 {
			node := queue[0]
			queue = queue[1:]
			for _, next := range adj[node] {
				if color[next] == 0 {
					color[next] = -color[node]
					queue = append(queue, next)
				} else if color[next] == color[node] {
					return false
				}
			}
		}
	}
	return true
}

func ShortestPathRoute(n int, edges [][]int, src, dst int) []int {
	if src == dst {
		return []int{src}
	}
	adj := sortedAdjacency(n, edges)
	parent := make([]int, n) // parent[v] — из какой вершины BFS впервые пришёл в v
	for i := range parent {
		parent[i] = -1
	}
	visited := make([]bool, n)
	visited[src] = true
	queue := []int{src}
	for len(queue) > 0 && !visited[dst] {
		node := queue[0]
		queue = queue[1:]
		for _, next := range adj[node] {
			if !visited[next] {
				visited[next] = true
				parent[next] = node
				queue = append(queue, next)
			}
		}
	}
	if !visited[dst] {
		return nil
	}
	var path []int
	for v := dst; v != -1; v = parent[v] {
		path = append(path, v) // от dst к src
	}
	for i, j := 0, len(path)-1; i < j; i, j = i+1, j-1 {
		path[i], path[j] = path[j], path[i]
	}
	return path
}

// distItem — запись кучи Дейкстры: вершина и расстояние, с которым её положили.
// Поля с большой буквы ради «🎞 Визуализировать»: трасса печатает переменные через
// JSON, а неэкспортируемые поля он не видит — куча показывалась бы как [{}, {}].
type distItem struct{ Node, Dist int }

// distHeap — мин-куча по dist для container/heap.
type distHeap []distItem

func (h distHeap) Len() int           { return len(h) }
func (h distHeap) Less(i, j int) bool { return h[i].Dist < h[j].Dist }
func (h distHeap) Swap(i, j int)      { h[i], h[j] = h[j], h[i] }
func (h *distHeap) Push(x any)        { *h = append(*h, x.(distItem)) }
func (h *distHeap) Pop() any {
	old := *h
	it := old[len(old)-1]
	*h = old[:len(old)-1]
	return it
}

func Dijkstra(n int, edges [][]int, src int) []int {
	const inf = 1 << 62
	adj := make([][][2]int, n) // adj[u] — пары {v, w} рёбер u→v
	for _, e := range edges {
		adj[e[0]] = append(adj[e[0]], [2]int{e[1], e[2]})
	}
	dist := make([]int, n)
	for i := range dist {
		dist[i] = inf
	}
	dist[src] = 0
	h := &distHeap{{Node: src, Dist: 0}}
	for h.Len() > 0 {
		cur := heap.Pop(h).(distItem)
		if cur.Dist > dist[cur.Node] {
			continue // устаревшая запись: вершину уже закрыли с меньшим dist
		}
		for _, e := range adj[cur.Node] {
			to, w := e[0], e[1]
			if nd := cur.Dist + w; nd < dist[to] {
				dist[to] = nd
				heap.Push(h, distItem{Node: to, Dist: nd})
			}
		}
	}
	for i := range dist {
		if dist[i] == inf {
			dist[i] = -1
		}
	}
	return dist
}

func HasCycleDirected(n int, edges [][]int) bool {
	const (
		white = iota // ещё не были
		gray         // вызов идёт: вершина на текущем пути
		black        // вызов закончен: всё достижимое из неё проверено
	)
	adj := make([][]int, n)
	for _, e := range edges {
		adj[e[0]] = append(adj[e[0]], e[1])
	}
	color := make([]uint8, n)
	var dfs func(v int) bool
	dfs = func(v int) bool {
		color[v] = gray
		for _, u := range adj[v] {
			if color[u] == gray {
				return true // стрелка назад, в вершину на текущем пути
			}
			if color[u] == white && dfs(u) {
				return true
			}
		}
		color[v] = black
		return false
	}
	for v := 0; v < n; v++ {
		if color[v] == white && dfs(v) {
			return true
		}
	}
	return false
}
