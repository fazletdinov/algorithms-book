package btree

import (
	"reflect"
	"testing"
)

func TestBTreeBasic(t *testing.T) {
	bt := NewBTree(2) // степень 2: до 3 ключей в узле
	if got := bt.InOrder(); len(got) != 0 {
		t.Fatalf("пустое дерево InOrder() = %v", got)
	}
	if bt.Search(1) {
		t.Errorf("Search(1) в пустом дереве = true")
	}

	for _, v := range []int{10, 20, 5, 6, 12, 30, 7, 17, 5 /*дубликат*/} {
		bt.Insert(v)
	}
	want := []int{5, 6, 7, 10, 12, 17, 20, 30}
	if got := bt.InOrder(); !reflect.DeepEqual(got, want) {
		t.Fatalf("InOrder() = %v, ожидалось %v", got, want)
	}
	for _, v := range want {
		if !bt.Search(v) {
			t.Errorf("Search(%d) = false, ожидалось true", v)
		}
	}
	if bt.Search(99) {
		t.Errorf("Search(99) = true, ожидалось false")
	}
}

func TestBTreeDelete(t *testing.T) {
	bt := NewBTree(2)
	for _, v := range []int{1, 2, 3, 4, 5, 6, 7, 8, 9, 10} {
		bt.Insert(v)
	}
	// удаляем из листа, изнутри (через слияние/заимствование), корень
	for _, v := range []int{4, 1, 7, 10, 5} {
		bt.Delete(v)
		if bt.Search(v) {
			t.Errorf("после Delete(%d) ключ всё ещё находится", v)
		}
		checkBTree(t, bt)
	}
	if got, want := bt.InOrder(), []int{2, 3, 6, 8, 9}; !reflect.DeepEqual(got, want) {
		t.Fatalf("после удалений InOrder() = %v, ожидалось %v", got, want)
	}
	bt.Delete(999) // отсутствующего — без изменений и без паники
	if got, want := bt.InOrder(), []int{2, 3, 6, 8, 9}; !reflect.DeepEqual(got, want) {
		t.Fatalf("Delete отсутствующего изменил дерево: %v", got)
	}
}

// Массовое удаление при разных степенях — дерево остаётся валидным B-деревом.
func TestBTreeDeleteStress(t *testing.T) {
	for _, deg := range []int{2, 3, 4} {
		bt := NewBTree(deg)
		const n = 300
		for i := range n {
			bt.Insert(i)
		}
		for i := 0; i < n; i += 2 { // удаляем чётные
			bt.Delete(i)
		}
		checkBTree(t, bt)
		for i := range n {
			if want := i%2 == 1; bt.Search(i) != want {
				t.Fatalf("степень %d: Search(%d) = %v, ожидалось %v", deg, i, bt.Search(i), want)
			}
		}
	}
}

// checkBTree проверяет инварианты B-дерева: все листья на одной глубине, число
// ключей в узле в [t-1, 2t-1] (у корня >= 1), ключи отсортированы, детей = ключей+1.
func checkBTree(t *testing.T, bt *BTree) {
	t.Helper()
	leafDepth := -1
	var rec func(n *node, depth int, isRoot bool)
	rec = func(n *node, depth int, isRoot bool) {
		if len(n.keys) > 2*bt.t-1 {
			t.Fatalf("узел %v: слишком много ключей", n.keys)
		}
		if !isRoot && len(n.keys) < bt.t-1 {
			t.Fatalf("узел %v: меньше t-1=%d ключей", n.keys, bt.t-1)
		}
		for i := 1; i < len(n.keys); i++ {
			if n.keys[i] <= n.keys[i-1] {
				t.Fatalf("узел %v: ключи не отсортированы", n.keys)
			}
		}
		if n.leaf {
			if leafDepth == -1 {
				leafDepth = depth
			} else if depth != leafDepth {
				t.Fatalf("листья на разной глубине: %d и %d", leafDepth, depth)
			}
			return
		}
		if len(n.children) != len(n.keys)+1 {
			t.Fatalf("узел %v: детей %d, ожидалось ключей+1=%d", n.keys, len(n.children), len(n.keys)+1)
		}
		for _, c := range n.children {
			rec(c, depth+1, false)
		}
	}
	rec(bt.root, 0, true)
}

// Возрастающая вставка многократно делит корень — проверяем, что порядок цел.
func TestBTreeSplits(t *testing.T) {
	bt := NewBTree(3)
	const n = 500
	for i := range n {
		bt.Insert(i)
	}
	want := make([]int, n)
	for i := range want {
		want[i] = i
	}
	if got := bt.InOrder(); !reflect.DeepEqual(got, want) {
		t.Fatalf("после %d вставок InOrder неверен (len got=%d)", n, len(bt.InOrder()))
	}
}
