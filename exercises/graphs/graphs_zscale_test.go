package graphs

import (
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
)

// TestShortestPathUnweightedScales — сложность, а не ответ. Граф — путь из n
// вершин. Поиск соседей перебором всего списка рёбер на каждой вершине —
// O(V·E); BFS по списку смежности — O(V + E).
//
// Осторожно с ручным прогоном: матрица смежности на 10⁵ вершин — около 10 ГБ.
// Runner книги остановит такой прогон пределом памяти, голый go test — нет.
func TestShortestPathUnweightedScales(t *testing.T) {
	const n = 100000
	edges := make([][]int, 0, n-1)
	for i := 0; i+1 < n; i++ {
		edges = append(edges, []int{i, i + 1})
	}
	var got int
	scaletest.Within(t, scaletest.Limit,
		"ShortestPathUnweighted(путь из 100000 вершин) — похоже на O(V·E) там, где нужен O(V + E)"+
			" (замер: эталон ~12 мс, перебор ~9.2 с)",
		func() { got = ShortestPathUnweighted(n, edges, 0, n-1) })
	if got != n-1 {
		t.Fatalf("ShortestPathUnweighted = %d, ожидалось %d", got, n-1)
	}
}

// Входы тестов масштаба ниже — на 2·10⁵ вершинах.
// Путь бьёт решения, где каждая вершина перебирает весь список рёбер (O(V·E)),
// посещённые ищутся линейно в срезе (O(V²)) или компоненты сливаются
// перекрашиванием всех вершин (O(V·E)). Звезда — вершина 0 и n−1 соседей —
// бьёт очередь или стек, у которых голову снимают копированием всего остатка
// (O(V²)): на пути очередь всё время из одной вершины.
// Предупреждение о матрице смежности из теста выше относится и к ним.
const scaleV = 200000

// scalePath — путь 0–1–…–(n−1); с gap ≥ 0 без ребра gap–(gap+1).
func scalePath(n, gap int) [][]int {
	edges := make([][]int, 0, n-1)
	for i := 0; i+1 < n; i++ {
		if i != gap {
			edges = append(edges, []int{i, i + 1})
		}
	}
	return edges
}

// scaleStar — звезда: рёбра 0–i для i = 1…n−1.
func scaleStar(n int) [][]int {
	edges := make([][]int, 0, n-1)
	for i := 1; i < n; i++ {
		edges = append(edges, []int{0, i})
	}
	return edges
}

func TestCountComponentsScales(t *testing.T) {
	edges := scalePath(scaleV, scaleV/2) // два пути по 100000 вершин
	var got int
	scaletest.Within(t, scaletest.Limit,
		"CountComponents(два пути по 100000 вершин) — похоже на O(V·E) или O(V²) там, где нужен O(V + E)"+
			" (замер: эталон ~25 мс, соседи перебором рёбер ~35 с, посещённые в срезе ~25 с, перекрашивание компонент ~11.5 с, матрица смежности ~33 с)",
		func() { got = CountComponents(scaleV, edges) })
	if got != 2 {
		t.Fatalf("CountComponents = %d, ожидалось 2", got)
	}
}

func TestHasCycleUndirectedScales(t *testing.T) {
	edges := scalePath(scaleV, -1) // дерево: цикла нет, обойти придётся всё
	var got bool
	scaletest.Within(t, scaletest.Limit,
		"HasCycleUndirected(путь из 200000 вершин, цикла нет) — похоже на O(V·E) или O(V²) там, где нужен O(V + E)"+
			" (замер: эталон ~30 мс, соседи перебором рёбер ~53 с, посещённые в срезе ~11.8 с, перекрашивание компонент ~11.9 с)",
		func() { got = HasCycleUndirected(scaleV, edges) })
	if got {
		t.Fatal("HasCycleUndirected(путь) = true, ожидалось false")
	}
}

