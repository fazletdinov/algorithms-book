package kwaymerge

import (
	"math/rand"
	"sort"
	"testing"
)

// MergeKSortedArrays против «склеить всё и отсортировать».
func TestMergeKSortedArraysRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(505))
	for range 2000 {
		k := rng.Intn(5) + 1
		arrays := make([][]int, k)
		var all []int
		for i := range arrays {
			m := rng.Intn(5)
			a := make([]int, m)
			for j := range a {
				a[j] = rng.Intn(30)
			}
			sort.Ints(a)
			arrays[i] = a
			all = append(all, a...)
		}
		sort.Ints(all)
		got := MergeKSortedArrays(arrays)
		if len(got) != len(all) {
			t.Fatalf("MergeKSortedArrays(%v): длина %d, ожидалось %d", arrays, len(got), len(all))
		}
		for i := range all {
			if got[i] != all[i] {
				t.Fatalf("MergeKSortedArrays(%v) = %v, ожидалось %v", arrays, got, all)
			}
		}
	}
}

// KthSmallestInSortedArrays (1-based) против склейки и сортировки.
func TestKthSmallestInSortedArraysRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(506))
	for range 2000 {
		k := rng.Intn(4) + 1
		arrays := make([][]int, k)
		var all []int
		for i := range arrays {
			m := rng.Intn(5) + 1 // непустые, чтобы был достижимый k
			a := make([]int, m)
			for j := range a {
				a[j] = rng.Intn(30)
			}
			sort.Ints(a)
			arrays[i] = a
			all = append(all, a...)
		}
		sort.Ints(all)
		kk := rng.Intn(len(all)) + 1 // 1..len
		want := all[kk-1]
		if got := KthSmallestInSortedArrays(arrays, kk); got != want {
			t.Fatalf("KthSmallestInSortedArrays(%v, %d) = %d, ожидалось %d", arrays, kk, got, want)
		}
	}
}
