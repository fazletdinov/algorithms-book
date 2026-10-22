package binarysearch

import (
	"math"
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
)

// TestFindFirstLastScales — сложность, а не ответ. Все элементы равны target:
// «нашёл бинарным поиском, потом иду влево и вправо» проходит весь массив,
// O(n) на вызов. Два бинарных поиска границ — O(log n).
func TestFindFirstLastScales(t *testing.T) {
	const n, calls, target = 1000000, 30000, 5
	arr := make([]int, n)
	for i := range arr {
		arr[i] = target
	}
	var got []int
	scaletest.Within(t, scaletest.Limit,
		"FindFirstLast(n=1000000, все равны target, 30000 вызовов) — похоже на O(n) там, где нужен O(log n)"+
			" (замер: эталон ~2 мс, перебор ~9.2 с)",
		func() {
			for i := 0; i < calls; i++ {
				got = FindFirstLast(arr, target)
			}
		})
	if len(got) != 2 || got[0] != 0 || got[1] != n-1 {
		t.Fatalf("FindFirstLast = %v, ожидалось [0 %d]", got, n-1)
	}
}

// Общий вход тестов масштаба Search, FindCeiling и FindFloor: arr[i] = 2i,
// n = 10⁶, и scaleCalls запросов, разбросанных по всему диапазону [0, 2n):
// чётные есть в массиве, нечётные — нет. Линейный проход с досрочным выходом
// (в том числе «стоп, как только arr[i] > target», в том числе с конца массива)
// в среднем просматривает половину массива — O(n) на вызов против O(log n).
const (
	scaleN     = 1000000
	scaleCalls = 60000
)

func scaleSorted() []int {
	arr := make([]int, scaleN)
	for i := range arr {
		arr[i] = 2 * i
	}
	return arr
}

// scaleTarget — j-й запрос: шаг 104729 (простое, взаимно простое с 2n) обходит
// диапазон вразброс, без серий соседних значений.
func scaleTarget(j int) int { return j * 104729 % (2 * scaleN) }

func TestSearchScales(t *testing.T) {
	arr := scaleSorted()
	bad, badT, badGot := false, 0, 0
	scaletest.Within(t, scaletest.Limit,
		"Search(n=1000000, 60000 вызовов на одном массиве, target вразброс) — похоже на O(n) там, где нужен O(log n)"+
			" (замер: эталон ~10 мс, линейный поиск ~13.7 с, он же со стопом на arr[i] > target ~12.8 с)",
		func() {
			for j := 0; j < scaleCalls; j++ {
				tg := scaleTarget(j)
				want := -1
				if tg%2 == 0 {
					want = tg / 2
				}
				if got := Search(arr, tg); got != want && !bad {
					bad, badT, badGot = true, tg, got
				}
			}
		})
	if bad {
		t.Fatalf("Search(arr, %d) = %d — неверный ответ на большом массиве", badT, badGot)
	}
}

func TestFindCeilingScales(t *testing.T) {
	arr := scaleSorted()
	bad, badT, badGot := false, 0, 0
	scaletest.Within(t, scaletest.Limit,
		"FindCeiling(n=1000000, 60000 вызовов на одном массиве, key вразброс) — похоже на O(n) там, где нужен O(log n)"+
			" (замер: эталон ~10 мс, линейный поиск первого arr[i] >= key ~10.2 с, он же с конца ~10.7 с)",
		func() {
			for j := 0; j < scaleCalls; j++ {
				tg := scaleTarget(j)
				want := (tg + 1) / 2
				if want == scaleN {
					want = -1
				}
				if got := FindCeiling(arr, tg); got != want && !bad {
					bad, badT, badGot = true, tg, got
				}
			}
		})
	if bad {
		t.Fatalf("FindCeiling(arr, %d) = %d — неверный ответ на большом массиве", badT, badGot)
	}
}

func TestFindFloorScales(t *testing.T) {
	arr := scaleSorted()
	bad, badT, badGot := false, 0, 0
	scaletest.Within(t, scaletest.Limit,
		"FindFloor(n=1000000, 60000 вызовов на одном массиве, target вразброс) — похоже на O(n) там, где нужен O(log n)"+
			" (замер: эталон ~10 мс, линейный поиск до первого arr[i] > target ~12 с, он же с конца ~8.8 с)",
		func() {
			for j := 0; j < scaleCalls; j++ {
				tg := scaleTarget(j)
				if got := FindFloor(arr, tg); got != tg/2 && !bad {
					bad, badT, badGot = true, tg, got
				}
			}
		})
	if bad {
		t.Fatalf("FindFloor(arr, %d) = %d — неверный ответ на большом массиве", badT, badGot)
	}
}

// TestSearchRotatedScales — массив 2i, повёрнутый на треть: arr[i] = 2·((i+r) mod n).
// Отсортированности по всему массиву нет, поэтому линейный поиск досрочно не
// останавливается, а «найду точку поворота проходом, потом бинарный поиск»
// тратит на поворот O(n) на каждый вызов.
func TestSearchRotatedScales(t *testing.T) {
	const r = scaleN / 3
	arr := make([]int, scaleN)
	for i := range arr {
		arr[i] = 2 * ((i + r) % scaleN)
	}
	bad, badT, badGot := false, 0, 0
	scaletest.Within(t, scaletest.Limit,
		"SearchRotated(n=1000000, поворот на треть, 60000 вызовов на одном массиве) — похоже на O(n) там, где нужен O(log n)"+
			" (замер: эталон ~11 мс, линейный поиск ~13.6 с, поиск поворота проходом + бинарный ~10.7 с)",
		func() {
			for j := 0; j < scaleCalls; j++ {
				tg := scaleTarget(j)
				want := -1
				if tg%2 == 0 {
					want = (tg/2 - r + scaleN) % scaleN
				}
				if got := SearchRotated(arr, tg); got != want && !bad {
					bad, badT, badGot = true, tg, got
				}
			}
		})
	if bad {
		t.Fatalf("SearchRotated(arr, %d) = %d — неверный ответ на большом массиве", badT, badGot)
	}
}

// TestIntSqrtScales — x около 10¹⁸, √x ≈ 10⁹: подбор m по одному — 10⁹ шагов на
// вызов, бинарный поиск по m — около 60.
func TestIntSqrtScales(t *testing.T) {
	const calls = 40
	xs := make([]int, calls)
	for j := range xs {
		xs[j] = 1000000000000000000 - j*123456789
	}
	got := make([]int, calls)
	scaletest.Within(t, scaletest.Limit,
		"IntSqrt(x ≈ 10¹⁸, 40 вызовов) — похоже на O(√x) там, где нужен O(log x)"+
			" (замер: эталон < 1 мс, подбор m*m <= x по одному ~10 с, он же через m <= x/m ~100 с)",
		func() {
			for j, x := range xs {
				got[j] = IntSqrt(x)
			}
		})
	for j, x := range xs {
		want := int(math.Sqrt(float64(x)))
		for want*want > x {
			want--
		}
		for (want+1)*(want+1) <= x {
			want++
		}
		if got[j] != want {
			t.Fatalf("IntSqrt(%d) = %d, ожидалось %d", x, got[j], want)
		}
	}
}
