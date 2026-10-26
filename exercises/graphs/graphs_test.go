package graphs

import (
	"fmt"
	"reflect"
	"testing"
)

func TestCountComponents(t *testing.T) {
	tests := []struct {
		name  string
		n     int
		edges [][]int
		want  int
	}{
		{"две компоненты", 5, [][]int{{0, 1}, {1, 2}, {3, 4}}, 2},
		{"одна компонента", 5, [][]int{{0, 1}, {1, 2}, {2, 3}, {3, 4}}, 1},
		{"без рёбер", 4, [][]int{}, 4},
		{"одна вершина", 1, [][]int{}, 1},
		{"изолированная вершина", 4, [][]int{{0, 1}, {1, 2}}, 2},
		{"ребро записано от большей вершины к меньшей", 5, [][]int{{0, 1}, {1, 2}, {4, 1}}, 2},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := CountComponents(tt.n, tt.edges); got != tt.want {
				t.Errorf("CountComponents(%d, %v) = %d, ожидалось %d", tt.n, tt.edges, got, tt.want)
			}
		})
	}
}

func TestHasCycleUndirected(t *testing.T) {
	tests := []struct {
		name  string
		n     int
		edges [][]int
		want  bool
	}{
		{"треугольник", 3, [][]int{{0, 1}, {1, 2}, {2, 0}}, true},
		{"цепочка без цикла", 3, [][]int{{0, 1}, {1, 2}}, false},
		{"две раздельные компоненты", 4, [][]int{{0, 1}, {2, 3}}, false},
		{"цикл в одной компоненте", 4, [][]int{{0, 1}, {1, 2}, {2, 3}, {3, 1}}, true},
		{"цикл только во второй компоненте", 5, [][]int{{0, 1}, {2, 3}, {3, 4}, {4, 2}}, true},
		{"без рёбер", 3, [][]int{}, false},
		{"цикл замыкает последнее ребро, концы в разных поддеревьях", 4, [][]int{{1, 3}, {2, 0}, {1, 0}, {3, 2}}, true},
		// Два ребра между одной парой — цикл длины 2, петля — цикл длины 1: условие называет оба.
		// Union-Find (прежний эталон) отвечал на них true, обход обязан отвечать так же.
		{"кратное ребро", 2, [][]int{{0, 1}, {0, 1}}, true},
		{"кратное ребро записано в обе стороны", 2, [][]int{{0, 1}, {1, 0}}, true},
		{"петля", 1, [][]int{{0, 0}}, true},
		{"петля в стороне от дерева", 3, [][]int{{0, 1}, {1, 2}, {2, 2}}, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := HasCycleUndirected(tt.n, tt.edges); got != tt.want {
				t.Errorf("HasCycleUndirected(%d, %v) = %v, ожидалось %v", tt.n, tt.edges, got, tt.want)
			}
		})
	}
}

func TestBFSOrder(t *testing.T) {
	tests := []struct {
		name  string
		n     int
		edges [][]int
		start int
		want  []int
	}{
		{"из примера", 6, [][]int{{0, 1}, {0, 2}, {1, 3}, {2, 4}, {3, 5}}, 0, []int{0, 1, 2, 3, 4, 5}},
		{"одна вершина", 1, [][]int{}, 0, []int{0}},
		{"старт не из нуля", 6, [][]int{{0, 1}, {0, 2}, {1, 3}, {2, 4}, {3, 5}}, 2, []int{2, 0, 4, 1, 3, 5}},
		{"несвязный — только своя компонента", 5, [][]int{{0, 1}, {3, 4}}, 0, []int{0, 1}},
		{"рёбра в обратном порядке — соседей всё равно по возрастанию", 4, [][]int{{0, 3}, {0, 2}, {0, 1}}, 0, []int{0, 1, 2, 3}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := BFSOrder(tt.n, tt.edges, tt.start); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("BFSOrder(%d, %v, %d) = %v, ожидалось %v", tt.n, tt.edges, tt.start, got, tt.want)
			}
		})
	}
}

func TestDFSOrder(t *testing.T) {
	tests := []struct {
		name  string
		n     int
		edges [][]int
		start int
		want  []int
	}{
		{"из примера", 6, [][]int{{0, 1}, {0, 2}, {1, 3}, {2, 4}, {3, 5}}, 0, []int{0, 1, 3, 5, 2, 4}},
		{"одна вершина", 1, [][]int{}, 0, []int{0}},
		{"несвязный — только своя компонента", 5, [][]int{{0, 1}, {3, 4}}, 0, []int{0, 1}},
		{"рёбра в обратном порядке — соседей всё равно по возрастанию", 4, [][]int{{0, 3}, {0, 2}, {0, 1}}, 0, []int{0, 1, 2, 3}},
		// Рекурсия входит в 2 из 3, раньше чем вернётся к 4. Стек, помечающий вершину при
		// добавлении, «бронирует» 2 за стартом и даёт [0 1 3 4 2] — порядок не тот.
		{"сосед старта достижим глубже", 5, [][]int{{0, 1}, {0, 2}, {1, 3}, {1, 4}, {2, 3}}, 0, []int{0, 1, 3, 2, 4}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := DFSOrder(tt.n, tt.edges, tt.start); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("DFSOrder(%d, %v, %d) = %v, ожидалось %v", tt.n, tt.edges, tt.start, got, tt.want)
			}
		})
	}
}

