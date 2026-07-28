package combinatorics

import (
	"math"
	"math/rand"
	"testing"
)

func TestBinomial(t *testing.T) {
	cases := []struct{ n, k, want int }{
		{0, 0, 1}, {1, 0, 1}, {1, 1, 1}, {5, 2, 10}, {5, 3, 10},
		{5, 0, 1}, {5, 5, 1}, {5, -1, 0}, {5, 6, 0}, {-1, 0, 0},
		{10, 3, 120}, {20, 10, 184756}, {52, 5, 2598960},
		{61, 30, 232714176627630544}, {61, 31, 232714176627630544},
	}
	for _, c := range cases {
		if got := Binomial(c.n, c.k); got != c.want {
			t.Errorf("Binomial(%d, %d) = %d, want %d", c.n, c.k, got, c.want)
		}
	}
}

func TestPermutations(t *testing.T) {
	cases := []struct{ n, k, want int }{
		{0, 0, 1}, {5, 0, 1}, {5, 1, 5}, {5, 2, 20}, {5, 5, 120},
		{5, 6, 0}, {5, -1, 0}, {-3, 2, 0}, {11, 2, 110}, {10, 10, 3628800},
	}
	for _, c := range cases {
		if got := Permutations(c.n, c.k); got != c.want {
			t.Errorf("Permutations(%d, %d) = %d, want %d", c.n, c.k, got, c.want)
		}
	}
}

func TestCountDivisibleByAny(t *testing.T) {
	cases := []struct {
		n        int
		divisors []int
		want     int
	}{
		{30, []int{2, 3, 5}, 22},             // пример из главы
		{10, []int{2, 3, 5}, 8},              // 2,3,4,5,6,8,9,10
		{10, []int{2, 2, 0}, 5},              // дубликаты и нули игнорируются
		{10, nil, 0},                         // делителей нет
		{0, []int{2, 3}, 0},                  // пустой диапазон
		{10, []int{1}, 10},                   // на 1 делится всё
		{10, []int{7}, 1},                    // только 7
		{5, []int{11}, 0},                    // делитель больше n
		{10, []int{6, 10, 15}, 2},            // попарные НОК больше n — ветки обрываются
		{100, []int{10, 100}, 10},            // 100 кратно 10 — вложенные множества
		{100, []int{3, math.MaxInt / 2}, 33}, // НОК переполнил бы int без обрыва ветки
		{1000, []int{2, 3, 5, 7, 11}, 793},
	}
	for _, c := range cases {
		if got := CountDivisibleByAny(c.n, c.divisors); got != c.want {
			t.Errorf("CountDivisibleByAny(%d, %v) = %d, want %d", c.n, c.divisors, got, c.want)
		}
	}
}

func TestDerangements(t *testing.T) {
	cases := []struct{ n, want int }{
		{-1, 0}, {0, 1}, {1, 0}, {2, 1}, {3, 2}, {4, 9}, {5, 44},
		{6, 265}, {7, 1854}, {10, 1334961}, {20, 895014631192902121},
	}
	for _, c := range cases {
		if got := Derangements(c.n); got != c.want {
			t.Errorf("Derangements(%d) = %d, want %d", c.n, got, c.want)
		}
	}
}

// Дифференциальные тесты против независимых эталонов. Сид фиксирован →
// падение воспроизводимо.

// Binomial против треугольника Паскаля: таблица строится ТОЛЬКО сложениями,
// поэтому ошибиться в ней тем же способом, что в формуле, нельзя.
func TestBinomialRandomPascal(t *testing.T) {
	const maxN = 61 // предел, до которого промежуточные произведения влезают в int
	pascal := make([][]int, maxN+1)
	for n := 0; n <= maxN; n++ {
		pascal[n] = make([]int, n+1)
		pascal[n][0], pascal[n][n] = 1, 1
		for k := 1; k < n; k++ {
			pascal[n][k] = pascal[n-1][k-1] + pascal[n-1][k]
		}
	}
	rng := rand.New(rand.NewSource(1))
	for range 3000 {
		n := rng.Intn(maxN + 1)
		k := rng.Intn(n+5) - 2 // захватываем края k < 0 и k > n
		want := 0
		if k >= 0 && k <= n {
			want = pascal[n][k]
		}
		if got := Binomial(n, k); got != want {
			t.Fatalf("Binomial(%d, %d) = %d, Паскаль = %d", n, k, got, want)
		}
		if k >= 0 && k <= n {
			if got, sym := Binomial(n, k), Binomial(n, n-k); got != sym {
				t.Fatalf("симметрия нарушена: C(%d,%d)=%d, C(%d,%d)=%d", n, k, got, n, n-k, sym)
			}
		}
	}
}

// A(n, k) == C(n, k) · k! — независимая связка размещений с сочетаниями.
func TestPermutationsRandomVsBinomial(t *testing.T) {
	rng := rand.New(rand.NewSource(2))
	for range 2000 {
		n := rng.Intn(21) // до 20: A(20, 20) = 20! ещё влезает в int64
		k := rng.Intn(n+3) - 1
		want := 0
		if k >= 0 && k <= n {
			fact := 1
			for i := 2; i <= k; i++ {
				fact *= i
			}
			want = Binomial(n, k) * fact
		}
		if got := Permutations(n, k); got != want {
			t.Fatalf("Permutations(%d, %d) = %d, C(n,k)·k! = %d", n, k, got, want)
		}
	}
}

// Включение-исключение против наивного перебора O(n·|d|).
func TestCountDivisibleByAnyRandomVsNaive(t *testing.T) {
	rng := rand.New(rand.NewSource(3))
	for range 500 {
		n := rng.Intn(2000) + 1
		divisors := make([]int, rng.Intn(5)+1)
		for i := range divisors {
			divisors[i] = rng.Intn(30) // нули и дубликаты попадаются нарочно
		}
		want := 0
		for v := 1; v <= n; v++ {
			for _, d := range divisors {
				if d > 0 && v%d == 0 {
					want++
					break
				}
			}
		}
		if got := CountDivisibleByAny(n, divisors); got != want {
			t.Fatalf("CountDivisibleByAny(%d, %v) = %d, наивно = %d", n, divisors, got, want)
		}
	}
}

// Кроссчек рекурренты: деранжементы удовлетворяют и D(n) = n·D(n−1) + (−1)ⁿ.
func TestDerangementsAltRecurrence(t *testing.T) {
	for n := 1; n <= 20; n++ {
		sign := 1
		if n%2 == 1 {
			sign = -1
		}
		want := n*Derangements(n-1) + sign
		if got := Derangements(n); got != want {
			t.Fatalf("Derangements(%d) = %d, а n·D(n−1)+(−1)ⁿ = %d", n, got, want)
		}
	}
}
