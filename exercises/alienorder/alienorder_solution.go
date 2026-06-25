//go:build solution

package alienorder

import "sort"

func AlienOrder(words []string) string {
	adj := make(map[byte]map[byte]bool)
	indeg := make(map[byte]int)
	for _, w := range words {
		for i := 0; i < len(w); i++ {
			if adj[w[i]] == nil {
				adj[w[i]] = make(map[byte]bool)
			}
			if _, ok := indeg[w[i]]; !ok {
				indeg[w[i]] = 0
			}
		}
	}
	for i := 0; i+1 < len(words); i++ {
		a, b := words[i], words[i+1]
		if len(a) > len(b) && a[:len(b)] == b {
			return "" // префиксный конфликт: "abc" перед "ab"
		}
		for j := 0; j < len(a) && j < len(b); j++ {
			if a[j] != b[j] {
				if !adj[a[j]][b[j]] {
					adj[a[j]][b[j]] = true
					indeg[b[j]]++
				}
				break
			}
		}
	}
	// Kahn; среди готовых букв всегда берём наименьшую — детерминированный порядок.
	ready := []byte{}
	for ch, d := range indeg {
		if d == 0 {
			ready = append(ready, ch)
		}
	}
	res := []byte{}
	for len(ready) > 0 {
		sort.Slice(ready, func(i, j int) bool { return ready[i] < ready[j] })
		ch := ready[0]
		ready = ready[1:]
		res = append(res, ch)
		for nb := range adj[ch] {
			if indeg[nb]--; indeg[nb] == 0 {
				ready = append(ready, nb)
			}
		}
	}
	if len(res) != len(indeg) {
		return "" // остались буквы со входящими рёбрами = цикл
	}
	return string(res)
}
