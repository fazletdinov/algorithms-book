package stack

import (
	"strings"
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
)

// TestLargestRectangleScales — сложность, а не ответ. Расширение от каждого
// столбика влево и вправо — O(n²) на двух входах: на равных высотах каждый
// столбик расширяется на весь ряд, а на растущих — до конца вправо. Второй вход
// нужен против пропуска «столбик равен соседу слева — уже посчитан»: на равных
// он делает перебор линейным, на растущих равных соседей нет. Стек индексов — O(n).
func TestLargestRectangleScales(t *testing.T) {
	const n, h = 200000, 7
	equal := make([]int, n)
	rising := make([]int, n)
	for i := range equal {
		equal[i] = h
		rising[i] = i + 1
	}
	// у растущих лучший прямоугольник — высота rising[i] до конца ряда: (i+1)·(n−i)
	wantRising := 0
	for i := range rising {
		wantRising = max(wantRising, (i+1)*(n-i))
	}
	var gotEqual, gotRising int
	scaletest.Within(t, scaletest.Limit,
		"LargestRectangle(n=200000: равные и растущие высоты) — похоже на O(n²) там, где нужен O(n)"+
			" (замер: эталон ~3 мс, перебор ~15.7 с, перебор с пропуском равных ~5.2 с)",
		func() {
			gotEqual = LargestRectangle(equal)
			gotRising = LargestRectangle(rising)
		})
	if gotEqual != n*h {
		t.Fatalf("LargestRectangle(равные) = %d, ожидалось %d", gotEqual, n*h)
	}
	if gotRising != wantRising {
		t.Fatalf("LargestRectangle(растущие) = %d, ожидалось %d", gotRising, wantRising)
	}
}

// TestNextGreaterCircularScales — сложность, а не ответ. Убывающий ряд: больший
// для каждого элемента, кроме первого, — только первый, и поиск вправо с
// переходом через конец идёт до него n−i шагов: O(n²). Досрочный выход «элемент
// равен максимуму всего круга — сразу −1» здесь не спасает: максимум один.
// Стек индексов в два круга — O(n).
func TestNextGreaterCircularScales(t *testing.T) {
	const n = 200000
	nums := make([]int, n)
	for i := range nums {
		nums[i] = n - i
	}
	var got []int
	scaletest.Within(t, scaletest.Limit,
		"NextGreaterCircular(n=200000, убывающий ряд) — похоже на O(n²) там, где нужен O(n)"+
			" (замер: эталон ~4 мс, перебор ~51 с)",
		func() { got = NextGreaterCircular(nums) })
	// у первого (максимума) большего нет, у остальных — первый элемент n
	if len(got) != n || got[0] != -1 || got[1] != n || got[n-1] != n {
		t.Fatalf("NextGreaterCircular: len=%d, [0]=%v, [1]=%v, [n-1]=%v; ожидалось len=%d, -1, %d, %d",
			len(got), at(got, 0), at(got, 1), at(got, n-1), n, n, n)
	}
}

// TestStockSpansScales — сложность, а не ответ. Растущие цены: span дня i равен
// i+1, и подсчёт шагами влево до первой большей цены проходит всю историю — O(n²).
// Стек индексов со строго убывающими ценами — O(n).
func TestStockSpansScales(t *testing.T) {
	const n = 200000
	prices := make([]int, n)
	for i := range prices {
		prices[i] = i + 1
	}
	var got []int
	scaletest.Within(t, scaletest.Limit,
		"StockSpans(n=200000, растущие цены) — похоже на O(n²) там, где нужен O(n)"+
			" (замер: эталон ~1 мс, перебор ~5.4 с)",
		func() { got = StockSpans(prices) })
	if len(got) != n || got[0] != 1 || got[n/2] != n/2+1 || got[n-1] != n {
		t.Fatalf("StockSpans: len=%d, [0]=%v, [n/2]=%v, [n-1]=%v; ожидалось len=%d, 1, %d, %d",
			len(got), at(got, 0), at(got, n/2), at(got, n-1), n, n/2+1, n)
	}
}

// TestSumSubarrayMinsScales — сложность, а не ответ. Двойной цикл с бегущим
// минимумом — O(n²). Два входа против досрочного выхода «бегущий минимум уже
// равен минимуму всего остатка — дальше он не изменится»: на убывающем ряду он
// не срабатывает при обходе слева направо, на растущем — справа налево. Стек
// индексов с правилом ничьей — O(n).
func TestSumSubarrayMinsScales(t *testing.T) {
	const n = 200000
	rising := make([]int, n)
	falling := make([]int, n)
	for i := range rising {
		rising[i] = i + 1
		falling[i] = n - i
	}
	// у растущего минимум подмассива [i..j] — rising[i] = i+1, и таких j ровно n−i
	want := 0
	for i := range rising {
		want += (i + 1) * (n - i)
	}
	var gotRising, gotFalling int
	scaletest.Within(t, scaletest.Limit,
		"SumSubarrayMins(n=200000: растущий и убывающий ряды) — похоже на O(n²) там, где нужен O(n)"+
			" (замер: эталон ~3 мс, перебор ~11.5 с, перебор с выходом по минимуму остатка ~10.4 с)",
		func() {
			gotRising = SumSubarrayMins(rising)
			gotFalling = SumSubarrayMins(falling)
		})
	if gotRising != want || gotFalling != want {
		t.Fatalf("SumSubarrayMins: растущий = %d, убывающий = %d; ожидалось оба = %d",
			gotRising, gotFalling, want)
	}
}

// TestRemoveKDigitsScales — сложность, а не ответ. Запись 1…1 9…9 0: удалить надо
// все девятки, и каждое удаление «найди первую цифру больше следующей» заново
// проходит единицы до неё — O(n·k), да ещё копирование строки на каждое удаление.
// Стек цифр — O(n).
func TestRemoveKDigitsScales(t *testing.T) {
	const ones, k = 100000, 99999
	num := strings.Repeat("1", ones) + strings.Repeat("9", k) + "0"
	var got string
	scaletest.Within(t, scaletest.Limit,
		"RemoveKDigits(len=200000: 100000 единиц, 99999 девяток и ноль, k=99999) — похоже на O(n·k) там, где нужен O(n)"+
			" (замер: эталон ~1 мс, перебор ~9.5 с)",
		func() { got = RemoveKDigits(num, k) })
	if want := strings.Repeat("1", ones) + "0"; got != want {
		t.Fatalf("RemoveKDigits: len=%d, ожидалось %d единиц и ноль (len=%d)", len(got), ones, len(want))
	}
}

func at(a []int, i int) any {
	if i < 0 || i >= len(a) {
		return "нет"
	}
	return a[i]
}
