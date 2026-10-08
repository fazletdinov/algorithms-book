package numbertheory

import (
	"math/big"
	"math/rand"
	"testing"
)

// Дифференциальные тесты против math/big — независимого эталона. Сид фиксирован →
// падение воспроизводимо.
func TestGCDRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(1))
	for range 2000 {
		a, b := rng.Intn(100000), rng.Intn(100000)
		got := GCD(a, b)
		want := int(new(big.Int).GCD(nil, nil, big.NewInt(int64(a)), big.NewInt(int64(b))).Int64())
		if got != want {
			t.Fatalf("GCD(%d, %d) = %d, big = %d", a, b, got, want)
		}
	}
}

func TestIsPrimeRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(2))
	for range 3000 {
		n := rng.Intn(50000)
		got := IsPrime(n)
		want := n >= 2 && big.NewInt(int64(n)).ProbablyPrime(20)
		if got != want {
			t.Fatalf("IsPrime(%d) = %v, big = %v", n, got, want)
		}
	}
}

func TestSieveOfEratosthenesRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(3))
	for range 200 {
		n := rng.Intn(2000) + 2
		got := SieveOfEratosthenes(n)
		var want []int
		for v := 2; v <= n; v++ {
			if big.NewInt(int64(v)).ProbablyPrime(20) {
				want = append(want, v)
			}
		}
		if len(got) != len(want) {
			t.Fatalf("SieveOfEratosthenes(%d): got %d primes, want %d", n, len(got), len(want))
		}
		for i := range want {
			if got[i] != want[i] {
				t.Fatalf("SieveOfEratosthenes(%d) mismatch at %d: %d vs %d", n, i, got[i], want[i])
			}
		}
	}
}

func TestPowModRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(4))
	for range 3000 {
		b, e, m := rng.Intn(10000), rng.Intn(10000), rng.Intn(10000)+1
		got := PowMod(b, e, m)
		want := int(new(big.Int).Exp(big.NewInt(int64(b)), big.NewInt(int64(e)), big.NewInt(int64(m))).Int64())
		if got != want {
			t.Fatalf("PowMod(%d, %d, %d) = %d, big = %d", b, e, m, got, want)
		}
	}
}
