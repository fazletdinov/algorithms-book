package recursion

import (
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
)

// TestFibScales — сложность, а не ответ. Наивная рекурсия Fib(n−1)+Fib(n−2)
// делает ~Fib(n) вызовов: на n = 90 это ~10¹⁸, она не закончится никогда.
// Мемоизация и две переменные — O(n), это микросекунды.
func TestFibScales(t *testing.T) {
	const n = 90
	var got int
	scaletest.Within(t, scaletest.Limit,
		"Fib(90) — похоже на O(2ⁿ) там, где нужен O(n)"+
			" (замер: эталон < 1 мс, наивная рекурсия на n=45 ~4.9 с, на n=50 ~53.8 с — ×1.6 на каждую единицу n)",
		func() { got = Fib(n) })
	if want := iterFib(n); got != want {
		t.Fatalf("Fib(%d) = %d, ожидалось %d", n, got, want)
	}
}

// TestPowerScales — сложность, а не ответ. exp ≈ 10¹⁸, а основания ±1, чтобы
// ответ не переполнил int. Умножение exp раз подряд — O(exp): 10¹⁸ умножений не
// закончатся никогда (рекурсия Power(base, exp−1)·base раньше упрётся в предел
// стека). Быстрое возведение — O(log exp), около 60 шагов.
func TestPowerScales(t *testing.T) {
	const exp = 1_000_000_000_000_000_001 // нечётная: (−1)^exp = −1
	var gotNeg, gotPos int
	scaletest.Within(t, scaletest.Limit,
		"Power(±1, 10¹⁸+1) — похоже на O(exp) там, где нужен O(log exp)"+
			" (замер: эталон < 1 мс, умножение в цикле на exp=10¹⁰ уже ~3.0 с)",
		func() {
			gotNeg = Power(-1, exp)
			gotPos = Power(1, exp)
		})
	if gotNeg != -1 || gotPos != 1 {
		t.Fatalf("Power(-1, %d) = %d, Power(1, %d) = %d; ожидалось -1 и 1", exp, gotNeg, exp, gotPos)
	}
}
