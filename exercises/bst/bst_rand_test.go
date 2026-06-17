package bst

import (
	"math/rand"
	"sort"
	"testing"
)

// Эталон — множество map[int]bool с сортировкой ключей. После каждой операции
// InOrder() должен совпадать с отсортированными ключами эталона, а Search — с
// принадлежностью множеству (другой способ хранения, чем дерево).
func TestBSTRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(2024))
	for range 300 {
		tr := NewBST()
		ref := map[int]bool{}
		for range 200 {
			key := rng.Intn(30)
			switch rng.Intn(4) {
			case 0, 1:
				tr.Insert(key)
				ref[key] = true
			case 2:
				_, want := ref[key]
				if got := tr.Delete(key); got != want {
					t.Fatalf("Delete(%d) = %v, want %v", key, got, want)
				}
				delete(ref, key)
			case 3:
				if got, want := tr.Search(key), ref[key]; got != want {
					t.Fatalf("Search(%d) = %v, want %v", key, got, want)
				}
			}
			if got, want := tr.InOrder(), sortedKeys(ref); !equalInts(got, want) {
				t.Fatalf("InOrder() = %v, want %v", got, want)
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
