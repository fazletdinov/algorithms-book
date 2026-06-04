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

func TestShortestPathsFrom(t *testing.T) {
	tests := []struct {
		name  string
		n     int
		edges [][]int
		src   int
		want  []int
	}{
		{"ориентированный граф", 4,
			[][]int{{0, 1, 1}, {1, 2, 2}, {0, 2, 4}, {2, 3, 1}}, 0,
			[]int{0, 1, 3, 4}},
		{"недостижимые вершины", 4,
			[][]int{{0, 1, 5}, {1, 2, 3}}, 0,
			[]int{0, 5, 8, -1}},
		{"источник изолирован", 3,
			[][]int{{1, 2, 4}}, 0,
			[]int{0, -1, -1}},
		{"обходной путь дешевле", 3,
			[][]int{{0, 1, 10}, {0, 2, 3}, {2, 1, 2}}, 0,
			[]int{0, 5, 3}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ShortestPathsFrom(tt.n, tt.edges, tt.src)
			if len(got) != len(tt.want) {
				t.Fatalf("ShortestPathsFrom(%d, %v, %d) = %v, ожидалось %v",
					tt.n, tt.edges, tt.src, got, tt.want)
			}
			for i := range tt.want {
				if got[i] != tt.want[i] {
					t.Errorf("ShortestPathsFrom(%d, %v, %d) = %v, ожидалось %v",
						tt.n, tt.edges, tt.src, got, tt.want)
					break
				}
			}
		})
	}
}

func TestNetworkDelayTime(t *testing.T) {
	tests := []struct {
		name  string
		n     int
		edges [][]int
		src   int
		want  int
	}{
		{"цепочка", 4,
			[][]int{{0, 1, 1}, {1, 2, 2}, {2, 3, 1}}, 0, 4},
		{"звезда — максимум из лучей", 4,
			[][]int{{0, 1, 1}, {0, 2, 3}, {0, 3, 2}}, 0, 3},
		{"есть недостижимая вершина", 3,
			[][]int{{0, 1, 5}}, 0, -1},
		{"единственная вершина", 1,
			[][]int{}, 0, 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := NetworkDelayTime(tt.n, tt.edges, tt.src); got != tt.want {
				t.Errorf("NetworkDelayTime(%d, %v, %d) = %d, ожидалось %d",
					tt.n, tt.edges, tt.src, got, tt.want)
			}
		})
	}
}
