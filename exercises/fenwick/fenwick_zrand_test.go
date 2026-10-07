package fenwick

import (
	"math/rand"
	"testing"
)

// CountInversions через BIT с координатным сжатием против наивного O(n²) подсчёта.
func TestCountInversionsRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(303))
	for range 3000 {
		n := rng.Intn(15)
		arr := make([]int, n)
		for i := range arr {
			arr[i] = rng.Intn(10) - 5 // дубликаты и отрицательные
		}
		want := 0
		for i := range arr {
			for j := i + 1; j < n; j++ {
				if arr[i] > arr[j] {
					want++
				}
			}
		}
		if got := CountInversions(arr); got != want {
			t.Fatalf("CountInversions(%v) = %d, ожидалось %d", arr, got, want)
		}
	}
}

// CountSmallerToRight против наивного O(n²).
func TestCountSmallerToRightRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(304))
	for range 3000 {
		n := rng.Intn(15)
		arr := make([]int, n)
		for i := range arr {
			arr[i] = rng.Intn(10) - 5
		}
		want := make([]int, n)
		for i := range arr {
			for j := i + 1; j < n; j++ {
				if arr[j] < arr[i] {
					want[i]++
				}
			}
		}
		got := CountSmallerToRight(arr)
		if len(got) != n {
			t.Fatalf("CountSmallerToRight(%v): длина %d, ожидалось %d", arr, len(got), n)
		}
		for i := range want {
			if got[i] != want[i] {
				t.Fatalf("CountSmallerToRight(%v) = %v, ожидалось %v", arr, got, want)
			}
		}
	}
}
