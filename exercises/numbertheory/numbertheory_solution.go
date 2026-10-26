//go:build solution

package numbertheory

func GCD(a, b int) int {
	for b != 0 {
		a, b = b, a%b
	}
	if a < 0 {
		a = -a
	}
	return a
}

func LCM(a, b int) int {
	if a == 0 || b == 0 {
		return 0
	}
	r := a / GCD(a, b) * b // делим до умножения — меньше риск переполнения
	if r < 0 {
		r = -r
	}
	return r
}

func IsPrime(n int) bool {
	if n < 2 {
		return false
	}
	if n < 4 {
		return true // 2 и 3
	}
	if n%2 == 0 {
		return false
	}
	for i := 3; i*i <= n; i += 2 {
		if n%i == 0 {
			return false
		}
	}
	return true
}

func SieveOfEratosthenes(n int) []int {
	if n < 2 {
		return []int{}
	}
	isComposite := make([]bool, n+1)
	var primes []int
	for p := 2; p <= n; p++ {
		if isComposite[p] {
			continue
		}
		primes = append(primes, p)
		for m := p * p; m <= n; m += p {
			isComposite[m] = true
		}
	}
	return primes
}

func PowMod(base, exp, m int) int {
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

func ModInversePrime(a, p int) int {
	return PowMod(a, p-2, p) // малая теорема Ферма: a^(p−1) ≡ 1 → a^(p−2) = a⁻¹
}

func BinomialMod(queries [][2]int, p int) []int {
	maxN := 0
	for _, q := range queries {
		maxN = max(maxN, q[0])
	}
	fact := make([]int, maxN+1)
	invFact := make([]int, maxN+1)
	fact[0] = 1 % p
	for i := 1; i <= maxN; i++ {
		fact[i] = fact[i-1] * i % p
	}
	invFact[maxN] = ModInversePrime(fact[maxN], p) // одна степень на всю таблицу
	for i := maxN; i > 0; i-- {
		invFact[i-1] = invFact[i] * i % p // 1/(i−1)! = i · 1/i!
	}
	ans := make([]int, len(queries))
	for i, q := range queries {
		n, k := q[0], q[1]
		if k < 0 || k > n {
			continue
		}
		ans[i] = fact[n] * invFact[k] % p * invFact[n-k] % p
	}
	return ans
}
