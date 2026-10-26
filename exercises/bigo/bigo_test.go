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

func TestMyQueue(t *testing.T) {
	q := NewMyQueue()
	if !q.Empty() {
		t.Fatalf("новая очередь: Empty = false, ожидалось true")
	}
	q.Push(1)
	q.Push(2)
	if got := q.Peek(); got != 1 {
		t.Fatalf("после Push(1), Push(2): Peek = %d, ожидалось 1", got)
	}
	if got := q.Pop(); got != 1 {
		t.Fatalf("Pop = %d, ожидалось 1", got)
	}
	if q.Empty() {
		t.Fatalf("в очереди остался 2: Empty = true, ожидалось false")
	}
	// Push после Pop: новый элемент встаёт ЗА уже стоящими, даже если часть их
	// уже переложена во второй стек.
	q.Push(3)
	q.Push(-4)
	for _, want := range []int{2, 3, -4} {
		if got := q.Peek(); got != want {
			t.Fatalf("Peek = %d, ожидалось %d", got, want)
		}
		if got := q.Pop(); got != want {
			t.Fatalf("Pop = %d, ожидалось %d", got, want)
		}
	}
	if !q.Empty() {
		t.Fatalf("все элементы сняты: Empty = false, ожидалось true")
	}
	// Очередь, опустевшая и наполненная снова, работает как новая; дубли — отдельные элементы.
	q.Push(5)
	q.Push(5)
	if got := q.Pop(); got != 5 || q.Empty() {
		t.Fatalf("Push(5), Push(5), Pop: Pop = %d, Empty = %v; ожидалось 5 и false", got, q.Empty())
	}
}
