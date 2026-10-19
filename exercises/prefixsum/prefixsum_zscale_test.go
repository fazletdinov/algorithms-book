package prefixsum

import (
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
)

// TestRangeSumsScales — сложность, а не ответ. Каждый запрос — на весь ряд:
// сложение отрезка заново стоит n на запрос, O(n·q). Префиксные суммы — один
// проход и O(1) на запрос.
func TestRangeSumsScales(t *testing.T) {
	const n, q = 200000, 200000
	nums := make([]int, n)
	for i := range nums {
		nums[i] = 1
	}
	queries := make([][2]int, q)
	for i := range queries {
		queries[i] = [2]int{0, n - 1}
	}
	var got []int
	scaletest.Within(t, scaletest.Limit,
		"RangeSums(n=200000, q=200000, все запросы на весь ряд) — похоже на O(n·q) там, где нужен O(n + q)"+
			" (замер: эталон ~2 мс, перебор ~10.7 с)",
		func() { got = RangeSums(nums, queries) })
	if len(got) != q || got[0] != n || got[q-1] != n {
		t.Fatalf("RangeSums: len=%d; ожидалось %d ответов, каждый = %d", len(got), q, n)
	}
}
