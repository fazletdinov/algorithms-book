//go:build solution

package fresh

import (
	"container/heap"
	"encoding/binary"
	"math"
	"slices"
	"sort"
)

func MaxSatisfiedCustomers(customers []int, grumpy []bool, k int) int {
	base := 0 // довольны и без усилий продавца
	for i, c := range customers {
		if !grumpy[i] {
			base += c
		}
	}
	// gain — сколько недовольных станут довольными, если взять себя в руки
	// на минутах [i-k+1, i]; при сдвиге на минуту входит одна, выходит одна.
	gain, best := 0, 0
	for i, c := range customers {
		if grumpy[i] {
			gain += c
		}
		if i >= k && grumpy[i-k] {
			gain -= customers[i-k]
		}
		if gain > best {
			best = gain
		}
	}
	return base + best
}

func MinBoats(weights []int, limit int) int {
	slices.Sort(weights)
	boats := 0
	light, heavy := 0, len(weights)-1
	for light <= heavy {
		// Самый тяжёлый едет в любом случае; самый лёгкий — с ним, если влезает.
		if weights[light]+weights[heavy] <= limit {
			light++
		}
		heavy--
		boats++
	}
	return boats
}

func BestClosingHour(log string) int {
	// Штраф считаем относительно закрытия в час 0: закрыть на час позже
	// означает, что час j теперь открыт: 'N' добавляет единицу, 'Y' убирает.
	penalty, best, bestHour := 0, 0, 0
	for j := 0; j < len(log); j++ {
		if log[j] == 'N' {
			penalty++
		} else {
			penalty--
		}
		if penalty < best {
			best, bestHour = penalty, j+1
		}
	}
	return bestHour
}

func CountSteadyPairs(nums []int) int {
	// nums[j] − nums[i] == j − i  ⇔  nums[j] − j == nums[i] − i.
	seen := make(map[int]int, len(nums))
	pairs := 0
	for j, v := range nums {
		key := v - j
		pairs += seen[key] // все прежние дни с тем же ключом дают пару с j
		seen[key]++
	}
	return pairs
}

func LongestWarmingSpan(temps []int) int {
	// Левым концом имеет смысл брать только день холоднее всех предыдущих:
	// стек хранит такие дни, температура на нём строго убывает.
	var stack []int
	for i, t := range temps {
		if len(stack) == 0 || t < temps[stack[len(stack)-1]] {
			stack = append(stack, i)
		}
	}
	best := 0
	// Правые концы — справа налево: если день j подходит вершине стека, то
	// для неё j — самый дальний, и её можно снимать.
	for j := len(temps) - 1; j >= 0 && len(stack) > 0; j-- {
		for len(stack) > 0 && temps[stack[len(stack)-1]] <= temps[j] {
			i := stack[len(stack)-1]
			stack = stack[:len(stack)-1]
			if j-i > best {
				best = j - i
			}
		}
	}
	return best
}

func MinTimeForTrips(tripTime []int, totalTrips int) int {
	fastest := slices.Min(tripTime)
	// Самый быстрый автобус в одиночку успеет к fastest·totalTrips — ответ не больше.
	lo, hi := 1, fastest*totalTrips
	for lo < hi {
		mid := lo + (hi-lo)/2
		if g1TripsDone(tripTime, mid, totalTrips) {
			hi = mid
		} else {
			lo = mid + 1
		}
	}
	return lo
}

// g1TripsDone — сделано ли к моменту t хотя бы need рейсов. Счёт обрывается,
// как только набрано need: сумма по всем автобусам иначе может переполнить int.
func g1TripsDone(tripTime []int, t, need int) bool {
	done := 0
	for _, d := range tripTime {
		done += t / d
		if done >= need {
			return true
		}
	}
	return false
}

func TotalBusyTime(sessions [][2]int) int {
	if len(sessions) == 0 {
		return 0
	}
	sorted := slices.Clone(sessions)
	slices.SortFunc(sorted, g1ByStart)
	total := 0
	start, end := sorted[0][0], sorted[0][1]
	for _, s := range sorted[1:] {
		if s[0] <= end { // пересекается или касается — продлеваем
			end = max(end, s[1])
			continue
		}
		total += end - start
		start, end = s[0], s[1]
	}
	return total + end - start
}

// g1ByStart упорядочивает сеансы по началу.
func g1ByStart(a, b [2]int) int { return a[0] - b[0] }

func HIndex(citations []int) int {
	n := len(citations)
	// count[c] — сколько статей с c цитированиями; всё, что больше n, — в count[n]:
	// h не бывает больше числа статей.
	count := make([]int, n+1)
	for _, c := range citations {
		count[min(c, n)]++
	}
	atLeast := 0 // статей с не меньше чем h цитированиями
	for h := n; h > 0; h-- {
		atLeast += count[h]
		if atLeast >= h {
			return h
		}
	}
	return 0
}

func MaxTwinSum(head *ListNode) int {
	if head == nil {
		return 0
	}
	// fast бежит вдвое быстрее: когда он в конце, slow — на первом узле второй половины.
	slow, fast := head, head
	for fast != nil && fast.Next != nil {
		slow = slow.Next
		fast = fast.Next.Next
	}
	// Разворачиваем вторую половину: теперь её голова — последний узел списка.
	var tail *ListNode
	for slow != nil {
		next := slow.Next
		slow.Next = tail
		tail = slow
		slow = next
	}
	best := math.MinInt
	for a, b := head, tail; b != nil; a, b = a.Next, b.Next {
		best = max(best, a.Val+b.Val)
	}
	return best
}

