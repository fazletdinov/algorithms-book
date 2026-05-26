package graphs

import "testing"

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
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := HasCycleUndirected(tt.n, tt.edges); got != tt.want {
				t.Errorf("HasCycleUndirected(%d, %v) = %v, ожидалось %v", tt.n, tt.edges, got, tt.want)
			}
		})
	}
}
