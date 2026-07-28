//go:build solution

package combinatorics

func Binomial(n, k int) int {
	if k < 0 || k > n {
		return 0
	}
	if k > n-k {
		k = n - k // симметрия: C(n, k) == C(n, n−k)
	}
	res := 1
	for i := 1; i <= k; i++ {
		res = res * (n - k + i) / i // после шага i: res == C(n−k+i, i) — целое
	}
	return res
}

func Permutations(n, k int) int {
	if k < 0 || k > n {
		return 0
	}
	res := 1
	for i := 0; i < k; i++ {
		res *= n - i
	}
	return res
}

func CountDivisibleByAny(n int, divisors []int) int {
	// Уникальные положительные делители: нули бессмысленны (на 0 не делят),
	// а дубликаты раздували бы 2^m без пользы.
	seen := make(map[int]bool, len(divisors))
	ds := make([]int, 0, len(divisors))
	for _, d := range divisors {
		if d > 0 && !seen[d] {
			seen[d] = true
			ds = append(ds, d)
		}
	}
	m, total := len(ds), 0
	for mask := 1; mask < 1<<m; mask++ { // все непустые подмножества делителей
		l, bits, alive := 1, 0, true
		for i := 0; i < m; i++ {
			if mask&(1<<i) == 0 {
				continue
			}
			bits++
			g := gcd(l, ds[i])
			// Следующий НОК — l/g*ds[i]. Если он больше n, вклад n/lcm нулевой;
			// проверяем ДО умножения, чтобы НОК не переполнился.
			if q := l / g; q > n/ds[i] {
				alive = false
				break
			} else {
				l = q * ds[i]
			}
		}
		if !alive {
			continue
		}
		if bits%2 == 1 {
			total += n / l // нечётное подмножество — прибавляем
		} else {
			total -= n / l // чётное — вычитаем
		}
	}
	return total
}

func Derangements(n int) int {
	if n < 0 {
		return 0
	}
	if n == 0 {
		return 1
	}
	prev2, prev := 1, 0 // D(0), D(1)
	for i := 2; i <= n; i++ {
		prev2, prev = prev, (i-1)*(prev+prev2)
	}
	return prev
}

func gcd(a, b int) int {
	for b != 0 {
		a, b = b, a%b
	}
	return a
}
