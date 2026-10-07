package parallelsearch

import (
	"math/rand"
	"testing"
)

func randStr(rng *rand.Rand, n int) string {
	b := make([]byte, n)
	for i := range b {
		b[i] = byte('a' + rng.Intn(3)) // узкий алфавит → много совпадений и стыков
	}
	return string(b)
}

// На случайных текстах и паттернах Conc обязан совпадать с Seq (включая матчи на
// границах чанков). Под -race ловит небезопасный доступ к общему счётчику.
func TestCountOccurrencesRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(2027))
	for range 500 {
		text := randStr(rng, rng.Intn(200))
		m := rng.Intn(4) + 1
		pat := randStr(rng, m)
		if got, want := CountOccurrencesConc(text, pat), CountOccurrencesSeq(text, pat); got != want {
			t.Fatalf("Conc(%q,%q) = %d, want %d", text, pat, got, want)
		}
	}
}
