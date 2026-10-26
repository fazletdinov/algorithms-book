package treebfs

import (
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
)

// Тесты масштаба — сложность, а не ответ. Перебор, который они ловят: «уровень k
// собери отдельным спуском от корня на глубину k» — на цепочке спуск к уровню k
// проходит k узлов, и все уровни стоят 1 + 2 + … + n = O(n²). Очередь с
// засечкой levelSize проходит каждый узел один раз: O(n).
// Замер 2026-10-26: перебор на цепочке — ~72 с (LevelOrder) и ~68 с (ширина).
// Широкое дерево (все уровни заполнены) — второй худший случай для очереди:
// в ней одновременно до половины узлов. Перебор спуском оно не ловит (уровней
// всего 17, перебор там ~2 мс), зато проверяет ответ на 10⁵ узлах.

const scaleN = 100000

// fullTree — дерево из n узлов, где заполнены все уровни, кроме последнего
// (последний — слева направо): узел i с детьми 2i+1 и 2i+2.
func fullTree(n int) *TreeNode {
	nodes := make([]*TreeNode, n)
	for i := range nodes {
		nodes[i] = &TreeNode{Val: i}
	}
	for i := range nodes {
		if l := 2*i + 1; l < n {
			nodes[i].Left = nodes[l]
		}
		if r := 2*i + 2; r < n {
			nodes[i].Right = nodes[r]
		}
	}
	return nodes[0]
}

func TestLevelOrderScales(t *testing.T) {
	chain, _ := chainLeft(scaleN)
	var got [][]int
	scaletest.Within(t, scaletest.Limit,
		"LevelOrder(левая цепочка, n=100000) — похоже на O(n²) там, где нужен O(n)"+
			" (замер: эталон ~14 мс, спуск к каждому уровню ~72 с)",
		func() { got = LevelOrder(chain) })
	if len(got) != scaleN || got[scaleN-1][0] != scaleN-1 {
		t.Fatalf("LevelOrder(цепочка): уровней %d, ожидалось %d", len(got), scaleN)
	}

	wide := fullTree(scaleN)
	scaletest.Within(t, scaletest.Limit,
		"LevelOrder(заполненное дерево, n=100000) — очередь шире половины узлов"+
			" (замер: эталон ~2 мс)",
		func() { got = LevelOrder(wide) })
	if len(got) != 17 || len(got[16]) != scaleN-(1<<16-1) {
		t.Fatalf("LevelOrder(заполненное дерево): уровней %d, ожидалось 17", len(got))
	}
}

func TestWidthOfBinaryTreeScales(t *testing.T) {
	chain, _ := chainLeft(scaleN)
	var got int
	scaletest.Within(t, scaletest.Limit,
		"WidthOfBinaryTree(левая цепочка, n=100000) — похоже на O(n²) там, где нужен O(n)"+
			" (замер: эталон ~3 мс, спуск к каждому уровню ~68 с)",
		func() { got = WidthOfBinaryTree(chain) })
	if got != 1 {
		t.Fatalf("WidthOfBinaryTree(цепочка) = %d, ожидалось 1", got)
	}

	wide := fullTree(scaleN)
	scaletest.Within(t, scaletest.Limit,
		"WidthOfBinaryTree(заполненное дерево, n=100000) — очередь шире половины узлов"+
			" (замер: эталон ~5 мс)",
		func() { got = WidthOfBinaryTree(wide) })
	// Последний уровень заполнен слева: места 0..(n − (2¹⁶−1) − 1) от первого,
	// а ширина предпоследнего — 2¹⁵; больший из них — нижний.
	if want := scaleN - (1<<16 - 1); got != want {
		t.Fatalf("WidthOfBinaryTree(заполненное дерево) = %d, ожидалось %d", got, want)
	}
}
