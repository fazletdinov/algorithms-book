package sorting

import (
	"math/rand"
	"testing"
)

// Случайные дифференциальные тесты против независимого эталона (сортировка
// вставками из sortedCopy). Узкий диапазон значений даёт много дубликатов —
// это вскрывает классические ошибки: нестабильное слияние, '<' vs '<=' в
// partition (зацикливание/потеря элементов), неверный размер кучи при
// извлечении. Сид фиксирован → падение воспроизводимо.
func randSlice(rng *rand.Rand) []int {
	n := rng.Intn(40)
	a := make([]int, n)
	for i := range a {
		a[i] = rng.Intn(15) - 7 // [-7..7]: дубликаты и отрицательные
	}
	return a
}

func TestMergeSortRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(1))
	for range 2000 {
		in := randSlice(rng)
		orig := append([]int(nil), in...)
		got := MergeSort(in)
		want := sortedCopy(in)
		if !intsEqual(got, want) {
			t.Fatalf("MergeSort(%v) = %v, want %v", orig, got, want)
		}
		if !intsEqual(in, orig) {
			t.Fatalf("MergeSort мутировал вход: %v -> %v", orig, in)
		}
	}
}

func TestQuickSortRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(2))
	for range 2000 {
		in := randSlice(rng)
		a := append([]int(nil), in...)
		QuickSort(a)
		if !intsEqual(a, sortedCopy(in)) {
			t.Fatalf("QuickSort(%v) -> %v", in, a)
		}
	}
}

func TestHeapSortRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(3))
	for range 2000 {
		in := randSlice(rng)
		a := append([]int(nil), in...)
		HeapSort(a)
		if !intsEqual(a, sortedCopy(in)) {
			t.Fatalf("HeapSort(%v) -> %v", in, a)
		}
	}
}

func TestCountingSortRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(4))
	for range 2000 {
		in := randSlice(rng)
		if !intsEqual(CountingSort(in), sortedCopy(in)) {
			t.Fatalf("CountingSort(%v) неверно", in)
		}
	}
}

func TestQuickSelectRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(5))
	for range 2000 {
		in := randSlice(rng)
		if len(in) == 0 {
			continue
		}
		want := sortedCopy(in)
		k := rng.Intn(len(in)) + 1
		a := append([]int(nil), in...)
		if got := QuickSelect(a, k); got != want[k-1] {
			t.Fatalf("QuickSelect(%v, %d) = %d, want %d", in, k, got, want[k-1])
		}
	}
}
