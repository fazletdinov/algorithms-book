package stack

import (
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
)

// TestLargestRectangleScales — сложность, а не ответ. Все столбики равны:
// расширение от каждого столбика влево и вправо проходит весь ряд, O(n²).
// Стек индексов — O(n).
func TestLargestRectangleScales(t *testing.T) {
	const n, h = 200000, 7
	heights := make([]int, n)
	for i := range heights {
		heights[i] = h
	}
	var got int
	scaletest.Within(t, scaletest.Limit,
		"LargestRectangle(n=200000, все высоты равны) — похоже на O(n²) там, где нужен O(n)"+
			" (замер: эталон < 1 мс, перебор ~10.8 с)",
		func() { got = LargestRectangle(heights) })
	if got != n*h {
		t.Fatalf("LargestRectangle = %d, ожидалось %d", got, n*h)
	}
}
