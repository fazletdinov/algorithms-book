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

// Сверка с перебором на маленьких случайных входах: переборы — прямые
// определения из условий.

const g5rounds = 2000

func g5BruteVisible(h []int) []int {
	res := make([]int, len(h))
	for i := range h {
		for j := i + 1; j < len(h); j++ {
			ok := true
			for m := i + 1; m < j; m++ {
				if h[m] >= min(h[i], h[j]) {
					ok = false
				}
			}
			if ok {
				res[i]++
			}
		}
	}
	return res
}

func TestVisibleAheadRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(51))
	for round := 0; round < g5rounds; round++ {
		n := 1 + rng.Intn(9)
		h := rng.Perm(n)
		for i := range h {
			h[i]++
		}
		want := g5BruteVisible(h)
		if got := VisibleAhead(slices.Clone(h)); !slices.Equal(got, want) {
			t.Fatalf("VisibleAhead(%v) = %v, ожидалось %v", h, got, want)
		}
	}
}

// g5BruteRobots — шаги моделирования: убираем первое по порядку столкновение
// соседей «вправо, влево», пока такие есть.
func g5BruteRobots(robots []int) []int {
	r := slices.Clone(robots)
	for {
		hit := -1
		for i := 0; i+1 < len(r); i++ {
			if r[i] > 0 && r[i+1] < 0 {
				hit = i
				break
			}
		}
		if hit == -1 {
			return r
		}
		a, b := r[hit], -r[hit+1]
		switch {
		case a > b:
			r = slices.Delete(r, hit+1, hit+2)
		case a < b:
			r = slices.Delete(r, hit, hit+1)
		default:
			r = slices.Delete(r, hit, hit+2)
		}
	}
}

func TestSurvivingRobotsRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(52))
	for round := 0; round < g5rounds; round++ {
		r := make([]int, rng.Intn(10))
		for i := range r {
			r[i] = 1 + rng.Intn(4)
			if rng.Intn(2) == 0 {
				r[i] = -r[i]
			}
		}
		want := g5BruteRobots(r)
		if got := SurvivingRobots(slices.Clone(r)); !slices.Equal(got, want) {
			t.Fatalf("SurvivingRobots(%v) = %v, ожидалось %v", r, got, want)
		}
	}
}

func TestStateAfterRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(53))
	for round := 0; round < g5rounds; round++ {
		m := 1 + rng.Intn(12)
		table := make([]int, m)
		for i := range table {
			table[i] = rng.Intn(m)
		}
		next := func(x int) int { return table[x] }
		start, k := rng.Intn(m), rng.Intn(40)
		want := start
		for s := 0; s < k; s++ {
			want = next(want)
		}
		if got := StateAfter(start, next, k); got != want {
			t.Fatalf("StateAfter(start=%d, переходы %v, k=%d) = %d, ожидалось %d", start, table, k, got, want)
		}
	}
}

// g5BruteRoundTrip — из каждой клетки шагаем n раз в её сторону; если вернулись в
// клетку, где уже были, и путь всё время шёл в одну сторону — смотрим длину цикла.
func g5BruteRoundTrip(nums []int) bool {
	n := len(nums)
	step := func(i int) int { return ((i+nums[i])%n + n) % n }
	for s := range nums {
		x := s
		ok := true
		for k := 0; k < n && ok; k++ {
			if (nums[x] > 0) != (nums[s] > 0) {
				ok = false
			}
			x = step(x)
		}
		if !ok {
			continue
		}
		// После n шагов x — точно в цикле; цикл того же знака, если и он весь такой.
		c, length := x, 0
		for {
			if (nums[c] > 0) != (nums[s] > 0) {
				ok = false
			}
			c = step(c)
			length++
			if c == x {
				break
			}
		}
		if ok && length > 1 {
			return true
		}
	}
	return false
}

func TestHasRoundTripRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(54))
	for round := 0; round < g5rounds; round++ {
		n := 1 + rng.Intn(8)
		nums := make([]int, n)
		for i := range nums {
			nums[i] = 1 + rng.Intn(2*n)
			if rng.Intn(3) == 0 {
				nums[i] = -nums[i]
			}
		}
		want := g5BruteRoundTrip(nums)
		if got := HasRoundTrip(slices.Clone(nums)); got != want {
			t.Fatalf("HasRoundTrip(%v) = %v, ожидалось %v", nums, got, want)
		}
	}
}

// g5BruteSplits — группы склейкой «пересекается ли с кем-то из группы» до упора.
func g5BruteSplits(r [][2]int) int {
	group := make([]int, len(r))
	for i := range group {
		group[i] = i
	}
	for changed := true; changed; {
		changed = false
		for i := range r {
			for j := range r {
				if r[i][0] <= r[j][1] && r[j][0] <= r[i][1] && group[i] != group[j] {
					g := min(group[i], group[j])
					group[i], group[j], changed = g, g, true
				}
			}
		}
	}
	slices.Sort(group)
	ways := 1
	for range slices.Compact(group) {
		ways *= 2
	}
	return ways
}

func TestCountSplitsRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(55))
	for round := 0; round < g5rounds; round++ {
		r := make([][2]int, 1+rng.Intn(8))
		for i := range r {
			s := rng.Intn(20)
			r[i] = [2]int{s, s + rng.Intn(4)}
		}
		want := g5BruteSplits(r)
		if got := CountSplits(slices.Clone(r)); got != want {
			t.Fatalf("CountSplits(%v) = %d, ожидалось %d", r, got, want)
		}
	}
}

// g5randSlots — непересекающиеся свободные промежутки вперемешку.
func g5randSlots(rng *rand.Rand, n int) [][2]int {
	var s [][2]int
	at := rng.Intn(5)
	for len(s) < n {
		length := 1 + rng.Intn(8)
		s = append(s, [2]int{at, at + length})
		at += length + rng.Intn(5)
	}
	rng.Shuffle(len(s), func(i, j int) { s[i], s[j] = s[j], s[i] })
	return s
}

func TestFirstCommonSlotRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(56))
	for round := 0; round < g5rounds; round++ {
		a, b := g5randSlots(rng, rng.Intn(5)), g5randSlots(rng, rng.Intn(5))
		d := 1 + rng.Intn(5)
		want := -1
		for _, x := range a {
			for _, y := range b {
				lo, hi := max(x[0], y[0]), min(x[1], y[1])
				if hi-lo >= d && (want == -1 || lo < want) {
					want = lo
				}
			}
		}
		if got := FirstCommonSlot(slices.Clone(a), slices.Clone(b), d); got != want {
			t.Fatalf("FirstCommonSlot(%v, %v, %d) = %d, ожидалось %d", a, b, d, got, want)
		}
	}
}

// g5BruteKiosks — все способы выбрать m мест.
func g5BruteKiosks(sorted []int, m, from, last, cur int) int {
	if m == 0 {
		return cur
	}
	best := -1
	for i := from; i < len(sorted); i++ {
		gap := cur
		if last >= 0 {
			gap = min(cur, sorted[i]-last)
		}
		best = max(best, g5BruteKiosks(sorted, m-1, i+1, sorted[i], gap))
	}
	return best
}

func TestKioskSpacingRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(57))
	for round := 0; round < g5rounds; round++ {
		n := 2 + rng.Intn(7)
		pos := rng.Perm(30)[:n]
		for i := range pos {
			pos[i]++
		}
		m := 2 + rng.Intn(n-1)
		sorted := slices.Sorted(slices.Values(pos))
		want := g5BruteKiosks(sorted, m, 0, -1, 1<<62)
		if got := KioskSpacing(slices.Clone(pos), m); got != want {
			t.Fatalf("KioskSpacing(%v, %d) = %d, ожидалось %d", pos, m, got, want)
		}
	}
}

func TestFindOnTrailRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(58))
	for round := 0; round < g5rounds; round++ {
		n := 3 + rng.Intn(10)
		peak := 1 + rng.Intn(n-2)
		h := make([]int, n)
		h[peak] = 30
		for i := peak - 1; i >= 0; i-- {
			h[i] = h[i+1] - 1 - rng.Intn(3)
		}
		for i := peak + 1; i < n; i++ {
			h[i] = h[i-1] - 1 - rng.Intn(3)
		}
		target := rng.Intn(32)
		want := slices.Index(h, target)
		calls := 0
		if got := FindOnTrail(n, g5trail(h, &calls), target); got != want {
			t.Fatalf("FindOnTrail(%v, %d) = %d, ожидалось %d", h, target, got, want)
		}
	}
}

// g5randBST — дерево поиска из различных значений, вставленных в случайном порядке.
func g5randBST(rng *rand.Rand, n, maxVal int) (*TreeNode, []int) {
	vals := rng.Perm(maxVal + 1)[:n]
	var root *TreeNode
	for _, v := range vals {
		root = g2bstInsert(root, v)
	}
	return root, vals
}

func TestPriceBonusRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(59))
	for round := 0; round < g5rounds; round++ {
		root, vals := g5randBST(rng, rng.Intn(10), 20)
		sorted := slices.Sorted(slices.Values(vals))
		want := make([]int, len(sorted))
		for i := range sorted {
			for _, v := range sorted[i:] {
				want[i] += v
			}
		}
		before := g2treeString(root)
		if got := g5values(PriceBonus(root), nil); !slices.Equal(got, want) {
			t.Fatalf("PriceBonus(%s): цены по порядку %v, ожидалось %v", before, got, want)
		}
	}
}

func TestMinPriceGapRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(60))
	for round := 0; round < g5rounds; round++ {
		root, vals := g5randBST(rng, 2+rng.Intn(9), 40)
		want := -1
		for i := range vals {
			for j := range vals {
				if d := vals[j] - vals[i]; d > 0 && (want == -1 || d < want) {
					want = d
				}
			}
		}
		if got := MinPriceGap(root); got != want {
			t.Fatalf("MinPriceGap(%s) = %d, ожидалось %d", g2treeString(root), got, want)
		}
	}
}

