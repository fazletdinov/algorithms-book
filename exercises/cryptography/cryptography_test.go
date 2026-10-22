package cryptography

import "testing"

// gcd — независимый эталон НОД для проверки инварианта ExtendedGCD.
func gcd(a, b int) int {
	for b != 0 {
		a, b = b, a%b
	}
	if a < 0 {
		a = -a
	}
	return a
}

func TestExtendedGCD(t *testing.T) {
	cases := [][2]int{{240, 46}, {48, 36}, {17, 5}, {0, 7}, {7, 0}, {13, 13}, {35, 15}, {1, 1}}
	for _, c := range cases {
		a, b := c[0], c[1]
		g, x, y := ExtendedGCD(a, b)
		if g != gcd(a, b) {
			t.Errorf("ExtendedGCD(%d, %d) g = %d, want %d", a, b, g, gcd(a, b))
		}
		if a*x+b*y != g {
			t.Errorf("ExtendedGCD(%d, %d): %d*%d + %d*%d = %d, want g = %d (тождество Безу нарушено)",
				a, b, a, x, b, y, a*x+b*y, g)
		}
	}
}

func TestModInverse(t *testing.T) {
	// Обратный существует.
	okCases := []struct{ a, m, want int }{
		{3, 11, 4},   // 3*4 = 12 ≡ 1 (mod 11)
		{10, 17, 12}, // 10*12 = 120 ≡ 1 (mod 17)
		{7, 26, 15},  // 7*15 = 105 ≡ 1 (mod 26)
		{1, 5, 1},
	}
	for _, c := range okCases {
		inv, ok := ModInverse(c.a, c.m)
		if !ok || inv != c.want {
			t.Errorf("ModInverse(%d, %d) = (%d, %v), want (%d, true)", c.a, c.m, inv, ok, c.want)
		}
		if ok && c.a*inv%c.m != 1%c.m {
			t.Errorf("ModInverse(%d, %d)=%d, но %d*%d mod %d != 1", c.a, c.m, inv, c.a, inv, c.m)
		}
	}
	// Обратного нет: НОД(a, m) != 1 или m < 1.
	noCases := []struct{ a, m int }{{2, 4}, {6, 9}, {0, 5}, {4, 0}, {3, 1}}
	for _, c := range noCases {
		if _, ok := ModInverse(c.a, c.m); ok && c.m > 1 {
			t.Errorf("ModInverse(%d, %d): ожидался ok=false (обратного нет)", c.a, c.m)
		}
	}
}

func TestModExp(t *testing.T) {
	cases := []struct{ b, e, m, want int }{
		{2, 10, 1000, 24}, {3, 0, 7, 1}, {2, 5, 1, 0},
		{5, 3, 13, 8}, {7, 4, 100, 1}, {10, 9, 6, 4},
		// Модуль больше 3·10⁹: base*base не помещается в int — нужна MulMod.
		// Ответы сняты с math/big (TestModExpMatchesBig сверяет то же на случайных входах).
		{3, 1000, 4294967311, bigModExp(3, 1000, 4294967311)},
		{123456789, 987654321, 1000000000000000003, bigModExp(123456789, 987654321, 1000000000000000003)},
	}
	for _, c := range cases {
		if got := ModExp(c.b, c.e, c.m); got != c.want {
			t.Errorf("ModExp(%d, %d, %d) = %d, want %d", c.b, c.e, c.m, got, c.want)
		}
	}
}

func TestIsProbablePrime(t *testing.T) {
	cases := []struct {
		n    int
		want bool
	}{
		{-7, false}, {0, false}, {1, false}, {2, true}, {3, true}, {4, false},
		{17, true}, {41, true}, {100, false}, {7919, true}, {104729, true},
		// Числа Кармайкла — обманывают тест Ферма, но НЕ Миллера — Рабина:
		{561, false}, {1105, false}, {1729, false}, {41041, false},
		// Больше 3·10⁹: x*x%n здесь переполняется, и простые объявлялись бы составными.
		{4294967311, true}, {1099511627791, true}, {2305843009213693951, true}, // 2⁶¹ − 1
		{9223372036854775783, true}, // самое большое простое в int64
		{4294967297, false},         // 2³² + 1 = 641 · 6700417
		// Сильное псевдопростое по свидетелям 2…23 — ловят только 29, 31, 37.
		{3825123056546413051, false},
	}
	for _, c := range cases {
		if got := IsProbablePrime(c.n); got != c.want {
			t.Errorf("IsProbablePrime(%d) = %v, want %v", c.n, got, c.want)
		}
	}
}

func TestRSAPrivateExponentRoundTrip(t *testing.T) {
	// Классический учебный ключ: n = 3233, e = 17, d = 2753.
	p, q, e := 61, 53, 17
	n := p * q
	phi := (p - 1) * (q - 1)

	d, ok := RSAPrivateExponent(e, p, q)
	if !ok {
		t.Fatalf("RSAPrivateExponent(%d, %d, %d): ok=false, ожидался валидный d", e, p, q)
	}
	if e*d%phi != 1 {
		t.Errorf("d=%d: e*d mod φ = %d, want 1", d, e*d%phi)
	}

	for _, m := range []int{0, 1, 42, 65, 100, 3232} {
		c := RSAEncrypt(m, e, n)
		got := RSADecrypt(c, d, n)
		if got != m {
			t.Errorf("RSA round-trip: m=%d → c=%d → %d, want %d", m, c, got, m)
		}
	}
}

func TestRSAPrivateExponentNoInverse(t *testing.T) {
	// e не взаимно просто с φ=(p-1)(q-1) → ключа нет.
	if _, ok := RSAPrivateExponent(6, 7, 13); ok {
		t.Errorf("RSAPrivateExponent(6, 7, 13): ожидался ok=false (НОД(6, 72) != 1)")
	}
}
