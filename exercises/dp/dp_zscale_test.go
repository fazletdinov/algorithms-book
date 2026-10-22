package dp

import (
	"strings"
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
)

// TestCoinChangeScales — сложность, а не ответ. Монеты чётные, сумма нечётная —
// ответ −1, и рекурсия без запоминания перебирает все разложения: число вызовов
// растёт экспоненциально. Таблица dp или рекурсия с мемоизацией —
// O(amount · len(coins)).
//
// Рекурсия без мемоизации после срока крутится в горутине до выхода бинарника —
// поэтому тест масштаба стоит в файле, который идёт последним.
func TestCoinChangeScales(t *testing.T) {
	coins := []int{4, 6, 10}
	const amount = 9999
	var got int
	scaletest.Within(t, scaletest.Limit,
		"CoinChange(coins=[4 6 10], amount=9999) — похоже на экспоненциальный перебор там, где нужен"+
			" O(amount · len(coins)) (замер: эталон < 1 мс, перебор не завершается)",
		func() { got = CoinChange(coins, amount) })
	if got != -1 {
		t.Fatalf("CoinChange = %d, ожидалось -1", got)
	}
}

// scaleStr — детерминированная строка длины n над алфавитом "acgt" (xorshift с
// зерном seed): совпадения символов редкие и без закономерности.
func scaleStr(n int, seed uint32) string {
	const alphabet = "acgt"
	buf := make([]byte, n)
	x := seed
	for i := range buf {
		x ^= x << 13
		x ^= x >> 17
		x ^= x << 5
		buf[i] = alphabet[x%4]
	}
	return string(buf)
}

// knapsackScaleInput — 100 предметов с чётными весами 1000…2998 и ценностью,
// равной весу, вместимость — нечётная половина суммы весов.
func knapsackScaleInput() (weights, values []int, capacity int) {
	const n = 100
	weights = make([]int, n)
	values = make([]int, n)
	x := uint32(2463534242)
	sum := 0
	for i := range weights {
		x ^= x << 13
		x ^= x >> 17
		x ^= x << 5
		weights[i] = 1000 + 2*int(x%1000)
		values[i] = weights[i]
		sum += weights[i]
	}
	return weights, values, sum/2 | 1
}

func houseScaleInput() []int {
	nums := make([]int, 200000)
	x := uint32(88172645)
	for i := range nums {
		x ^= x << 13
		x ^= x >> 17
		x ^= x << 5
		nums[i] = int(x % 10001)
	}
	return nums
}

// TestClimbStairsScales — сложность, а не ответ. n = 91 — самое большое n, при
// котором ответ (число Фибоначчи F(92) ≈ 7.5·10¹⁸) ещё помещается в int64.
// Рекурсия f(n−1) + f(n−2) без запоминания делает ~2·F(92) вызовов — она не
// кончится никогда; цикл на двух переменных — 90 сложений.
func TestClimbStairsScales(t *testing.T) {
	var got int
	scaletest.Within(t, scaletest.Limit,
		"ClimbStairs(91) — похоже на экспоненциальную рекурсию без запоминания там, где нужен O(n)"+
			" (замер: эталон < 1 мс; рекурсия при n = 44 — 2.8 с и ×2.6 на две ступени, при n = 91"+
			" по оценке ~10¹⁰ с)",
		func() { got = ClimbStairs(91) })
	if got != 7540113804746346429 { // F(92)
		t.Fatalf("ClimbStairs(91) = %d, ожидалось 7540113804746346429", got)
	}
}

// TestLongestCommonSubsequenceScales — сложность, а не ответ. Две строки по 1000
// символов из "acgt" (scaleStr): совпадения редкие, и рекурсия без запоминания на
// каждом несовпадении ветвится надвое — число вызовов экспоненциально.
// Таблица префиксов — 10⁶ клеток.
func TestLongestCommonSubsequenceScales(t *testing.T) {
	a, b := scaleStr(1000, 1), scaleStr(1000, 2)
	var got int
	scaletest.Within(t, scaletest.Limit,
		"LongestCommonSubsequence(две строки по 1000 символов acgt) — похоже на экспоненциальную"+
			" рекурсию без запоминания там, где нужен O(len(a) · len(b))"+
			" (замер: эталон ~8 мс; рекурсия на строках по 20 символов — 1.9 с и ×2.8 на символ,"+
			" с отсечением по оставшейся длине на 35 — 4.1 с и ×3.9; на 1000 — по оценке ≥ 10¹⁰⁰ с)",
		func() { got = LongestCommonSubsequence(a, b) })
	if got != 638 { // снято с эталона
		t.Fatalf("LongestCommonSubsequence = %d, ожидалось 638", got)
	}
}