// g5levels — значения по ярусам слева направо обходом в глубину.
func g5levels(n *TreeNode, depth int, levels [][]int) [][]int {
	if n == nil {
		return levels
	}
	if depth == len(levels) {
		levels = append(levels, nil)
	}
	levels[depth] = append(levels[depth], n.Val)
	levels = g5levels(n.Left, depth+1, levels)
	return g5levels(n.Right, depth+1, levels)
}

func TestIsFestiveTreeRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(61))
	for round := 0; round < g5rounds; round++ {
		root := g2randTree(rng, rng.Intn(8), 1, 8)
		want := true
		for d, row := range g5levels(root, 0, nil) {
			for i, v := range row {
				if (v%2 == 1) != (d%2 == 0) {
					want = false
				}
				if i > 0 && (d%2 == 0 && v <= row[i-1] || d%2 == 1 && v >= row[i-1]) {
					want = false
				}
			}
		}
		if got := IsFestiveTree(root); got != want {
			t.Fatalf("IsFestiveTree(%s) = %v, ожидалось %v", g2treeString(root), got, want)
		}
	}
}

// g5path — путь от корня до узла со значением v (nil, если его нет).
func g5path(n *TreeNode, v int, path []*TreeNode) []*TreeNode {
	if n == nil {
		return nil
	}
	path = append(path, n)
	if n.Val == v {
		return path
	}
	if p := g5path(n.Left, v, path); p != nil {
		return p
	}
	return g5path(n.Right, v, path)
}

func TestMinutesToSpreadRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(62))
	for round := 0; round < g5rounds; round++ {
		n := 1 + rng.Intn(10)
		root := g2randTree(rng, n, 0, 0)
		// Значения — разные номера по порядку обхода.
		var all []*TreeNode
		var number func(*TreeNode)
		number = func(x *TreeNode) {
			if x == nil {
				return
			}
			x.Val = len(all)
			all = append(all, x)
			number(x.Left)
			number(x.Right)
		}
		number(root)
		start := rng.Intn(n)
		ps := g5path(root, start, nil)
		want := 0
		for _, x := range all {
			px := g5path(root, x.Val, nil)
			common := 0
			for common < len(ps) && common < len(px) && ps[common] == px[common] {
				common++
			}
			want = max(want, len(ps)+len(px)-2*common)
		}
		if got := MinutesToSpread(root, start); got != want {
			t.Fatalf("MinutesToSpread(%s, %d) = %d, ожидалось %d", g2treeString(root), start, got, want)
		}
	}
}

// Сверка с перебором порции g4: переборы — прямые определения из условий.

func g4BruteStocked(s string, k int) int {
	best := 0
	for i := range s {
		var c [26]int
		for j := i; j < len(s); j++ {
			c[s[j]-'a']++
			ok := true
			for _, v := range c {
				if v > 0 && v < k {
					ok = false
				}
			}
			if ok {
				best = max(best, j-i+1)
			}
		}
	}
	return best
}

func TestLongestWellStockedRunRandom(t *testing.T) {
	r := rand.New(rand.NewSource(41))
	for it := 0; it < 2000; it++ {
		n, sigma := r.Intn(30), 1+r.Intn(4)
		b := make([]byte, n)
		for i := range b {
			b[i] = byte('a' + r.Intn(sigma))
		}
		s, k := string(b), 1+r.Intn(4)
		if got, want := LongestWellStockedRun(s, k), g4BruteStocked(s, k); got != want {
			t.Fatalf("LongestWellStockedRun(%q, %d) = %d, ожидалось %d", s, k, got, want)
		}
	}
}

func g4BruteMatching(grid [][]int) int {
	n, c := len(grid), 0
	for r := 0; r < n; r++ {
		for col := 0; col < n; col++ {
			same := true
			for i := 0; i < n; i++ {
				if grid[r][i] != grid[i][col] {
					same = false
				}
			}
			if same {
				c++
			}
		}
	}
	return c
}

func TestMatchingRowsAndColumnsRandom(t *testing.T) {
	r := rand.New(rand.NewSource(42))
	for it := 0; it < 1000; it++ {
		n, colors := 1+r.Intn(5), 1+r.Intn(3)
		grid := make([][]int, n)
		for i := range grid {
			grid[i] = make([]int, n)
			for j := range grid[i] {
				grid[i][j] = 1 + r.Intn(colors)
			}
		}
		if got, want := MatchingRowsAndColumns(grid), g4BruteMatching(grid); got != want {
			t.Fatalf("MatchingRowsAndColumns(%v) = %d, ожидалось %d", grid, got, want)
		}
	}
}

func g4BruteBricks(wall [][]int) int {
	width := 0
	for _, w := range wall[0] {
		width += w
	}
	best := len(wall)
	for x := 1; x < width; x++ {
		cut := 0
		for _, row := range wall {
			edge := 0
			onSeam := false
			for _, w := range row {
				edge += w
				if edge == x {
					onSeam = true
				}
			}
			if !onSeam {
				cut++
			}
		}
		best = min(best, cut)
	}
	return best
}