func HeaviestLevel(root *TreeNode) int {
	if root == nil {
		return 0
	}
	bestLevel, bestSum := 0, math.MinInt
	level := []*TreeNode{root}
	for depth := 1; len(level) > 0; depth++ {
		sum := 0
		var next []*TreeNode
		for _, node := range level {
			sum += node.Val
			if node.Left != nil {
				next = append(next, node.Left)
			}
			if node.Right != nil {
				next = append(next, node.Right)
			}
		}
		if sum > bestSum { // строго больше: при ничьей остаётся меньший номер
			bestLevel, bestSum = depth, sum
		}
		level = next
	}
	return bestLevel
}

func TimeToNotifyAll(manager []int, notifyTime []int) int {
	reports := make([][]int, len(manager))
	head := -1
	for i, m := range manager {
		if m == -1 {
			head = i
			continue
		}
		reports[m] = append(reports[m], i)
	}
	// Спускаемся от директора: подчинённый узнаёт через notifyTime начальника
	// после того, как узнал сам начальник. Стек вместо рекурсии — цепочка
	// подчинения бывает длиной во всю компанию.
	knows := make([]int, len(manager)) // минута, когда сотрудник узнал новость
	longest := 0
	stack := []int{head}
	for len(stack) > 0 {
		v := stack[len(stack)-1]
		stack = stack[:len(stack)-1]
		longest = max(longest, knows[v])
		for _, r := range reports[v] {
			knows[r] = knows[v] + notifyTime[v]
			stack = append(stack, r)
		}
	}
	return longest
}

func ClosestPrices(root *TreeNode, queries []int) []int {
	res := make([]int, len(queries))
	for i, q := range queries {
		best := root.Val
		for node := root; node != nil; {
			if g2closer(node.Val, best, q) {
				best = node.Val
			}
			if q == node.Val {
				break
			}
			if q < node.Val {
				node = node.Left
			} else {
				node = node.Right
			}
		}
		res[i] = best
	}
	return res
}

// g2closer сообщает, лучше ли цена a цены b для запроса q: ближе, а при ничьей — меньше.
func g2closer(a, b, q int) bool {
	da, db := g2abs(a-q), g2abs(b-q)
	return da < db || (da == db && a < b)
}

func g2abs(x int) int {
	if x < 0 {
		return -x
	}
	return x
}

func FurthestStop(heights []int, energy, rides int) int {
	// В куче — подъёмы, которые сейчас покрыты попутками; наверху наименьший из них.
	byRide := &g2minHeap{}
	for i := 0; i+1 < len(heights); i++ {
		d := heights[i+1] - heights[i]
		if d <= 0 {
			continue
		}
		heap.Push(byRide, d)
		if byRide.Len() > rides {
			// Попуток не хватает: энергией оплачиваем самый низкий из подъёмов.
			energy -= heap.Pop(byRide).(int)
			if energy < 0 {
				return i
			}
		}
	}
	return len(heights) - 1
}

// g2minHeap — куча целых с наименьшим наверху (container/heap).
type g2minHeap []int

func (h g2minHeap) Len() int           { return len(h) }
func (h g2minHeap) Less(i, j int) bool { return h[i] < h[j] }
func (h g2minHeap) Swap(i, j int)      { h[i], h[j] = h[j], h[i] }
func (h *g2minHeap) Push(x any)        { *h = append(*h, x.(int)) }
func (h *g2minHeap) Pop() any {
	old := *h
	x := old[len(old)-1]
	*h = old[:len(old)-1]
	return x
}

func CableMovesToConnect(n int, cables [][]int) int {
	// Связать n офисов можно не меньше чем n−1 кабелем; если их столько есть,
	// лишние кабели внутри кусков всегда найдутся.
	if len(cables) < n-1 {
		return -1
	}
	adj := make([][]int, n)
	for _, c := range cables {
		adj[c[0]] = append(adj[c[0]], c[1])
		adj[c[1]] = append(adj[c[1]], c[0])
	}
	visited := make([]bool, n)
	pieces := 0
	for start := 0; start < n; start++ {
		if visited[start] {
			continue
		}
		pieces++
		visited[start] = true
		queue := []int{start}
		for len(queue) > 0 {
			v := queue[0]
			queue = queue[1:]
			for _, u := range adj[v] {
				if !visited[u] {
					visited[u] = true
					queue = append(queue, u)
				}
			}
		}
	}
	return pieces - 1 // каждый ход соединяет два куска
}

const g2mod = 1_000_000_007

func FastestRoutesCount(n int, roads [][]int) int {
	type edge struct{ to, t int }
	adj := make([][]edge, n)
	for _, r := range roads {
		adj[r[0]] = append(adj[r[0]], edge{r[1], r[2]})
		adj[r[1]] = append(adj[r[1]], edge{r[0], r[2]})
	}
	dist := make([]int, n)
	for i := range dist {
		dist[i] = math.MaxInt
	}
	ways := make([]int, n)
	dist[0], ways[0] = 0, 1
	pq := &g2distHeap{{node: 0, dist: 0}}
	for pq.Len() > 0 {
		cur := heap.Pop(pq).(g2item)
		if cur.dist > dist[cur.node] {
			continue // устаревшая запись: до узла уже нашли путь короче
		}
		// Здесь dist[cur.node] окончательно, и ways[cur.node] больше не изменится.
		for _, e := range adj[cur.node] {
			nd := cur.dist + e.t
			switch {
			case nd < dist[e.to]:
				dist[e.to] = nd
				ways[e.to] = ways[cur.node]
				heap.Push(pq, g2item{node: e.to, dist: nd})
			case nd == dist[e.to]:
				ways[e.to] = (ways[e.to] + ways[cur.node]) % g2mod
			}
		}
	}
	return ways[n-1]
}

