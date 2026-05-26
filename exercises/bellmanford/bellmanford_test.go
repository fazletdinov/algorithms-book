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
