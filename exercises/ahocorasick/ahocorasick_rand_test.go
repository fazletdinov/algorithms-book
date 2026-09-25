package ahocorasick

import (
	"math/rand"
	"slices"
	"strings"
	"testing"
	"unicode/utf8"
)

func randWord(rng *rand.Rand, alphabet string, maxLen int) string {
	n := 1 + rng.Intn(maxLen)
	var b strings.Builder
	for range n {
		b.WriteByte(alphabet[rng.Intn(len(alphabet))])
	}
	return b.String()
}

// TestAutomatonRandom сверяет автомат с наивным поиском на тысячах случайных
// наборов. Алфавит из трёх букв выбран намеренно: на нём шаблоны постоянно
// вкладываются друг в друга и перекрываются — ровно там ломаются ссылки неудачи
// и словарные ссылки, которых на «обычном» тексте почти не видно.
func TestAutomatonRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(20260926))
	for round := range 3000 {
		k := 1 + rng.Intn(8)
		patterns := make([]string, k)
		for i := range patterns {
			patterns[i] = randWord(rng, "abc", 4)
		}
		text := ""
		if n := rng.Intn(60); n > 0 {
			text = randWord(rng, "abc", n)
		}
		a := NewAutomaton(patterns)
		want := NaiveFindAll(text, patterns)
		if got := a.FindAll(text); len(got) != len(want) || (len(got) > 0 && !slices.Equal(got, want)) {
			t.Fatalf("раунд %d: FindAll(%q) по %q = %v, наивно %v", round, text, patterns, got, want)
		}
		if got := a.ContainsAny(text); got != (len(want) > 0) {
			t.Fatalf("раунд %d: ContainsAny(%q) по %q = %v, а вхождений %d", round, text, patterns, got, len(want))
		}
	}
}

// censorModel — цензура по определению, поверх наивного поиска.
func censorModel(text string, banned []string) string {
	covered := make([]bool, len(text))
	for _, m := range NaiveFindAll(text, banned) {
		for j := m.Start; j < m.Start+len(banned[m.Pattern]); j++ {
			covered[j] = true
		}
	}
	var b strings.Builder
	for i := 0; i < len(text); {
		_, size := utf8.DecodeRuneInString(text[i:])
		if slices.Contains(covered[i:i+size], true) {
			b.WriteByte('*')
		} else {
			b.WriteString(text[i : i+size])
		}
		i += size
	}
	return b.String()
}

// TestCensorRandom — то же для цензуры, на смеси латиницы и кириллицы, чтобы
// граница руны проверялась на многобайтовых символах.
func TestCensorRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(20260927))
	letters := []string{"a", "b", "я", "ж"}
	word := func(maxLen int) string {
		var b strings.Builder
		for range 1 + rng.Intn(maxLen) {
			b.WriteString(letters[rng.Intn(len(letters))])
		}
		return b.String()
	}
	for round := range 2000 {
		banned := make([]string, 1+rng.Intn(4))
		for i := range banned {
			banned[i] = word(3)
		}
		text := word(30)
		if got, want := Censor(text, banned), censorModel(text, banned); got != want {
			t.Fatalf("раунд %d: Censor(%q, %q) = %q, по определению %q", round, text, banned, got, want)
		}
	}
}