type g2item struct{ node, dist int }

// g2distHeap — очередь узлов с наименьшим расстоянием наверху (container/heap).
type g2distHeap []g2item

func (h g2distHeap) Len() int           { return len(h) }
func (h g2distHeap) Less(i, j int) bool { return h[i].dist < h[j].dist }
func (h g2distHeap) Swap(i, j int)      { h[i], h[j] = h[j], h[i] }
func (h *g2distHeap) Push(x any)        { *h = append(*h, x.(g2item)) }
func (h *g2distHeap) Pop() any {
	old := *h
	x := old[len(old)-1]
	*h = old[:len(old)-1]
	return x
}

func MinBuildTime(n int, duration []int, deps [][]int) int {
	next := make([][]int, n)
	waiting := make([]int, n) // сколько зависимостей модуля ещё не собрано
	for _, d := range deps {
		next[d[0]] = append(next[d[0]], d[1])
		waiting[d[1]]++
	}
	start := make([]int, n) // самый ранний старт: когда собрана последняя зависимость
	var ready []int
	for v := 0; v < n; v++ {
		if waiting[v] == 0 {
			ready = append(ready, v)
		}
	}
	built, total := 0, 0
	for len(ready) > 0 {
		v := ready[0]
		ready = ready[1:]
		built++
		finish := start[v] + duration[v]
		total = max(total, finish)
		for _, u := range next[v] {
			start[u] = max(start[u], finish)
			waiting[u]--
			if waiting[u] == 0 {
				ready = append(ready, u)
			}
		}
	}
	if built < n {
		return -1 // модули на круге так и не дождались своих зависимостей
	}
	return total
}

func SplitBetweenOffices(costs [][2]int) int {
	// Сначала все едут в B; перевод i-го в A меняет сумму на costs[i][0]-costs[i][1].
	// Переводим m человек с самой выгодной (самой отрицательной) разницей.
	diffs := make([]int, len(costs))
	total := 0
	for i, c := range costs {
		total += c[1]
		diffs[i] = c[0] - c[1]
	}
	sort.Ints(diffs)
	for _, d := range diffs[:len(costs)/2] {
		total += d
	}
	return total
}

func MinTicketCost(days []int, costs [3]int) int {
	durations := [3]int{1, 7, 30}
	// best[i] — наименьшая цена, покрывающая первые i поездок.
	best := make([]int, len(days)+1)
	// start[t] — первая поездка, которую накрывает проездной типа t, если он
	// заканчивается на текущей поездке; двигается только вперёд.
	var start [3]int
	for i := 1; i <= len(days); i++ {
		last := days[i-1]
		best[i] = -1
		for t, d := range durations {
			for days[start[t]] <= last-d {
				start[t]++
			}
			if c := best[start[t]] + costs[t]; best[i] < 0 || c < best[i] {
				best[i] = c
			}
		}
	}
	return best[len(days)]
}

func CanMergeLogs(a, b, merged string) bool {
	if len(a)+len(b) != len(merged) {
		return false
	}
	// ok[j] для текущего i — можно ли собрать merged[:i+j] из a[:i] и b[:j].
	// Строка i перезаписывает строку i-1 на месте: ok[j] до записи — ответ для (i-1, j).
	ok := make([]bool, len(b)+1)
	ok[0] = true // пустые префиксы дают пустой журнал
	for i := 0; i <= len(a); i++ {
		for j := 0; j <= len(b); j++ {
			if i == 0 && j == 0 {
				continue
			}
			next := merged[i+j-1]
			fromA := i > 0 && ok[j] && a[i-1] == next
			fromB := j > 0 && ok[j-1] && b[j-1] == next
			ok[j] = fromA || fromB
		}
	}
	return ok[len(b)]
}

func MaxOrdersInVan(orders [][2]int, maxWeight, maxVolume int) int {
	// best[w][v] — сколько заказов увезти, если свободно w веса и v объёма.
	best := make([][]int, maxWeight+1)
	for w := range best {
		best[w] = make([]int, maxVolume+1)
	}
	for _, o := range orders {
		// Вместимость сверху вниз — каждый заказ берётся не больше одного раза.
		for w := maxWeight; w >= o[0]; w-- {
			for v := maxVolume; v >= o[1]; v-- {
				if c := best[w-o[0]][v-o[1]] + 1; c > best[w][v] {
					best[w][v] = c
				}
			}
		}
	}
	return best[maxWeight][maxVolume]
}

func MaxUniqueParts(s string) int {
	used := map[string]bool{}
	return g3SplitFrom(s, 0, used)
}

// g3SplitFrom — наибольшее число новых кусков, на которые режется s[start:], если
// куски из used уже заняты.
func g3SplitFrom(s string, start int, used map[string]bool) int {
	if start == len(s) {
		return 0
	}
	best := -1 // -1 — хвост не разрезать без повтора
	for end := start + 1; end <= len(s); end++ {
		part := s[start:end]
		if used[part] {
			continue
		}
		used[part] = true
		if rest := g3SplitFrom(s, end, used); rest >= 0 && rest+1 > best {
			best = rest + 1
		}
		delete(used, part) // откат: кусок свободен для других вариантов
	}
	return best
}

