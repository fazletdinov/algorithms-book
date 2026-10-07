package btree

import (
	"math/rand"
	"sort"
	"testing"
)

// Эталон — множество map[int]bool. При разных степенях t проверяем, что Search
// совпадает с принадлежностью, а InOrder отдаёт отсортированные уникальные ключи.
func TestBTreeRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(555))
	for tc := range 200 {
		degree := 2 + tc%4 // степени 2..5
		bt := NewBTree(degree)
		ref := map[int]bool{}
		for range 200 {
			key := rng.Intn(80)
			switch rng.Intn(3) {
			case 0, 1:
				bt.Insert(key)
				ref[key] = true
			case 2:
				if got, want := bt.Search(key), ref[key]; got != want {
					t.Fatalf("t=%d Search(%d) = %v, want %v", degree, key, got, want)
				}
			}
		}
		got := bt.InOrder()
		want := make([]int, 0, len(ref))
		for k := range ref {
			want = append(want, k)
		}
		sort.Ints(want)
		if len(got) != len(want) {
			t.Fatalf("t=%d InOrder len = %d, want %d", degree, len(got), len(want))
		}
		for i := range want {
			if got[i] != want[i] {
				t.Fatalf("t=%d InOrder() = %v, want %v", degree, got, want)
			}
		}
	}
}
