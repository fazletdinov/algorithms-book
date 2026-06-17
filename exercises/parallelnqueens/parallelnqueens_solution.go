//go:build solution

package parallelnqueens

import "sync"

// countFrom досчитывает решения, начиная со строки r, при заданной занятости
// столбцов и диагоналей. cols/diag1/diag2 принадлежат вызывающему (горутине).
func countFrom(r, n int, cols, diag1, diag2 []bool) int {
	if r == n {
		return 1
	}
	count := 0
	for c := range n {
		d1, d2 := r+c, r-c+n
		if cols[c] || diag1[d1] || diag2[d2] {
			continue
		}
		cols[c], diag1[d1], diag2[d2] = true, true, true
		count += countFrom(r+1, n, cols, diag1, diag2)
		cols[c], diag1[d1], diag2[d2] = false, false, false
	}
	return count
}

func CountNQueensSeq(n int) int {
	if n <= 0 {
		return 0
	}
	return countFrom(0, n, make([]bool, n), make([]bool, 2*n), make([]bool, 2*n))
}

func CountNQueensConc(n int) int {
	if n <= 0 {
		return 0
	}
	results := make([]int, n)
	var wg sync.WaitGroup
	for c := range n {
		wg.Add(1)
		go func(c int) {
			defer wg.Done()
			// своя доска: общей изменяемой памяти между горутинами нет
			cols := make([]bool, n)
			diag1 := make([]bool, 2*n)
			diag2 := make([]bool, 2*n)
			cols[c], diag1[0+c], diag2[0-c+n] = true, true, true
			results[c] = countFrom(1, n, cols, diag1, diag2)
		}(c)
	}
	wg.Wait()
	total := 0
	for _, r := range results {
		total += r
	}
	return total
}
