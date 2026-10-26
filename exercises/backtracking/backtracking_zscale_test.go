package backtracking

import (
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
)

// TestSolveNQueensCountScales — сложность, а не ответ. Отсечение по столбцам и
// диагоналям в момент постановки ферзя обрывает ветку сразу, и при n = 12 дерево
// поиска — около 10⁷ узлов. Перебор всех перестановок столбцов с проверкой
// диагоналей только в листе строит все 12! ≈ 4.8·10⁸ расстановок.
func TestSolveNQueensCountScales(t *testing.T) {
	var got int
	scaletest.Within(t, scaletest.Limit,
		"SolveNQueensCount(12) — похоже, диагонали проверяются только в полной расстановке"+
			" (перебор всех n! перестановок вместо отсечения на каждой строке)"+
			" (замер: эталон ~45 мс, перестановки с проверкой в листе ~16.6 с)",
		func() { got = SolveNQueensCount(12) })
	if got != 14200 {
		t.Fatalf("SolveNQueensCount(12) = %d, ожидалось 14200", got)
	}
}

// TestGenerateParenthesesScales — сложность, а не ответ. Отсечение «открывающих
// не больше n, закрывающих не больше открытых» строит только корректные строки:
// при n = 13 их 742900 (число Каталана). «Сгенерируй все 2²ⁿ строк из скобок и
// отфильтруй» строит 2²⁶ ≈ 6.7·10⁷ строк и каждую проверяет: склейкой s+"(" —
// новая строка на каждый узел, списком всех строк до фильтра — гигабайты памяти.
//
// Не ловится: тот же перебор в один байтовый буфер, который превращается в строку
// только у прошедших фильтр (~0.6 с). Ответ сам по себе — Каталан(n) ≈ 4ⁿ/n^1.5
// строк, и разрыв с 4ⁿ лишь в n^1.5 раз: при n ≤ 13 это ~10×, на порядок меньше
// запаса теста масштаба.
func TestGenerateParenthesesScales(t *testing.T) {
	var got []string
	scaletest.Within(t, scaletest.Limit,
		"GenerateParentheses(13) — похоже на перебор всех 2²ⁿ строк с фильтром вместо отсечения по счётчикам"+
			" (замер: эталон ~45–75 мс, все 2²ⁿ строк склейкой с фильтром в листе ~4.2 с,"+
			" они же списком до фильтра — больше 2 ГиБ памяти)",
		func() { got = GenerateParentheses(13) })
	if len(got) != 742900 {
		t.Fatalf("GenerateParentheses(13): %d строк, ожидалось 742900", len(got))
	}
	for _, s := range got {
		if len(s) != 26 || !balanced(s) {
			t.Fatalf("GenerateParentheses(13): некорректная строка %q", s)
		}
	}
}

func balanced(s string) bool {
	bal := 0
	for i := 0; i < len(s); i++ {
		if s[i] == '(' {
			bal++
		} else {
			bal--
		}
		if bal < 0 {
			return false
		}
	}
	return bal == 0
}
