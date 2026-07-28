package sorting

import (
	"fmt"
	"testing"
)

// benchInputs — три формы входа одного размера: псевдослучайный (xorshift с
// фиксированным сидом), уже отсортированный и обратно отсортированный.
func benchInputs(n int) []struct {
	name string
	data []int
} {
	random := make([]int, n)
	x := uint32(521288629)
	for i := range random {
		x ^= x << 13
		x ^= x >> 17
		x ^= x << 5
		random[i] = int(x & 0xffff)
	}
	sorted := make([]int, n)
	reversed := make([]int, n)
	for i := 0; i < n; i++ {
		sorted[i] = i
		reversed[i] = n - i
	}
	return []struct {
		name string
		data []int
	}{
		{"random", random},
		{"sorted", sorted},
		{"reversed", reversed},
	}
}

// BenchmarkQuickSort — главный бенч: он ловит quicksort с плохим пивотом.
//
// QuickSort — O(n log n) в среднем, но если пивотом всегда берётся
// первый/последний элемент, на отсортированном и обратно отсортированном
// входе разбиения вырождаются (1 к n-1) и время становится O(n²).
//
// Как читать вывод. С фиксированным пивотом random растёт ~×12 на шаг ×10,
// а sorted/reversed медленнее random на порядки и растут ~×100 (на n=100000 —
// уже секунды). Эталон репозитория — учебная схема Ломуто с пивотом a[hi],
// он деградирует именно так: запустите и убедитесь сами. Случайный пивот или
// медиана трёх выравнивают все три формы входа до ~×12.
//
//	go test -tags solution -bench=QuickSort ./sorting/
func BenchmarkQuickSort(b *testing.B) {
	for _, n := range []int{10000, 100000} {
		for _, in := range benchInputs(n) {
			b.Run(fmt.Sprintf("%s_n=%d", in.name, n), func(b *testing.B) {
				buf := make([]int, n)
				b.ResetTimer()
				for i := 0; i < b.N; i++ {
					copy(buf, in.data) // O(n), на фоне сортировки незаметно
					QuickSort(buf)
				}
			})
		}
	}
}

// BenchmarkMergeSort — контрольная линия для сравнения: merge sort гарантирует
// O(n log n) на ЛЮБОМ входе, поэтому все три формы должны показывать почти
// одинаковое время с ростом ~×12 на шаг ×10. Если ваш QuickSort на sorted
// заметно хуже этих чисел — пивот выбран плохо.
func BenchmarkMergeSort(b *testing.B) {
	for _, n := range []int{10000, 100000} {
		for _, in := range benchInputs(n) {
			b.Run(fmt.Sprintf("%s_n=%d", in.name, n), func(b *testing.B) {
				b.ResetTimer()
				for i := 0; i < b.N; i++ {
					_ = MergeSort(in.data)
				}
			})
		}
	}
}
