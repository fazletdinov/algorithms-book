package fresh

import (
	"fmt"
	"slices"
	"testing"
)

func TestMaxSatisfiedCustomers(t *testing.T) {
	const T, F = true, false
	tests := []struct {
		name      string
		customers []int
		grumpy    []bool
		k         int
		want      int
	}{
		{"пример", []int{1, 0, 1, 2, 1, 1, 7, 5}, []bool{F, T, F, T, F, T, F, T}, 3, 16},
		{"одна минута", []int{1}, []bool{F}, 1, 1},
		{"одна плохая минута", []int{5}, []bool{T}, 1, 5},
		{"всегда в духе", []int{2, 3, 4}, []bool{F, F, F}, 2, 9},
		{"всегда не в духе, k на всю смену", []int{2, 3, 4}, []bool{T, T, T}, 3, 9},
		{"лучший отрезок в самом начале", []int{9, 9, 1, 1, 1}, []bool{T, T, F, T, F}, 2, 20},
		{"лучший отрезок в самом конце", []int{1, 1, 1, 9, 9}, []bool{T, F, T, T, T}, 2, 19},
		{"нули покупателей", []int{0, 0, 0, 0}, []bool{T, F, T, F}, 2, 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := MaxSatisfiedCustomers(tt.customers, tt.grumpy, tt.k); got != tt.want {
				t.Errorf("MaxSatisfiedCustomers(%v, %v, %d) = %d, ожидалось %d",
					tt.customers, tt.grumpy, tt.k, got, tt.want)
			}
		})
	}
}

func TestMinBoats(t *testing.T) {
	tests := []struct {
		name    string
		weights []int
		limit   int
		want    int
	}{
		{"пример 1", []int{3, 2, 2, 1}, 3, 3},
		{"пример 2", []int{3, 5, 3, 4}, 5, 4},
		{"один человек", []int{7}, 7, 1},
		{"двое ровно в предел", []int{2, 3}, 5, 1},
		{"двое на единицу тяжелее", []int{3, 3}, 5, 2},
		{"все лёгкие — по двое", []int{1, 1, 1, 1, 1}, 10, 3},
		{"тяжёлый с лёгким, а не лёгкие вместе", []int{1, 2, 4, 5}, 6, 2},
		{"все тяжёлые — поодиночке", []int{6, 6, 6}, 10, 3},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			in := slices.Clone(tt.weights)
			if got := MinBoats(in, tt.limit); got != tt.want {
				t.Errorf("MinBoats(%v, %d) = %d, ожидалось %d", tt.weights, tt.limit, got, tt.want)
			}
		})
	}
}

func TestBestClosingHour(t *testing.T) {
	tests := []struct {
		name string
		log  string
		want int
	}{
		{"пример", "YYNY", 2},
		{"никого — закрыть сразу", "NNNN", 0},
		{"все часы с покупателями — работать весь день", "YYYY", 4},
		{"один час без покупателей", "N", 0},
		{"один час с покупателями", "Y", 1},
		{"ничья — самый ранний час", "YN", 1},
		{"ничья в начале", "NY", 0},
		{"провал и подъём", "YNNYYYN", 6},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := BestClosingHour(tt.log); got != tt.want {
				t.Errorf("BestClosingHour(%q) = %d, ожидалось %d", tt.log, got, tt.want)
			}
		})
	}
}

func TestCountSteadyPairs(t *testing.T) {
	tests := []struct {
		name string
		nums []int
		want int
	}{
		{"пример: рост на один в день", []int{1, 2, 3}, 3},
		{"пример: одна пара", []int{4, 1, 3, 3}, 1},
		{"пример: стоит на месте", []int{5, 5, 5}, 0},
		{"один день", []int{7}, 0},
		{"пара через несколько дней", []int{10, 0, 0, 13}, 1},
		{"отрицательные показания", []int{-3, -2, -1, 5}, 3},
		{"убывание", []int{3, 2, 1}, 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := CountSteadyPairs(tt.nums); got != tt.want {
				t.Errorf("CountSteadyPairs(%v) = %d, ожидалось %d", tt.nums, got, tt.want)
			}
		})
	}
}

func TestLongestWarmingSpan(t *testing.T) {
	tests := []struct {
		name  string
		temps []int
		want  int
	}{
		{"пример 1", []int{6, 0, 8, 2, 1, 5}, 4},
		{"пример 2", []int{9, 8, 1, 0, 1, 9, 4, 0, 4, 1}, 7},
		{"строгое похолодание", []int{3, 2, 1}, 0},
		{"два равных дня", []int{4, 4}, 1},
		{"два дня, потепление", []int{1, 2}, 1},
		{"весь период — от первого до последнего", []int{1, 9, -5, 1}, 3},
		{"левый конец не первый день", []int{5, 4, 3, 9, 3, 4}, 4},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := LongestWarmingSpan(tt.temps); got != tt.want {
				t.Errorf("LongestWarmingSpan(%v) = %d, ожидалось %d", tt.temps, got, tt.want)
			}
		})
	}
}

func TestMinTimeForTrips(t *testing.T) {
	tests := []struct {
		name     string
		tripTime []int
		total    int
		want     int
	}{
		{"пример 1", []int{1, 2, 3}, 5, 3},
		{"пример 2", []int{2}, 1, 2},
		{"один автобус, много рейсов", []int{3}, 4, 12},
		{"ровно к границе рейса", []int{5, 10}, 3, 10},
		{"граница T−1 не годится", []int{2, 3}, 4, 6},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := MinTimeForTrips(tt.tripTime, tt.total); got != tt.want {
				t.Errorf("MinTimeForTrips(%v, %d) = %d, ожидалось %d", tt.tripTime, tt.total, got, tt.want)
			}
		})
	}
}

func TestTotalBusyTime(t *testing.T) {
	tests := []struct {
		name     string
		sessions [][2]int
		want     int
	}{
		{"пример", [][2]int{{1, 4}, {2, 6}, {8, 10}}, 7},
		{"касаются концами, вразнобой", [][2]int{{5, 7}, {1, 3}, {3, 5}}, 6},
		{"пусто", nil, 0},
		{"один сеанс", [][2]int{{0, 1000000000}}, 1000000000},
		{"вложенный сеанс", [][2]int{{1, 10}, {2, 3}, {4, 5}}, 9},
		{"длинный сеанс раньше короткого по началу", [][2]int{{1, 10}, {2, 3}, {11, 12}}, 10},
		{"одинаковые сеансы", [][2]int{{2, 4}, {2, 4}}, 2},
		{"разрыв в одну единицу", [][2]int{{1, 2}, {3, 4}}, 2},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			in := slices.Clone(tt.sessions)
			if got := TotalBusyTime(in); got != tt.want {
				t.Errorf("TotalBusyTime(%v) = %d, ожидалось %d", tt.sessions, got, tt.want)
			}
		})
	}
}

func TestHIndex(t *testing.T) {
	tests := []struct {
		name      string
		citations []int
		want      int
	}{
		{"пример", []int{3, 0, 6, 1, 5}, 3},
		{"пример: единицы", []int{1, 3, 1}, 1},
		{"одна статья с сотней цитирований", []int{100}, 1},
		{"ни одного цитирования", []int{0, 0}, 0},
		{"все цитирования огромные", []int{1000000000, 1000000000, 1000000000}, 3},
		{"ровно h статей по h", []int{2, 2}, 2},
		{"h меньше числа статей", []int{4, 4, 0, 0}, 2},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			in := slices.Clone(tt.citations)
			if got := HIndex(in); got != tt.want {
				t.Errorf("HIndex(%v) = %d, ожидалось %d", tt.citations, got, tt.want)
			}
		})
	}
}

// g2list строит односвязный список из значений.
func g2list(vals []int) *ListNode {
	dummy := &ListNode{}
	cur := dummy
	for _, v := range vals {
		cur.Next = &ListNode{Val: v}
		cur = cur.Next
	}
	return dummy.Next
}

// g2bst строит сбалансированное дерево поиска из возрастающих значений.
func g2bst(sorted []int) *TreeNode {
	if len(sorted) == 0 {
		return nil
	}
	mid := len(sorted) / 2
	return &TreeNode{Val: sorted[mid], Left: g2bst(sorted[:mid]), Right: g2bst(sorted[mid+1:])}
}

// g2treeString — скобочная запись дерева для сообщений: 1(2, 3), пустой ребёнок — «·».
func g2treeString(n *TreeNode) string {
	if n == nil {
		return "·"
	}
	if n.Left == nil && n.Right == nil {
		return fmt.Sprint(n.Val)
	}
	return fmt.Sprintf("%d(%s, %s)", n.Val, g2treeString(n.Left), g2treeString(n.Right))
}

