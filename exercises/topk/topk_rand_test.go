package topk

import (
	"math/rand"
	"sort"
	"testing"
)

// FindKLargest (по убыванию) против сортировки. Узкий диапазон → дубликаты.
func TestFindKLargestRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(404))
	for range 3000 {
		n := rng.Intn(20) + 1
		k := rng.Intn(n) + 1
		nums := make([]int, n)
		for i := range nums {
			nums[i] = rng.Intn(30) - 15
		}
		want := append([]int(nil), nums...)
		sort.Sort(sort.Reverse(sort.IntSlice(want)))
		want = want[:k]
		got := FindKLargest(nums, k)
		if len(got) != k {
			t.Fatalf("FindKLargest(%v,%d): длина %d, ожидалось %d", nums, k, len(got), k)
		}
		for i := range want {
			if got[i] != want[i] {
				t.Fatalf("FindKLargest(%v,%d) = %v, ожидалось %v", nums, k, got, want)
			}
		}
	}
}

// KthLargest против сортировки по убыванию.
func TestKthLargestRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(405))
	for range 3000 {
		n := rng.Intn(20) + 1
		k := rng.Intn(n) + 1
		nums := make([]int, n)
		for i := range nums {
			nums[i] = rng.Intn(30) - 15
		}
		s := append([]int(nil), nums...)
		sort.Sort(sort.Reverse(sort.IntSlice(s)))
		want := s[k-1]
		if got := KthLargest(nums, k); got != want {
			t.Fatalf("KthLargest(%v,%d) = %d, ожидалось %d", nums, k, got, want)
		}
	}
}