func TestFewestCutBricksRandom(t *testing.T) {
	r := rand.New(rand.NewSource(43))
	for it := 0; it < 1000; it++ {
		rows, width := 1+r.Intn(6), 1+r.Intn(10)
		wall := make([][]int, rows)
		for i := range wall {
			for left := width; left > 0; {
				w := 1 + r.Intn(left)
				wall[i] = append(wall[i], w)
				left -= w
			}
		}
		if got, want := FewestCutBricks(wall), g4BruteBricks(wall); got != want {
			t.Fatalf("FewestCutBricks(%v) = %d, ожидалось %d", wall, got, want)
		}
	}
}

func g4RandVals(r *rand.Rand, n, lo, hi int) []int {
	v := make([]int, n)
	for i := range v {
		v[i] = lo + r.Intn(hi-lo+1)
	}
	return v
}

func TestSplitByThresholdRandom(t *testing.T) {
	r := rand.New(rand.NewSource(44))
	for it := 0; it < 1000; it++ {
		vals := g4RandVals(r, r.Intn(12), -3, 3)
		x := r.Intn(7) - 3
		var want []int
		for _, v := range vals {
			if v < x {
				want = append(want, v)
			}
		}
		for _, v := range vals {
			if v >= x {
				want = append(want, v)
			}
		}
		got := g4vals(t, SplitByThreshold(g4list(vals), x), len(vals))
		if !slices.Equal(got, want) {
			t.Fatalf("SplitByThreshold(%v, %d) = %v, ожидалось %v", vals, x, got, want)
		}
	}
}

func TestDropRepeatedRandom(t *testing.T) {
	r := rand.New(rand.NewSource(45))
	for it := 0; it < 1000; it++ {
		vals := g4RandVals(r, r.Intn(12), 0, 5)
		slices.Sort(vals)
		count := map[int]int{}
		for _, v := range vals {
			count[v]++
		}
		var want []int
		for _, v := range vals {
			if count[v] == 1 {
				want = append(want, v)
			}
		}
		got := g4vals(t, DropRepeated(g4list(vals)), len(vals))
		if !slices.Equal(got, want) {
			t.Fatalf("DropRepeated(%v) = %v, ожидалось %v", vals, got, want)
		}
	}
}

func TestSplitIntoConvoysRandom(t *testing.T) {
	r := rand.New(rand.NewSource(46))
	for it := 0; it < 1000; it++ {
		n, k := r.Intn(15), 1+r.Intn(8)
		vals := make([]int, n)
		for i := range vals {
			vals[i] = i
		}
		got := SplitIntoConvoys(g4list(vals), k)
		if len(got) != k {
			t.Fatalf("SplitIntoConvoys(n=%d, k=%d): %d конвоев", n, k, len(got))
		}
		var all []int
		prev := n + 1
		for i, head := range got {
			part := g4vals(t, head, n)
			if len(part) > prev || (prev <= n && prev-len(part) > 1) {
				t.Fatalf("SplitIntoConvoys(n=%d, k=%d): размер конвоя %d = %d после %d", n, k, i, len(part), prev)
			}
			prev = len(part)
			all = append(all, part...)
		}
		if !slices.Equal(all, vals) {
			t.Fatalf("SplitIntoConvoys(n=%d, k=%d): склеенные конвои %v, ожидалась колонна %v", n, k, all, vals)
		}
		if first, last := len(g4vals(t, got[0], n)), len(g4vals(t, got[k-1], n)); first-last > 1 {
			t.Fatalf("SplitIntoConvoys(n=%d, k=%d): первый конвой %d, последний %d", n, k, first, last)
		}
	}
}

func g4BruteWalk(houses []int) int {
	best := -1
	for _, m := range houses {
		s := 0
		for _, h := range houses {
			s += max(h-m, m-h)
		}
		if best < 0 || s < best {
			best = s
		}
	}
	return best
}

func TestMinTotalWalkRandom(t *testing.T) {
	r := rand.New(rand.NewSource(47))
	for it := 0; it < 1000; it++ {
		h := g4RandVals(r, 1+r.Intn(10), -20, 20)
		if got, want := MinTotalWalk(slices.Clone(h)), g4BruteWalk(h); got != want {
			t.Fatalf("MinTotalWalk(%v) = %d, ожидалось %d", h, got, want)
		}
	}
}

func g4BruteRaises(nums []int) int {
	// Перебор раздачи: в любом порядке выдавать наименьший свободный номер не меньше
	// своего; минимум по всем порядкам.
	best := -1
	var rec func(left []int, used map[int]bool, cost int)
	rec = func(left []int, used map[int]bool, cost int) {
		if len(left) == 0 {
			if best < 0 || cost < best {
				best = cost
			}
			return
		}
		for i, x := range left {
			y := x
			for used[y] {
				y++
			}
			used[y] = true
			rest := append(slices.Clone(left[:i]), left[i+1:]...)
			rec(rest, used, cost+y-x)
			delete(used, y)
		}
	}
	rec(nums, map[int]bool{}, 0)
	return best
}

