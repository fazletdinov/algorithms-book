package greedy

import (
	"math"
	"testing"
)

func TestMaxNonOverlapping(t *testing.T) {
	tests := []struct {
		name      string
		intervals [][]int
		want      int
	}{
		{"перекрытие", [][]int{{1, 3}, {2, 4}, {3, 5}}, 2},
		{"все подряд", [][]int{{1, 2}, {2, 3}, {3, 4}}, 3},
		{"длинный мешает", [][]int{{1, 5}, {2, 3}, {3, 4}}, 2},
		{"пусто", [][]int{}, 0},
		{"один", [][]int{{1, 10}}, 1},
		{"полное перекрытие", [][]int{{1, 4}, {2, 4}, {1, 4}}, 1},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := MaxNonOverlapping(tt.intervals); got != tt.want {
				t.Errorf("MaxNonOverlapping(%v) = %d, ожидалось %d", tt.intervals, got, tt.want)
			}
		})
	}
}

func TestCanJump(t *testing.T) {
	tests := []struct {
		name string
		nums []int
		want bool
	}{
		{"можно", []int{2, 3, 1, 1, 4}, true},
		{"нельзя (застряли на 0)", []int{3, 2, 1, 0, 4}, false},
		{"один элемент", []int{0}, true},
		{"прыжок через нули", []int{2, 0, 0}, true},
		{"застряли", []int{1, 0, 1, 0}, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := CanJump(tt.nums); got != tt.want {
				t.Errorf("CanJump(%v) = %v, ожидалось %v", tt.nums, got, tt.want)
			}
		})
	}
}

func TestMinJumps(t *testing.T) {
	tests := []struct {
		name string
		nums []int
		want int
	}{
		{"два прыжка", []int{2, 3, 1, 1, 4}, 2},
		{"один прыжок", []int{2, 1}, 1},
		{"уже на месте", []int{0}, 0},
		{"длинный первый прыжок", []int{1, 1, 1, 1}, 3},
		{"перепрыгнуть всё", []int{5, 1, 1, 1, 1}, 1},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := MinJumps(tt.nums); got != tt.want {
				t.Errorf("MinJumps(%v) = %d, ожидалось %d", tt.nums, got, tt.want)
			}
		})
	}
}

func TestMaxProfit(t *testing.T) {
	tests := []struct {
		name   string
		prices []int
		want   int
	}{
		{"колебания", []int{7, 1, 5, 3, 6, 4}, 7},
		{"монотонный рост", []int{1, 2, 3, 4, 5}, 4},
		{"монотонное падение", []int{7, 6, 4, 3, 1}, 0},
		{"один день", []int{5}, 0},
		{"пусто", []int{}, 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := MaxProfit(tt.prices); got != tt.want {
				t.Errorf("MaxProfit(%v) = %d, ожидалось %d", tt.prices, got, tt.want)
			}
		})
	}
}

func TestFractionalKnapsack(t *testing.T) {
	const eps = 1e-9
	tests := []struct {
		name     string
		values   []int
		weights  []int
		capacity int
		want     float64
	}{
		{"классика", []int{60, 100, 120}, []int{10, 20, 30}, 50, 240.0},
		{"нулевая вместимость", []int{60, 100, 120}, []int{10, 20, 30}, 0, 0.0},
		{"всё влезает", []int{10, 20}, []int{1, 2}, 10, 30.0},
		{"только дробная часть", []int{100}, []int{50}, 25, 50.0},
		{"пусто", []int{}, []int{}, 10, 0.0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := FractionalKnapsack(tt.values, tt.weights, tt.capacity)
			if math.Abs(got-tt.want) > eps {
				t.Errorf("FractionalKnapsack(%v, %v, %d) = %v, ожидалось %v",
					tt.values, tt.weights, tt.capacity, got, tt.want)
			}
		})
	}
}
