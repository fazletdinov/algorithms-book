package cyclicsort

import (
	"slices"
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
)

// scaleN — размер входа тестов масштаба: верхняя граница из «Ограничений».
const scaleN = 300000

// mix — детерминированная перестановка 0..n−1: шаг, взаимно простой с n,
// раскидывает соседние числа по всему массиву.
func mix(n int) []int {
	const step = 7919 // простое, не делит scaleN
	p := make([]int, n)
	for i := range p {
		p[i] = i * step % n
	}
	return p
}

// TestCyclicSortScales — сложность, а не ответ. Убывающий ряд — худший вход для
// сортировок обменами соседей и вставками (n²/2 сдвигов); выбор минимума — n²/2
// сравнений на любом входе. Циклическая сортировка — O(n): каждый обмен ставит
// одно число на место навсегда.
func TestCyclicSortScales(t *testing.T) {
	nums := make([]int, scaleN)
	for i := range nums {
		nums[i] = scaleN - i
	}
	scaletest.Within(t, scaletest.Limit,
		"CyclicSort(n=300000, убывающий ряд) — похоже на O(n²) там, где нужен O(n)"+
			" (замер: эталон < 1 мс, вставки ~57 с, выбор минимума ~25 с)",
		func() { CyclicSort(nums) })
	for i, v := range nums {
		if v != i+1 {
			t.Fatalf("CyclicSort: nums[%d] = %d, ожидалось %d", i, v, i+1)
		}
	}
}

// TestFindMissingNumberScales — сложность, а не ответ. Поиск каждого кандидата
// 0, 1, 2, … проходом по массиву — O(n) на кандидата. Пропущено среднее число,
// а малые и большие числа вперемешку по всему массиву, поэтому до ответа
// идут n/2 кандидатов с поиском в среднем на полмассива — с какого конца
// диапазона ни начинать. Раскладка по местам — O(n).
func TestFindMissingNumberScales(t *testing.T) {
	const missing = scaleN / 2
	nums := make([]int, 0, scaleN)
	for _, v := range mix(scaleN + 1) {
		if v != missing {
			nums = append(nums, v)
		}
	}
	var got int
	scaletest.Within(t, scaletest.Limit,
		"FindMissingNumber(n=300000, пропущено n/2, числа вперемешку) — похоже на O(n²) там, где нужен O(n)"+
			" (замер: эталон ~7 мс, поиск кандидатов проходом снизу и сверху ~5.8 с)",
		func() { got = FindMissingNumber(nums) })
	if got != missing {
		t.Fatalf("FindMissingNumber = %d, ожидалось %d", got, missing)
	}
}

// TestFindAllMissingNumbersScales — сложность, а не ответ. Числа 1..n/2 по два
// раза, вперемешку: отсутствует вся верхняя половина. Проверка каждого числа
// 1..n проходом по массиву — n/2 полных проходов впустую, O(n²). Раскладка по
// местам — O(n).
func TestFindAllMissingNumbersScales(t *testing.T) {
	nums := make([]int, scaleN)
	for i, p := range mix(scaleN) {
		nums[i] = p/2 + 1
	}
	var got []int
	scaletest.Within(t, scaletest.Limit,
		"FindAllMissingNumbers(n=300000, числа 1..n/2 по два раза) — похоже на O(n²) там, где нужен O(n)"+
			" (замер: эталон ~4 мс, проверка каждого числа проходом ~15 с)",
		func() { got = FindAllMissingNumbers(nums) })
	if len(got) != scaleN/2 || got[0] != scaleN/2+1 || got[len(got)-1] != scaleN {
		t.Fatalf("FindAllMissingNumbers: len=%d, ожидалось %d чисел от %d до %d",
			len(got), scaleN/2, scaleN/2+1, scaleN)
	}
}

// TestFindDuplicateScales — сложность, а не ответ. Перебор пар i < j — O(n²); с
// досрочным выходом он всё равно доходит до повтора, а повтор стоит в середине
// массива двумя соседями — n/2 полных проходов, с какого конца ни начинать.
// Подсчёт каждого значения 1, 2, … проходом — то же: повторяется среднее.
// Раскладка по местам — O(n).
func TestFindDuplicateScales(t *testing.T) {
	const dup = scaleN / 2
	nums := make([]int, 0, scaleN+1)
	for _, p := range mix(scaleN) {
		nums = append(nums, p+1)
	}
	// повтор dup — рядом с его единственной копией, в середине массива
	mid := slices.Index(nums, dup)
	nums[mid], nums[scaleN/2] = nums[scaleN/2], nums[mid]
	nums = slices.Insert(nums, scaleN/2+1, dup)
	var got int
	scaletest.Within(t, scaletest.Limit,
		"FindDuplicate(n=300000, повтор — среднее число, две копии рядом в середине) — похоже на O(n²) там, где нужен O(n)"+
			" (замер: эталон ~8 мс, перебор пар с начала и с конца ~8.6 с, подсчёт каждого значения ~11.4 с)",
		func() { got = FindDuplicate(nums) })
	if got != dup {
		t.Fatalf("FindDuplicate = %d, ожидалось %d", got, dup)
	}
}

// TestFindAllDuplicatesScales — сложность, а не ответ. Числа 1..n/2 по два раза:
// каждое из них — дубликат. Перебор пар или подсчёт каждого числа проходом —
// O(n²), досрочно выйти нельзя: ответ — все n/2 чисел. Раскладка по местам — O(n).
func TestFindAllDuplicatesScales(t *testing.T) {
	nums := make([]int, scaleN)
	for i, p := range mix(scaleN) {
		nums[i] = p/2 + 1
	}
	var got []int
	scaletest.Within(t, scaletest.Limit,
		"FindAllDuplicates(n=300000, числа 1..n/2 по два раза) — похоже на O(n²) там, где нужен O(n)"+
			" (замер: эталон ~13 мс, перебор пар ~8.3 с, подсчёт каждого числа ~28 с)",
		func() { got = FindAllDuplicates(nums) })
	if len(got) != scaleN/2 || got[0] != 1 || got[len(got)-1] != scaleN/2 {
		t.Fatalf("FindAllDuplicates: len=%d, ожидалось %d чисел от 1 до %d", len(got), scaleN/2, scaleN/2)
	}
}
