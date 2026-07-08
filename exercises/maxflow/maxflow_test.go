package maxflow

import "testing"

func TestMaxFlow(t *testing.T) {
	tests := []struct {
		name  string
		n     int
		edges [][]int
		s, t  int
		want  int
	}{
		{"один путь, узкое место", 4,
			[][]int{{0, 1, 5}, {1, 2, 3}, {2, 3, 4}}, 0, 3, 3},
		{"два параллельных пути", 4,
			[][]int{{0, 1, 1}, {0, 2, 1}, {1, 3, 1}, {2, 3, 1}}, 0, 3, 2},
		{"исток равен стоку", 2, [][]int{{0, 1, 5}}, 0, 0, 0},
		{"сток недостижим", 3, [][]int{{0, 1, 4}}, 0, 2, 0},
		{"ромб с перемычкой", 4,
			[][]int{{0, 1, 1000}, {0, 2, 1000}, {1, 2, 1}, {1, 3, 1000}, {2, 3, 1000}},
			0, 3, 2000},
		{"общий узкий выход", 4,
			[][]int{{0, 1, 3}, {0, 2, 5}, {1, 3, 4}, {2, 3, 2}}, 0, 3, 5},
		{"параллельные рёбра суммируются", 3,
			[][]int{{0, 1, 2}, {0, 1, 3}, {1, 2, 10}}, 0, 2, 5},
		{"классическая сеть на 6 вершин", 6,
			[][]int{{0, 1, 16}, {0, 2, 13}, {1, 2, 10}, {2, 1, 4}, {1, 3, 12},
				{3, 2, 9}, {2, 4, 14}, {4, 3, 7}, {3, 5, 20}, {4, 5, 4}},
			0, 5, 23},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := MaxFlow(tt.n, tt.edges, tt.s, tt.t); got != tt.want {
				t.Errorf("MaxFlow(%d, %v, %d, %d) = %d, ожидалось %d",
					tt.n, tt.edges, tt.s, tt.t, got, tt.want)
			}
		})
	}
}

func TestMaxBipartiteMatching(t *testing.T) {
	tests := []struct {
		name          string
		nLeft, nRight int
		edges         [][]int
		want          int
	}{
		{"полное паросочетание", 3, 3,
			[][]int{{0, 0}, {1, 1}, {2, 2}}, 3},
		{"конкуренция за одну вершину", 2, 2,
			[][]int{{0, 0}, {1, 0}}, 1},
		{"нужна увеличивающая цепь", 3, 3,
			[][]int{{0, 0}, {0, 1}, {1, 0}, {2, 1}}, 2},
		{"пример из шапки функции", 3, 3,
			[][]int{{0, 0}, {0, 1}, {1, 0}, {2, 1}}, 2},
		{"нет рёбер", 2, 2, [][]int{}, 0},
		{"звезда: один слева на всех", 1, 4,
			[][]int{{0, 0}, {0, 1}, {0, 2}, {0, 3}}, 1},
		{"пересадка освобождает вершину", 4, 4,
			[][]int{{0, 0}, {1, 0}, {1, 1}, {2, 1}, {2, 2}, {3, 2}}, 3},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := MaxBipartiteMatching(tt.nLeft, tt.nRight, tt.edges); got != tt.want {
				t.Errorf("MaxBipartiteMatching(%d, %d, %v) = %d, ожидалось %d",
					tt.nLeft, tt.nRight, tt.edges, got, tt.want)
			}
		})
	}
}
