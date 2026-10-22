package hashtable

import (
	"math/rand"
	"slices"
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
)

// TestHashMapScales — сложность, а не ответ. Таблица без расширения остаётся
// на четырёх бакетах: цепочки растут до n/4, и Put/Get становятся O(n).
// TestHashMapResize на 100 ключах этого не видит — там цепочки короткие.
func TestHashMapScales(t *testing.T) {
	const n = 300000
	h := NewHashMap()
	bad := -1
	scaletest.Within(t, scaletest.Limit,
		"HashMap: 300000 Put, затем 300000 Get — похоже на O(n) на операцию там, где нужен O(1)"+
			" (таблица не расширяется?) (замер: эталон ~30 мс, без расширения ~9.8 с)",
		func() {
			for k := 0; k < n; k++ {
				h.Put(k, k*2)
			}
			for k := 0; k < n; k++ {
				if v, ok := h.Get(k); !ok || v != k*2 {
					bad = k
					return
				}
			}
		})
	if bad >= 0 {
		t.Fatalf("Get(%d) после Put(%d, %d) вернул не то значение", bad, bad, bad*2)
	}
}

// TestTwoSumScales — сложность, а не ответ. Все числа, кроме двух последних, чётные
// и не меньше 10⁶, последние два — 1 и 3, target = 4: чётное + чётное ≥ 2·10⁶,
// нечётное + чётное нечётно, поэтому пара единственная и стоит в самом конце.
// Перебор пар не спасает ни досрочный выход на найденной паре, ни порядок обхода
// (от i вправо, от j влево): до последней пары он проверит почти все n²/2. Таблица
// виденных чисел — O(n); сортировка индексов по значению с двумя указателями —
// O(n log n), тоже укладывается.
func TestTwoSumScales(t *testing.T) {
	const n = 200000
	nums := make([]int, n)
	for i := 0; i < n-2; i++ {
		nums[i] = 1000000 + 2*i
	}
	nums[n-2], nums[n-1] = 1, 3
	var got []int
	scaletest.Within(t, scaletest.Limit,
		"TwoSum(n=200000, пара в конце) — похоже на O(n²) там, где нужен O(n)"+
			" (замер: эталон ~7 мс, перебор пар ~5.3 с в обоих порядках; сортировка индексов + два указателя ~2 мс)",
		func() { got = TwoSum(nums, 4) })
	if len(got) != 2 || got[0] != n-2 || got[1] != n-1 {
		t.Fatalf("TwoSum = %v, ожидалось [%d %d]", got, n-2, n-1)
	}
}

// TestGroupAnagramsScales — сложность, а не ответ. 10⁵ слов из восьми случайных
// букв в 9·10⁴ группах: у каждой девятой группы есть второе слово — то же задом
// наперёд. Сравнение каждого слова с каждой уже собранной группой (по
// отсортированным буквам или подсчётом) — O(n²): ~4·10⁹ сравнений. Ключ
// «каноническая форма → группа» в map — O(n·k).
func TestGroupAnagramsScales(t *testing.T) {
	const groups = 90000
	rng := rand.New(rand.NewSource(7))
	seen := map[string]bool{}
	words := make([]string, 0, groups+groups/9)
	pairs := 0
	for g := 0; g < groups; {
		b := make([]byte, 8)
		for i := range b {
			b[i] = byte('a' + rng.Intn(26))
		}
		key := sortedKey(b)
		if seen[key] {
			continue // другая группа с теми же буквами — подберём новое слово
		}
		seen[key] = true
		words = append(words, string(b))
		if g%9 == 0 {
			r := slices.Clone(b)
			slices.Reverse(r)
			words = append(words, string(r))
			pairs++
		}
		g++
	}
	rng.Shuffle(len(words), func(i, j int) { words[i], words[j] = words[j], words[i] })
	var got [][]string
	scaletest.Within(t, scaletest.Limit,
		"GroupAnagrams(100000 слов, 90000 групп) — похоже на O(n²) там, где нужен O(n·k)"+
			" (замер: эталон ~35 мс, сравнение с каждой группой ~7.0 с)",
		func() { got = GroupAnagrams(words) })
	if len(got) != groups {
		t.Fatalf("GroupAnagrams: %d групп, ожидалось %d", len(got), groups)
	}
	twos := 0
	for _, g := range got {
		for _, w := range g[1:] {
			if sortedKey([]byte(w)) != sortedKey([]byte(g[0])) {
				t.Fatalf("GroupAnagrams: в группе %q слова из разных букв", g)
			}
		}
		if len(g) == 2 {
			twos++
		}
	}
	if twos != pairs {
		t.Fatalf("GroupAnagrams: групп из двух слов %d, ожидалось %d", twos, pairs)
	}
}

