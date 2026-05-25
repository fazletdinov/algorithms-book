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