func TestMaxTwinSum(t *testing.T) {
	tests := []struct {
		name string
		vals []int
		want int
	}{
		{"пример: 5 4 2 1", []int{5, 4, 2, 1}, 6},
		{"пример: 4 2 2 3", []int{4, 2, 2, 3}, 7},
		{"два узла", []int{1, 100000}, 100001},
		{"пустой список", nil, 0},
		{"все отрицательные — ответ меньше нуля", []int{-5, -3, -4, -9}, -7},
		{"лучшая пара в середине", []int{1, 9, 9, 1}, 18},
		{"лучшая пара по краям", []int{9, 1, 1, 9, 1, 9}, 18},
		{"шесть узлов, несимметрично", []int{1, 2, 3, 30, 20, 10}, 33},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := MaxTwinSum(g2list(tt.vals)); got != tt.want {
				t.Errorf("MaxTwinSum(%v) = %d, ожидалось %d", tt.vals, got, tt.want)
			}
		})
	}
}

func TestHeaviestLevel(t *testing.T) {
	chain := &TreeNode{Val: 1, Left: &TreeNode{Val: 2, Right: &TreeNode{Val: 3}}}
	tests := []struct {
		name string
		root *TreeNode
		want int
	}{
		{"пример: 1(7(7, −8), 0)",
			&TreeNode{Val: 1, Left: &TreeNode{Val: 7, Left: &TreeNode{Val: 7}, Right: &TreeNode{Val: -8}}, Right: &TreeNode{Val: 0}}, 2},
		{"пример: 5(−1, −2)", &TreeNode{Val: 5, Left: &TreeNode{Val: -1}, Right: &TreeNode{Val: -2}}, 1},
		{"пустое дерево", nil, 0},
		{"один отрицательный узел", &TreeNode{Val: -7}, 1},
		{"все уровни отрицательные", &TreeNode{Val: -10, Left: &TreeNode{Val: -1}, Right: &TreeNode{Val: -2}}, 2},
		{"ничья — меньший номер", &TreeNode{Val: 3, Left: &TreeNode{Val: 1}, Right: &TreeNode{Val: 2}}, 1},
		{"цепочка — последний уровень", chain, 3},
		{"узлы уровня в разных поддеревьях",
			&TreeNode{Val: 1, Left: &TreeNode{Val: 1, Left: &TreeNode{Val: 4}}, Right: &TreeNode{Val: 1, Right: &TreeNode{Val: 4}}}, 3},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := HeaviestLevel(tt.root); got != tt.want {
				t.Errorf("HeaviestLevel(%s) = %d, ожидалось %d", g2treeString(tt.root), got, tt.want)
			}
		})
	}
}

func TestTimeToNotifyAll(t *testing.T) {
	tests := []struct {
		name       string
		manager    []int
		notifyTime []int
		want       int
	}{
		{"пример: все под директором", []int{2, 2, -1, 2, 2, 2}, []int{0, 0, 1, 0, 0, 0}, 1},
		{"пример: цепочка", []int{1, 2, 3, -1}, []int{0, 4, 2, 1}, 7},
		{"только директор", []int{-1}, []int{5}, 0},
		{"время без подчинённых не считается", []int{-1, 0, 0}, []int{2, 100, 100}, 2},
		{"долгая ветка не самая глубокая", []int{-1, 0, 0, 1, 2, 4}, []int{1, 50, 1, 0, 1, 0}, 51},
		{"директор не первый", []int{3, 3, 0, -1}, []int{6, 0, 0, 2}, 8},
		{"ветка с нулями", []int{-1, 0, 1, 2}, []int{0, 0, 0, 0}, 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := TimeToNotifyAll(tt.manager, tt.notifyTime); got != tt.want {
				t.Errorf("TimeToNotifyAll(%v, %v) = %d, ожидалось %d", tt.manager, tt.notifyTime, got, tt.want)
			}
		})
	}
}

func TestClosestPrices(t *testing.T) {
	small := &TreeNode{Val: 4, Left: &TreeNode{Val: 2, Left: &TreeNode{Val: 1}, Right: &TreeNode{Val: 3}}, Right: &TreeNode{Val: 5}}
	tie := &TreeNode{Val: 10, Left: &TreeNode{Val: 6}, Right: &TreeNode{Val: 14}}
	tests := []struct {
		name    string
		root    *TreeNode
		queries []int
		want    []int
	}{
		{"пример: каталог 4(2(1, 3), 5)", small, []int{3, 6, 0, 10}, []int{3, 5, 1, 5}},
		{"пример: ничья — меньшая", tie, []int{8, 12, 10}, []int{6, 10, 10}},
		{"ничья у корня справа", tie, []int{12}, []int{10}},
		{"ответ — не лист и не корень", g2bst([]int{10, 20, 30, 40, 50, 60, 70}), []int{24, 26, 45, 0, 100}, []int{20, 30, 40, 10, 70}},
		{"ответ — предок, а не узел, где кончился путь", &TreeNode{Val: 10, Right: &TreeNode{Val: 20, Left: &TreeNode{Val: 18}}}, []int{12}, []int{10}},
		{"один узел", &TreeNode{Val: 7}, []int{0, 7, 1000000000}, []int{7, 7, 7}},
		{"нет запросов", small, []int{}, []int{}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ClosestPrices(tt.root, tt.queries)
			if !slices.Equal(got, tt.want) || got == nil {
				t.Errorf("ClosestPrices(%s, %v) = %v, ожидалось %v", g2treeString(tt.root), tt.queries, got, tt.want)
			}
		})
	}
}

func TestFurthestStop(t *testing.T) {
	tests := []struct {
		name          string
		heights       []int
		energy, rides int
		want          int
	}{
		{"пример 1", []int{4, 2, 7, 6, 9, 14, 12}, 5, 1, 4},
		{"пример 2", []int{4, 12, 2, 7, 3, 18, 20, 3, 19}, 10, 2, 7},
		{"пример 3: без попуток", []int{14, 3, 19, 3}, 17, 0, 3},
		{"одна точка", []int{5}, 0, 0, 0},
		{"сразу стена", []int{1, 2}, 0, 0, 0},
		{"энергии ровно впритык", []int{1, 3, 6}, 5, 0, 2},
		{"только спуски", []int{9, 7, 7, 1}, 0, 0, 3},
		{"попутку выгоднее отдать позднему подъёму", []int{1, 2, 12, 13}, 2, 1, 3},
		{"попуток больше, чем подъёмов", []int{1, 100, 1, 100}, 0, 5, 3},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := FurthestStop(tt.heights, tt.energy, tt.rides); got != tt.want {
				t.Errorf("FurthestStop(%v, %d, %d) = %d, ожидалось %d", tt.heights, tt.energy, tt.rides, got, tt.want)
			}
		})
	}
}

func TestCableMovesToConnect(t *testing.T) {
	tests := []struct {
		name   string
		n      int
		cables [][]int
		want   int
	}{
		{"пример 1", 4, [][]int{{0, 1}, {0, 2}, {1, 2}}, 1},
		{"пример 2", 6, [][]int{{0, 1}, {0, 2}, {0, 3}, {1, 2}, {1, 3}}, 2},
		{"пример 3: не хватает", 6, [][]int{{0, 1}, {0, 2}, {0, 3}, {1, 2}}, -1},
		{"один офис", 1, nil, 0},
		{"два офиса без кабелей", 2, nil, -1},
		{"уже связано", 3, [][]int{{0, 1}, {1, 2}}, 0},
		{"ровно n−1 кабель, но цикл", 4, [][]int{{0, 1}, {1, 2}, {2, 0}}, 1},
		{"одиночки и цикл", 5, [][]int{{0, 1}, {1, 2}, {2, 3}, {3, 0}}, 1},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := CableMovesToConnect(tt.n, tt.cables); got != tt.want {
				t.Errorf("CableMovesToConnect(%d, %v) = %d, ожидалось %d", tt.n, tt.cables, got, tt.want)
			}
		})
	}
}

func TestFastestRoutesCount(t *testing.T) {
	tests := []struct {
		name  string
		n     int
		roads [][]int
		want  int
	}{
		{"пример 1", 4, [][]int{{0, 1, 1}, {1, 3, 2}, {0, 2, 2}, {2, 3, 1}, {0, 3, 4}}, 2},
		{"пример 2: дорога записана наоборот", 2, [][]int{{1, 0, 10}}, 1},
		{"один перекрёсток", 1, nil, 1},
		{"не добраться", 3, [][]int{{0, 1, 5}}, 0},
		{"короче по рёбрам — не значит быстрее", 4, [][]int{{0, 3, 10}, {0, 1, 1}, {1, 2, 1}, {2, 3, 1}}, 1},
		{"ромб из ромбов: 2·2", 7, [][]int{{0, 1, 1}, {0, 2, 1}, {1, 3, 1}, {2, 3, 1}, {3, 4, 2}, {3, 5, 1}, {4, 6, 1}, {5, 6, 2}}, 4},
		{"способы копятся через промежуточный узел", 5,
			[][]int{{0, 1, 1}, {0, 2, 1}, {1, 3, 1}, {2, 3, 1}, {0, 3, 2}, {3, 4, 1}}, 3},
		{"большие веса", 3, [][]int{{0, 1, 1000000000}, {1, 2, 1000000000}, {0, 2, 1999999999}}, 1},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := FastestRoutesCount(tt.n, tt.roads); got != tt.want {
				t.Errorf("FastestRoutesCount(%d, %v) = %d, ожидалось %d", tt.n, tt.roads, got, tt.want)
			}
		})
	}
}