func TestBFSOrderScales(t *testing.T) {
	path, star := scalePath(scaleV, -1), scaleStar(scaleV)
	var gotPath, gotStar []int
	scaletest.Within(t, scaletest.Limit,
		"BFSOrder(путь и звезда по 200000 вершин) — похоже на O(V·E) или O(V²) там, где нужен O(V + E)"+
			" (замер: эталон ~25 мс, соседи перебором рёбер ~99 с, посещённые в срезе ~29 с, очередь со сдвигом головы ~6.2 с)",
		func() {
			gotPath = BFSOrder(scaleV, path, 0)
			gotStar = BFSOrder(scaleV, star, 0)
		})
	checkIdentityOrder(t, "BFSOrder(путь)", gotPath, scaleV)
	checkIdentityOrder(t, "BFSOrder(звезда)", gotStar, scaleV)
}

// TestDFSOrderScales — путь заодно проверяет глубину: рекурсивный обход уходит
// на 10⁵ вызовов (стек горутины в Go растёт сам). Путь вдвое короче, чем у
// соседей: рекурсия на 2·10⁵ вызовов вывела бы эталон за срок.
func TestDFSOrderScales(t *testing.T) {
	path, star := scalePath(scaleV/2, -1), scaleStar(scaleV)
	var gotPath, gotStar []int
	scaletest.Within(t, scaletest.Limit,
		"DFSOrder(путь из 100000 и звезда из 200000 вершин) — похоже на O(V·E) или O(V²) там, где нужен O(V + E)"+
			" (замер: эталон ~35 мс, соседи перебором рёбер ~64 с, посещённые в срезе ~8.9 с, стек со вставкой в начало ~30 с)",
		func() {
			gotPath = DFSOrder(scaleV/2, path, 0)
			gotStar = DFSOrder(scaleV, star, 0)
		})
	checkIdentityOrder(t, "DFSOrder(путь)", gotPath, scaleV/2)
	checkIdentityOrder(t, "DFSOrder(звезда)", gotStar, scaleV)
}

func TestIsBipartiteScales(t *testing.T) {
	path, star := scalePath(scaleV, -1), scaleStar(scaleV)
	gotPath, gotStar := false, false
	scaletest.Within(t, scaletest.Limit,
		"IsBipartite(путь и звезда по 200000 вершин) — похоже на O(V·E) или O(V²) там, где нужен O(V + E)"+
			" (замер: эталон ~23 мс, соседи перебором рёбер ~117 с, очередь со сдвигом головы ~6.2 с)",
		func() {
			gotPath = IsBipartite(scaleV, path)
			gotStar = IsBipartite(scaleV, star)
		})
	if !gotPath || !gotStar {
		t.Fatalf("IsBipartite: путь %v, звезда %v — оба двудольные", gotPath, gotStar)
	}
}

// checkIdentityOrder — у пути и звезды из вершины 0 с соседями по возрастанию
// и BFS, и DFS дают порядок 0, 1, …, n−1.
func checkIdentityOrder(t *testing.T, what string, order []int, n int) {
	t.Helper()
	if len(order) != n {
		t.Fatalf("%s: %d вершин, ожидалось %d", what, len(order), n)
	}
	for i, v := range order {
		if v != i {
			t.Fatalf("%s: [%d] = %d, ожидалось %d", what, i, v, i)
		}
	}
}

func TestShortestPathRouteScales(t *testing.T) {
	edges := scalePath(scaleV, -1)
	var got []int
	scaletest.Within(t, scaletest.Limit,
		"ShortestPathRoute(путь из 200000 вершин) — похоже на O(V·E) или O(V²) там, где нужен O(V + E)"+
			" (замер: эталон ~15 мс, путь целиком в каждой записи очереди ~31 с, вставка в начало пути ~33 с)",
		func() { got = ShortestPathRoute(scaleV, edges, 0, scaleV-1) })
	checkIdentityOrder(t, "ShortestPathRoute(путь)", got, scaleV)
}

