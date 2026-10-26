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

// brutePartitionLabels — перебор всех способов разрезать строку: годится разрез,
// где ни одна буква не попала в два куска; берём тот, где кусков больше.
func brutePartitionLabels(s string) []int {
	n := len(s)
	if n == 0 {
		return []int{}
	}
	var best []int
	for mask := 0; mask < 1<<(n-1); mask++ { // бит i — разрез после s[i]
		var pieces []int
		owner := map[byte]int{}
		ok, start := true, 0
		for i := 0; i < n && ok; i++ {
			if o, seen := owner[s[i]]; seen && o != len(pieces) {
				ok = false
			}
			owner[s[i]] = len(pieces)
			if i == n-1 || mask&(1<<i) != 0 {
				pieces = append(pieces, i-start+1)
				start = i + 1
			}
		}
		if ok && len(pieces) > len(best) {
			best = pieces
		}
	}
	return best
}

func TestPartitionLabelsRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(763))
	for range 3000 {
		n := rng.Intn(11)
		b := make([]byte, n)
		for i := range b {
			b[i] = byte('a' + rng.Intn(4))
		}
		s := string(b)
		if got, want := PartitionLabels(s), brutePartitionLabels(s); !sameInts(got, want) {
			t.Fatalf("PartitionLabels(%q) = %v, ожидалось %v", s, got, want)
		}
	}
}

// bruteCircuitStarts — все станции, с которых объезд круга удаётся.
func bruteCircuitStarts(gas, cost []int) []int {
	n := len(gas)
	var starts []int
	for s := 0; s < n; s++ {
		tank, ok := 0, true
		for k := 0; k < n && ok; k++ {
			i := (s + k) % n
			tank += gas[i] - cost[i]
			ok = tank >= 0
		}
		if ok {
			starts = append(starts, s)
		}
	}
	return starts
}

// TestCanCompleteCircuitRandom — сверка с перебором стартов. Входы, где годных
// стартов несколько, пропускаются: условие обещает не больше одного.
func TestCanCompleteCircuitRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(134))
	checked := 0
	for range 6000 {
		n := rng.Intn(8) + 1
		gas, cost := make([]int, n), make([]int, n)
		for i := range gas {
			gas[i], cost[i] = rng.Intn(6), rng.Intn(6)
		}
		starts := bruteCircuitStarts(gas, cost)
		if len(starts) > 1 {
			continue
		}
		want := -1
		if len(starts) == 1 {
			want = starts[0]
		}
		checked++
		if got := CanCompleteCircuit(gas, cost); got != want {
			t.Fatalf("CanCompleteCircuit(%v, %v) = %d, ожидалось %d", gas, cost, got, want)
		}
	}
	if checked < 1000 {
		t.Fatalf("проверено всего %d входов — генератор сломан", checked)
	}
}

// bruteLeastInterval — перебор всех порядков задач; при заданном порядке каждую
// задачу ставим в самый ранний такт, разрешённый кулдауном.
func bruteLeastInterval(tasks []byte, n int) int {
	if len(tasks) == 0 {
		return 0
	}
	order := append([]byte{}, tasks...)
	sort.Slice(order, func(i, j int) bool { return order[i] < order[j] })
	best := math.MaxInt
	used := make([]bool, len(order))
	cur := make([]byte, 0, len(order))
	var rec func()
	rec = func() {
		if len(cur) == len(order) {
			last := map[byte]int{}
			time := 0
			for _, c := range cur {
				if l, ok := last[c]; ok && time < l+n+1 {
					time = l + n + 1
				}
				last[c] = time
				time++
			}
			best = min(best, time)
			return
		}
		for i := range order {
			if used[i] || (i > 0 && order[i] == order[i-1] && !used[i-1]) {
				continue
			}
			used[i] = true
			cur = append(cur, order[i])
			rec()
			cur = cur[:len(cur)-1]
			used[i] = false
		}
	}
	rec()
	return best
}

func TestLeastIntervalRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(621))
	for range 1500 {
		size := rng.Intn(8)
		tasks := make([]byte, size)
		for i := range tasks {
			tasks[i] = byte('A' + rng.Intn(3))
		}
		n := rng.Intn(4)
		if got, want := LeastInterval(tasks, n), bruteLeastInterval(tasks, n); got != want {
			t.Fatalf("LeastInterval(%q, %d) = %d, ожидалось %d", tasks, n, got, want)
		}
	}
}

// bruteJobScheduling — перебор всех подмножеств заявок: набор годится, если после
// сортировки по началу каждая следующая начинается не раньше конца предыдущей.
func bruteJobScheduling(startTime, endTime, profit []int) int {
	n := len(startTime)
	best := 0
	for mask := 0; mask < 1<<n; mask++ {
		var idx []int
		for i := 0; i < n; i++ {
			if mask&(1<<i) != 0 {
				idx = append(idx, i)
			}
		}
		sort.Slice(idx, func(a, b int) bool { return startTime[idx[a]] < startTime[idx[b]] })
		ok, sum := true, 0
		for k, i := range idx {
			if k > 0 && startTime[i] < endTime[idx[k-1]] {
				ok = false
				break
			}
			sum += profit[i]
		}
		if ok && sum > best {
			best = sum
		}
	}
	return best
}

func TestJobSchedulingRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(1235))
	for range 3000 {
		n := rng.Intn(10)
		s, e, p := make([]int, n), make([]int, n), make([]int, n)
		for i := range s {
			s[i] = rng.Intn(12)
			e[i] = s[i] + 1 + rng.Intn(6)
			p[i] = 1 + rng.Intn(20)
		}
		if got, want := JobScheduling(s, e, p), bruteJobScheduling(s, e, p); got != want {
			t.Fatalf("JobScheduling(%v, %v, %v) = %d, ожидалось %d", s, e, p, got, want)
		}
	}
}
