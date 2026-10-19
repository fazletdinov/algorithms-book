package slidingwindow

import (
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
)

// TestMaxSlidingWindowScales — не про ответ, а про сложность. На строго
// убывающем ряду в каждом окне все элементы — кандидаты в будущие максимумы,
// и пересчёт максимума заново стоит k на окно: O(n·k). Монотонный дек — O(n),
// куча — O(n log k), обе укладываются.
func TestMaxSlidingWindowScales(t *testing.T) {
	const n, k = 400000, 200000
	arr := make([]int, n)
	for i := range arr {
		arr[i] = n - i
	}
	var got []int
	scaletest.Within(t, scaletest.Limit,
		"MaxSlidingWindow(n=400000, k=200000, убывающий ряд) — похоже на O(n·k) там, где нужен O(n)"+
			" (замер: эталон ~4 мс, перебор ~12.5 с)",
		func() { got = MaxSlidingWindow(arr, k) })
	// окно с началом i — это arr[i..i+k-1], его максимум arr[i] = n-i
	if len(got) != n-k+1 || got[0] != n || got[len(got)-1] != k {
		t.Fatalf("MaxSlidingWindow: len=%d, первый=%v, последний=%v; ожидалось len=%d, %d, %d",
			len(got), first(got), last(got), n-k+1, n, k)
	}
}

func first(a []int) any {
	if len(a) == 0 {
		return "нет"
	}
	return a[0]
}

func last(a []int) any {
	if len(a) == 0 {
		return "нет"
	}
	return a[len(a)-1]
}
