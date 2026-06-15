//go:build solution

package dp

func ClimbStairs(n int) int {
	if n < 2 {
		return 1
	}
	prev, cur := 1, 1
	for i := 2; i <= n; i++ {
		prev, cur = cur, prev+cur
	}
	return cur
}

func CoinChange(coins []int, amount int) int {
	const inf = 1 << 30
	dp := make([]int, amount+1)
	for i := 1; i <= amount; i++ {
		dp[i] = inf
		for _, c := range coins {
			if c <= i && dp[i-c]+1 < dp[i] {
				dp[i] = dp[i-c] + 1
			}
		}
	}
	if dp[amount] >= inf {
		return -1
	}
	return dp[amount]
}

func LongestCommonSubsequence(a, b string) int {
	m, n := len(a), len(b)
	dp := make([][]int, m+1)
	for i := range dp {
		dp[i] = make([]int, n+1)
	}
	for i := 1; i <= m; i++ {
		for j := 1; j <= n; j++ {
			if a[i-1] == b[j-1] {
				dp[i][j] = dp[i-1][j-1] + 1
			} else if dp[i-1][j] >= dp[i][j-1] {
				dp[i][j] = dp[i-1][j]
			} else {
				dp[i][j] = dp[i][j-1]
			}
		}
	}
	return dp[m][n]
}

func EditDistance(a, b string) int {
	m, n := len(a), len(b)
	dp := make([][]int, m+1)
	for i := range dp {
		dp[i] = make([]int, n+1)
		dp[i][0] = i
	}
	for j := 0; j <= n; j++ {
		dp[0][j] = j
	}
	for i := 1; i <= m; i++ {
		for j := 1; j <= n; j++ {
			if a[i-1] == b[j-1] {
				dp[i][j] = dp[i-1][j-1]
			} else {
				dp[i][j] = 1 + min3(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
			}
		}
	}
	return dp[m][n]
}

func min3(a, b, c int) int {
	m := a
	if b < m {
		m = b
	}
	if c < m {
		m = c
	}
	return m
}

func LongestIncreasingSubsequence(nums []int) int {
	// tails[i] — минимально возможный последний элемент возрастающей
	// подпоследовательности длины i+1 среди просмотренных. tails строго
	// возрастает, поэтому в нём работает бинарный поиск, а его длина в конце
	// равна длине LIS. O(n log n) против O(n^2) у классического ДП.
	tails := make([]int, 0, len(nums))
	for _, x := range nums {
		// lower_bound: ищем первый tails[mid] >= x (для СТРОГОГО возрастания).
		lo, hi := 0, len(tails)
		for lo < hi {
			mid := lo + (hi-lo)/2
			if tails[mid] < x {
				lo = mid + 1
			} else {
				hi = mid
			}
		}
		if lo == len(tails) {
			tails = append(tails, x) // x длиннее всех — удлиняем LIS
		} else {
			tails[lo] = x // заменяем, удерживая минимальный «хвост» длины lo+1
		}
	}
	return len(tails)
}

func Knapsack01(weights, values []int, capacity int) int {
	dp := make([]int, capacity+1)
	for i := range weights {
		for w := capacity; w >= weights[i]; w-- {
			if cand := dp[w-weights[i]] + values[i]; cand > dp[w] {
				dp[w] = cand
			}
		}
	}
	return dp[capacity]
}

func HouseRobber(nums []int) int {
	prev2, prev1 := 0, 0
	for _, x := range nums {
		cur := prev1
		if cand := prev2 + x; cand > cur {
			cur = cand
		}
		prev2, prev1 = prev1, cur
	}
	return prev1
}

func UniquePaths(m, n int) int {
	dp := make([]int, n)
	for j := range dp {
		dp[j] = 1
	}
	for i := 1; i < m; i++ {
		for j := 1; j < n; j++ {
			dp[j] += dp[j-1]
		}
	}
	return dp[n-1]
}

func WordBreak(s string, dict []string) bool {
	set := make(map[string]bool, len(dict))
	for _, w := range dict {
		set[w] = true
	}
	n := len(s)
	dp := make([]bool, n+1)
	dp[0] = true
	for i := 1; i <= n; i++ {
		for j := 0; j < i; j++ {
			if dp[j] && set[s[j:i]] {
				dp[i] = true
				break
			}
		}
	}
	return dp[n]
}
