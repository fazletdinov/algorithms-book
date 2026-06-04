package mst

import (
	"reflect"
	"sort"
	"testing"
)

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

func TestMSTWeightPrim(t *testing.T) {
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
			if got := MSTWeightPrim(tt.n, tt.edges); got != tt.want {
				t.Errorf("MSTWeightPrim(%d, %v) = %d, ожидалось %d", tt.n, tt.edges, got, tt.want)
			}
		})
	}
}

// TestPrimEqualsKruskal сверяет, что алгоритм Прима даёт тот же вес, что и
// Краскал, на одних и тех же графах.
func TestPrimEqualsKruskal(t *testing.T) {
	graphs := []struct {
		name  string
		n     int
		edges [][]int
	}{
		{"квадрат с диагональю", 4,
			[][]int{{0, 1, 1}, {1, 2, 2}, {2, 3, 3}, {0, 3, 4}}},
		{"звезда", 4, [][]int{{0, 1, 1}, {0, 2, 2}, {0, 3, 3}}},
		{"треугольник", 3, [][]int{{0, 1, 1}, {1, 2, 2}, {0, 2, 3}}},
		{"плотный граф", 5,
			[][]int{{0, 1, 2}, {0, 2, 3}, {0, 3, 1}, {1, 2, 4}, {1, 4, 7},
				{2, 3, 5}, {2, 4, 6}, {3, 4, 8}}},
		{"несвязный", 4, [][]int{{0, 1, 1}, {2, 3, 2}}},
		{"одна вершина", 1, [][]int{}},
		{"параллельные рёбра", 2, [][]int{{0, 1, 5}, {0, 1, 2}, {0, 1, 9}}},
	}
	for _, g := range graphs {
		t.Run(g.name, func(t *testing.T) {
			k := MSTWeight(g.n, g.edges)
			p := MSTWeightPrim(g.n, g.edges)
			if k != p {
				t.Errorf("Краскал=%d, Прим=%d на %v", k, p, g.edges)
			}
		})
	}
}

func TestMSTWeightWithEdges(t *testing.T) {
	tests := []struct {
		name      string
		n         int
		edges     [][]int
		wantW     int
		wantEdges [][]int
	}{
		{"треугольник, два лёгких ребра", 3,
			[][]int{{0, 1, 1}, {1, 2, 2}, {0, 2, 3}},
			3, [][]int{{0, 1, 1}, {1, 2, 2}}},
		{"квадрат с диагональю", 4,
			[][]int{{0, 1, 1}, {1, 2, 2}, {2, 3, 3}, {0, 3, 4}},
			6, [][]int{{0, 1, 1}, {1, 2, 2}, {2, 3, 3}}},
		{"одна вершина", 1, [][]int{}, 0, [][]int{}},
		{"несвязный граф", 3, [][]int{{0, 1, 1}}, -1, nil},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w, got := MSTWeightWithEdges(tt.n, tt.edges)
			if w != tt.wantW {
				t.Errorf("вес = %d, ожидалось %d", w, tt.wantW)
			}
			normalizeEdges(got)
			normalizeEdges(tt.wantEdges)
			if w == -1 {
				if got != nil {
					t.Errorf("при несвязном графе рёбра = %v, ожидалось nil", got)
				}
				return
			}
			if !reflect.DeepEqual(got, tt.wantEdges) {
				t.Errorf("рёбра = %v, ожидалось %v", got, tt.wantEdges)
			}
		})
	}
}

// normalizeEdges приводит каждое ребро к виду [min,max,w] и сортирует список,
// чтобы сравнение не зависело от порядка обхода.
func normalizeEdges(edges [][]int) {
	for _, e := range edges {
		if e[0] > e[1] {
			e[0], e[1] = e[1], e[0]
		}
	}
	sort.Slice(edges, func(i, j int) bool {
		if edges[i][0] != edges[j][0] {
			return edges[i][0] < edges[j][0]
		}
		if edges[i][1] != edges[j][1] {
			return edges[i][1] < edges[j][1]
		}
		return edges[i][2] < edges[j][2]
	})
}
