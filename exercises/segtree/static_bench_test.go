package segtree

import "testing"

// BenchmarkStaticRangeSum — замер к главе «Когда алгоритм не нужен»: если данные
// НЕ меняются, дерево отрезков не нужно. Префиксные суммы считаются один раз за
// O(n), и дальше любая сумма на [l, r] — это одно вычитание, O(1).
// Дерево отрезков окупается ровно тогда, когда между запросами есть Update.
//
//	go test -p 1 -tags solution -run='^$' -bench=StaticRangeSum -count=5 ./segtree/
func BenchmarkStaticRangeSum(b *testing.B) {
	const n = 100000
	arr := benchArr(n)

	prefix := make([]int, n+1) // prefix[i] — сумма arr[0..i-1]
	for i, v := range arr {
		prefix[i+1] = prefix[i] + v
	}
	st := NewSegmentTree(arr)

	// Запросы одни и те же для обоих способов; ответы сверяются до замера,
	// иначе сравнивалась бы скорость двух разных вычислений.
	type span struct{ l, r int }
	spans := make([]span, 4096)
	x := uint32(7)
	for i := range spans {
		x ^= x << 13
		x ^= x >> 17
		x ^= x << 5
		l := int(x % n)
		x ^= x << 13
		x ^= x >> 17
		x ^= x << 5
		r := l + int(x%uint32(n-l))
		spans[i] = span{l, r}
	}
	for _, s := range spans[:64] {
		if got, want := st.Query(s.l, s.r), prefix[s.r+1]-prefix[s.l]; got != want {
			b.Fatalf("Query(%d, %d) = %d, префиксные суммы дают %d", s.l, s.r, got, want)
		}
	}

	var sink int
	b.Run("prefix-sums", func(b *testing.B) {
		for i := 0; i < b.N; i++ {
			s := spans[i&4095]
			sink += prefix[s.r+1] - prefix[s.l]
		}
	})
	b.Run("segment-tree", func(b *testing.B) {
		for i := 0; i < b.N; i++ {
			s := spans[i&4095]
			sink += st.Query(s.l, s.r)
		}
	})
	_ = sink
}