func TestMinRaisesToDistinctRandom(t *testing.T) {
	r := rand.New(rand.NewSource(48))
	for it := 0; it < 300; it++ {
		nums := g4RandVals(r, 1+r.Intn(6), 0, 4)
		if got, want := MinRaisesToDistinct(slices.Clone(nums)), g4BruteRaises(nums); got != want {
			t.Fatalf("MinRaisesToDistinct(%v) = %d, ожидалось %d", nums, got, want)
		}
	}
}

func g4BruteBoosts(salaries []int, budget int) int {
	best := 0
	for _, target := range salaries {
		// Подтягиваем к target самых близких снизу, пока хватает бюджета.
		var below []int
		for _, s := range salaries {
			if s <= target {
				below = append(below, target-s)
			}
		}
		slices.Sort(below)
		spent, cnt := 0, 0
		for _, d := range below {
			if spent+d > budget {
				break
			}
			spent += d
			cnt++
		}
		best = max(best, cnt)
	}
	return best
}

func TestMaxEqualAfterBoostsRandom(t *testing.T) {
	r := rand.New(rand.NewSource(49))
	for it := 0; it < 1000; it++ {
		s := g4RandVals(r, 1+r.Intn(10), 1, 12)
		budget := r.Intn(20)
		if got, want := MaxEqualAfterBoosts(slices.Clone(s), budget), g4BruteBoosts(s, budget); got != want {
			t.Fatalf("MaxEqualAfterBoosts(%v, %d) = %d, ожидалось %d", s, budget, got, want)
		}
	}
}

func g4BruteTakes(w []int, x int) int {
	best := -1
	n := len(w)
	for left := 0; left <= n; left++ {
		for right := 0; left+right <= n; right++ {
			s := 0
			for i := 0; i < left; i++ {
				s += w[i]
			}
			for i := n - right; i < n; i++ {
				s += w[i]
			}
			if s == x && (best < 0 || left+right < best) {
				best = left + right
			}
		}
	}
	return best
}

func TestMinTakesFromEndsRandom(t *testing.T) {
	r := rand.New(rand.NewSource(50))
	for it := 0; it < 1000; it++ {
		w := g4RandVals(r, 1+r.Intn(9), 1, 5)
		x := 1 + r.Intn(25)
		if got, want := MinTakesFromEnds(w, x), g4BruteTakes(w, x); got != want {
			t.Fatalf("MinTakesFromEnds(%v, %d) = %d, ожидалось %d", w, x, got, want)
		}
	}
}

func g4BruteGoods(shelf string, l, r int) int {
	first, last := -1, -1
	for i := l; i <= r; i++ {
		if shelf[i] == '|' {
			if first < 0 {
				first = i
			}
			last = i
		}
	}
	c := 0
	for i := first + 1; first >= 0 && i < last; i++ {
		if shelf[i] == '*' {
			c++
		}
	}
	return c
}

func TestGoodsBetweenDividersRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(51))
	for it := 0; it < 500; it++ {
		n := 3 + rng.Intn(15)
		b := make([]byte, n)
		for i := range b {
			b[i] = "*|"[rng.Intn(2)]
		}
		shelf := string(b)
		var qs [][2]int
		var want []int
		for q := 0; q < 10; q++ {
			l := rng.Intn(n)
			r := l + rng.Intn(n-l)
			qs = append(qs, [2]int{l, r})
			want = append(want, g4BruteGoods(shelf, l, r))
		}
		if got := GoodsBetweenDividers(shelf, qs); !slices.Equal(got, want) {
			t.Fatalf("GoodsBetweenDividers(%q, %v) = %v, ожидалось %v", shelf, qs, got, want)
		}
	}
}

func g4BruteTeams(skill []int, lower, upper int) int {
	c := 0
	for i := range skill {
		for j := i + 1; j < len(skill); j++ {
			if s := skill[i] + skill[j]; s >= lower && s <= upper {
				c++
			}
		}
	}
	return c
}

func TestCountBalancedTeamsRandom(t *testing.T) {
	r := rand.New(rand.NewSource(53))
	for it := 0; it < 1000; it++ {
		skill := g4RandVals(r, 1+r.Intn(10), -6, 6)
		lower := r.Intn(25) - 12
		upper := lower + r.Intn(10)
		if got, want := CountBalancedTeams(slices.Clone(skill), lower, upper), g4BruteTeams(skill, lower, upper); got != want {
			t.Fatalf("CountBalancedTeams(%v, %d, %d) = %d, ожидалось %d", skill, lower, upper, got, want)
		}
	}
}

func g4BruteGap(offers, prices []int) int {
	best := 0
	for i := range offers {
		for j := i; j < len(prices); j++ {
			if offers[i] <= prices[j] {
				best = max(best, j-i)
			}
		}
	}
	return best
}

