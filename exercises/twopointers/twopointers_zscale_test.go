package twopointers

import (
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
)

// TestPairWithTargetSumScales — сложность, а не ответ. Все числа чётные, target
// нечётный — пары нет. target лежит посреди диапазона сумм, поэтому перебор пар не
// спасают оба досрочных выхода: ни «сумма уже больше target — дальше j не идём»
// (для i < n/2 до target ещё n−2i шагов), ни «даже с самым большим arr[i] не
// дотянуться — пропусти i» (отсекается только i = 0): O(n²). Указатели с двух
// концов — O(n), бинарный поиск дополнения — O(n log n), оба укладываются.
func TestPairWithTargetSumScales(t *testing.T) {
	const n = 300000
	arr := make([]int, n)
	for i := range arr {
		arr[i] = 2 * i
	}
	target := 2*n - 1 // нечётный, а сумма двух чётных чётна
	var got []int
	scaletest.Within(t, scaletest.Limit,
		"PairWithTargetSum(n=300000, пары нет) — похоже на O(n²) там, где нужен O(n)"+
			" (замер: эталон < 1 мс, перебор ~8.7 с)",
		func() { got = PairWithTargetSum(arr, target) })
	if len(got) != 2 || got[0] != -1 || got[1] != -1 {
		t.Fatalf("PairWithTargetSum = %v, ожидалось [-1 -1]", got)
	}
}

// TestRemoveDuplicatesScales — сложность, а не ответ. Каждое значение встречается
// дважды: 0, 0, 1, 1, … Удаление дубля сдвигом хвоста влево стоит длину хвоста, а
// дублей n/2 — O(n²), в том числе через copy (memmove) и при удалении целого блока
// равных одним сдвигом: блоки здесь длиной 2. Медленный и быстрый указатели — O(n).
func TestRemoveDuplicatesScales(t *testing.T) {
	const n = 300000
	arr := make([]int, n)
	for i := range arr {
		arr[i] = i / 2
	}
	var got int
	scaletest.Within(t, scaletest.Limit,
		"RemoveDuplicates(n=300000, каждое значение дважды) — похоже на O(n²) там, где нужен O(n)"+
			" (замер: эталон < 1 мс, сдвиг хвоста циклом ~7.7 с, через copy ~9.8 с, блоком через copy ~10.3 с)",
		func() { got = RemoveDuplicates(arr) })
	if got != n/2 {
		t.Fatalf("RemoveDuplicates = %d, ожидалось %d", got, n/2)
	}
	for _, i := range []int{0, 1, n/4 + 1, n/2 - 1} {
		if arr[i] != i {
			t.Fatalf("RemoveDuplicates: arr[%d] = %d, ожидалось %d", i, arr[i], i)
		}
	}
}

// TestTripletsSumToZeroScales — сложность, а не ответ. Отрицательные числа вида
// 4t+1 (−3, −7, −11, …): сумма трёх таких ≡ 3 по модулю 4 и нулём не бывает. К ним
// добавлены −12, 4, 8 — единственная тройка с нулевой суммой (у других смесей
// сумма нечётна или ≡ 2 по модулю 4) — и одно огромное P ≡ 1 по модулю 4. Почти
// все суммы отрицательны, а положительной их делает только P в самом конце
// отсортированного массива. Поэтому у перебора троек по отсортированному не
// срабатывает ни одно отсечение: «даже с двумя следующими уже больше нуля» —
// никогда, «даже с самым большим не дотянуться» — никогда (P дотягивает), обрыв k
// на первой сумме > 0 — только на P: O(n³) целиком.
//
// Размер — компромисс: решение O(n²) с множеством (map) на каждом i, верное по
// классу, на этом входе ~0.63 с из-за дорогих операций с картой; вход крупнее
// уронил бы его на медленной машине.
func TestTripletsSumToZeroScales(t *testing.T) {
	const m = 4996
	const big = 4_000_000_001 // ≡ 1 по модулю 4
	arr := make([]int, 0, m+4)
	for v := 1; v <= m; v++ {
		arr = append(arr, -4*v+1)
	}
	arr = append(arr, -12, 4, 8, big)
	// перемешиваем детерминированно, чтобы вход не пришёл уже отсортированным
	for i := range arr {
		j := (i * 7919) % len(arr)
		arr[i], arr[j] = arr[j], arr[i]
	}
	var got [][]int
	scaletest.Within(t, scaletest.Limit,
		"TripletsSumToZero(n=5000, одна тройка) — похоже на O(n³) там, где нужен O(n²)"+
			" (замер: эталон ~8 мс, перебор троек ~6.8 с, он же с отсечениями по отсортированному ~8.3 с,"+
			" O(n²) с множеством на каждом i ~0.63 с — укладывается)",
		func() { got = TripletsSumToZero(arr) })
	if len(got) != 1 || len(got[0]) != 3 || got[0][0] != -12 || got[0][1] != 4 || got[0][2] != 8 {
		t.Fatalf("TripletsSumToZero = %v, ожидалось [[-12 4 8]]", got)
	}
}
