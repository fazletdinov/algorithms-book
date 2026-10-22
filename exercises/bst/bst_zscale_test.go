package bst

import (
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
)

// chain — вырожденное дерево из n узлов: правая цепочка 0 → 1 → … (right) или
// левая n−1 → … → 0. Оба — правильные BST: ответ true обязывает дойти до конца.
func chain(n int, right bool) *Node {
	root := leaf(0)
	if !right {
		root.Val = n - 1
	}
	cur := root
	for i := 1; i < n; i++ {
		if right {
			cur.Right = leaf(i)
			cur = cur.Right
		} else {
			cur.Left = leaf(n - 1 - i)
			cur = cur.Left
		}
	}
	return root
}

// TestIsValidBSTScales — сложность, а не ответ. «Для каждого узла обойди всё
// его поддерево и сравни» на цепочке проходит под каждым узлом весь хвост:
// O(n²). Границы (lo, hi) — один обход, O(n). Две цепочки — против обхода только
// правого поддерева и только левого. Глубина рекурсии — n и у эталона: стек
// горутины в Go растёт, 10⁵ уровней ему по силам.
func TestIsValidBSTScales(t *testing.T) {
	const n = 100000
	for _, c := range []struct {
		name  string
		right bool
	}{{"правая цепочка", true}, {"левая цепочка", false}} {
		t.Run(c.name, func(t *testing.T) {
			root := chain(n, c.right)
			var got bool
			scaletest.Within(t, scaletest.Limit,
				"IsValidBST("+c.name+", n=100000) — похоже на O(n²) там, где нужен O(n)"+
					" (замер: эталон 3–9 мс, обход поддерева под каждым узлом 49–58 с)",
				func() { got = IsValidBST(root) })
			if !got {
				t.Fatalf("IsValidBST(%s) = false, ожидалось true", c.name)
			}
		})
	}
}

// balanced — идеально сбалансированное дерево поиска из значений lo..hi.
func balanced(lo, hi int) *Node {
	if lo > hi {
		return nil
	}
	mid := lo + (hi-lo)/2
	return nd(mid, balanced(lo, mid-1), balanced(mid+1, hi))
}

// TestLowestCommonAncestorScales — сложность, а не ответ. Общий предок в
// ПРОИЗВОЛЬНОМ двоичном дереве ищут обходом всего дерева — O(n) на запрос. В
// дереве поиска порядок ведёт спуск по одному пути — O(h), на сбалансированном
// дереве из 131071 узла это 17 шагов. Запросов много, как в условии.
func TestLowestCommonAncestorScales(t *testing.T) {
	const levels = 17
	const n = 1<<levels - 1
	const queries = 20000
	root := balanced(0, n-1)
	failed, gotAt, got, want := false, 0, 0, 0
	scaletest.Within(t, scaletest.Limit,
		"LowestCommonAncestor: 20000 запросов к сбалансированному дереву из 131071 узла"+
			" — похоже на O(n) на запрос там, где нужен O(h)"+
			" (замер: эталон ~3 мс, обход всего дерева на запрос ~8.7 с)",
		func() {
			for i := 0; i < queries; i++ {
				// Значение v стоит на месте v+1 in-order (счёт с единицы). Узел на
				// чётном месте c — внутренний; его поддерево — места c−b+1 … c+b−1,
				// где b — младший бит c. Крайние места — листья по разные стороны c.
				c := 2 * (1 + i*7919%(n/2))
				b := c & -c
				p, q, w := c-b, c+b-2, c-1 // значения = места − 1
				if v := LowestCommonAncestor(root, p, q); v != w {
					failed, gotAt, got, want = true, i, v, w
					return
				}
			}
		})
	if failed {
		t.Fatalf("запрос %d: LowestCommonAncestor = %d, ожидалось %d", gotAt, got, want)
	}
}
