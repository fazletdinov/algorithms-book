package avl

import (
	"math"
	"reflect"
	"testing"
)

func TestAVLBasic(t *testing.T) {
	tr := NewAVL()
	if got := tr.InOrder(); len(got) != 0 {
		t.Fatalf("пустое дерево InOrder() = %v", got)
	}
	if tr.Height() != 0 {
		t.Errorf("пустое дерево Height() = %d, ожидалось 0", tr.Height())
	}

	for _, v := range []int{1, 2, 3, 4, 5, 6, 7, 3 /*дубликат*/} {
		tr.Insert(v)
	}
	if got, want := tr.InOrder(), []int{1, 2, 3, 4, 5, 6, 7}; !reflect.DeepEqual(got, want) {
		t.Fatalf("InOrder() = %v, ожидалось %v", got, want)
	}
	// 7 уникальных ключей, вставленных по возрастанию: обычный BST дал бы высоту 7,
	// сбалансированный AVL — 3 (полное дерево).
	if tr.Height() != 3 {
		t.Errorf("Height() = %d, ожидалось 3 (сбалансировано, а не вырождено)", tr.Height())
	}
	checkBalanced(t, tr.root)
	if !tr.Search(6) || tr.Search(8) {
		t.Errorf("Search: 6 должен быть найден, 8 — нет")
	}
}

// Возрастающая вставка 1..n: высота должна остаться логарифмической, а не n.
func TestAVLStaysBalanced(t *testing.T) {
	tr := NewAVL()
	const n = 1000
	for i := 1; i <= n; i++ {
		tr.Insert(i)
	}
	checkBalanced(t, tr.root)
	bound := int(2*math.Log2(float64(n+1))) + 1
	if tr.Height() > bound {
		t.Fatalf("Height() = %d, ожидалось <= %d (вырождение в список)", tr.Height(), bound)
	}
}

// checkBalanced проверяет инвариант AVL напрямую: у каждого узла высоты
// поддеревьев отличаются не более чем на 1. Возвращает фактическую высоту.
func checkBalanced(t *testing.T, n *node) int {
	t.Helper()
	if n == nil {
		return 0
	}
	lh := checkBalanced(t, n.left)
	rh := checkBalanced(t, n.right)
	if lh-rh > 1 || rh-lh > 1 {
		t.Fatalf("узел %d разбалансирован: высоты поддеревьев %d и %d", n.val, lh, rh)
	}
	if lh > rh {
		return lh + 1
	}
	return rh + 1
}
