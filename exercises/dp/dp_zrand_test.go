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

// TestLongestIncreasingSubsequenceRandom: O(n log n)-решение против наивного O(n²) на случайных входах.
// Узкий диапазон значений даёт дубликаты — проверяет, что возрастание именно
// СТРОГОЕ (равные элементы не продолжают подпоследовательность).
func TestLongestIncreasingSubsequenceRandom(t *testing.T) {
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

// bruteClimbStairsRec — прямая рекурсия по определению, без ДП и без
// мемоизации: намеренно другая реализация той же рекурренты.
func bruteClimbStairsRec(n int) int {
	if n < 2 {
		return 1
	}
	return bruteClimbStairsRec(n-1) + bruteClimbStairsRec(n-2)
}

func TestClimbStairsRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(11))
	for range 300 {
		n := rng.Intn(21) // без мемоизации рекурсия экспоненциальна — держим n маленьким
		if got, want := ClimbStairs(n), bruteClimbStairsRec(n); got != want {
			t.Fatalf("ClimbStairs(%d) = %d, рекурсивный эталон = %d", n, got, want)
		}
	}
}

// bruteCoinChangeBFS — тот же ответ, но через BFS по графу «остаток суммы»:
// вершина 0..amount, ребро -amount+coin, ищем кратчайший путь от 0 до amount.
// Не ДП вообще — независимая переформулировка задачи как поиска кратчайшего пути.
func bruteCoinChangeBFS(coins []int, amount int) int {
	if amount == 0 {
		return 0
	}
	dist := make([]int, amount+1)
	for i := range dist {
		dist[i] = -1
	}
	dist[0] = 0
	queue := []int{0}
	for len(queue) > 0 {
		cur := queue[0]
		queue = queue[1:]
		for _, c := range coins {
			next := cur + c
			if next <= amount && dist[next] == -1 {
				dist[next] = dist[cur] + 1
				if next == amount {
					return dist[next]
				}
				queue = append(queue, next)
			}
		}
	}
	return dist[amount]
}

func TestCoinChangeRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(12))
	for range 500 {
		amount := rng.Intn(60)
		coins := make([]int, rng.Intn(5)+1)
		for i := range coins {
			coins[i] = rng.Intn(15) + 1 // строго положительные — иначе BFS зациклится
		}
		if got, want := CoinChange(coins, amount), bruteCoinChangeBFS(coins, amount); got != want {
			t.Fatalf("CoinChange(%v, %d) = %d, BFS-эталон = %d", coins, amount, got, want)
		}
	}
}

// isSubsequence — sub является подпоследовательностью s.
func isSubsequence(sub []byte, s string) bool {
	j := 0
	for i := 0; i < len(s) && j < len(sub); i++ {
		if s[i] == sub[j] {
			j++
		}
	}
	return j == len(sub)
}

// bruteLCS — переберает ВСЕ 2^len(a) подпоследовательностей a (никакого ДП) и
// берёт самую длинную, что является подпоследовательностью и b тоже.
func bruteLCS(a, b string) int {
	best := 0
	n := len(a)
	for mask := 0; mask < 1<<n; mask++ {
		var sub []byte
		for i := range n {
			if mask&(1<<i) != 0 {
				sub = append(sub, a[i])
			}
		}
		if len(sub) > best && isSubsequence(sub, b) {
			best = len(sub)
		}
	}
	return best
}

func TestLongestCommonSubsequenceRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(13))
	const alphabet = "abc"
	randStr := func(n int) string {
		buf := make([]byte, n)
		for i := range buf {
			buf[i] = alphabet[rng.Intn(len(alphabet))]
		}
		return string(buf)
	}
	for range 300 {
		a := randStr(rng.Intn(10)) // перебор 2^len(a) масок — держим короткой
		b := randStr(rng.Intn(12))
		if got, want := LongestCommonSubsequence(a, b), bruteLCS(a, b); got != want {
			t.Fatalf("LongestCommonSubsequence(%q, %q) = %d, brute = %d", a, b, got, want)
		}
	}
}

// bruteEditDistanceRec — та же рекуррента (вставка/удаление/замена), но
// сверху вниз через рекурсию с мемоизацией в map, а не через 2D-массив снизу вверх.
func bruteEditDistanceRec(a, b string) int {
	memo := make(map[[2]int]int)
	var rec func(i, j int) int
	rec = func(i, j int) int {
		if i == len(a) {
			return len(b) - j
		}
		if j == len(b) {
			return len(a) - i
		}
		key := [2]int{i, j}
		if v, ok := memo[key]; ok {
			return v
		}
		var res int
		if a[i] == b[j] {
			res = rec(i+1, j+1)
		} else {
			res = 1 + rec(i+1, j+1)
			if r := 1 + rec(i+1, j); r < res {
				res = r
			}
			if r := 1 + rec(i, j+1); r < res {
				res = r
			}
		}
		memo[key] = res
		return res
	}
	return rec(0, 0)
}

func TestEditDistanceRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(14))
	const alphabet = "ab"
	randStr := func(n int) string {
		buf := make([]byte, n)
		for i := range buf {
			buf[i] = alphabet[rng.Intn(len(alphabet))]
		}
		return string(buf)
	}
	for range 500 {
		a := randStr(rng.Intn(12))
		b := randStr(rng.Intn(12))
		if got, want := EditDistance(a, b), bruteEditDistanceRec(a, b); got != want {
			t.Fatalf("EditDistance(%q, %q) = %d, рекурсивный эталон = %d", a, b, got, want)
		}
	}
}

// bruteKnapsack01 — перебор ВСЕХ 2^n подмножеств предметов, без ДП.
func bruteKnapsack01(weights, values []int, capacity int) int {
	n := len(weights)
	best := 0
	for mask := 0; mask < 1<<n; mask++ {
		w, v := 0, 0
		for i := range n {
			if mask&(1<<i) != 0 {
				w += weights[i]
				v += values[i]
			}
		}
		if w <= capacity && v > best {
			best = v
		}
	}
	return best
}

func TestKnapsack01Random(t *testing.T) {
	rng := rand.New(rand.NewSource(15))
	for range 300 {
		n := rng.Intn(15) // перебор 2^n подмножеств — держим маленьким
		weights := make([]int, n)
		values := make([]int, n)
		for i := range weights {
			weights[i] = rng.Intn(20) + 1
			values[i] = rng.Intn(20) + 1
		}
		capacity := rng.Intn(50)
		if got, want := Knapsack01(weights, values, capacity), bruteKnapsack01(weights, values, capacity); got != want {
			t.Fatalf("Knapsack01(%v, %v, %d) = %d, brute = %d", weights, values, capacity, got, want)
		}
	}
}

// bruteHouseRobberRec — прямая рекурсия «взять/не взять» без мемоизации.
func bruteHouseRobberRec(nums []int) int {
	var rec func(i int) int
	rec = func(i int) int {
		if i >= len(nums) {
			return 0
		}
		skip := rec(i + 1)
		take := nums[i] + rec(i+2)
		if take > skip {
			return take
		}
		return skip
	}
	return rec(0)
}

func TestHouseRobberRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(16))
	for range 300 {
		n := rng.Intn(21) // без мемоизации рекурсия экспоненциальна
		nums := make([]int, n)
		for i := range nums {
			nums[i] = rng.Intn(50)
		}
		if got, want := HouseRobber(nums), bruteHouseRobberRec(nums); got != want {
			t.Fatalf("HouseRobber(%v) = %d, рекурсивный эталон = %d", nums, got, want)
		}
	}
}

// bruteUniquePathsRec — считает пути наивной рекурсией без мемоизации: ровно
// столько листьев дерева рекурсии, сколько путей, — другая идея, чем ряд Паскаля в ДП.
func bruteUniquePathsRec(m, n int) int {
	var rec func(i, j int) int
	rec = func(i, j int) int {
		if i == 0 || j == 0 {
			return 1
		}
		return rec(i-1, j) + rec(i, j-1)
	}
	return rec(m-1, n-1)
}

func TestUniquePathsRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(17))
	for range 300 {
		m := rng.Intn(9) + 1 // число листьев ~ C(m+n-2, m-1) — держим сетку маленькой
		n := rng.Intn(9) + 1
		if got, want := UniquePaths(m, n), bruteUniquePathsRec(m, n); got != want {
			t.Fatalf("UniquePaths(%d, %d) = %d, рекурсивный эталон = %d", m, n, got, want)
		}
	}
}

// bruteWordBreakRec — та же задача без ДП-массива: рекурсия перебирает все
// точки разреза и останавливается на первом успехе.
func bruteWordBreakRec(s string, dict []string) bool {
	set := make(map[string]bool, len(dict))
	for _, w := range dict {
		set[w] = true
	}
	var rec func(i int) bool
	rec = func(i int) bool {
		if i == len(s) {
			return true
		}
		for j := i + 1; j <= len(s); j++ {
			if set[s[i:j]] && rec(j) {
				return true
			}
		}
		return false
	}
	return rec(0)
}

func TestWordBreakRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(18))
	const alphabet = "ab"
	randStr := func(n int) string {
		buf := make([]byte, n)
		for i := range buf {
			buf[i] = alphabet[rng.Intn(len(alphabet))]
		}
		return string(buf)
	}
	for range 300 {
		s := randStr(rng.Intn(13)) // худший случай без мемоизации ~2^len(s)
		dict := make([]string, rng.Intn(4)+1)
		for i := range dict {
			dict[i] = randStr(rng.Intn(3) + 1)
		}
		if got, want := WordBreak(s, dict), bruteWordBreakRec(s, dict); got != want {
			t.Fatalf("WordBreak(%q, %v) = %v, рекурсивный эталон = %v", s, dict, got, want)
		}
	}
}
