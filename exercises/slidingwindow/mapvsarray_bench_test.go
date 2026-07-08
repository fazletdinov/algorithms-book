package slidingwindow

// Бенчмарк для главы «Скользящее окно», раздел «Цена на практике»: сколько
// СТОИТ map[byte]int в роли частотного счётчика по сравнению с плоским
// массивом [256]int. Обе версии определены прямо здесь (файл самодостаточен
// и работает без -tags solution):
//
//	go test -bench=KDistinct -benchmem ./slidingwindow/
//
// Числа из этого прогона приведены в книге — перепроверь на своей машине.

import (
	"math/rand"
	"testing"
)

// longestKDistinctMap — версия из главы: freq в map[byte]int.
func longestKDistinctMap(s string, k int) int {
	freq := make(map[byte]int)
	left, maxLen := 0, 0
	for right := 0; right < len(s); right++ {
		freq[s[right]]++
		for len(freq) > k {
			freq[s[left]]--
			if freq[s[left]] == 0 {
				delete(freq, s[left])
			}
			left++
		}
		if cur := right - left + 1; cur > maxLen {
			maxLen = cur
		}
	}
	return maxLen
}

// longestKDistinctArray — та же логика, но freq — плоский [256]int:
// байтовый алфавит известен заранее, «сколько различных» держим счётчиком.
func longestKDistinctArray(s string, k int) int {
	var freq [256]int
	distinct := 0
	left, maxLen := 0, 0
	for right := 0; right < len(s); right++ {
		if freq[s[right]] == 0 {
			distinct++
		}
		freq[s[right]]++
		for distinct > k {
			freq[s[left]]--
			if freq[s[left]] == 0 {
				distinct--
			}
			left++
		}
		if cur := right - left + 1; cur > maxLen {
			maxLen = cur
		}
	}
	return maxLen
}

// Обе версии обязаны давать одинаковый ответ — кросс-чек на случайных строках.
func TestKDistinctMapVsArrayAgree(t *testing.T) {
	rng := rand.New(rand.NewSource(20260707))
	for i := 0; i < 300; i++ {
		n := rng.Intn(200)
		b := make([]byte, n)
		for j := range b {
			b[j] = 'a' + byte(rng.Intn(5))
		}
		s := string(b)
		k := 1 + rng.Intn(4)
		if got, want := longestKDistinctArray(s, k), longestKDistinctMap(s, k); got != want {
			t.Fatalf("s=%q k=%d: array=%d map=%d", s, k, got, want)
		}
	}
}

// benchInput — 128 КБ случайных букв a..h (8 различных символов, k=3 заставляет
// окно постоянно сжиматься — «горячий» для freq режим).
func benchInput() string {
	rng := rand.New(rand.NewSource(1))
	b := make([]byte, 1<<17)
	for i := range b {
		b[i] = 'a' + byte(rng.Intn(8))
	}
	return string(b)
}

func BenchmarkKDistinct_Map(b *testing.B) {
	s := benchInput()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		longestKDistinctMap(s, 3)
	}
}

func BenchmarkKDistinct_Array(b *testing.B) {
	s := benchInput()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		longestKDistinctArray(s, 3)
	}
}
