package parallelnqueens

import (
	"math/rand"
	"testing"
)

// Прогоняем конкурентную версию на случайных n и сверяем с последовательной.
// Под -race ловит общий доступ к доске, если кто-то поленился сделать её
// локальной в каждой горутине.
func TestCountNQueensRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(8))
	for range 200 {
		n := rng.Intn(9) + 1 // 1..9
		if got, want := CountNQueensConc(n), CountNQueensSeq(n); got != want {
			t.Fatalf("Conc(%d) = %d, want %d", n, got, want)
		}
	}
}
