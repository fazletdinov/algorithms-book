package sorting

import (
	"math/rand"
	"sort"
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
)

// Тесты масштаба сортировок — сложность, а не ответ. Вход случайный с
// фиксированным зерном и широким диапазоном значений: на нём сортировки
// вставками и выбором стоят O(n²). Для QuickSort и QuickSelect есть ещё два
// входа — отсортированный и все равные: условие обещает O(n log n) и O(n) в
// среднем на любом входе, и на них падает фиксированный опорный a[hi]
// (отсортированный: ~23 с на QuickSort) и разбиение на две зоны вместо трёх
// (все равные).

const scaleN = 300000

func scaleInput() []int {
	rng := rand.New(rand.NewSource(1))
	a := make([]int, scaleN)
	for i := range a {
		a[i] = rng.Intn(2_000_000_000) - 1_000_000_000
	}
	return a
}

func stdSorted(a []int) []int {
	out := append([]int(nil), a...)
	sort.Ints(out)
	return out
}

func TestMergeSortScales(t *testing.T) {
	in := scaleInput()
	var got []int
	scaletest.Within(t, scaletest.Limit,
		"MergeSort(n=300000, случайные) — похоже на O(n²) там, где нужен O(n log n)"+
			" (замер: эталон ~50 мс, вставками ~30.1 с, вставками с бинарным поиском и copy ~8.1 с, выбором ~27.9 с)",
		func() { got = MergeSort(in) })
	if !intsEqual(got, stdSorted(in)) {
		t.Fatalf("MergeSort на случайном входе n=%d вернул не отсортированную перестановку", scaleN)
	}
}

func TestQuickSortScales(t *testing.T) {
	in := scaleInput()
	a := append([]int(nil), in...)
	scaletest.Within(t, scaletest.Limit,
		"QuickSort(n=300000, случайные) — похоже на O(n²) там, где нужен O(n log n) в среднем"+
			" (замер: эталон ~21 мс, вставками ~30.1 с, выбором ~27.9 с)",
		func() { QuickSort(a) })
	if !intsEqual(a, stdSorted(in)) {
		t.Fatalf("QuickSort на случайном входе n=%d дал не отсортированную перестановку", scaleN)
	}
}

// Кроме вставок и выбора ловит «кучу», перестраиваемую целиком после каждого
// извлечения: n построений по O(n) — O(n²).
func TestHeapSortScales(t *testing.T) {
	in := scaleInput()
	a := append([]int(nil), in...)
	scaletest.Within(t, scaletest.Limit,
		"HeapSort(n=300000, случайные) — похоже на O(n²) там, где нужен O(n log n)"+
			" (замер: эталон ~40 мс, перестройка кучи после каждого извлечения ~29.3 с, вставками ~30.1 с)",
		func() { HeapSort(a) })
	if !intsEqual(a, stdSorted(in)) {
		t.Fatalf("HeapSort на случайном входе n=%d дал не отсортированную перестановку", scaleN)
	}
}

// Подсчёт против «для каждого значения диапазона пройди весь массив» — O(n·k).
// Сортировку сравнениями этот тест не ловит и не должен: O(n log n) против
// O(n + k) — это лишний log, а не другой класс.
func TestCountingSortScales(t *testing.T) {
	const n = 300000
	rng := rand.New(rand.NewSource(2))
	in := make([]int, n)
	for i := range in {
		in[i] = rng.Intn(n) - n/2 // k ≈ n, есть и отрицательные
	}
	var got []int
	scaletest.Within(t, scaletest.Limit,
		"CountingSort(n=300000, значения в диапазоне ~300000) — похоже на O(n·k) там, где нужен O(n + k)"+
			" (замер: эталон ~4 мс, проход массива на каждое значение ~24.6 с)",
		func() { got = CountingSort(in) })
	if !intsEqual(got, stdSorted(in)) {
		t.Fatalf("CountingSort на случайном входе n=%d вернул не отсортированную перестановку", n)
	}
}

// k = n/2 — медиана. Против «k раз найди минимум» (O(n·k)) и «для каждого
// элемента посчитай, сколько меньше» (O(n²)). Сортировка целиком — O(n log n),
// лишний log, её тест не ловит.
func TestQuickSelectScales(t *testing.T) {
	const n = 300000
	rng := rand.New(rand.NewSource(3))
	in := make([]int, n)
	for i := range in {
		in[i] = rng.Intn(2_000_000_000) - 1_000_000_000
	}
	a := append([]int(nil), in...)
	k := n / 2
	var got int
	scaletest.Within(t, scaletest.Limit,
		"QuickSelect(n=300000, случайные, k=n/2) — похоже на O(n²) там, где нужен O(n) в среднем"+
			" (замер: эталон ~3 мс, k раз минимум ~20.5 с, счёт рангов ~16.8 с)",
		func() { got = QuickSelect(a, k) })
	if want := stdSorted(in)[k-1]; got != want {
		t.Fatalf("QuickSelect(n=%d, k=%d) = %d, ожидалось %d", n, k, got, want)
	}
}

// sortedInput и equalInput — входы, на которых фиксированный опорный и разбиение
// на две зоны режут кусок на единицу: n уровней по O(n) — O(n²).
func sortedInput() []int {
	a := make([]int, scaleN)
	for i := range a {
		a[i] = i
	}
	return a
}

func equalInput() []int {
	a := make([]int, scaleN)
	for i := range a {
		a[i] = 7
	}
	return a
}

func TestQuickSortScalesOnBadOrder(t *testing.T) {
	for _, tc := range []struct {
		name string
		in   []int
	}{
		{"отсортированный", sortedInput()},
		{"все равные", equalInput()},
	} {
		t.Run(tc.name, func(t *testing.T) {
			a := append([]int(nil), tc.in...)
			scaletest.Within(t, scaletest.Limit,
				"QuickSort(n=300000, "+tc.name+") — похоже на O(n²): опорный фиксированный или зон две, а не три"+
					" (замер: эталон ~10 мс, Ломуто с a[hi] на отсортированном ~23 с)",
				func() { QuickSort(a) })
			if !intsEqual(a, stdSorted(tc.in)) {
				t.Fatalf("QuickSort на входе «%s» дал не отсортированную перестановку", tc.name)
			}
		})
	}
}

func TestQuickSelectScalesOnBadOrder(t *testing.T) {
	for _, tc := range []struct {
		name string
		in   []int
	}{
		{"отсортированный", sortedInput()},
		{"все равные", equalInput()},
	} {
		t.Run(tc.name, func(t *testing.T) {
			a := append([]int(nil), tc.in...)
			k := scaleN / 2
			var got int
			scaletest.Within(t, scaletest.Limit,
				"QuickSelect(n=300000, "+tc.name+", k=n/2) — похоже на O(n²): опорный фиксированный или зон две, а не три",
				func() { got = QuickSelect(a, k) })
			if want := stdSorted(tc.in)[k-1]; got != want {
				t.Fatalf("QuickSelect на входе «%s», k=%d = %d, ожидалось %d", tc.name, k, got, want)
			}
		})
	}
}
