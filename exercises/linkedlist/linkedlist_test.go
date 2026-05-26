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
