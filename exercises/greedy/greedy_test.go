package greedy

import "testing"

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