// scaleHub — вход против Дейкстры без кучи и без пропуска устаревших записей.
// Из 0 рёбра 0→a_i веса i (i = 1…k), из каждой a_i — в узел h веса 3k−2i: каждая
// следующая a_i улучшает dist[h] (3k−i), так что в куче копится k записей h, и все
// a_i закрываются раньше h (dist[h] ≥ 2k > k). Из h — k рёбер веса 1 в листья b_j.
// Без пропуска каждая из k записей h заново перебирает её k рёбер: k² вместо k.
// Выбор ближайшей линейным проходом по dist — O(V²) на V = 2k + 2.
func scaleHub(k int) (n int, edges [][]int, want []int) {
	n = 2*k + 2
	h := k + 1 // вершины: 0, a_i = i, h = k+1, b_j = k+1+j
	edges = make([][]int, 0, 3*k)
	want = make([]int, n)
	for i := 1; i <= k; i++ {
		edges = append(edges, []int{0, i, i}, []int{i, h, 3*k - 2*i})
		want[i] = i
	}
	want[h] = 2 * k
	for j := 1; j <= k; j++ {
		edges = append(edges, []int{h, h + j, 1})
		want[h+j] = 2*k + 1
	}
	return n, edges, want
}

func TestDijkstraScales(t *testing.T) {
	n, edges, want := scaleHub(scaleV/2 - 1)
	var got []int
	scaletest.Within(t, scaletest.Limit,
		"Dijkstra(200000 вершин, узел с 10⁵ входящими улучшениями и 10⁵ исходящими рёбрами) — похоже на O(V²) там, где нужен O((V + E)·log V)"+
			" (замер: эталон ~60 мс, ближайшая линейным проходом ~28 с, без пропуска устаревших записей ~7.6 с)",
		func() { got = Dijkstra(n, edges, 0) })
	if len(got) != n {
		t.Fatalf("Dijkstra: %d расстояний, ожидалось %d", len(got), n)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("Dijkstra: dist[%d] = %d, ожидалось %d", i, got[i], want[i])
		}
	}
}

// scaleDiamonds — цепочка ромбов без цикла: из вершины c идут две стрелки,
// c → a и c → b, обе сходятся в следующую вершину-стык. Ромбов k, вершин 3k + 1,
// стрелок 4k. Путей от начала до конца 2^k, а глубина обхода — около 2k.
func scaleDiamonds(k int) (n int, edges [][]int) {
	n = 3*k + 1
	edges = make([][]int, 0, 4*k)
	for i := 0; i < k; i++ {
		c, a, b, next := 3*i, 3*i+1, 3*i+2, 3*i+3
		edges = append(edges, []int{c, a}, []int{c, b}, []int{a, next}, []int{b, next})
	}
	return n, edges
}

// TestHasCycleDirectedScales — цепочка ромбов, цикла нет, обойти придётся всё.
// Бьёт два медленных варианта: «из каждой вершины свой обход со своими
// пометками» — O(V·(V + E)); «отметка только на текущем пути, снимается на
// выходе» (без чёрного цвета) — каждый путь проходится заново, их 2^k.
// Вариант «два цвета: посещённая = цикл» здесь быстр, но ошибается — его ловит
// табличный случай «ромб».
func TestHasCycleDirectedScales(t *testing.T) {
	n, edges := scaleDiamonds((scaleV - 1) / 3) // 199999 вершин, 266664 стрелки
	var got bool
	scaletest.Within(t, scaletest.Limit,
		"HasCycleDirected(цепочка из 66666 ромбов, цикла нет) — похоже на O(V·(V + E)) или экспоненту там, где нужен O(V + E)"+
			" (замер: эталон ~30 мс, обход из каждой вершины со своими пометками ~120 с, пометка только на пути — 2^66666 путей, не дождаться)",
		func() { got = HasCycleDirected(n, edges) })
	if got {
		t.Fatal("HasCycleDirected(цепочка ромбов) = true, ожидалось false")
	}
}
