package rbtree

import (
	"math"
	"reflect"
	"testing"
)

func TestRBBasic(t *testing.T) {
	tr := NewRBTree()
	if got := tr.InOrder(); len(got) != 0 {
		t.Fatalf("пустое дерево InOrder() = %v", got)
	}
	if tr.Search(1) {
		t.Errorf("Search(1) в пустом дереве = true")
	}
	for _, v := range []int{10, 20, 30, 15, 25, 5, 1, 40, 35, 50, 20 /*дубликат*/} {
		tr.Insert(v)
	}
	want := []int{1, 5, 10, 15, 20, 25, 30, 35, 40, 50}
	if got := tr.InOrder(); !reflect.DeepEqual(got, want) {
		t.Fatalf("InOrder() = %v, ожидалось %v", got, want)
	}
	checkRB(t, tr)
	if !tr.Search(35) || tr.Search(99) {
		t.Errorf("Search: 35 должен быть найден, 99 — нет")
	}
}

// Возрастающая вставка 1..n: дерево остаётся сбалансированным (высота O(log n)).
func TestRBStaysBalanced(t *testing.T) {
	tr := NewRBTree()
	const n = 1000
	for i := 1; i <= n; i++ {
		tr.Insert(i)
	}
	checkRB(t, tr)
	if h := treeHeight(tr, tr.root); h > int(2*math.Log2(float64(n+1)))+1 {
		t.Fatalf("высота %d — дерево не сбалансировано", h)
	}
}

func TestRBDelete(t *testing.T) {
	tr := NewRBTree()
	for _, v := range []int{10, 20, 30, 15, 25, 5, 1, 40, 35, 50} {
		tr.Insert(v)
	}
	for _, v := range []int{5, 20, 1, 50, 30} { // лист/внутренний/корень
		tr.Delete(v)
		if tr.Search(v) {
			t.Errorf("после Delete(%d) значение всё ещё находится", v)
		}
		checkRB(t, tr)
	}
	if got, want := tr.InOrder(), []int{10, 15, 25, 35, 40}; !reflect.DeepEqual(got, want) {
		t.Fatalf("после удалений InOrder() = %v, ожидалось %v", got, want)
	}
	tr.Delete(999) // отсутствующего — без изменений
	if got, want := tr.InOrder(), []int{10, 15, 25, 35, 40}; !reflect.DeepEqual(got, want) {
		t.Fatalf("Delete отсутствующего изменил дерево: %v", got)
	}
}

// Массовое удаление — все инварианты красно-чёрного дерева сохраняются.
func TestRBDeleteStress(t *testing.T) {
	tr := NewRBTree()
	const n = 500
	for i := 1; i <= n; i++ {
		tr.Insert(i)
	}
	for i := 1; i <= n; i += 2 { // удаляем нечётные
		tr.Delete(i)
	}
	checkRB(t, tr)
	for i := 1; i <= n; i++ {
		if want := i%2 == 0; tr.Search(i) != want {
			t.Fatalf("Search(%d) = %v, ожидалось %v", i, tr.Search(i), want)
		}
	}
}

// checkRB проверяет инварианты: корень чёрный, нет двух красных подряд, на всех
// путях одинаковое число чёрных узлов (чёрная высота), порядок BST.
func checkRB(t *testing.T, tr *RBTree) {
	t.Helper()
	if tr.root != tr.nilNode && tr.root.red {
		t.Fatal("корень красный")
	}
	var bh func(n *node) int
	bh = func(n *node) int {
		if n == tr.nilNode {
			return 1
		}
		if n.red && (n.left.red || n.right.red) {
			t.Fatalf("красный-красный у %d", n.val)
		}
		l, r := bh(n.left), bh(n.right)
		if l != r {
			t.Fatalf("разная чёрная высота у %d: %d и %d", n.val, l, r)
		}
		if !n.red {
			return l + 1
		}
		return l
	}
	bh(tr.root)
	// порядок BST
	prev := math.MinInt
	var ino func(n *node)
	ino = func(n *node) {
		if n == tr.nilNode {
			return
		}
		ino(n.left)
		if n.val <= prev {
			t.Fatalf("порядок BST нарушен у %d", n.val)
		}
		prev = n.val
		ino(n.right)
	}
	ino(tr.root)
}

func treeHeight(tr *RBTree, n *node) int {
	if n == tr.nilNode {
		return 0
	}
	l, r := treeHeight(tr, n.left), treeHeight(tr, n.right)
	if l > r {
		return l + 1
	}
	return r + 1
}
