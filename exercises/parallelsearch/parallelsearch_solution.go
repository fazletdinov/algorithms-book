//go:build solution

package parallelsearch

import "sync"

func CountOccurrencesSeq(text, pat string) int {
	n, m := len(text), len(pat)
	if m == 0 || m > n {
		return 0
	}
	count := 0
	for i := 0; i+m <= n; i++ {
		if text[i:i+m] == pat {
			count++
		}
	}
	return count
}

func CountOccurrencesConc(text, pat string) int {
	n, m := len(text), len(pat)
	if m == 0 || m > n {
		return 0
	}
	totalStarts := n - m + 1 // допустимые начальные позиции: 0..n-m
	workers := 4
	if workers > totalStarts {
		workers = totalStarts
	}
	chunk := (totalStarts + workers - 1) / workers
	results := make([]int, workers)
	var wg sync.WaitGroup
	for w := range workers {
		lo := w * chunk
		if lo >= totalStarts {
			break
		}
		hi := lo + chunk
		if hi > totalStarts {
			hi = totalStarts
		}
		wg.Add(1)
		go func(w, lo, hi int) {
			defer wg.Done()
			c := 0
			// делим по началам: окно text[i:i+m] всегда внутри text,
			// матч на стыке принадлежит ровно одному воркеру
			for i := lo; i < hi; i++ {
				if text[i:i+m] == pat {
					c++
				}
			}
			results[w] = c
		}(w, lo, hi)
	}
	wg.Wait()
	total := 0
	for _, r := range results {
		total += r
	}
	return total
}
