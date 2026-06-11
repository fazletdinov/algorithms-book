package greedy

import (
	"math"
	"math/rand"
	"sort"
	"testing"
)

func cloneIv(iv [][]int) [][]int {
	out := make([][]int, len(iv))
	for i, e := range iv {
		out[i] = append([]int{}, e...)
	}
	return out
}

// bruteMaxNonOverlap — макс. число попарно непересекающихся интервалов перебором
// всех подмножеств (полуинтервал [start,end): касание разрешено). Независимо от
// жадного выбора «по самому раннему концу».
func bruteMaxNonOverlap(intervals [][]int) int {
	n := len(intervals)
	best := 0
	for mask := 0; mask < (1 << n); mask++ {
		var sub [][]int
		for i := 0; i < n; i++ {
			if mask&(1<<i) != 0 {
				sub = append(sub, intervals[i])
			}
		}
		sort.Slice(sub, func(i, j int) bool { return sub[i][0] < sub[j][0] })
		ok := true
		for i := 1; i < len(sub); i++ {
			if sub[i][0] < sub[i-1][1] {
				ok = false
				break
			}
		}
		if ok && len(sub) > best {
			best = len(sub)
		}
	}
	return best
}

func TestMaxNonOverlappingRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(2801))
	for range 3000 {
		n := rng.Intn(10) + 1
		iv := make([][]int, n)
		for i := range iv {
			s := rng.Intn(15)
			iv[i] = []int{s, s + rng.Intn(5) + 1}
		}
		want := bruteMaxNonOverlap(cloneIv(iv))
		if got := MaxNonOverlapping(cloneIv(iv)); got != want {
			t.Fatalf("MaxNonOverlapping(%v) = %d, want %d", iv, got, want)
		}
	}
}

// canJumpBrute — достижимость последнего индекса прямой DP.
func canJumpBrute(nums []int) bool {
	n := len(nums)
	reach := make([]bool, n)
	reach[0] = true
	for i := 0; i < n; i++ {
		if !reach[i] {
			continue
		}
		for s := 1; s <= nums[i] && i+s < n; s++ {
			reach[i+s] = true
		}
	}
	return reach[n-1]
}

func TestCanJumpRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(2802))
	for range 5000 {
		n := rng.Intn(12) + 1
		nums := make([]int, n)
		for i := range nums {
			nums[i] = rng.Intn(5) // нули создают тупики
		}
		if got, want := CanJump(nums), canJumpBrute(nums); got != want {
			t.Fatalf("CanJump(%v) = %v, want %v", nums, got, want)
		}
	}
}

// minJumpsBrute — минимум прыжков до конца через BFS по уровням.
func minJumpsBrute(nums []int) int {
	n := len(nums)
	if n <= 1 {
		return 0
	}
	dist := make([]int, n)
	for i := range dist {
		dist[i] = -1
	}
	dist[0] = 0
	q := []int{0}
	for len(q) > 0 {
		i := q[0]
		q = q[1:]
		for s := 1; s <= nums[i] && i+s < n; s++ {
			if dist[i+s] == -1 {
				dist[i+s] = dist[i] + 1
				q = append(q, i+s)
			}
		}
	}
	return dist[n-1]
}

func TestMinJumpsRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(2803))
	for range 5000 {
		n := rng.Intn(12) + 1
		nums := make([]int, n)
		for i := range nums {
			nums[i] = rng.Intn(4) + 1 // ≥1 → конец всегда достижим
		}
		if got, want := MinJumps(nums), minJumpsBrute(nums); got != want {
			t.Fatalf("MinJumps(%v) = %d, want %d", nums, got, want)
		}
	}
}

// maxProfitBrute — неограниченное число сделок через автомат cash/hold
// (независимо от жадного «сумма положительных разностей»).
func maxProfitBrute(prices []int) int {
	cash, hold := 0, math.MinInt/2
	for _, p := range prices {
		cash, hold = max(cash, hold+p), max(hold, cash-p)
	}
	return cash
}

func TestMaxProfitRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(2804))
	for range 5000 {
		n := rng.Intn(12)
		prices := make([]int, n)
		for i := range prices {
			prices[i] = rng.Intn(15)
		}
		if got, want := MaxProfit(prices), maxProfitBrute(prices); got != want {
			t.Fatalf("MaxProfit(%v) = %d, want %d", prices, got, want)
		}
	}
}

// FractionalKnapsack возвращает float — проверяем свойствами: 0 ≤ r ≤ Σценностей,
// при ёмкости ≥ Σвесов берём всё, и результат монотонен по ёмкости.
func TestFractionalKnapsackRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(2805))
	const eps = 1e-9
	for range 5000 {
		n := rng.Intn(8) + 1
		values := make([]int, n)
		weights := make([]int, n)
		sumV, sumW := 0, 0
		for i := 0; i < n; i++ {
			values[i] = rng.Intn(20) + 1
			weights[i] = rng.Intn(10) + 1
			sumV += values[i]
			sumW += weights[i]
		}
		cap := rng.Intn(sumW + 5)
		r := FractionalKnapsack(values, weights, cap)
		if r < -eps || r > float64(sumV)+eps {
			t.Fatalf("FractionalKnapsack=%v вне [0, %d]", r, sumV)
		}
		if cap >= sumW && math.Abs(r-float64(sumV)) > eps {
			t.Fatalf("ёмкость %d ≥ Σвесов %d, но взято %v, а не Σценностей %d", cap, sumW, r, sumV)
		}
		// монотонность: большая ёмкость не уменьшает добычу
		if r2 := FractionalKnapsack(values, weights, cap+3); r2 < r-eps {
			t.Fatalf("монотонность нарушена: knap(%d)=%v > knap(%d)=%v", cap, r, cap+3, r2)
		}
	}
}
