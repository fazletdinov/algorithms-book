package greedy

import (
	"math"
	"testing"
)

func TestMaxNonOverlapping(t *testing.T) {
	tests := []struct {
		name      string
		intervals [][]int
		want      int
	}{
		{"перекрытие", [][]int{{1, 3}, {2, 4}, {3, 5}}, 2},
		{"все подряд", [][]int{{1, 2}, {2, 3}, {3, 4}}, 3},
		{"длинный мешает", [][]int{{1, 5}, {2, 3}, {3, 4}}, 2},
		{"пусто", [][]int{}, 0},
		{"один", [][]int{{1, 10}}, 1},
		{"полное перекрытие", [][]int{{1, 4}, {2, 4}, {1, 4}}, 1},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := MaxNonOverlapping(tt.intervals); got != tt.want {
				t.Errorf("MaxNonOverlapping(%v) = %d, ожидалось %d", tt.intervals, got, tt.want)
			}
		})
	}
}

func TestCanJump(t *testing.T) {
	tests := []struct {
		name string
		nums []int
		want bool
	}{
		{"можно", []int{2, 3, 1, 1, 4}, true},
		{"нельзя (застряли на 0)", []int{3, 2, 1, 0, 4}, false},
		{"один элемент", []int{0}, true},
		{"прыжок через нули", []int{2, 0, 0}, true},
		{"застряли", []int{1, 0, 1, 0}, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := CanJump(tt.nums); got != tt.want {
				t.Errorf("CanJump(%v) = %v, ожидалось %v", tt.nums, got, tt.want)
			}
		})
	}
}

func TestMinJumps(t *testing.T) {
	tests := []struct {
		name string
		nums []int
		want int
	}{
		{"два прыжка", []int{2, 3, 1, 1, 4}, 2},
		{"один прыжок", []int{2, 1}, 1},
		{"уже на месте", []int{0}, 0},
		{"длинный первый прыжок", []int{1, 1, 1, 1}, 3},
		{"перепрыгнуть всё", []int{5, 1, 1, 1, 1}, 1},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := MinJumps(tt.nums); got != tt.want {
				t.Errorf("MinJumps(%v) = %d, ожидалось %d", tt.nums, got, tt.want)
			}
		})
	}
}

func TestMaxProfit(t *testing.T) {
	tests := []struct {
		name   string
		prices []int
		want   int
	}{
		{"колебания", []int{7, 1, 5, 3, 6, 4}, 7},
		{"монотонный рост", []int{1, 2, 3, 4, 5}, 4},
		{"монотонное падение", []int{7, 6, 4, 3, 1}, 0},
		{"один день", []int{5}, 0},
		{"пусто", []int{}, 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := MaxProfit(tt.prices); got != tt.want {
				t.Errorf("MaxProfit(%v) = %d, ожидалось %d", tt.prices, got, tt.want)
			}
		})
	}
}

func TestFractionalKnapsack(t *testing.T) {
	const eps = 1e-9
	tests := []struct {
		name     string
		values   []int
		weights  []int
		capacity int
		want     float64
	}{
		{"классика", []int{60, 100, 120}, []int{10, 20, 30}, 50, 240.0},
		{"нулевая вместимость", []int{60, 100, 120}, []int{10, 20, 30}, 0, 0.0},
		{"всё влезает", []int{10, 20}, []int{1, 2}, 10, 30.0},
		{"только дробная часть", []int{100}, []int{50}, 25, 50.0},
		{"пусто", []int{}, []int{}, 10, 0.0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := FractionalKnapsack(tt.values, tt.weights, tt.capacity)
			if math.Abs(got-tt.want) > eps {
				t.Errorf("FractionalKnapsack(%v, %v, %d) = %v, ожидалось %v",
					tt.values, tt.weights, tt.capacity, got, tt.want)
			}
		})
	}
}

// sameInts сравнивает по длине и элементам: nil и пустой срез равны.
func sameInts(a, b []int) bool {
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

func TestPartitionLabels(t *testing.T) {
	tests := []struct {
		name string
		s    string
		want []int
	}{
		{"пример LeetCode", "ababcbacadefegdehijhklij", []int{9, 7, 8}},
		{"пример главы", "abaccd", []int{3, 2, 1}},
		{"пусто", "", []int{}},
		{"одна буква", "z", []int{1}},
		{"все разные", "abc", []int{1, 1, 1}},
		{"первая буква в конце — один кусок", "abcda", []int{5}},
		{"повтор подряд", "aaabb", []int{3, 2}},
		{"конец тянет поздняя буква внутри", "abacbd", []int{5, 1}},
		{"вложенные куски", "eccbbbbdec", []int{10}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := PartitionLabels(tt.s); !sameInts(got, tt.want) {
				t.Errorf("PartitionLabels(%q) = %v, ожидалось %v", tt.s, got, tt.want)
			}
		})
	}
}

