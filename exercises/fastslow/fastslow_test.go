package fastslow

import (
	"testing"
)

func TestHasCycle(t *testing.T) {
	tests := []struct {
		name string
		vals []int
		pos  int
		want bool
	}{
		{"цикл в середине", []int{1, 2, 3, 4}, 1, true},
		{"цикл на голову", []int{1, 2, 3}, 0, true},
		{"без цикла", []int{1, 2, 3, 4}, -1, false},
		{"один узел без цикла", []int{1}, -1, false},
		{"один узел с циклом на себя", []int{1}, 0, true},
		{"пустой список", []int{}, -1, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			head := fromSliceWithCycle(tt.vals, tt.pos)
			if got := HasCycle(head); got != tt.want {
				t.Errorf("HasCycle(%v, pos=%d) = %v, ожидалось %v", tt.vals, tt.pos, got, tt.want)
			}
		})
	}
}

func TestDetectCycle(t *testing.T) {
	tests := []struct {
		name string
		vals []int
		pos  int
	}{
		{"цикл в середине", []int{1, 2, 3, 4}, 1},
		{"цикл на голову", []int{1, 2, 3}, 0},
		{"цикл на хвост", []int{1, 2, 3, 4}, 3},
		{"без цикла", []int{1, 2, 3, 4}, -1},
		{"один узел на себя", []int{1}, 0},
		{"пустой список", []int{}, -1},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			head := fromSliceWithCycle(tt.vals, tt.pos)
			// Ожидаемый узел начала цикла находим по ациклическому списку.
			want := nodeAt(fromSlice(tt.vals), tt.pos)
			got := DetectCycle(head)

			if tt.pos < 0 {
				if got != nil {
					t.Errorf("DetectCycle(%v) = узел(%d), ожидался nil", tt.vals, got.Val)
				}
				return
			}
			if got == nil {
				t.Fatalf("DetectCycle(%v, pos=%d) = nil, ожидался узел начала цикла", tt.vals, tt.pos)
			}
			if got.Val != want.Val {
				t.Errorf("DetectCycle(%v, pos=%d).Val = %d, ожидалось %d", tt.vals, tt.pos, got.Val, want.Val)
			}
		})
	}
}

func TestMiddleNode(t *testing.T) {
	tests := []struct {
		name    string
		vals    []int
		wantNil bool
		wantVal int
	}{
		{"нечётная длина", []int{1, 2, 3, 4, 5}, false, 3},
		{"чётная длина — второй центральный", []int{1, 2, 3, 4, 5, 6}, false, 4},
		{"чётная длина из двух", []int{1, 2}, false, 2},
		{"один узел", []int{1}, false, 1},
		{"пустой список", []int{}, true, 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			head := fromSlice(tt.vals)
			got := MiddleNode(head)
			if tt.wantNil {
				if got != nil {
					t.Errorf("MiddleNode(%v) = узел(%d), ожидался nil", tt.vals, got.Val)
				}
				return
			}
			if got == nil {
				t.Fatalf("MiddleNode(%v) = nil, ожидался узел со значением %d", tt.vals, tt.wantVal)
			}
			if got.Val != tt.wantVal {
				t.Errorf("MiddleNode(%v).Val = %d, ожидалось %d", tt.vals, got.Val, tt.wantVal)
			}
		})
	}
}

func TestIsHappyNumber(t *testing.T) {
	tests := []struct {
		name string
		n    int
		want bool
	}{
		{"счастливое 23", 23, true},
		{"несчастливое 12", 12, false},
		{"единица счастлива", 1, true},
		{"классическое 19", 19, true},
		{"несчастливое 2", 2, false},
		{"счастливое 7", 7, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := IsHappyNumber(tt.n); got != tt.want {
				t.Errorf("IsHappyNumber(%d) = %v, ожидалось %v", tt.n, got, tt.want)
			}
		})
	}
}

func TestCycleLength(t *testing.T) {
	tests := []struct {
		name string
		vals []int
		pos  int
		want int
	}{
		{"цикл из хвоста на индекс 2", []int{1, 2, 3, 4, 5, 6}, 2, 4},
		{"цикл на голову", []int{1, 2, 3}, 0, 3},
		{"цикл на хвост (сам на себя)", []int{1, 2, 3, 4}, 3, 1},
		{"цикл в середине", []int{1, 2, 3, 4}, 1, 3},
		{"без цикла", []int{1, 2, 3, 4}, -1, 0},
		{"один узел без цикла", []int{1}, -1, 0},
		{"пустой список", []int{}, -1, 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			head := fromSliceWithCycle(tt.vals, tt.pos)
			if got := CycleLength(head); got != tt.want {
				t.Errorf("CycleLength(%v, pos=%d) = %d, ожидалось %d", tt.vals, tt.pos, got, tt.want)
			}
		})
	}
}