func TestShortestPathUnweighted(t *testing.T) {
	tests := []struct {
		name     string
		n        int
		edges    [][]int
		src, dst int
		want     int
	}{
		{"из примера", 6, [][]int{{0, 1}, {0, 2}, {1, 3}, {2, 4}, {3, 5}}, 0, 5, 3},
		{"src == dst", 6, [][]int{{0, 1}, {0, 2}, {1, 3}, {2, 4}, {3, 5}}, 0, 0, 0},
		{"соседняя вершина", 6, [][]int{{0, 1}, {0, 2}, {1, 3}, {2, 4}, {3, 5}}, 0, 1, 1},
		{"недостижима", 6, [][]int{{0, 1}, {0, 2}, {1, 3}, {2, 4}}, 0, 5, -1},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := ShortestPathUnweighted(tt.n, tt.edges, tt.src, tt.dst); got != tt.want {
				t.Errorf("ShortestPathUnweighted(%d, %v, %d, %d) = %d, ожидалось %d", tt.n, tt.edges, tt.src, tt.dst, got, tt.want)
			}
		})
	}
}

func TestIsBipartite(t *testing.T) {
	tests := []struct {
		name  string
		n     int
		edges [][]int
		want  bool
	}{
		{"чётный цикл", 4, [][]int{{0, 1}, {1, 2}, {2, 3}, {3, 0}}, true},
		{"треугольник", 3, [][]int{{0, 1}, {1, 2}, {2, 0}}, false},
		{"без рёбер", 3, [][]int{}, true},
		{"несвязный с нечётным циклом", 6, [][]int{{0, 1}, {2, 3}, {3, 4}, {4, 2}}, false},
		{"две раздельные пары", 4, [][]int{{0, 1}, {2, 3}}, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := IsBipartite(tt.n, tt.edges); got != tt.want {
				t.Errorf("IsBipartite(%d, %v) = %v, ожидалось %v", tt.n, tt.edges, got, tt.want)
			}
		})
	}
}

// checkRoute — свойства кратчайшего пути, а не один конкретный путь: при
// нескольких кратчайших годится любой. want — длина в рёбрах, -1 — пути нет.
func checkRoute(t *testing.T, n int, edges [][]int, src, dst int, route []int, want int) {
	t.Helper()
	call := func() string {
		return fmt.Sprintf("ShortestPathRoute(%d, %v, %d, %d) = %v", n, edges, src, dst, route)
	}
	if want == -1 {
		if len(route) != 0 {
			t.Fatalf("%s, ожидался пустой путь: dst недостижима", call())
		}
		return
	}
	if len(route) != want+1 {
		t.Fatalf("%s: %d рёбер, кратчайший путь — %d", call(), len(route)-1, want)
	}
	if route[0] != src || route[len(route)-1] != dst {
		t.Fatalf("%s: путь обязан начинаться в %d и кончаться в %d", call(), src, dst)
	}
	has := map[[2]int]bool{}
	for _, e := range edges {
		has[[2]int{e[0], e[1]}], has[[2]int{e[1], e[0]}] = true, true
	}
	for i := 0; i+1 < len(route); i++ {
		if !has[[2]int{route[i], route[i+1]}] {
			t.Fatalf("%s: ребра %d–%d в графе нет", call(), route[i], route[i+1])
		}
	}
}

