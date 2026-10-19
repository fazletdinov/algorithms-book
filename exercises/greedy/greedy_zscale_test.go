package greedy

import (
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
)

// TestCanJumpScales — сложность, а не ответ. Два входа, потому что у квадратичной
// разметки два естественных вида, и худший вход у них разный.
//
// Лестница: из каждой позиции i ≤ m можно допрыгнуть ровно до m, где стоит 0, и
// последний индекс m+1 недостижим. «Отметь всё, куда прыгаешь из i» стоит nums[i]
// на позицию — Σ(m−i) = O(n²).
//
// Одни единицы: «для каждого j найди достижимое i < j, откуда до j допрыгнуть»
// с досрочным выходом находит такое i только в самом конце перебора (i = j−1) —
// снова O(n²). Самая дальняя достижимая позиция — O(n) на обоих.
func TestCanJumpScales(t *testing.T) {
	const m = 199998
	stairs := make([]int, m+2)
	for i := 0; i <= m; i++ {
		stairs[i] = m - i // stairs[m] = 0
	}
	ones := make([]int, m+2)
	for i := range ones {
		ones[i] = 1
	}
	var gotStairs, gotOnes bool
	scaletest.Within(t, scaletest.Limit,
		"CanJump(n=200000: лестница к нулю и одни единицы) — похоже на O(n²) там, где нужен O(n)"+
			" (замер: эталон < 1 мс, разметка ~8.4 с, поиск источника ~10.2 с)",
		func() {
			gotStairs = CanJump(stairs)
			gotOnes = CanJump(ones)
		})
	if gotStairs {
		t.Fatalf("CanJump(лестница) = true, а последний индекс недостижим")
	}
	if !gotOnes {
		t.Fatalf("CanJump(одни единицы) = false, а дойти можно шагами по одному")
	}
}
