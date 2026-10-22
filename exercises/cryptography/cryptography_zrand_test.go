package cryptography

import (
	"math"
	"math/big"
	"math/rand"
	"testing"
)

// naiveModExp — возведение в степень «в лоб», умножениями по одному.
// Параметры ниже держатся маленькими, чтобы даже наивный вариант не переполнялся.
func naiveModExp(base, exp, m int) int {
	res := 1 % m
	base %= m
	for i := 0; i < exp; i++ {
		res = res * base % m
	}
	return res
}

// naiveIsPrime — пробное деление до корня: медленный, но заведомо верный эталон.
func naiveIsPrime(n int) bool {
	if n < 2 {
		return false
	}
	for d := 2; d*d <= n; d++ {
		if n%d == 0 {
			return false
		}
	}
	return true
}

// TestModExpRandom: ModExp против наивного возведения в степень. Маленькие
// base/exp/m — чтобы наивный цикл был честным эталоном без переполнений;
// m=1 и exp=0 попадают в выборку как вырожденные края (ответ 0 и 1%m).
func TestModExpRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(2601))
	for i := 0; i < 5000; i++ {
		base := rng.Intn(50)
		exp := rng.Intn(30)
		m := 1 + rng.Intn(60) // 1..60, включая m=1
		if got, want := ModExp(base, exp, m), naiveModExp(base, exp, m); got != want {
			t.Fatalf("ModExp(%d, %d, %d) = %d, want %d", base, exp, m, got, want)
		}
	}
}

// TestModInverseRandom: свойство обратного элемента. Для случайных (a, m)
// обратный существует ⟺ НОД(a mod m, m) == 1, и тогда a*inv ≡ 1 (mod m)
// и inv лежит в [0, m). Маленький диапазон m даёт много пар с общим
// делителем — ветка «обратного нет» срабатывает постоянно.
func TestModInverseRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(2602))
	for i := 0; i < 5000; i++ {
		a := rng.Intn(1000)
		m := 1 + rng.Intn(500)
		inv, ok := ModInverse(a, m)
		wantOK := gcd(a%m, m) == 1
		if ok != wantOK {
			t.Fatalf("ModInverse(%d, %d): ok = %v, want %v", a, m, ok, wantOK)
		}
		if !ok {
			continue
		}
		if inv < 0 || inv >= m {
			t.Fatalf("ModInverse(%d, %d) = %d — вне диапазона [0, %d)", a, m, inv, m)
		}
		if a*inv%m != 1%m {
			t.Fatalf("ModInverse(%d, %d) = %d, но %d*%d mod %d = %d != 1",
				a, m, inv, a, inv, m, a*inv%m)
		}
	}
}

// TestExtendedGCDRandom: тождество Безу a*x + b*y = g и g == НОД на случайных
// неотрицательных парах, включая нули (края a=0 / b=0).
func TestExtendedGCDRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(2603))
	for i := 0; i < 5000; i++ {
		a := rng.Intn(2000)
		b := rng.Intn(2000)
		g, x, y := ExtendedGCD(a, b)
		if g != gcd(a, b) {
			t.Fatalf("ExtendedGCD(%d, %d): g = %d, want %d", a, b, g, gcd(a, b))
		}
		if a*x+b*y != g {
			t.Fatalf("ExtendedGCD(%d, %d): %d*%d + %d*%d = %d, want %d (Безу)",
				a, b, a, x, b, y, a*x+b*y, g)
		}
	}
}

// TestIsProbablePrimeRandom: Миллер — Рабин против пробного деления на
// случайных n до 10^6. Отдельно добиваем маленькие n (0..1000) сплошняком —
// там живут все края: 0, 1, сами свидетели 2..37 и их квадраты.
func TestIsProbablePrimeRandom(t *testing.T) {
	for n := 0; n <= 1000; n++ {
		if got, want := IsProbablePrime(n), naiveIsPrime(n); got != want {
			t.Fatalf("IsProbablePrime(%d) = %v, want %v", n, got, want)
		}
	}
	rng := rand.New(rand.NewSource(2604))
	for i := 0; i < 3000; i++ {
		n := rng.Intn(1_000_000)
		if got, want := IsProbablePrime(n), naiveIsPrime(n); got != want {
			t.Fatalf("IsProbablePrime(%d) = %v, want %v", n, got, want)
		}
	}
}

