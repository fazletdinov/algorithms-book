//go:build solution

package fresh

import (
	"container/heap"
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
