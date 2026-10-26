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

// TestMinEatingSpeedRandom — сверка с перебором скоростей снизу вверх.
func TestMinEatingSpeedRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(875))
	for range 3000 {
		n := rng.Intn(6) + 1
		piles := make([]int, n)
		for i := range piles {
			piles[i] = rng.Intn(30) + 1
		}
		h := n + rng.Intn(3*n+1)
		want := 1
		for {
			hours := 0
			for _, p := range piles {
				hours += (p + want - 1) / want
			}
			if hours <= h {
				break
			}
			want++
		}
		if got := MinEatingSpeed(piles, h); got != want {
			t.Fatalf("MinEatingSpeed(%v, %d) = %d, ожидалось %d", piles, h, got, want)
		}
	}
}

// TestShipWithinDaysRandom — сверка с перебором всех разрезов на days кусков:
// ответ — наименьший по всем разрезам самый тяжёлый кусок.
func TestShipWithinDaysRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(1011))
	for range 3000 {
		n := rng.Intn(7) + 1
		w := make([]int, n)
		for i := range w {
			w[i] = rng.Intn(12) + 1
		}
		days := rng.Intn(n) + 1
		want := 1 << 62
		// маска — где резать между посылками; кусков не больше days (лишний день не мешает)
		for mask := 0; mask < 1<<(n-1); mask++ {
			pieces, load, worst := 1, 0, 0
			for i := 0; i < n; i++ {
				load += w[i]
				if i == n-1 || mask&(1<<i) != 0 {
					worst = max(worst, load)
					load = 0
					if i < n-1 {
						pieces++
					}
				}
			}
			if pieces <= days {
				want = min(want, worst)
			}
		}
		if got := ShipWithinDays(w, days); got != want {
			t.Fatalf("ShipWithinDays(%v, %d) = %d, ожидалось %d", w, days, got, want)
		}
	}
}
