package slidingwindow

import (
	"fmt"
	"testing"
)

// benchArr — детерминированный псевдослучайный массив (xorshift), чтобы бенчмарк
// был воспроизводим между запусками без зависимости от math/rand.
func benchArr(n int) []int {
	a := make([]int, n)
	x := uint32(2463534242)
	for i := range a {
		x ^= x << 13
		x ^= x >> 17
		x ^= x << 5
		a[i] = int(x & 0xffff)
	}
	return a
}

// BenchmarkMaxSlidingWindow проверяет асимптотику на практике.
//
// MaxSlidingWindow заявлен как O(n) (монотонно убывающий дек индексов).
// Наивное решение «для каждого окна ищем максимум за O(k)» — это O(n·k).
//
// При k = n/10 и росте n в 10 раз время O(n)-решения должно вырасти ~×10,
// а O(n·k)-решения — ~×100. Запусти и сравни два размера:
//
//	go test -tags solution -bench=MaxSlidingWindow -benchmem ./slidingwindow/
func BenchmarkMaxSlidingWindow(b *testing.B) {
	for _, n := range []int{20000, 200000} {
		arr := benchArr(n)
		k := n / 10
		b.Run(fmt.Sprintf("n=%d_k=%d", n, k), func(b *testing.B) {
			for i := 0; i < b.N; i++ {
				_ = MaxSlidingWindow(arr, k)
			}
		})
	}
}

// BenchmarkSmallestSubarrayWithSum: переменное окно, O(n) (каждый индекс входит
// в окно и выходит максимум один раз). Линейный рост по n.
func BenchmarkSmallestSubarrayWithSum(b *testing.B) {
	for _, n := range []int{20000, 200000} {
		arr := benchArr(n)
		target := n * 1000 // большая цель — окно почти во весь массив
		b.Run(fmt.Sprintf("n=%d", n), func(b *testing.B) {
			for i := 0; i < b.N; i++ {
				_ = SmallestSubarrayWithSum(arr, target)
			}
		})
	}
}
