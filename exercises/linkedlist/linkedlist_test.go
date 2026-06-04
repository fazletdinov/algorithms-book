package linkedlist

import (
	"reflect"
	"testing"
)

func TestReverseList(t *testing.T) {
	tests := []struct {
		name string
		in   []int
		want []int
	}{
		{"несколько элементов", []int{1, 2, 3, 4, 5}, []int{5, 4, 3, 2, 1}},
		{"два элемента", []int{1, 2}, []int{2, 1}},
		{"один элемент", []int{7}, []int{7}},
		{"пустой список", []int{}, []int{}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := toSlice(ReverseList(fromSlice(tt.in)))
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("ReverseList(%v) -> %v, ожидалось %v", tt.in, got, tt.want)
			}
		})
	}
}

func TestReverseSublist(t *testing.T) {
	tests := []struct {
		name string
		in   []int
		p, q int
		want []int
	}{
		{"середина", []int{1, 2, 3, 4, 5}, 2, 4, []int{1, 4, 3, 2, 5}},
		{"весь список", []int{1, 2, 3, 4, 5}, 1, 5, []int{5, 4, 3, 2, 1}},
		{"с головы", []int{1, 2, 3}, 1, 2, []int{2, 1, 3}},
		{"до хвоста", []int{1, 2, 3}, 2, 3, []int{1, 3, 2}},
		{"p равно q", []int{1, 2, 3}, 2, 2, []int{1, 2, 3}},
		{"один элемент", []int{7}, 1, 1, []int{7}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := toSlice(ReverseSublist(fromSlice(tt.in), tt.p, tt.q))
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("ReverseSublist(%v, %d, %d) -> %v, ожидалось %v", tt.in, tt.p, tt.q, got, tt.want)
			}
		})
	}
}

func TestReverseKGroup(t *testing.T) {
	tests := []struct {
		name string
		in   []int
		k    int
		want []int
	}{
		{"по два", []int{1, 2, 3, 4, 5}, 2, []int{2, 1, 4, 3, 5}},
		{"по три", []int{1, 2, 3, 4, 5}, 3, []int{3, 2, 1, 4, 5}},
		{"кратно k", []int{1, 2, 3, 4}, 2, []int{2, 1, 4, 3}},
		{"k равно длине", []int{1, 2, 3}, 3, []int{3, 2, 1}},
		{"k больше длины", []int{1, 2}, 3, []int{1, 2}},
		{"k равно 1", []int{1, 2, 3}, 1, []int{1, 2, 3}},
		{"пустой список", []int{}, 2, []int{}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := toSlice(ReverseKGroup(fromSlice(tt.in), tt.k))
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("ReverseKGroup(%v, %d) -> %v, ожидалось %v", tt.in, tt.k, got, tt.want)
			}
		})
	}
}

func TestIsPalindrome(t *testing.T) {
	tests := []struct {
		name string
		in   []int
		want bool
	}{
		{"чётный палиндром", []int{1, 2, 2, 1}, true},
		{"нечётный палиндром", []int{1, 2, 3, 2, 1}, true},
		{"не палиндром", []int{1, 2, 3}, false},
		{"пустой список", []int{}, true},
		{"один элемент", []int{1}, true},
		{"два разных", []int{1, 2}, false},
		{"два одинаковых", []int{2, 2}, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := IsPalindrome(fromSlice(tt.in))
			if got != tt.want {
				t.Errorf("IsPalindrome(%v) -> %v, ожидалось %v", tt.in, got, tt.want)
			}
		})
	}
}
