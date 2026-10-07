package slidingwindow

import (
	"math/rand"
	"testing"
)

// bruteMaxWindow — наивный O(n·k) максимум каждого окна (эталон для сверки).
func bruteMaxWindow(arr []int, k int) []int {
	res := make([]int, 0, len(arr)-k+1)
	for i := 0; i+k <= len(arr); i++ {
		mx := arr[i]
		for j := i + 1; j < i+k; j++ {
			if arr[j] > mx {
				mx = arr[j]
			}
		}
		res = append(res, mx)
	}
	return res
}

// TestMaxSlidingWindowRandom: тысяча случайных входов против наивного решения.
// Узкий диапазон значений даёт много равных элементов — это вскрывает классические
// ошибки монотонного дека (устаревшая голова окна, '<' vs '<=' при чистке хвоста),
// которые маленькие табличные кейсы пропускают. Сид фиксирован → падение
// воспроизводимо.
func TestMaxSlidingWindowRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(1))
	for range 1000 {
		n := rng.Intn(30) + 1
		k := rng.Intn(n) + 1
		arr := make([]int, n)
		for i := range arr {
			arr[i] = rng.Intn(12) - 4 // [-4..7]: дубликаты и отрицательные
		}
		got := MaxSlidingWindow(arr, k)
		want := bruteMaxWindow(arr, k)
		if !equalInts(got, want) {
			t.Fatalf("MaxSlidingWindow(%v, %d) = %v, brute = %v", arr, k, got, want)
		}
	}
}

func equalInts(a, b []int) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}
