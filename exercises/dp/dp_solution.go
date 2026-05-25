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
