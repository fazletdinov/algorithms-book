package intervals

import (
	"reflect"
	"testing"
)

func TestMergeIntervals(t *testing.T) {
	tests := []struct {
		name      string
		intervals [][]int
		want      [][]int
	}{
		{"пересекающиеся", [][]int{{1, 4}, {2, 5}, {7, 9}}, [][]int{{1, 5}, {7, 9}}},
		{"непересекающиеся", [][]int{{1, 2}, {4, 5}, {7, 8}}, [][]int{{1, 2}, {4, 5}, {7, 8}}},
		{"вложенный интервал", [][]int{{1, 10}, {3, 5}, {6, 8}}, [][]int{{1, 10}}},
		{"неотсортированный вход", [][]int{{7, 9}, {1, 4}, {2, 5}}, [][]int{{1, 5}, {7, 9}}},
		{"один интервал", [][]int{{3, 6}}, [][]int{{3, 6}}},
		{"пустой вход", [][]int{}, [][]int{}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := MergeIntervals(tt.intervals); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("MergeIntervals(%v) = %v, ожидалось %v", tt.intervals, got, tt.want)
			}
		})
	}
}

func TestInsertInterval(t *testing.T) {
	tests := []struct {
		name        string
		intervals   [][]int
		newInterval []int
		want        [][]int
	}{
		{"слияние одного", [][]int{{1, 3}, {5, 7}, {8, 12}}, []int{4, 6}, [][]int{{1, 3}, {4, 7}, {8, 12}}},
		{"перед всеми", [][]int{{3, 5}, {7, 9}}, []int{0, 1}, [][]int{{0, 1}, {3, 5}, {7, 9}}},
		{"после всех", [][]int{{1, 2}, {3, 5}}, []int{8, 10}, [][]int{{1, 2}, {3, 5}, {8, 10}}},
		{"слияние нескольких", [][]int{{1, 3}, {4, 6}, {7, 9}}, []int{2, 8}, [][]int{{1, 9}}},
		{"в пустой список", [][]int{}, []int{2, 4}, [][]int{{2, 4}}},
		{"без пересечений в середине", [][]int{{1, 2}, {6, 8}}, []int{3, 4}, [][]int{{1, 2}, {3, 4}, {6, 8}}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := InsertInterval(tt.intervals, tt.newInterval); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("InsertInterval(%v, %v) = %v, ожидалось %v", tt.intervals, tt.newInterval, got, tt.want)
			}
		})
	}
}

func TestIntervalsIntersection(t *testing.T) {
	tests := []struct {
		name string
		a    [][]int
		b    [][]int
		want [][]int
	}{
		{"пример из условия", [][]int{{1, 3}, {5, 6}, {7, 9}}, [][]int{{2, 3}, {5, 7}}, [][]int{{2, 3}, {5, 6}, {7, 7}}},
		{"касание границами", [][]int{{1, 4}}, [][]int{{4, 8}}, [][]int{{4, 4}}},
		{"нет пересечений", [][]int{{1, 2}, {5, 6}}, [][]int{{3, 4}, {7, 8}}, [][]int{}},
		{"вложенные", [][]int{{1, 10}}, [][]int{{2, 3}, {5, 7}}, [][]int{{2, 3}, {5, 7}}},
		{"первый пустой", [][]int{}, [][]int{{1, 2}}, [][]int{}},
		{"второй пустой", [][]int{{1, 2}}, [][]int{}, [][]int{}},
		{"оба пустые", [][]int{}, [][]int{}, [][]int{}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := IntervalsIntersection(tt.a, tt.b); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("IntervalsIntersection(%v, %v) = %v, ожидалось %v", tt.a, tt.b, got, tt.want)
			}
		})
	}
}

func TestCanAttendAllMeetings(t *testing.T) {
	tests := []struct {
		name      string
		intervals [][]int
		want      bool
	}{
		{"наложение", [][]int{{1, 4}, {2, 5}}, false},
		{"без наложений", [][]int{{1, 4}, {5, 6}}, true},
		{"касание границами", [][]int{{1, 4}, {4, 5}}, true},
		{"неотсортированный вход", [][]int{{7, 9}, {1, 4}, {2, 5}}, false},
		{"один интервал", [][]int{{3, 6}}, true},
		{"пустой вход", [][]int{}, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := CanAttendAllMeetings(tt.intervals); got != tt.want {
				t.Errorf("CanAttendAllMeetings(%v) = %v, ожидалось %v", tt.intervals, got, tt.want)
			}
		})
	}
}

func TestMinMeetingRooms(t *testing.T) {
	tests := []struct {
		name      string
		intervals [][]int
		want      int
	}{
		{"две комнаты", [][]int{{1, 4}, {2, 5}, {7, 9}}, 2},
		{"одна комната", [][]int{{6, 7}, {2, 4}, {8, 12}}, 1},
		{"касание границами", [][]int{{1, 4}, {4, 5}}, 1},
		{"все накладываются", [][]int{{1, 5}, {2, 6}, {3, 7}}, 3},
		{"один интервал", [][]int{{3, 6}}, 1},
		{"пустой вход", [][]int{}, 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := MinMeetingRooms(tt.intervals); got != tt.want {
				t.Errorf("MinMeetingRooms(%v) = %v, ожидалось %v", tt.intervals, got, tt.want)
			}
		})
	}
}
