package twopointers

import (
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
)

// TestPairWithTargetSumScales — сложность, а не ответ. target больше любой
// суммы пары, поэтому пары нет, а перебор пар с досрочным выходом «сумма уже
// больше target» не выходит ни разу: O(n²). Указатели с двух концов — O(n),
// бинарный поиск дополнения — O(n log n), оба укладываются.
func TestPairWithTargetSumScales(t *testing.T) {
	const n = 300000
	arr := make([]int, n)
	for i := range arr {
		arr[i] = i
	}
	target := 2 * n // наибольшая сумма пары — (n-2) + (n-1) < 2n
	var got []int
	scaletest.Within(t, scaletest.Limit,
		"PairWithTargetSum(n=300000, пары нет) — похоже на O(n²) там, где нужен O(n)"+
			" (замер: эталон < 1 мс, перебор ~17.5 с)",
		func() { got = PairWithTargetSum(arr, target) })
	if len(got) != 2 || got[0] != -1 || got[1] != -1 {
		t.Fatalf("PairWithTargetSum = %v, ожидалось [-1 -1]", got)
	}
}
