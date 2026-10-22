package ahocorasick

import (
	"slices"
	"strings"
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
)

// Входы тестов масштаба. Два медленных класса — два входа.
//
// Много шаблонов: 10⁴ шаблонов длины 71 — общий случайный префикс из 64 букв
// {a, b, c, d} и свой хвост из 7 букв (номер шаблона в четверичной записи), текст
// 5·10⁵ случайных букв того же алфавита. Отдельный проход по тексту на каждый
// шаблон (как NaiveFindAll) — O(n·k). Шаблон длиннее 63 байт, а первая буква
// встречается каждые 4 байта, поэтому strings.Index быстро уходит в Rabin–Karp
// по всему тексту; общий префикс держит Trie маленьким (~1.3·10⁴ узлов), и
// эталон на map-переходах укладывается в десятки миллисекунд.
//
// Длинный шаблон: a…a длины 3·10⁴ на тексте a…a длины 6·10⁴. Trie без ссылок
// неудачи, который с каждой позиции текста идёт от корня заново, — O(n·m);
// ссылки неудачи, которые ищут суффикс заново от корня, — O(m²) на построение.
const (
	scaleK      = 10000
	scaleN      = 500000
	scalePrefix = 64
	scaleTail   = 7 // 4⁷ = 16384 ≥ scaleK: хвосты различны
	scaleLongM  = 30000
)

// scaleWords — шаблоны, текст без вхождений и тот же текст с вписанным каждым
// сотым шаблоном. Всё детерминировано (xorshift с фиксированным зерном).
func scaleWords() (clean, text string, pats []string) {
	next := xorshift(20261022)
	buf := make([]byte, scaleN)
	for i := range buf {
		buf[i] = 'a' + byte(next()%4)
	}
	clean = string(buf)
	prefix := make([]byte, scalePrefix)
	for i := range prefix {
		prefix[i] = 'a' + byte(next()%4)
	}
	pats = make([]string, scaleK)
	for i := range pats {
		w := append([]byte{}, prefix...)
		for d, x := 0, i; d < scaleTail; d++ {
			w = append(w, 'a'+byte(x%4))
			x /= 4
		}
		pats[i] = string(w)
		if i%100 == 0 {
			copy(buf[int(next()%uint32(scaleN-len(w))):], w)
		}
	}
	return clean, string(buf), pats
}

// scaleModel — все вхождения через словарь «строка → номера шаблонов»: все
// шаблоны одной длины, поэтому на каждой позиции текста один поиск. Модель не
// зависит ни от автомата, ни от strings.Index и сама идёт миллисекунды.
func scaleModel(text string, pats []string) []Match {
	byWord := map[string][]int{}
	for p, w := range pats {
		byWord[w] = append(byWord[w], p)
	}
	l := len(pats[0])
	var out []Match
	for i := 0; i+l <= len(text); i++ {
		for _, p := range byWord[text[i:i+l]] {
			out = append(out, Match{Pattern: p, Start: i})
		}
	}
	SortMatches(out)
	return out
}

// TestAutomatonManyPatternsScales — сложность, а не ответ: 10⁴ шаблонов, один
// проход автомата против прохода на каждый шаблон. ContainsAny — на тексте без
// вхождений: досрочно выйти ему негде, и strings.Contains по каждому шаблону —
// те же O(n·k).
func TestAutomatonManyPatternsScales(t *testing.T) {
	clean, text, pats := scaleWords()
	want := scaleModel(text, pats) // модель — до замера, вне срока
	if len(want) == 0 || len(scaleModel(clean, pats)) != 0 {
		t.Fatal("вход теста испорчен: в тексте нет вписанных шаблонов или они есть в чистом")
	}
	var got []Match
	var any bool
	scaletest.Within(t, scaletest.Limit,
		"Automaton: 10⁴ шаблонов длины 71, текст 5·10⁵ байт над {a,b,c,d} — NewAutomaton, FindAll и ContainsAny"+
			" на тексте без вхождений — похоже на O(n·k) там, где нужен O(n + Σm + z)"+
			" (замер: эталон ~35 мс, проход strings.Index на каждый шаблон ~6.4 с, ContainsAny через strings.Contains ~6.3 с)",
		func() {
			a := NewAutomaton(pats)
			got = a.FindAll(text)
			any = a.ContainsAny(clean)
		})
	if !slices.Equal(got, want) {
		t.Fatalf("FindAll: %d вхождений, модель даёт %d (или порядок другой)", len(got), len(want))
	}
	if any {
		t.Fatal("ContainsAny = true на тексте без вхождений")
	}
}

