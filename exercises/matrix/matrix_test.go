package matrix

import (
	"reflect"
	"testing"
)

// clone — глубокая копия матрицы: функции этого пакета меняют вход на месте.
func clone(m [][]int) [][]int {
	if m == nil {
		return nil
	}
	out := make([][]int, len(m))
	for i := range m {
		out[i] = append([]int(nil), m[i]...)
	}
	return out
}

func TestSpiralOrder(t *testing.T) {
	tests := []struct {
		name   string
		matrix [][]int
		want   []int
	}{
		{"квадрат 3×3", [][]int{{1, 2, 3}, {4, 5, 6}, {7, 8, 9}}, []int{1, 2, 3, 6, 9, 8, 7, 4, 5}},
		{"широкая 3×4", [][]int{{1, 2, 3, 4}, {5, 6, 7, 8}, {9, 10, 11, 12}},
			[]int{1, 2, 3, 4, 8, 12, 11, 10, 9, 5, 6, 7}},
		{"две строки", [][]int{{1, 2, 3, 4}, {5, 6, 7, 8}}, []int{1, 2, 3, 4, 8, 7, 6, 5}},
		{"одна строка", [][]int{{1, 2, 3}}, []int{1, 2, 3}},
		{"один столбец", [][]int{{1}, {2}, {3}}, []int{1, 2, 3}},
		{"высокая 4×2", [][]int{{1, 2}, {3, 4}, {5, 6}, {7, 8}}, []int{1, 2, 4, 6, 8, 7, 5, 3}},
		{"высокая 4×3: в середине остаётся столбец", [][]int{{1, 2, 3}, {4, 5, 6}, {7, 8, 9}, {10, 11, 12}},
			[]int{1, 2, 3, 6, 9, 12, 11, 10, 7, 4, 5, 8}},
		{"квадрат 4×4", [][]int{{1, 2, 3, 4}, {5, 6, 7, 8}, {9, 10, 11, 12}, {13, 14, 15, 16}},
			[]int{1, 2, 3, 4, 8, 12, 16, 15, 14, 13, 9, 5, 6, 7, 11, 10}},
		{"одна клетка", [][]int{{7}}, []int{7}},
		{"дубли и отрицательные", [][]int{{-1, -1}, {0, -1}}, []int{-1, -1, -1, 0}},
		{"пустая матрица", [][]int{}, nil},
		{"nil", nil, nil},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			before := clone(tt.matrix)
			got := SpiralOrder(tt.matrix)
			if len(tt.want) == 0 {
				if len(got) != 0 {
					t.Fatalf("SpiralOrder(%v) = %v, ожидался пустой результат", tt.matrix, got)
				}
				return
			}
			if !reflect.DeepEqual(got, tt.want) {
				t.Fatalf("SpiralOrder(%v) = %v, ожидалось %v", tt.matrix, got, tt.want)
			}
			if !reflect.DeepEqual(tt.matrix, before) {
				t.Fatalf("SpiralOrder изменила матрицу: было %v, стало %v", before, tt.matrix)
			}
		})
	}
}

func TestRotate(t *testing.T) {
	tests := []struct {
		name   string
		matrix [][]int
		want   [][]int
	}{
		{"3×3", [][]int{{1, 2, 3}, {4, 5, 6}, {7, 8, 9}}, [][]int{{7, 4, 1}, {8, 5, 2}, {9, 6, 3}}},
		{"4×4", [][]int{{5, 1, 9, 11}, {2, 4, 8, 10}, {13, 3, 6, 7}, {15, 14, 12, 16}},
			[][]int{{15, 13, 2, 5}, {14, 3, 4, 1}, {12, 6, 8, 9}, {16, 7, 10, 11}}},
		{"2×2", [][]int{{1, 2}, {3, 4}}, [][]int{{3, 1}, {4, 2}}},
		{"1×1", [][]int{{42}}, [][]int{{42}}},
		{"отрицательные и дубли", [][]int{{-1, 0}, {-1, 0}}, [][]int{{-1, -1}, {0, 0}}},
		{"пустая", [][]int{}, [][]int{}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			m := clone(tt.matrix)
			rows := append([][]int(nil), m...)
			Rotate(m)
			if !reflect.DeepEqual(m, tt.want) {
				t.Fatalf("Rotate(%v): получилось %v, ожидалось %v", tt.matrix, m, tt.want)
			}
			for i := range m {
				if len(m[i]) > 0 && &m[i][0] != &rows[i][0] {
					t.Fatalf("Rotate: строка %d заменена новым срезом — поворот должен идти на месте", i)
				}
			}
		})
	}
}

