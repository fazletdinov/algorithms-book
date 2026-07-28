package scc

import "testing"

func equal2D(a, b [][]int) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if len(a[i]) != len(b[i]) {
			return false
		}
		for j := range a[i] {
			if a[i][j] != b[i][j] {
				return false
			}
		}
	}
	return true
}

func equal1D(a, b []int) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}

func TestSCC(t *testing.T) {
	tests := []struct {
		name  string
		n     int
		edges [][]int
		want  [][]int
	}{
		{"пустой граф", 0, nil, nil},
		{"одна вершина", 1, nil, [][]int{{0}}},
		{"одна вершина с петлёй", 1, [][]int{{0, 0}}, [][]int{{0}}},
		{"цикл из трёх", 3,
			[][]int{{0, 1}, {1, 2}, {2, 0}}, [][]int{{0, 1, 2}}},
		{"цепочка (DAG): каждая вершина сама по себе", 3,
			[][]int{{0, 1}, {1, 2}}, [][]int{{0}, {1}, {2}}},
		{"цикл и одностороннее ребро", 5,
			[][]int{{0, 1}, {1, 2}, {2, 0}, {3, 4}},
			[][]int{{0, 1, 2}, {3}, {4}}},
		{"две компоненты через одностороннее ребро", 4,
			[][]int{{0, 1}, {1, 0}, {2, 3}, {3, 2}, {1, 2}},
			[][]int{{0, 1}, {2, 3}}},
		{"полный ориентированный граф", 3,
			[][]int{{0, 1}, {1, 0}, {0, 2}, {2, 0}, {1, 2}, {2, 1}},
			[][]int{{0, 1, 2}}},
		{"кратные рёбра не склеивают", 3,
			[][]int{{0, 1}, {0, 1}, {1, 2}},
			[][]int{{0}, {1}, {2}}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := SCC(tt.n, tt.edges); !equal2D(got, tt.want) {
				t.Errorf("SCC(%d, %v) = %v, ожидалось %v", tt.n, tt.edges, got, tt.want)
			}
		})
	}
}

func TestBridges(t *testing.T) {
	tests := []struct {
		name  string
		n     int
		edges [][]int
		want  [][]int
	}{
		{"пустой граф", 0, nil, nil},
		{"без рёбер", 3, nil, nil},
		{"одно ребро — мост", 2, [][]int{{0, 1}}, [][]int{{0, 1}}},
		{"дерево-цепочка: все рёбра мосты", 4,
			[][]int{{0, 1}, {1, 2}, {2, 3}},
			[][]int{{0, 1}, {1, 2}, {2, 3}}},
		{"звезда: все рёбра мосты", 4,
			[][]int{{0, 1}, {0, 2}, {0, 3}},
			[][]int{{0, 1}, {0, 2}, {0, 3}}},
		{"цикл: мостов нет", 3, [][]int{{0, 1}, {1, 2}, {2, 0}}, nil},
		{"полный граф: мостов нет", 4,
			[][]int{{0, 1}, {0, 2}, {0, 3}, {1, 2}, {1, 3}, {2, 3}}, nil},
		{"два цикла через перешеек", 6,
			[][]int{{0, 1}, {1, 2}, {2, 0}, {3, 4}, {4, 5}, {5, 3}, {2, 3}},
			[][]int{{2, 3}}},
		{"кратное ребро — не мост", 3,
			[][]int{{0, 1}, {0, 1}, {1, 2}},
			[][]int{{1, 2}}},
		{"петля не мешает", 2,
			[][]int{{0, 1}, {1, 1}},
			[][]int{{0, 1}}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := Bridges(tt.n, tt.edges); !equal2D(got, tt.want) {
				t.Errorf("Bridges(%d, %v) = %v, ожидалось %v", tt.n, tt.edges, got, tt.want)
			}
		})
	}
}

func TestArticulationPoints(t *testing.T) {
	tests := []struct {
		name  string
		n     int
		edges [][]int
		want  []int
	}{
		{"пустой граф", 0, nil, nil},
		{"одна вершина", 1, nil, nil},
		{"одно ребро", 2, [][]int{{0, 1}}, nil},
		{"путь из трёх: середина", 3, [][]int{{0, 1}, {1, 2}}, []int{1}},
		{"цепочка: все внутренние", 4,
			[][]int{{0, 1}, {1, 2}, {2, 3}}, []int{1, 2}},
		{"звезда: центр (случай корня DFS)", 4,
			[][]int{{0, 1}, {0, 2}, {0, 3}}, []int{0}},
		{"цикл: точек нет", 3, [][]int{{0, 1}, {1, 2}, {2, 0}}, nil},
		{"полный граф: точек нет", 4,
			[][]int{{0, 1}, {0, 2}, {0, 3}, {1, 2}, {1, 3}, {2, 3}}, nil},
		{"два цикла через перешеек", 6,
			[][]int{{0, 1}, {1, 2}, {2, 0}, {3, 4}, {4, 5}, {5, 3}, {2, 3}},
			[]int{2, 3}},
		{"кратное ребро: висячая вершина всё равно держится на 1", 3,
			[][]int{{0, 1}, {0, 1}, {1, 2}}, []int{1}},
		{"двойное ребро на двух вершинах: точек нет", 2,
			[][]int{{0, 1}, {0, 1}}, nil},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := ArticulationPoints(tt.n, tt.edges); !equal1D(got, tt.want) {
				t.Errorf("ArticulationPoints(%d, %v) = %v, ожидалось %v",
					tt.n, tt.edges, got, tt.want)
			}
		})
	}
}
