package npcomplete

import (
	"math/rand"
	"testing"
)

func TestVerifySubsetSum(t *testing.T) {
	tests := []struct {
		name   string
		nums   []int
		chosen []int
		target int
		want   bool
	}{
		{"верный сертификат", []int{3, 8, 2}, []int{0, 1}, 11, true},
		{"сумма не совпадает", []int{3, 8, 2}, []int{0, 1}, 10, false},
		{"повтор индекса", []int{3, 8, 2}, []int{0, 0}, 6, false},
		{"индекс вне диапазона", []int{3, 8, 2}, []int{3}, 0, false},
		{"отрицательный индекс", []int{3, 8, 2}, []int{-1}, 0, false},
		{"пустой сертификат, пустой набор", nil, nil, 0, true},
		{"пустой сертификат, ненулевая цель", []int{5}, nil, 5, false},
		{"весь набор", []int{3, 8, 2}, []int{0, 1, 2}, 13, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := VerifySubsetSum(tt.nums, tt.chosen, tt.target); got != tt.want {
				t.Errorf("VerifySubsetSum(%v, %v, %d) = %v, ожидалось %v", tt.nums, tt.chosen, tt.target, got, tt.want)
			}
		})
	}
}

func TestSubsetSumExact(t *testing.T) {
	tests := []struct {
		name   string
		nums   []int
		target int
		want   bool
	}{
		{"есть пара", []int{3, 8, 2}, 11, true},
		{"вся сумма", []int{3, 8, 2}, 13, true},
		{"недостижимо", []int{3, 8, 2}, 7, false},
		{"пустой набор, цель 0", nil, 0, true},
		{"пустой набор, ненулевая цель", nil, 5, false},
		{"дубликаты", []int{1, 1, 1}, 2, true},
		{"единственный элемент совпал", []int{5}, 5, true},
		{"единственный элемент не совпал", []int{5}, 3, false},
		{"нули в наборе", []int{0, 0, 4}, 4, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := SubsetSumExact(tt.nums, tt.target); got != tt.want {
				t.Errorf("SubsetSumExact(%v, %d) = %v, ожидалось %v", tt.nums, tt.target, got, tt.want)
			}
		})
	}
}

// Независимый эталон: снизу вверх, какие суммы вообще достижимы (0/1 DP),
// сверяем с рекурсивным перебором «взять/не взять».
func TestSubsetSumExactRandomVsDP(t *testing.T) {
	rng := rand.New(rand.NewSource(42))
	for range 500 {
		n := rng.Intn(12)
		nums := make([]int, n)
		sum := 0
		for i := range nums {
			nums[i] = rng.Intn(15)
			sum += nums[i]
		}
		target := rng.Intn(sum + 2) // изредка на 1 больше суммы — заведомо недостижимо

		achievable := make([]bool, sum+1)
		achievable[0] = true
		for _, x := range nums {
			for s := sum; s >= x; s-- {
				if achievable[s-x] {
					achievable[s] = true
				}
			}
		}
		want := target <= sum && achievable[target]

		if got := SubsetSumExact(nums, target); got != want {
			t.Fatalf("SubsetSumExact(%v, %d) = %v, DP-эталон = %v", nums, target, got, want)
		}
	}
}

func TestFirstFitDecreasing(t *testing.T) {
	tests := []struct {
		name    string
		weights []int
		cap     int
		want    int
	}{
		{"пример из главы", []int{4, 8, 1, 4, 2, 1}, 10, 2},
		{"каждый заполняет корзину целиком", []int{2, 2, 2}, 2, 3},
		{"экономия от сортировки по убыванию", []int{1, 2, 3, 4}, 5, 2},
		{"один элемент", []int{5}, 5, 1},
		{"пусто", nil, 10, 0},
		{"все влезают в одну", []int{1, 1, 1, 1}, 10, 1},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := FirstFitDecreasing(tt.weights, tt.cap); got != tt.want {
				t.Errorf("FirstFitDecreasing(%v, %d) = %d, ожидалось %d", tt.weights, tt.cap, got, tt.want)
			}
		})
	}
}

