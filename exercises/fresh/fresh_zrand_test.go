package fresh

import (
	"math"
	"math/rand"
	"slices"
	"testing"
)

// Сверка с перебором на маленьких случайных входах. Переборы — прямые
// определения из условий, без всякой хитрости.

func g1BruteSatisfied(customers []int, grumpy []bool, k int) int {
	best := 0
	for s := 0; s+k <= len(customers); s++ {
		sum := 0
		for i, c := range customers {
			if !grumpy[i] || (i >= s && i < s+k) {
				sum += c
			}
		}
		best = max(best, sum)
	}
	return best
}

// g1BruteBoats перебирает все разбиения на пары и одиночек.
func g1BruteBoats(w []int, limit int) int {
	if len(w) == 0 {
		return 0
	}
	rest := w[1:]
	best := 1 + g1BruteBoats(rest, limit) // первый едет один
	for j := range rest {
		if w[0]+rest[j] <= limit {
			other := append(slices.Clone(rest[:j]), rest[j+1:]...)
			best = min(best, 1+g1BruteBoats(other, limit))
		}
	}
	return best
}

func g1BruteClosing(log string) int {
	bestHour, best := 0, len(log)+1
	for j := 0; j <= len(log); j++ {
		p := 0
		for i := 0; i < len(log); i++ {
			if (i < j && log[i] == 'N') || (i >= j && log[i] == 'Y') {
				p++
			}
		}
		if p < best {
			best, bestHour = p, j
		}
	}
	return bestHour
}

func g1BruteSteady(nums []int) int {
	c := 0
	for i := range nums {
		for j := i + 1; j < len(nums); j++ {
			if nums[j]-nums[i] == j-i {
				c++
			}
		}
	}
	return c
}

func g1BruteWarming(temps []int) int {
	best := 0
	for i := range temps {
		for j := i + 1; j < len(temps); j++ {
			if temps[i] <= temps[j] {
				best = max(best, j-i)
			}
		}
	}
	return best
}

func g1BruteTrips(tripTime []int, total int) int {
	for T := 1; ; T++ {
		done := 0
		for _, d := range tripTime {
			done += T / d
		}
		if done >= total {
			return T
		}
	}
}

func g1BruteBusy(sessions [][2]int) int {
	total := 0
	for t := 0; t < 40; t++ { // координаты входа — меньше 40
		for _, s := range sessions {
			if s[0] <= t && t < s[1] {
				total++
				break
			}
		}
	}
	return total
}

func g1BruteH(citations []int) int {
	for h := len(citations); h > 0; h-- {
		c := 0
		for _, x := range citations {
			if x >= h {
				c++
			}
		}
		if c >= h {
			return h
		}
	}
	return 0
}

func TestMaxSatisfiedCustomersRandom(t *testing.T) {
	r := rand.New(rand.NewSource(1))
	for it := 0; it < 2000; it++ {
		n := 1 + r.Intn(10)
		customers := make([]int, n)
		grumpy := make([]bool, n)
		for i := range customers {
			customers[i] = r.Intn(6)
			grumpy[i] = r.Intn(2) == 0
		}
		k := 1 + r.Intn(n)
		if got, want := MaxSatisfiedCustomers(customers, grumpy, k), g1BruteSatisfied(customers, grumpy, k); got != want {
			t.Fatalf("MaxSatisfiedCustomers(%v, %v, %d) = %d, ожидалось %d", customers, grumpy, k, got, want)
		}
	}
}

func TestMinBoatsRandom(t *testing.T) {
	r := rand.New(rand.NewSource(2))
	for it := 0; it < 1000; it++ {
		n := 1 + r.Intn(8)
		limit := 1 + r.Intn(10)
		w := make([]int, n)
		for i := range w {
			w[i] = 1 + r.Intn(limit)
		}
		want := g1BruteBoats(w, limit)
		if got := MinBoats(slices.Clone(w), limit); got != want {
			t.Fatalf("MinBoats(%v, %d) = %d, ожидалось %d", w, limit, got, want)
		}
	}
}

func TestBestClosingHourRandom(t *testing.T) {
	r := rand.New(rand.NewSource(3))
	for it := 0; it < 2000; it++ {
		b := make([]byte, 1+r.Intn(12))
		for i := range b {
			b[i] = "YN"[r.Intn(2)]
		}
		log := string(b)
		if got, want := BestClosingHour(log), g1BruteClosing(log); got != want {
			t.Fatalf("BestClosingHour(%q) = %d, ожидалось %d", log, got, want)
		}
	}
}

