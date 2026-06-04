package backtracking

import (
	"reflect"
	"sort"
	"testing"
)

// sortPerms приводит список перестановок к каноническому порядку,
// чтобы сравнивать результаты независимо от порядка их генерации.
func sortPerms(p [][]int) {
	sort.Slice(p, func(i, j int) bool {
		a, b := p[i], p[j]
		for k := 0; k < len(a) && k < len(b); k++ {
			if a[k] != b[k] {
				return a[k] < b[k]
			}
		}
		return len(a) < len(b)
	})
}

func TestPermutations(t *testing.T) {
	tests := []struct {
		name string
		nums []int
		want [][]int
	}{
		{"три элемента", []int{1, 2, 3}, [][]int{
			{1, 2, 3}, {1, 3, 2}, {2, 1, 3}, {2, 3, 1}, {3, 1, 2}, {3, 2, 1},
		}},
		{"один элемент", []int{1}, [][]int{{1}}},
		{"два элемента", []int{1, 2}, [][]int{{1, 2}, {2, 1}}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := Permutations(tt.nums)
			sortPerms(got)
			sortPerms(tt.want)
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("Permutations(%v) = %v, ожидалось %v", tt.nums, got, tt.want)
			}
		})
	}
}

func TestGenerateParentheses(t *testing.T) {
	tests := []struct {
		name string
		n    int
		want []string
	}{
		{"одна пара", 1, []string{"()"}},
		{"две пары", 2, []string{"(())", "()()"}},
		{"три пары", 3, []string{"((()))", "(()())", "(())()", "()(())", "()()()"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := GenerateParentheses(tt.n)
			sort.Strings(got)
			sort.Strings(tt.want)
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("GenerateParentheses(%d) = %v, ожидалось %v", tt.n, got, tt.want)
			}
		})
	}
}

func TestCombinationSum(t *testing.T) {
	tests := []struct {
		name       string
		candidates []int
		target     int
		want       [][]int
	}{
		{"target 7", []int{2, 3, 6, 7}, 7, [][]int{{2, 2, 3}, {7}}},
		{"target 8", []int{2, 3, 7}, 8, [][]int{{2, 2, 2, 2}, {2, 3, 3}}},
		{"один кандидат", []int{2}, 1, [][]int{}},
		{"одно число", []int{5}, 5, [][]int{{5}}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := CombinationSum(tt.candidates, tt.target)
			sortPerms(got)
			sortPerms(tt.want)
			if len(got) == 0 && len(tt.want) == 0 {
				return
			}
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("CombinationSum(%v, %d) = %v, ожидалось %v", tt.candidates, tt.target, got, tt.want)
			}
		})
	}
}

func TestSolveNQueensCount(t *testing.T) {
	tests := []struct {
		name string
		n    int
		want int
	}{
		{"один ферзь", 1, 1},
		{"два ферзя", 2, 0},
		{"три ферзя", 3, 0},
		{"четыре ферзя", 4, 2},
		{"восемь ферзей", 8, 92},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := SolveNQueensCount(tt.n)
			if got != tt.want {
				t.Errorf("SolveNQueensCount(%d) = %d, ожидалось %d", tt.n, got, tt.want)
			}
		})
	}
}

func TestLetterCombinations(t *testing.T) {
	tests := []struct {
		name   string
		digits string
		want   []string
	}{
		{"две цифры", "23", []string{"ad", "ae", "af", "bd", "be", "bf", "cd", "ce", "cf"}},
		{"пустая строка", "", []string{}},
		{"одна цифра", "9", []string{"w", "x", "y", "z"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := LetterCombinations(tt.digits)
			sort.Strings(got)
			sort.Strings(tt.want)
			if len(got) == 0 && len(tt.want) == 0 {
				return
			}
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("LetterCombinations(%q) = %v, ожидалось %v", tt.digits, got, tt.want)
			}
		})
	}
}
