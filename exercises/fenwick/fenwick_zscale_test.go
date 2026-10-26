package fenwick

import (
	"math/rand"
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
)

// TestFenwickScales — сложность, а не ответ. n = 5·10⁵, 10⁵ Add и 10⁵
// PrefixSum вперемешку, префиксы длинные (последняя десятая массива). Дерево
// Фенвика — O(log n) на вызов. Массив с суммой префикса в цикле — O(n) на
// PrefixSum, массив префиксных сумм с пересчётом хвоста — O(n) на Add. Сумма в
// цикле — самый быстрый перебор (~0.15 нс на элемент), поэтому n — 5·10⁵.
func TestFenwickScales(t *testing.T) {
	const n, ops = 500000, 100000
	r := rand.New(rand.NewSource(1))
	arr := make([]int, n)
	for i := range arr {
		arr[i] = r.Intn(2000000001) - 1000000000
	}
	type op struct{ i, d, p int }
	plan := make([]op, ops)
	for k := range plan {
		plan[k] = op{i: r.Intn(n), d: r.Intn(2000000001) - 1000000000, p: n - 1 - r.Intn(n/10)}
	}
	model := append([]int(nil), arr...)
	var f *Fenwick
	scaletest.Within(t, scaletest.Limit,
		"Fenwick: n=5·10⁵, 10⁵ Add и 10⁵ PrefixSum длинных префиксов вперемешку —"+
			" похоже на O(n) на PrefixSum (сумма в цикле) там, где нужен O(log n)"+
			" (замер: эталон ~10 мс, сумма префикса в цикле ~6 с)",
		func() {
			f = NewFenwick(arr)
			for _, o := range plan {
				f.Add(o.i, o.d)
				model[o.i] += o.d
				f.PrefixSum(o.p)
			}
		})
	for _, q := range [][2]int{{0, n - 1}, {0, 0}, {123, n - 124}, {n - 1, n - 1}} {
		want := 0
		for i := q[0]; i <= q[1]; i++ {
			want += model[i]
		}
		if g := f.RangeSum(q[0], q[1]); g != want {
			t.Fatalf("RangeSum(%d, %d) = %d после прибавок, ожидалось %d", q[0], q[1], g, want)
		}
	}
}

// countInvMerge — число инверсий сортировкой слиянием: независимая модель.
func countInvMerge(a []int) int {
	if len(a) < 2 {
		return 0
	}
	m := len(a) / 2
	left := append([]int(nil), a[:m]...)
	right := append([]int(nil), a[m:]...)
	inv := countInvMerge(left) + countInvMerge(right)
	i, j := 0, 0
	for k := range a {
		if j == len(right) || i < len(left) && left[i] <= right[j] {
			a[k] = left[i]
			i++
		} else {
			a[k] = right[j]
			j++
			inv += len(left) - i
		}
	}
	return inv
}

func randArr(seed int64, n int) []int {
	r := rand.New(rand.NewSource(seed))
	a := make([]int, n)
	for i := range a {
		a[i] = r.Intn(2000000001) - 1000000000
	}
	return a
}

// TestCountInversionsScales — сложность, а не ответ. n = 2·10⁵ случайных
// чисел. Дерево Фенвика со сжатием координат — O(n log n). Перебор всех пар
// i < j — O(n²).
func TestCountInversionsScales(t *testing.T) {
	const n = 200000
	arr := randArr(2, n)
	want := countInvMerge(append([]int(nil), arr...))
	var got int
	scaletest.Within(t, scaletest.Limit,
		"CountInversions(n=2·10⁵, случайные числа) — похоже на O(n²): перебор всех пар"+
			" (замер: эталон ~38 мс, перебор пар ~7 с)",
		func() { got = CountInversions(arr) })
	if got != want {
		t.Fatalf("CountInversions = %d, ожидалось %d", got, want)
	}
}

// TestCountSmallerToRightScales — сложность, а не ответ. Тот же вход: n = 2·10⁵
// случайных чисел. Дерево Фенвика — O(n log n), подсчёт для каждого элемента
// проходом вправо — O(n²).
func TestCountSmallerToRightScales(t *testing.T) {
	const n = 200000
	arr := randArr(3, n)
	var got []int
	scaletest.Within(t, scaletest.Limit,
		"CountSmallerToRight(n=2·10⁵, случайные числа) — похоже на O(n²): проход вправо от каждого элемента"+
			" (замер: эталон ~38 мс, проход вправо ~48 с)",
		func() { got = CountSmallerToRight(arr) })
	if len(got) != n {
		t.Fatalf("CountSmallerToRight: длина %d, ожидалось %d", len(got), n)
	}
	for _, i := range []int{0, 1, 4567, n / 2, n - 2, n - 1} {
		want := 0
		for _, v := range arr[i+1:] {
			if v < arr[i] {
				want++
			}
		}
		if got[i] != want {
			t.Fatalf("CountSmallerToRight[%d] = %d, ожидалось %d", i, got[i], want)
		}
	}
}
