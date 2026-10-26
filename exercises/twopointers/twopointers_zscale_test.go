package twopointers

import (
	"strings"
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

// TestMoveZeroesScales — сложность, а не ответ. Нули через один: 0, 1, 0, 1, …
// Удаление нуля сдвигом хвоста влево (и запись нуля в конец) стоит длину хвоста, а
// нулей n/2 — O(n²), в том числе через copy (memmove). Разведчик и граница — O(n).
func TestMoveZeroesScales(t *testing.T) {
	const n = 300000
	arr := make([]int, n)
	for i := range arr {
		arr[i] = i % 2 * (i/2 + 1) // 0, 1, 0, 2, 0, 3, …
	}
	scaletest.Within(t, scaletest.Limit,
		"MoveZeroes(n=300000, нули через один) — похоже на O(n²) там, где нужен O(n)"+
			" (замер: эталон < 1 мс, сдвиг хвоста через copy ~11 с)",
		func() { MoveZeroes(arr) })
	for _, i := range []int{0, n/4 - 1, n/2 - 1} {
		if arr[i] != i+1 {
			t.Fatalf("MoveZeroes: arr[%d] = %d, ожидалось %d", i, arr[i], i+1)
		}
	}
	if arr[n/2] != 0 || arr[n-1] != 0 {
		t.Fatalf("MoveZeroes: вторая половина должна быть из нулей, arr[%d] = %d, arr[%d] = %d",
			n/2, arr[n/2], n-1, arr[n-1])
	}
}

// TestMaxAreaScales — сложность, а не ответ. Высоты убывают: height[i] = n − i.
// Перебор всех пар — O(n²). Перебор с отсечением «даже при ширине j − i выше
// height[i] не поднимется — дальше j не идём» (j от правого края) тоже O(n²): лучшая
// площадь n²/4 находится сразу, но для каждого i < n/2 он ещё перебирает примерно
// (n − i) − n²/(4(n − i)) стенок — в сумме около 0.2·n². Стенки с двух концов — O(n).
func TestMaxAreaScales(t *testing.T) {
	const n = 300000
	h := make([]int, n)
	for i := range h {
		h[i] = n - i
	}
	var got int
	scaletest.Within(t, scaletest.Limit,
		"MaxArea(n=300000, убывающие высоты) — похоже на O(n²) там, где нужен O(n)"+
			" (замер: эталон < 1 мс, перебор пар ~5.9 с, он же с отсечением по высоте ~12.5 с)",
		func() { got = MaxArea(h) })
	// лучшая пара — 0 и n/2: min = n/2, ширина n/2
	if want := n / 2 * (n / 2); got != want {
		t.Fatalf("MaxArea = %d, ожидалось %d", got, want)
	}
}

// TestMergeSortedScales — сложность, а не ответ. Все числа nums2 меньше всех чисел
// nums1: вставка каждого в начало со сдвигом значимой части nums1 вправо стоит m —
// O(m·n), в том числе через copy (memmove). Слияние с конца — O(m + n). Не ловит
// склейку с сортировкой (лишний log, ~4 мс) и слияние с начала через копию nums1 —
// то же O(m + n); копию ловит TestMergeSortedNoAllocs.
func TestMergeSortedScales(t *testing.T) {
	const m, n = 300000, 300000
	nums1 := make([]int, m+n)
	nums2 := make([]int, n)
	for i := 0; i < m; i++ {
		nums1[i] = n + i
	}
	for i := range nums2 {
		nums2[i] = i
	}
	scaletest.Within(t, scaletest.Limit,
		"MergeSorted(m=300000, n=300000, nums2 целиком меньше) — похоже на O(m·n) там, где нужен O(m + n)"+
			" (замер: эталон < 1 мс, вставка со сдвигом через copy ~77 с)",
		func() { MergeSorted(nums1, m, nums2, n) })
	for _, i := range []int{0, n - 1, n, m + n - 1} {
		if nums1[i] != i {
			t.Fatalf("MergeSorted: nums1[%d] = %d, ожидалось %d", i, nums1[i], i)
		}
	}
}

// TestIsSubsequenceScales — сложность, а не ответ. t — n букв «a», s — n − 1 букв «a»
// и «b» в конце: ответ «нет» выясняется только на последней букве. Решение через
// таблицу общей подпоследовательности (LCS: «длина общей подпоследовательности
// равна len(s)?») стоит len(s)·len(t) — O(n²). Указатель по каждой строке — O(n).
func TestIsSubsequenceScales(t *testing.T) {
	const n = 100000
	tt := strings.Repeat("a", n)
	s := strings.Repeat("a", n-1) + "b"
	var got bool
	scaletest.Within(t, scaletest.Limit,
		"IsSubsequence(len(s)=100000, len(t)=100000) — похоже на O(len(s)·len(t)) там, где нужен O(len(s) + len(t))"+
			" (замер: эталон < 1 мс, таблица LCS в две строки ~7.9 с)",
		func() { got = IsSubsequence(s, tt) })
	if got {
		t.Fatalf("IsSubsequence = true, ожидалось false")
	}
}

// TestIntersectSortedScales — сложность, а не ответ. Оба массива — 0, 1, …, n−1.
// Перебор «для каждого числа nums1 ищи во nums2 с начала ещё не взятое равное» идёт
// до позиции i, даже с выходом на первом большем — Σ i = O(n²). Указатель по
// каждому массиву — O(n); хеш-таблица счётчиков — тоже O(n) (лишняя память тест
// не ловит).
func TestIntersectSortedScales(t *testing.T) {
	const n = 200000
	a := make([]int, n)
	for i := range a {
		a[i] = i
	}
	var got []int
	scaletest.Within(t, scaletest.Limit,
		"IntersectSorted(n=200000 и n=200000, массивы равны) — похоже на O(n·m) там, где нужен O(n + m)"+
			" (замер: эталон ~2 мс, перебор с выходом на первом большем ~8 с)",
		func() { got = IntersectSorted(a, a) })
	if len(got) != n || got[0] != 0 || got[n-1] != n-1 {
		t.Fatalf("IntersectSorted: len=%d, ожидалось %d (весь массив)", len(got), n)
	}
}

// TestThreeSumClosestScales — сложность, а не ответ. Числа 0, 2, 4, …: все суммы
// чётные, а target нечётный и стоит посреди диапазона сумм — точного попадания нет,
// досрочного выхода тоже. Перебор троек — O(n³); он же по отсортированному с
// обрывом k на первой сумме больше target всё равно O(n³): для малых i и j до
// target ещё далеко. Сортировка и два указателя на каждое i — O(n²).
func TestThreeSumClosestScales(t *testing.T) {
	const n = 5000
	nums := make([]int, n)
	for i := range nums {
		nums[i] = 2 * (n - 1 - i) // по убыванию — чтобы вход не пришёл отсортированным
	}
	target := 3*n + 1 // нечётный; ближайшие чётные 3n и 3n+2 — ничья, ответ меньшая
	var got int
	scaletest.Within(t, scaletest.Limit,
		"ThreeSumClosest(n=5000, точного попадания нет) — похоже на O(n³) там, где нужен O(n²)"+
			" (замер: эталон ~25 мс, перебор троек ~23.8 с, он же с обрывом k по отсортированному ~11.3 с)",
		func() { got = ThreeSumClosest(nums, target) })
	if got != 3*n {
		t.Fatalf("ThreeSumClosest = %d, ожидалось %d", got, 3*n)
	}
}
