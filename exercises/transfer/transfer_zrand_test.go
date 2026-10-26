package transfer

import (
	"fmt"
	"math/rand"
	"slices"
	"testing"
)

// Сверка с перебором на маленьких случайных входах. Переборы — прямые определения
// из условий, без всякой хитрости.

// bruteMerge склеивает записи, пока есть две группы с общей почтой.
func bruteMerge(accounts [][]string) [][]string {
	type group struct {
		name   string
		emails map[string]bool
	}
	var gs []group
	for _, acc := range accounts {
		g := group{acc[0], map[string]bool{}}
		for _, e := range acc[1:] {
			g.emails[e] = true
		}
		gs = append(gs, g)
	}
	for changed := true; changed; {
		changed = false
		for i := 0; i < len(gs) && !changed; i++ {
			for j := i + 1; j < len(gs) && !changed; j++ {
				for e := range gs[j].emails {
					if gs[i].emails[e] {
						for e2 := range gs[j].emails {
							gs[i].emails[e2] = true
						}
						gs = slices.Delete(gs, j, j+1)
						changed = true
						break
					}
				}
			}
		}
	}
	var res [][]string
	for _, g := range gs {
		row := []string{g.name}
		for e := range g.emails {
			row = append(row, e)
		}
		slices.Sort(row[1:])
		res = append(res, row)
	}
	return normPeople(res)
}

func bruteProcessing(tasks [][]int) []int {
	done := make([]bool, len(tasks))
	var res []int
	t := 0
	for len(res) < len(tasks) {
		pick := -1
		for i, task := range tasks {
			if done[i] || task[0] > t {
				continue
			}
			if pick < 0 || task[1] < tasks[pick][1] {
				pick = i
			}
		}
		if pick < 0 {
			t++
			continue
		}
		done[pick] = true
		res = append(res, pick)
		t += tasks[pick][1]
	}
	return res
}

// bruteIslands после каждого запроса заново считает острова обходом.
func bruteIslands(m, n int, cells [][]int) []int {
	land := make([][]bool, m)
	for i := range land {
		land[i] = make([]bool, n)
	}
	var res []int
	for _, c := range cells {
		land[c[0]][c[1]] = true
		seen := make([][]bool, m)
		for i := range seen {
			seen[i] = make([]bool, n)
		}
		var fill func(r, c int)
		fill = func(r, c int) {
			if r < 0 || r >= m || c < 0 || c >= n || !land[r][c] || seen[r][c] {
				return
			}
			seen[r][c] = true
			fill(r+1, c)
			fill(r-1, c)
			fill(r, c+1)
			fill(r, c-1)
		}
		count := 0
		for r := 0; r < m; r++ {
			for c := 0; c < n; c++ {
				if land[r][c] && !seen[r][c] {
					count++
					fill(r, c)
				}
			}
		}
		res = append(res, count)
	}
	return res
}

// bruteGap перебирает все наборы из k мест.
func bruteGap(points []int, k int) int {
	p := slices.Sorted(slices.Values(points))
	best := 0
	var pick func(from, left, last, minGap int)
	pick = func(from, left, last, minGap int) {
		if left == 0 {
			best = max(best, minGap)
			return
		}
		for i := from; i < len(p); i++ {
			g := minGap
			if last >= 0 {
				g = min(g, p[i]-p[last])
			}
			pick(i+1, left-1, i, g)
		}
	}
	pick(0, k, -1, 1<<62)
	return best
}

func bruteRemoval(nums []int, p int) int {
	total := 0
	for _, x := range nums {
		total += x
	}
	if total%p == 0 {
		return 0
	}
	best := -1
	for i := range nums {
		s := 0
		for j := i; j < len(nums); j++ {
			s += nums[j]
			if j-i+1 < len(nums) && (total-s)%p == 0 && (best < 0 || j-i+1 < best) {
				best = j - i + 1
			}
		}
	}
	return best
}

// bruteUnique перебирает все подпоследовательности.
func bruteUnique(s string) string {
	need := map[byte]bool{}
	for i := 0; i < len(s); i++ {
		need[s[i]] = true
	}
	best := ""
	for mask := 1; mask < 1<<len(s); mask++ {
		var b []byte
		seen := map[byte]bool{}
		ok := true
		for i := 0; i < len(s) && ok; i++ {
			if mask&(1<<i) != 0 {
				if seen[s[i]] {
					ok = false
				}
				seen[s[i]] = true
				b = append(b, s[i])
			}
		}
		if ok && len(seen) == len(need) && (best == "" || string(b) < best) {
			best = string(b)
		}
	}
	return best
}

