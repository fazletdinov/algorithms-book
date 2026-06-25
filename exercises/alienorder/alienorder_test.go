package alienorder

import "testing"

func TestAlienOrder(t *testing.T) {
	cases := []struct {
		name  string
		words []string
		want  string
	}{
		// Порядок однозначен (на каждом шаге Кана ровно одна готовая буква).
		{"классический", []string{"wrt", "wrf", "er", "ett", "rftt"}, "wertf"},
		{"две буквы", []string{"z", "x"}, "zx"},
		{"цикл", []string{"z", "x", "z"}, ""},
		{"префиксный конфликт", []string{"abc", "ab"}, ""},
		{"одно слово", []string{"abc"}, "abc"}, // a<b<c из позиций? нет — буквы без рёбер, любой порядок; берём наименьший
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := AlienOrder(c.words); got != c.want {
				t.Errorf("AlienOrder(%v) = %q, ожидалось %q", c.words, got, c.want)
			}
		})
	}
}
