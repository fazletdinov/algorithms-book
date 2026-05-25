package grids

import "testing"

func TestNumIslands(t *testing.T) {
	tests := []struct {
		name string
		grid [][]int
		want int
	}{
		{"два острова", [][]int{
			{1, 1, 0},
			{0, 1, 0},
			{0, 0, 1},
		}, 2},
		{"один большой остров", [][]int{
			{1, 1, 1},
			{1, 1, 1},
		}, 1},
		{"только вода", [][]int{
			{0, 0},
			{0, 0},
		}, 0},
		{"шахматка", [][]int{
			{1, 0, 1},
			{0, 1, 0},
			{1, 0, 1},
		}, 5},
		{"пустая сетка", [][]int{}, 0},
		{"одна клетка-суша", [][]int{{1}}, 1},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := NumIslands(tt.grid); got != tt.want {
				t.Errorf("NumIslands(%v) = %d, ожидалось %d", tt.grid, got, tt.want)
			}
		})
	}
}