func TestMinBuildTime(t *testing.T) {
	tests := []struct {
		name     string
		n        int
		duration []int
		deps     [][]int
		want     int
	}{
		{"пример 1", 3, []int{3, 2, 5}, [][]int{{0, 2}, {1, 2}}, 8},
		{"пример 2", 5, []int{1, 2, 3, 4, 5}, [][]int{{0, 4}, {1, 4}, {2, 4}, {3, 4}}, 9},
		{"пример 3: круг", 2, []int{1, 1}, [][]int{{0, 1}, {1, 0}}, -1},
		{"один модуль", 1, []int{7}, nil, 7},
		{"без зависимостей — самый долгий", 3, []int{4, 9, 2}, nil, 9},
		{"длинная цепочка дешевле одного тяжёлого", 4, []int{1, 1, 1, 10}, [][]int{{0, 1}, {1, 2}}, 10},
		{"повтор зависимости", 2, []int{2, 3}, [][]int{{0, 1}, {0, 1}}, 5},
		{"круг в стороне от остального", 4, []int{1, 1, 1, 1}, [][]int{{0, 1}, {2, 3}, {3, 2}}, -1},
		{"петля на себя", 2, []int{1, 1}, [][]int{{1, 1}}, -1},
		{"ждём самую позднюю зависимость", 4, []int{5, 1, 1, 1}, [][]int{{1, 2}, {0, 3}, {2, 3}}, 6},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := MinBuildTime(tt.n, tt.duration, tt.deps); got != tt.want {
				t.Errorf("MinBuildTime(%d, %v, %v) = %d, ожидалось %d", tt.n, tt.duration, tt.deps, got, tt.want)
			}
		})
	}
}

func TestSplitBetweenOffices(t *testing.T) {
	tests := []struct {
		name  string
		costs [][2]int
		want  int
	}{
		{"пример условия", [][2]int{{10, 20}, {30, 200}, {400, 50}, {30, 20}}, 110},
		{"двое — дешевле ровно по одному в каждый", [][2]int{{5, 5}, {1, 9}}, 6},
		{"всем дешевле A, но половина обязана в B", [][2]int{{1, 100}, {2, 100}, {3, 4}, {5, 7}}, 1 + 2 + 4 + 7},
		{"всем дешевле B", [][2]int{{100, 1}, {100, 2}, {50, 1}, {60, 1}}, 50 + 60 + 1 + 2},
		{"одинаковые цены", [][2]int{{7, 7}, {7, 7}, {7, 7}, {7, 7}}, 28},
		{"дешёвый в A — не самый выгодный перевод", [][2]int{{10, 11}, {50, 100}, {1, 1}, {9, 9}}, 50 + 10 + 1 + 9},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := SplitBetweenOffices(tt.costs); got != tt.want {
				t.Errorf("SplitBetweenOffices(%v) = %d, ожидалось %d", tt.costs, got, tt.want)
			}
		})
	}
}

func TestMinTicketCost(t *testing.T) {
	tests := []struct {
		name  string
		days  []int
		costs [3]int
		want  int
	}{
		{"пример условия", []int{1, 4, 6, 7, 8, 20}, [3]int{2, 7, 15}, 11},
		{"месячный выгоднее", []int{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 30, 31}, [3]int{2, 7, 15}, 17},
		{"одна поездка", []int{100}, [3]int{3, 1, 9}, 1},
		{"недельный покрывает ровно 7 дней", []int{1, 7}, [3]int{5, 6, 100}, 6},
		{"на 8-й день недельный уже не действует", []int{1, 8}, [3]int{5, 6, 100}, 10},
		{"месячный покрывает дни 1…30, но не 31", []int{1, 30, 31}, [3]int{10, 100, 12}, 22},
		{"разовые дешевле", []int{1, 2, 3}, [3]int{1, 7, 30}, 3},
		{"редкие поездки далеко друг от друга", []int{1, 100, 1000000}, [3]int{4, 3, 2}, 6},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := MinTicketCost(tt.days, tt.costs); got != tt.want {
				t.Errorf("MinTicketCost(%v, %v) = %d, ожидалось %d", tt.days, tt.costs, got, tt.want)
			}
		})
	}
}

func TestCanMergeLogs(t *testing.T) {
	tests := []struct {
		name         string
		a, b, merged string
		want         bool
	}{
		{"пример условия — да", "aabcc", "dbbca", "aadbbcbcac", true},
		{"пример условия — нет", "aabcc", "dbbca", "aadbbbaccc", false},
		{"все пустые", "", "", "", true},
		{"один журнал пуст", "", "abc", "abc", true},
		{"один журнал пуст, порядок нарушен", "", "abc", "acb", false},
		{"длина не сходится", "a", "b", "abc", false},
		{"длина не сходится в меньшую сторону", "ab", "c", "ab", false},
		{"жадный выбор из a ошибается", "ab", "ac", "acab", true},
		{"буквы те же, порядок внутри журнала нарушен", "ab", "cd", "bacd", false},
		{"одна буква из обоих", "a", "a", "aa", true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := CanMergeLogs(tt.a, tt.b, tt.merged); got != tt.want {
				t.Errorf("CanMergeLogs(%q, %q, %q) = %v, ожидалось %v", tt.a, tt.b, tt.merged, got, tt.want)
			}
		})
	}
}

func TestMaxOrdersInVan(t *testing.T) {
	tests := []struct {
		name                 string
		orders               [][2]int
		maxWeight, maxVolume int
		want                 int
	}{
		{"пример условия", [][2]int{{1, 4}, {2, 2}, {3, 1}, {4, 4}}, 5, 5, 2},
		{"две пары по-разному", [][2]int{{5, 1}, {1, 5}, {3, 3}, {3, 3}}, 6, 6, 2},
		{"ничего не влезает", [][2]int{{7, 1}}, 5, 5, 0},
		{"лёгкий по весу съедает объём", [][2]int{{1, 10}, {3, 3}, {3, 3}, {3, 4}}, 10, 10, 3},
		{"все влезают", [][2]int{{1, 1}, {2, 2}, {3, 3}}, 6, 6, 3},
		{"ровно в оба лимита", [][2]int{{2, 3}, {3, 2}}, 5, 5, 2},
		{"лимит по объёму решает", [][2]int{{1, 3}, {1, 3}, {1, 3}}, 100, 7, 2},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := MaxOrdersInVan(tt.orders, tt.maxWeight, tt.maxVolume); got != tt.want {
				t.Errorf("MaxOrdersInVan(%v, %d, %d) = %d, ожидалось %d",
					tt.orders, tt.maxWeight, tt.maxVolume, got, tt.want)
			}
		})
	}
}

func TestMaxUniqueParts(t *testing.T) {
	tests := []struct {
		name string
		s    string
		want int
	}{
		{"пример условия", "ababccc", 5},
		{"три буквы", "aba", 2},
		{"две одинаковые", "aa", 1},
		{"одна буква", "z", 1},
		{"все разные", "abcdef", 6},
		{"одна буква много раз", "aaaaaa", 3},                  // a | aa | aaa
		{"второе a не может стоять отдельно", "aab", 2},        // a | ab
		{"первый кусок выгоднее длинным", "aaba", 3},           // aa | b | a
		{"разобранный вариант освобождает куски", "bbabaa", 4}, // bb | a | b | aa
		{"16 одинаковых", "aaaaaaaaaaaaaaaa", 5},               // 1+2+3+4+6
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := MaxUniqueParts(tt.s); got != tt.want {
				t.Errorf("MaxUniqueParts(%q) = %d, ожидалось %d", tt.s, got, tt.want)
			}
		})
	}
}

func TestCountMagnetWords(t *testing.T) {
	tests := []struct {
		name  string
		tiles string
		want  int
	}{
		{"пример условия", "AAB", 8},
		{"один магнит", "V", 1},
		{"все одинаковые", "AAA", 3},
		{"две разные", "AB", 4},
		{"три разные", "ABC", 15},
		{"две пары", "AABB", 18},
		{"повтор в конце строки", "BAA", 8},
		{"длинный набор", "AAABBC", 188},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := CountMagnetWords(tt.tiles); got != tt.want {
				t.Errorf("CountMagnetWords(%q) = %d, ожидалось %d", tt.tiles, got, tt.want)
			}
		})
	}
}

