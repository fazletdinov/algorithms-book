//go:build solution

package parallelsort

import "sync"

// cutoff — ниже этого размера сортируем последовательно: горутина дороже
// сортировки мелкого куска.
const cutoff = 2048

// merge сливает два отсортированных среза в новый.
func merge(l, r []int) []int {
	out := make([]int, 0, len(l)+len(r))
	i, j := 0, 0
	for i < len(l) && j < len(r) {
		if l[i] <= r[j] {
			out = append(out, l[i])
			i++
		} else {
			out = append(out, r[j])
			j++
		}
	}
	out = append(out, l[i:]...)
	out = append(out, r[j:]...)
	return out
}

func MergeSortSeq(a []int) []int {
	if len(a) <= 1 {
		return append([]int(nil), a...)
	}
	mid := len(a) / 2
	return merge(MergeSortSeq(a[:mid]), MergeSortSeq(a[mid:]))
}

func MergeSortConc(a []int) []int {
	if len(a) <= 1 {
		return append([]int(nil), a...)
	}
	if len(a) < cutoff {
		return MergeSortSeq(a)
	}
	mid := len(a) / 2
	var l, r []int
	var wg sync.WaitGroup
	wg.Add(2)
	// Половины независимы: каждая горутина пишет в свою переменную, общая
	// память не разделяется — гонки нет.
	go func() { defer wg.Done(); l = MergeSortConc(a[:mid]) }()
	go func() { defer wg.Done(); r = MergeSortConc(a[mid:]) }()
	wg.Wait()
	return merge(l, r)
}
