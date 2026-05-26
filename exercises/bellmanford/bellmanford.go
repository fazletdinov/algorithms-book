//go:build !solution

// Package bellmanford — кратчайшие пути с отрицательными весами (Bellman–Ford).
//
//	go test ./bellmanford/                 # ваши решения
//	go test -tags solution ./bellmanford/  # эталон
package bellmanford

// ShortestPath возвращает длину кратчайшего пути из src в dst в ОРИЕНТИРОВАННОМ
// графе с n вершинами. Каждое ребро задано как [u, v, w]; вес w может быть
// отрицательным (отрицательных циклов в тестах нет). Второе значение — false,
// если dst недостижима.
//
// Пример: n=3, edges=[[0,1,4],[0,2,5],[2,1,-3]], src=0, dst=1 -> (2, true).
//
// Ожидаемая сложность: O(V · E).
func ShortestPath(n int, edges [][]int, src, dst int) (int, bool) {
	// TODO: инициализируйте расстояния «бесконечностью», dist[src]=0; выполните
	// n-1 проходов релаксации всех рёбер (проверяя dist[u] != INF).
	panic("TODO: реализуйте ShortestPath")
}
