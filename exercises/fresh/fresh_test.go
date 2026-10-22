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