func TestCountSteadyPairsRandom(t *testing.T) {
	r := rand.New(rand.NewSource(4))
	for it := 0; it < 2000; it++ {
		nums := make([]int, 1+r.Intn(12))
		for i := range nums {
			nums[i] = i + r.Intn(4) - 2 // часто «по одному в день»
		}
		if got, want := CountSteadyPairs(nums), g1BruteSteady(nums); got != want {
			t.Fatalf("CountSteadyPairs(%v) = %d, ожидалось %d", nums, got, want)
		}
	}
}

func TestLongestWarmingSpanRandom(t *testing.T) {
	r := rand.New(rand.NewSource(5))
	for it := 0; it < 2000; it++ {
		temps := make([]int, 2+r.Intn(12))
		for i := range temps {
			temps[i] = r.Intn(7) - 3
		}
		if got, want := LongestWarmingSpan(temps), g1BruteWarming(temps); got != want {
			t.Fatalf("LongestWarmingSpan(%v) = %d, ожидалось %d", temps, got, want)
		}
	}
}

func TestMinTimeForTripsRandom(t *testing.T) {
	r := rand.New(rand.NewSource(6))
	for it := 0; it < 2000; it++ {
		tripTime := make([]int, 1+r.Intn(5))
		for i := range tripTime {
			tripTime[i] = 1 + r.Intn(9)
		}
		total := 1 + r.Intn(30)
		if got, want := MinTimeForTrips(tripTime, total), g1BruteTrips(tripTime, total); got != want {
			t.Fatalf("MinTimeForTrips(%v, %d) = %d, ожидалось %d", tripTime, total, got, want)
		}
	}
}

func TestTotalBusyTimeRandom(t *testing.T) {
	r := rand.New(rand.NewSource(7))
	for it := 0; it < 2000; it++ {
		sessions := make([][2]int, r.Intn(7))
		for i := range sessions {
			s := r.Intn(35)
			sessions[i] = [2]int{s, s + 1 + r.Intn(5)}
		}
		if got, want := TotalBusyTime(slices.Clone(sessions)), g1BruteBusy(sessions); got != want {
			t.Fatalf("TotalBusyTime(%v) = %d, ожидалось %d", sessions, got, want)
		}
	}
}

func TestHIndexRandom(t *testing.T) {
	r := rand.New(rand.NewSource(8))
	for it := 0; it < 2000; it++ {
		c := make([]int, 1+r.Intn(10))
		for i := range c {
			c[i] = r.Intn(13)
		}
		want := g1BruteH(c)
		if got := HIndex(slices.Clone(c)); got != want {
			t.Fatalf("HIndex(%v) = %d, ожидалось %d", c, got, want)
		}
	}
}

// Сверка с перебором на маленьких случайных входах. Зерно фиксировано —
// падение воспроизводится.

const g2rounds = 2000

func TestMaxTwinSumRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(21))
	for round := 0; round < g2rounds; round++ {
		n := 2 * (1 + rng.Intn(6))
		vals := make([]int, n)
		for i := range vals {
			vals[i] = rng.Intn(21) - 10
		}
		want := math.MinInt
		for i := 0; i < n/2; i++ {
			want = max(want, vals[i]+vals[n-1-i])
		}
		if got := MaxTwinSum(g2list(vals)); got != want {
			t.Fatalf("MaxTwinSum(%v) = %d, ожидалось %d", vals, got, want)
		}
	}
}

// g2randTree — случайное дерево из n узлов: каждый новый узел подвешивается
// на свободное место случайного уже стоящего узла.
func g2randTree(rng *rand.Rand, n, lo, hi int) *TreeNode {
	if n == 0 {
		return nil
	}
	nodes := []*TreeNode{{Val: lo + rng.Intn(hi-lo+1)}}
	for len(nodes) < n {
		p := nodes[rng.Intn(len(nodes))]
		child := &TreeNode{Val: lo + rng.Intn(hi-lo+1)}
		if rng.Intn(2) == 0 && p.Left == nil {
			p.Left = child
		} else if p.Right == nil {
			p.Right = child
		} else {
			continue
		}
		nodes = append(nodes, child)
	}
	return nodes[0]
}

func g2levelSums(n *TreeNode, depth int, sums map[int]int) {
	if n == nil {
		return
	}
	sums[depth] += n.Val
	g2levelSums(n.Left, depth+1, sums)
	g2levelSums(n.Right, depth+1, sums)
}

func TestHeaviestLevelRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(22))
	for round := 0; round < g2rounds; round++ {
		root := g2randTree(rng, rng.Intn(10), -5, 5)
		sums := map[int]int{}
		g2levelSums(root, 1, sums)
		want, best := 0, math.MinInt
		for d := 1; d <= len(sums); d++ {
			if sums[d] > best {
				want, best = d, sums[d]
			}
		}
		if got := HeaviestLevel(root); got != want {
			t.Fatalf("HeaviestLevel(%s) = %d, ожидалось %d", g2treeString(root), got, want)
		}
	}
}

func TestTimeToNotifyAllRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(23))
	for round := 0; round < g2rounds; round++ {
		n := 1 + rng.Intn(9)
		// Перемешанный порядок найма: начальник — кто-то, нанятый раньше.
		order := rng.Perm(n)
		manager := make([]int, n)
		manager[order[0]] = -1
		for k := 1; k < n; k++ {
			manager[order[k]] = order[rng.Intn(k)]
		}
		notifyTime := make([]int, n)
		for i := range notifyTime {
			notifyTime[i] = rng.Intn(6)
		}
		// Перебор: каждому сотруднику — сумма времён его начальников по цепочке.
		want := 0
		for i := 0; i < n; i++ {
			sum := 0
			for m := manager[i]; m != -1; m = manager[m] {
				sum += notifyTime[m]
			}
			want = max(want, sum)
		}
		if got := TimeToNotifyAll(manager, notifyTime); got != want {
			t.Fatalf("TimeToNotifyAll(%v, %v) = %d, ожидалось %d", manager, notifyTime, got, want)
		}
	}
}

// g2dist — расстояние между ценой и запросом.
func g2dist(x int) int {
	if x < 0 {
		return -x
	}
	return x
}

// g2bstInsert — вставка в дерево поиска без балансировки: случайный порядок
// даёт деревья разной формы.
func g2bstInsert(root *TreeNode, v int) *TreeNode {
	if root == nil {
		return &TreeNode{Val: v}
	}
	if v < root.Val {
		root.Left = g2bstInsert(root.Left, v)
	} else {
		root.Right = g2bstInsert(root.Right, v)
	}
	return root
}

func TestClosestPricesRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(24))
	for round := 0; round < g2rounds; round++ {
		n := 1 + rng.Intn(8)
		var root *TreeNode
		prices := rng.Perm(30)[:n]
		for _, p := range prices {
			root = g2bstInsert(root, 2*p) // чётные цены: нечётный запрос между соседями даёт ничью
		}
		queries := make([]int, 1+rng.Intn(5))
		for i := range queries {
			queries[i] = rng.Intn(62) - 1
		}
		want := make([]int, len(queries))
		for i, q := range queries {
			best := math.MaxInt
			for _, p := range prices {
				p *= 2
				if best == math.MaxInt || g2dist(p-q) < g2dist(best-q) || (g2dist(p-q) == g2dist(best-q) && p < best) {
					best = p
				}
			}
			want[i] = best
		}
		if got := ClosestPrices(root, queries); !slices.Equal(got, want) {
			t.Fatalf("ClosestPrices(%s, %v) = %v, ожидалось %v", g2treeString(root), queries, got, want)
		}
	}
}

// g2canReach — перебор для FurthestStop: хватит ли сил дойти до точки last, если
// попутки отдать самым высоким подъёмам на пути.
func g2canReach(heights []int, energy, rides, last int) bool {
	var climbs []int
	for i := 0; i < last; i++ {
		if d := heights[i+1] - heights[i]; d > 0 {
			climbs = append(climbs, d)
		}
	}
	slices.Sort(climbs)
	paid := 0
	for i := 0; i < len(climbs)-rides; i++ {
		paid += climbs[i]
	}
	return paid <= energy
}

func TestFurthestStopRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(25))
	for round := 0; round < g2rounds; round++ {
		n := 1 + rng.Intn(9)
		heights := make([]int, n)
		for i := range heights {
			heights[i] = 1 + rng.Intn(10)
		}
		energy, rides := rng.Intn(15), rng.Intn(4)
		want := 0
		for want+1 < n && g2canReach(heights, energy, rides, want+1) {
			want++
		}
		if got := FurthestStop(heights, energy, rides); got != want {
			t.Fatalf("FurthestStop(%v, %d, %d) = %d, ожидалось %d", heights, energy, rides, got, want)
		}
	}
}

