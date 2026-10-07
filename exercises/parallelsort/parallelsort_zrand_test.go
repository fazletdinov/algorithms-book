package parallelsort

import (
	"math/rand"
	"sort"
	"testing"
)

// Эталон — sort.Ints (другой алгоритм). И Seq, и Conc должны давать тот же
// порядок и не портить вход. Conc-прогон под -race ловит общий доступ к памяти.
func TestMergeSortRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(77))
	for range 200 {
		n := rng.Intn(6000) // включая размеры выше cutoff
		in := make([]int, n)
		for i := range in {
			in[i] = rng.Intn(2000) - 1000
		}
		snapshot := append([]int(nil), in...)
		want := append([]int(nil), in...)
		sort.Ints(want)

		for _, got := range [][]int{MergeSortSeq(in), MergeSortConc(in)} {
			if len(got) != len(want) {
				t.Fatalf("len = %d, want %d", len(got), len(want))
			}
			for i := range want {
				if got[i] != want[i] {
					t.Fatalf("позиция %d: got %d, want %d (n=%d)", i, got[i], want[i], n)
				}
			}
		}
		// вход не изменился ни одной из функций
		for i := range snapshot {
			if in[i] != snapshot[i] {
				t.Fatalf("вход изменён на позиции %d", i)
			}
		}
	}
}