func TestRotateFourTimesIsIdentity(t *testing.T) {
	m := [][]int{{1, 2, 3, 4, 5}, {6, 7, 8, 9, 10}, {11, 12, 13, 14, 15}, {16, 17, 18, 19, 20}, {21, 22, 23, 24, 25}}
	want := clone(m)
	for range 4 {
		Rotate(m)
	}
	if !reflect.DeepEqual(m, want) {
		t.Fatalf("четыре поворота 5×5 дали %v, ожидалась исходная матрица", m)
	}
}

func TestSetZeroes(t *testing.T) {
	tests := []struct {
		name   string
		matrix [][]int
		want   [][]int
	}{
		{"ноль в центре", [][]int{{1, 1, 1}, {1, 0, 1}, {1, 1, 1}}, [][]int{{1, 0, 1}, {0, 0, 0}, {1, 0, 1}}},
		{"нули в первой строке", [][]int{{0, 1, 2, 0}, {3, 4, 5, 2}, {1, 3, 1, 5}},
			[][]int{{0, 0, 0, 0}, {0, 4, 5, 0}, {0, 3, 1, 0}}},
		{"ноль только в первом столбце", [][]int{{1, 2, 3}, {0, 5, 6}, {7, 8, 9}},
			[][]int{{0, 2, 3}, {0, 0, 0}, {0, 8, 9}}},
		{"ноль в углу (0,0)", [][]int{{0, 2}, {3, 4}}, [][]int{{0, 0}, {0, 4}}},
		{"ноль в первой строке, не в углу", [][]int{{1, 0, 3}, {4, 5, 6}}, [][]int{{0, 0, 0}, {4, 0, 6}}},
		{"ноль внутри не трогает первую строку целиком", [][]int{{1, 2, 3}, {4, 5, 6}, {7, 8, 0}},
			[][]int{{1, 2, 0}, {4, 5, 0}, {0, 0, 0}}},
		{"нулей нет", [][]int{{1, 2}, {3, 4}}, [][]int{{1, 2}, {3, 4}}},
		{"всё нули", [][]int{{0, 0}, {0, 0}}, [][]int{{0, 0}, {0, 0}}},
		{"отрицательные", [][]int{{-1, -2}, {0, -3}}, [][]int{{0, -2}, {0, 0}}},
		{"одна строка", [][]int{{1, 0, 2}}, [][]int{{0, 0, 0}}},
		{"один столбец", [][]int{{1}, {0}, {2}}, [][]int{{0}, {0}, {0}}},
		{"1×1 не ноль", [][]int{{5}}, [][]int{{5}}},
		{"пустая", [][]int{}, [][]int{}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			m := clone(tt.matrix)
			SetZeroes(m)
			if !reflect.DeepEqual(m, tt.want) {
				t.Fatalf("SetZeroes(%v): получилось %v, ожидалось %v", tt.matrix, m, tt.want)
			}
		})
	}
}

