package fenwick

import (
	"fmt"
	"testing"
)

func benchArr(n int) []int {
	a := make([]int, n)
	x := uint32(88675123)
	for i := range a {
		x ^= x << 13
		x ^= x >> 17
		x ^= x << 5
		a[i] = int(x & 0xffff)
	}
	return a
}

// BenchmarkFenwickMixed — главный бенч: смешанный поток Add + RangeSum.
//
// Дерево Фенвика даёт O(log n) и на Add, и на PrefixSum/RangeSum. Наивная
// альтернатива — держать обычный массив (Add за O(1)) и на каждый запрос
// суммы пересчитывать префикс линейным проходом за O(n).
//
// Бенч меряет время ОДНОЙ пары операций (Add + RangeSum), поэтому при
// росте n в 10 раз (1k → 10k → 100k) правильная реализация O(log n) почти не
// растёт (логарифм: плюс несколько наносекунд на шаг), а наивный
// префикс-пересчёт O(n) растёт ~×10 на каждый шаг.
//
//	go test -tags solution -bench=FenwickMixed ./fenwick/
func BenchmarkFenwickMixed(b *testing.B) {
	for _, n := range []int{1000, 10000, 100000} {
		arr := benchArr(n)
		b.Run(fmt.Sprintf("n=%d", n), func(b *testing.B) {
			f := NewFenwick(arr)
			b.ResetTimer()
			for i := 0; i < b.N; i++ {
				idx := i % n
				f.Add(idx, 1)
				_ = f.RangeSum(0, idx)
			}
		})
	}
}

// BenchmarkCountInversions: заявлено O(n log n) через BIT с координатным
// сжатием. Наивный двойной цикл — O(n²). При росте n в 10 раз правильное
// решение растёт ~×12, наивное — ~×100.
func BenchmarkCountInversions(b *testing.B) {
	for _, n := range []int{2000, 20000} {
		arr := benchArr(n)
		b.Run(fmt.Sprintf("n=%d", n), func(b *testing.B) {
			b.ResetTimer()
			for i := 0; i < b.N; i++ {
				_ = CountInversions(arr)
			}
		})
	}
}
