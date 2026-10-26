package dsu

import "testing"

func TestUnionFindBasic(t *testing.T) {
	uf := NewUnionFind(6)
	if uf.Count() != 6 {
		t.Fatalf("Count() = %d, ожидалось 6", uf.Count())
	}
	if uf.Connected(0, 1) {
		t.Errorf("0 и 1 не должны быть связаны изначально")
	}

	if !uf.Union(0, 1) {
		t.Errorf("Union(0,1) = false, ожидалось true")
	}
	if !uf.Union(1, 2) {
		t.Errorf("Union(1,2) = false, ожидалось true")
	}
	if uf.Union(0, 2) {
		t.Errorf("Union(0,2) = true, ожидалось false (уже в одном множестве)")
	}
	if !uf.Connected(0, 2) {
		t.Errorf("0 и 2 должны быть связаны через 1")
	}
	if uf.Connected(0, 3) {
		t.Errorf("0 и 3 не должны быть связаны")
	}
	if uf.Count() != 4 {
		t.Errorf("Count() = %d, ожидалось 4 ({0,1,2},{3},{4},{5})", uf.Count())
	}

	uf.Union(3, 4)
	uf.Union(4, 5)
	uf.Union(2, 5)
	if uf.Count() != 1 {
		t.Errorf("Count() = %d, ожидалось 1 (всё связано)", uf.Count())
	}
	if !uf.Connected(0, 5) {
		t.Errorf("после слияния всех 0 и 5 должны быть связаны")
	}
}

func TestFindRedundantConnection(t *testing.T) {
	tests := []struct {
		name  string
		edges [][]int
		want  []int
	}{
		{"треугольник", [][]int{{1, 2}, {1, 3}, {2, 3}}, []int{2, 3}},
		{"цикл из четырёх и хвост после", [][]int{{1, 2}, {2, 3}, {3, 4}, {1, 4}, {1, 5}}, []int{1, 4}},
		{"цикл замыкает последняя связь", [][]int{{1, 2}, {2, 3}, {3, 1}}, []int{3, 1}},
		// цикл 2–4–3–5–2: из его связей позже всех стоит [2,5], а не первая [2,4]
		{"связи цикла вперемешку с чужими", [][]int{{3, 4}, {1, 2}, {2, 4}, {3, 5}, {2, 5}}, []int{2, 5}},
		{"цикл не через первый узел", [][]int{{1, 2}, {2, 3}, {3, 4}, {4, 2}}, []int{4, 2}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := FindRedundantConnection(tt.edges)
			if len(got) != 2 || got[0] != tt.want[0] || got[1] != tt.want[1] {
				t.Errorf("FindRedundantConnection(%v) = %v, ожидалось %v", tt.edges, got, tt.want)
			}
		})
	}
}

func TestValidTree(t *testing.T) {
	tests := []struct {
		name  string
		n     int
		edges [][]int
		want  bool
	}{
		{"звезда с хвостом", 5, [][]int{{0, 1}, {0, 2}, {0, 3}, {1, 4}}, true},
		{"лишнее ребро — цикл", 5, [][]int{{0, 1}, {1, 2}, {2, 3}, {1, 3}, {1, 4}}, false},
		{"одна вершина без рёбер", 1, nil, true},
		{"две вершины без ребра", 2, nil, false},
		// рёбер n−2: циклов нет, но кусков два
		{"два куска без цикла", 4, [][]int{{0, 1}, {2, 3}}, false},
		// рёбер ровно n−1, но одно ушло на цикл, и вершина 3 отрезана
		{"n−1 ребро, но цикл", 4, [][]int{{0, 1}, {1, 2}, {2, 0}}, false},
		{"цепочка задом наперёд", 4, [][]int{{3, 2}, {2, 1}, {1, 0}}, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := ValidTree(tt.n, tt.edges); got != tt.want {
				t.Errorf("ValidTree(%d, %v) = %v, ожидалось %v", tt.n, tt.edges, got, tt.want)
			}
		})
	}
}

func TestEquationsPossible(t *testing.T) {
	tests := []struct {
		name string
		eqs  []string
		want bool
	}{
		{"равенство и его отрицание", []string{"a==b", "b!=a"}, false},
		{"два равенства", []string{"b==a", "a==b"}, true},
		{"цепочка равенств", []string{"x==y", "y==z", "x!=z"}, false},
		{"неравенства не мешают", []string{"a!=b", "b==c", "c!=a"}, true},
		{"пусто", nil, true},
		{"сам с собой не равен", []string{"a!=a"}, false},
		{"сам с собой равен", []string{"a==a"}, true},
		// неравенство стоит раньше равенств, которые его ломают
		{"неравенство раньше равенств", []string{"a!=c", "a==b", "b==c"}, false},
		{"длинные имена", []string{"alpha==beta", "beta==gamma", "alpha!=delta"}, true},
		// имена — целые слова: "ab" и "a" — разные переменные
		{"имя — префикс другого", []string{"ab==a", "a!=b"}, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := EquationsPossible(tt.eqs); got != tt.want {
				t.Errorf("EquationsPossible(%q) = %v, ожидалось %v", tt.eqs, got, tt.want)
			}
		})
	}
}
