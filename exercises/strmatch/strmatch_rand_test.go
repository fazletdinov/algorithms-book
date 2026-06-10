package strmatch

import (
	"math/rand"
	"strings"
	"testing"
)

func randStr(rng *rand.Rand, minLen, maxLen, alpha int) string {
	n := minLen + rng.Intn(maxLen-minLen+1)
	b := make([]byte, n)
	for i := range b {
		b[i] = byte('a' + rng.Intn(alpha))
	}
	return string(b)
}

// KMP и Rabin–Karp должны совпадать с эталоном strings.Index на тысячах случайных
// строк. Алфавит из двух букв даёт частые частичные совпадения — это вскрывает
// ошибки отката по префикс-функции (KMP) и обработки коллизий хеша (Rabin–Karp),
// которые на «разных» символах не проявляются. Сид фиксирован.
func TestSubstringSearchRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(101))
	for range 5000 {
		text := randStr(rng, 0, 14, 2)
		pat := randStr(rng, 1, 4, 2)
		want := strings.Index(text, pat)
		if got := KMPSearch(text, pat); got != want {
			t.Fatalf("KMPSearch(%q, %q) = %d, strings.Index = %d", text, pat, got, want)
		}
		if got := RabinKarp(text, pat); got != want {
			t.Fatalf("RabinKarp(%q, %q) = %d, strings.Index = %d", text, pat, got, want)
		}
	}
}
