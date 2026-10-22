package intervals

import (
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
)

// TestMinMeetingRoomsScales — сложность, а не ответ. Все встречи попарно
// пересекаются ([i, i+n]), комнат нужно n: поиск свободной комнаты перебором
// всех занятых — O(n²). Две отсортированные последовательности или куча
// концов — O(n log n).
func TestMinMeetingRoomsScales(t *testing.T) {
	const n = 200000
	in := make([][]int, n)
	for i := range in {
		in[i] = []int{i, i + n}
	}
	var got int
	scaletest.Within(t, scaletest.Limit,
		"MinMeetingRooms(n=200000, все встречи пересекаются) — похоже на O(n²) там, где нужен O(n log n)"+
			" (замер: эталон ~2 мс, перебор ~7.7 с)",
		func() { got = MinMeetingRooms(in) })
	if got != n {
		t.Fatalf("MinMeetingRooms = %d, ожидалось %d", got, n)
	}
}

// descendingDisjoint — n непересекающихся интервалов [2i, 2i+1] в порядке
// убывания начал: худший вход и для слияния «каждый с каждым» (сливать нечего,
// проверяются все пары), и для сортировки вставками (каждый новый — в самое начало).
func descendingDisjoint(n int) [][]int {
	in := make([][]int, n)
	for i := range in {
		s := 2 * (n - 1 - i)
		in[i] = []int{s, s + 1}
	}
	return in
}

// TestMergeIntervalsScales — сложность, а не ответ. Интервалы не пересекаются и
// идут по убыванию: слияние попарным сравнением всех интервалов — O(n²), и
// сортировка вставками перед линейным проходом — тоже O(n²). Сортировка по
// началу и один проход — O(n log n).
func TestMergeIntervalsScales(t *testing.T) {
	const n = 200000
	in := descendingDisjoint(n)
	var got [][]int
	scaletest.Within(t, scaletest.Limit,
		"MergeIntervals(n=200000 непересекающихся по убыванию) — похоже на O(n²) там, где нужен O(n log n)"+
			" (замер: эталон ~20 мс, слияние каждый с каждым > 400 с, сортировка вставками ~37 с)",
		func() { got = MergeIntervals(in) })
	if len(got) != n || got[0][0] != 0 || got[n-1][0] != 2*(n-1) {
		t.Fatalf("MergeIntervals: %d интервалов, ожидалось %d по возрастанию начал от 0 до %d",
			len(got), n, 2*(n-1))
	}
}

// TestInsertIntervalScales — сложность, а не ответ. Новый интервал накрывает
// первую половину списка: удаление поглощённых по одному сдвигом хвоста
// (append(s[:i], s[i+1:]...)) — O(n) на удаление и O(n²) на всё. Три прохода
// с новым срезом — O(n).
func TestInsertIntervalScales(t *testing.T) {
	const n = 200000
	in := make([][]int, n)
	for i := range in {
		in[i] = []int{2 * i, 2*i + 1}
	}
	var got [][]int
	scaletest.Within(t, scaletest.Limit,
		"InsertInterval(n=200000, новый интервал накрывает первую половину) — похоже на O(n²) там, где нужен O(n)"+
			" (замер: эталон ~3 мс, удаление сдвигом ~17.7 с)",
		func() { got = InsertInterval(in, []int{0, n - 1}) })
	// [0, n−1] поглощает [2i, 2i+1] при 2i ≤ n−1, то есть первые n/2 интервалов
	if want := 1 + n/2; len(got) != want || got[0][0] != 0 || got[0][1] != n-1 || got[1][0] != n {
		t.Fatalf("InsertInterval: %d интервалов, первые %v; ожидалось %d, [0 %d] и затем [%d %d]",
			len(got), got[:min(2, len(got))], want, n-1, n, n+1)
	}
}

// TestIntervalsIntersectionScales — сложность, а не ответ. Каждый a[i] = [4i, 4i+2]
// пересекается ровно с b[i] = [4i+1, 4i+3]: сравнение всех пар — O(n·m), а перебор
// b с начала до первого, начавшегося после конца a[i], — всё ещё O(n·m/2).
// Два указателя — O(n + m).
func TestIntervalsIntersectionScales(t *testing.T) {
	const n = 200000
	a := make([][]int, n)
	b := make([][]int, n)
	for i := range a {
		a[i] = []int{4 * i, 4*i + 2}
		b[i] = []int{4*i + 1, 4*i + 3}
	}
	var got [][]int
	scaletest.Within(t, scaletest.Limit,
		"IntervalsIntersection(n=m=200000, каждый пересекается с одним) — похоже на O(n·m) там, где нужен O(n + m)"+
			" (замер: эталон ~15 мс, все пары ~88 с, перебор с выходом по началу ~28 с)",
		func() { got = IntervalsIntersection(a, b) })
	if len(got) != n || got[0][0] != 1 || got[0][1] != 2 || got[n-1][0] != 4*(n-1)+1 {
		t.Fatalf("IntervalsIntersection: %d пересечений, ожидалось %d вида [4i+1, 4i+2]", len(got), n)
	}
}

// TestCanAttendAllMeetingsScales — сложность, а не ответ. Встречи только касаются
// границами и идут по убыванию: ответ true, и проверка всех пар не выходит
// досрочно — O(n²); сортировка вставками на убывающем входе — тоже O(n²).
// Сортировка и сравнение соседей — O(n log n).
func TestCanAttendAllMeetingsScales(t *testing.T) {
	const n = 200000
	in := make([][]int, n)
	for i := range in {
		s := n - 1 - i
		in[i] = []int{s, s + 1}
	}
	var got bool
	scaletest.Within(t, scaletest.Limit,
		"CanAttendAllMeetings(n=200000 встреч встык по убыванию) — похоже на O(n²) там, где нужен O(n log n)"+
			" (замер: эталон ~3 мс, все пары ~17.8 с, сортировка вставками ~37 с)",
		func() { got = CanAttendAllMeetings(in) })
	if !got {
		t.Fatal("CanAttendAllMeetings(встречи встык) = false, ожидалось true: касание — не наложение")
	}
}
