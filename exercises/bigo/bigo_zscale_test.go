package bigo

import (
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
)

// nearlyDecreasing — убывающий ряд n−1, n−2, …, 1 и в самом конце n: у каждого
// элемента ближайший больший — последний. Поиск вправо до первого большего
// проходит весь хвост: Σ(n−i) = O(n²). Подсказка «правее никого больше нет —
// сразу −1» (суффиксный максимум) не спасает: больший справа есть у всех.
func nearlyDecreasing(n int) []int {
	a := make([]int, n)
	for i := 0; i < n-1; i++ {
		a[i] = n - 1 - i
	}
	a[n-1] = n
	return a
}

// TestNextGreaterElementScales — сложность, а не ответ. Монотонный стек — O(n).
func TestNextGreaterElementScales(t *testing.T) {
	const n = 300000
	nums := nearlyDecreasing(n)
	var got []int
	scaletest.Within(t, scaletest.Limit,
		"NextGreaterElement(n=300000, убывающий ряд и максимум в конце) — похоже на O(n²) там, где нужен O(n)"+
			" (замер: эталон ~7 мс, поиск вправо ~19.7 с, он же с суффиксным максимумом ~17.3 с)",
		func() { got = NextGreaterElement(nums) })
	if len(got) != n || got[0] != n || got[n-2] != n || got[n-1] != -1 {
		t.Fatalf("NextGreaterElement: len=%d, [0]=%v, [n-2]=%v, [n-1]=%v; ожидалось len=%d, %d, %d, -1",
			len(got), at(got, 0), at(got, n-2), at(got, n-1), n, n, n)
	}
}

// TestDailyTemperaturesScales — тот же вход: потепление у каждого дня наступает
// только в последний день. Поиск вправо — O(n²), монотонный стек — O(n).
func TestDailyTemperaturesScales(t *testing.T) {
	const n = 300000
	temps := nearlyDecreasing(n)
	var got []int
	scaletest.Within(t, scaletest.Limit,
		"DailyTemperatures(n=300000, убывающий ряд и максимум в конце) — похоже на O(n²) там, где нужен O(n)"+
			" (замер: эталон ~7 мс, поиск вправо ~11.9 с)",
		func() { got = DailyTemperatures(temps) })
	// день i ждёт последнего дня n−1
	if len(got) != n || got[0] != n-1 || got[n-2] != 1 || got[n-1] != 0 {
		t.Fatalf("DailyTemperatures: len=%d, [0]=%v, [n-2]=%v, [n-1]=%v; ожидалось len=%d, %d, 1, 0",
			len(got), at(got, 0), at(got, n-2), at(got, n-1), n, n-1)
	}
}

// TestMinStackScales — сложность, а не ответ. Сначала n Push убывающих значений
// с GetMin после каждого, затем Pop до одного элемента с GetMin после каждого.
// Минимум сканом стека стоит его длину на вызов — O(n²) уже на первой фазе.
// Кэш минимума с пересчётом сканом, когда снимают минимум, проходит первую фазу,
// но на второй минимум — каждая снимаемая вершина: снова O(n²). Стек префиксных
// минимумов — O(1) на операцию.
func TestMinStackScales(t *testing.T) {
	const n = 200000
	var pushSum, popSum int
	scaletest.Within(t, scaletest.Limit,
		"MinStack(200000 Push убывающих, затем 199999 Pop, GetMin после каждой операции) — похоже на O(n) за GetMin или Pop"+
			" там, где нужен O(1) (замер: эталон ~5 мс, GetMin сканом ~20.5 с, кэш с пересчётом при Pop ~10.3 с)",
		func() {
			s := NewMinStack()
			for i := 0; i < n; i++ {
				s.Push(n - i)
				pushSum += s.GetMin()
			}
			for i := 0; i < n-1; i++ {
				s.Pop()
				popSum += s.GetMin()
			}
		})
	// после Push значения v минимум — v; после Pop вершина — минимум: 2, 3, …, n
	if want := n * (n + 1) / 2; pushSum != want {
		t.Fatalf("MinStack: сумма GetMin после Push = %d, ожидалось %d", pushSum, want)
	}
	if want := n*(n+1)/2 - 1; popSum != want {
		t.Fatalf("MinStack: сумма GetMin после Pop = %d, ожидалось %d", popSum, want)
	}
}

func at(a []int, i int) any {
	if i < 0 || i >= len(a) {
		return "нет"
	}
	return a[i]
}
