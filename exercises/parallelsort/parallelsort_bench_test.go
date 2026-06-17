package parallelsort

import (
	"math/rand"
	"testing"
)

// Здесь, в отличие от parallelbfs, конкурентность обычно ВЫИГРЫВАЕТ: половины
// независимы, работы на элемент достаточно, синхронизации почти нет (только
// WaitGroup на разбиении). Сравни Seq и Conc на большом массиве.
func bigSlice(n int) []int {
	rng := rand.New(rand.NewSource(1))
	a := make([]int, n)
	for i := range a {
		a[i] = rng.Int()
	}
	return a
}

func BenchmarkSeq(b *testing.B) {
	a := bigSlice(1 << 20)
	b.ResetTimer()
	for range b.N {
		MergeSortSeq(a)
	}
}

func BenchmarkConc(b *testing.B) {
	a := bigSlice(1 << 20)
	b.ResetTimer()
	for range b.N {
		MergeSortConc(a)
	}
}