// sortedKey — буквы слова по алфавиту (только для проверки ответа теста).
func sortedKey(b []byte) string {
	c := slices.Clone(b)
	slices.Sort(c)
	return string(c)
}

// TestLongestConsecutiveScales — сложность, а не ответ. Два входа.
// (1) Числа 0…n−1 вперемешку: подсчёт цепочки от КАЖДОГО x вверх, без проверки
// «нет ли x−1», проходит n + (n−1) + … — O(n²), даже через множество.
// (2) Цепочка 0…n/2−1 и ещё n/2 копий её начала 0: решение с проверкой x−1, но
// обходящее nums, а не множество, пересчитывает цепочку длиной n/2 от каждой
// копии — снова O(n²). Сортировка — O(n log n) — укладывается: это другой класс
// лишь на log, тест его не ловит и не должен.
func TestLongestConsecutiveScales(t *testing.T) {
	const n = 200000
	rng := rand.New(rand.NewSource(11))
	perm := rng.Perm(n)
	starts := make([]int, n)
	for i := 0; i < n/2; i++ {
		starts[i] = i
	}
	rng.Shuffle(len(starts), func(i, j int) { starts[i], starts[j] = starts[j], starts[i] })
	for _, tc := range []struct {
		name string
		nums []int
		want int
		why  string
	}{
		{"0…n−1 вперемешку", perm, n,
			"(цепочка считается от каждого x, а не только от начала?) (замер: эталон ~13 мс, без проверки x−1 > 40 с)"},
		{"цепочка n/2 и n/2 копий её начала", starts, n / 2,
			"(обход nums вместо множества — копии начала пересчитывают цепочку?) (замер: эталон ~8 мс, обход nums > 40 с)"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			var got int
			scaletest.Within(t, scaletest.Limit,
				"LongestConsecutive(n=200000, "+tc.name+") — похоже на O(n²) там, где нужен O(n) "+tc.why,
				func() { got = LongestConsecutive(tc.nums) })
			if got != tc.want {
				t.Fatalf("LongestConsecutive = %d, ожидалось %d", got, tc.want)
			}
		})
	}
}

// TestFirstUniqueCharScales — сложность, а не ответ. Первая половина — буквы a…y по
// кругу, вторая — одна z. Уникальной буквы нет (ответ −1), так что перебор
// проверяет каждую позицию. Подсчёт буквы по всей строке на каждой позиции —
// O(n²), в том числе через strings.Count. Поиск ПЕРВОГО повтора с досрочным выходом
// на половине из z тоже O(n²): первая z стоит на n/2, и до неё доходит каждый поиск.
// Счётчик букв — два прохода, O(n).
func TestFirstUniqueCharScales(t *testing.T) {
	const n = 1000000
	b := make([]byte, n)
	for i := range b {
		if i < n/2 {
			b[i] = byte('a' + i%25)
		} else {
			b[i] = 'z'
		}
	}
	s := string(b)
	got := 0
	scaletest.Within(t, scaletest.Limit,
		"FirstUniqueChar(n=10⁶, уникальной нет) — похоже на O(n²) там, где нужен O(n)"+
			" (замер: эталон ~2 мс, strings.Count на каждой позиции ~12.9 с, поиск первого повтора и IndexByte/LastIndexByte > 40 с)",
		func() { got = FirstUniqueChar(s) })
	if got != -1 {
		t.Fatalf("FirstUniqueChar = %d, ожидалось -1", got)
	}
}
