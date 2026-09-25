package ahocorasick

import (
	"fmt"
	"testing"
)

// Один проход автомата против k проходов strings.Index — на мегабайте текста.
//
//	go test -p 1 -tags solution -run='^$' -bench=. -count=5 ./ahocorasick/
//
// Текст и шаблоны детерминированы (xorshift с фиксированным зерном). Шаблоны —
// случайные слова длиной 6–10; каждый пятый вписан в текст, чтобы вхождения были.

func xorshift(seed uint32) func() uint32 {
	x := seed
	return func() uint32 {
		x ^= x << 13
		x ^= x >> 17
		x ^= x << 5
		return x
	}
}

func benchData(k int) (string, []string) {
	next := xorshift(20260926)
	text := make([]byte, 1<<20)
	for i := range text {
		text[i] = 'a' + byte(next()%26)
	}
	pats := make([]string, k)
	for i := range pats {
		w := make([]byte, 6+next()%5)
		for j := range w {
			w[j] = 'a' + byte(next()%26)
		}
		pats[i] = string(w)
		if i%5 == 0 { // вписываем, чтобы вхождения точно были
			copy(text[int(next()%uint32(len(text)-len(w))):], w)
		}
	}
	return string(text), pats
}

var sinkMatches int

func BenchmarkFindAll(b *testing.B) {
	for _, k := range []int{10, 100, 1000} {
		text, pats := benchData(k)
		b.Run(fmt.Sprintf("automaton/k=%d", k), func(b *testing.B) {
			a := NewAutomaton(pats)
			b.ResetTimer()
			for i := 0; i < b.N; i++ {
				sinkMatches += len(a.FindAll(text))
			}
		})
		b.Run(fmt.Sprintf("naive/k=%d", k), func(b *testing.B) {
			for i := 0; i < b.N; i++ {
				sinkMatches += len(NaiveFindAll(text, pats))
			}
		})
	}
}

// BenchmarkBuild — цена построения автомата: платится один раз на набор шаблонов.
func BenchmarkBuild(b *testing.B) {
	for _, k := range []int{10, 100, 1000} {
		_, pats := benchData(k)
		b.Run(fmt.Sprintf("k=%d", k), func(b *testing.B) {
			for i := 0; i < b.N; i++ {
				_ = NewAutomaton(pats)
			}
		})
	}
}