func CountMagnetWords(tiles string) int {
	var left [26]int
	for i := 0; i < len(tiles); i++ {
		left[tiles[i]-'A']++
	}
	return g3CountWords(&left)
}

// g3CountWords — сколько разных непустых слов продолжают текущее, если в запасе left.
func g3CountWords(left *[26]int) int {
	count := 0
	for c := range left { // по разным буквам, а не по магнитам: так дубли не появляются
		if left[c] == 0 {
			continue
		}
		left[c]--
		count += 1 + g3CountWords(left) // само слово с этой буквой и все его продолжения
		left[c]++                       // откат: буква снова в запасе
	}
	return count
}

func LastInCircle(n, k int) int {
	// survivor — номер выжившего (с нуля) в круге из size детей. Для одного ребёнка — 0.
	// Круг из size детей после первого выбывания — круг из size-1, сдвинутый на k.
	survivor := 0
	for size := 2; size <= n; size++ {
		survivor = (survivor + k) % size
	}
	return survivor + 1
}

func VisibleAhead(heights []int) []int {
	res := make([]int, len(heights))
	// Справа налево: на стеке — те, кого видно с текущего места; рост на стеке
	// растёт от вершины ко дну.
	var stack []int
	for i := len(heights) - 1; i >= 0; i-- {
		seen := 0
		// Все, кто ниже i, видны ему — и заслонены им для всех левее.
		for len(stack) > 0 && stack[len(stack)-1] < heights[i] {
			stack = stack[:len(stack)-1]
			seen++
		}
		if len(stack) > 0 {
			seen++ // первый, кто выше i, тоже виден
		}
		res[i] = seen
		stack = append(stack, heights[i])
	}
	return res
}

func SurvivingRobots(robots []int) []int {
	stack := make([]int, 0, len(robots))
	for _, r := range robots {
		alive := true
		// Едущий влево бьётся о последних уцелевших, едущих вправо.
		for alive && r < 0 && len(stack) > 0 && stack[len(stack)-1] > 0 {
			top := stack[len(stack)-1]
			switch {
			case top < -r:
				stack = stack[:len(stack)-1] // разбился тот, что справа на стеке
			case top == -r:
				stack = stack[:len(stack)-1]
				alive = false
			default:
				alive = false
			}
		}
		if alive {
			stack = append(stack, r)
		}
	}
	return stack
}

func StateAfter(start int, next func(int) int, k int) int {
	// Флойд: встреча бегунов внутри кольца.
	slow, fast := next(start), next(next(start))
	for slow != fast {
		slow, fast = next(slow), next(next(fast))
	}
	// Вход в кольцо: от старта и от встречи — с одной скоростью.
	mu, entry := 0, start
	for entry != slow {
		entry, slow = next(entry), next(slow)
		mu++
	}
	lambda, x := 1, next(entry)
	for x != entry {
		x = next(x)
		lambda++
	}
	steps := k
	if k > mu {
		steps = mu + (k-mu)%lambda
	}
	x = start
	for ; steps > 0; steps-- {
		x = next(x)
	}
	return x
}

func HasRoundTrip(nums []int) bool {
	n := len(nums)
	step := func(i int) int { return ((i+nums[i])%n + n) % n }
	for i := range nums {
		if nums[i] == 0 {
			continue // уже знаем: отсюда цикла нет
		}
		forward := nums[i] > 0
		// ok — из клетки j прыжок в нужную сторону и не на себя.
		ok := func(j int) bool {
			return nums[j] != 0 && (nums[j] > 0) == forward && step(j) != j
		}
		slow, fast := i, i
		for ok(fast) && ok(step(fast)) {
			slow, fast = step(slow), step(step(fast))
			if slow == fast {
				return true
			}
		}
		// Цикла нет: весь путь из i в ту же сторону ведёт в тупик — гасим его.
		for j := i; nums[j] != 0 && (nums[j] > 0) == forward; {
			nxt := step(j)
			nums[j] = 0
			j = nxt
		}
	}
	return false
}

func CountSplits(ranges [][2]int) int {
	const mod = 1_000_000_007
	sorted := slices.Clone(ranges)
	slices.SortFunc(sorted, g1ByStart)
	ways, end := 1, -1
	for _, r := range sorted {
		if r[0] > end { // не касается текущей склейки — новая группа
			ways = ways * 2 % mod
		}
		end = max(end, r[1])
	}
	return ways
}

func FirstCommonSlot(a, b [][2]int, duration int) int {
	x, y := slices.Clone(a), slices.Clone(b)
	slices.SortFunc(x, g1ByStart)
	slices.SortFunc(y, g1ByStart)
	i, j := 0, 0
	for i < len(x) && j < len(y) {
		lo, hi := max(x[i][0], y[j][0]), min(x[i][1], y[j][1])
		if hi-lo >= duration {
			return lo
		}
		// Кончившийся раньше не пересечётся ни с чем дальше у второго.
		if x[i][1] < y[j][1] {
			i++
		} else {
			j++
		}
	}
	return -1
}

func KioskSpacing(positions []int, m int) int {
	sorted := slices.Clone(positions)
	slices.Sort(sorted)
	// Ищем последнее d, при котором расстановка ещё удаётся.
	lo, hi := 1, (sorted[len(sorted)-1]-sorted[0])/(m-1)
	for lo < hi {
		mid := lo + (hi-lo+1)/2
		if g5Fits(sorted, m, mid) {
			lo = mid
		} else {
			hi = mid - 1
		}
	}
	return lo
}

