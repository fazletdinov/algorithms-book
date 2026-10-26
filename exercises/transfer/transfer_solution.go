//go:build solution

package transfer

import (
	"container/heap"
	"slices"
	"sort"
)

// dsu — система непересекающихся множеств: сжатие путей + объединение по размеру.
type dsu struct{ parent, size []int }

func newDSU(n int) *dsu {
	d := &dsu{parent: make([]int, n), size: make([]int, n)}
	for i := range d.parent {
		d.parent[i], d.size[i] = i, 1
	}
	return d
}

func (d *dsu) find(x int) int {
	for d.parent[x] != x {
		d.parent[x] = d.parent[d.parent[x]]
		x = d.parent[x]
	}
	return x
}

// union склеивает группы a и b; false — они уже были одной группой.
func (d *dsu) union(a, b int) bool {
	ra, rb := d.find(a), d.find(b)
	if ra == rb {
		return false
	}
	if d.size[ra] < d.size[rb] {
		ra, rb = rb, ra
	}
	d.parent[rb] = ra
	d.size[ra] += d.size[rb]
	return true
}

func MergeAccounts(accounts [][]string) [][]string {
	d := newDSU(len(accounts))
	owner := make(map[string]int) // почта -> первая запись, где она встретилась
	for i, acc := range accounts {
		for _, email := range acc[1:] {
			if j, ok := owner[email]; ok {
				d.union(i, j)
			} else {
				owner[email] = i
			}
		}
	}
	groups := make(map[int][]string) // корень -> почты группы (каждая один раз: ключи owner)
	for email, i := range owner {
		r := d.find(i)
		groups[r] = append(groups[r], email)
	}
	res := make([][]string, 0, len(groups))
	for r, emails := range groups {
		slices.Sort(emails)
		res = append(res, append([]string{accounts[r][0]}, emails...))
	}
	// Порядок людей условием не задан; сортируем, чтобы ответ не зависел от обхода map.
	slices.SortFunc(res, func(a, b []string) int { return slices.Compare(a, b) })
	return res
}

// waiting — мин-куча поступивших задач по (длительность, номер).
type waiting struct {
	idx   []int
	tasks [][]int
}

func (w waiting) Len() int { return len(w.idx) }
func (w waiting) Less(a, b int) bool {
	ta, tb := w.tasks[w.idx[a]], w.tasks[w.idx[b]]
	if ta[1] != tb[1] {
		return ta[1] < tb[1]
	}
	return w.idx[a] < w.idx[b]
}
func (w waiting) Swap(a, b int) { w.idx[a], w.idx[b] = w.idx[b], w.idx[a] }
func (w *waiting) Push(x any)   { w.idx = append(w.idx, x.(int)) }
func (w *waiting) Pop() any {
	x := w.idx[len(w.idx)-1]
	w.idx = w.idx[:len(w.idx)-1]
	return x
}

func ProcessingOrder(tasks [][]int) []int {
	n := len(tasks)
	byArrival := make([]int, n)
	for i := range byArrival {
		byArrival[i] = i
	}
	sort.SliceStable(byArrival, func(a, b int) bool {
		return tasks[byArrival[a]][0] < tasks[byArrival[b]][0]
	})
	h := &waiting{tasks: tasks}
	res := make([]int, 0, n)
	t, next := 0, 0
	for len(res) < n {
		if h.Len() == 0 && t < tasks[byArrival[next]][0] {
			t = tasks[byArrival[next]][0] // простой до следующей задачи
		}
		for next < n && tasks[byArrival[next]][0] <= t {
			heap.Push(h, byArrival[next])
			next++
		}
		i := heap.Pop(h).(int)
		res = append(res, i)
		t += tasks[i][1] // до 10⁵·10⁹ = 10¹⁴ — int в Go 64-битный
	}
	return res
}

