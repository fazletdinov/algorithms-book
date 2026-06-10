package dp

import (
	"fmt"
	"testing"
)

func benchArr(n int) []int {
	a := make([]int, n)
	x := uint32(88172645)
	for i := range a {
		x ^= x << 13
		x ^= x >> 17
		x ^= x << 5
		a[i] = int(x & 0xffff)
	}
	return a
}

// BenchmarkLIS — главный бенч для проверки асимптотики.
//
// LongestIncreasingSubsequence заявлен как O(n log n) (терпеливая раскладка +
// бинарный поиск по «хвостам»). Классическое ДП dp[i]=max(dp[j]+1) — это O(n²).
//
// При росте n в 10 раз O(n log n) растёт ~×12, а O(n²) — ~×100. Если твоё
// решение даёт квадратичный рост — оно написано на O(n²), а не O(n log n):
//
//	go test -tags solution -bench=LIS ./dp/
func BenchmarkLIS(b *testing.B) {
	for _, n := range []int{2000, 20000} {
		nums := benchArr(n)
		b.Run(fmt.Sprintf("n=%d", n), func(b *testing.B) {
			for i := 0; i < b.N; i++ {
				_ = LongestIncreasingSubsequence(nums)
			}
		})
	}
}

// BenchmarkCoinChange: O(amount · len(coins)) — псевдополиномиально по сумме.
func BenchmarkCoinChange(b *testing.B) {
	coins := []int{1, 5, 10, 25, 50}
	for _, amount := range []int{2000, 20000} {
		b.Run(fmt.Sprintf("amount=%d", amount), func(b *testing.B) {
			for i := 0; i < b.N; i++ {
				_ = CoinChange(coins, amount)
			}
		})
	}
}

// BenchmarkEditDistance: O(len(a)·len(b)) — заполнение таблицы.
func BenchmarkEditDistance(b *testing.B) {
	mk := func(n int) string {
		s := make([]byte, n)
		for i := range s {
			s[i] = byte('a' + (i*7+i/3)%4)
		}
		return string(s)
	}
	for _, n := range []int{200, 600} {
		a, c := mk(n), mk(n+5)
		b.Run(fmt.Sprintf("n=%d", n), func(b *testing.B) {
			for i := 0; i < b.N; i++ {
				_ = EditDistance(a, c)
			}
		})
	}
}