// Свойство, не зависящее от конкретной эвристики: результат не может быть
// меньше тривиальной нижней границы ceil(sum/cap) и не может превышать число
// предметов (у каждой корзины хотя бы один предмет).
func TestFirstFitDecreasingRandomBounds(t *testing.T) {
	rng := rand.New(rand.NewSource(7))
	for range 500 {
		capV := rng.Intn(20) + 1
		n := rng.Intn(15)
		weights := make([]int, n)
		sum := 0
		for i := range weights {
			weights[i] = rng.Intn(capV) + 1 // 1..cap, как гарантирует контракт
			sum += weights[i]
		}
		got := FirstFitDecreasing(weights, capV)

		lower := sum / capV
		if sum%capV != 0 {
			lower++
		}
		if got < lower {
			t.Fatalf("FirstFitDecreasing(%v, %d) = %d корзин — меньше нижней границы ceil(sum/cap)=%d", weights, capV, got, lower)
		}
		if n > 0 && got > n {
			t.Fatalf("FirstFitDecreasing(%v, %d) = %d корзин — больше числа предметов %d", weights, capV, got, n)
		}
	}
}

func TestVertexCoverGreedy2Approx(t *testing.T) {
	tests := []struct {
		name  string
		n     int
		edges [][2]int
		want  []int
	}{
		{"треугольник", 3, [][2]int{{0, 1}, {1, 2}, {0, 2}}, []int{0, 1}},
		{"путь из 4 вершин", 4, [][2]int{{0, 1}, {1, 2}, {2, 3}}, []int{0, 1, 2, 3}},
		{"звезда", 4, [][2]int{{0, 1}, {0, 2}, {0, 3}}, []int{0, 1}},
		{"без рёбер", 3, nil, nil},
		{"одно ребро", 2, [][2]int{{0, 1}}, []int{0, 1}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := VertexCoverGreedy2Approx(tt.n, tt.edges)
			if !equalInts(got, tt.want) {
				t.Errorf("VertexCoverGreedy2Approx(%d, %v) = %v, ожидалось %v", tt.n, tt.edges, got, tt.want)
			}
		})
	}
}

// Свойство, которое обязано выполняться для ЛЮБОГО валидного покрытия
// (каждое ребро задето), плюс сверка с теоретической гарантией ≤ 2×OPT:
// OPT на маленьких графах считаем брутфорсом по всем подмножествам вершин.
func TestVertexCoverGreedy2ApproxRandomProperty(t *testing.T) {
	rng := rand.New(rand.NewSource(99))
	for range 300 {
		n := rng.Intn(7) + 1 // маленький n: брутфорс оптимума ниже успевает
		var edges [][2]int
		for u := range n {
			for v := u + 1; v < n; v++ {
				if rng.Intn(2) == 0 {
					edges = append(edges, [2]int{u, v})
				}
			}
		}

		cover := VertexCoverGreedy2Approx(n, edges)
		coveredSet := make(map[int]bool, len(cover))
		for _, v := range cover {
			coveredSet[v] = true
		}
		for _, e := range edges {
			if !coveredSet[e[0]] && !coveredSet[e[1]] {
				t.Fatalf("VertexCoverGreedy2Approx(%d, %v) = %v не покрывает ребро %v", n, edges, cover, e)
			}
		}

		if len(edges) > 0 {
			opt := bruteForceMinVertexCover(n, edges)
			if len(cover) > 2*opt {
				t.Fatalf("VertexCoverGreedy2Approx(%d, %v) = %v (размер %d) — гарантия не более 2×OPT=2×%d нарушена", n, edges, cover, len(cover), opt)
			}
		}
	}
}

// bruteForceMinVertexCover — независимый эталон только для теста: перебор
// всех подмножеств вершин (n мало), наименьшее из покрывающих все рёбра.
func bruteForceMinVertexCover(n int, edges [][2]int) int {
	best := n
	for mask := 0; mask < 1<<n; mask++ {
		ok := true
		for _, e := range edges {
			if mask&(1<<e[0]) == 0 && mask&(1<<e[1]) == 0 {
				ok = false
				break
			}
		}
		if ok && popcount(mask) < best {
			best = popcount(mask)
		}
	}
	return best
}

func popcount(x int) int {
	c := 0
	for x > 0 {
		c += x & 1
		x >>= 1
	}
	return c
}

func equalInts(a, b []int) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}
