package binarysearch

import (
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
)

// TestFindFirstLastScales — сложность, а не ответ. Все элементы равны target:
// «нашёл бинарным поиском, потом иду влево и вправо» проходит весь массив,
// O(n) на вызов. Два бинарных поиска границ — O(log n).
func TestFindFirstLastScales(t *testing.T) {
	const n, calls, target = 1000000, 30000, 5
	arr := make([]int, n)
	for i := range arr {
		arr[i] = target
	}
	var got []int
	scaletest.Within(t, scaletest.Limit,
		"FindFirstLast(n=1000000, все равны target, 30000 вызовов) — похоже на O(n) там, где нужен O(log n)"+
			" (замер: эталон ~2 мс, перебор ~9.2 с)",
		func() {
			for i := 0; i < calls; i++ {
				got = FindFirstLast(arr, target)
			}
		})
	if len(got) != 2 || got[0] != 0 || got[1] != n-1 {
		t.Fatalf("FindFirstLast = %v, ожидалось [0 %d]", got, n-1)
	}
}
