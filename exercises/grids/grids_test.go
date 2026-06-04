package grids

import (
	"reflect"
	"testing"
)

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

func TestMaxAreaOfIsland(t *testing.T) {
	tests := []struct {
		name string
		grid [][]int
		want int
	}{
		{"остров площадью 3", [][]int{
			{1, 1, 0, 0},
			{1, 0, 0, 1},
			{0, 0, 1, 1},
		}, 3},
		{"только вода", [][]int{
			{0, 0},
			{0, 0},
		}, 0},
		{"один большой остров", [][]int{
			{1, 1, 1},
			{1, 1, 1},
		}, 6},
		{"одна клетка-суша", [][]int{{1}}, 1},
		{"пустая сетка", [][]int{}, 0},
		{"диагонали не соединяют", [][]int{
			{1, 0, 1},
			{0, 1, 0},
			{1, 0, 1},
		}, 1},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := MaxAreaOfIsland(tt.grid); got != tt.want {
				t.Errorf("MaxAreaOfIsland(%v) = %d, ожидалось %d", tt.grid, got, tt.want)
			}
		})
	}
}

func TestFloodFill(t *testing.T) {
	tests := []struct {
		name             string
		image            [][]int
		sr, sc, newColor int
		want             [][]int
	}{
		{"заливка центра", [][]int{
			{1, 1, 1},
			{1, 1, 0},
			{1, 0, 1},
		}, 1, 1, 2, [][]int{
			{2, 2, 2},
			{2, 2, 0},
			{2, 0, 1},
		}},
		{"цвет уже совпадает", [][]int{
			{0, 0, 0},
			{0, 1, 1},
		}, 1, 1, 1, [][]int{
			{0, 0, 0},
			{0, 1, 1},
		}},
		{"одна клетка", [][]int{{0}}, 0, 0, 5, [][]int{{5}}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := FloodFill(tt.image, tt.sr, tt.sc, tt.newColor); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("FloodFill(...) = %v, ожидалось %v", got, tt.want)
			}
		})
	}
}

func TestRottingOranges(t *testing.T) {
	tests := []struct {
		name string
		grid [][]int
		want int
	}{
		{"все сгниют за 4 минуты", [][]int{
			{2, 1, 1},
			{1, 1, 0},
			{0, 1, 1},
		}, 4},
		{"есть недостижимый свежий", [][]int{
			{2, 1, 1},
			{0, 1, 1},
			{1, 0, 1},
		}, -1},
		{"свежих нет", [][]int{{0, 2}}, 0},
		{"только свежий без гнилых", [][]int{{1}}, -1},
		{"пусто", [][]int{{0, 0}}, 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := RottingOranges(tt.grid); got != tt.want {
				t.Errorf("RottingOranges(%v) = %d, ожидалось %d", tt.grid, got, tt.want)
			}
		})
	}
}

func TestShortestPathInBinaryMatrix(t *testing.T) {
	tests := []struct {
		name string
		grid [][]int
		want int
	}{
		{"путь по диагонали", [][]int{
			{0, 1},
			{1, 0},
		}, 2},
		{"путь длиной 4", [][]int{
			{0, 0, 0},
			{1, 1, 0},
			{1, 1, 0},
		}, 4},
		{"финиш-стена", [][]int{{1, 0}}, -1},
		{"одна свободная клетка", [][]int{{0}}, 1},
		{"старт-стена", [][]int{
			{1, 0},
			{0, 0},
		}, -1},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := ShortestPathInBinaryMatrix(tt.grid); got != tt.want {
				t.Errorf("ShortestPathInBinaryMatrix(%v) = %d, ожидалось %d", tt.grid, got, tt.want)
			}
		})
	}
}
