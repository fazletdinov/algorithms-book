package treedfs

import (
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
)

// TestDiameterOfTreeScales — сложность, а не ответ. На левой цепочке
// «посчитай высоты детей заново в каждом узле» проходит всё поддерево под
// каждым узлом: O(n²). Высота из ответов детей за один обход — O(n).
// Глубина рекурсии — n и у эталона; стек горутины в Go растёт, 10⁵ уровней
// ему по силам.
func TestDiameterOfTreeScales(t *testing.T) {
	const n = 100000
	root := &TreeNode{Val: 0}
	cur := root
	for i := 1; i < n; i++ {
		cur.Left = &TreeNode{Val: i}
		cur = cur.Left
	}
	var got int
	scaletest.Within(t, scaletest.Limit,
		"DiameterOfTree(левая цепочка, n=100000) — похоже на O(n²) там, где нужен O(n)"+
			" (замер: эталон ~11 мс, перебор ~59 с)",
		func() { got = DiameterOfTree(root) })
	if got != n-1 {
		t.Fatalf("DiameterOfTree = %d, ожидалось %d", got, n-1)
	}
}