// g5Fits — влезут ли m киосков с шагом не меньше d, если ставить каждый как можно левее.
func g5Fits(sorted []int, m, d int) bool {
	placed, last := 1, sorted[0]
	for _, p := range sorted[1:] {
		if p-last >= d {
			placed, last = placed+1, p
			if placed == m {
				return true
			}
		}
	}
	return placed >= m
}

func FindOnTrail(n int, height func(i int) int, target int) int {
	// Вершина — первая точка, после которой тропа падает.
	lo, hi := 0, n-1
	for lo < hi {
		mid := lo + (hi-lo)/2
		if height(mid) < height(mid+1) {
			lo = mid + 1
		} else {
			hi = mid
		}
	}
	peak := lo
	if i := g5Search(height, 0, peak, target, true); i != -1 {
		return i
	}
	return g5Search(height, peak+1, n-1, target, false)
}

// g5Search — бинарный поиск target на отрезке [lo, hi], где высота растёт (up) или падает.
func g5Search(height func(int) int, lo, hi, target int, up bool) int {
	for lo <= hi {
		mid := lo + (hi-lo)/2
		h := height(mid)
		switch {
		case h == target:
			return mid
		case (h < target) == up:
			lo = mid + 1
		default:
			hi = mid - 1
		}
	}
	return -1
}

func PriceBonus(root *TreeNode) *TreeNode {
	// Обход «право → узел → лево» идёт от больших цен к меньшим. Стек вместо
	// рекурсии: дерево может быть цепочкой в 10⁵ узлов.
	sum := 0
	var stack []*TreeNode
	for node := root; node != nil || len(stack) > 0; {
		for node != nil {
			stack = append(stack, node)
			node = node.Right
		}
		node = stack[len(stack)-1]
		stack = stack[:len(stack)-1]
		sum += node.Val
		node.Val = sum
		node = node.Left
	}
	return root
}

func MinPriceGap(root *TreeNode) int {
	// Симметричный обход отдаёт цены по возрастанию: ближайшие — соседи.
	best, prev, havePrev := -1, 0, false
	var stack []*TreeNode
	for node := root; node != nil || len(stack) > 0; {
		for node != nil {
			stack = append(stack, node)
			node = node.Left
		}
		node = stack[len(stack)-1]
		stack = stack[:len(stack)-1]
		if havePrev && (best == -1 || node.Val-prev < best) {
			best = node.Val - prev
		}
		prev, havePrev = node.Val, true
		node = node.Right
	}
	return best
}

func IsFestiveTree(root *TreeNode) bool {
	if root == nil {
		return true
	}
	level := []*TreeNode{root}
	for even := true; len(level) > 0; even = !even {
		var nextLevel []*TreeNode
		for i, node := range level {
			if (node.Val%2 == 1) != even {
				return false // на чётном ярусе нужен нечётный номер и наоборот
			}
			if i > 0 {
				prev := level[i-1].Val
				if even && node.Val <= prev || !even && node.Val >= prev {
					return false
				}
			}
			if node.Left != nil {
				nextLevel = append(nextLevel, node.Left)
			}
			if node.Right != nil {
				nextLevel = append(nextLevel, node.Right)
			}
		}
		level = nextLevel
	}
	return true
}

func MinutesToSpread(root *TreeNode, start int) int {
	// Ссылки на начальника и сам start — одним обходом.
	parent := map[*TreeNode]*TreeNode{}
	var from *TreeNode
	stack := []*TreeNode{root}
	for len(stack) > 0 {
		node := stack[len(stack)-1]
		stack = stack[:len(stack)-1]
		if node.Val == start {
			from = node
		}
		for _, child := range []*TreeNode{node.Left, node.Right} {
			if child != nil {
				parent[child] = node
				stack = append(stack, child)
			}
		}
	}
	// Волны от start: каждая волна — минута.
	seen := map[*TreeNode]bool{from: true}
	wave := []*TreeNode{from}
	minutes := -1
	for len(wave) > 0 {
		minutes++
		var nextWave []*TreeNode
		for _, node := range wave {
			for _, nb := range []*TreeNode{node.Left, node.Right, parent[node]} {
				if nb != nil && !seen[nb] {
					seen[nb] = true
					nextWave = append(nextWave, nb)
				}
			}
		}
		wave = nextWave
	}
	return minutes
}

func LongestWellStockedRun(log string, k int) int {
	return g4WellStocked(log, k)
}

// g4WellStocked — ответ для куска s. Товар, которого в куске меньше k, режет кусок:
// годный отрезок его не содержит, а в каждом обрезке этого товара нет вовсе.
func g4WellStocked(s string, k int) int {
	if len(s) < k {
		return 0
	}
	var count [26]int
	for i := 0; i < len(s); i++ {
		count[s[i]-'a']++
	}
	best, start, cut := 0, 0, false
	for i := 0; i <= len(s); i++ {
		if i < len(s) && count[s[i]-'a'] >= k {
			continue
		}
		if i == len(s) && !cut {
			return len(s) // ни одного редкого товара — годен весь кусок
		}
		cut = true
		best = max(best, g4WellStocked(s[start:i], k))
		start = i + 1
	}
	return best
}

