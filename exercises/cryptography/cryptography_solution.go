//go:build solution

package cryptography

func ExtendedGCD(a, b int) (g, x, y int) {
	oldR, r := a, b
	oldS, s := 1, 0
	oldT, t := 0, 1
	for r != 0 {
		q := oldR / r
		oldR, r = r, oldR-q*r
		oldS, s = s, oldS-q*s
		oldT, t = t, oldT-q*t
	}
	return oldR, oldS, oldT
}

func ModInverse(a, m int) (inv int, ok bool) {
	if m < 1 {
		return 0, false
	}
	a %= m
	if a < 0 {
		a += m
	}
	g, x, _ := ExtendedGCD(a, m)
	if g != 1 {
		return 0, false
	}
	return ((x % m) + m) % m, true
}

func ModExp(base, exp, m int) int {
	if m == 1 {
		return 0
	}
	result := 1 % m
	base %= m
	if base < 0 {
		base += m
	}
	for exp > 0 {
		if exp&1 == 1 {
			result = result * base % m
		}
		base = base * base % m
		exp >>= 1
	}
	return result
}

func IsProbablePrime(n int) bool {
	if n < 2 {
		return false
	}
	smallPrimes := []int{2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37}
	for _, p := range smallPrimes {
		if n == p {
			return true
		}
		if n%p == 0 {
			return false
		}
	}
	// n - 1 = d * 2^s, d нечётно
	d := n - 1
	s := 0
	for d%2 == 0 {
		d /= 2
		s++
	}
	for _, a := range smallPrimes {
		x := ModExp(a, d, n)
		if x == 1 || x == n-1 {
			continue // свидетель не уличает
		}
		composite := true
		for i := 0; i < s-1; i++ {
			x = x * x % n
			if x == n-1 {
				composite = false
				break
			}
		}
		if composite {
			return false
		}
	}
	return true
}

func RSAPrivateExponent(e, p, q int) (d int, ok bool) {
	phi := (p - 1) * (q - 1)
	return ModInverse(e, phi)
}

func RSAEncrypt(m, e, n int) int {
	return ModExp(m, e, n)
}

func RSADecrypt(c, d, n int) int {
	return ModExp(c, d, n)
}