func TestGameOfLife(t *testing.T) {
	tests := []struct {
		name  string
		board [][]int
		want  [][]int
	}{
		{"пример: глайдер", [][]int{{0, 1, 0}, {0, 0, 1}, {1, 1, 1}, {0, 0, 0}},
			[][]int{{0, 0, 0}, {1, 0, 1}, {0, 1, 1}, {0, 1, 0}}},
		{"блок 2×2 стабилен", [][]int{{1, 1}, {1, 1}}, [][]int{{1, 1}, {1, 1}}},
		{"мигалка: горизонталь → вертикаль", [][]int{{0, 0, 0}, {1, 1, 1}, {0, 0, 0}},
			[][]int{{0, 1, 0}, {0, 1, 0}, {0, 1, 0}}},
		{"одиночка умирает", [][]int{{0, 0, 0}, {0, 1, 0}, {0, 0, 0}}, [][]int{{0, 0, 0}, {0, 0, 0}, {0, 0, 0}}},
		{"перенаселение", [][]int{{1, 1, 1}, {1, 1, 1}, {1, 1, 1}}, [][]int{{1, 0, 1}, {0, 0, 0}, {1, 0, 1}}},
		{"рождение ровно от трёх", [][]int{{1, 1}, {1, 0}}, [][]int{{1, 1}, {1, 1}}},
		{"одна клетка", [][]int{{1}}, [][]int{{0}}},
		{"пустое поле", [][]int{}, [][]int{}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			b := clone(tt.board)
			GameOfLife(b)
			if !reflect.DeepEqual(b, tt.want) {
				t.Fatalf("GameOfLife(%v): получилось %v, ожидалось %v", tt.board, b, tt.want)
			}
		})
	}
}

func TestSearchMatrix(t *testing.T) {
	m := [][]int{{1, 3, 5, 7}, {10, 11, 16, 20}, {23, 30, 34, 60}}
	tests := []struct {
		name   string
		matrix [][]int
		target int
		want   bool
	}{
		{"есть в первой строке", m, 3, true},
		{"нет, между строками по значению", m, 13, false},
		{"первый элемент", m, 1, true},
		{"последний элемент", m, 60, true},
		{"первый элемент средней строки", m, 10, true},
		{"последний элемент первой строки", m, 7, true},
		{"меньше всех", m, 0, false},
		{"больше всех", m, 61, false},
		{"между концом строки и началом следующей", m, 8, false},
		{"одна строка", [][]int{{1, 3}}, 3, true},
		{"один столбец", [][]int{{1}, {3}, {5}}, 5, true},
		{"один столбец, нет", [][]int{{1}, {3}, {5}}, 4, false},
		{"отрицательные", [][]int{{-10, -5}, {-1, 0}}, -5, true},
		{"1×1, нет", [][]int{{1}}, 2, false},
		{"пустая", [][]int{}, 1, false},
		{"пустая строка", [][]int{{}}, 1, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := SearchMatrix(tt.matrix, tt.target); got != tt.want {
				t.Fatalf("SearchMatrix(%v, %d) = %v, ожидалось %v", tt.matrix, tt.target, got, tt.want)
			}
		})
	}
}

func TestSearchMatrixII(t *testing.T) {
	m := [][]int{{1, 4, 7, 11, 15}, {2, 5, 8, 12, 19}, {3, 6, 9, 16, 22}, {10, 13, 14, 17, 24}, {18, 21, 23, 26, 30}}
	tests := []struct {
		name   string
		matrix [][]int
		target int
		want   bool
	}{
		{"есть в середине", m, 5, true},
		{"нет", m, 20, false},
		{"левый верхний угол", m, 1, true},
		{"правый нижний угол", m, 30, true},
		{"левый нижний угол", m, 18, true},
		{"правый верхний угол", m, 15, true},
		{"меньше всех", m, 0, false},
		{"больше всех", m, 31, false},
		{"конец строки больше начала следующей", [][]int{{1, 9}, {2, 10}}, 2, true},
		{"одна строка", [][]int{{1, 3, 5}}, 3, true},
		{"один столбец", [][]int{{1}, {3}, {5}}, 4, false},
		{"дубли", [][]int{{1, 1}, {1, 2}}, 2, true},
		{"отрицательные", [][]int{{-5, -1}, {-4, 0}}, -4, true},
		{"пустая", [][]int{}, 1, false},
		{"пустая строка", [][]int{{}}, 1, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := SearchMatrixII(tt.matrix, tt.target); got != tt.want {
				t.Fatalf("SearchMatrixII(%v, %d) = %v, ожидалось %v", tt.matrix, tt.target, got, tt.want)
			}
		})
	}
}