func CalmArrangement(n int) []int {
	if n == 1 {
		return []int{1}
	}
	// Нечётные слева, чётные справа: среднее нечётного и чётного не целое, так что
	// плохая тройка могла бы быть только внутри половины. Половины — спокойные
	// расстановки меньшего размера, растянутые x → 2x−1 и x → 2x: растяжение
	// сохраняет «среднее двух».
	res := make([]int, 0, n)
	for _, x := range CalmArrangement((n + 1) / 2) {
		res = append(res, 2*x-1)
	}
	for _, x := range CalmArrangement(n / 2) {
		res = append(res, 2*x)
	}
	return res
}

func MatchingRowsAndColumns(grid [][]int) int {
	n := len(grid)
	rows := make(map[string]int, n)
	for _, row := range grid {
		rows[g4Key(row)]++
	}
	pairs := 0
	col := make([]int, n)
	for c := 0; c < n; c++ {
		for r := 0; r < n; r++ {
			col[r] = grid[r][c]
		}
		pairs += rows[g4Key(col)] // каждая такая же строка даёт пару
	}
	return pairs
}

// g4Key — строка-ключ последовательности: каждое число — четыре байта (цвета
// меньше 2³²). Одинаковые последовательности дают одинаковый ключ, разные — разный.
func g4Key(xs []int) string {
	buf := make([]byte, 0, 4*len(xs))
	for _, v := range xs {
		buf = binary.LittleEndian.AppendUint32(buf, uint32(v))
	}
	return string(buf)
}

func FewestCutBricks(wall [][]int) int {
	// seams[x] — во скольких рядах есть шов на расстоянии x от левого края.
	seams := make(map[int]int)
	most := 0
	for _, row := range wall {
		x := 0
		for _, w := range row[:len(row)-1] { // правый край стены — не шов
			x += w
			seams[x]++
			most = max(most, seams[x])
		}
	}
	return len(wall) - most
}

func SplitByThreshold(head *ListNode, x int) *ListNode {
	// Две цепочки с заглушками: голова каждой появляется сама, без особых случаев.
	var lessHead, restHead ListNode
	less, rest := &lessHead, &restHead
	for node := head; node != nil; node = node.Next {
		if node.Val < x {
			less.Next = node
			less = node
		} else {
			rest.Next = node
			rest = node
		}
	}
	rest.Next = nil // иначе последний «несрочный» мог бы смотреть на срочного — цикл
	less.Next = restHead.Next
	return lessHead.Next
}

func DropRepeated(head *ListNode) *ListNode {
	dummy := ListNode{Next: head}
	keep := &dummy // последний оставленный узел
	for keep.Next != nil {
		run := keep.Next
		if run.Next != nil && run.Next.Val == run.Val {
			// Серия одинаковых: пропускаем её целиком.
			v := run.Val
			for run != nil && run.Val == v {
				run = run.Next
			}
			keep.Next = run
		} else {
			keep = run
		}
	}
	return dummy.Next
}

func SplitIntoConvoys(head *ListNode, k int) []*ListNode {
	n := 0
	for node := head; node != nil; node = node.Next {
		n++
	}
	size, extra := n/k, n%k // первые extra конвоев — на одного длиннее
	res := make([]*ListNode, k)
	node := head
	for i := 0; i < k && node != nil; i++ {
		res[i] = node
		length := size
		if i < extra {
			length++
		}
		for j := 1; j < length; j++ {
			node = node.Next
		}
		next := node.Next
		node.Next = nil // обрезаем конвой
		node = next
	}
	return res
}

func MinTotalWalk(houses []int) int {
	slices.Sort(houses)
	// Пока справа больше друзей, чем слева, сдвиг вправо выгоден: лучше всего —
	// средний по порядку дом. Сумма расстояний до него — пары «крайний слева,
	// крайний справа» сходятся к середине.
	total := 0
	for i, j := 0, len(houses)-1; i < j; i, j = i+1, j-1 {
		total += houses[j] - houses[i]
	}
	return total
}

func MinRaisesToDistinct(nums []int) int {
	slices.Sort(nums)
	ops, next := 0, 0 // next — наименьший номер, который ещё свободен
	for _, x := range nums {
		if x > next {
			next = x
		}
		ops += next - x
		next++
	}
	return ops
}

func MaxEqualAfterBoosts(salaries []int, budget int) int {
	slices.Sort(salaries)
	// Окно [l, r] подтягиваем к salaries[r]: цена — salaries[r]·длина − сумма.
	// С ростом r цена окна растёт, так что l только догоняет.
	best, sum, l := 0, 0, 0
	for r, target := range salaries {
		sum += target
		for target*(r-l+1)-sum > budget {
			sum -= salaries[l]
			l++
		}
		best = max(best, r-l+1)
	}
	return best
}

func MinTakesFromEnds(weights []int, x int) int {
	total := 0
	for _, w := range weights {
		total += w
	}
	// На ленте останется кусок подряд весом total − x; чем он длиннее, тем
	// меньше действий.
	need := total - x
	if need < 0 {
		return -1
	}
	longest, sum, l := -1, 0, 0
	for r, w := range weights {
		sum += w
		for sum > need { // веса положительные: лишнее снимаем слева
			sum -= weights[l]
			l++
		}
		if sum == need {
			longest = max(longest, r-l+1)
		}
	}
	if longest < 0 {
		return -1
	}
	return len(weights) - longest
}

