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
