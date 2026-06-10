package topk

import (
	"fmt"
	"testing"
)

func benchArr(n int) []int {
	a := make([]int, n)
	x := uint32(747796405)
	for i := range a {
		x ^= x << 13
		x ^= x >> 17
		x ^= x << 5
		a[i] = int(x & 0x7fffffff)
	}
	return a
}

// BenchmarkFindKLargest проверяет, что решение держит O(n log k), а не O(n log n).
//
// FindKLargest заявлен как O(n log k) с кучей размера k. Полная сортировка
// O(n log n) тоже пройдёт тесты на корректность, но при маленьком k (здесь k=10)
// куча должна быть ощутимо быстрее. Сравни время — если оно как у сортировки,
// значит внутри сортировка, а не куча размера k:
//
//	go test -tags solution -bench=FindKLargest ./topk/
func BenchmarkFindKLargest(b *testing.B) {
	for _, n := range []int{50000, 500000} {
		nums := benchArr(n)
		b.Run(fmt.Sprintf("n=%d_k=10", n), func(b *testing.B) {
			for i := 0; i < b.N; i++ {
				_ = FindKLargest(nums, 10)
			}
		})
	}
}

// BenchmarkTopKFrequent: O(n log k) — подсчёт частот + куча размера k.
func BenchmarkTopKFrequent(b *testing.B) {
	for _, n := range []int{50000, 500000} {
		nums := benchArr(n)
		for i := range nums {
			nums[i] %= 1000 // ограничиваем число уникальных значений
		}
		b.Run(fmt.Sprintf("n=%d_k=10", n), func(b *testing.B) {
			for i := 0; i < b.N; i++ {
				_ = TopKFrequent(nums, 10)
			}
		})
	}
}