func TestLastInCircle(t *testing.T) {
	tests := []struct {
		name string
		n, k int
		want int
	}{
		{"пример условия", 5, 2, 3},
		{"шесть детей, счёт до пяти", 6, 5, 1},
		{"один ребёнок", 1, 7, 1},
		{"k = 1 — выходят по порядку", 7, 1, 7},
		{"двое, k чётное", 2, 2, 1},
		{"двое, k нечётное", 2, 3, 2},
		{"k больше числа детей", 3, 10, 2},
		{"классика: 41 и 3", 41, 3, 31},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := LastInCircle(tt.n, tt.k); got != tt.want {
				t.Errorf("LastInCircle(%d, %d) = %d, ожидалось %d", tt.n, tt.k, got, tt.want)
			}
		})
	}
}

// g5n — узел дерева для таблиц тестов: g5n(4, g5n(2, nil, nil), nil).
func g5n(v int, l, r *TreeNode) *TreeNode { return &TreeNode{Val: v, Left: l, Right: r} }

// g5leaf — лист.
func g5leaf(v int) *TreeNode { return &TreeNode{Val: v} }

func TestVisibleAhead(t *testing.T) {
	tests := []struct {
		name    string
		heights []int
		want    []int
	}{
		{"пример 1", []int{10, 6, 8, 5, 11, 9}, []int{3, 1, 2, 1, 1, 0}},
		{"пример 2", []int{5, 1, 2, 3, 10}, []int{4, 1, 1, 1, 0}},
		{"один человек", []int{7}, []int{0}},
		{"двое", []int{1, 2}, []int{1, 0}},
		{"рост убывает — каждый видит только соседа", []int{5, 4, 3, 2, 1}, []int{1, 1, 1, 1, 0}},
		{"рост растёт — тоже только соседа", []int{1, 2, 3, 4}, []int{1, 1, 1, 0}},
		{"высокий заслоняет всех за собой", []int{3, 9, 1, 2, 4}, []int{1, 3, 1, 1, 0}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := VisibleAhead(slices.Clone(tt.heights)); !slices.Equal(got, tt.want) {
				t.Errorf("VisibleAhead(%v) = %v, ожидалось %v", tt.heights, got, tt.want)
			}
		})
	}
}

func TestSurvivingRobots(t *testing.T) {
	tests := []struct {
		name   string
		robots []int
		want   []int
	}{
		{"пример: левый разбивается", []int{5, 10, -5}, []int{5, 10}},
		{"пример: равные — оба", []int{8, -8}, []int{}},
		{"пример: цепочка столкновений", []int{10, 2, -5}, []int{10}},
		{"пример: разъезжаются", []int{-2, -1, 1, 2}, []int{-2, -1, 1, 2}},
		{"пусто", []int{}, []int{}},
		{"один", []int{-3}, []int{-3}},
		{"тяжёлый левый сносит всех и уезжает", []int{1, 2, 3, -10, 4}, []int{-10, 4}},
		{"после ничьей следующий едет дальше", []int{2, 5, -5, -1}, []int{2}},
		{"после ничьей стек пуст — уезжает", []int{5, -5, -1}, []int{-1}},
		{"встречаются только едущие навстречу", []int{-5, 5}, []int{-5, 5}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := SurvivingRobots(slices.Clone(tt.robots)); !slices.Equal(got, tt.want) {
				t.Errorf("SurvivingRobots(%v) = %v, ожидалось %v", tt.robots, got, tt.want)
			}
		})
	}
}

func TestStateAfter(t *testing.T) {
	square := func(x int) int { return (x*x + 1) % 10 }
	ring := func(x int) int { return (x + 1) % 7 } // кольцо без хвоста
	tests := []struct {
		name  string
		start int
		next  func(int) int
		k     int
		want  int
	}{
		{"пример: k = 5", 3, square, 5, 6},
		{"пример: k = 0", 3, square, 0, 3},
		{"пример: огромное k", 3, square, 1_000_000_000_000_000_000, 5},
		{"k = 1 — один шаг хвоста", 3, square, 1, 0},
		{"k на входе в кольцо", 3, square, 7, 0},
		{"кольцо без хвоста", 2, ring, 1_000_000_000_000, (2 + 1_000_000_000_000%7) % 7},
		{"неподвижная точка", 4, func(int) int { return 4 }, 1 << 60, 4},
		{"длинный хвост в неподвижную точку", 0, func(x int) int { return min(x+1, 100) }, 1 << 60, 100},
		{"k меньше хвоста", 0, func(x int) int { return min(x+1, 100) }, 42, 42},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := StateAfter(tt.start, tt.next, tt.k); got != tt.want {
				t.Errorf("StateAfter(start=%d, k=%d) = %d, ожидалось %d", tt.start, tt.k, got, tt.want)
			}
		})
	}
}

func TestHasRoundTrip(t *testing.T) {
	tests := []struct {
		name string
		nums []int
		want bool
	}{
		{"пример: цикл вперёд", []int{2, -1, 1, 2, 2}, true},
		{"пример: только петля на себя", []int{-1, -2, -3, -4, -5, 6}, false},
		{"пример: цикл в конце", []int{1, -1, 5, 1, 4}, true},
		{"пример: прыжки в разные стороны", []int{-1, 2}, false},
		{"одна клетка — петля", []int{1}, false},
		{"две клетки навстречу друг другу", []int{1, 1}, true},
		{"назад по кругу", []int{-1, -1, -1}, true},
		{"прыжок через весь круг — петля", []int{3, 3, 3}, false},
		{"туда-обратно не считается", []int{1, -1}, false},
		{"путь упирается в смену направления", []int{1, 1, 1, -1}, false},
		{"цикл из трёх вперёд", []int{1, 1, 2, -1}, true},
		{"тупик не гасит чужой цикл", []int{-2, 1, 1, 1, 4}, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := HasRoundTrip(slices.Clone(tt.nums)); got != tt.want {
				t.Errorf("HasRoundTrip(%v) = %v, ожидалось %v", tt.nums, got, tt.want)
			}
		})
	}
}

func TestCountSplits(t *testing.T) {
	tests := []struct {
		name   string
		ranges [][2]int
		want   int
	}{
		{"пример: одна группа", [][2]int{{6, 10}, {5, 15}}, 2},
		{"пример: две группы вперемешку", [][2]int{{1, 3}, {10, 20}, {2, 5}, {4, 8}}, 4},
		{"пример: соседние дни не пересекаются", [][2]int{{1, 2}, {3, 4}}, 4},
		{"один заказ", [][2]int{{0, 0}}, 2},
		{"общий конец — один день", [][2]int{{1, 3}, {3, 5}}, 2},
		{"вложенный не рвёт группу", [][2]int{{1, 10}, {2, 3}, {5, 6}}, 2},
		{"длинный заказ склеивает дальние", [][2]int{{1, 100}, {50, 60}, {99, 200}, {201, 201}}, 4},
		{"много групп — по модулю", g5disjoint(40), 511620083}, // 2⁴⁰ mod 1e9+7
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := CountSplits(slices.Clone(tt.ranges)); got != tt.want {
				t.Errorf("CountSplits(%v) = %d, ожидалось %d", tt.ranges, got, tt.want)
			}
		})
	}
}

// g5disjoint — n попарно непересекающихся заказов в обратном порядке.
func g5disjoint(n int) [][2]int {
	r := make([][2]int, n)
	for i := range r {
		d := 2 * (n - i)
		r[i] = [2]int{d, d}
	}
	return r
}

func TestFirstCommonSlot(t *testing.T) {
	a := [][2]int{{10, 50}, {60, 120}, {140, 210}}
	b := [][2]int{{0, 15}, {60, 70}}
	tests := []struct {
		name     string
		a, b     [][2]int
		duration int
		want     int
	}{
		{"пример: нашлось", a, b, 8, 60},
		{"пример: не нашлось", a, b, 12, -1},
		{"пример: касаются концами", [][2]int{{0, 5}}, [][2]int{{5, 10}}, 1, -1},
		{"у одного пусто", nil, b, 1, -1},
		{"ровно впритык", [][2]int{{3, 8}}, [][2]int{{0, 8}}, 5, 3},
		{"раннее пересечение короче, позднее подходит", [][2]int{{0, 4}, {20, 40}}, [][2]int{{2, 30}}, 5, 20},
		{"порядок вперемешку", [][2]int{{100, 200}, {0, 10}}, [][2]int{{150, 160}, {5, 9}}, 4, 5},
		{"длинный отрезок покрывает несколько чужих", [][2]int{{0, 100}}, [][2]int{{10, 12}, {20, 30}, {40, 90}}, 9, 20},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := FirstCommonSlot(slices.Clone(tt.a), slices.Clone(tt.b), tt.duration); got != tt.want {
				t.Errorf("FirstCommonSlot(%v, %v, %d) = %d, ожидалось %d", tt.a, tt.b, tt.duration, got, tt.want)
			}
		})
	}
}