func IslandCounts(m, n int, cells [][]int) []int {
	d := newDSU(m * n)
	land := make([]bool, m*n)
	dirs := [4][2]int{{1, 0}, {-1, 0}, {0, 1}, {0, -1}}
	res := make([]int, len(cells))
	count := 0
	for qi, cell := range cells {
		r, c := cell[0], cell[1]
		id := r*n + c
		if !land[id] {
			land[id] = true
			count++
			for _, dd := range dirs {
				nr, nc := r+dd[0], c+dd[1]
				if nr < 0 || nr >= m || nc < 0 || nc >= n || !land[nr*n+nc] {
					continue
				}
				if d.union(id, nr*n+nc) {
					count--
				}
			}
		}
		res[qi] = count
	}
	return res
}

func MaxMinGap(points []int, k int) int {
	slices.Sort(points)
	// canPlace: жадно — первая станция в самом левом месте, каждая следующая в
	// первом месте не ближе gap к последней поставленной.
	canPlace := func(gap int) bool {
		placed, last := 1, points[0]
		for _, x := range points[1:] {
			if x-last >= gap {
				placed++
				last = x
				if placed == k {
					return true
				}
			}
		}
		return false
	}
	lo, hi := 1, (points[len(points)-1]-points[0])/(k-1) // координаты различны: gap = 1 достижим
	for lo < hi {
		mid := lo + (hi-lo+1)/2
		if canPlace(mid) {
			lo = mid
		} else {
			hi = mid - 1
		}
	}
	return lo
}

func ShortestRemoval(nums []int, p int) int {
	r := 0
	for _, x := range nums {
		r = (r + x) % p
	}
	if r == 0 {
		return 0
	}
	last := map[int]int{0: -1} // остаток префикса -> последний индекс, где он был
	best := len(nums)
	cur := 0
	for i, x := range nums {
		cur = (cur + x) % p
		if j, ok := last[(cur-r+p)%p]; ok && i-j < best {
			best = i - j
		}
		last[cur] = i
	}
	if best == len(nums) {
		return -1
	}
	return best
}

func SmallestUniqueLetters(s string) string {
	var lastAt [26]int
	for i := 0; i < len(s); i++ {
		lastAt[s[i]-'a'] = i
	}
	var inStack [26]bool
	stack := make([]byte, 0, 26)
	for i := 0; i < len(s); i++ {
		ch := s[i]
		if inStack[ch-'a'] {
			continue
		}
		for len(stack) > 0 {
			top := stack[len(stack)-1]
			if top <= ch || lastAt[top-'a'] < i {
				break // вершина меньше или больше не встретится — остаётся
			}
			stack = stack[:len(stack)-1]
			inStack[top-'a'] = false
		}
		stack = append(stack, ch)
		inStack[ch-'a'] = true
	}
	return string(stack)
}

func OpenLock(traps []string, target string) int {
	code := func(s string) int {
		v := 0
		for i := 0; i < 4; i++ {
			v = v*10 + int(s[i]-'0')
		}
		return v
	}
	var seen [10000]bool
	for _, t := range traps {
		seen[code(t)] = true // в ловушку BFS просто не войдёт
	}
	if seen[0] {
		return -1
	}
	goal := code(target)
	seen[0] = true
	queue := []int{0}
	for steps := 0; len(queue) > 0; steps++ {
		var next []int
		for _, v := range queue {
			if v == goal {
				return steps
			}
			for pow := 1; pow < 10000; pow *= 10 {
				digit := v / pow % 10
				for _, nd := range [2]int{(digit + 1) % 10, (digit + 9) % 10} {
					u := v + (nd-digit)*pow
					if !seen[u] {
						seen[u] = true
						next = append(next, u)
					}
				}
			}
		}
		queue = next
	}
	return -1
}

func MaxDistinctSum(nums []int, k int) int {
	count := make(map[int]int, k)
	sum, best := 0, 0
	for i, x := range nums {
		sum += x
		count[x]++
		if i >= k {
			out := nums[i-k]
			sum -= out
			if count[out]--; count[out] == 0 {
				delete(count, out)
			}
		}
		if i >= k-1 && len(count) == k && sum > best {
			best = sum
		}
	}
	return best
}
