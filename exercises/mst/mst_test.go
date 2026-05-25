package mst

import "testing"

func TestMSTWeight(t *testing.T) {
	tests := []struct {
		name  string
		n     int
		edges [][]int
		want  int
	}{
		{"квадрат с диагональю", 4,
			[][]int{{0, 1, 1}, {1, 2, 2}, {2, 3, 3}, {0, 3, 4}}, 6},
		{"звезда", 4,
			[][]int{{0, 1, 1}, {0, 2, 2}, {0, 3, 3}}, 6},
		{"треугольник, берём два лёгких", 3,
			[][]int{{0, 1, 1}, {1, 2, 2}, {0, 2, 3}}, 3},
		{"несвязный граф", 3, [][]int{{0, 1, 1}}, -1},
		{"одна вершина", 1, [][]int{}, 0},
		{"параллельные рёбра", 2,
			[][]int{{0, 1, 5}, {0, 1, 2}, {0, 1, 9}}, 2},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := MSTWeight(tt.n, tt.edges); got != tt.want {
				t.Errorf("MSTWeight(%d, %v) = %d, ожидалось %d", tt.n, tt.edges, got, tt.want)
			}
		})
	}
}