func TestKioskSpacing(t *testing.T) {
	tests := []struct {
		name      string
		positions []int
		m         int
		want      int
	}{
		{"пример 1", []int{1, 2, 3, 4, 7}, 3, 3},
		{"пример 2", []int{5, 4, 3, 2, 1, 1000000000}, 2, 999999999},
		{"два места — два киоска", []int{10, 3}, 2, 7},
		{"все места заняты", []int{1, 2, 4, 8}, 4, 1},
		{"неравные промежутки", []int{1, 3, 6, 10, 15}, 3, 5},
		{"вперемешку", []int{9, 1, 5}, 3, 4},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := KioskSpacing(slices.Clone(tt.positions), tt.m); got != tt.want {
				t.Errorf("KioskSpacing(%v, %d) = %d, ожидалось %d", tt.positions, tt.m, got, tt.want)
			}
		})
	}
}

// g5trail — высоты тропы как функция с подсчётом запросов.
func g5trail(h []int, calls *int) func(int) int {
	return func(i int) int {
		*calls++
		return h[i]
	}
}

func TestFindOnTrail(t *testing.T) {
	tests := []struct {
		name   string
		h      []int
		target int
		want   int
	}{
		{"пример: на подъёме раньше, чем на спуске", []int{1, 2, 3, 4, 5, 3, 1}, 3, 2},
		{"пример: нет", []int{0, 1, 2, 4, 2, 1}, 3, -1},
		{"вершина", []int{1, 5, 2}, 5, 1},
		{"только на спуске", []int{1, 3, 7, 6, 2}, 2, 4},
		{"первая точка", []int{4, 6, 5}, 4, 0},
		{"последняя точка", []int{1, 6, 0}, 0, 2},
		{"выше вершины", []int{1, 6, 0}, 7, -1},
		{"ниже всех", []int{3, 6, 4}, 1, -1},
		{"длинный спуск", []int{1, 100, 90, 80, 70, 60, 50, 40}, 60, 5},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			calls := 0
			if got := FindOnTrail(len(tt.h), g5trail(tt.h, &calls), tt.target); got != tt.want {
				t.Errorf("FindOnTrail(%v, %d) = %d, ожидалось %d", tt.h, tt.target, got, tt.want)
			}
		})
	}
}

// g5values — значения дерева в симметричном порядке.
func g5values(n *TreeNode, out []int) []int {
	if n == nil {
		return out
	}
	out = g5values(n.Left, out)
	out = append(out, n.Val)
	return g5values(n.Right, out)
}

func TestPriceBonus(t *testing.T) {
	example := func() *TreeNode {
		return g5n(4, g5n(1, g5leaf(0), g5n(2, nil, g5leaf(3))), g5n(6, g5leaf(5), g5n(7, nil, g5leaf(8))))
	}
	tests := []struct {
		name string
		root func() *TreeNode
		want string
	}{
		{"пример", example, "30(36(36, 35(·, 33)), 21(26, 15(·, 8)))"},
		{"одна цена", func() *TreeNode { return g5leaf(5) }, "5"},
		{"пусто", func() *TreeNode { return nil }, "·"},
		{"цепочка вправо", func() *TreeNode { return g5n(1, nil, g5n(2, nil, g5leaf(3))) }, "6(·, 5(·, 3))"},
		{"цепочка влево", func() *TreeNode { return g5n(3, g5n(2, g5leaf(1), nil), nil) }, "3(5(6, ·), ·)"},
		{"нули", func() *TreeNode { return g5n(1, g5leaf(0), nil) }, "1(1, ·)"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			root := tt.root()
			before := g2treeString(root)
			got := PriceBonus(root)
			if got != root {
				t.Fatalf("PriceBonus(%s) вернула не тот корень", before)
			}
			if s := g2treeString(got); s != tt.want {
				t.Errorf("PriceBonus(%s) = %s, ожидалось %s", before, s, tt.want)
			}
		})
	}
}

func TestMinPriceGap(t *testing.T) {
	tests := []struct {
		name string
		root *TreeNode
		want int
	}{
		{"пример 1", g5n(4, g5n(2, g5leaf(1), g5leaf(3)), g5leaf(6)), 1},
		{"пример 2: соседи не родитель и ребёнок", g5n(236, g5n(104, nil, g5leaf(227)), g5n(701, nil, g5leaf(911))), 9},
		{"две цены", g5n(10, nil, g5leaf(1000000000)), 999999990},
		{"цепочка", g5n(1, nil, g5n(5, nil, g5n(6, nil, g5leaf(20)))), 1},
		{"соседи через корень", g5n(50, g5n(10, nil, g5leaf(48)), g5n(90, g5leaf(53), nil)), 2},
		{"ноль и единица", g5n(1, g5leaf(0), nil), 1},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := MinPriceGap(tt.root); got != tt.want {
				t.Errorf("MinPriceGap(%s) = %d, ожидалось %d", g2treeString(tt.root), got, tt.want)
			}
		})
	}
}

func TestIsFestiveTree(t *testing.T) {
	tests := []struct {
		name string
		root *TreeNode
		want bool
	}{
		{"пример: праздничная", g5n(1, g5n(10, g5n(3, g5leaf(12), g5leaf(8)), nil), g5n(4, g5n(7, g5leaf(6), nil), g5n(9, nil, g5leaf(2)))), true},
		{"пример: повтор на ярусе", g5n(5, g5n(4, g5leaf(3), g5leaf(3)), g5n(2, g5leaf(7), nil)), false},
		{"пусто", nil, true},
		{"один нечётный", g5leaf(1), true},
		{"один чётный", g5leaf(2), false},
		{"нечётный ярус растёт, а должен убывать", g5n(1, g5leaf(2), g5leaf(4)), false},
		{"нечётный ярус убывает", g5n(1, g5leaf(4), g5leaf(2)), true},
		{"равные на нечётном ярусе", g5n(1, g5leaf(4), g5leaf(4)), false},
		{"соседи по ярусу из разных поддеревьев", g5n(1, g5n(8, nil, g5leaf(5)), g5n(6, g5leaf(3), nil)), false},
		{"цепочка с верной чётностью", g5n(1, g5n(2, nil, g5leaf(3)), nil), true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := IsFestiveTree(tt.root); got != tt.want {
				t.Errorf("IsFestiveTree(%s) = %v, ожидалось %v", g2treeString(tt.root), got, tt.want)
			}
		})
	}
}

func TestMinutesToSpread(t *testing.T) {
	example := g5n(1, g5n(5, nil, g5n(4, g5leaf(9), g5leaf(2))), g5n(3, g5leaf(10), g5leaf(6)))
	tests := []struct {
		name  string
		root  *TreeNode
		start int
		want  int
	}{
		{"пример", example, 3, 4},
		{"один сотрудник", g5leaf(1), 1, 0},
		{"от корня — высота", example, 1, 3},
		{"от листа глубоко внизу", example, 9, 5},
		{"цепочка, старт в середине", g5n(1, g5n(2, g5n(3, g5n(4, g5leaf(5), nil), nil), nil), nil), 2, 3},
		{"вверх, потом в соседнюю ветку", g5n(1, g5leaf(2), g5n(3, g5n(4, nil, g5leaf(5)), nil)), 2, 4},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := MinutesToSpread(tt.root, tt.start); got != tt.want {
				t.Errorf("MinutesToSpread(%s, %d) = %d, ожидалось %d", g2treeString(tt.root), tt.start, got, tt.want)
			}
		})
	}
}

func TestLongestWellStockedRun(t *testing.T) {
	tests := []struct {
		name string
		log  string
		k    int
		want int
	}{
		{"пример 1", "aaabb", 3, 3},
		{"пример 2", "ababbc", 2, 5},
		{"пример: годного нет", "abc", 2, 0},
		{"пустой журнал", "", 1, 0},
		{"k = 1 — весь журнал", "abcab", 1, 5},
		{"одна буква, хватает", "aaaa", 4, 4},
		{"одна буква, не хватает", "aaa", 4, 0},
		{"резать дважды", "aabcaabbdbb", 2, 4},
		{"годный только хвост", "abcdaaa", 3, 3},
		{"разрез в глубине", "aaabbbcaaab", 3, 6},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := LongestWellStockedRun(tt.log, tt.k); got != tt.want {
				t.Errorf("LongestWellStockedRun(%q, %d) = %d, ожидалось %d", tt.log, tt.k, got, tt.want)
			}
		})
	}
}

