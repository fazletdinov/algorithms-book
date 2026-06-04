package twoheaps

import (
	"math"
	"testing"
)

const eps = 1e-9

func TestMedianFinderSequence(t *testing.T) {
	tests := []struct {
		name string
		nums []int
		want []float64 // медиана после каждого добавления
	}{
		{"1,2,3", []int{1, 2, 3}, []float64{1, 1.5, 2}},
		{"поток 5,15,1,3", []int{5, 15, 1, 3}, []float64{5, 10, 5, 4}},
		{"пример из главы", []int{1, 5, 2, 3, 4}, []float64{1, 3, 2, 2.5, 3}},
		{"один элемент", []int{42}, []float64{42}},
		{"отрицательные числа", []int{-1, -2, -3}, []float64{-1, -1.5, -2}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mf := NewMedianFinder()
			for i, n := range tt.nums {
				mf.AddNum(n)
				if got := mf.FindMedian(); math.Abs(got-tt.want[i]) > eps {
					t.Errorf("после добавления %v FindMedian() = %v, ожидалось %v",
						tt.nums[:i+1], got, tt.want[i])
				}
			}
		})
	}
}

func TestMedianFinderEmpty(t *testing.T) {
	mf := NewMedianFinder()
	if got := mf.FindMedian(); math.Abs(got) > eps {
		t.Errorf("FindMedian() на пустом наборе = %v, ожидалось 0", got)
	}
}

func TestMedianFinderFinal(t *testing.T) {
	mf := NewMedianFinder()
	for _, n := range []int{5, 15, 1, 3} {
		mf.AddNum(n)
	}
	// отсортировано [1,3,5,15], медиана = (3+5)/2 = 4.0
	if got := mf.FindMedian(); math.Abs(got-4.0) > eps {
		t.Errorf("FindMedian() = %v, ожидалось 4.0", got)
	}
}

func TestSlidingWindowMedian(t *testing.T) {
	tests := []struct {
		name string
		nums []int
		k    int
		want []float64
	}{
		{"пример из главы", []int{1, 3, -1, -3, 5, 3, 6, 7}, 3, []float64{1, -1, -1, 3, 5, 6}},
		{"чётное окно", []int{1, 2, 3, 4}, 2, []float64{1.5, 2.5, 3.5}},
		{"окно равно длине", []int{2, 4, 6, 8}, 4, []float64{5}},
		{"окно один элемент", []int{5, 1, 3}, 1, []float64{5, 1, 3}},
		{"k больше длины", []int{1, 2}, 5, []float64{}},
		{"k ноль", []int{1, 2, 3}, 0, []float64{}},
		{"k отрицательное", []int{1, 2, 3}, -1, []float64{}},
		{"пустой срез", []int{}, 3, []float64{}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := SlidingWindowMedian(tt.nums, tt.k)
			if len(got) != len(tt.want) {
				t.Fatalf("SlidingWindowMedian(%v, %d) = %v, ожидалось %v",
					tt.nums, tt.k, got, tt.want)
			}
			for i := range got {
				if math.Abs(got[i]-tt.want[i]) > eps {
					t.Errorf("SlidingWindowMedian(%v, %d)[%d] = %v, ожидалось %v",
						tt.nums, tt.k, i, got[i], tt.want[i])
				}
			}
		})
	}
}

func TestMaximizeCapital(t *testing.T) {
	tests := []struct {
		name             string
		k, w             int
		profits, capital []int
		want             int
	}{
		{"пример 1", 2, 0, []int{1, 2, 3}, []int{0, 1, 1}, 4},
		{"пример 2", 3, 0, []int{1, 2, 3}, []int{0, 1, 2}, 6},
		{"один проект", 1, 0, []int{1, 2, 3}, []int{0, 1, 1}, 1},
		{"нет доступных проектов", 5, 0, []int{5}, []int{3}, 0},
		{"k больше числа проектов", 10, 0, []int{1, 2, 3}, []int{0, 0, 0}, 6},
		{"начальный капитал хватает на всё сразу", 2, 5, []int{4, 5, 6}, []int{0, 0, 0}, 16},
		{"нет проектов", 3, 7, []int{}, []int{}, 7},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := MaximizeCapital(tt.k, tt.w, tt.profits, tt.capital); got != tt.want {
				t.Errorf("MaximizeCapital(%d, %d, %v, %v) = %d, ожидалось %d",
					tt.k, tt.w, tt.profits, tt.capital, got, tt.want)
			}
		})
	}
}