// g2randPairs — случайные различные пары вершин из n.
func g2randPairs(rng *rand.Rand, n, m int) [][]int {
	seen := map[[2]int]bool{}
	var pairs [][]int
	for tries := 0; len(pairs) < m && tries < 10*m; tries++ {
		a, b := rng.Intn(n), rng.Intn(n)
		if a == b || seen[[2]int{a, b}] || seen[[2]int{b, a}] {
			continue
		}
		seen[[2]int{a, b}] = true
		pairs = append(pairs, []int{a, b})
	}
	return pairs
}

func TestCableMovesToConnectRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(26))
	for round := 0; round < g2rounds; round++ {
		n := 1 + rng.Intn(9)
		cables := g2randPairs(rng, n, rng.Intn(n+3))
		// Перебор: метки кусков, слияние перекрашиванием.
		label := make([]int, n)
		for i := range label {
			label[i] = i
		}
		for _, c := range cables {
			from, to := label[c[0]], label[c[1]]
			for i := range label {
				if label[i] == from {
					label[i] = to
				}
			}
		}
		pieces := map[int]bool{}
		for _, l := range label {
			pieces[l] = true
		}
		want := len(pieces) - 1
		if len(cables) < n-1 {
			want = -1
		}
		if got := CableMovesToConnect(n, cables); got != want {
			t.Fatalf("CableMovesToConnect(%d, %v) = %d, ожидалось %d", n, cables, got, want)
		}
	}
}

// g2routes перебирает все простые маршруты из v в n−1 (при положительных весах
// быстрейший маршрут не проходит перекрёсток дважды) и копит лучшее время и их число.
func g2routes(adj [][][2]int, v, t, time int, used []bool, best, count *int) {
	if v == t {
		if time < *best {
			*best, *count = time, 0
		}
		if time == *best {
			*count++
		}
		return
	}
	for _, e := range adj[v] {
		if !used[e[0]] {
			used[e[0]] = true
			g2routes(adj, e[0], t, time+e[1], used, best, count)
			used[e[0]] = false
		}
	}
}

func TestFastestRoutesCountRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(27))
	for round := 0; round < g2rounds; round++ {
		n := 1 + rng.Intn(7)
		pairs := g2randPairs(rng, n, rng.Intn(2*n+1))
		roads := make([][]int, len(pairs))
		adj := make([][][2]int, n)
		for i, p := range pairs {
			w := 1 + rng.Intn(3) // мелкие веса — много ничьих
			roads[i] = []int{p[0], p[1], w}
			adj[p[0]] = append(adj[p[0]], [2]int{p[1], w})
			adj[p[1]] = append(adj[p[1]], [2]int{p[0], w})
		}
		used := make([]bool, n)
		used[0] = true
		best, want := math.MaxInt, 0
		g2routes(adj, 0, n-1, 0, used, &best, &want)
		if got := FastestRoutesCount(n, roads); got != want {
			t.Fatalf("FastestRoutesCount(%d, %v) = %d, ожидалось %d", n, roads, got, want)
		}
	}
}

func TestMinBuildTimeRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(28))
	for round := 0; round < g2rounds; round++ {
		n := 1 + rng.Intn(8)
		duration := make([]int, n)
		for i := range duration {
			duration[i] = 1 + rng.Intn(5)
		}
		var deps [][]int
		for k := rng.Intn(2 * n); k > 0; k-- {
			a, b := rng.Intn(n), rng.Intn(n)
			if rng.Intn(4) != 0 && a > b { // чаще без кругов, иногда — с ними
				a, b = b, a
			}
			deps = append(deps, []int{a, b})
		}
		// Перебор: пересчитываем окончания, пока меняются; не успокоилось за n
		// проходов — есть круг (на круге время растёт без конца).
		finish := slices.Clone(duration)
		stable := false
		for pass := 0; pass <= n && !stable; pass++ {
			stable = true
			for _, d := range deps {
				if finish[d[0]]+duration[d[1]] > finish[d[1]] {
					finish[d[1]] = finish[d[0]] + duration[d[1]]
					stable = false
				}
			}
		}
		want := slices.Max(finish)
		if !stable {
			want = -1
		}
		if got := MinBuildTime(n, duration, deps); got != want {
			t.Fatalf("MinBuildTime(%d, %v, %v) = %d, ожидалось %d", n, duration, deps, got, want)
		}
	}
}

// Сверка с перебором на маленьких случайных входах. Переборы ниже — по
// определению задачи, без идей эталона; зерно фиксировано, падение повторяется.

