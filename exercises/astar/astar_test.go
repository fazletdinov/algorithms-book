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
