package greedy

import (
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
)

// TestCanJumpScales — сложность, а не ответ. Два входа, потому что у квадратичной
// разметки два естественных вида, и худший вход у них разный.
//
// Лестница: из каждой позиции i ≤ m можно допрыгнуть ровно до m, где стоит 0, и
// последний индекс m+1 недостижим. «Отметь всё, куда прыгаешь из i» стоит nums[i]
// на позицию — Σ(m−i) = O(n²).
//
// Одни единицы: «для каждого j найди достижимое i < j, откуда до j допрыгнуть»
// с досрочным выходом находит такое i только в самом конце перебора (i = j−1) —
// снова O(n²). Самая дальняя достижимая позиция — O(n) на обоих.
func TestCanJumpScales(t *testing.T) {
	const m = 199998
	stairs := make([]int, m+2)
	for i := 0; i <= m; i++ {
		stairs[i] = m - i // stairs[m] = 0
	}
	ones := make([]int, m+2)
	for i := range ones {
		ones[i] = 1
	}
	var gotStairs, gotOnes bool
	scaletest.Within(t, scaletest.Limit,
		"CanJump(n=200000: лестница к нулю и одни единицы) — похоже на O(n²) там, где нужен O(n)"+
			" (замер: эталон < 1 мс, разметка ~8.4 с, поиск источника ~10.2 с)",
		func() {
			gotStairs = CanJump(stairs)
			gotOnes = CanJump(ones)
		})
	if gotStairs {
		t.Fatalf("CanJump(лестница) = true, а последний индекс недостижим")
	}
	if !gotOnes {
		t.Fatalf("CanJump(одни единицы) = false, а дойти можно шагами по одному")
	}
}

// TestMinJumpsScales — сложность, а не ответ. Два входа под два вида
// квадратичного ДП, как у CanJump.
//
// «До конца»: nums[i] = n−1−i — из каждой позиции видно всё до конца. «Отметь
// dp[j] = min(dp[j], dp[i]+1) для всех j, куда прыгаешь из i» стоит n−1−i на
// позицию — Σ = O(n²); ответ 1.
//
// Одни единицы: «для каждого j найди первое i < j, откуда до j допрыгнуть»
// с досрочным выходом находит его только в самом конце перебора (i = j−1) —
// снова O(n²); ответ n−1. Жадные уровни BFS — O(n) на обоих.
func TestMinJumpsScales(t *testing.T) {
	const n = 200000
	toEnd := make([]int, n)
	ones := make([]int, n)
	for i := range toEnd {
		toEnd[i] = n - 1 - i
		ones[i] = 1
	}
	var gotEnd, gotOnes int
	scaletest.Within(t, scaletest.Limit,
		"MinJumps(n=200000: прыжки до конца и одни единицы) — похоже на O(n²) там, где нужен O(n)"+
			" (замер: эталон < 1 мс, разметка ~12.9 с, поиск источника ~5.2 с)",
		func() {
			gotEnd = MinJumps(toEnd)
			gotOnes = MinJumps(ones)
		})
	if gotEnd != 1 {
		t.Fatalf("MinJumps(до конца) = %d, ожидалось 1", gotEnd)
	}
	if gotOnes != n-1 {
		t.Fatalf("MinJumps(одни единицы) = %d, ожидалось %d", gotOnes, n-1)
	}
}

// TestMaxNonOverlappingScales — сложность, а не ответ. Два входа по 10⁵
// интервалов.
//
// Попарно не пересекаются ([2i, 2i+1]): берутся все, и «сверь кандидата с
// каждым выбранным» делает Σ k = O(n²) сравнений; ответ n.
//
// Все пересекаются ([i, i+n] — все содержат [n−1, n]): ДП «dp[i] = 1 + max dp[j]
// по совместимым j», даже с поиском совместимого назад с досрочным выходом, не
// находит ни одного и обходит всё — O(n²); ответ 1. Сортировка по концу и
// сверка с последним выбранным — O(n log n).
func TestMaxNonOverlappingScales(t *testing.T) {
	const n = 100000
	disjoint := make([][]int, n)
	nested := make([][]int, n)
	for i := 0; i < n; i++ {
		disjoint[i] = []int{2 * i, 2*i + 1}
		nested[i] = []int{i, i + n}
	}
	var gotDisjoint, gotNested int
	scaletest.Within(t, scaletest.Limit,
		"MaxNonOverlapping(n=100000: попарно не пересекаются и все пересекаются) — похоже на O(n²)"+
			" там, где нужен O(n log n) (замер: эталон ~1 мс, сверка со всеми выбранными ~5.2 с,"+
			" ДП с поиском назад ~5.6 с)",
		func() {
			gotDisjoint = MaxNonOverlapping(disjoint)
			gotNested = MaxNonOverlapping(nested)
		})
	if gotDisjoint != n {
		t.Fatalf("MaxNonOverlapping(не пересекаются) = %d, ожидалось %d", gotDisjoint, n)
	}
	if gotNested != 1 {
		t.Fatalf("MaxNonOverlapping(все пересекаются) = %d, ожидалось 1", gotNested)
	}
}

// TestMaxProfitScales — сложность, а не ответ. 2·10⁵ дней, цена скачет 1, 3, 1,
// 3, …: прибыль 2 на каждой паре дней, ответ n. ДП «лучшее к дню i = max по дню
// покупки j < i» — O(n²), рекурсия «купить / продать / пропустить» без
// запоминания — экспонента. Сумма положительных приростов — O(n).
func TestMaxProfitScales(t *testing.T) {
	const n = 200000
	prices := make([]int, n)
	for i := range prices {
		prices[i] = 1 + 2*(i%2)
	}
	var got int
	scaletest.Within(t, scaletest.Limit,
		"MaxProfit(n=200000, цены 1 3 1 3 …) — похоже на O(n²) там, где нужен O(n)"+
			" (замер: эталон < 1 мс, ДП по дню покупки ~9.8 с, рекурсия при n = 34 — 75 с и ×4 на два дня)",
		func() { got = MaxProfit(prices) })
	if got != n {
		t.Fatalf("MaxProfit = %d, ожидалось %d", got, n)
	}
}

// TestFractionalKnapsackScales — сложность, а не ответ. 10⁵ предметов,
// вместимость — их общий вес: взять нужно всё. «Каждый раз ищи среди
// оставшихся предмет с лучшей удельной стоимостью» (выбор без сортировки)
// — O(n²), сортировка вставками — тоже; сортировка по удельной стоимости —
// O(n log n). Ответ — сумма ценностей: при полном рюкзаке дробей нет, и сумма
// целых точна в float64.
func TestFractionalKnapsackScales(t *testing.T) {
	const n = 100000
	values := make([]int, n)
	weights := make([]int, n)
	x := uint32(2463534242)
	capacity, total := 0, 0
	for i := 0; i < n; i++ {
		x ^= x << 13
		x ^= x >> 17
		x ^= x << 5
		values[i] = 1 + int(x%10000)
		weights[i] = 1 + int((x>>14)%10000)
		capacity += weights[i]
		total += values[i]
	}
	var got float64
	scaletest.Within(t, scaletest.Limit,
		"FractionalKnapsack(n=100000, вместимость = общий вес) — похоже на O(n²) там, где нужен"+
			" O(n log n) (замер: эталон ~18 мс, выбор лучшего среди оставшихся ~31 с, сортировка вставками ~6.4 с)",
		func() { got = FractionalKnapsack(values, weights, capacity) })
	if got != float64(total) {
		t.Fatalf("FractionalKnapsack = %v, ожидалось %d", got, total)
	}
}
