package strmatch

import "testing"

// общие случаи для обоих алгоритмов
var searchCases = []struct {
	name          string
	text, pattern string
	want          int
}{
	{"в середине", "hello world", "world", 6},
	{"в начале", "abcabc", "abc", 0},
	{"нет вхождения", "aaaaa", "bba", -1},
	{"сдвиг с откатом", "abcabcabd", "abcabd", 3},
	{"повторы", "mississippi", "issip", 4},
	{"образец длиннее текста", "ab", "abc", -1},
	{"пустой образец", "abc", "", 0},
	{"полное совпадение", "abc", "abc", 0},
	{"последняя позиция", "aaab", "ab", 2},
}

func TestKMPSearch(t *testing.T) {
	for _, tt := range searchCases {
		t.Run(tt.name, func(t *testing.T) {
			if got := KMPSearch(tt.text, tt.pattern); got != tt.want {
				t.Errorf("KMPSearch(%q, %q) = %d, ожидалось %d", tt.text, tt.pattern, got, tt.want)
			}
		})
	}
}

func TestRabinKarp(t *testing.T) {
	for _, tt := range searchCases {
		t.Run(tt.name, func(t *testing.T) {
			if got := RabinKarp(tt.text, tt.pattern); got != tt.want {
				t.Errorf("RabinKarp(%q, %q) = %d, ожидалось %d", tt.text, tt.pattern, got, tt.want)
			}
		})
	}
}