// TestEditDistanceScales — сложность, а не ответ. Те же строки, что у LCS: на
// каждом несовпадении рекурсия без запоминания ветвится натрое.
func TestEditDistanceScales(t *testing.T) {
	a, b := scaleStr(1000, 1), scaleStr(1000, 2)
	var got int
	scaletest.Within(t, scaletest.Limit,
		"EditDistance(две строки по 1000 символов acgt) — похоже на экспоненциальную рекурсию"+
			" без запоминания там, где нужен O(len(a) · len(b))"+
			" (замер: эталон ~4 мс; рекурсия на строках по 15 символов — 2.3 с и ×3 на символ,"+
			" с отсечением «текущее + разница длин ≥ лучшего» на 30 — 2.7 с и ×2.9; на 1000 — по оценке ≥ 10¹⁰⁰ с)",
		func() { got = EditDistance(a, b) })
	if got != 535 { // снято с эталона
		t.Fatalf("EditDistance = %d, ожидалось 535", got)
	}
}

// TestLongestIncreasingSubsequenceScales — сложность, а не ответ. Вход — пары
// по убыванию: 1 0 3 2 5 4 … (n = 2000). Из каждой пары в ответ идёт ровно одно
// число, LIS = 1000, и таких подпоследовательностей 2¹⁰⁰⁰ — рекурсия «взять или
// пропустить» без запоминания обходит их все, даже с отсечением «текущая длина +
// оставшиеся ≤ лучшей»: оно срабатывает только у самого конца. Простое ДП O(n²)
// условие допускает — оно здесь укладывается.
func TestLongestIncreasingSubsequenceScales(t *testing.T) {
	const n = 2000
	nums := make([]int, n)
	for i := 0; i < n; i += 2 {
		nums[i], nums[i+1] = i+1, i
	}
	var got int
	scaletest.Within(t, scaletest.Limit,
		"LongestIncreasingSubsequence(n=2000, пары 1 0 3 2 5 4 …) — похоже на экспоненциальный"+
			" перебор подпоследовательностей там, где нужен O(n log n) или O(n²)"+
			" (замер: эталон < 1 мс, ДП O(n²) ~1 мс; «взять/пропустить» при n = 36 — 2.1 с и ×3 на пару,"+
			" с отсечением по длине при n = 46 — 3 с и ×2.4, рекурсия «кончается на i» при n = 38 — 3.4 с;"+
			" при n = 2000 — по оценке ≥ 10¹⁰⁰ с)",
		func() { got = LongestIncreasingSubsequence(nums) })
	if got != n/2 {
		t.Fatalf("LongestIncreasingSubsequence = %d, ожидалось %d", got, n/2)
	}
}

// TestKnapsack01Scales — сложность, а не ответ. 100 предметов, ценность равна
// весу, все веса чётные, вместимость нечётная (knapsackScaleInput): ответ —
// вместимость минус 1, и ни одна верхняя оценка («текущее + все оставшиеся»,
// «заполнить остаток дробно») не опускается до найденного лучшего — отсечения
// почти не режут. Перебор «взять/не взять» без запоминания — 2¹⁰⁰.
// Таблица dp[w] — n · capacity ≈ 10⁷.
func TestKnapsack01Scales(t *testing.T) {
	weights, values, capacity := knapsackScaleInput()
	var got int
	scaletest.Within(t, scaletest.Limit,
		"Knapsack01(100 предметов, capacity=102819) — похоже на экспоненциальный перебор"+
			" «взять/не взять» там, где нужен O(n · capacity)"+
			" (замер: эталон ~7 мс; перебор на 30 предметах — 2.8 с и ×2 на предмет, с отсечением"+
			" «текущее + все оставшиеся ≤ лучшего» на 31 — 2 с и ×1.8; на 100 — по оценке ≥ 10¹⁷ с)",
		func() { got = Knapsack01(weights, values, capacity) })
	if got != capacity-1 { // снято с эталона: 102818
		t.Fatalf("Knapsack01 = %d, ожидалось %d", got, capacity-1)
	}
}

