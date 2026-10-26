package skyline

import (
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
)

// TestGetSkylineScales — сложность, а не ответ. n = 7·10⁴ вложенных зданий:
// i-е — [i, 2n−i] высотой i+1, каждое следующее уже и выше. Силуэт — лестница
// вверх и лестница вниз, 2n точек. Проход событий с макс-кучей — O(n log n).
// Перебор всех зданий в каждой точке-краю — O(n²); досрочный выход «дальше
// здания начинаются правее x» (по отсортированным левым краям) не спасает:
// на правых краях все здания уже начались.
func TestGetSkylineScales(t *testing.T) {
	const n = 70000
	buildings := make([][]int, n)
	for i := range buildings {
		buildings[i] = []int{i, 2*n - i, i + 1}
	}
	var got [][]int
	scaletest.Within(t, scaletest.Limit,
		"GetSkyline(7·10⁴ вложенных зданий) — похоже на O(n²): максимум высот перебором всех зданий в каждой точке"+
			" (замер: эталон ~40 мс, перебор зданий в каждой точке ~9.5 с)",
		func() { got = GetSkyline(buildings) })
	if len(got) != 2*n {
		t.Fatalf("GetSkyline: %d точек, ожидалось %d", len(got), 2*n)
	}
	for i := 0; i < n; i++ {
		if got[i][0] != i || got[i][1] != i+1 {
			t.Fatalf("точка %d = %v, ожидалось [%d %d]", i, got[i], i, i+1)
		}
		if p := got[2*n-1-i]; p[0] != 2*n-i || p[1] != i {
			t.Fatalf("точка %d = %v, ожидалось [%d %d]", 2*n-1-i, p, 2*n-i, i)
		}
	}
}