func g4RandNonInc(r *rand.Rand, n int) []int {
	v := g4RandVals(r, n, 1, 10)
	slices.Sort(v)
	slices.Reverse(v)
	return v
}

func TestWidestAffordableGapRandom(t *testing.T) {
	r := rand.New(rand.NewSource(54))
	for it := 0; it < 1000; it++ {
		a, b := g4RandNonInc(r, 1+r.Intn(8)), g4RandNonInc(r, 1+r.Intn(8))
		if got, want := WidestAffordableGap(a, b), g4BruteGap(a, b); got != want {
			t.Fatalf("WidestAffordableGap(%v, %v) = %d, ожидалось %d", a, b, got, want)
		}
	}
}

// Сверка с перебором на маленьких случайных входах. Переборы — прямые
// определения из условий, без хитрости эталонов.

const g6rounds = 3000

// g6nodes — узлы дерева в порядке обхода и номер родителя каждого (−1 у корня).
func g6nodes(root *TreeNode) ([]*TreeNode, []int) {
	if root == nil {
		return nil, nil
	}
	nodes, parent := []*TreeNode{root}, []int{-1}
	for i := 0; i < len(nodes); i++ {
		for _, c := range []*TreeNode{nodes[i].Left, nodes[i].Right} {
			if c != nil {
				nodes = append(nodes, c)
				parent = append(parent, i)
			}
		}
	}
	return nodes, parent
}

// g6treeDist — длина пути между узлами a и b по номерам родителей.
func g6treeDist(parent []int, a, b int) int {
	depth := func(v int) int {
		d := 0
		for ; parent[v] != -1; v = parent[v] {
			d++
		}
		return d
	}
	da, db, d := depth(a), depth(b), 0
	for ; da > db; da, d = da-1, d+1 {
		a = parent[a]
	}
	for ; db > da; db, d = db-1, d+1 {
		b = parent[b]
	}
	for a != b {
		a, b, d = parent[a], parent[b], d+2
	}
	return d
}

// g6bruteCrates: ящики неразличимы, каждый едет своим путём, значит ответ —
// лучшее сопоставление «ящик → склад» по сумме расстояний; перебираем все.
func g6bruteCrates(root *TreeNode) int {
	nodes, parent := g6nodes(root)
	var crates []int // склад, где лежит каждый ящик
	for i, nd := range nodes {
		for c := 0; c < nd.Val; c++ {
			crates = append(crates, i)
		}
	}
	best := -1
	used := make([]bool, len(nodes))
	var rec func(c, cost int)
	rec = func(c, cost int) {
		if c == len(crates) {
			if best == -1 || cost < best {
				best = cost
			}
			return
		}
		for v := range nodes {
			if !used[v] {
				used[v] = true
				rec(c+1, cost+g6treeDist(parent, crates[c], v))
				used[v] = false
			}
		}
	}
	rec(0, 0)
	return max(best, 0)
}

// g6randCrateTree — случайное дерево, где ящики раскиданы по складам случайно.
func g6randCrateTree(rng *rand.Rand, n int) *TreeNode {
	root := g2randTree(rng, n, 0, 0)
	nodes, _ := g6nodes(root)
	for c := 0; c < n; c++ {
		nodes[rng.Intn(n)].Val++
	}
	return root
}

func TestMinCrateMovesRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(61))
	for round := 0; round < g6rounds; round++ {
		root := g6randCrateTree(rng, rng.Intn(7))
		if got, want := MinCrateMoves(root), g6bruteCrates(root); got != want {
			t.Fatalf("MinCrateMoves(%s) = %d, ожидалось %d", g2treeString(root), got, want)
		}
	}
}

func g6bruteGap(root *TreeNode) int {
	nodes, parent := g6nodes(root)
	best := 0
	for v := range nodes {
		for a := parent[v]; a != -1; a = parent[a] {
			best = max(best, nodes[a].Val-nodes[v].Val, nodes[v].Val-nodes[a].Val)
		}
	}
	return best
}

func TestWidestSalaryGapRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(62))
	for round := 0; round < g6rounds; round++ {
		root := g2randTree(rng, rng.Intn(12), 0, 20)
		if got, want := WidestSalaryGap(root), g6bruteGap(root); got != want {
			t.Fatalf("WidestSalaryGap(%s) = %d, ожидалось %d", g2treeString(root), got, want)
		}
	}
}

// g6bruteTeam перебирает все команды из k человек.
func g6bruteTeam(skill, speed []int, k int) int {
	n, best := len(skill), 0
	for mask := 0; mask < 1<<n; mask++ {
		cnt, sum, slow := 0, 0, -1
		for i := 0; i < n; i++ {
			if mask>>i&1 == 1 {
				cnt++
				sum += skill[i]
				if slow == -1 || speed[i] < slow {
					slow = speed[i]
				}
			}
		}
		if cnt == k {
			best = max(best, sum*slow)
		}
	}
	return best
}

func TestBestTeamScoreRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(63))
	for round := 0; round < g6rounds; round++ {
		n := 1 + rng.Intn(9)
		k := 1 + rng.Intn(n)
		skill, speed := make([]int, n), make([]int, n)
		for i := range skill {
			skill[i], speed[i] = rng.Intn(10), rng.Intn(6)
		}
		want := g6bruteTeam(skill, speed, k)
		if got := BestTeamScore(slices.Clone(skill), slices.Clone(speed), k); got != want {
			t.Fatalf("BestTeamScore(%v, %v, %d) = %d, ожидалось %d", skill, speed, k, got, want)
		}
	}
}

// g6bruteWeightGap перебирает, какие m деталей снять.
func g6bruteWeightGap(w []int) int {
	m, first, best := len(w)/3, true, 0
	for mask := 0; mask < 1<<len(w); mask++ {
		var rest []int
		removed := 0
		for i, x := range w {
			if mask>>i&1 == 1 {
				removed++
			} else {
				rest = append(rest, x)
			}
		}
		if removed != m {
			continue
		}
		d := 0
		for i, x := range rest {
			if i < m {
				d += x
			} else {
				d -= x
			}
		}
		if first || d < best {
			first, best = false, d
		}
	}
	return best
}

func TestMinWeightGapRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(64))
	for round := 0; round < g6rounds; round++ {
		w := make([]int, 3*(1+rng.Intn(4)))
		for i := range w {
			w[i] = 1 + rng.Intn(9)
		}
		want := g6bruteWeightGap(w)
		if got := MinWeightGap(slices.Clone(w)); got != want {
			t.Fatalf("MinWeightGap(%v) = %d, ожидалось %d", w, got, want)
		}
	}
}

// g6bruteCourier перебирает все kⁿ распределений.
func g6bruteCourier(jobs []int, k int) int {
	loads := make([]int, k)
	best := -1
	var rec func(i int)
	rec = func(i int) {
		if i == len(jobs) {
			if m := slices.Max(loads); best == -1 || m < best {
				best = m
			}
			return
		}
		for c := range loads {
			loads[c] += jobs[i]
			rec(i + 1)
			loads[c] -= jobs[i]
		}
	}
	rec(0)
	return best
}

func TestMinBusiestCourierRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(65))
	for round := 0; round < g6rounds; round++ {
		n := 1 + rng.Intn(7)
		k := 1 + rng.Intn(min(n, 4))
		jobs := make([]int, n)
		for i := range jobs {
			jobs[i] = 1 + rng.Intn(9)
		}
		want := g6bruteCourier(jobs, k)
		if got := MinBusiestCourier(slices.Clone(jobs), k); got != want {
			t.Fatalf("MinBusiestCourier(%v, %d) = %d, ожидалось %d", jobs, k, got, want)
		}
	}
}

// g6bruteHops — обход в ширину по явному графу со всеми рёбрами «по цвету».
func g6bruteHops(colors []int) int {
	n := len(colors)
	dist := make([]int, n)
	for i := range dist {
		dist[i] = -1
	}
	dist[0] = 0
	queue := []int{0}
	for len(queue) > 0 {
		v := queue[0]
		queue = queue[1:]
		for u := 0; u < n; u++ {
			if dist[u] == -1 && (u == v-1 || u == v+1 || (u != v && colors[u] == colors[v])) {
				dist[u] = dist[v] + 1
				queue = append(queue, u)
			}
		}
	}
	return dist[n-1]
}

func TestMinHopsToLastRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(66))
	for round := 0; round < g6rounds; round++ {
		colors := make([]int, 1+rng.Intn(12))
		for i := range colors {
			colors[i] = rng.Intn(5) - 2
		}
		want := g6bruteHops(colors)
		if got := MinHopsToLast(slices.Clone(colors)); got != want {
			t.Fatalf("MinHopsToLast(%v) = %d, ожидалось %d", colors, got, want)
		}
	}
}

// g6bruteDishes — проходы по книге, пока что-нибудь добавляется.
func g6bruteDishes(recipes []string, ingredients [][]string, supplies []string) []string {
	have := map[string]bool{}
	for _, s := range supplies {
		have[s] = true
	}
	for changed := true; changed; {
		changed = false
		for i, r := range recipes {
			if have[r] {
				continue
			}
			ok := true
			for _, x := range ingredients[i] {
				ok = ok && have[x]
			}
			if ok {
				have[r], changed = true, true
			}
		}
	}
	res := []string{}
	for _, r := range recipes {
		if have[r] {
			res = append(res, r)
		}
	}
	return res
}

func TestCookableDishesRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(67))
	names := []string{"a", "b", "c", "d", "e", "f"}
	stock := []string{"x", "y", "z"}
	for round := 0; round < g6rounds; round++ {
		n := 1 + rng.Intn(len(names))
		recipes := slices.Clone(names[:n])
		rng.Shuffle(n, func(i, j int) { recipes[i], recipes[j] = recipes[j], recipes[i] })
		pool := append(slices.Clone(recipes), stock...)
		ingredients := make([][]string, n)
		for i := range ingredients {
			for c := 1 + rng.Intn(3); c > 0; c-- {
				ingredients[i] = append(ingredients[i], pool[rng.Intn(len(pool))])
			}
		}
		var supplies []string
		for _, s := range stock {
			if rng.Intn(3) > 0 {
				supplies = append(supplies, s)
			}
		}
		want := g6bruteDishes(recipes, ingredients, supplies)
		if got := CookableDishes(recipes, ingredients, supplies); !slices.Equal(got, want) {
			t.Fatalf("CookableDishes(%v, %v, %v) = %v, ожидалось %v", recipes, ingredients, supplies, got, want)
		}
	}
}