func bruteDistinct(nums []int, k int) int {
	best := 0
	for i := 0; i+k <= len(nums); i++ {
		seen := map[int]bool{}
		s := 0
		for _, x := range nums[i : i+k] {
			seen[x] = true
			s += x
		}
		if len(seen) == k {
			best = max(best, s)
		}
	}
	return best
}

func TestMergeAccountsRandom(t *testing.T) {
	r := rand.New(rand.NewSource(1))
	names := []string{"Аня", "Борис"}
	for it := 0; it < 300; it++ {
		// Почты из маленького пула: группы часто склеиваются цепочкой. Имя группы
		// задаёт почта: у одного человека имя одно, как требует условие.
		var acc [][]string
		for range 1 + r.Intn(7) {
			first := r.Intn(12)
			row := []string{names[first%2], fmt.Sprintf("m%02d@x", first)}
			for range r.Intn(3) {
				e := r.Intn(6)*2 + first%2
				row = append(row, fmt.Sprintf("m%02d@x", e))
			}
			acc = append(acc, row)
		}
		got := normPeople(MergeAccounts(acc))
		if want := bruteMerge(acc); !slices.EqualFunc(got, want, slices.Equal[[]string]) {
			t.Fatalf("MergeAccounts(%v) = %v, ожидалось %v", acc, got, want)
		}
	}
}

func TestProcessingOrderRandom(t *testing.T) {
	r := rand.New(rand.NewSource(2))
	for it := 0; it < 500; it++ {
		tasks := make([][]int, 1+r.Intn(9))
		for i := range tasks {
			tasks[i] = []int{1 + r.Intn(12), 1 + r.Intn(4)}
		}
		if got, want := ProcessingOrder(tasks), bruteProcessing(tasks); !slices.Equal(got, want) {
			t.Fatalf("ProcessingOrder(%v) = %v, ожидалось %v", tasks, got, want)
		}
	}
}

func TestIslandCountsRandom(t *testing.T) {
	r := rand.New(rand.NewSource(3))
	for it := 0; it < 300; it++ {
		m, n := 1+r.Intn(5), 1+r.Intn(5)
		cells := make([][]int, 1+r.Intn(m*n+3))
		for i := range cells {
			cells[i] = []int{r.Intn(m), r.Intn(n)}
		}
		if got, want := IslandCounts(m, n, cells), bruteIslands(m, n, cells); !slices.Equal(got, want) {
			t.Fatalf("IslandCounts(%d, %d, %v) = %v, ожидалось %v", m, n, cells, got, want)
		}
	}
}

func TestMaxMinGapRandom(t *testing.T) {
	r := rand.New(rand.NewSource(4))
	for it := 0; it < 500; it++ {
		points := r.Perm(30)[:2+r.Intn(7)]
		k := 2 + r.Intn(len(points)-1)
		want := bruteGap(points, k)
		if got := MaxMinGap(slices.Clone(points), k); got != want {
			t.Fatalf("MaxMinGap(%v, %d) = %d, ожидалось %d", points, k, got, want)
		}
	}
}

func TestShortestRemovalRandom(t *testing.T) {
	r := rand.New(rand.NewSource(5))
	for it := 0; it < 1000; it++ {
		nums := make([]int, 1+r.Intn(8))
		for i := range nums {
			nums[i] = 1 + r.Intn(10)
		}
		p := 1 + r.Intn(12)
		if got, want := ShortestRemoval(nums, p), bruteRemoval(nums, p); got != want {
			t.Fatalf("ShortestRemoval(%v, %d) = %d, ожидалось %d", nums, p, got, want)
		}
	}
}

func TestSmallestUniqueLettersRandom(t *testing.T) {
	r := rand.New(rand.NewSource(6))
	for it := 0; it < 500; it++ {
		b := make([]byte, 1+r.Intn(11))
		for i := range b {
			b[i] = byte('a' + r.Intn(4))
		}
		s := string(b)
		if got, want := SmallestUniqueLetters(s), bruteUnique(s); got != want {
			t.Fatalf("SmallestUniqueLetters(%q) = %q, ожидалось %q", s, got, want)
		}
	}
}

func TestMaxDistinctSumRandom(t *testing.T) {
	r := rand.New(rand.NewSource(7))
	for it := 0; it < 1000; it++ {
		nums := make([]int, 1+r.Intn(10))
		for i := range nums {
			nums[i] = 1 + r.Intn(6)
		}
		k := 1 + r.Intn(len(nums))
		if got, want := MaxDistinctSum(nums, k), bruteDistinct(nums, k); got != want {
			t.Fatalf("MaxDistinctSum(%v, %d) = %d, ожидалось %d", nums, k, got, want)
		}
	}
}