// TestHouseRobberScales — сложность, а не ответ. 2·10⁵ домов: рекурсия
// max(rob(i−1), rob(i−2) + nums[i]) без запоминания экспоненциальна, ДП
// «dp[i] = nums[i] + max(dp[j]) по всем j ≤ i−2» — O(n²) ≈ 2·10¹⁰.
func TestHouseRobberScales(t *testing.T) {
	nums := houseScaleInput()
	var got int
	scaletest.Within(t, scaletest.Limit,
		"HouseRobber(n=200000) — похоже на O(n²) или экспоненциальную рекурсию там, где нужен O(n)"+
			" (замер: эталон < 1 мс, ДП по всем j ~48 с, рекурсия при n = 42 — 2.3 с и ×2.4 на два дома)",
		func() { got = HouseRobber(nums) })
	if got != 587690578 { // снято с эталона
		t.Fatalf("HouseRobber = %d, ожидалось 587690578", got)
	}
}

// TestUniquePathsScales — сложность, а не ответ. Сетка 34×34 — ответ
// C(66, 33) ≈ 7.2·10¹⁸ ещё помещается в int64 (35×35 уже нет). Рекурсия
// «вправо + вниз» без запоминания делает столько вызовов, сколько путей, — не
// кончится никогда; таблица — 34² клеток.
func TestUniquePathsScales(t *testing.T) {
	var got int
	scaletest.Within(t, scaletest.Limit,
		"UniquePaths(34, 34) — похоже на экспоненциальную рекурсию без запоминания там, где нужен"+
			" O(m · n) (замер: эталон < 1 мс; рекурсия на 17×17 — 1.6 с и ×3.9 на шаг стороны,"+
			" на 34×34 — по оценке ~10¹⁰ с)",
		func() { got = UniquePaths(34, 34) })
	if got != 7219428434016265740 { // C(66, 33)
		t.Fatalf("UniquePaths(34, 34) = %d, ожидалось 7219428434016265740", got)
	}
}

// TestWordBreakScales — сложность, а не ответ. s = a¹⁰⁰ b a¹⁰⁰, словарь — a, aa,
// …, a¹⁰ и bb. Разбить нельзя: одиночное b не покрыть. Рекурсия без запоминания
// перебирает все разбиения префикса a¹⁰⁰ (их ~2⁹⁹) и каждый раз упирается в b.
// Буквы s все есть в словаре и s кончается словом — дешёвые проверки «нет такой
// буквы» и «нет слова-суффикса» вход не отсекают. ДП по префиксам — 201² пар.
func TestWordBreakScales(t *testing.T) {
	half := strings.Repeat("a", 100)
	s := half + "b" + half
	dict := []string{"bb"}
	for k := 1; k <= 10; k++ {
		dict = append(dict, strings.Repeat("a", k))
	}
	var got bool
	scaletest.Within(t, scaletest.Limit,
		"WordBreak(a¹⁰⁰ b a¹⁰⁰, словарь a…a¹⁰ и bb) — похоже на экспоненциальную рекурсию без"+
			" запоминания там, где нужен O(len(s)² · k) (замер: эталон < 1 мс; рекурсия при a²⁴ b a²⁴"+
			" — 3.4 с и ×4 на две буквы, с отсечениями по буквам и суффиксу при a²⁶ b a²⁶ — 3.4 с;"+
			" при a¹⁰⁰ — по оценке ≥ 10²² с)",
		func() { got = WordBreak(s, dict) })
	if got {
		t.Fatalf("WordBreak = true, а одиночное b словом не покрыть")
	}
}
