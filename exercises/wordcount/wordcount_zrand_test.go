package wordcount

import (
	"math/rand"
	"reflect"
	"testing"
)

// Случайные входы: Seq и Conc должны давать одинаковую карту частот. Прогон под
// -race ловит запись в общую map из нескольких горутин (классический баг).
func TestFreqConcRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(404))
	for range 300 {
		n := rng.Intn(2000)
		items := make([]int, n)
		for i := range items {
			items[i] = rng.Intn(50) // узкий диапазон → частоты накапливаются
		}
		want := FreqSeq(items)
		if got := FreqConc(items); !reflect.DeepEqual(got, want) {
			t.Fatalf("Conc != Seq при n=%d", n)
		}
	}
}
