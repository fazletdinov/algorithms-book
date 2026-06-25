package meetingrooms

import "testing"

func TestMinMeetingRooms(t *testing.T) {
	cases := []struct {
		name      string
		intervals [][]int
		want      int
	}{
		{"перекрытие на двух", [][]int{{0, 30}, {5, 10}, {15, 20}}, 2},
		{"без перекрытий", [][]int{{7, 10}, {2, 4}}, 1},
		{"касание границ — одна комната", [][]int{{1, 5}, {5, 10}, {10, 15}}, 1},
		{"всё внахлёст", [][]int{{1, 10}, {2, 10}, {3, 10}}, 3},
		{"пусто", [][]int{}, 0},
		{"одна встреча", [][]int{{4, 9}}, 1},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := MinMeetingRooms(c.intervals); got != c.want {
				t.Errorf("MinMeetingRooms(%v) = %d, ожидалось %d", c.intervals, got, c.want)
			}
		})
	}
}
