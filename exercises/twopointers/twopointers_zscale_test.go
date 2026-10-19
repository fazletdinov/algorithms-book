package twopointers

import (
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
)

// TestPairWithTargetSumScales — сложность, а не ответ. Все числа чётные, target
// нечётный — пары нет. target лежит посреди диапазона сумм, поэтому перебор пар не
// спасают оба досрочных выхода: ни «сумма уже больше target — дальше j не идём»
// (для i < n/2 до target ещё n−2i шагов), ни «даже с самым большим arr[i] не
// дотянуться — пропусти i» (отсекается только i = 0): O(n²). Указатели с двух
// концов — O(n), бинарный поиск дополнения — O(n log n), оба укладываются.
func TestPairWithTargetSumScales(t *testing.T) {
	const n = 300000
	arr := make([]int, n)
	for i := range arr {
		arr[i] = 2 * i
	}
	target := 2*n - 1 // нечётный, а сумма двух чётных чётна
	var got []int
	scaletest.Within(t, scaletest.Limit,
		"PairWithTargetSum(n=300000, пары нет) — похоже на O(n²) там, где нужен O(n)"+
			" (замер: эталон < 1 мс, перебор ~8.7 с)",
		func() { got = PairWithTargetSum(arr, target) })
	if len(got) != 2 || got[0] != -1 || got[1] != -1 {
		t.Fatalf("PairWithTargetSum = %v, ожидалось [-1 -1]", got)
	}
}
