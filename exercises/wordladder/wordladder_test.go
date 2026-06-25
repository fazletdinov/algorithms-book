package wordladder

import "testing"

func TestLadderLength(t *testing.T) {
	cases := []struct {
		name       string
		begin, end string
		words      []string
		want       int
	}{
		{"классическая цепочка", "hit", "cog",
			[]string{"hot", "dot", "dog", "lot", "log", "cog"}, 5}, // hit→hot→dot→dog→cog
		{"конца нет в словаре", "hit", "cog",
			[]string{"hot", "dot", "dog", "lot", "log"}, 0},
		{"пути не существует", "hit", "cog",
			[]string{"hot", "dog", "cog"}, 0}, // hot→dog меняет 2 буквы
		{"один шаг", "a", "c", []string{"a", "b", "c"}, 2},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := LadderLength(c.begin, c.end, c.words); got != c.want {
				t.Errorf("LadderLength(%q,%q,%v) = %d, ожидалось %d", c.begin, c.end, c.words, got, c.want)
			}
		})
	}
}