// g6bruteSafe: комната опасна, если из неё достижима комната, лежащая на круге
// (достижимая из самой себя хотя бы одним шагом).
func g6bruteSafe(doors [][]int) []int {
	n := len(doors)
	reach := func(from int) []bool { // куда можно попасть хотя бы одним шагом
		seen := make([]bool, n)
		stack := slices.Clone(doors[from])
		for len(stack) > 0 {
			v := stack[len(stack)-1]
			stack = stack[:len(stack)-1]
			if !seen[v] {
				seen[v] = true
				stack = append(stack, doors[v]...)
			}
		}
		return seen
	}
	onCycle := make([]bool, n)
	for v := range doors {
		onCycle[v] = reach(v)[v]
	}
	res := []int{}
	for v := range doors {
		r := reach(v)
		ok := !onCycle[v]
		for u := range r {
			ok = ok && !(r[u] && onCycle[u])
		}
		if ok {
			res = append(res, v)
		}
	}
	return res
}

func TestSafeRoomsRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(68))
	for round := 0; round < g6rounds; round++ {
		n := 1 + rng.Intn(8)
		doors := make([][]int, n)
		for v := range doors {
			doors[v] = []int{}
			for c := rng.Intn(3); c > 0; c-- {
				// Двери чаще ведут «вперёд» — иначе почти всё лежит на кругах.
				u := rng.Intn(n)
				if rng.Intn(4) > 0 && v+1 < n {
					u = v + 1 + rng.Intn(n-v-1)
				}
				doors[v] = append(doors[v], u)
			}
		}
		want := g6bruteSafe(doors)
		if got := SafeRooms(doors); !slices.Equal(got, want) {
			t.Fatalf("SafeRooms(%v) = %v, ожидалось %v", doors, got, want)
		}
	}
}

// g6bruteBloom перебирает все порядки посадки.
func g6bruteBloom(plant, grow []int) int {
	order := make([]int, len(plant))
	for i := range order {
		order[i] = i
	}
	best := -1
	var rec func(k int)
	rec = func(k int) {
		if k == len(order) {
			day, last := 0, 0
			for _, i := range order {
				day += plant[i]
				last = max(last, day+grow[i])
			}
			if best == -1 || last < best {
				best = last
			}
			return
		}
		for j := k; j < len(order); j++ {
			order[k], order[j] = order[j], order[k]
			rec(k + 1)
			order[k], order[j] = order[j], order[k]
		}
	}
	rec(0)
	return best
}

func TestEarliestFullBloomRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(69))
	for round := 0; round < g6rounds; round++ {
		n := 1 + rng.Intn(6)
		plant, grow := make([]int, n), make([]int, n)
		for i := range plant {
			plant[i], grow[i] = 1+rng.Intn(6), 1+rng.Intn(6)
		}
		want := g6bruteBloom(plant, grow)
		if got := EarliestFullBloom(slices.Clone(plant), slices.Clone(grow)); got != want {
			t.Fatalf("EarliestFullBloom(%v, %v) = %d, ожидалось %d", plant, grow, got, want)
		}
	}
}

// g6bruteRuns пробует положить каждую карточку в любую лесенку, кончающуюся на
// число меньше на один, или начать с неё новую.
func g6bruteRuns(nums []int) bool {
	type run struct{ end, size int }
	var runs []run
	var rec func(i int) bool
	rec = func(i int) bool {
		if i == len(nums) {
			for _, r := range runs {
				if r.size < 3 {
					return false
				}
			}
			return true
		}
		x := nums[i]
		for j := range runs {
			if runs[j].end == x-1 {
				runs[j].end, runs[j].size = x, runs[j].size+1
				ok := rec(i + 1)
				runs[j].end, runs[j].size = x-1, runs[j].size-1
				if ok {
					return true
				}
			}
		}
		runs = append(runs, run{x, 1})
		ok := rec(i + 1)
		runs = runs[:len(runs)-1]
		return ok
	}
	return rec(0)
}

func TestCanSplitIntoRunsRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(70))
	for round := 0; round < g6rounds; round++ {
		nums := make([]int, 1+rng.Intn(10))
		for i := range nums {
			nums[i] = rng.Intn(5)
		}
		slices.Sort(nums)
		want := g6bruteRuns(nums)
		if got := CanSplitIntoRuns(slices.Clone(nums)); got != want {
			t.Fatalf("CanSplitIntoRuns(%v) = %v, ожидалось %v", nums, got, want)
		}
	}
}
