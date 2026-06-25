package skyline

import (
	"reflect"
	"testing"
)

func TestGetSkyline(t *testing.T) {
	cases := []struct {
		name      string
		buildings [][]int
		want      [][]int
	}{
		{
			"классический пример LeetCode",
			[][]int{{2, 9, 10}, {3, 7, 15}, {5, 12, 12}, {15, 20, 10}, {19, 24, 8}},
			[][]int{{2, 10}, {3, 15}, {7, 12}, {12, 0}, {15, 10}, {20, 8}, {24, 0}},
		},
		{
			"три перекрывающихся",
			[][]int{{2, 9, 10}, {3, 7, 15}, {5, 12, 12}},
			[][]int{{2, 10}, {3, 15}, {7, 12}, {12, 0}},
		},
		{
			"одно здание",
			[][]int{{0, 2, 3}},
			[][]int{{0, 3}, {2, 0}},
		},
		{
			"два непересекающихся",
			[][]int{{1, 2, 1}, {3, 4, 1}},
			[][]int{{1, 1}, {2, 0}, {3, 1}, {4, 0}},
		},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := GetSkyline(c.buildings); !reflect.DeepEqual(got, c.want) {
				t.Errorf("GetSkyline(%v) =\n  %v\nожидалось\n  %v", c.buildings, got, c.want)
			}
		})
	}
}
