package parallelnqueens

import "testing"

// Известные числа решений задачи об N ферзях.
var known = map[int]int{1: 1, 2: 0, 3: 0, 4: 2, 5: 10, 6: 4, 7: 40, 8: 92, 9: 352}

func TestCountNQueensSeq(t *testing.T) {
	for n, want := range known {
		if got := CountNQueensSeq(n); got != want {
			t.Errorf("Seq(%d) = %d, ожидалось %d", n, got, want)
		}
	}
	if got := CountNQueensSeq(0); got != 0 {
		t.Errorf("Seq(0) = %d, ожидалось 0", got)
	}
}

// Конкурентная версия обязана дать те же числа.
func TestCountNQueensConcMatchesSeq(t *testing.T) {
	for n := 1; n <= 9; n++ {
		if got, want := CountNQueensConc(n), CountNQueensSeq(n); got != want {
			t.Fatalf("Conc(%d) = %d, want (== Seq) %d", n, got, want)
		}
	}
}
