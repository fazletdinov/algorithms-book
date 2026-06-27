package sorting

import "testing"

var sortCases = [][]int{
	{},
	{1},
	{2, 1},
	{1, 2, 3, 4, 5},
	{5, 4, 3, 2, 1},
	{5, 2, 4, 1, 3},
	{3, 0, 3, 1, 0, 2},
	{-3, 5, -1, 0, -3, 8, 2},
	{7, 7, 7, 7},
	{2, 1, 2, 1, 2, 1, 0},
}

func sortedCopy(in []int) []int {
	out := make([]int, len(in))
	copy(out, in)
	// простая сортировка вставками — независимый эталон, не из тестируемого кода
	for i := 1; i < len(out); i++ {
		for j := i; j > 0 && out[j-1] > out[j]; j-- {
			out[j-1], out[j] = out[j], out[j-1]
		}
	}
	return out
}

func intsEqual(a, b []int) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}

func TestMergeSort(t *testing.T) {
	for _, in := range sortCases {
		orig := append([]int(nil), in...)
		got := MergeSort(in)
		want := sortedCopy(in)
		if !intsEqual(got, want) {
			t.Fatalf("MergeSort(%v) = %v, want %v", orig, got, want)
		}
		if !intsEqual(in, orig) {
			t.Fatalf("MergeSort изменил входной срез: было %v, стало %v", orig, in)
		}
	}
}

func TestQuickSort(t *testing.T) {
	for _, in := range sortCases {
		a := append([]int(nil), in...)
		QuickSort(a)
		want := sortedCopy(in)
		if !intsEqual(a, want) {
			t.Fatalf("QuickSort(%v) -> %v, want %v", in, a, want)
		}
	}
}

func TestHeapSort(t *testing.T) {
	for _, in := range sortCases {
		a := append([]int(nil), in...)
		HeapSort(a)
		want := sortedCopy(in)
		if !intsEqual(a, want) {
			t.Fatalf("HeapSort(%v) -> %v, want %v", in, a, want)
		}
	}
}

func TestCountingSort(t *testing.T) {
	for _, in := range sortCases {
		got := CountingSort(in)
		want := sortedCopy(in)
		if !intsEqual(got, want) {
			t.Fatalf("CountingSort(%v) = %v, want %v", in, got, want)
		}
	}
}

func TestQuickSelect(t *testing.T) {
	for _, in := range sortCases {
		if len(in) == 0 {
			continue
		}
		want := sortedCopy(in)
		for k := 1; k <= len(in); k++ {
			a := append([]int(nil), in...)
			got := QuickSelect(a, k)
			if got != want[k-1] {
				t.Fatalf("QuickSelect(%v, %d) = %d, want %d", in, k, got, want[k-1])
			}
		}
	}
}
