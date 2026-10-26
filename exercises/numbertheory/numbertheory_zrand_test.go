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

// Обратный сверяется по определению (a·x ≡ 1, x в [0, p)) и с big.Int.ModInverse.
func TestModInversePrimeRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(4))
	primes := []int{2, 3, 7, 13, 101, 998244353, 1000000007, 2147483647}
	for range 3000 {
		p := primes[rng.Intn(len(primes))]
		a := rng.Intn(1<<40) + 1
		if a%p == 0 {
			continue
		}
		got := ModInversePrime(a, p)
		want := new(big.Int).ModInverse(big.NewInt(int64(a)), big.NewInt(int64(p))).Int64()
		if int64(got) != want {
			t.Fatalf("ModInversePrime(%d, %d) = %d, big = %d", a, p, got, want)
		}
	}
}

// C(n, k) mod p против точного big.Int.Binomial на малых n.
func TestBinomialModRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(5))
	primes := []int{67, 101, 1000003, 998244353, 1000000007}
	for range 300 {
		p := primes[rng.Intn(len(primes))]
		q := rng.Intn(20)
		queries := make([][2]int, q)
		for i := range queries {
			n := rng.Intn(66)
			queries[i] = [2]int{n, rng.Intn(n+3) - 1} // k от −1 до n+1
		}
		got := BinomialMod(queries, p)
		if len(got) != q {
			t.Fatalf("BinomialMod(%v, %d): %d ответов, ожидалось %d", queries, p, len(got), q)
		}
		for i, qu := range queries {
			n, k := qu[0], qu[1]
			want := int64(0)
			if k >= 0 && k <= n {
				want = new(big.Int).Mod(new(big.Int).Binomial(int64(n), int64(k)), big.NewInt(int64(p))).Int64()
			}
			if int64(got[i]) != want {
				t.Fatalf("BinomialMod: C(%d, %d) mod %d = %d, big = %d", n, k, p, got[i], want)
			}
		}
	}
}
