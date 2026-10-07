package graphs

import (
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
		{"без рёбер", 3, [][]int{}, false},
		{"цикл замыкает последнее ребро, концы в разных поддеревьях", 4, [][]int{{1, 3}, {2, 0}, {1, 0}, {3, 2}}, true},
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
