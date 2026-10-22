package strmatch

import (
	"slices"
	"strings"
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
)

// Худший вход наивного поиска — из верхних границ «Ограничений»: текст длины
// 2·10⁶ из одних «a», в конце образец a…a b a…a длины 10⁶−1 (b — посередине).
// Наивный поиск сверяет образец с каждым из ~10⁶ окон текста, и каждое окно
// совпадает до самой b — 5·10⁵ символов: 5·10¹¹ сравнений. Буква b посередине,
// а не в конце, — против проверки «сначала первый и последний символ окна»
// и сравнения с конца: у всех окон они совпадают. Сравнение окна целиком
// (text[i:i+m] == pattern) идёт векторно и всё равно стоит секунды.
// KMP, Z-функция и rolling hash — O(n + m).
const (
	scaleText = 2000000
	scaleHalf = 499999 // по обе стороны от b: образец длины 10⁶−1
)

func scaleInput() (text, pattern string) {
	half := strings.Repeat("a", scaleHalf)
	pattern = half + "b" + half
	return strings.Repeat("a", scaleText-len(pattern)) + pattern, pattern
}

// единственное вхождение — в самом конце текста
const scaleAt = scaleText - 2*scaleHalf - 1

func TestKMPSearchScales(t *testing.T) {
	text, pattern := scaleInput()
	var got int
	scaletest.Within(t, scaletest.Limit,
		"KMPSearch(text=a…a + образец, n=2·10⁶; pattern=a…a b a…a, m=10⁶−1) — похоже на O(n·m) там, где нужен O(n+m)"+
			" (замер: эталон ~6 мс, сравнение окон целиком ~10.7 с, посимвольно с проверкой краёв > 60 с)",
		func() { got = KMPSearch(text, pattern) })
	if got != scaleAt {
		t.Fatalf("KMPSearch = %d, ожидалось %d", got, scaleAt)
	}
}

func TestRabinKarpScales(t *testing.T) {
	text, pattern := scaleInput()
	var got int
	scaletest.Within(t, scaletest.Limit,
		"RabinKarp(text=a…a + образец, n=2·10⁶; pattern=a…a b a…a, m=10⁶−1) — похоже на O(n·m) там, где нужен O(n+m)"+
			" (замер: эталон ~11 мс, сверка окон без хеша ~10.7 с)",
		func() { got = RabinKarp(text, pattern) })
	if got != scaleAt {
		t.Fatalf("RabinKarp = %d, ожидалось %d", got, scaleAt)
	}
}

func TestCountOccurrencesScales(t *testing.T) {
	text, pattern := scaleInput()
	var got int
	scaletest.Within(t, scaletest.Limit,
		"CountOccurrences(text=a…a + образец, n=2·10⁶; pattern=a…a b a…a, m=10⁶−1) — похоже на O(n·m) там, где нужен O(n+m)"+
			" (замер: эталон ~6 мс, сравнение окон ~10.6 с)",
		func() { got = CountOccurrences(text, pattern) })
	if got != 1 {
		t.Fatalf("CountOccurrences = %d, ожидалось 1", got)
	}
}

func TestZSearchScales(t *testing.T) {
	text, pattern := scaleInput()
	var got []int
	scaletest.Within(t, scaletest.Limit,
		"ZSearch(text=a…a + образец, n=2·10⁶; pattern=a…a b a…a, m=10⁶−1) — похоже на O(n·m) там, где нужен O(n+m)"+
			" (замер: эталон ~22 мс, сравнение окон ~10.7 с, Z-функция без отрезка [l, r) > 60 с)",
		func() { got = ZSearch(text, pattern) })
	if !slices.Equal(got, []int{scaleAt}) {
		t.Fatalf("ZSearch = %v, ожидалось [%d]", got, scaleAt)
	}
}

// TestLongestPrefixSuffixScales — s = a…a b a…a длины 2·10⁶−1: ответ — 10⁶−1.
// Перебор длин L от большей к меньшей сверяет s[:L] с s[n−L:] и до ответа
// проходит 10⁶ длин, каждая совпадает до b; перебор от меньшей — все 2·10⁶ длин.
// O(n²) против O(n) префикс-функции.
func TestLongestPrefixSuffixScales(t *testing.T) {
	const half = scaleText/2 - 1
	s := strings.Repeat("a", half) + "b" + strings.Repeat("a", half)
	var got int
	scaletest.Within(t, scaletest.Limit,
		"LongestPrefixSuffix(s=a…a b a…a, n=2·10⁶−1) — похоже на O(n²) там, где нужен O(n)"+
			" (замер: эталон ~4 мс, перебор длин сверху ~10.5 с, снизу ~23.5 с)",
		func() { got = LongestPrefixSuffix(s) })
	if got != half {
		t.Fatalf("LongestPrefixSuffix = %d, ожидалось %d", got, half)
	}
}
