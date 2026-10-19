//go:build !solution

// Package dp — задачи на динамическое программирование.
// Теория паттерна — в книге: ../../src/dynamic-programming.md
//
//	go test ./dp/                 # твои решения
//	go test -tags solution ./dp/  # эталон
package dp

// ClimbStairs возвращает число способов подняться на n ступеней, делая шаги
// по 1 или 2. ClimbStairs(0) = 1 (пустой путь).
//
// Пример: n=4 -> 5.
//
// Также решается: recursion
//
// Признак: число способов дойти до n складывается из способов дойти до n−1 и n−2 —
// рекуррента с пересекающимися подзадачами; рекурсия сверху вниз с запоминанием ответов
// даёт тот же результат за то же O(n).
//
// Ожидаемая сложность: O(n) по времени, O(1) по памяти.
func ClimbStairs(n int) int {
	// TODO: dp[i] = dp[i-1] + dp[i-2]; достаточно двух переменных.
	panic("TODO: реализуй ClimbStairs")
}

// CoinChange возвращает минимальное число монет номиналами coins, дающих в
// сумме amount, либо -1, если сумму набрать нельзя. Монеты можно использовать
// многократно.
//
// Пример: coins=[1,2,5], amount=11 -> 3 (5+5+1).
//
// Ограничения: amount ≤ 10⁴, len(coins) ≤ 12.
//
// Ожидаемая сложность: O(amount · len(coins)).
func CoinChange(coins []int, amount int) int {
	// TODO: dp[a] = min по монетам c (dp[a-c] + 1); dp[0] = 0.
	panic("TODO: реализуй CoinChange")
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
	panic("TODO: реализуй LongestCommonSubsequence")
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
	panic("TODO: реализуй EditDistance")
}

// LongestIncreasingSubsequence возвращает длину наибольшей строго
// возрастающей подпоследовательности.
//
// Пример: [10,9,2,5,3,7,101,18] -> 4 ([2,3,7,101]).
//
// Ожидаемая сложность: O(n log n) (или O(n²) простым ДП).
func LongestIncreasingSubsequence(nums []int) int {
	// TODO: dp[i] — длина наибольшей возрастающей подпоследовательности,
	// которая кончается на nums[i]: 1 + max(dp[j]) по j < i с nums[j] < nums[i],
	// O(n²). Сверх главы — массив tails и бинарный поиск, O(n log n).
	panic("TODO: реализуй LongestIncreasingSubsequence")
}

// Knapsack01 решает задачу о рюкзаке 0/1: максимальная суммарная ценность
// предметов (weights[i], values[i]), помещающихся в рюкзак вместимости
// capacity. Каждый предмет можно взять не более одного раза.
//
// Пример: weights=[1,3,4,5], values=[1,4,5,7], capacity=7 -> 9.
//
// Ожидаемая сложность: O(n · capacity).
func Knapsack01(weights, values []int, capacity int) int {
	// TODO: 1D-массив dp[w]; для каждого предмета иди по w СВЕРХУ ВНИЗ
	// (от capacity к weights[i]), чтобы не взять предмет повторно.
	panic("TODO: реализуй Knapsack01")
}

// HouseRobber возвращает максимальную сумму, которую можно набрать из nums,
// не выбирая два соседних элемента подряд.
//
// Пример: [2,7,9,3,1] -> 12 (2+9+1); [2,1,1,2] -> 4 (2+2); [] -> 0.
//
// Ожидаемая сложность: O(n) по времени, O(1) по памяти.
func HouseRobber(nums []int) int {
	// TODO: dp[i] = max(dp[i-1], dp[i-2] + nums[i]); достаточно двух переменных.
	panic("TODO: реализуй HouseRobber")
}

// UniquePaths возвращает число путей из левого верхнего в правый нижний угол
// сетки m×n, если двигаться можно только вправо и вниз.
//
// Пример: m=3,n=7 -> 28; m=3,n=2 -> 3; m=1,n=1 -> 1.
//
// Ожидаемая сложность: O(m · n) по времени, O(n) по памяти.
func UniquePaths(m, n int) int {
	// TODO: 1D-массив dp[j]; dp[j] += dp[j-1], начальная строка из единиц.
	panic("TODO: реализуй UniquePaths")
}

// WordBreak сообщает, можно ли разбить строку s на последовательность слов из
// словаря dict. Слова словаря можно использовать многократно.
//
// Пример: s="leetcode", dict=["leet","code"] -> true;
// s="applepenapple", dict=["apple","pen"] -> true;
// s="catsandog", dict=["cats","dog","sand","and","cat"] -> false.
//
// Ожидаемая сложность: O(len(s)² · k), где k — стоимость сравнения слова.
func WordBreak(s string, dict []string) bool {
	// TODO: dp[i] — можно ли разбить префикс s[:i]; dp[0]=true; для каждого i
	// ищи j<i такой, что dp[j] && s[j:i] есть в словаре.
	panic("TODO: реализуй WordBreak")
}