// g4CheckCalm — пустая строка, если a — спокойная перестановка 1…n, иначе причина.
// Проверка за O(n²): для каждой пары концов ищем позицию их среднего.
func g4CheckCalm(a []int, n int) string {
	if len(a) != n {
		return "длина не n"
	}
	pos := make([]int, n+1)
	for i := range pos {
		pos[i] = -1
	}
	for i, x := range a {
		if x < 1 || x > n || pos[x] >= 0 {
			return "не перестановка чисел 1…n"
		}
		pos[x] = i
	}
	for i := 0; i < n; i++ {
		for j := i + 2; j < n; j++ {
			s := a[i] + a[j]
			if s%2 == 0 {
				if m := pos[s/2]; m > i && m < j {
					return "среднее стоит между концами"
				}
			}
		}
	}
	return ""
}

func TestCalmArrangement(t *testing.T) {
	for _, n := range []int{1, 2, 3, 4, 5, 6, 7, 8, 9, 16, 17, 31, 100, 257} {
		got := CalmArrangement(n)
		if why := g4CheckCalm(got, n); why != "" {
			t.Errorf("CalmArrangement(%d) = %v — не спокойная: %s", n, got, why)
		}
	}
}

func TestMatchingRowsAndColumns(t *testing.T) {
	tests := []struct {
		name string
		grid [][]int
		want int
	}{
		{"пример 1", [][]int{{3, 2, 1}, {1, 7, 6}, {2, 7, 7}}, 1},
		{"пример 2", [][]int{{3, 1, 2, 2}, {1, 4, 4, 5}, {2, 4, 2, 2}, {2, 4, 2, 2}}, 3},
		{"одна плитка", [][]int{{5}}, 1},
		{"все одного цвета — каждая пара", [][]int{{1, 1}, {1, 1}}, 4},
		{"симметричная — каждая строка со своим столбцом", [][]int{{1, 2}, {2, 3}}, 2},
		{"ни одного совпадения", [][]int{{1, 2}, {3, 4}}, 0},
		{"числа, которые склеились бы без разделителя", [][]int{{1, 11}, {1, 1}}, 1},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := MatchingRowsAndColumns(tt.grid); got != tt.want {
				t.Errorf("MatchingRowsAndColumns(%v) = %d, ожидалось %d", tt.grid, got, tt.want)
			}
		})
	}
}

func TestFewestCutBricks(t *testing.T) {
	tests := []struct {
		name string
		wall [][]int
		want int
	}{
		{"пример", [][]int{{1, 2, 2, 1}, {3, 1, 2}, {1, 3, 2}, {2, 4}, {3, 1, 2}, {1, 3, 1, 1}}, 2},
		{"пример: швов нет", [][]int{{1}, {1}, {1}}, 3},
		{"один ряд", [][]int{{2, 3, 4}}, 0},
		{"общий шов у всех", [][]int{{1, 1}, {2}, {1, 1}}, 1},
		{"правый край не шов", [][]int{{3}, {1, 2}, {3}}, 2},
		{"широкая стена", [][]int{{1 << 30, 1 << 30}, {1<<31 - 1}}, 1},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := FewestCutBricks(tt.wall); got != tt.want {
				t.Errorf("FewestCutBricks(%v) = %d, ожидалось %d", tt.wall, got, tt.want)
			}
		})
	}
}

// g4list строит список из vals; g4vals читает значения, падая на цикле.
func g4list(vals []int) *ListNode {
	var dummy ListNode
	tail := &dummy
	for _, v := range vals {
		tail.Next = &ListNode{Val: v}
		tail = tail.Next
	}
	return dummy.Next
}

func g4vals(t *testing.T, head *ListNode, limit int) []int {
	t.Helper()
	var out []int
	for n := head; n != nil; n = n.Next {
		if len(out) > limit {
			t.Fatalf("в списке больше %d узлов — похоже на цикл", limit)
		}
		out = append(out, n.Val)
	}
	return out
}

func TestSplitByThreshold(t *testing.T) {
	tests := []struct {
		name string
		vals []int
		x    int
		want []int
	}{
		{"пример 1", []int{1, 4, 3, 2, 5, 2}, 3, []int{1, 2, 2, 4, 3, 5}},
		{"пример 2", []int{2, 1}, 2, []int{1, 2}},
		{"пустая очередь", nil, 0, nil},
		{"один пациент", []int{7}, 3, []int{7}},
		{"все срочные", []int{1, 2, 1}, 5, []int{1, 2, 1}},
		{"никто не срочный", []int{5, 6, 5}, 5, []int{5, 6, 5}},
		{"последний несрочный стоял перед срочным", []int{1, 5, 2}, 3, []int{1, 2, 5}},
		{"отрицательные", []int{3, -1, 0, -5}, 0, []int{-1, -5, 3, 0}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := g4vals(t, SplitByThreshold(g4list(tt.vals), tt.x), len(tt.vals))
			if !slices.Equal(got, tt.want) {
				t.Errorf("SplitByThreshold(%v, %d) = %v, ожидалось %v", tt.vals, tt.x, got, tt.want)
			}
		})
	}
}

func TestDropRepeated(t *testing.T) {
	tests := []struct {
		name string
		vals []int
		want []int
	}{
		{"пример 1", []int{1, 2, 3, 3, 4, 4, 5}, []int{1, 2, 5}},
		{"пример 2: серия в голове", []int{1, 1, 1, 2, 3}, []int{2, 3}},
		{"пример 3: всё убрать", []int{7, 7}, nil},
		{"пустой список", nil, nil},
		{"один заказ", []int{4}, []int{4}},
		{"повторов нет", []int{1, 2, 3}, []int{1, 2, 3}},
		{"серия в хвосте", []int{1, 2, 2}, []int{1}},
		{"серии подряд", []int{1, 1, 2, 2, 3, 4, 4}, []int{3}},
		{"отрицательные", []int{-3, -3, -1, 0, 0}, []int{-1}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := g4vals(t, DropRepeated(g4list(tt.vals)), len(tt.vals))
			if !slices.Equal(got, tt.want) {
				t.Errorf("DropRepeated(%v) = %v, ожидалось %v", tt.vals, got, tt.want)
			}
		})
	}
}

func TestSplitIntoConvoys(t *testing.T) {
	tests := []struct {
		name string
		vals []int
		k    int
		want [][]int
	}{
		{"пример 1", []int{1, 2, 3, 4, 5, 6, 7, 8, 9, 10}, 3, [][]int{{1, 2, 3, 4}, {5, 6, 7}, {8, 9, 10}}},
		{"пример 2: грузовиков меньше k", []int{1, 2, 3}, 5, [][]int{{1}, {2}, {3}, nil, nil}},
		{"пустая колонна", nil, 2, [][]int{nil, nil}},
		{"один конвой", []int{4, 5}, 1, [][]int{{4, 5}}},
		{"поровну", []int{1, 2, 3, 4}, 2, [][]int{{1, 2}, {3, 4}}},
		{"ровно k грузовиков", []int{1, 2, 3}, 3, [][]int{{1}, {2}, {3}}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := SplitIntoConvoys(g4list(tt.vals), tt.k)
			if len(got) != tt.k {
				t.Fatalf("SplitIntoConvoys(%v, %d): %d конвоев, ожидалось %d", tt.vals, tt.k, len(got), tt.k)
			}
			for i, head := range got {
				if part := g4vals(t, head, len(tt.vals)); !slices.Equal(part, tt.want[i]) {
					t.Errorf("SplitIntoConvoys(%v, %d): конвой %d = %v, ожидалось %v", tt.vals, tt.k, i, part, tt.want[i])
				}
			}
		})
	}
}

func TestMinTotalWalk(t *testing.T) {
	tests := []struct {
		name   string
		houses []int
		want   int
	}{
		{"пример 1", []int{1, 2, 3}, 2},
		{"пример 2", []int{1, 10, 2, 9}, 16},
		{"один друг", []int{5}, 0},
		{"общий дом", []int{4, 4, 4}, 0},
		{"двое", []int{-3, 7}, 10},
		{"среднее по значению не помогает", []int{1, 1, 1, 100}, 99},
		{"отрицательные и большие", []int{-1000000000, 1000000000, 0}, 2000000000},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := MinTotalWalk(slices.Clone(tt.houses)); got != tt.want {
				t.Errorf("MinTotalWalk(%v) = %d, ожидалось %d", tt.houses, got, tt.want)
			}
		})
	}
}

func TestMinRaisesToDistinct(t *testing.T) {
	tests := []struct {
		name string
		nums []int
		want int
	}{
		{"пример 1", []int{1, 2, 2}, 1},
		{"пример 2", []int{3, 2, 1, 2, 1, 7}, 6},
		{"один", []int{5}, 0},
		{"пусто", nil, 0},
		{"уже разные", []int{9, 1, 4}, 0},
		{"все одинаковые", []int{0, 0, 0, 0}, 6},
		{"дыру заполнить нельзя — только вверх", []int{5, 5, 0}, 1},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := MinRaisesToDistinct(slices.Clone(tt.nums)); got != tt.want {
				t.Errorf("MinRaisesToDistinct(%v) = %d, ожидалось %d", tt.nums, got, tt.want)
			}
		})
	}
}

