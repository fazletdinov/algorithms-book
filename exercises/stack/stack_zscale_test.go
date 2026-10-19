package stack

import (
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
)

// TestLargestRectangleScales — сложность, а не ответ. Расширение от каждого
// столбика влево и вправо — O(n²) на двух входах: на равных высотах каждый
// столбик расширяется на весь ряд, а на растущих — до конца вправо. Второй вход
// нужен против пропуска «столбик равен соседу слева — уже посчитан»: на равных
// он делает перебор линейным, на растущих равных соседей нет. Стек индексов — O(n).
func TestLargestRectangleScales(t *testing.T) {
	const n, h = 200000, 7
	equal := make([]int, n)
	rising := make([]int, n)
	for i := range equal {
		equal[i] = h
		rising[i] = i + 1
	}
	// у растущих лучший прямоугольник — высота rising[i] до конца ряда: (i+1)·(n−i)
	wantRising := 0
	for i := range rising {
		wantRising = max(wantRising, (i+1)*(n-i))
	}
	var gotEqual, gotRising int
	scaletest.Within(t, scaletest.Limit,
		"LargestRectangle(n=200000: равные и растущие высоты) — похоже на O(n²) там, где нужен O(n)"+
			" (замер: эталон ~3 мс, перебор ~15.7 с, перебор с пропуском равных ~5.2 с)",
		func() {
			gotEqual = LargestRectangle(equal)
			gotRising = LargestRectangle(rising)
		})
	if gotEqual != n*h {
		t.Fatalf("LargestRectangle(равные) = %d, ожидалось %d", gotEqual, n*h)
	}
	if gotRising != wantRising {
		t.Fatalf("LargestRectangle(растущие) = %d, ожидалось %d", gotRising, wantRising)
	}
}
