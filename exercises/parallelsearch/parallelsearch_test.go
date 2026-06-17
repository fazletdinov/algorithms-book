package parallelsearch

import "testing"

func TestCountOccurrencesSeq(t *testing.T) {
	cases := []struct {
		text, pat string
		want      int
	}{
		{"aaaa", "aa", 3}, // перекрытия считаются
		{"abababab", "ab", 4},
		{"abcabc", "abc", 2},
		{"abc", "xyz", 0},
		{"", "a", 0},
		{"a", "", 0},     // пустой паттерн → 0
		{"ab", "abc", 0}, // паттерн длиннее текста
	}
	for _, c := range cases {
		if got := CountOccurrencesSeq(c.text, c.pat); got != c.want {
			t.Errorf("Seq(%q,%q) = %d, ожидалось %d", c.text, c.pat, got, c.want)
		}
	}
}

// Конкурентная версия должна совпасть с последовательной, в т.ч. на совпадениях,
// пересекающих границы чанков.
func TestCountOccurrencesConcMatchesSeq(t *testing.T) {
	text := ""
	for range 500 {
		text += "ab"
	}
	for _, pat := range []string{"a", "ab", "aba", "abab", "b"} {
		if got, want := CountOccurrencesConc(text, pat), CountOccurrencesSeq(text, pat); got != want {
			t.Fatalf("Conc(pat=%q) = %d, want %d", pat, got, want)
		}
	}
}