func TestMaxEqualAfterBoosts(t *testing.T) {
	tests := []struct {
		name     string
		salaries []int
		budget   int
		want     int
	}{
		{"пример 1", []int{1, 2, 4}, 5, 3},
		{"пример 2", []int{1, 4, 8, 13}, 5, 2},
		{"пример 3", []int{3, 9, 6}, 2, 1},
		{"один", []int{7}, 0, 1},
		{"без бюджета — одинаковые", []int{2, 5, 2, 5, 5}, 0, 3},
		{"бюджет ровно впритык", []int{1, 1, 4}, 6, 3},
		{"на единицу не хватает", []int{1, 1, 4}, 5, 2},
		{"огромный бюджет", []int{1, 100000}, 10000000000, 2},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := MaxEqualAfterBoosts(slices.Clone(tt.salaries), tt.budget); got != tt.want {
				t.Errorf("MaxEqualAfterBoosts(%v, %d) = %d, ожидалось %d", tt.salaries, tt.budget, got, tt.want)
			}
		})
	}
}

func TestMinTakesFromEnds(t *testing.T) {
	tests := []struct {
		name    string
		weights []int
		x       int
		want    int
	}{
		{"пример 1", []int{1, 1, 4, 2, 3}, 5, 2},
		{"пример 2: с обоих концов", []int{3, 2, 20, 1, 1, 3}, 10, 5},
		{"пример 3: нельзя", []int{5, 6, 7, 8, 9}, 4, -1},
		{"снять всё", []int{1, 2, 3}, 6, 3},
		{"больше, чем есть", []int{1, 2, 3}, 7, -1},
		{"одна посылка", []int{4}, 4, 1},
		{"только слева", []int{2, 3, 9, 9}, 5, 2},
		{"середина не снимается", []int{1, 5, 1}, 5, -1},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := MinTakesFromEnds(tt.weights, tt.x); got != tt.want {
				t.Errorf("MinTakesFromEnds(%v, %d) = %d, ожидалось %d", tt.weights, tt.x, got, tt.want)
			}
		})
	}
}

func TestGoodsBetweenDividers(t *testing.T) {
	tests := []struct {
		name    string
		shelf   string
		queries [][2]int
		want    []int
	}{
		{"пример 1", "**|**|***|", [][2]int{{2, 5}, {5, 9}}, []int{2, 3}},
		{"пример 2", "***|**|*****|**||**|*", [][2]int{{1, 17}, {4, 5}, {14, 17}, {5, 11}, {15, 16}}, []int{9, 0, 0, 0, 0}},
		{"перегородок нет", "*****", [][2]int{{0, 4}}, []int{0}},
		{"одна перегородка", "**|**", [][2]int{{0, 4}}, []int{0}},
		{"кусок из одной клетки", "|*|", [][2]int{{1, 1}, {0, 0}}, []int{0, 0}},
		{"весь кусок", "|*|*|", [][2]int{{0, 4}, {1, 3}, {0, 2}}, []int{2, 0, 1}},
		{"товары только снаружи", "*||*", [][2]int{{0, 3}}, []int{0}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := GoodsBetweenDividers(tt.shelf, tt.queries); !slices.Equal(got, tt.want) {
				t.Errorf("GoodsBetweenDividers(%q, %v) = %v, ожидалось %v", tt.shelf, tt.queries, got, tt.want)
			}
		})
	}
}

func TestCountBalancedTeams(t *testing.T) {
	tests := []struct {
		name         string
		skill        []int
		lower, upper int
		want         int
	}{
		{"пример 1", []int{0, 1, 7, 4, 4, 5}, 3, 6, 6},
		{"пример 2", []int{1, 7, 9, 2, 5}, 11, 11, 1},
		{"пример 3: один игрок", []int{5}, 0, 100, 0},
		{"все пары", []int{1, 2, 3}, 0, 100, 3},
		{"дубли", []int{2, 2, 2, 2}, 4, 4, 6},
		{"отрицательные", []int{-5, 5, 0, -1}, -1, 0, 2},
		{"ни одной", []int{1, 2}, 4, 9, 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := CountBalancedTeams(slices.Clone(tt.skill), tt.lower, tt.upper); got != tt.want {
				t.Errorf("CountBalancedTeams(%v, %d, %d) = %d, ожидалось %d", tt.skill, tt.lower, tt.upper, got, tt.want)
			}
		})
	}
}

func TestWidestAffordableGap(t *testing.T) {
	tests := []struct {
		name           string
		offers, prices []int
		want           int
	}{
		{"пример 1", []int{55, 30, 5, 4, 2}, []int{100, 20, 10, 10, 5}, 2},
		{"пример 2", []int{2, 2, 2}, []int{10, 10, 1}, 1},
		{"пример 3", []int{30, 29, 19, 5}, []int{25, 25, 25, 25, 25}, 2},
		{"подходящих нет", []int{9, 8}, []int{1, 1}, 0},
		{"по одному", []int{1}, []int{1}, 0},
		{"второй список короче", []int{5, 1, 1, 1}, []int{9, 9}, 1},
		{"подходит только j < i", []int{5, 1}, []int{9}, 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := WidestAffordableGap(tt.offers, tt.prices); got != tt.want {
				t.Errorf("WidestAffordableGap(%v, %v) = %d, ожидалось %d", tt.offers, tt.prices, got, tt.want)
			}
		})
	}
}

// g6t — короткая запись узла дерева в табличных тестах.
func g6t(v int, l, r *TreeNode) *TreeNode { return &TreeNode{Val: v, Left: l, Right: r} }

func TestMinCrateMoves(t *testing.T) {
	tests := []struct {
		name string
		root *TreeNode
		want int
	}{
		{"пример: всё у корня", g6t(3, nil, nil), 0},
		{"пример: три у корня", g6t(3, g6t(0, nil, nil), g6t(0, nil, nil)), 2},
		{"пример: три у левого ребёнка", g6t(0, g6t(3, nil, nil), g6t(0, nil, nil)), 3},
		{"пустое дерево", nil, 0},
		{"один склад", g6t(1, nil, nil), 0},
		{"уже по одному", g6t(1, g6t(1, nil, nil), g6t(1, nil, nil)), 0},
		{"цепочка: всё внизу", g6t(0, g6t(0, g6t(3, nil, nil), nil), nil), 3},
		{"ящики идут через корень из одного поддерева в другое",
			g6t(1, g6t(0, g6t(0, nil, nil), nil), g6t(4, nil, g6t(0, nil, nil))), 6},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := MinCrateMoves(tt.root); got != tt.want {
				t.Errorf("MinCrateMoves(%s) = %d, ожидалось %d", g2treeString(tt.root), got, tt.want)
			}
		})
	}
}

func TestWidestSalaryGap(t *testing.T) {
	tests := []struct {
		name string
		root *TreeNode
		want int
	}{
		{"пример 1", g6t(8, g6t(3, g6t(1, nil, nil), g6t(6, g6t(4, nil, nil), g6t(7, nil, nil))),
			g6t(10, nil, g6t(14, g6t(13, nil, nil), nil))), 7},
		{"пример 2: цепочка", g6t(1, nil, g6t(2, nil, g6t(0, g6t(3, nil, nil), nil))), 3},
		{"пустое дерево", nil, 0},
		{"один человек", g6t(5, nil, nil), 0},
		{"все одинаковые", g6t(4, g6t(4, nil, nil), g6t(4, nil, nil)), 0},
		{"соседи по уровню — не начальник и подчинённый", g6t(5, g6t(0, nil, nil), g6t(10, nil, nil)), 5},
		{"лучшая пара — не через корень", g6t(5, g6t(4, g6t(100, nil, nil), nil), g6t(6, nil, nil)), 96},
		{"подчинённый богаче", g6t(1, g6t(1000000000, nil, nil), nil), 999999999},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := WidestSalaryGap(tt.root); got != tt.want {
				t.Errorf("WidestSalaryGap(%s) = %d, ожидалось %d", g2treeString(tt.root), got, tt.want)
			}
		})
	}
}

func TestBestTeamScore(t *testing.T) {
	tests := []struct {
		name         string
		skill, speed []int
		k            int
		want         int
	}{
		{"пример 1", []int{1, 3, 3, 2}, []int{2, 1, 3, 4}, 3, 12},
		{"пример 2", []int{4, 2, 3, 1, 1}, []int{7, 5, 10, 9, 6}, 1, 30},
		{"один человек", []int{5}, []int{3}, 1, 15},
		{"все в команде", []int{1, 2, 3}, []int{4, 5, 6}, 3, 24},
		{"нулевая скорость", []int{9, 1}, []int{0, 1}, 1, 1},
		{"умелый, но медленный — всё равно лучше", []int{100, 1, 1}, []int{1, 50, 50}, 2, 101},
		{"одинаковые скорости", []int{2, 2, 2, 2}, []int{3, 3, 3, 3}, 2, 12},
		{"большой ответ", []int{100000, 100000}, []int{100000, 100000}, 2, 20000000000},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := BestTeamScore(slices.Clone(tt.skill), slices.Clone(tt.speed), tt.k); got != tt.want {
				t.Errorf("BestTeamScore(%v, %v, %d) = %d, ожидалось %d", tt.skill, tt.speed, tt.k, got, tt.want)
			}
		})
	}
}

