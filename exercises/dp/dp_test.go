package dp

import "testing"

func TestClimbStairs(t *testing.T) {
	tests := []struct {
		n    int
		want int
	}{
		{0, 1}, {1, 1}, {2, 2}, {3, 3}, {4, 5}, {5, 8}, {10, 89},
	}
	for _, tt := range tests {
		if got := ClimbStairs(tt.n); got != tt.want {
			t.Errorf("ClimbStairs(%d) = %d, ожидалось %d", tt.n, got, tt.want)
		}
	}
}

func TestCoinChange(t *testing.T) {
	tests := []struct {
		name   string
		coins  []int
		amount int
		want   int
	}{
		{"11 из 1,2,5", []int{1, 2, 5}, 11, 3},
		{"невозможно", []int{2}, 3, -1},
		{"нулевая сумма", []int{1, 2, 5}, 0, 0},
		{"27 из 2,5,10,1", []int{2, 5, 10, 1}, 27, 4},
		{"одна монета подходит", []int{5}, 5, 1},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := CoinChange(tt.coins, tt.amount); got != tt.want {
				t.Errorf("CoinChange(%v, %d) = %d, ожидалось %d", tt.coins, tt.amount, got, tt.want)
			}
		})
	}
}

func TestLongestCommonSubsequence(t *testing.T) {
	tests := []struct {
		a, b string
		want int
	}{
		{"abcde", "ace", 3},
		{"abc", "abc", 3},
		{"abc", "def", 0},
		{"", "abc", 0},
		{"bl", "yby", 1},
		{"bsbininm", "jmjkbkjkv", 1},
	}
	for _, tt := range tests {
		if got := LongestCommonSubsequence(tt.a, tt.b); got != tt.want {
			t.Errorf("LCS(%q, %q) = %d, ожидалось %d", tt.a, tt.b, got, tt.want)
		}
	}
}

func TestEditDistance(t *testing.T) {
	tests := []struct {
		a, b string
		want int
	}{
		{"horse", "ros", 3},
		{"intention", "execution", 5},
		{"", "abc", 3},
		{"abc", "", 3},
		{"abc", "abc", 0},
	}
	for _, tt := range tests {
		if got := EditDistance(tt.a, tt.b); got != tt.want {
			t.Errorf("EditDistance(%q, %q) = %d, ожидалось %d", tt.a, tt.b, got, tt.want)
		}
	}
}

func TestLongestIncreasingSubsequence(t *testing.T) {
	tests := []struct {
		nums []int
		want int
	}{
		{[]int{10, 9, 2, 5, 3, 7, 101, 18}, 4},
		{[]int{0, 1, 0, 3, 2, 3}, 4},
		{[]int{7, 7, 7, 7}, 1},
		{[]int{}, 0},
		{[]int{5}, 1},
	}
	for _, tt := range tests {
		if got := LongestIncreasingSubsequence(tt.nums); got != tt.want {
			t.Errorf("LIS(%v) = %d, ожидалось %d", tt.nums, got, tt.want)
		}
	}
}

func TestKnapsack01(t *testing.T) {
	tests := []struct {
		name            string
		weights, values []int
		capacity        int
		want            int
	}{
		{"классический", []int{1, 3, 4, 5}, []int{1, 4, 5, 7}, 7, 9},
		{"нулевая вместимость", []int{1, 2}, []int{10, 20}, 0, 0},
		{"всё влезает", []int{1, 2, 3}, []int{6, 10, 12}, 6, 28},
		{"ничего не влезает", []int{5, 6}, []int{10, 20}, 4, 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := Knapsack01(tt.weights, tt.values, tt.capacity); got != tt.want {
				t.Errorf("Knapsack01(%v,%v,%d) = %d, ожидалось %d",
					tt.weights, tt.values, tt.capacity, got, tt.want)
			}
		})
	}
}

func TestHouseRobber(t *testing.T) {
	tests := []struct {
		name string
		nums []int
		want int
	}{
		{"через один", []int{2, 7, 9, 3, 1}, 12},
		{"крайние", []int{2, 1, 1, 2}, 4},
		{"пусто", []int{}, 0},
		{"один дом", []int{5}, 5},
		{"два дома", []int{1, 2}, 2},
		{"все нули", []int{0, 0, 0}, 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := HouseRobber(tt.nums); got != tt.want {
				t.Errorf("HouseRobber(%v) = %d, ожидалось %d", tt.nums, got, tt.want)
			}
		})
	}
}

func TestUniquePaths(t *testing.T) {
	tests := []struct {
		m, n int
		want int
	}{
		{3, 7, 28},
		{3, 2, 3},
		{1, 1, 1},
		{2, 2, 2},
		{7, 3, 28},
		{10, 10, 48620},
	}
	for _, tt := range tests {
		if got := UniquePaths(tt.m, tt.n); got != tt.want {
			t.Errorf("UniquePaths(%d, %d) = %d, ожидалось %d", tt.m, tt.n, got, tt.want)
		}
	}
}

func TestWordBreak(t *testing.T) {
	tests := []struct {
		name string
		s    string
		dict []string
		want bool
	}{
		{"leetcode", "leetcode", []string{"leet", "code"}, true},
		{"повтор слова", "applepenapple", []string{"apple", "pen"}, true},
		{"нельзя разбить", "catsandog", []string{"cats", "dog", "sand", "and", "cat"}, false},
		{"пустая строка", "", []string{"a"}, true},
		{"одно слово", "a", []string{"a"}, true},
		{"нет в словаре", "ab", []string{"c"}, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := WordBreak(tt.s, tt.dict); got != tt.want {
				t.Errorf("WordBreak(%q, %v) = %v, ожидалось %v", tt.s, tt.dict, got, tt.want)
			}
		})
	}
}

func TestDeleteAndEarn(t *testing.T) {
	tests := []struct {
		name string
		nums []int
		want int
	}{
		{"пример: 3,4,2", []int{3, 4, 2}, 6},
		{"три тройки выгоднее", []int{2, 2, 3, 3, 3, 4}, 9},
		{"пустой", nil, 0},
		{"одно число", []int{7}, 7},
		{"все одинаковые", []int{5, 5, 5, 5}, 20},
		{"без соседей — берём всё", []int{1, 3, 5, 7}, 16},
		{"одна большая пятёрка из повторов", []int{1, 1, 1, 2, 4, 5, 5, 5, 6}, 18},
		{"соседи 1 и 2: двойка дороже", []int{1, 2, 2}, 4},
		{"пропуск значения не мешает", []int{1, 2, 4, 5}, 7},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := DeleteAndEarn(tt.nums); got != tt.want {
				t.Errorf("DeleteAndEarn(%v) = %d, ожидалось %d", tt.nums, got, tt.want)
			}
		})
	}
}
