package bellmanford

import "testing"

func TestShortestPath(t *testing.T) {
	tests := []struct {
		name      string
		n         int
		edges     [][]int
		src, dst  int
		wantDist  int
		wantReach bool
	}{
		{"только положительные", 4,
			[][]int{{0, 1, 1}, {1, 2, 2}, {2, 3, 1}}, 0, 3, 4, true},
		{"отрицательное ребро выгоднее", 3,
			[][]int{{0, 1, 4}, {0, 2, 5}, {2, 1, -3}}, 0, 1, 2, true},
		{"недостижима", 3, [][]int{{0, 1, 1}}, 0, 2, 0, false},
		{"та же вершина", 3, [][]int{{0, 1, 5}}, 0, 0, 0, true},
		{"ориентированность важна", 3,
			[][]int{{0, 1, 2}, {1, 2, 3}}, 2, 0, 0, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotDist, gotReach := ShortestPath(tt.n, tt.edges, tt.src, tt.dst)
			if gotReach != tt.wantReach {
				t.Fatalf("reachable = %v, ожидалось %v", gotReach, tt.wantReach)
			}
			if gotReach && gotDist != tt.wantDist {
				t.Errorf("dist = %d, ожидалось %d", gotDist, tt.wantDist)
			}
		})
	}
}

func TestHasNegativeCycle(t *testing.T) {
	tests := []struct {
		name  string
		n     int
		edges [][]int
		want  bool
	}{
		{"простой отрицательный цикл", 2,
			[][]int{{0, 1, 1}, {1, 0, -2}}, true},
		{"ациклический положительный", 4,
			[][]int{{0, 1, 1}, {1, 2, 2}, {2, 3, 1}}, false},
		{"есть отрицательное ребро, но цикла нет", 3,
			[][]int{{0, 1, 4}, {0, 2, 5}, {2, 1, -3}}, false},
		{"цикл с неотрицательной суммой", 3,
			[][]int{{0, 1, 2}, {1, 2, -1}, {2, 0, 1}}, false},
		{"отрицательный цикл из трёх вершин", 3,
			[][]int{{0, 1, 1}, {1, 2, -3}, {2, 0, 1}}, true},
		{"без рёбер", 3, [][]int{}, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := HasNegativeCycle(tt.n, tt.edges); got != tt.want {
				t.Errorf("HasNegativeCycle = %v, ожидалось %v", got, tt.want)
			}
		})
	}
}

func TestShortestPathWithAtMostKEdges(t *testing.T) {
	tests := []struct {
		name        string
		n           int
		edges       [][]int
		src, dst, k int
		want        int
	}{
		{"LeetCode 787, k=1", 3,
			[][]int{{0, 1, 100}, {1, 2, 100}, {0, 2, 500}}, 0, 2, 1, 500},
		{"LeetCode 787, k=2", 3,
			[][]int{{0, 1, 100}, {1, 2, 100}, {0, 2, 500}}, 0, 2, 2, 200},
		{"та же вершина", 3,
			[][]int{{0, 1, 5}}, 0, 0, 2, 0},
		{"недостижима при любом k", 3,
			[][]int{{0, 1, 1}}, 0, 2, 5, -1},
		{"не хватает рёбер", 4,
			[][]int{{0, 1, 1}, {1, 2, 1}, {2, 3, 1}}, 0, 3, 2, -1},
		{"k=0 — ни одного ребра", 2,
			[][]int{{0, 1, 1}}, 0, 1, 0, -1},
		{"отрицательное ребро в пределах k", 3,
			[][]int{{0, 1, 4}, {0, 2, 5}, {2, 1, -3}}, 0, 1, 2, 2},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := ShortestPathWithAtMostKEdges(tt.n, tt.edges, tt.src, tt.dst, tt.k); got != tt.want {
				t.Errorf("ShortestPathWithAtMostKEdges = %d, ожидалось %d", got, tt.want)
			}
		})
	}
}
