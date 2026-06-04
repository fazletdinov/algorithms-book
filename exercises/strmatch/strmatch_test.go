package strmatch

import (
	"reflect"
	"testing"
)

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

func TestCountOccurrences(t *testing.T) {
	tests := []struct {
		name          string
		text, pattern string
		want          int
	}{
		{"перекрывающиеся", "aaaa", "aa", 3},
		{"без перекрытия", "abcabc", "abc", 2},
		{"пустой образец", "abc", "", 0},
		{"нет вхождений", "abcdef", "xyz", 0},
		{"одно вхождение", "hello world", "world", 1},
		{"полное совпадение", "abc", "abc", 1},
		{"образец длиннее текста", "ab", "abc", 0},
		{"все символы одинаковы", "aaaaa", "a", 5},
		{"перекрытие через три", "aaaaa", "aaa", 3},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := CountOccurrences(tt.text, tt.pattern); got != tt.want {
				t.Errorf("CountOccurrences(%q, %q) = %d, ожидалось %d", tt.text, tt.pattern, got, tt.want)
			}
		})
	}
}

func TestLongestPrefixSuffix(t *testing.T) {
	tests := []struct {
		name string
		s    string
		want int
	}{
		{"чередование", "ababab", 4},
		{"частичный", "abcdabc", 3},
		{"повторы", "aaaa", 3},
		{"нет совпадения", "abc", 0},
		{"один символ", "a", 0},
		{"пустая строка", "", 0},
		{"известный пример", "aabaab", 3},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := LongestPrefixSuffix(tt.s); got != tt.want {
				t.Errorf("LongestPrefixSuffix(%q) = %d, ожидалось %d", tt.s, got, tt.want)
			}
		})
	}
}

func TestZSearch(t *testing.T) {
	tests := []struct {
		name          string
		text, pattern string
		want          []int
	}{
		{"три вхождения", "abcabcabc", "abc", []int{0, 3, 6}},
		{"перекрывающиеся", "aaaa", "aa", []int{0, 1, 2}},
		{"нет вхождений", "abcdef", "xyz", []int{}},
		{"пустой образец", "abc", "", []int{}},
		{"в начале", "abcabc", "abc", []int{0, 3}},
		{"в конце", "aaab", "ab", []int{2}},
		{"полное совпадение", "abc", "abc", []int{0}},
		{"образец длиннее текста", "ab", "abc", []int{}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := ZSearch(tt.text, tt.pattern); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("ZSearch(%q, %q) = %v, ожидалось %v", tt.text, tt.pattern, got, tt.want)
			}
		})
	}
}
