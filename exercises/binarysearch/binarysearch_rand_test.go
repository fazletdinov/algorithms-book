package binarysearch

import (
	"math/rand"
	"sort"
	"testing"
)

// SearchRotated на случайном повёрнутом массиве из различных чисел против наивного
// сканирования. Перебираем все точки поворота и цели (в т.ч. отсутствующие).
func TestSearchRotatedRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(202))
	for range 3000 {
		n := rng.Intn(12) + 1
		set := map[int]bool{}
		for len(set) < n {
			set[rng.Intn(40)] = true
		}
		base := make([]int, 0, n)
		for v := range set {
			base = append(base, v)
		}
		sort.Ints(base)
		k := rng.Intn(n) // точка поворота
		arr := make([]int, 0, n)
		arr = append(arr, base[k:]...)
		arr = append(arr, base[:k]...)

		target := rng.Intn(40)
		want := -1
		for i, v := range arr {
			if v == target {
				want = i
				break
			}
		}
		if got := SearchRotated(arr, target); got != want {
			t.Fatalf("SearchRotated(%v, %d) = %d, ожидалось %d", arr, target, got, want)
		}
	}
}

// FindFirstLast на отсортированном массиве с дубликатами против наивного поиска
// границ ([-1,-1] если нет).
func TestFindFirstLastRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(203))
	for range 3000 {
		n := rng.Intn(12)
		arr := make([]int, n)
		for i := range arr {
			arr[i] = rng.Intn(6)
		}
		sort.Ints(arr)
		target := rng.Intn(6)
		first, last := -1, -1
		for i, v := range arr {
			if v == target {
				if first == -1 {
					first = i
				}
				last = i
			}
		}
		got := FindFirstLast(arr, target)
		if len(got) != 2 || got[0] != first || got[1] != last {
			t.Fatalf("FindFirstLast(%v, %d) = %v, ожидалось [%d %d]", arr, target, got, first, last)
		}
	}
}
