//go:build !solution

// Package dp — задачи на динамическое программирование.
//
//	go test ./dp/                 # ваши решения
//	go test -tags solution ./dp/  # эталон
package dp

// ClimbStairs возвращает число способов подняться на n ступеней, делая шаги
// по 1 или 2. ClimbStairs(0) = 1 (пустой путь).
//
// Пример: n=4 -> 5.
//
// Ожидаемая сложность: O(n) по времени, O(1) по памяти.
func ClimbStairs(n int) int {
	// TODO: dp[i] = dp[i-1] + dp[i-2]; достаточно двух переменных.
	panic("TODO: реализуйте ClimbStairs")
}

// CoinChange возвращает минимальное число монет номиналами coins, дающих в
// сумме amount, либо -1, если сумму набрать нельзя. Монеты можно использовать
// многократно.
//
// Пример: coins=[1,2,5], amount=11 -> 3 (5+5+1).
//
// Ожидаемая сложность: O(amount · len(coins)).
func CoinChange(coins []int, amount int) int {
	// TODO: dp[a] = min по монетам c (dp[a-c] + 1); dp[0] = 0.
	panic("TODO: реализуйте CoinChange")
}

// LongestCommonSubsequence возвращает длину наибольшей общей
// подпоследовательности строк a и b.
//
// Пример: a="abcde", b="ace" -> 3 ("ace").
//
// Ожидаемая сложность: O(len(a) · len(b)).
func LongestCommonSubsequence(a, b string) int {
	// TODO: 2D-таблица dp[i][j]; при совпадении символов — диагональ+1,
	// иначе — максимум из двух соседних состояний.
	panic("TODO: реализуйте LongestCommonSubsequence")
}
