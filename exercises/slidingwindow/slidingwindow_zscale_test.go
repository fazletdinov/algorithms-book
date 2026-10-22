package slidingwindow

import (
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
)

// TestMaxSlidingWindowScales — не про ответ, а про сложность. На строго
// убывающем ряду в каждом окне все элементы — кандидаты в будущие максимумы,
// и пересчёт максимума заново стоит k на окно: O(n·k). Монотонный дек — O(n),
// куча — O(n log k), обе укладываются.
func TestMaxSlidingWindowScales(t *testing.T) {
	const n, k = 400000, 200000
	arr := make([]int, n)
	for i := range arr {
		arr[i] = n - i
	}
	var got []int
	scaletest.Within(t, scaletest.Limit,
		"MaxSlidingWindow(n=400000, k=200000, убывающий ряд) — похоже на O(n·k) там, где нужен O(n)"+
			" (замер: эталон ~4 мс, перебор ~12.5 с)",
		func() { got = MaxSlidingWindow(arr, k) })
	// окно с началом i — это arr[i..i+k-1], его максимум arr[i] = n-i
	if len(got) != n-k+1 || got[0] != n || got[len(got)-1] != k {
		t.Fatalf("MaxSlidingWindow: len=%d, первый=%v, последний=%v; ожидалось len=%d, %d, %d",
			len(got), first(got), last(got), n-k+1, n, k)
	}
}

func first(a []int) any {
	if len(a) == 0 {
		return "нет"
	}
	return a[0]
}

func last(a []int) any {
	if len(a) == 0 {
		return "нет"
	}
	return a[len(a)-1]
}

// TestMaxSumSubarrayScales — сложность, а не ответ. Пересчёт суммы каждого окна
// заново стоит k на окно: при k = n/2 это (n/2)² — O(n·k). Скользящая сумма — O(n).
func TestMaxSumSubarrayScales(t *testing.T) {
	const n, k = 400000, 200000
	arr := make([]int, n)
	for i := range arr {
		arr[i] = i
	}
	var got int
	scaletest.Within(t, scaletest.Limit,
		"MaxSumSubarray(n=400000, k=200000) — похоже на O(n·k) там, где нужен O(n)"+
			" (замер: эталон < 1 мс, пересчёт каждого окна ~10.9 с)",
		func() { got = MaxSumSubarray(arr, k) })
	// ряд растёт — лучшее окно последнее: n−k, …, n−1
	if want := k * (2*n - k - 1) / 2; got != want {
		t.Fatalf("MaxSumSubarray = %d, ожидалось %d", got, want)
	}
}

// TestLongestSubstringKDistinctScales — сложность, а не ответ. Первая половина
// строки — «abab…», вторая — «cdecde…», k = 2. Перебор «от каждого начала
// расширяй, пока различных ≤ k» из каждой позиции первой половины доходит до её
// конца: Σ(n/2 − i) = O(n²). Отсечение «оставшийся хвост не длиннее лучшего —
// стоп» срабатывает только во второй половине: лучший ответ n/2 найден сразу, а
// хвосты первой половины длиннее. Окно с картой частот — O(n).
func TestLongestSubstringKDistinctScales(t *testing.T) {
	const n = 400000
	b := make([]byte, n)
	for i := 0; i < n/2; i++ {
		b[i] = "ab"[i%2]
	}
	for i := n / 2; i < n; i++ {
		b[i] = "cde"[(i-n/2)%3]
	}
	s := string(b)
	var got int
	scaletest.Within(t, scaletest.Limit,
		"LongestSubstringKDistinct(n=400000: «abab…» и «cdecde…», k=2) — похоже на O(n²) там, где нужен O(n)"+
			" (замер: эталон ~22 мс, перебор начал со счётчиком [256]int и отсечением по хвосту ~19.2 с)",
		func() { got = LongestSubstringKDistinct(s, 2) })
	if got != n/2 {
		t.Fatalf("LongestSubstringKDistinct = %d, ожидалось %d", got, n/2)
	}
}

// TestSmallestSubarrayWithSumScales — сложность, а не ответ. Одни единицы и
// target = n/2: из каждого начала до нужной суммы — n/2 шагов, перебор «от каждого
// начала копи сумму до target» — O(n²). Ответ сам равен n/2, поэтому отсечение
// «длиннее лучшего — дальше не копим» не спасает. Окно — O(n), префиксные суммы с
// бинарным поиском — O(n log n), оба укладываются.
func TestSmallestSubarrayWithSumScales(t *testing.T) {
	const n = 400000
	arr := make([]int, n)
	for i := range arr {
		arr[i] = 1
	}
	var got int
	scaletest.Within(t, scaletest.Limit,
		"SmallestSubarrayWithSum(n=400000 единиц, target=200000) — похоже на O(n²) там, где нужен O(n)"+
			" (замер: эталон < 1 мс, перебор начал ~17.8 с, он же с отсечением по лучшей длине ~31.7 с)",
		func() { got = SmallestSubarrayWithSum(arr, n/2) })
	if got != n/2 {
		t.Fatalf("SmallestSubarrayWithSum = %d, ожидалось %d", got, n/2)
	}
}

// TestLongestSubstringNoRepeatScales — сложность, а не ответ. Строка — алфавит
// «a…z» по кругу, ответ 26. Перебор всех пар (начало, конец) без выхода на первом
// повторе — O(n²). Перебор начал С выходом на первом повторе этот тест не ловит:
// подстрока без повторов не длиннее алфавита, так что он стоит O(n·σ), а σ ≤ 256 —
// константа, и разрыва класса с окном нет.
func TestLongestSubstringNoRepeatScales(t *testing.T) {
	const n = 200000
	b := make([]byte, n)
	for i := range b {
		b[i] = byte('a' + i%26)
	}
	s := string(b)
	var got int
	scaletest.Within(t, scaletest.Limit,
		"LongestSubstringNoRepeat(n=200000, «a…z» по кругу) — похоже на O(n²) там, где нужен O(n)"+
			" (замер: эталон ~7 мс, перебор всех пар без выхода на повторе ~10.6 с)",
		func() { got = LongestSubstringNoRepeat(s) })
	if got != 26 {
		t.Fatalf("LongestSubstringNoRepeat = %d, ожидалось 26", got)
	}
}
