package twoheaps

import (
	"math/rand"
	"sort"
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
)

// medianOf — медиана отсортированной копии: модель для сверки на нескольких точках.
func medianOf(a []int) float64 {
	s := append([]int(nil), a...)
	sort.Ints(s)
	n := len(s)
	if n%2 == 1 {
		return float64(s[n/2])
	}
	return float64(s[n/2-1]+s[n/2]) / 2
}

// TestMedianFinderScales — сложность, а не ответ. AddNum и FindMedian
// по очереди, 10⁵ раз каждый, случайные числа. Две кучи — O(log n) на AddNum
// и O(1) на FindMedian. Сортировка набора на каждый FindMedian — O(n log n) на
// вызов. sort.Ints на месте почти отсортированного среза (старые числа уже по
// порядку, одно новое в конце) pdqsort доводит почти за O(n) — поэтому вызовов
// 2·10⁵, а не 5·10⁴, как на LeetCode: на 5·10⁴ такая сортировка шла 0.36 с.
// Сортированный срез со вставкой сдвигом (O(n) на AddNum через memmove) тест не
// ловит: ~0.3 с.
func TestMedianFinderScales(t *testing.T) {
	const n = 100000
	r := rand.New(rand.NewSource(1))
	nums := make([]int, n)
	for i := range nums {
		nums[i] = r.Intn(200001) - 100000
	}
	got := make([]float64, 0, n)
	scaletest.Within(t, scaletest.Limit,
		"MedianFinder: 10⁵ раз AddNum и FindMedian по очереди, случайные числа —"+
			" похоже на сортировку набора на каждый FindMedian вместо двух куч"+
			" (замер: эталон ~10 мс, sort.Ints на месте ~5.8 с, сортировка копии — 16.6 с уже на 25000 парах)",
		func() {
			mf := NewMedianFinder()
			for _, x := range nums {
				mf.AddNum(x)
				got = append(got, mf.FindMedian())
			}
		})
	for _, i := range []int{0, 1, 2, 999, 12345, n - 2, n - 1} {
		if want := medianOf(nums[:i+1]); got[i] != want {
			t.Fatalf("FindMedian после %d чисел = %v, ожидалось %v", i+1, got[i], want)
		}
	}
}

// TestSlidingWindowMedianScales — сложность, а не ответ. n = 10⁵ случайных
// чисел, окно k = 5·10⁴. Две кучи с ленивым удалением — O(n log k). Сортировка
// каждого окна — O((n−k)·k log k).
func TestSlidingWindowMedianScales(t *testing.T) {
	const n, k = 100000, 50000
	r := rand.New(rand.NewSource(2))
	nums := make([]int, n)
	for i := range nums {
		nums[i] = r.Intn(2000000001) - 1000000000
	}
	var got []float64
	scaletest.Within(t, scaletest.Limit,
		"SlidingWindowMedian(n=10⁵, k=5·10⁴, случайные числа) — похоже на сортировку каждого окна"+
			" вместо двух куч (замер: эталон ~25 мс, сортировка каждого окна ~157 с)",
		func() { got = SlidingWindowMedian(nums, k) })
	if len(got) != n-k+1 {
		t.Fatalf("SlidingWindowMedian: %d медиан, ожидалось %d", len(got), n-k+1)
	}
	for _, i := range []int{0, 1, 777, 25000, n - k} {
		if want := medianOf(nums[i : i+k]); got[i] != want {
			t.Fatalf("медиана окна с начала %d = %v, ожидалось %v", i, got[i], want)
		}
	}
}

// TestMaximizeCapitalScales — сложность, а не ответ. 8·10⁴ проектов без порога
// капитала со случайной прибылью и 2·10⁴ недоступных (порог 10⁹, прибыль 10⁴),
// k = 8·10⁴. Куча доступных по прибыли — O((n+k) log n). Поиск лучшего доступного
// проекта проходом по всем на каждом шаге — O(k·n). Проход по списку,
// отсортированному по убыванию прибыли, до первого доступного неиспользованного
// тоже O(k·n): впереди списка всегда стоят недоступные проекты.
func TestMaximizeCapitalScales(t *testing.T) {
	const avail, blocked = 80000, 20000
	r := rand.New(rand.NewSource(3))
	profits := make([]int, avail+blocked)
	capital := make([]int, avail+blocked)
	want := 0
	for j, i := range r.Perm(avail + blocked) { // доступные и недоступные вперемешку
		if j < blocked {
			profits[i], capital[i] = 10000, 1000000000
			continue
		}
		profits[i] = r.Intn(10001)
		want += profits[i]
	}
	var got int
	scaletest.Within(t, scaletest.Limit,
		"MaximizeCapital(k=8·10⁴, 8·10⁴ проектов доступны сразу, 2·10⁴ — никогда) —"+
			" похоже на O(k·n): поиск лучшего проекта проходом по всем на каждом шаге"+
			" (замер: эталон ~20 мс, проход по всем ~33 с, проход по отсортированным по прибыли ~2.4 с)",
		func() { got = MaximizeCapital(avail, 0, profits, capital) })
	if got != want {
		t.Fatalf("MaximizeCapital = %d, ожидалось %d", got, want)
	}
}
