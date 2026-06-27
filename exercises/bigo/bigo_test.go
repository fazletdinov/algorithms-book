package bigo

import (
	"slices"
	"testing"
)

func TestMinStack(t *testing.T) {
	s := NewMinStack()
	s.Push(3)
	s.Push(5)
	if s.GetMin() != 3 {
		t.Fatalf("GetMin = %d, want 3", s.GetMin())
	}
	s.Push(2)
	s.Push(2)
	if s.GetMin() != 2 {
		t.Fatalf("GetMin = %d, want 2", s.GetMin())
	}
	if s.Top() != 2 {
		t.Fatalf("Top = %d, want 2", s.Top())
	}
	s.Pop()
	if s.GetMin() != 2 {
		t.Fatalf("after one Pop GetMin = %d, want 2", s.GetMin())
	}
	s.Pop()
	if s.GetMin() != 3 {
		t.Fatalf("after two Pop GetMin = %d, want 3", s.GetMin())
	}
	if s.Top() != 5 {
		t.Fatalf("Top = %d, want 5", s.Top())
	}
}

func TestNextGreaterElement(t *testing.T) {
	cases := []struct {
		in, want []int
	}{
		{[]int{2, 1, 3, 1}, []int{3, 3, -1, -1}},
		{[]int{1, 2, 3, 4}, []int{2, 3, 4, -1}},
		{[]int{4, 3, 2, 1}, []int{-1, -1, -1, -1}},
		{[]int{}, []int{}},
		{[]int{5}, []int{-1}},
	}
	for _, c := range cases {
		if got := NextGreaterElement(c.in); !slices.Equal(got, c.want) {
			t.Errorf("NextGreaterElement(%v) = %v, want %v", c.in, got, c.want)
		}
	}
}

func TestDailyTemperatures(t *testing.T) {
	cases := []struct {
		in, want []int
	}{
		{[]int{73, 74, 75, 71, 69, 72, 76, 73}, []int{1, 1, 4, 2, 1, 1, 0, 0}},
		{[]int{30, 40, 50, 60}, []int{1, 1, 1, 0}},
		{[]int{30, 60, 90}, []int{1, 1, 0}},
	}
	for _, c := range cases {
		if got := DailyTemperatures(c.in); !slices.Equal(got, c.want) {
			t.Errorf("DailyTemperatures(%v) = %v, want %v", c.in, got, c.want)
		}
	}
}

func TestCountCopies(t *testing.T) {
	cases := []struct{ n, want int }{
		{0, 0}, {1, 0}, {2, 1}, {3, 3}, {5, 7}, {8, 7}, {9, 15}, {16, 15},
	}
	for _, c := range cases {
		if got := CountCopies(c.n); got != c.want {
			t.Errorf("CountCopies(%d) = %d, want %d", c.n, got, c.want)
		}
	}
}
