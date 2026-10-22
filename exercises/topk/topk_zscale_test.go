package topk

import (
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
)

// Вход тестов масштаба: n = 2·10⁵ разных чисел 0…n-1 вперемешку и k = n/2.
// При k порядка n решения «k раз найти максимум» (O(n·k)) и «держать k лучших
// отсортированным срезом со вставкой сдвигом» (O(n·k)) квадратичны; куча
// размера k — O(n log k). Шаг 7919 взаимно прост с n, поэтому perm — перестановка.
const (
	scaleN = 200000
	scaleK = scaleN / 2
)

func scalePerm(n int) []int {
	a := make([]int, n)
	for i := range a {
		a[i] = i * 7919 % n
	}
	return a
}

func TestFindKLargestScales(t *testing.T) {
	nums := scalePerm(scaleN)
	var got []int
	scaletest.Within(t, scaletest.Limit,
		"FindKLargest(n=200000 вперемешку, k=100000) — похоже на O(n·k) там, где нужен O(n log k)"+
			" (замер: эталон ~38 мс, k раз максимум ~18 с, он же с удалением найденного ~8.7 с, отсортированный срез со вставкой ~7.8 с)",
		func() { got = FindKLargest(nums, scaleK) })
	if len(got) != scaleK {
		t.Fatalf("FindKLargest вернул %d элементов, ожидалось %d", len(got), scaleK)
	}
	for i, v := range got {
		if v != scaleN-1-i {
			t.Fatalf("FindKLargest: [%d] = %d, ожидалось %d", i, v, scaleN-1-i)
		}
	}
}

func TestKthLargestScales(t *testing.T) {
	nums := scalePerm(scaleN)
	var got int
	scaletest.Within(t, scaletest.Limit,
		"KthLargest(n=200000 вперемешку, k=100000) — похоже на O(n·k) там, где нужен O(n log k)"+
			" (замер: эталон ~18 мс, k раз максимум с удалением ~8.6 с, отсортированный срез со вставкой ~7.8 с)",
		func() { got = KthLargest(nums, scaleK) })
	if want := scaleN - scaleK; got != want {
		t.Fatalf("KthLargest = %d, ожидалось %d", got, want)
	}
}

// TestKClosestPointsScales — точки (p, 0) и (0, p) по очереди, p — перестановка
// 0…n-1: квадраты расстояний p² все разные, k ближайших — те, у которых p < k.
// Вход вдвое меньше, чем у соседей: эталон считает расстояние в каждом сравнении кучи.
func TestKClosestPointsScales(t *testing.T) {
	const n, k = scaleN / 2, scaleN / 4
	points := make([][]int, n)
	for i, p := range scalePerm(n) {
		if i%2 == 0 {
			points[i] = []int{p, 0}
		} else {
			points[i] = []int{0, p}
		}
	}
	var got [][]int
	scaletest.Within(t, scaletest.Limit,
		"KClosestPoints(n=100000, k=50000) — похоже на O(n·k) там, где нужен O(n log k)"+
			" (замер: эталон ~30 мс, k раз ближайшая с удалением ~8.3 с)",
		func() { got = KClosestPoints(points, k) })
	if len(got) != k {
		t.Fatalf("KClosestPoints вернул %d точек, ожидалось %d", len(got), k)
	}
	seen := make([]bool, k)
	for _, p := range got {
		d := p[0] + p[1] // одна из координат — 0
		if d < 0 || d >= k || seen[d] {
			t.Fatalf("KClosestPoints: точка %v лишняя или повторяется", p)
		}
		seen[d] = true
	}
}

// TestTopKFrequentScales — m = 2·10⁵ разных значений: 0…k-1 встречаются по три
// раза, k…m-1 — по одному, n = 4·10⁵, k = m/2. Подсчёт частоты проходом по nums
// для каждого значения — O(n·m), k раз искать самое частое — O(k·m); словарь
// частот и куча или сортировка пар — O(n + m log m).
func TestTopKFrequentScales(t *testing.T) {
	const m, k = scaleN, scaleK
	perm := scalePerm(scaleN)
	nums := make([]int, 0, 3*k+(m-k))
	for _, v := range perm {
		nums = append(nums, v)
		if v < k {
			nums = append(nums, v, v)
		}
	}
	var got []int
	scaletest.Within(t, scaletest.Limit,
		"TopKFrequent(n=400000, 200000 разных значений, k=100000) — похоже на O(n·m) или O(k·m) там, где нужен O(n + m log k)"+
			" (замер: эталон ~20 мс, частота проходом по nums ~26.5 с, k раз самое частое ~12.7 с)",
		func() { got = TopKFrequent(nums, k) })
	if len(got) != k {
		t.Fatalf("TopKFrequent вернул %d значений, ожидалось %d", len(got), k)
	}
	seen := make([]bool, k)
	for _, v := range got {
		if v < 0 || v >= k || seen[v] {
			t.Fatalf("TopKFrequent: значение %d лишнее или повторяется", v)
		}
		seen[v] = true
	}
}
