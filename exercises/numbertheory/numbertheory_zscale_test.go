package numbertheory

import (
	"math/big"
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
)

// TestGCDScales — сложность, а не ответ. Числа до 10¹⁸, в том числе соседние
// числа Фибоначчи — худший вход Евклида (~85 шагов). Евклид — O(log min(a, b)).
// Перебор делителей от min(a, b) вниз (или от 1 вверх) — O(min(a, b)): при
// взаимно простых числах до 10¹⁸ он не кончится никогда.
func TestGCDScales(t *testing.T) {
	cases := []struct{ a, b, want int }{
		{1000000000000000000, 999999999999999999, 1},
		{679891637638612258, 420196140727489673, 1}, // F(87), F(86)
		{600000000000000000, 400000000000000000, 200000000000000000},
		{999999999999999989, 2, 1},
	}
	got := make([]int, len(cases))
	scaletest.Within(t, scaletest.Limit,
		"GCD(числа до 10¹⁸) — похоже на перебор делителей O(min(a, b)) вместо алгоритма Евклида"+
			" (замер: эталон < 1 мс, перебор делителей не кончается)",
		func() {
			for i, c := range cases {
				got[i] = GCD(c.a, c.b)
			}
		})
	for i, c := range cases {
		if got[i] != c.want {
			t.Fatalf("GCD(%d, %d) = %d, ожидалось %d", c.a, c.b, got[i], c.want)
		}
	}
}

// TestSieveOfEratosthenesScales — сложность, а не ответ. n = 2·10⁷. Решето —
// O(n log log n). Проверка каждого числа пробным делением до корня —
// O(n·√n / log n): только на 1270607 простых это ~2·10⁹ делений.
//
// Срок здесь — половина обычного: разрыв между решетом и пробным делением
// растёт лишь как √n / log n, и при n = 10⁷ он был ~55× (эталон ~40 мс,
// перебор ~2.1 с — на грани обычного срока). На 2·10⁷ с полсрока запас ~11×
// до эталона и ~6× до перебора.
func TestSieveOfEratosthenesScales(t *testing.T) {
	const n = 20000000
	var got []int
	scaletest.Within(t, scaletest.Limit/2,
		"SieveOfEratosthenes(2·10⁷) — похоже на IsPrime для каждого числа (O(n√n)) вместо решета"+
			" (замер: эталон ~85 мс, IsPrime каждого числа ~5.8 с)",
		func() { got = SieveOfEratosthenes(n) })
	if len(got) != 1270607 || got[0] != 2 || got[len(got)-1] != 19999999 {
		last := 0
		if len(got) > 0 {
			last = got[len(got)-1]
		}
		t.Fatalf("SieveOfEratosthenes(2·10⁷): %d простых, последнее %d; ожидалось 1270607 и 19999999", len(got), last)
	}
}

// TestPowModScales — сложность, а не ответ. exp ≈ 10¹⁸. Быстрое возведение —
// O(log exp) ≈ 60 умножений. Умножение в цикле exp раз — O(exp): не кончится.
func TestPowModScales(t *testing.T) {
	cases := []struct{ base, exp, m int }{
		{3, 1000000000000000000, 1000000007},
		{123456789, 999999999999999999, 2999999999},
		{2, 1 << 60, 998244353},
	}
	got := make([]int, len(cases))
	scaletest.Within(t, scaletest.Limit,
		"PowMod(exp ≈ 10¹⁸) — похоже на умножение в цикле exp раз (O(exp)) вместо быстрого возведения"+
			" (замер: эталон < 1 мс, умножение в цикле не кончается)",
		func() {
			for i, c := range cases {
				got[i] = PowMod(c.base, c.exp, c.m)
			}
		})
	for i, c := range cases {
		want := new(big.Int).Exp(big.NewInt(int64(c.base)), big.NewInt(int64(c.exp)), big.NewInt(int64(c.m))).Int64()
		if int64(got[i]) != want {
			t.Fatalf("PowMod(%d, %d, %d) = %d, ожидалось %d", c.base, c.exp, c.m, got[i], want)
		}
	}
}

// TestModInversePrimeScales — сложность, а не ответ. p = 10⁹+7, у каждого a
// обратный близок к p. Степень по Ферма — O(log p) ≈ 30 умножений. Перебор
// x = 1, 2, … до a·x ≡ 1 — O(p): ~10⁹ шагов на вызов, десять вызовов.
func TestModInversePrimeScales(t *testing.T) {
	const p = 1000000007
	bp := big.NewInt(p)
	as := make([]int, 10)
	for i := range as {
		inv := int64(p - 1 - 7*i)
		as[i] = int(new(big.Int).ModInverse(big.NewInt(inv), bp).Int64())
	}
	got := make([]int, len(as))
	scaletest.Within(t, scaletest.Limit,
		"ModInversePrime(a, 10⁹+7) ×10 — похоже на перебор x до a·x ≡ 1 (O(p)) вместо степени a^(p−2)"+
			" (замер: эталон < 1 мс, перебор ~9 с)",
		func() {
			for i, a := range as {
				got[i] = ModInversePrime(a, p)
			}
		})
	for i, a := range as {
		if want := p - 1 - 7*i; got[i] != want {
			t.Fatalf("ModInversePrime(%d, %d) = %d, ожидалось %d", a, p, got[i], want)
		}
	}
}

// TestBinomialModScales — сложность, а не ответ. 10⁵ запросов C(n, k) mod 10⁹+7
// при n около 10⁶ и k около n/2. Таблицы факториалов и обратных факториалов —
// O(N) один раз, затем O(1) на запрос. Подсчёт каждого запроса с нуля
// (k умножений и деление через обратный) — O(q·k) ≈ 5·10¹⁰.
func TestBinomialModScales(t *testing.T) {
	const p, q, maxN = 1000000007, 100000, 1000000
	queries := make([][2]int, q)
	for i := range queries {
		n := maxN - i%1000
		queries[i] = [2]int{n, n/2 - i%977}
	}
	var got []int
	scaletest.Within(t, scaletest.Limit,
		"BinomialMod(10⁵ запросов, n ≤ 10⁶) — похоже на подсчёт каждого C(n, k) с нуля за O(k) вместо таблиц n! и 1/n!"+
			" (замер: эталон ~20 мс, подсчёт с нуля ~500 с — 10³ запросов за 5 с)",
		func() { got = BinomialMod(queries, p) })
	if len(got) != q {
		t.Fatalf("BinomialMod: %d ответов, ожидалось %d", len(got), q)
	}
	// Сверка нескольких ответов независимым счётом: C(n, k) = n·(n−1)·…·(n−k+1) / k!.
	for _, i := range []int{0, 1, 4242, q - 1} {
		n, k := queries[i][0], queries[i][1]
		num, den := big.NewInt(1), big.NewInt(1)
		bp := big.NewInt(p)
		for j := 0; j < k; j++ {
			num.Mod(num.Mul(num, big.NewInt(int64(n-j))), bp)
			den.Mod(den.Mul(den, big.NewInt(int64(j+1))), bp)
		}
		want := num.Mod(num.Mul(num, den.ModInverse(den, bp)), bp).Int64()
		if int64(got[i]) != want {
			t.Fatalf("BinomialMod: C(%d, %d) mod %d = %d, ожидалось %d", n, k, p, got[i], want)
		}
	}
}
