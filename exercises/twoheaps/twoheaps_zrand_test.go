package twoheaps

import (
	"math"
	"math/rand"
	"sort"
	"testing"
)

// bruteWindowMedian — наивная медиана каждого окна через сортировку (эталон).
func bruteWindowMedian(nums []int, k int) []float64 {
	res := make([]float64, 0, len(nums)-k+1)
	for i := 0; i+k <= len(nums); i++ {
		w := append([]int(nil), nums[i:i+k]...)
		sort.Ints(w)
		var m float64
		if k%2 == 1 {
			m = float64(w[k/2])
		} else {
			m = float64(w[k/2-1]+w[k/2]) / 2
		}
		res = append(res, m)
	}
	return res
}

// TestSlidingWindowMedianRandom: сравнение с наивной медианой на случайных окнах.
// Дубликаты и перемещение медианы между кучами при удалении старого элемента —
// самая тонкая часть «двух куч»; единичные кейсы её недопроверяют.
func TestSlidingWindowMedianRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(4))
	for c := range 1000 {
		// Вторая половина — длинные окна из трёх значений: равные числа по обе стороны
		// границы куч и выбывшие, ждущие на дне, — там ленивое удаление и ошибается.
		n, spread := rng.Intn(25)+1, 20
		if c >= 500 {
			n, spread = rng.Intn(200)+1, 3
		}
		k := rng.Intn(n) + 1
		nums := make([]int, n)
		for i := range nums {
			nums[i] = rng.Intn(spread) - spread/2
		}
		got := SlidingWindowMedian(nums, k)
		want := bruteWindowMedian(nums, k)
		if len(got) != len(want) {
			t.Fatalf("SlidingWindowMedian(%v, %d): длина %d, ожидалось %d", nums, k, len(got), len(want))
		}
		for i := range want {
			if math.Abs(got[i]-want[i]) > 1e-9 {
				t.Fatalf("SlidingWindowMedian(%v, %d) = %v, brute = %v", nums, k, got, want)
			}
		}
	}
}
