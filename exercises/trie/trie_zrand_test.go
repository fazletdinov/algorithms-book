package trie

import (
	"math/rand"
	"sort"
	"strings"
	"testing"
)

// randWord — короткое слово из узкого алфавита (a–c, длина 1–4): много общих
// префиксов и коллизий при удалении.
func randWord(rng *rand.Rand) string {
	n := rng.Intn(4) + 1
	b := make([]byte, n)
	for i := range b {
		b[i] = byte('a' + rng.Intn(3))
	}
	return string(b)
}

func anyHasPrefix(ref map[string]bool, p string) bool {
	for w := range ref {
		if strings.HasPrefix(w, p) {
			return true
		}
	}
	return false
}

func wordsWithPrefixRef(ref map[string]bool, p string) []string {
	out := []string{}
	for w := range ref {
		if strings.HasPrefix(w, p) {
			out = append(out, w)
		}
	}
	sort.Strings(out)
	return out
}

// Случайная последовательность операций сверяется со множеством-эталоном map[string]bool.
func TestTrieRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(2601))
	for range 400 {
		tr := NewTrie()
		ref := map[string]bool{}
		for op := 0; op < 60; op++ {
			w := randWord(rng)
			switch rng.Intn(5) {
			case 0, 1: // вставка (чаще, чтобы бор наполнялся)
				tr.Insert(w)
				ref[w] = true
			case 2: // удаление
				got := tr.Delete(w)
				if want := ref[w]; got != want {
					t.Fatalf("Delete(%q) = %v, want %v", w, got, want)
				}
				delete(ref, w)
			case 3: // точный поиск
				if got, want := tr.Search(w), ref[w]; got != want {
					t.Fatalf("Search(%q) = %v, want %v", w, got, want)
				}
			case 4: // префикс
				p := w[:rng.Intn(len(w))+1]
				if got, want := tr.StartsWith(p), anyHasPrefix(ref, p); got != want {
					t.Fatalf("StartsWith(%q) = %v, want %v", p, got, want)
				}
			}
			// инвариант после каждой операции
			if got, want := tr.Search(w), ref[w]; got != want {
				t.Fatalf("после операции Search(%q) = %v, want %v", w, got, want)
			}
		}
		// WordsWithPrefix должен совпасть со множеством (бор отдаёт слова уже
		// отсортированными — DFS по детям 'a'..'z').
		for _, p := range []string{"", "a", "b", "ab", "c"} {
			got := tr.WordsWithPrefix(p)
			want := wordsWithPrefixRef(ref, p)
			if !equalStr(got, want) {
				t.Fatalf("WordsWithPrefix(%q) = %v, want %v", p, got, want)
			}
		}
	}
}

func equalStr(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}
