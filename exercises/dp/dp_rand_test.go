package dp

import (
	"math/rand"
	"testing"
)

// bruteLIS — наивное O(n²) ДП для длины строго возрастающей подпоследовательности.
func bruteLIS(nums []int) int {
	n := len(nums)
	if n == 0 {
		return 0
	}
	dp := make([]int, n)
	best := 0
	for i := range nums {
		dp[i] = 1
		for j := range i {
			if nums[j] < nums[i] && dp[j]+1 > dp[i] { // строго <: дубликаты не продолжают
				dp[i] = dp[j] + 1
			}
		}
		if dp[i] > best {
			best = dp[i]
		}
	}
	return best
}

// TestLISRandom: O(n log n)-решение против наивного O(n²) на случайных входах.
// Узкий диапазон значений даёт дубликаты — проверяет, что возрастание именно
// СТРОГОЕ (равные элементы не продолжают подпоследовательность).
func TestLISRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(2))
	for range 1000 {
		n := rng.Intn(40) // включая пустой массив
		nums := make([]int, n)
		for i := range nums {
			nums[i] = rng.Intn(15)
		}
		if got, want := LongestIncreasingSubsequence(nums), bruteLIS(nums); got != want {
			t.Fatalf("LIS(%v) = %d, brute = %d", nums, got, want)
		}
	}
}