// g3BruteOffices перебирает все способы выбрать половину в офис A.
func g3BruteOffices(costs [][2]int) int {
	n := len(costs)
	best := -1
	for mask := 0; mask < 1<<n; mask++ {
		inA, sum := 0, 0
		for i := 0; i < n; i++ {
			if mask>>i&1 == 1 {
				inA++
				sum += costs[i][0]
			} else {
				sum += costs[i][1]
			}
		}
		if inA == n/2 && (best < 0 || sum < best) {
			best = sum
		}
	}
	return best
}

func TestSplitBetweenOfficesRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(3101))
	for iter := 0; iter < 2000; iter++ {
		n := 2 * (1 + rng.Intn(6))
		costs := make([][2]int, n)
		for i := range costs {
			costs[i] = [2]int{1 + rng.Intn(20), 1 + rng.Intn(20)}
		}
		if got, want := SplitBetweenOffices(costs), g3BruteOffices(costs); got != want {
			t.Fatalf("SplitBetweenOffices(%v) = %d, перебор даёт %d", costs, got, want)
		}
	}
}

// g3BruteCabins: первый не рассаженный едет один или с любым, кто помещается.
func g3BruteCabins(weights []int, limit int, seated []bool) int {
	first := -1
	for i := range weights {
		if !seated[i] {
			first = i
			break
		}
	}
	if first < 0 {
		return 0
	}
	seated[first] = true
	best := 1 + g3BruteCabins(weights, limit, seated)
	for j := first + 1; j < len(weights); j++ {
		if !seated[j] && weights[first]+weights[j] <= limit {
			seated[j] = true
			if c := 1 + g3BruteCabins(weights, limit, seated); c < best {
				best = c
			}
			seated[j] = false
		}
	}
	seated[first] = false
	return best
}

// g3BruteTickets: на первую непокрытую поездку покупаем один из трёх проездных.
func g3BruteTickets(days []int, costs [3]int, from int) int {
	if from == len(days) {
		return 0
	}
	best := -1
	for t, d := range [3]int{1, 7, 30} {
		next := from
		for next < len(days) && days[next] < days[from]+d {
			next++
		}
		if c := costs[t] + g3BruteTickets(days, costs, next); best < 0 || c < best {
			best = c
		}
	}
	return best
}

func TestMinTicketCostRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(3103))
	for iter := 0; iter < 2000; iter++ {
		n := 1 + rng.Intn(10)
		days := make([]int, n)
		day := 0
		for i := range days {
			day += 1 + rng.Intn(9)
			days[i] = day
		}
		costs := [3]int{1 + rng.Intn(10), 1 + rng.Intn(30), 1 + rng.Intn(60)}
		if got, want := MinTicketCost(days, costs), g3BruteTickets(days, costs, 0); got != want {
			t.Fatalf("MinTicketCost(%v, %v) = %d, перебор даёт %d", days, costs, got, want)
		}
	}
}

// g3BruteMerge пробует оба источника для каждого следующего символа.
func g3BruteMerge(a, b, merged string) bool {
	if merged == "" {
		return a == "" && b == ""
	}
	if a != "" && a[0] == merged[0] && g3BruteMerge(a[1:], b, merged[1:]) {
		return true
	}
	return b != "" && b[0] == merged[0] && g3BruteMerge(a, b[1:], merged[1:])
}

func g3RandWord(rng *rand.Rand, n int) string {
	buf := make([]byte, n)
	for i := range buf {
		buf[i] = byte('a' + rng.Intn(2))
	}
	return string(buf)
}

func TestCanMergeLogsRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(3104))
	for iter := 0; iter < 4000; iter++ {
		a, b := g3RandWord(rng, rng.Intn(6)), g3RandWord(rng, rng.Intn(6))
		var merged string
		if iter%2 == 0 {
			// Настоящее слияние: так ответ «да» встречается часто.
			i, j, buf := 0, 0, []byte{}
			for i < len(a) || j < len(b) {
				if j == len(b) || (i < len(a) && rng.Intn(2) == 0) {
					buf = append(buf, a[i])
					i++
				} else {
					buf = append(buf, b[j])
					j++
				}
			}
			if len(buf) > 0 && rng.Intn(3) == 0 {
				buf[rng.Intn(len(buf))] ^= 'a' ^ 'b' // испорченное слияние
			}
			merged = string(buf)
		} else {
			merged = g3RandWord(rng, rng.Intn(12))
		}
		if got, want := CanMergeLogs(a, b, merged), g3BruteMerge(a, b, merged); got != want {
			t.Fatalf("CanMergeLogs(%q, %q, %q) = %v, перебор даёт %v", a, b, merged, got, want)
		}
	}
}

