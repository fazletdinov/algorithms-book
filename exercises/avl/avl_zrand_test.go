package avl

import (
	"math/rand"
	"sort"
	"testing"
)

// Случайные вставки: InOrder совпадает с отсортированным множеством, Search —
// с принадлежностью, и после каждой вставки дерево остаётся сбалансированным.
func TestAVLRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(31337))
	for range 300 {
		tr := NewAVL()
		ref := map[int]bool{}
		for range 150 {
			key := rng.Intn(500)
			tr.Insert(key)
			ref[key] = true

			checkBalanced(t, tr.root)
			if got, want := tr.InOrder(), sortedKeys(ref); !equalInts(got, want) {
				t.Fatalf("InOrder() = %v, want %v", got, want)
			}
			if !tr.Search(key) {
				t.Fatalf("Search(%d) = false после вставки", key)
			}
		}
	}
}

func sortedKeys(m map[int]bool) []int {
	out := make([]int, 0, len(m))
	for k := range m {
		out = append(out, k)
	}
	sort.Ints(out)
	return out
}

func equalInts(a, b []int) bool {
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
