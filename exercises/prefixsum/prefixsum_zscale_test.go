package prefixsum

import (
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
)

// TestRangeSumsScales — сложность, а не ответ. Каждый запрос — на весь ряд:
// сложение отрезка заново стоит n на запрос, O(n·q). Префиксные суммы — один
// проход и O(1) на запрос.
func TestRangeSumsScales(t *testing.T) {
	const n, q = 200000, 200000
	nums := make([]int, n)
	for i := range nums {
		nums[i] = 1
	}
	queries := make([][2]int, q)
	for i := range queries {
		queries[i] = [2]int{0, n - 1}
	}
	var got []int
	scaletest.Within(t, scaletest.Limit,
		"RangeSums(n=200000, q=200000, все запросы на весь ряд) — похоже на O(n·q) там, где нужен O(n + q)"+
			" (замер: эталон ~2 мс, перебор ~10.7 с)",
		func() { got = RangeSums(nums, queries) })
	if len(got) != q || got[0] != n || got[q-1] != n {
		t.Fatalf("RangeSums: len=%d; ожидалось %d ответов, каждый = %d", len(got), q, n)
	}
}

// TestCountSubarraysWithSumScales — сложность, а не ответ. Ряд из нулей и k = 0:
// подходит каждый из n(n+1)/2 подмассивов, и перебор пар начал и концов делает
// все n²/2 сложений — досрочно выйти ему не на чем (с отрицательными числами
// сумма не монотонна). Префиксы в map — O(n).
func TestCountSubarraysWithSumScales(t *testing.T) {
	const n = 400000
	nums := make([]int, n)
	var got int
	scaletest.Within(t, scaletest.Limit,
		"CountSubarraysWithSum(n=400000 нулей, k=0) — похоже на O(n²) там, где нужен O(n)"+
			" (замер: эталон ~3 мс, перебор ~10.4 с)",
		func() { got = CountSubarraysWithSum(nums, 0) })
	if want := n * (n + 1) / 2; got != want {
		t.Fatalf("CountSubarraysWithSum(нули, 0) = %d, ожидалось %d", got, want)
	}
}

// TestLongestBalancedScales — сложность, а не ответ. n−1 единиц и ноль в конце:
// ответ 2, и перебор отрезков — от длинных к коротким с выходом на первом
// найденном или от каждого начала с пропуском длин не длиннее лучшего — всё
// равно проверяет почти все n²/2 отрезков. Первый индекс каждой суммы — O(n).
func TestLongestBalancedScales(t *testing.T) {
	const n = 400000
	bits := make([]int, n)
	for i := 0; i < n-1; i++ {
		bits[i] = 1
	}
	var got int
	scaletest.Within(t, scaletest.Limit,
		"LongestBalanced(n=400000: единицы и ноль в конце) — похоже на O(n²) там, где нужен O(n)"+
			" (замер: эталон ~24 мс, перебор ~51 с, от длинных к коротким ~20.8 с)",
		func() { got = LongestBalanced(bits) })
	if got != 2 {
		t.Fatalf("LongestBalanced(единицы и ноль в конце) = %d, ожидалось 2", got)
	}
}

// TestCountDivisibleSubarraysScales — сложность, а не ответ. Все числа равны k:
// делится каждый подмассив, перебор пар делает n²/2 сложений. Счётчик остатков — O(n).
func TestCountDivisibleSubarraysScales(t *testing.T) {
	const n, k = 400000, 5
	nums := make([]int, n)
	for i := range nums {
		nums[i] = k
	}
	var got int
	scaletest.Within(t, scaletest.Limit,
		"CountDivisibleSubarrays(n=400000 чисел 5, k=5) — похоже на O(n²) там, где нужен O(n)"+
			" (замер: эталон ~1 мс, перебор ~10.6 с)",
		func() { got = CountDivisibleSubarrays(nums, k) })
	if want := n * (n + 1) / 2; got != want {
		t.Fatalf("CountDivisibleSubarrays(пятёрки, 5) = %d, ожидалось %d", got, want)
	}
}

// TestMaxSubarraySumScales — сложность, а не ответ. Ряд из единиц: сумма от
// каждого начала только растёт, поэтому перебор начал с бегущей суммой не
// выходит досрочно и по правилу «сумма ушла в минус — дальше не продолжать»:
// n²/2 сложений. Минимум префиксов (Кадане) — O(n).
func TestMaxSubarraySumScales(t *testing.T) {
	const n = 400000
	nums := make([]int, n)
	for i := range nums {
		nums[i] = 1
	}
	var got int
	scaletest.Within(t, scaletest.Limit,
		"MaxSubarraySum(n=400000 единиц) — похоже на O(n²) там, где нужен O(n)"+
			" (замер: эталон ~1 мс, перебор ~21.9 с)",
		func() { got = MaxSubarraySum(nums) })
	if got != n {
		t.Fatalf("MaxSubarraySum(единицы) = %d, ожидалось %d", got, n)
	}
}

