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

// leftChain — цепочка из n узлов влево; возвращает корень и два нижних узла.
func leftChain(n int) (root, prev, last *TreeNode) {
	root = &TreeNode{Val: 0}
	last = root
	for i := 1; i < n; i++ {
		prev = last
		last.Left = &TreeNode{Val: i}
		last = last.Left
	}
	return root, prev, last
}

// TestIsBalancedScales — сложность, а не ответ. «Сначала проверь детей, потом
// посчитай их высоты заново» без досрочного выхода проходит под каждым узлом
// всё его поддерево: на цепочке O(n²). Высота с сигналом −1 — один обход, O(n).
//
// Чего тест НЕ ловит, и это не дыра теста, а свойство задачи: перебор «сверху
// вниз» с досрочным выходом (abs(height(l)−height(r)) ≤ 1 && isBalanced(l) &&
// isBalanced(r)) на цепочке отвечает false уже в корне за O(n), а на
// сбалансированном дереве высота — O(log n), и он стоит O(n log n). Для него
// худший вход по оценке — левый хребет, у каждого узла которого справа цепочка
// той же высоты: около n^1.5 ≈ 10⁷ шагов при n = 10⁵, то есть миллисекунды.
// Разрыва класса в пределах условия нет (замер 2026-10-26: на цепочке ~7 мс).
func TestIsBalancedScales(t *testing.T) {
	const n = 100000
	root, _, _ := leftChain(n)
	var got bool
	scaletest.Within(t, scaletest.Limit,
		"IsBalanced(левая цепочка, n=100000) — похоже на O(n²) там, где нужен O(n)"+
			" (замер: эталон ~8 мс, перебор без досрочного выхода ~59 с)",
		func() { got = IsBalanced(root) })
	if got {
		t.Fatalf("IsBalanced(цепочка) = true, ожидалось false")
	}
}

// TestLowestCommonAncestorScales — сложность, а не ответ. «Спускайся туда, где
// лежат оба: для каждого узла поиском проверь, в каком поддереве p и q» на
// цепочке с p и q внизу ищет их заново на каждом уровне: O(n²). Ответ, поднятый
// из поддеревьев за один обход, — O(n).
func TestLowestCommonAncestorScales(t *testing.T) {
	const n = 100000
	root, p, q := leftChain(n)
	var got *TreeNode
	scaletest.Within(t, scaletest.Limit,
		"LowestCommonAncestor(левая цепочка, p и q внизу, n=100000) — похоже на O(n²)"+
			" там, где нужен O(n) (замер: эталон ~7 мс, поиск на каждом уровне ~103 с)",
		func() { got = LowestCommonAncestor(root, p, q) })
	if got != p {
		t.Fatalf("LowestCommonAncestor(цепочка) = %s, ожидался узел %d", nodeName(got), p.Val)
	}
}

// zigzagChain — цепочка из n узлов, которая поворачивает на каждом шаге:
// 0 -> левый 1 -> правый 2 -> левый 3 … Значения различны (номер узла).
func zigzagChain(n int) *TreeNode {
	root := &TreeNode{Val: 0}
	cur := root
	for i := 1; i < n; i++ {
		next := &TreeNode{Val: i}
		if i%2 == 1 {
			cur.Left = next
		} else {
			cur.Right = next
		}
		cur = next
	}
	return root
}

// TestBuildTreeScales — сложность, а не ответ. «Найди корень в inorder
// проходом по своему куску» на цепочке проходит кусок длины n, n−1, … : O(n²).
// Зигзаг ставит корень то в конец куска, то в начало, поэтому проход и слева
// направо, и справа налево одинаково плох. Позиция из map — O(n).
//
// n = 3·10⁵, а не 10⁵: проход по срезу int стоит доли наносекунды на шаг, и
// при 10⁵ перебор укладывался в 0,7 с. Эталон при этом ~80 мс — дороже прочих
// (map на n ключей и стек глубиной n), но до срока остаётся запас в 25 раз.
func TestBuildTreeScales(t *testing.T) {
	const n = 300000
	want := zigzagChain(n)
	pre, in := iterPre(want), iterIn(want)
	var got *TreeNode
	scaletest.Within(t, scaletest.Limit,
		"BuildTree(цепочка-зигзаг, n=300000) — похоже на O(n²) там, где нужен O(n)"+
			" (замер: эталон ~80 мс, поиск корня проходом слева или справа ~6 с)",
		func() { got = BuildTree(pre, in) })
	if !eqInts(iterPre(got), pre) || !eqInts(iterIn(got), in) {
		t.Fatalf("BuildTree(зигзаг, n=%d) построил другое дерево", n)
	}
}

// TestCountPathsWithSumScales — сложность, а не ответ. «Из каждого узла пройди
// вниз и считай суммы» на цепочке проходит n, n−1, … узлов: O(n²). Суммы пути
// от корня в map — один обход, O(n). Цепочка нулей при target = 0: годится
// каждый кусок, ответ n(n+1)/2 известен заранее, а досрочно выйти перебору
// не на чем.
//
// n = 2·10⁵ ради самого быстрого перебора: суммы пути в срезе и проход по
// всему срезу в каждом узле (O(n·h)) при 10⁵ шёл 2,7 с — на грани срока.
// Рекурсивный «из каждого узла вниз» медленнее в десятки раз (~72 с уже при 10⁵).
func TestCountPathsWithSumScales(t *testing.T) {
	const n = 200000
	root, _, _ := leftChain(n)
	for cur := root; cur != nil; cur = cur.Left {
		cur.Val = 0
	}
	var got int
	scaletest.Within(t, scaletest.Limit,
		"CountPathsWithSum(цепочка нулей, n=200000) — похоже на O(n²) там, где нужен O(n)"+
			" (замер: эталон ~20 мс, перебор по срезу сумм пути ~11 с)",
		func() { got = CountPathsWithSum(root, 0) })
	if want := n * (n + 1) / 2; got != want {
		t.Fatalf("CountPathsWithSum(цепочка нулей) = %d, ожидалось %d", got, want)
	}
}
