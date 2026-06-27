//go:build solution

package recursion

func Factorial(n int) int {
	if n == 0 {
		return 1
	}
	return n * Factorial(n-1)
}

func Fib(n int) int {
	memo := make([]int, n+1)
	for i := range memo {
		memo[i] = -1
	}
	var f func(k int) int
	f = func(k int) int {
		if k < 2 {
			return k
		}
		if memo[k] >= 0 {
			return memo[k] // подзадача уже посчитана — не пересчитываем
		}
		memo[k] = f(k-1) + f(k-2)
		return memo[k]
	}
	return f(n)
}

func Power(base, exp int) int {
	if exp == 0 {
		return 1
	}
	half := Power(base, exp/2)
	if exp%2 == 0 {
		return half * half
	}
	return half * half * base
}

func HanoiMoves(n int) int {
	if n == 0 {
		return 0
	}
	return 2*HanoiMoves(n-1) + 1
}

func SumDigits(n int) int {
	if n < 10 {
		return n
	}
	return n%10 + SumDigits(n/10)
}
