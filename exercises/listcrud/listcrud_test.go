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

func TestRemoveNthFromEnd(t *testing.T) {
	cases := []struct {
		name string
		in   []int
		n    int
		want []int
	}{
		{"пример: второй с конца", []int{1, 2, 3, 4, 5}, 2, []int{1, 2, 3, 5}},
		{"последний", []int{1, 2, 3, 4, 5}, 1, []int{1, 2, 3, 4}},
		{"первый — новая голова", []int{1, 2, 3, 4, 5}, 5, []int{2, 3, 4, 5}},
		{"единственный узел", []int{7}, 1, []int{}},
		{"из двух — первый", []int{1, 2}, 2, []int{2}},
		{"из двух — последний", []int{1, 2}, 1, []int{1}},
		{"повторы: удаляется место, а не значение", []int{4, 4, 4}, 2, []int{4, 4}},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := toSlice(RemoveNthFromEnd(fromSlice(c.in), c.n))
			if !reflect.DeepEqual(got, c.want) {
				t.Errorf("RemoveNthFromEnd(%v, %d) = %v, ожидалось %v", c.in, c.n, got, c.want)
			}
		})
	}
}

// nodeSet — множество узлов списка: ответ слияния обязан состоять из них же.
func nodeSet(lists ...*ListNode) map[*ListNode]bool {
	set := map[*ListNode]bool{}
	for _, head := range lists {
		for n := head; n != nil; n = n.Next {
			set[n] = true
		}
	}
	return set
}

func TestMergeTwoSorted(t *testing.T) {
	cases := []struct {
		name string
		a, b []int
		want []int
	}{
		{"пример", []int{1, 3, 5}, []int{2, 4}, []int{1, 2, 3, 4, 5}},
		{"оба пусты", nil, nil, []int{}},
		{"первый пуст", nil, []int{1, 2}, []int{1, 2}},
		{"второй пуст", []int{1, 2}, nil, []int{1, 2}},
		{"равные значения", []int{1, 1}, []int{1}, []int{1, 1, 1}},
		{"всё из b раньше a", []int{5, 6}, []int{1, 2, 3}, []int{1, 2, 3, 5, 6}},
		{"чередование с хвостом", []int{1, 4, 9, 10}, []int{2, 3}, []int{1, 2, 3, 4, 9, 10}},
		{"отрицательные", []int{-3, 0}, []int{-5, -1, 7}, []int{-5, -3, -1, 0, 7}},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			a, b := fromSlice(c.a), fromSlice(c.b)
			before := nodeSet(a, b)
			res := MergeTwoSorted(a, b)
			if got := toSlice(res); !reflect.DeepEqual(got, c.want) {
				t.Fatalf("MergeTwoSorted(%v, %v) = %v, ожидалось %v", c.a, c.b, got, c.want)
			}
			if after := nodeSet(res); !reflect.DeepEqual(after, before) {
				t.Errorf("MergeTwoSorted(%v, %v): ответ собран не из узлов a и b — новых узлов создавать нельзя, только перецеплять Next", c.a, c.b)
			}
		})
	}
}

// Ничья «сначала из a» видна только по узлам: значения равны, а узлы разные.
func TestMergeTwoSortedTieTakesA(t *testing.T) {
	a, b := fromSlice([]int{1}), fromSlice([]int{1})
	if res := MergeTwoSorted(a, b); res != a || res.Next != b {
		t.Errorf("MergeTwoSorted(1, 1): первым должен идти узел из a, за ним — из b")
	}
}