// g3BruteVan перебирает все наборы заказов.
func g3BruteVan(orders [][2]int, maxWeight, maxVolume int) int {
	best := 0
	for mask := 0; mask < 1<<len(orders); mask++ {
		w, v, cnt := 0, 0, 0
		for i, o := range orders {
			if mask>>i&1 == 1 {
				w += o[0]
				v += o[1]
				cnt++
			}
		}
		if w <= maxWeight && v <= maxVolume && cnt > best {
			best = cnt
		}
	}
	return best
}

func TestMaxOrdersInVanRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(3105))
	for iter := 0; iter < 2000; iter++ {
		n := 1 + rng.Intn(10)
		orders := make([][2]int, n)
		for i := range orders {
			orders[i] = [2]int{1 + rng.Intn(10), 1 + rng.Intn(10)}
		}
		maxWeight, maxVolume := 1+rng.Intn(30), 1+rng.Intn(30)
		if got, want := MaxOrdersInVan(orders, maxWeight, maxVolume), g3BruteVan(orders, maxWeight, maxVolume); got != want {
			t.Fatalf("MaxOrdersInVan(%v, %d, %d) = %d, перебор даёт %d", orders, maxWeight, maxVolume, got, want)
		}
	}
}

// g3BruteParts перебирает все места разрезов маской.
func g3BruteParts(s string) int {
	best := 0
	for mask := 0; mask < 1<<(len(s)-1); mask++ {
		seen := map[string]bool{}
		start, ok := 0, true
		for i := 1; i <= len(s); i++ {
			if i == len(s) || mask>>(i-1)&1 == 1 {
				part := s[start:i]
				if seen[part] {
					ok = false
					break
				}
				seen[part] = true
				start = i
			}
		}
		if ok && len(seen) > best {
			best = len(seen)
		}
	}
	return best
}

func TestMaxUniquePartsRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(3106))
	for iter := 0; iter < 1500; iter++ {
		n := 1 + rng.Intn(12)
		buf := make([]byte, n)
		alpha := 1 + rng.Intn(3)
		for i := range buf {
			buf[i] = byte('a' + rng.Intn(alpha))
		}
		s := string(buf)
		if got, want := MaxUniqueParts(s), g3BruteParts(s); got != want {
			t.Fatalf("MaxUniqueParts(%q) = %d, перебор даёт %d", s, got, want)
		}
	}
}

// g3BruteWords выкладывает слова из МАГНИТОВ (позиций) и складывает их в множество.
func g3BruteWords(tiles string, used []bool, word []byte, seen map[string]bool) {
	for i := 0; i < len(tiles); i++ {
		if used[i] {
			continue
		}
		used[i] = true
		word = append(word, tiles[i])
		seen[string(word)] = true
		g3BruteWords(tiles, used, word, seen)
		word = word[:len(word)-1]
		used[i] = false
	}
}

func TestCountMagnetWordsRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(3107))
	for iter := 0; iter < 300; iter++ {
		n := 1 + rng.Intn(6)
		buf := make([]byte, n)
		alpha := 1 + rng.Intn(4)
		for i := range buf {
			buf[i] = byte('A' + rng.Intn(alpha))
		}
		seen := map[string]bool{}
		g3BruteWords(string(buf), make([]bool, n), nil, seen)
		if got := CountMagnetWords(string(buf)); got != len(seen) {
			t.Fatalf("CountMagnetWords(%q) = %d, перебор даёт %d", buf, got, len(seen))
		}
	}
}

// g3BruteCircle моделирует круг срезом.
func g3BruteCircle(n, k int) int {
	kids := make([]int, n)
	for i := range kids {
		kids[i] = i + 1
	}
	pos := 0
	for len(kids) > 1 {
		pos = (pos + k - 1) % len(kids)
		kids = append(kids[:pos], kids[pos+1:]...)
		if pos == len(kids) {
			pos = 0
		}
	}
	return kids[0]
}

func TestLastInCircleRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(3108))
	for iter := 0; iter < 2000; iter++ {
		n, k := 1+rng.Intn(40), 1+rng.Intn(100)
		if got, want := LastInCircle(n, k), g3BruteCircle(n, k); got != want {
			t.Fatalf("LastInCircle(%d, %d) = %d, перебор даёт %d", n, k, got, want)
		}
	}
}
