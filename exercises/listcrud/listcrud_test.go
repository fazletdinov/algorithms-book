package listcrud

import (
	"reflect"
	"testing"
)

func TestInsertAt(t *testing.T) {
	cases := []struct {
		name string
		in   []int
		val  int
		pos  int
		want []int
	}{
		{"в голову", []int{1, 2, 3}, 9, 0, []int{9, 1, 2, 3}},
		{"в середину", []int{1, 2, 3}, 9, 2, []int{1, 2, 9, 3}},
		{"за концом — в хвост", []int{1, 2, 3}, 9, 10, []int{1, 2, 3, 9}},
		{"в пустой", nil, 5, 0, []int{5}},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := toSlice(InsertAt(fromSlice(c.in), c.val, c.pos))
			if !reflect.DeepEqual(got, c.want) {
				t.Errorf("InsertAt(%v, %d, %d) = %v, ожидалось %v", c.in, c.val, c.pos, got, c.want)
			}
		})
	}
}

func TestSearch(t *testing.T) {
	cases := []struct {
		in     []int
		target int
		want   int
	}{
		{[]int{1, 2, 3}, 2, 1},
		{[]int{1, 2, 3}, 1, 0},
		{[]int{1, 2, 3}, 9, -1},
		{nil, 1, -1},
	}
	for _, c := range cases {
		if got := Search(fromSlice(c.in), c.target); got != c.want {
			t.Errorf("Search(%v, %d) = %d, ожидалось %d", c.in, c.target, got, c.want)
		}
	}
}

func TestDeleteVal(t *testing.T) {
	cases := []struct {
		name   string
		in     []int
		target int
		want   []int
	}{
		{"из середины", []int{1, 2, 3, 4}, 3, []int{1, 2, 4}},
		{"голову", []int{1, 2, 3}, 1, []int{2, 3}},
		{"которого нет", []int{1, 2, 3}, 9, []int{1, 2, 3}},
		{"единственный", []int{5}, 5, []int{}},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := toSlice(DeleteVal(fromSlice(c.in), c.target))
			if !reflect.DeepEqual(got, c.want) {
				t.Errorf("DeleteVal(%v, %d) = %v, ожидалось %v", c.in, c.target, got, c.want)
			}
		})
	}
}
