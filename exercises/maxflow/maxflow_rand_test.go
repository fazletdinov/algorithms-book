package maxflow

import (
	"math/rand"
	"testing"
)

// bruteMatch — независимый эталон: перебором находит максимальное паросочетание
// (для малых графов). Сверяем с алгоритмом Куна на случайных входах.
func bruteMatch(nLeft, nRight int, adj [][]bool) int {
	usedR := make([]bool, nRight)
	var rec func(l int) int
	rec = func(l int) int {
		if l == nLeft {
			return 0
		}
		best := rec(l + 1) // левую вершину l оставляем без пары
		for r := 0; r < nRight; r++ {
			if adj[l][r] && !usedR[r] {
				usedR[r] = true
				if c := 1 + rec(l+1); c > best {
					best = c
				}
				usedR[r] = false
			}
		}
		return best
	}
	return rec(0)
}

func TestMaxBipartiteMatchingRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(20260707))
	for iter := 0; iter < 400; iter++ {
		nLeft := 1 + rng.Intn(5)
		nRight := 1 + rng.Intn(5)
		adj := make([][]bool, nLeft)
		for i := range adj {
			adj[i] = make([]bool, nRight)
		}
		var edges [][]int
		for l := 0; l < nLeft; l++ {
			for r := 0; r < nRight; r++ {
				if rng.Intn(2) == 0 {
					adj[l][r] = true
					edges = append(edges, []int{l, r})
				}
			}
		}
		want := bruteMatch(nLeft, nRight, adj)
		if got := MaxBipartiteMatching(nLeft, nRight, edges); got != want {
			t.Fatalf("итерация %d: MaxBipartiteMatching = %d, брутфорс = %d (nLeft=%d nRight=%d edges=%v)",
				iter, got, want, nLeft, nRight, edges)
		}
	}
}