// TestRSAPrivateExponentRoundTripRandom: для случайных пар маленьких простых p != q и
// открытой экспоненты e, обратимой по модулю φ, шифрование-расшифровка
// возвращает исходное сообщение на случайных m из [0, n). Маленькие простые
// держат n < 10^5, так что промежуточные произведения ModExp не переполняются.
func TestRSAPrivateExponentRoundTripRandom(t *testing.T) {
	primes := []int{53, 61, 71, 89, 101, 127, 151, 173, 197, 211, 233, 257}
	exps := []int{3, 5, 7, 17, 257}
	rng := rand.New(rand.NewSource(2605))
	for i := 0; i < 200; i++ {
		p := primes[rng.Intn(len(primes))]
		q := primes[rng.Intn(len(primes))]
		if p == q {
			continue // φ = (p-1)² с e редко взаимно прост, да и RSA требует p != q
		}
		e := exps[rng.Intn(len(exps))]
		d, ok := RSAPrivateExponent(e, p, q)
		phi := (p - 1) * (q - 1)
		if wantOK := gcd(e, phi) == 1; ok != wantOK {
			t.Fatalf("RSAPrivateExponent(%d, %d, %d): ok = %v, want %v", e, p, q, ok, wantOK)
		}
		if !ok {
			continue
		}
		if e*d%phi != 1 {
			t.Fatalf("RSAPrivateExponent(%d, %d, %d) = %d: e*d mod φ = %d, want 1",
				e, p, q, d, e*d%phi)
		}
		n := p * q
		for j := 0; j < 20; j++ {
			m := rng.Intn(n)
			c := RSAEncrypt(m, e, n)
			if got := RSADecrypt(c, d, n); got != m {
				t.Fatalf("RSA(p=%d q=%d e=%d): m=%d → c=%d → %d, want %d", p, q, e, m, c, got, m)
			}
		}
	}
}

// bigModExp — эталон на math/big: ему переполнение не грозит.
func bigModExp(base, exp, m int) int {
	r := new(big.Int).Exp(big.NewInt(int64(base)), big.NewInt(int64(exp)), big.NewInt(int64(m)))
	return int(r.Int64())
}

// TestModExpMatchesBig: на модулях до MaxInt ModExp обязан совпасть с math/big.
// Ловит a*b%m вместо MulMod — на таких модулях произведение не помещается в int.
func TestModExpMatchesBig(t *testing.T) {
	rng := rand.New(rand.NewSource(2602))
	for i := 0; i < 2000; i++ {
		m := 1 + rng.Int63n(math.MaxInt64)
		base := int(rng.Int63n(m))
		exp := int(rng.Int63n(1 << 40))
		if got, want := ModExp(base, exp, int(m)), bigModExp(base, exp, int(m)); got != want {
			t.Fatalf("ModExp(%d, %d, %d) = %d, want %d", base, exp, m, got, want)
		}
	}
}

// TestIsProbablePrimeMatchesBig: нечётные числа по всему диапазону int64 против
// big.Int.ProbablyPrime (у него тоже Миллер — Рабин, плюс тест Люка). Простые
// среди случайных редки, поэтому половина выборки — числа рядом со степенями двойки,
// где простые подобраны поиском.
func TestIsProbablePrimeMatchesBig(t *testing.T) {
	rng := rand.New(rand.NewSource(2603))
	primes := 0
	for i := 0; i < 3000; i++ {
		n := rng.Int63n(math.MaxInt64) | 1
		want := big.NewInt(n).ProbablyPrime(20)
		if want {
			primes++
		}
		if got := IsProbablePrime(int(n)); got != want {
			t.Fatalf("IsProbablePrime(%d) = %v, want %v", n, got, want)
		}
	}
	for k := 32; k <= 62; k++ {
		n := int64(1)<<k + 1
		for !big.NewInt(n).ProbablyPrime(20) {
			n += 2
		}
		primes++
		if !IsProbablePrime(int(n)) {
			t.Fatalf("IsProbablePrime(%d) = false, а это простое (первое после 2^%d)", n, k)
		}
	}
	if primes < 40 {
		t.Fatalf("в выборке всего %d простых — проверка ничего не проверяет", primes)
	}
}