// TestAutomatonLongPatternScales — сложность, а не ответ: шаблон a…a длины
// 3·10⁴ в тексте a…a длины 6·10⁴ — 3·10⁴+1 перекрывающихся вхождений.
func TestAutomatonLongPatternScales(t *testing.T) {
	text := strings.Repeat("a", 2*scaleLongM)
	var got []Match
	scaletest.Within(t, scaletest.Limit,
		"Automaton: шаблон a…a длины 3·10⁴, текст a…a длины 6·10⁴ — похоже на O(n·m) или O(m²)"+
			" там, где нужен O(n + Σm + z)"+
			" (замер: эталон ~9 мс, Trie без ссылок неудачи ~23.6 с, ссылки неудачи от корня ~8.4 с)",
		func() { got = NewAutomaton([]string{text[:scaleLongM]}).FindAll(text) })
	if len(got) != scaleLongM+1 || got[0] != (Match{0, 0}) || got[scaleLongM] != (Match{0, scaleLongM}) {
		t.Fatalf("FindAll: %d вхождений, ожидалось %d со стартами 0…%d", len(got), scaleLongM+1, scaleLongM)
	}
}

// TestCensorScales — сложность, а не ответ. Два входа. (1) 10⁴ запрещённых слов
// на тексте 5·10⁵ байт: замена каждого слова отдельным проходом — O(n·k).
// (2) слово a…ab длины 3·10⁴ на тексте a…ab длины 6·10⁴: проход по Trie без
// ссылок неудачи с каждой позиции доходит почти до конца слова — O(n·m).
// Один проход автомата — O(n + Σm + z). strings.NewReplacer здесь не ловится:
// он сравнивает сжатые ветви Trie векторно (~13 мс на этом входе), но
// перекрывающихся вхождений не закрывает — его роняет табличный TestCensor.
func TestCensorScales(t *testing.T) {
	_, text, banned := scaleWords()
	covered := make([]bool, len(text)) // модель: закрытые байты по scaleModel
	for _, mt := range scaleModel(text, banned) {
		for j := mt.Start; j < mt.Start+len(banned[mt.Pattern]); j++ {
			covered[j] = true
		}
	}
	var want strings.Builder
	for i := range len(text) {
		if covered[i] {
			want.WriteByte('*')
		} else {
			want.WriteByte(text[i])
		}
	}
	long := strings.Repeat("a", 2*scaleLongM-1) + "b"
	wantLong := long[:scaleLongM] + strings.Repeat("*", scaleLongM)
	var got, gotLong string
	scaletest.Within(t, scaletest.Limit,
		"Censor: (1) 10⁴ слов, текст 5·10⁵ байт над {a,b,c,d}; (2) слово a…ab длины 3·10⁴, текст a…ab длины 6·10⁴ —"+
			" похоже на O(n·k) или O(n·m) там, где нужен O(n + Σm + z)"+
			" (замер: эталон ~37 мс, проход на каждое слово ~6.3 с, Trie без ссылок неудачи ~23.6 с)",
		func() {
			got = Censor(text, banned)
			gotLong = Censor(long, []string{long[scaleLongM:]})
		})
	if got != want.String() {
		t.Fatalf("Censor(10⁴ слов) закрыл не те символы: %d звёздочек, модель даёт %d",
			strings.Count(got, "*"), strings.Count(want.String(), "*"))
	}
	if gotLong != wantLong {
		t.Fatalf("Censor(a…ab): %d звёздочек, ожидалось %d в конце текста", strings.Count(gotLong, "*"), scaleLongM)
	}
}
