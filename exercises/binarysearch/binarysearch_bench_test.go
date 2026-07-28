package binarysearch

import (
	"fmt"
	"testing"
)

// benchSorted — отсортированный массив из чётных чисел 0, 2, 4, ...: половина
// целей попадает в элементы, половина (нечётные) — мимо.
func benchSorted(n int) []int {
	a := make([]int, n)
	for i := range a {
		a[i] = 2 * i
	}
	return a
}

// benchTargets — детерминированные псевдослучайные цели в [0, 2n): чтобы бенч
// не грел одну и ту же ветку, а сид был фиксирован (воспроизводимость).
func benchTargets(n int) []int {
	const m = 1024 // степень двойки — дешёвый выбор цели по маске i & (m-1)
	t := make([]int, m)
	x := uint32(123456789)
	for i := range t {
		x ^= x << 13
		x ^= x >> 17
		x ^= x << 5
		t[i] = int(x % uint32(2*n))
	}
	return t
}

// BenchmarkSearch — главный бенч: O(log n) против линейного прохода.
//
// Search заявлен как O(log n): 10 сравнений при n=10³, ~17 при n=10⁵, ~23 при
// n=10⁷ — время ПРАКТИЧЕСКИ ПЛОСКОЕ, шаг n ×100 добавляет лишь наносекунды.
// Линейный поиск O(n) растёт ~×100 на каждый шаг ×100 (на n=10⁷ — уже
// миллисекунды на запрос вместо наносекунд).
//
//	go test -tags solution -bench=Search ./binarysearch/
func BenchmarkSearch(b *testing.B) {
	for _, n := range []int{1000, 100000, 10000000} {
		arr := benchSorted(n)
		targets := benchTargets(n)
		b.Run(fmt.Sprintf("n=%d", n), func(b *testing.B) {
			b.ResetTimer()
			for i := 0; i < b.N; i++ {
				_ = Search(arr, targets[i&1023])
			}
		})
	}
}

// BenchmarkFindFirstLast: два бинарных поиска (левая и правая границы) — тоже
// O(log n), время плоское по n. Реализация «найти Search'ем и расширяться
// линейно влево/вправо» на массиве с дубликатами вырождается в O(n) — здесь
// каждый элемент повторён 512 раз, такой код даст рост ~×100 на шаг ×100.
func BenchmarkFindFirstLast(b *testing.B) {
	for _, n := range []int{1000, 100000, 10000000} {
		arr := make([]int, n)
		for i := range arr {
			arr[i] = i / 512 // длинные серии одинаковых значений
		}
		targets := benchTargets(n / 512)
		b.Run(fmt.Sprintf("n=%d", n), func(b *testing.B) {
			b.ResetTimer()
			for i := 0; i < b.N; i++ {
				_ = FindFirstLast(arr, targets[i&1023])
			}
		})
	}
}
