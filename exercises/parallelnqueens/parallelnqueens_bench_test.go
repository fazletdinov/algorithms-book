package parallelnqueens

import "testing"

// Как и сортировка слиянием, перебор N ферзей хорошо параллелится: поддеревья
// независимы, работы много, синхронизации почти нет. На n=12 конкурентная
// версия обычно заметно обгоняет последовательную.
func BenchmarkSeq(b *testing.B) {
	for range b.N {
		CountNQueensSeq(12)
	}
}

func BenchmarkConc(b *testing.B) {
	for range b.N {
		CountNQueensConc(12)
	}
}
