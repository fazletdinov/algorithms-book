package dp

import (
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
)

// TestCoinChangeScales — сложность, а не ответ. Монеты чётные, сумма нечётная —
// ответ −1, и рекурсия без запоминания перебирает все разложения: число вызовов
// растёт экспоненциально. Таблица dp или рекурсия с мемоизацией —
// O(amount · len(coins)).
//
// Рекурсия без мемоизации после срока крутится в горутине до выхода бинарника —
// поэтому тест масштаба стоит в файле, который идёт последним.
func TestCoinChangeScales(t *testing.T) {
	coins := []int{4, 6, 10}
	const amount = 9999
	var got int
	scaletest.Within(t, scaletest.Limit,
		"CoinChange(coins=[4 6 10], amount=9999) — похоже на экспоненциальный перебор там, где нужен"+
			" O(amount · len(coins)) (замер: эталон < 1 мс, перебор не завершается)",
		func() { got = CoinChange(coins, amount) })
	if got != -1 {
		t.Fatalf("CoinChange = %d, ожидалось -1", got)
	}
}
