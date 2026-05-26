package dijkstra

import "testing"

func TestShortestPath(t *testing.T) {
	tests := []struct {
		name     string
		n        int
		edges    [][]int
		src, dst int
		want     int
	}{
		{"обходной путь дешевле", 4,
			[][]int{{0, 1, 1}, {1, 2, 2}, {2, 3, 1}, {0, 2, 4}}, 0, 3, 4},
		{"прямое ребро", 2, [][]int{{0, 1, 7}}, 0, 1, 7},
		{"та же вершина", 3, [][]int{{0, 1, 5}}, 0, 0, 0},
		{"недостижима", 3, [][]int{{0, 1, 5}}, 0, 2, -1},
		{"выбор меньшего веса", 3,
			[][]int{{0, 1, 10}, {0, 2, 3}, {2, 1, 2}}, 0, 1, 5},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := ShortestPath(tt.n, tt.edges, tt.src, tt.dst); got != tt.want {
				t.Errorf("ShortestPath(%d, %v, %d, %d) = %d, ожидалось %d",
					tt.n, tt.edges, tt.src, tt.dst, got, tt.want)
			}
		})
	}
}
