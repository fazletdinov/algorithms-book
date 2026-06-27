package recursion

import (
	"math/rand"
	"testing"
)

// Дифференциальные тесты против НЕЗАВИСИМЫХ итеративных эталонов. Сид фиксирован →
// падение воспроизводимо.

func iterFactorial(n int) int {
	r := 1
	for i := 2; i <= n; i++ {
		r *= i
	}
	return r
}

func iterFib(n int) int {
	a, b := 0, 1
	for i := 0; i < n; i++ {
		a, b = b, a+b
	}
	return a
}

func iterPower(base, exp int) int {
	r := 1
	for i := 0; i < exp; i++ {
		r *= base
	}
	return r
}

func iterSumDigits(n int) int {
	s := 0
	for n > 0 {
		s += n % 10
		n /= 10
	}
	return s
}

func TestFactorialRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(1))
	for range 2000 {
		n := rng.Intn(13) // 12! помещается в int64
		if got, want := Factorial(n), iterFactorial(n); got != want {
			t.Fatalf("Factorial(%d) = %d, want %d", n, got, want)
		}
	}
}

func TestFibRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(2))
	for range 2000 {
		n := rng.Intn(90) // Fib(90) ещё в пределах int64
		if got, want := Fib(n), iterFib(n); got != want {
			t.Fatalf("Fib(%d) = %d, want %d", n, got, want)
		}
	}
}

func TestPowerRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(3))
	for range 2000 {
		base := rng.Intn(11) - 5 // [-5..5], в т.ч. отрицательные
		exp := rng.Intn(13)
		if got, want := Power(base, exp), iterPower(base, exp); got != want {
			t.Fatalf("Power(%d, %d) = %d, want %d", base, exp, got, want)
		}
	}
}

func TestHanoiMovesRandom(t *testing.T) {
	for n := 0; n <= 30; n++ {
		if got, want := HanoiMoves(n), (1<<n)-1; got != want {
			t.Fatalf("HanoiMoves(%d) = %d, want %d", n, got, want)
		}
	}
}

func TestSumDigitsRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(4))
	for range 3000 {
		n := rng.Intn(1_000_000_000)
		if got, want := SumDigits(n), iterSumDigits(n); got != want {
			t.Fatalf("SumDigits(%d) = %d, want %d", n, got, want)
		}
	}
}