func TestShortestPathRoute(t *testing.T) {
	sample := [][]int{{0, 1}, {0, 2}, {1, 3}, {2, 4}, {3, 5}}
	tests := []struct {
		name     string
		n        int
		edges    [][]int
		src, dst int
		want     int // длина кратчайшего пути в рёбрах, -1 — недостижима
	}{
		{"из примера", 6, sample, 0, 5, 3},
		{"src == dst — путь из одной вершины", 6, sample, 0, 0, 0},
		{"соседняя вершина", 6, sample, 0, 1, 1},
		{"в обратную сторону", 6, sample, 5, 4, 5},
		{"недостижима", 6, [][]int{{0, 1}, {0, 2}, {1, 3}, {2, 4}}, 0, 5, -1},
		{"два кратчайших — любой", 4, [][]int{{0, 1}, {0, 2}, {1, 3}, {2, 3}}, 0, 3, 2},
		// Длинная дорога найдена раньше: DFS дошёл бы 0→1→2→3→4, BFS — по ребру 0–4.
		{"короткий путь не первый в списке рёбер", 5, [][]int{{0, 1}, {1, 2}, {2, 3}, {3, 4}, {0, 4}}, 0, 3, 2},
		// Стек вместо очереди уходит 0→2→4→3, хотя через 1 — два ребра.
		{"обход стеком даёт путь длиннее", 5, [][]int{{0, 1}, {0, 2}, {1, 3}, {2, 4}, {4, 3}}, 0, 3, 2},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ShortestPathRoute(tt.n, tt.edges, tt.src, tt.dst)
			checkRoute(t, tt.n, tt.edges, tt.src, tt.dst, got, tt.want)
		})
	}
}

func TestDijkstra(t *testing.T) {
	tests := []struct {
		name  string
		n     int
		edges [][]int
		src   int
		want  []int
	}{
		{"из примера: в обход дешевле", 4, [][]int{{0, 1, 4}, {0, 2, 1}, {2, 1, 2}, {1, 3, 1}}, 0, []int{0, 3, 1, 4}},
		// BFS дал бы вершине 3 путь в одно ребро весом 10, хотя по трём рёбрам — 3.
		{"меньше рёбер — не значит дешевле", 4, [][]int{{0, 3, 10}, {0, 1, 1}, {1, 2, 1}, {2, 3, 1}}, 0, []int{0, 1, 2, 3}},
		{"ребро ориентировано: назад не пройти", 3, [][]int{{1, 0, 1}, {0, 2, 5}}, 0, []int{0, -1, 5}},
		{"недостижимые вершины", 4, [][]int{{0, 1, 5}, {1, 2, 3}}, 0, []int{0, 5, 8, -1}},
		{"одна вершина", 1, [][]int{}, 0, []int{0}},
		{"старт не из нуля", 3, [][]int{{2, 0, 7}, {0, 1, 1}}, 2, []int{7, 8, 0}},
		{"рёбра нулевого веса", 3, [][]int{{0, 1, 0}, {1, 2, 0}}, 0, []int{0, 0, 0}},
		{"кратные рёбра — берём дешёвое", 2, [][]int{{0, 1, 9}, {0, 1, 2}}, 0, []int{0, 2}},
		// Вершину 1 сначала кладут в кучу с dist 10, потом с 2: запись (1, 10) устаревает.
		{"устаревшая запись в куче", 4, [][]int{{0, 1, 10}, {0, 2, 1}, {2, 1, 1}, {1, 3, 1}}, 0, []int{0, 2, 1, 3}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := Dijkstra(tt.n, tt.edges, tt.src); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("Dijkstra(%d, %v, %d) = %v, ожидалось %v", tt.n, tt.edges, tt.src, got, tt.want)
			}
		})
	}
}

func TestHasCycleDirected(t *testing.T) {
	tests := []struct {
		name  string
		n     int
		edges [][]int
		want  bool
	}{
		{"пустой граф", 0, [][]int{}, false},
		{"вершины без рёбер", 3, [][]int{}, false},
		{"петля", 1, [][]int{{0, 0}}, true},
		{"две стрелки навстречу", 2, [][]int{{0, 1}, {1, 0}}, true},
		{"треугольник по стрелкам", 3, [][]int{{0, 1}, {1, 2}, {2, 0}}, true},
		{"цепочка", 3, [][]int{{0, 1}, {1, 2}}, false},
		// Ловушка двух цветов: из 0 обход доходит до 3 через 1 и заканчивает её,
		// потом из 2 снова видит 3 — посещённую, но законченную. Это не цикл.
		{"ромб: две дороги в одну вершину", 4, [][]int{{0, 1}, {0, 2}, {1, 3}, {2, 3}}, false},
		{"стрелка в вершину, законченную прошлым запуском", 2, [][]int{{1, 0}}, false},
		{"две одинаковые стрелки", 2, [][]int{{0, 1}, {0, 1}}, false},
		{"цикл недостижим из вершины 0", 4, [][]int{{0, 1}, {2, 3}, {3, 2}}, true},
		{"цикл в конце пути", 4, [][]int{{0, 1}, {1, 2}, {2, 3}, {3, 1}}, true},
		{"треугольник против стрелок — не цикл", 3, [][]int{{0, 1}, {1, 2}, {0, 2}}, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := HasCycleDirected(tt.n, tt.edges); got != tt.want {
				t.Errorf("HasCycleDirected(%d, %v) = %v, ожидалось %v", tt.n, tt.edges, got, tt.want)
			}
		})
	}
}
