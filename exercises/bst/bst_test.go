package bst

import (
	"reflect"
	"testing"
)

func TestBSTBasic(t *testing.T) {
	tr := NewBST()
	if got := tr.InOrder(); len(got) != 0 {
		t.Fatalf("пустое дерево InOrder() = %v, ожидалось []", got)
	}
	if tr.Search(5) {
		t.Errorf("Search(5) в пустом дереве = true")
	}
	if tr.Delete(5) {
		t.Errorf("Delete(5) в пустом дереве = true")
	}

	for _, v := range []int{5, 3, 8, 1, 4, 7, 9, 3 /*дубликат*/} {
		tr.Insert(v)
	}
	if got, want := tr.InOrder(), []int{1, 3, 4, 5, 7, 8, 9}; !reflect.DeepEqual(got, want) {
		t.Fatalf("InOrder() = %v, ожидалось %v (дубликат 3 не должен повторяться)", got, want)
	}
	if !tr.Search(7) || tr.Search(6) {
		t.Errorf("Search: 7 должен быть найден, 6 — нет")
	}

	// удаление листа
	if !tr.Delete(1) {
		t.Errorf("Delete(1) = false, ожидалось true")
	}
	// удаление узла с одним ребёнком (9 — правый ребёнок 8 без детей-листьев у... )
	if !tr.Delete(9) {
		t.Errorf("Delete(9) = false, ожидалось true")
	}
	// удаление узла с двумя детьми (корень 5)
	if !tr.Delete(5) {
		t.Errorf("Delete(5) = false, ожидалось true")
	}
	if got, want := tr.InOrder(), []int{3, 4, 7, 8}; !reflect.DeepEqual(got, want) {
		t.Fatalf("после удалений InOrder() = %v, ожидалось %v", got, want)
	}
	if tr.Search(5) {
		t.Errorf("после Delete(5) Search(5) = true")
	}
	if tr.Delete(5) {
		t.Errorf("повторный Delete(5) = true, ожидалось false")
	}
}

// nd собирает узел руками: так в тестах строятся и неправильные деревья,
// которые Insert построить не может.
func nd(v int, l, r *Node) *Node { return &Node{Val: v, Left: l, Right: r} }

// leaf — узел без детей.
func leaf(v int) *Node { return &Node{Val: v} }

// buildBST — дерево поиска из значений в порядке вставки (повторы пропускаются).
func buildBST(vals ...int) *Node {
	var root *Node
	for _, v := range vals {
		link := &root
		for *link != nil && (*link).Val != v {
			if v < (*link).Val {
				link = &(*link).Left
			} else {
				link = &(*link).Right
			}
		}
		if *link == nil {
			*link = leaf(v)
		}
	}
	return root
}

func TestIsValidBST(t *testing.T) {
	cases := []struct {
		name string
		root *Node
		want bool
	}{
		{"пустое дерево", nil, true},
		{"один узел", leaf(5), true},
		{"пример: 5(3(2,4),8(7,9))", buildBST(5, 3, 8, 2, 4, 7, 9), true},
		{"правый ребёнок меньше корня: 5(3,4)", nd(5, leaf(3), leaf(4)), false},
		{"левый ребёнок больше корня: 5(6,8)", nd(5, leaf(6), leaf(8)), false},
		{"внук справа нарушает границу деда: 5(3(_,6),8)", nd(5, nd(3, nil, leaf(6)), leaf(8)), false},
		{"внук слева нарушает границу деда: 5(3,8(4,_))", nd(5, leaf(3), nd(8, leaf(4), nil)), false},
		{"правнук нарушает границу прадеда: 10(5(_,7(_,12)),15)", nd(10, nd(5, nil, nd(7, nil, leaf(12))), leaf(15)), false},
		{"повтор слева запрещён: 5(5,_)", nd(5, leaf(5), nil), false},
		{"повтор справа запрещён: 5(_,5)", nd(5, nil, leaf(5)), false},
		{"повтор с дедом: 5(3(_,5),8)", nd(5, nd(3, nil, leaf(5)), leaf(8)), false},
		{"цепочка по возрастанию", buildBST(1, 2, 3, 4, 5), true},
		{"крайние значения", nd(0, leaf(-1000000000), leaf(1000000000)), true},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := IsValidBST(c.root); got != c.want {
				t.Errorf("IsValidBST = %v, ожидалось %v", got, c.want)
			}
		})
	}
}

func TestKthSmallest(t *testing.T) {
	example := buildBST(5, 3, 8, 2, 4, 7, 9)
	cases := []struct {
		name string
		root *Node
		k    int
		want int
	}{
		{"пример, k=1 — минимум", example, 1, 2},
		{"пример, k=4 — корень", example, 4, 5},
		{"пример, k=5 — первый справа от корня", example, 5, 7},
		{"пример, k=7 — максимум", example, 7, 9},
		{"один узел", leaf(42), 1, 42},
		{"левая цепочка, k=2", buildBST(5, 4, 3, 2, 1), 2, 2},
		{"правая цепочка, k=4", buildBST(1, 2, 3, 4, 5), 4, 4},
		{"отрицательные значения", buildBST(0, -5, 5, -7, -3), 2, -5},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := KthSmallest(c.root, c.k); got != c.want {
				t.Errorf("KthSmallest(k=%d) = %d, ожидалось %d", c.k, got, c.want)
			}
		})
	}
}

func TestLowestCommonAncestor(t *testing.T) {
	example := buildBST(6, 2, 8, 0, 4, 7, 9, 3, 5)
	cases := []struct {
		name string
		root *Node
		p, q int
		want int
	}{
		{"по разные стороны корня", example, 2, 8, 6},
		{"оба в левом поддереве", example, 3, 5, 4},
		{"оба слева, разошлись у 2", example, 0, 5, 2},
		{"один — предок другого", example, 2, 4, 2},
		{"предок — корень", example, 6, 3, 6},
		{"p больше q", example, 9, 7, 8},
		{"p == q", example, 5, 5, 5},
		{"один узел", leaf(1), 1, 1, 1},
		{"правая цепочка", buildBST(1, 2, 3, 4, 5), 3, 5, 3},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := LowestCommonAncestor(c.root, c.p, c.q); got != c.want {
				t.Errorf("LowestCommonAncestor(p=%d, q=%d) = %d, ожидалось %d", c.p, c.q, got, c.want)
			}
		})
	}
}