// TestProductExceptSelfScales — сложность, а не ответ. Нулей нет (единицы и одна
// −1), поэтому перемножение всех соседей заново для каждого i не выходит досрочно
// на нуле: O(n²). Префикс слева и суффикс справа — O(n).
func TestProductExceptSelfScales(t *testing.T) {
	const n = 200000
	nums := make([]int, n)
	for i := range nums {
		nums[i] = 1
	}
	nums[0] = -1
	var got []int
	scaletest.Within(t, scaletest.Limit,
		"ProductExceptSelf(n=200000: единицы и −1 в начале) — похоже на O(n²) там, где нужен O(n)"+
			" (замер: эталон ~1 мс, перебор ~30.6 с)",
		func() { got = ProductExceptSelf(nums) })
	// без nums[0] остаются одни единицы, без любого другого — одна −1
	if len(got) != n || got[0] != 1 || got[1] != -1 || got[n-1] != -1 {
		t.Fatalf("ProductExceptSelf: len=%d, [0]=%v, [1]=%v, [n-1]=%v; ожидалось len=%d, 1, -1, -1",
			len(got), at(got, 0), at(got, 1), at(got, n-1), n)
	}
}

// TestApplyRangeAddsScales — сложность, а не ответ. Каждое обновление — на весь
// массив: прибавление циклом по отрезку стоит n на обновление, O(n·u).
// Разностный массив — O(n + u).
func TestApplyRangeAddsScales(t *testing.T) {
	const n, u = 200000, 200000
	updates := make([][3]int, u)
	for i := range updates {
		updates[i] = [3]int{0, n - 1, 1}
	}
	var got []int
	scaletest.Within(t, scaletest.Limit,
		"ApplyRangeAdds(n=200000, u=200000, все обновления на весь массив) — похоже на O(n·u) там, где нужен O(n + u)"+
			" (замер: эталон ~1 мс, перебор ~15.2 с)",
		func() { got = ApplyRangeAdds(n, updates) })
	if len(got) != n || got[0] != u || got[n-1] != u {
		t.Fatalf("ApplyRangeAdds: len=%d; ожидалось %d элементов, каждый = %d", len(got), n, u)
	}
}

// TestMatrixRegionSumsScales — сложность, а не ответ. Каждый запрос — на всю
// матрицу: суммирование прямоугольника заново стоит R·C на запрос. Две матрицы,
// высокая и широкая, нужны против полумеры — префиксов только по строкам (или
// только по столбцам): она стоит O(R) (или O(C)) на запрос и на «своей» форме
// матрицы быстра, а на другой — O(q·10⁵). Двумерные префиксы — O(R·C + q).
func TestMatrixRegionSumsScales(t *testing.T) {
	const long, short, q = 100000, 2, 100000
	tall := make([][]int, long)
	for i := range tall {
		tall[i] = []int{1, 1}
	}
	wide := make([][]int, short)
	for i := range wide {
		wide[i] = make([]int, long)
		for j := range wide[i] {
			wide[i][j] = 1
		}
	}
	tallQ := make([][4]int, q)
	wideQ := make([][4]int, q)
	for i := range tallQ {
		tallQ[i] = [4]int{0, 0, long - 1, short - 1}
		wideQ[i] = [4]int{0, 0, short - 1, long - 1}
	}
	var gotTall, gotWide []int
	scaletest.Within(t, scaletest.Limit,
		"MatrixRegionSums(матрицы 100000×2 и 2×100000, по 100000 запросов на всю матрицу) —"+
			" похоже на O(R·C·q) или O(R·q) там, где нужен O(R·C + q)"+
			" (замер: эталон ~5 мс, перебор ~22 с, префиксы по строкам ~10.5 с)",
		func() {
			gotTall = MatrixRegionSums(tall, tallQ)
			gotWide = MatrixRegionSums(wide, wideQ)
		})
	const want = long * short
	if len(gotTall) != q || gotTall[0] != want || gotTall[q-1] != want {
		t.Fatalf("MatrixRegionSums(100000×2): len=%d, [0]=%v; ожидалось %d ответов, каждый = %d",
			len(gotTall), at(gotTall, 0), q, want)
	}
	if len(gotWide) != q || gotWide[0] != want || gotWide[q-1] != want {
		t.Fatalf("MatrixRegionSums(2×100000): len=%d, [0]=%v; ожидалось %d ответов, каждый = %d",
			len(gotWide), at(gotWide, 0), q, want)
	}
}

func at(a []int, i int) any {
	if i < 0 || i >= len(a) {
		return "нет"
	}
	return a[i]
}
