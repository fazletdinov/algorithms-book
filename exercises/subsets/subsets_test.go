package subsets

import (
	"reflect"
	"sort"
	"testing"
)

// sortSubsets приводит список подмножеств к каноническому порядку, чтобы
// сравнивать результаты независимо от порядка их генерации. Сначала сортируем
// элементы внутри каждого подмножества, затем сами подмножества.
func sortSubsets(p [][]int) {
	for _, s := range p {
		sort.Ints(s)
	}
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

func TestSubsets(t *testing.T) {
	tests := []struct {
		name string
		nums []int
		want [][]int
	}{
		{"три элемента", []int{1, 2, 3}, [][]int{
			{}, {1}, {2}, {3}, {1, 2}, {1, 3}, {2, 3}, {1, 2, 3},
		}},
		{"пустой ввод", []int{}, [][]int{{}}},
		{"один элемент", []int{1}, [][]int{{}, {1}}},
		{"два элемента", []int{1, 2}, [][]int{{}, {1}, {2}, {1, 2}}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := Subsets(tt.nums)
			sortSubsets(got)
			sortSubsets(tt.want)
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("Subsets(%v) = %v, ожидалось %v", tt.nums, got, tt.want)
			}
		})
	}
}

func TestCombinations(t *testing.T) {
	tests := []struct {
		name string
		n    int
		k    int
		want [][]int
	}{
		{"n=4 k=2", 4, 2, [][]int{
			{1, 2}, {1, 3}, {1, 4}, {2, 3}, {2, 4}, {3, 4},
		}},
		{"n=1 k=1", 1, 1, [][]int{{1}}},
		{"k=0", 4, 0, [][]int{{}}},
		{"n=k", 3, 3, [][]int{{1, 2, 3}}},
		{"n=3 k=2", 3, 2, [][]int{{1, 2}, {1, 3}, {2, 3}}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := Combinations(tt.n, tt.k)
			sortSubsets(got)
			sortSubsets(tt.want)
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("Combinations(%d, %d) = %v, ожидалось %v", tt.n, tt.k, got, tt.want)
			}
		})
	}
}

func TestLetterCasePermutation(t *testing.T) {
	tests := []struct {
		name string
		s    string
		want []string
	}{
		{"a1b", "a1b", []string{"a1b", "a1B", "A1b", "A1B"}},
		{"только цифры", "12", []string{"12"}},
		{"пустая строка", "", []string{""}},
		{"одна буква", "a", []string{"a", "A"}},
		{"верхний регистр на входе", "C", []string{"c", "C"}},
		{"смешанная", "Ab", []string{"ab", "aB", "Ab", "AB"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := LetterCasePermutation(tt.s)
			sort.Strings(got)
			sort.Strings(tt.want)
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("LetterCasePermutation(%q) = %v, ожидалось %v", tt.s, got, tt.want)
			}
		})
	}
}

func TestSubsetsWithDup(t *testing.T) {
	tests := []struct {
		name string
		nums []int
		want [][]int
	}{
		{"дубликаты [1,2,2]", []int{1, 2, 2}, [][]int{
			{}, {1}, {2}, {1, 2}, {2, 2}, {1, 2, 2},
		}},
		{"без дубликатов", []int{1, 2, 3}, [][]int{
			{}, {1}, {2}, {3}, {1, 2}, {1, 3}, {2, 3}, {1, 2, 3},
		}},
		{"пустой ввод", []int{}, [][]int{{}}},
		{"один элемент", []int{1}, [][]int{{}, {1}}},
		{"все одинаковые", []int{2, 2, 2}, [][]int{
			{}, {2}, {2, 2}, {2, 2, 2},
		}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := SubsetsWithDup(tt.nums)
			sortSubsets(got)
			sortSubsets(tt.want)
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("SubsetsWithDup(%v) = %v, ожидалось %v", tt.nums, got, tt.want)
			}
		})
	}
}
