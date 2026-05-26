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

// EditDistance возвращает минимальное число операций (вставка, удаление,
// замена символа), чтобы превратить строку a в b (расстояние Левенштейна).
//
// Пример: a="horse", b="ros" -> 3.
//
// Ожидаемая сложность: O(len(a) · len(b)).
func EditDistance(a, b string) int {
	// TODO: dp[i][j] — расстояние между префиксами; база dp[i][0]=i,
	// dp[0][j]=j; при несовпадении символов берём 1 + минимум из трёх соседей.
	panic("TODO: реализуйте EditDistance")
}

// LongestIncreasingSubsequence возвращает длину наибольшей строго
// возрастающей подпоследовательности.
//
// Пример: [10,9,2,5,3,7,101,18] -> 4 ([2,3,7,101]).
//
// Ожидаемая сложность: O(n log n) (или O(n²) простым ДП).
func LongestIncreasingSubsequence(nums []int) int {
	// TODO: ведите массив tails, где tails[k] — наименьший возможный «хвост»
	// возрастающей подпоследовательности длины k+1; обновляйте бинарным поиском.
	panic("TODO: реализуйте LongestIncreasingSubsequence")
}

// Knapsack01 решает задачу о рюкзаке 0/1: максимальная суммарная ценность
// предметов (weights[i], values[i]), помещающихся в рюкзак вместимости
// capacity. Каждый предмет можно взять не более одного раза.
//
// Пример: weights=[1,3,4,5], values=[1,4,5,7], capacity=7 -> 9.
//
// Ожидаемая сложность: O(n · capacity).
func Knapsack01(weights, values []int, capacity int) int {
	// TODO: 1D-массив dp[w]; для каждого предмета идите по w СВЕРХУ ВНИЗ
	// (от capacity к weights[i]), чтобы не взять предмет повторно.
	panic("TODO: реализуйте Knapsack01")
}
