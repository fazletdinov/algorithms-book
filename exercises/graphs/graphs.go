//go:build !solution

// Package graphs — задачи на шаблон «Обход графов».
//
//	go test ./graphs/                 # ваши решения
//	go test -tags solution ./graphs/  # эталон
package graphs

// CountComponents возвращает число компонент связности неориентированного
// графа с n вершинами (0..n-1) и списком рёбер edges (каждое — пара [u, v]).
//
// Пример: n=5, edges=[[0,1],[1,2],[3,4]] -> 2.
//
// Ожидаемая сложность: O(V + E).
func CountComponents(n int, edges [][]int) int {
	// TODO: постройте список смежности, затем запускайте BFS/DFS из каждой
	// непосещённой вершины — число запусков и есть число компонент.
	panic("TODO: реализуйте CountComponents")
}

// HasCycleUndirected сообщает, есть ли цикл в неориентированном графе с n
// вершинами и рёбрами edges. Удобно решать через Union-Find: если оба конца
// ребра уже в одном множестве — ребро замыкает цикл.
//
// Пример: n=3, edges=[[0,1],[1,2],[2,0]] -> true.
//
// Ожидаемая сложность: O(E · α(n)).
func HasCycleUndirected(n int, edges [][]int) bool {
	// TODO: Union-Find с сжатием пути; при объединении проверяйте,
	// не находятся ли вершины уже в одной компоненте.
	panic("TODO: реализуйте HasCycleUndirected")
}
