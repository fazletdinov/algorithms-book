package greedy

import (
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
)

// TestCanJumpScales — сложность, а не ответ. Из каждой позиции i ≤ m можно
// допрыгнуть ровно до m, где стоит 0, и последний индекс m+1 недостижим.
// Разметка «отметь всё, куда прыгаешь из i» стоит nums[i] на позицию —
// Σ(m−i) = O(n²). Самая дальняя достижимая позиция — O(n).
func TestCanJumpScales(t *testing.T) {
	const m = 199998
	nums := make([]int, m+2)
	for i := 0; i <= m; i++ {
		nums[i] = m - i // nums[m] = 0
	}
	var got bool
	scaletest.Within(t, scaletest.Limit,
		"CanJump(n=200000, лестница к нулю) — похоже на O(n²) там, где нужен O(n)"+
			" (замер: эталон < 1 мс, перебор ~7.7 с)",
		func() { got = CanJump(nums) })
	if got {
		t.Fatalf("CanJump = true, а последний индекс недостижим")
	}
}
