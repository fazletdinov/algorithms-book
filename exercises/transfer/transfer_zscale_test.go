package transfer

import (
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
)

// TestProcessingOrderScales — сложность, а не ответ. Задачи поступают по одной
// каждую единицу времени, а длятся долго: очередь ждущих растёт до ~n/2, и выбор
// кратчайшей перебором ждущих стоит O(n) на задачу, O(n²) всего.
func TestProcessingOrderScales(t *testing.T) {
	const n = 100000
	tasks := make([][]int, n)
	for i := range tasks {
		// Длительности вперемешку: отсортированный срез ждущих со вставкой сдвигом
		// двигал бы на каждой вставке половину среза.
		tasks[i] = []int{1 + i, 2 + (i*7919)%1000}
	}
	var got []int
	scaletest.Within(t, scaletest.Limit,
		"ProcessingOrder(n=100000, задачи копятся в очереди) — похоже на O(n²) там, где нужен O(n log n)"+
			" (замер: эталон ~45 мс; выбор кратчайшей перебором ждущих ~8.8 с,"+
			" отсортированный срез ждущих со вставкой сдвигом ~9.0 с)",
		func() { got = ProcessingOrder(tasks) })
	if len(got) != n || got[0] != 0 {
		t.Fatalf("ProcessingOrder: длина %d, первая задача %v — ожидалось %d задач, первой — 0", len(got), got[:min(1, len(got))], n)
	}
}

// TestIslandCountsScales — сложность, а не ответ. Сначала суша «шахматкой» (каждая
// клетка — отдельный остров), затем остальные клетки по строкам: острова сливаются
// в один растущий. Пересчёт островов обходом после каждого запроса — O(m·n) на
// запрос; перекраска всего острова при каждом слиянии — тоже квадрат.
func TestIslandCountsScales(t *testing.T) {
	const m, n = 316, 316
	cells := make([][]int, 0, m*n)
	for pass := 0; pass < 2; pass++ {
		for r := 0; r < m; r++ {
			for c := 0; c < n; c++ {
				if (r+c)%2 == pass {
					cells = append(cells, []int{r, c})
				}
			}
		}
	}
	var got []int
	scaletest.Within(t, scaletest.Limit,
		"IslandCounts(316×316, k≈10⁵) — похоже на пересчёт островов после каждого запроса там, где нужен O(m·n + k)"+
			" (замер: эталон ~2 мс; перекраска острова новой клетки обходом ~3 мин,"+
			" обход всей карты после каждого запроса — больше 3 мин)",
		func() { got = IslandCounts(m, n, cells) })
	half := (m*n + 1) / 2
	if len(got) != m*n || got[half-1] != half || got[len(got)-1] != 1 {
		t.Fatalf("IslandCounts: после шахматки %d островов, в конце %d — ожидалось %d и 1", got[half-1], got[len(got)-1], half)
	}
}

// TestMaxMinGapScales — сложность, а не ответ. Места плотно у начала и одно далеко:
// ответ ~2·10⁵, а верхняя граница (max−min)/(k−1) — 5·10⁸. Перебор длины подряд
// (от 1 вверх или от границы вниз) с жадной проверкой — 10⁵ и больше проверок по n.
func TestMaxMinGapScales(t *testing.T) {
	const n = 100000
	points := make([]int, n)
	for i := 0; i < n-1; i++ {
		points[i] = 2 * i
	}
	points[n-1] = 1000000000
	var got int
	scaletest.Within(t, scaletest.Limit,
		"MaxMinGap(n=100000, k=3, ответ ~2·10⁵) — похоже на перебор длины подряд там, где нужен двоичный поиск по ответу"+
			" (замер: эталон ~1 мс; перебор от 1 вверх с досрочным выходом ~7.8 с,"+
			" от верхней границы вниз — больше 3 мин)",
		func() { got = MaxMinGap(points, 3) })
	if want := 2 * (n - 2); got != want {
		t.Fatalf("MaxMinGap = %d, ожидалось %d", got, want)
	}
}

// TestShortestRemovalScales — сложность, а не ответ. Все чеки по 1, p больше суммы:
// подходит только весь массив, ответ −1, и перебор всех кусков (даже по длине с
// досрочным выходом) честно проходит все n²/2 кусков.
func TestShortestRemovalScales(t *testing.T) {
	const n = 100000
	nums := make([]int, n)
	for i := range nums {
		nums[i] = 1
	}
	var got int
	scaletest.Within(t, scaletest.Limit,
		"ShortestRemoval(n=100000, подходит только весь массив) — похоже на O(n²) там, где нужен O(n)"+
			" (замер: эталон ~6 мс; перебор кусков через суммы с начала массива ~12.7 с,"+
			" по длине вверх с досрочным выходом — тоже ~12.7 с)",
		func() { got = ShortestRemoval(nums, 1000000000) })
	if got != -1 {
		t.Fatalf("ShortestRemoval = %d, ожидалось -1", got)
	}
}

// TestMaxDistinctSumScales — сложность, а не ответ. Все числа разные, k = n/2:
// проверка «все ли разные» заново для каждого отрезка стоит k на отрезок, O(n·k).
func TestMaxDistinctSumScales(t *testing.T) {
	const n, k = 100000, 50000
	nums := make([]int, n)
	for i := range nums {
		nums[i] = 1 + (i*7919)%n // перестановка 1…n: все разные, суммы отрезков разные
	}
	var got int
	scaletest.Within(t, scaletest.Limit,
		"MaxDistinctSum(n=100000, k=50000, все разные) — похоже на O(n·k) там, где нужен O(n)"+
			" (замер: эталон ~6 мс; новое множество на каждый отрезок ~60 с)",
		func() { got = MaxDistinctSum(nums, k) })
	if got <= 0 {
		t.Fatalf("MaxDistinctSum = %d, ожидалось положительное: все числа разные", got)
	}
}