func GoodsBetweenDividers(shelf string, queries [][2]int) []int {
	n := len(shelf)
	goods := make([]int, n+1) // goods[i] — товаров в shelf[:i]
	left := make([]int, n)    // ближайшая перегородка не правее i, −1 — нет
	right := make([]int, n)   // ближайшая перегородка не левее i, n — нет
	last := -1
	for i := 0; i < n; i++ {
		goods[i+1] = goods[i]
		if shelf[i] == '*' {
			goods[i+1]++
		} else {
			last = i
		}
		left[i] = last
	}
	last = n
	for i := n - 1; i >= 0; i-- {
		if shelf[i] == '|' {
			last = i
		}
		right[i] = last
	}
	res := make([]int, len(queries))
	for qi, q := range queries {
		a, b := right[q[0]], left[q[1]] // крайние перегородки внутри [l, r]
		if a < b {
			res[qi] = goods[b] - goods[a]
		}
	}
	return res
}

func CountBalancedTeams(skill []int, lower, upper int) int {
	slices.Sort(skill)
	return g4PairsAtMost(skill, upper) - g4PairsAtMost(skill, lower-1)
}

// g4PairsAtMost — число пар i < j отсортированного a с a[i] + a[j] ≤ limit.
func g4PairsAtMost(a []int, limit int) int {
	count := 0
	for i, j := 0, len(a)-1; i < j; {
		if a[i]+a[j] > limit {
			j-- // с a[j] не годится даже самый маленький — a[j] не нужен
		} else {
			count += j - i // a[i] годится со всеми a[i+1..j]
			i++
		}
	}
	return count
}

func WidestAffordableGap(offers, prices []int) int {
	best := 0
	for i, j := 0, 0; i < len(offers) && j < len(prices); {
		if offers[i] <= prices[j] {
			best = max(best, j-i) // при j < i разность отрицательна и не мешает
			j++
		} else {
			i++ // offers[i] слишком велик для prices[j] и всех дальше
		}
	}
	return best
}

func MinCrateMoves(root *TreeNode) int {
	moves := 0
	g6excess(root, &moves)
	return moves
}

// g6excess возвращает избыток поддерева — ящиков в нём минус складов; столько
// ящиков пройдёт по дороге над ним (вверх, если избыток положителен, вниз — если нет).
func g6excess(node *TreeNode, moves *int) int {
	if node == nil {
		return 0
	}
	l := g6excess(node.Left, moves)
	r := g6excess(node.Right, moves)
	*moves += g6abs(l) + g6abs(r)
	return node.Val - 1 + l + r
}

func g6abs(x int) int {
	if x < 0 {
		return -x
	}
	return x
}

func WidestSalaryGap(root *TreeNode) int {
	if root == nil {
		return 0
	}
	return g6gap(root, root.Val, root.Val)
}

// g6gap — лучшая разница в поддереве node, если на пути от корня к node (включая его
// родителя) наименьшая зарплата lo, а наибольшая hi.
func g6gap(node *TreeNode, lo, hi int) int {
	if node == nil {
		return hi - lo
	}
	lo, hi = min(lo, node.Val), max(hi, node.Val)
	return max(g6gap(node.Left, lo, hi), g6gap(node.Right, lo, hi))
}

func BestTeamScore(skill, speed []int, k int) int {
	type person struct{ skill, speed int }
	people := make([]person, len(skill))
	for i := range people {
		people[i] = person{skill[i], speed[i]}
	}
	slices.SortFunc(people, func(a, b person) int { return b.speed - a.speed })
	// В куче — k самых умелых из уже просмотренных (они не медленнее
	// текущего); наверху — наименьший навык, его и вытесняет новичок.
	team := make(g6minHeap, k)
	sum := 0
	for i, p := range people[:k] {
		team[i] = p.skill
		sum += p.skill
	}
	heap.Init(&team)
	best := sum * people[k-1].speed
	for _, p := range people[k:] {
		if p.skill > team[0] {
			sum += p.skill - team[0]
			team[0] = p.skill
			heap.Fix(&team, 0)
		}
		// Если p не вошёл в кучу, команда из кучи быстрее p, и это произведение
		// лишь занижает её результат — ответ оно не испортит.
		best = max(best, sum*p.speed)
	}
	return best
}

// g6minHeap — куча целых с наименьшим наверху; g6maxHeap — с наибольшим.
type g6minHeap []int

func (h g6minHeap) Len() int           { return len(h) }
func (h g6minHeap) Less(i, j int) bool { return h[i] < h[j] }
func (h g6minHeap) Swap(i, j int)      { h[i], h[j] = h[j], h[i] }
func (h *g6minHeap) Push(x any)        { *h = append(*h, x.(int)) }
func (h *g6minHeap) Pop() any {
	old := *h
	x := old[len(old)-1]
	*h = old[:len(old)-1]
	return x
}

type g6maxHeap struct{ g6minHeap }

func (h g6maxHeap) Less(i, j int) bool { return h.g6minHeap[i] > h.g6minHeap[j] }

func MinWeightGap(weights []int) int {
	m := len(weights) / 3
	// light[b] — вес m самых лёгких среди weights[:m+b], b = 0…m.
	// В куче — эти m деталей, наверху самая тяжёлая из них: её вытесняет более лёгкая.
	light := make([]int, m+1)
	lh := g6maxHeap{slices.Clone(weights[:m])}
	light[0] = g6sum(lh.g6minHeap)
	heap.Init(&lh)
	for b := 1; b <= m; b++ {
		light[b] = light[b-1]
		if w := weights[m+b-1]; w < lh.g6minHeap[0] {
			light[b] += w - lh.g6minHeap[0]
			lh.g6minHeap[0] = w
			heap.Fix(&lh, 0)
		}
	}
	// Справа налево: heavy — вес m самых тяжёлых среди weights[m+b:].
	hh := g6minHeap(slices.Clone(weights[2*m:]))
	heavy := g6sum(hh)
	heap.Init(&hh)
	best := light[m] - heavy
	for b := m - 1; b >= 0; b-- {
		if w := weights[m+b]; w > hh[0] {
			heavy += w - hh[0]
			hh[0] = w
			heap.Fix(&hh, 0)
		}
		best = min(best, light[b]-heavy)
	}
	return best
}

