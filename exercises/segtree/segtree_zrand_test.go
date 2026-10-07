package segtree

import (
	"math/rand"
	"testing"
)

// Случайная смесь операций против наивного массива. Ловит ошибки в логике узлов,
// границ и (для Lazy) проталкивания, которые единичные кейсы не вскрывают.
// Сиды фиксированы → падение воспроизводимо.

func TestSegmentTreeRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(3))
	for range 300 {
		n := rng.Intn(40) + 1
		arr := make([]int, n)
		for i := range arr {
			arr[i] = rng.Intn(100) - 50
		}
		ref := append([]int(nil), arr...)
		st := NewSegmentTree(arr)
		for range 80 {
			if rng.Intn(2) == 0 { // Update (set)
				i, v := rng.Intn(n), rng.Intn(100)-50
				st.Update(i, v)
				ref[i] = v
			} else { // Query (sum по [l,r])
				l := rng.Intn(n)
				r := l + rng.Intn(n-l)
				want := 0
				for j := l; j <= r; j++ {
					want += ref[j]
				}
				if got := st.Query(l, r); got != want {
					t.Fatalf("Query(%d,%d) = %d, ожидалось %d (массив %v)", l, r, got, want, ref)
				}
			}
		}
	}
}

func TestMinSegmentTreeRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(7))
	for range 300 {
		n := rng.Intn(40) + 1
		arr := make([]int, n)
		for i := range arr {
			arr[i] = rng.Intn(100) - 50
		}
		ref := append([]int(nil), arr...)
		st := NewMinSegmentTree(arr)
		for range 80 {
			if rng.Intn(2) == 0 {
				i, v := rng.Intn(n), rng.Intn(100)-50
				st.Update(i, v)
				ref[i] = v
			} else {
				l := rng.Intn(n)
				r := l + rng.Intn(n-l)
				want := ref[l]
				for j := l + 1; j <= r; j++ {
					if ref[j] < want {
						want = ref[j]
					}
				}
				if got := st.Query(l, r); got != want {
					t.Fatalf("min Query(%d,%d) = %d, ожидалось %d (массив %v)", l, r, got, want, ref)
				}
			}
		}
	}
}

func TestLazySegmentTreeRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(11))
	for range 300 {
		n := rng.Intn(40) + 1
		arr := make([]int, n)
		for i := range arr {
			arr[i] = rng.Intn(20) - 10
		}
		ref := append([]int(nil), arr...)
		lt := NewLazySegmentTree(arr)
		for range 80 {
			l := rng.Intn(n)
			r := l + rng.Intn(n-l)
			if rng.Intn(2) == 0 { // RangeUpdate (+delta на [l,r])
				delta := rng.Intn(21) - 10
				lt.RangeUpdate(l, r, delta)
				for j := l; j <= r; j++ {
					ref[j] += delta
				}
			} else { // RangeQuery (sum по [l,r])
				want := 0
				for j := l; j <= r; j++ {
					want += ref[j]
				}
				if got := lt.RangeQuery(l, r); got != want {
					t.Fatalf("RangeQuery(%d,%d) = %d, ожидалось %d (массив %v)", l, r, got, want, ref)
				}
			}
		}
	}
}