func TestCanCompleteCircuit(t *testing.T) {
	tests := []struct {
		name      string
		gas, cost []int
		want      int
	}{
		{"пример LeetCode", []int{1, 2, 3, 4, 5}, []int{3, 4, 5, 1, 2}, 3},
		{"бензина не хватает", []int{2, 3, 4}, []int{3, 4, 3}, -1},
		{"одна станция, хватает", []int{5}, []int{4}, 0},
		{"одна станция, не хватает", []int{1}, []int{2}, -1},
		{"старт с нулевой станции", []int{3, 1, 1}, []int{1, 2, 2}, 0},
		{"старт с последней станции", []int{1, 1, 4}, []int{2, 2, 1}, 2},
		{"впритык: total = 0, ответ в середине", []int{0, 3, 0}, []int{2, 0, 1}, 1},
		{"два провала до ответа", []int{1, 1, 1, 5}, []int{2, 2, 2, 2}, 3},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := CanCompleteCircuit(tt.gas, tt.cost); got != tt.want {
				t.Errorf("CanCompleteCircuit(%v, %v) = %d, ожидалось %d", tt.gas, tt.cost, got, tt.want)
			}
		})
	}
}

func TestLeastInterval(t *testing.T) {
	tests := []struct {
		name  string
		tasks string
		n     int
		want  int
	}{
		{"две частые, кулдаун 2", "AAABBB", 2, 8},
		{"без кулдауна", "AAABBB", 0, 6},
		{"пример главы", "AAABBC", 2, 7},
		{"одна задача много раз", "AAAA", 3, 13},
		{"задач больше, чем мест в каркасе", "AAABBBCCCDDE", 2, 12},
		{"одна задача", "A", 5, 1},
		{"все разные", "ABCDEF", 10, 6},
		{"пусто", "", 2, 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := LeastInterval([]byte(tt.tasks), tt.n); got != tt.want {
				t.Errorf("LeastInterval(%q, %d) = %d, ожидалось %d", tt.tasks, tt.n, got, tt.want)
			}
		})
	}
}

func TestJobScheduling(t *testing.T) {
	tests := []struct {
		name                     string
		startTime, endTime, prof []int
		want                     int
	}{
		{"пример LeetCode 1", []int{1, 2, 3, 3}, []int{3, 4, 5, 6}, []int{50, 10, 40, 70}, 120},
		{"пример LeetCode 2", []int{1, 2, 3, 4, 6}, []int{3, 5, 10, 6, 9}, []int{20, 20, 100, 70, 60}, 150},
		{"пример LeetCode 3", []int{1, 1, 1}, []int{2, 3, 4}, []int{5, 6, 4}, 6},
		{"пусто", []int{}, []int{}, []int{}, 0},
		{"одна заявка", []int{2}, []int{7}, []int{9}, 9},
		{"касание в точке — обе", []int{1, 3}, []int{3, 5}, []int{4, 6}, 10},
		{"ранний конец берёт дешёвую короткую", []int{1, 2}, []int{3, 10}, []int{1, 100}, 100},
		{"самая дорогая заслоняет две", []int{1, 1, 5}, []int{10, 5, 10}, []int{10, 6, 6}, 12},
		{"дорогой час — не дорогая заявка", []int{1, 1}, []int{2, 10}, []int{3, 20}, 20},
		{"одинаковые заявки — одна", []int{1, 1}, []int{4, 4}, []int{5, 5}, 5},
		{"заявки не по порядку", []int{6, 1, 3}, []int{9, 3, 6}, []int{2, 2, 2}, 6},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := JobScheduling(tt.startTime, tt.endTime, tt.prof); got != tt.want {
				t.Errorf("JobScheduling(%v, %v, %v) = %d, ожидалось %d", tt.startTime, tt.endTime, tt.prof, got, tt.want)
			}
		})
	}
}