func TestMinWeightGap(t *testing.T) {
	tests := []struct {
		name    string
		weights []int
		want    int
	}{
		{"пример 1", []int{3, 1, 2}, -1},
		{"пример 2", []int{7, 9, 5, 8, 1, 3}, 1},
		{"все одинаковые", []int{4, 4, 4, 4, 4, 4}, 0},
		{"тяжёлые посередине — разницы не избежать", []int{1, 9, 9, 1, 1, 1}, 0},
		{"граница в самом конце", []int{1, 1, 1, 1, 9, 9}, -16},
		{"снимать только справа", []int{1, 2, 10, 20, 30, 40}, -67},
		{"m = 1: снять последнюю", []int{1, 100, 2}, -99},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := MinWeightGap(slices.Clone(tt.weights)); got != tt.want {
				t.Errorf("MinWeightGap(%v) = %d, ожидалось %d", tt.weights, got, tt.want)
			}
		})
	}
}

func TestMinBusiestCourier(t *testing.T) {
	tests := []struct {
		name string
		jobs []int
		k    int
		want int
	}{
		{"пример 1", []int{3, 2, 3}, 3, 3},
		{"пример 2", []int{1, 2, 4, 7, 8}, 2, 11},
		{"пример 3: «самому свободному» ошибается", []int{3, 3, 2, 2, 2}, 2, 6},
		{"один заказ", []int{7}, 1, 7},
		{"один курьер", []int{1, 2, 3}, 1, 6},
		{"курьеров столько же, сколько заказов", []int{5, 1, 9, 2}, 4, 9},
		{"всё упирается в один большой заказ", []int{10, 1, 1, 1}, 3, 10},
		{"ровно поровну на троих", []int{6, 5, 4, 3, 2, 1, 6, 5, 4, 3, 2, 1}, 3, 14},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := MinBusiestCourier(slices.Clone(tt.jobs), tt.k); got != tt.want {
				t.Errorf("MinBusiestCourier(%v, %d) = %d, ожидалось %d", tt.jobs, tt.k, got, tt.want)
			}
		})
	}
}

func TestMinHopsToLast(t *testing.T) {
	tests := []struct {
		name   string
		colors []int
		want   int
	}{
		{"пример 1", []int{100, -23, -23, 404, 100, 23, 23, 23, 3, 404}, 3},
		{"пример 2: одна станция", []int{7}, 0},
		{"пример 3: первая и последняя одного цвета", []int{7, 6, 9, 6, 9, 6, 9, 7}, 1},
		{"две станции", []int{1, 2}, 1},
		{"все разные — только пешком", []int{1, 2, 3, 4, 5}, 4},
		{"шаг назад выгоден", []int{3, 10, 11, 12, 7, 3, 13, 14, 15, 7}, 3},
		{"все одного цвета, кроме последней", []int{5, 5, 5, 5, 5, 6}, 2},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := MinHopsToLast(slices.Clone(tt.colors)); got != tt.want {
				t.Errorf("MinHopsToLast(%v) = %d, ожидалось %d", tt.colors, got, tt.want)
			}
		})
	}
}

func TestCookableDishes(t *testing.T) {
	tests := []struct {
		name        string
		recipes     []string
		ingredients [][]string
		supplies    []string
		want        []string
	}{
		{"пример 1", []string{"хлеб", "бутерброд", "бургер"},
			[][]string{{"дрожжи", "мука"}, {"хлеб", "мясо"}, {"бутерброд", "мясо", "хлеб"}},
			[]string{"дрожжи", "мука", "мясо"}, []string{"хлеб", "бутерброд", "бургер"}},
		{"пример 2: блюда ждут друг друга", []string{"a", "b"}, [][]string{{"b"}, {"a"}}, nil, []string{}},
		{"нет нужного продукта", []string{"суп"}, [][]string{{"вода", "соль"}}, []string{"вода"}, []string{}},
		{"блюдо из одних запасов", []string{"чай"}, [][]string{{"вода"}}, []string{"вода"}, []string{"чай"}},
		{"порядок как в книге, а не как готовятся", []string{"c", "b", "a"},
			[][]string{{"b"}, {"a"}, {"x"}}, []string{"x"}, []string{"c", "b", "a"}},
		{"круг не мешает тем, кто вне его", []string{"a", "b", "c"},
			[][]string{{"b", "x"}, {"a"}, {"x"}}, []string{"x"}, []string{"c"}},
		{"зависит от недоступного блюда", []string{"a", "b"},
			[][]string{{"y"}, {"a", "x"}}, []string{"x"}, []string{}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := CookableDishes(tt.recipes, tt.ingredients, tt.supplies)
			if !slices.Equal(got, tt.want) || got == nil {
				t.Errorf("CookableDishes(%v, %v, %v) = %v, ожидалось %v",
					tt.recipes, tt.ingredients, tt.supplies, got, tt.want)
			}
		})
	}
}

func TestSafeRooms(t *testing.T) {
	tests := []struct {
		name  string
		doors [][]int
		want  []int
	}{
		{"пример 1", [][]int{{1, 2}, {2, 3}, {5}, {0}, {5}, {}, {}}, []int{2, 4, 5, 6}},
		{"пример 2: дверь в саму себя", [][]int{{1}, {1}}, []int{}},
		{"одна комната-выход", [][]int{{}}, []int{0}},
		{"одна комната с дверью в себя", [][]int{{0}}, []int{}},
		{"цепочка к выходу", [][]int{{1}, {2}, {}}, []int{0, 1, 2}},
		{"одна дверь из двух ведёт в круг", [][]int{{1, 2}, {}, {3}, {2}}, []int{1}},
		{"повторные двери", [][]int{{1, 1}, {}}, []int{0, 1}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := SafeRooms(tt.doors)
			if !slices.Equal(got, tt.want) || got == nil {
				t.Errorf("SafeRooms(%v) = %v, ожидалось %v", tt.doors, got, tt.want)
			}
		})
	}
}

func TestEarliestFullBloom(t *testing.T) {
	tests := []struct {
		name        string
		plant, grow []int
		want        int
	}{
		{"пример 1", []int{1, 4, 3}, []int{2, 3, 1}, 9},
		{"пример 2: одно семя", []int{1}, []int{1}, 2},
		{"пример LeetCode 2", []int{1, 2, 3, 2}, []int{2, 1, 2, 1}, 9},
		// «Сначала быстрые посадки» даёт здесь 16.
		{"быстрая посадка — не первая", []int{1, 5}, []int{1, 10}, 15},
		// «Сначала большие plant+grow» и «сначала долгие посадки» дают здесь 16.
		{"долгая посадка — не первая", []int{10, 1}, []int{1, 5}, 12},
		{"одинаковый рост", []int{3, 1, 2}, []int{4, 4, 4}, 10},
		{"долгий рост перекрывает всё", []int{1, 1, 1}, []int{100, 1, 1}, 101},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := EarliestFullBloom(slices.Clone(tt.plant), slices.Clone(tt.grow)); got != tt.want {
				t.Errorf("EarliestFullBloom(%v, %v) = %d, ожидалось %d", tt.plant, tt.grow, got, tt.want)
			}
		})
	}
}

func TestCanSplitIntoRuns(t *testing.T) {
	tests := []struct {
		name string
		nums []int
		want bool
	}{
		{"пример 1", []int{1, 2, 3, 3, 4, 5}, true},
		{"пример 2", []int{1, 2, 3, 3, 4, 4, 5, 5}, true},
		{"пример 3", []int{1, 2, 3, 4, 4, 5}, false},
		{"одна карточка", []int{7}, false},
		{"ровно три подряд", []int{-1, 0, 1}, true},
		{"пропуск в середине", []int{1, 2, 4, 5, 6}, false},
		// Начать новую лесенку с 5 — и шестёрки на неё не хватит.
		{"продлить, а не начинать заново", []int{1, 2, 3, 4, 5, 5, 6, 7}, true},
		{"две одинаковые лесенки", []int{1, 1, 2, 2, 3, 3}, true},
		{"длинная лесенка", []int{10, 11, 12, 13, 14, 15, 16}, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := CanSplitIntoRuns(slices.Clone(tt.nums)); got != tt.want {
				t.Errorf("CanSplitIntoRuns(%v) = %v, ожидалось %v", tt.nums, got, tt.want)
			}
		})
	}
}
