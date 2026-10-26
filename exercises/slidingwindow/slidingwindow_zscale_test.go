package slidingwindow

import (
	"strings"
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

// TestCharacterReplacementScales — сложность, а не ответ. Строка «ABAB…», k = n/4:
// из каждого начала первой половины годное окно тянется на n/2 букв (в нём n/4
// букв меньшинства), поэтому перебор «от каждого начала расширяй, пока замен ≤ k»
// стоит Σ n/2 = O(n²). Отсечение «оставшийся хвост не длиннее лучшего — стоп»
// срабатывает только во второй половине: лучший ответ (n/2 + 1) не длиннее хвостов
// первой. Окно со счётчиком на 26 букв — O(26·n).
func TestCharacterReplacementScales(t *testing.T) {
	const n = 200000
	b := make([]byte, n)
	for i := range b {
		b[i] = "AB"[i%2]
	}
	s := string(b)
	var got int
	scaletest.Within(t, scaletest.Limit,
		"CharacterReplacement(n=200000, «ABAB…», k=50000) — похоже на O(n²) там, где нужен O(n)"+
			" (замер: эталон ~6 мс, перебор начал с отсечением по хвосту ~11.7 с)",
		func() { got = CharacterReplacement(s, n/4) })
	if want := n/2 + 1; got != want {
		t.Fatalf("CharacterReplacement = %d, ожидалось %d", got, want)
	}
}

// TestCheckInclusionScales — сложность, а не ответ. s2 — n букв «a», s1 — n/2 − 1
// букв «a» и одна «b»: перестановки нет. Перебор «для каждого начала сверь счётчики
// окна длиной m» стоит m на окно — O(n·m) = O(n²) при m = n/2, и досрочный выход «буквы
// окна больше, чем в образце, — стоп» не спасает: лишняя «a» обнаруживается только на
// последней букве окна. Окно постоянной длины с [26]int — O(26·n).
func TestCheckInclusionScales(t *testing.T) {
	const n, m = 200000, 100000
	s2 := strings.Repeat("a", n)
	s1 := strings.Repeat("a", m-1) + "b"
	var got bool
	scaletest.Within(t, scaletest.Limit,
		"CheckInclusion(len(s1)=100000, len(s2)=200000, перестановки нет) — похоже на O(n·m) там, где нужен O(n)"+
			" (замер: эталон ~1 мс, перебор окон с выходом на первом лишнем символе ~19.2 с)",
		func() { got = CheckInclusion(s1, s2) })
	if got {
		t.Fatalf("CheckInclusion = true, ожидалось false")
	}
}

// TestLongestOnesScales — сложность, а не ответ. Ряд «1,0,1,0,…», k = n/4: та же
// раскладка, что у CharacterReplacement, — из каждого начала первой половины годное
// окно длиной n/2, и перебор начал с отсечением по хвосту стоит O(n²). Окно со
// счётчиком нулей — O(n).
func TestLongestOnesScales(t *testing.T) {
	const n = 200000
	nums := make([]int, n)
	for i := range nums {
		nums[i] = 1 - i%2
	}
	var got int
	scaletest.Within(t, scaletest.Limit,
		"LongestOnes(n=200000, «1,0,1,0,…», k=50000) — похоже на O(n²) там, где нужен O(n)"+
			" (замер: эталон < 1 мс, перебор начал с отсечением по хвосту ~6.2 с)",
		func() { got = LongestOnes(nums, n/4) })
	if want := n/2 + 1; got != want {
		t.Fatalf("LongestOnes = %d, ожидалось %d", got, want)
	}
}

// TestNumSubarrayProductLessThanKScales — сложность, а не ответ. Одни единицы и
// k = 2: годен каждый из n(n+1)/2 подмассивов, поэтому перебор «от каждого начала
// умножай, пока произведение < k» никогда не выходит досрочно — O(n²). Ответ сам
// порядка n², так что перечислять подмассивы по одному тоже нельзя: окно считает их
// пачкой, right − left + 1 за шаг, — O(n).
func TestNumSubarrayProductLessThanKScales(t *testing.T) {
	const n = 200000
	nums := make([]int, n)
	for i := range nums {
		nums[i] = 1
	}
	var got int
	scaletest.Within(t, scaletest.Limit,
		"NumSubarrayProductLessThanK(n=200000 единиц, k=2) — похоже на O(n²) там, где нужен O(n)"+
			" (замер: эталон < 1 мс, перебор начал с выходом по произведению ~15.3 с)",
		func() { got = NumSubarrayProductLessThanK(nums, 2) })
	if want := n * (n + 1) / 2; got != want {
		t.Fatalf("NumSubarrayProductLessThanK = %d, ожидалось %d", got, want)
	}
}

// TestSubarraysWithKDistinctScales — сложность, а не ответ. Ряд «1,2,1,2,…», k = 2:
// из каждого начала кусок не набирает третьего различного до самого конца, поэтому
// перебор «от каждого начала расширяй, пока различных ≤ k» никогда не выходит
// досрочно — O(n²). Ответ сам порядка n², так что перечислять куски по одному тоже
// нельзя: два окна «не больше k» считают их пачкой — O(n).
func TestSubarraysWithKDistinctScales(t *testing.T) {
	const n = 200000
	nums := make([]int, n)
	for i := range nums {
		nums[i] = i%2 + 1
	}
	var got int
	scaletest.Within(t, scaletest.Limit,
		"SubarraysWithKDistinct(n=200000, «1,2,1,2,…», k=2) — похоже на O(n²) там, где нужен O(n)"+
			" (замер: эталон ~10 мс, перебор начал со счётчиком на массиве и выходом на k+1 различном ~20.7 с)",
		func() { got = SubarraysWithKDistinct(nums, 2) })
	// годны все куски, кроме n одиночных
	if want := n*(n+1)/2 - n; got != want {
		t.Fatalf("SubarraysWithKDistinct = %d, ожидалось %d", got, want)
	}
}

// TestFindAnagramsScales — сложность, а не ответ. s — n букв «a», p — m букв «a»:
// годится каждое из n − m + 1 начал. Перебор «для каждого начала посчитай буквы
// куска длиной m» стоит m на начало — O(n·m) = O(n²) при m = n/2, и досрочный
// выход «лишняя буква — стоп» не срабатывает: лишних нет. Окно постоянной длины
// с [26]int — O(26·n).
func TestFindAnagramsScales(t *testing.T) {
	const n, m = 200000, 100000
	s := strings.Repeat("a", n)
	p := strings.Repeat("a", m)
	var got []int
	scaletest.Within(t, scaletest.Limit,
		"FindAnagrams(len(s)=200000, len(p)=100000, годится каждое начало) — похоже на O(n·m) там, где нужен O(n)"+
			" (замер: эталон ~2 мс, перебор начал с выходом на лишней букве ~16.6 с)",
		func() { got = FindAnagrams(s, p) })
	if len(got) != n-m+1 || got[0] != 0 || got[len(got)-1] != n-m {
		t.Fatalf("FindAnagrams: len=%d, первый=%v, последний=%v; ожидалось len=%d, 0, %d",
			len(got), first(got), last(got), n-m+1, n-m)
	}
}
