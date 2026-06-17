//go:build !solution

// Package parallelsort — сортировка слиянием: синхронно и конкурентно.
// Теория — в книге: ../../src/k-way-merge.md (раздел «Конкурентная сортировка»).
//
//	go test ./parallelsort/                        # ваши решения (красные)
//	go test -tags solution ./parallelsort/         # эталон (зелёные)
//	go test -tags solution -race ./parallelsort/   # проверка на гонки
//	go test -tags solution -bench=. ./parallelsort/ # Seq против Conc
//
// Обе функции возвращают НОВЫЙ отсортированный срез (вход не меняется). В
// отличие от конкурентного BFS, здесь параллелизм реально ускоряет — половины
// независимы и сортируются на разных ядрах. Но только до порога: на мелких
// кусках горутина дороже самой сортировки, поэтому ниже cutoff — последовательно.
package parallelsort

// MergeSortSeq возвращает новый отсортированный срез (рекурсивное слияние).
func MergeSortSeq(a []int) []int {
	// TODO: база — длина <= 1 (верни копию); иначе раздели пополам, отсортируй
	// половины рекурсивно и слей два отсортированных среза в один.
	panic("TODO: реализуйте MergeSortSeq")
}

// MergeSortConc — то же, но половины сортируются в отдельных горутинах; ниже
// порога cutoff переходи на MergeSortSeq. Результат обязан совпасть с
// MergeSortSeq и проходить -race.
func MergeSortConc(a []int) []int {
	// TODO: база и cutoff → MergeSortSeq; иначе запусти две горутины на половины
	// (каждая пишет в свою переменную l/r), дождись (WaitGroup) и слей.
	panic("TODO: реализуйте MergeSortConc")
}
