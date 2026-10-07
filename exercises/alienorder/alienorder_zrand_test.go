package alienorder

import (
	"math/rand"
	"sort"
	"testing"
)

// alienConstraints извлекает ограничения из списка слов независимо от эталона:
// набор букв, рёбра «первая различающаяся буква» и флаг префиксного конфликта.
func alienConstraints(words []string) (letters map[byte]bool, edges [][2]byte, prefixConflict bool) {
	letters = map[byte]bool{}
	for _, w := range words {
		for i := 0; i < len(w); i++ {
			letters[w[i]] = true
		}
	}
	for i := 0; i+1 < len(words); i++ {
		a, b := words[i], words[i+1]
		j := 0
		for j < len(a) && j < len(b) && a[j] == b[j] {
			j++
		}
		if j < len(a) && j < len(b) {
			edges = append(edges, [2]byte{a[j], b[j]})
		} else if len(a) > len(b) {
			prefixConflict = true // "abc" перед "ab" — порядка не существует
		}
	}
	return letters, edges, prefixConflict
}

// hasCycle — поиск цикла в графе ограничений (DFS с тремя цветами).
func hasCycle(letters map[byte]bool, edges [][2]byte) bool {
	adj := map[byte][]byte{}
	for _, e := range edges {
		adj[e[0]] = append(adj[e[0]], e[1])
	}
	color := map[byte]int{} // 0 — белый, 1 — в стеке, 2 — готов
	var dfs func(v byte) bool
	dfs = func(v byte) bool {
		color[v] = 1
		for _, w := range adj[v] {
			if color[w] == 1 || (color[w] == 0 && dfs(w)) {
				return true
			}
		}
		color[v] = 2
		return false
	}
	for ch := range letters {
		if color[ch] == 0 && dfs(ch) {
			return true
		}
	}
	return false
}

// validOrder проверяет, что got — корректный ответ: содержит каждую букву из
// слов ровно один раз и ничего лишнего, а каждое ограничение a<b соблюдено.
func validOrder(got string, letters map[byte]bool, edges [][2]byte) bool {
	pos := map[byte]int{}
	for i := 0; i < len(got); i++ {
		if _, dup := pos[got[i]]; dup || !letters[got[i]] {
			return false
		}
		pos[got[i]] = i
	}
	if len(pos) != len(letters) {
		return false
	}
	for _, e := range edges {
		if pos[e[0]] >= pos[e[1]] {
			return false
		}
	}
	return true
}

// randWords — n случайных слов длиной 1..4 над первыми k буквами алфавита.
func randWords(rng *rand.Rand, n, k int) []string {
	words := make([]string, n)
	for i := 0; i < n; i++ {
		l := 1 + rng.Intn(4)
		w := make([]byte, l)
		for j := 0; j < l; j++ {
			w[j] = byte('a' + rng.Intn(k))
		}
		words[i] = string(w)
	}
	return words
}

// TestAlienOrderRandomValid: генерируем случайный тотальный порядок маленького
// алфавита (перестановка 3..6 букв), сортируем случайные слова этим порядком —
// вход по построению непротиворечив, поэтому ответ обязан быть непустым и
// проходить верификатор (все ограничения соблюдены, буквы — ровно те, что в
// словах). Порядок часто восстанавливается неоднозначно, поэтому сверяем не
// строку, а свойства. Сид фиксирован.
func TestAlienOrderRandomValid(t *testing.T) {
	rng := rand.New(rand.NewSource(2609))
	for i := 0; i < 3000; i++ {
		k := 3 + rng.Intn(4)
		rank := map[byte]int{}
		for pos, idx := range rng.Perm(k) {
			rank[byte('a'+idx)] = pos
		}
		words := randWords(rng, 1+rng.Intn(8), k)
		sort.Slice(words, func(x, y int) bool { // сортировка по инопланетному порядку
			a, b := words[x], words[y]
			for j := 0; j < len(a) && j < len(b); j++ {
				if a[j] != b[j] {
					return rank[a[j]] < rank[b[j]]
				}
			}
			return len(a) < len(b) // префикс раньше продолжения
		})
		letters, edges, _ := alienConstraints(words)
		got := AlienOrder(words)
		if got == "" {
			t.Fatalf("AlienOrder(%v) = \"\" на заведомо согласованном входе", words)
		}
		if !validOrder(got, letters, edges) {
			t.Fatalf("AlienOrder(%v) = %q нарушает ограничения %v", words, got, edges)
		}
	}
}

// TestAlienOrderRandomArbitrary: полностью случайные (НЕ отсортированные)
// списки слов над алфавитом из 3 букв — противоречия (циклы и префиксные
// конфликты) возникают постоянно. Независимый чекер решает, существует ли
// порядок вообще; ответ функции обязан согласоваться: "" ⟺ порядка нет,
// иначе — валидный порядок по верификатору.
func TestAlienOrderRandomArbitrary(t *testing.T) {
	rng := rand.New(rand.NewSource(2610))
	for i := 0; i < 5000; i++ {
		words := randWords(rng, 1+rng.Intn(6), 3)
		letters, edges, prefixConflict := alienConstraints(words)
		possible := !prefixConflict && !hasCycle(letters, edges)
		got := AlienOrder(words)
		if possible && got == "" {
			t.Fatalf("AlienOrder(%v) = \"\", но порядок существует (рёбра %v)", words, edges)
		}
		if !possible && got != "" {
			t.Fatalf("AlienOrder(%v) = %q, но входа с валидным порядком нет (prefixConflict=%v)",
				words, got, prefixConflict)
		}
		if got != "" && !validOrder(got, letters, edges) {
			t.Fatalf("AlienOrder(%v) = %q нарушает ограничения %v", words, got, edges)
		}
	}
}
