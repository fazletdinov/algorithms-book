package astar

import "testing"

func TestShortestPath(t *testing.T) {
	tests := []struct {
		name string
		grid [][]int
		want int
	}{
		{"обход препятствия в центре", [][]int{
			{0, 0, 0},
			{0, 1, 0},
			{0, 0, 0},
		}, 4},
		{"открытое поле 2x2", [][]int{
			{0, 0},
			{0, 0},
		}, 2},
		{"одна клетка", [][]int{{0}}, 0},
		{"старт заблокирован", [][]int{
			{1, 0},
			{0, 0},
		}, -1},
		{"цель заблокирована", [][]int{
			{0, 0},
			{0, 1},
		}, -1},
		{"пути нет", [][]int{
			{0, 1},
			{1, 0},
		}, -1},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := ShortestPath(tt.grid); got != tt.want {
				t.Errorf("ShortestPath(%v) = %d, ожидалось %d", tt.grid, got, tt.want)
			}
		})
	}
}

func TestManhattanDistance(t *testing.T) {
	tests := []struct {
		name           string
		r1, c1, r2, c2 int
		want           int
	}{
		{"пример из условия", 0, 0, 2, 3, 5},
		{"совпадающие клетки", 4, 4, 4, 4, 0},
		{"только по строке", 1, 2, 5, 2, 4},
		{"только по столбцу", 3, 1, 3, 6, 5},
		{"обратный порядок симметричен", 2, 3, 0, 0, 5},
		{"диагональ", 0, 0, 3, 3, 6},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := ManhattanDistance(tt.r1, tt.c1, tt.r2, tt.c2); got != tt.want {
				t.Errorf("ManhattanDistance(%d,%d,%d,%d) = %d, ожидалось %d",
					tt.r1, tt.c1, tt.r2, tt.c2, got, tt.want)
			}
		})
	}
}

func TestPathExists(t *testing.T) {
	tests := []struct {
		name string
		grid [][]int
		want bool
	}{
		{"путь в обход стены", [][]int{
			{0, 0},
			{1, 0},
		}, true},
		{"цель отрезана стенами", [][]int{
			{0, 1},
			{1, 0},
		}, false},
		{"открытое поле 3x3", [][]int{
			{0, 0, 0},
			{0, 1, 0},
			{0, 0, 0},
		}, true},
		{"одна клетка", [][]int{{0}}, true},
		{"старт заблокирован", [][]int{
			{1, 0},
			{0, 0},
		}, false},
		{"цель заблокирована", [][]int{
			{0, 0},
			{0, 1},
		}, false},
		{"стена через всё поле", [][]int{
			{0, 0, 0},
			{1, 1, 1},
			{0, 0, 0},
		}, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := PathExists(tt.grid); got != tt.want {
				t.Errorf("PathExists(%v) = %v, ожидалось %v", tt.grid, got, tt.want)
			}
		})
	}
}
