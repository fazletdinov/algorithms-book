//go:build solution

package sampling

import "math/rand"

func Shuffle(a []int, rng *rand.Rand) {
	for i := len(a) - 1; i > 0; i-- {
		j := rng.Intn(i + 1) // j ∈ [0..i] — включая сам i
		a[i], a[j] = a[j], a[i]
	}
}

func ReservoirSample(stream []int, k int, rng *rand.Rand) []int {
	if k < 0 {
		k = 0
	}
	res := make([]int, 0, min(k, len(stream)))
	for i, x := range stream {
		if i < k {
			res = append(res, x) // первые k — просто берём
			continue
		}
		j := rng.Intn(i + 1) // одна строчка: и вероятность k/(i+1), и жертва
		if j < k {
			res[j] = x
		}
	}
	return res
}

func ExpectedCollisions(n, m int) float64 {
	if n < 2 {
		return 0
	}
	// n·(n−1) всегда чётно, поэтому целочисленное /2 точное.
	return float64(n*(n-1)/2) / float64(m)
}

func BirthdayThreshold(m int) int {
	n := 2
	for n*(n-1) < 2*m { // ExpectedCollisions(n, m) >= 1 ⇔ n·(n−1) >= 2m
		n++
	}
	return n
}