func g6sum(xs []int) int {
	s := 0
	for _, x := range xs {
		s += x
	}
	return s
}

func MinBusiestCourier(jobs []int, k int) int {
	sorted := slices.Clone(jobs)
	slices.SortFunc(sorted, func(a, b int) int { return b - a }) // крупные — первыми: отсечения раньше
	best := 0
	for _, j := range sorted {
		best += j // все заказы одному курьеру — заведомо допустимо
	}
	loads := make([]int, k)
	g6assign(sorted, 0, loads, &best)
	return best
}

func g6assign(jobs []int, i int, loads []int, best *int) {
	if i == len(jobs) {
		*best = slices.Max(loads)
		return
	}
	for c := range loads {
		// Курьеры с одинаковой загрузкой взаимозаменяемы: хватит одного.
		if slices.Contains(loads[:c], loads[c]) {
			continue
		}
		if loads[c]+jobs[i] >= *best {
			continue // не лучше найденного
		}
		loads[c] += jobs[i]
		g6assign(jobs, i+1, loads, best)
		loads[c] -= jobs[i]
	}
}

func MinHopsToLast(colors []int) int {
	n := len(colors)
	same := map[int][]int{}
	for i, c := range colors {
		same[c] = append(same[c], i)
	}
	dist := make([]int, n)
	for i := range dist {
		dist[i] = -1
	}
	dist[0] = 0
	queue := []int{0}
	for len(queue) > 0 {
		v := queue[0]
		queue = queue[1:]
		if v == n-1 {
			return dist[v]
		}
		next := same[colors[v]]
		delete(same, colors[v]) // переходы по этому цвету раскрыты раз и навсегда
		next = append(next, v-1, v+1)
		for _, u := range next {
			if u >= 0 && u < n && dist[u] == -1 {
				dist[u] = dist[v] + 1
				queue = append(queue, u)
			}
		}
	}
	return -1 // недостижимо не бывает: соседние станции связаны всегда
}

func CookableDishes(recipes []string, ingredients [][]string, supplies []string) []string {
	missing := make([]int, len(recipes)) // сколько ингредиентов блюда ещё не готово
	users := map[string][]int{}          // ингредиент → блюда, которым он нужен
	for i, ing := range ingredients {
		missing[i] = len(ing)
		for _, x := range ing {
			users[x] = append(users[x], i)
		}
	}
	can := make([]bool, len(recipes))
	ready := slices.Clone(supplies) // готово, но ещё не разослано тем, кому нужно
	for i := range recipes {
		if missing[i] == 0 {
			can[i] = true
			ready = append(ready, recipes[i])
		}
	}
	for len(ready) > 0 {
		x := ready[len(ready)-1]
		ready = ready[:len(ready)-1]
		for _, r := range users[x] {
			missing[r]--
			if missing[r] == 0 {
				can[r] = true
				ready = append(ready, recipes[r])
			}
		}
	}
	res := []string{}
	for i, r := range recipes {
		if can[i] {
			res = append(res, r)
		}
	}
	return res
}

func SafeRooms(doors [][]int) []int {
	n := len(doors)
	from := make([][]int, n) // развёрнутые двери: from[v] — откуда можно прийти в v
	left := make([]int, n)   // сколько дверей комнаты ещё не ведут в безопасные
	for v, ds := range doors {
		left[v] = len(ds)
		for _, u := range ds {
			from[u] = append(from[u], v)
		}
	}
	var queue []int
	for v := range doors {
		if left[v] == 0 {
			queue = append(queue, v)
		}
	}
	safe := make([]bool, n)
	for len(queue) > 0 {
		v := queue[len(queue)-1]
		queue = queue[:len(queue)-1]
		safe[v] = true
		for _, u := range from[v] {
			left[u]--
			if left[u] == 0 {
				queue = append(queue, u)
			}
		}
	}
	res := []int{}
	for v, ok := range safe {
		if ok {
			res = append(res, v)
		}
	}
	return res
}

func EarliestFullBloom(plant, grow []int) int {
	order := make([]int, len(plant))
	for i := range order {
		order[i] = i
	}
	// Дольше растущее — раньше: пока оно растёт, сажаем остальные.
	slices.SortFunc(order, func(a, b int) int { return grow[b] - grow[a] })
	day, last := 0, 0
	for _, i := range order {
		day += plant[i]
		last = max(last, day+grow[i])
	}
	return last
}

func CanSplitIntoRuns(nums []int) bool {
	left := map[int]int{} // сколько карточек с этим числом ещё не разложено
	for _, x := range nums {
		left[x]++
	}
	ends := map[int]int{} // сколько готовых лесенок кончается на этом числе
	for _, x := range nums {
		if left[x] == 0 {
			continue // уже ушла в лесенку, начатую раньше
		}
		left[x]--
		switch {
		case ends[x-1] > 0: // продлить готовую лесенку никогда не хуже
			ends[x-1]--
			ends[x]++
		case left[x+1] > 0 && left[x+2] > 0: // иначе — новая, сразу из трёх
			left[x+1]--
			left[x+2]--
			ends[x+2]++
		default:
			return false
		}
	}
	return true
}
