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
