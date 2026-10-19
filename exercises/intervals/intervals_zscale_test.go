package intervals

import (
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
)

// TestMinMeetingRoomsScales — сложность, а не ответ. Все встречи попарно
// пересекаются ([i, i+n]), комнат нужно n: поиск свободной комнаты перебором
// всех занятых — O(n²). Две отсортированные последовательности или куча
// концов — O(n log n).
func TestMinMeetingRoomsScales(t *testing.T) {
	const n = 200000
	in := make([][]int, n)
	for i := range in {
		in[i] = []int{i, i + n}
	}
	var got int
	scaletest.Within(t, scaletest.Limit,
		"MinMeetingRooms(n=200000, все встречи пересекаются) — похоже на O(n²) там, где нужен O(n log n)"+
			" (замер: эталон ~2 мс, перебор ~7.7 с)",
		func() { got = MinMeetingRooms(in) })
	if got != n {
		t.Fatalf("MinMeetingRooms = %d, ожидалось %d", got, n)
	}
}
