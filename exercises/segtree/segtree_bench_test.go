package segtree

import (
	"fmt"
	"testing"
)

func benchArr(n int) []int {
	a := make([]int, n)
	x := uint32(19650218)
	for i := range a {
		x ^= x << 13
		x ^= x >> 17
		x ^= x << 5
		a[i] = int(x & 0xffff)
	}
	return a
}

// BenchmarkSegmentTree проверяет, что Update и Query держат O(log n).
//
// Дерево отрезков: и Update, и Query — O(log n). Наивная альтернатива (обычный
// массив) даёт O(1) на Update, но O(n) на каждый диапазонный Query — на потоке
// из множества запросов это вырождается в квадратичное время.
//
// Здесь чередуем Update и Query. При росте n в 10 раз время O(log n)-операций
// почти не меняется (логарифм), а наивный O(n)-Query вырос бы ~×10:
//
//	go test -tags solution -bench=SegmentTree ./segtree/
func BenchmarkSegmentTree(b *testing.B) {
	for _, n := range []int{10000, 100000} {
		arr := benchArr(n)
		b.Run(fmt.Sprintf("n=%d", n), func(b *testing.B) {
			st := NewSegmentTree(arr)
			b.ResetTimer()
			for i := 0; i < b.N; i++ {
				idx := i % n
				st.Update(idx, idx&0xff)
				_ = st.Query(0, n-1)
			}
		})
	}
}

// BenchmarkLazySegmentTree: диапазонное обновление + диапазонный запрос, оба
// O(log n) благодаря ленивому проталкиванию. Чередуем RangeUpdate и RangeQuery.
func BenchmarkLazySegmentTree(b *testing.B) {
	for _, n := range []int{10000, 100000} {
		arr := benchArr(n)
		b.Run(fmt.Sprintf("n=%d", n), func(b *testing.B) {
			t := NewLazySegmentTree(arr)
			b.ResetTimer()
			for i := 0; i < b.N; i++ {
				l := i % n
				r := l + (n-l)/2
				t.RangeUpdate(l, r, 1)
				_ = t.RangeQuery(l, r)
			}
		})
	}
}
