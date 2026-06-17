//go:build solution

package wordcount

import "sync"

func FreqSeq(items []int) map[int]int {
	m := map[int]int{}
	for _, x := range items {
		m[x]++
	}
	return m
}

func FreqConc(items []int) map[int]int {
	result := map[int]int{}
	n := len(items)
	if n == 0 {
		return result
	}
	workers := 4
	if workers > n {
		workers = n
	}
	chunk := (n + workers - 1) / workers
	partials := make([]map[int]int, workers)
	var wg sync.WaitGroup
	for w := 0; w < workers; w++ {
		lo := w * chunk
		if lo >= n {
			break
		}
		hi := lo + chunk
		if hi > n {
			hi = n
		}
		wg.Add(1)
		go func(w, lo, hi int) {
			defer wg.Done()
			local := map[int]int{}
			for _, x := range items[lo:hi] {
				local[x]++
			}
			partials[w] = local // своя ячейка среза — гонки нет
		}(w, lo, hi)
	}
	wg.Wait()
	for _, p := range partials { // fan-in: сливаем локальные карты в одну
		for k, v := range p {
			result[k] += v
		}
	}
	return result
}
