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
