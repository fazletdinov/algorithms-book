package wordladder

import (
	"math/rand"
	"testing"
)

// diffOne — слова одинаковой длины различаются ровно в одной букве.
func diffOne(a, b string) bool {
	if len(a) != len(b) {
		return false
	}
	diff := 0
	for i := 0; i < len(a); i++ {
		if a[i] != b[i] {
			diff++
		}
	}
	return diff == 1
}

// naiveLadder — независимый эталон: явный граф «слова, различающиеся одной
// буквой», BFS по расстояниям без трюка с удалением из словаря.
func naiveLadder(begin, end string, wordList []string) int {
	inDict := map[string]bool{}
	for _, w := range wordList {
		inDict[w] = true
	}
	if !inDict[end] {
		return 0
	}
	dist := map[string]int{begin: 1}
	queue := []string{begin}
	for len(queue) > 0 {
		w := queue[0]
		queue = queue[1:]
		if w == end {
			return dist[w]
		}
		for cand := range inDict {
			if _, seen := dist[cand]; !seen && diffOne(w, cand) {
				dist[cand] = dist[w] + 1
				queue = append(queue, cand)
			}
		}
	}
	return 0
}

// randWord — случайное слово длины l над первыми k буквами алфавита.
func randWord(rng *rand.Rand, l, k int) string {
	w := make([]byte, l)
	for j := 0; j < l; j++ {
		w[j] = byte('a' + rng.Intn(k))
	}
	return string(w)
}

// TestLadderLengthRandom: маленькие случайные словари против наивной BFS.
// Слова длины 2..3 над алфавитом из 3 букв — пространство крошечное (максимум
// 27 слов), поэтому постоянно случаются и дубликаты в словаре, и begin внутри
// словаря, и begin == end, и недостижимый end, и его отсутствие в словаре.
// Сид фиксирован → падение воспроизводимо.
func TestLadderLengthRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(2611))
	for i := 0; i < 3000; i++ {
		l := 2 + rng.Intn(2) // длина слов этого прогона: 2 или 3
		n := 1 + rng.Intn(10)
		wordList := make([]string, n)
		for j := 0; j < n; j++ {
			wordList[j] = randWord(rng, l, 3)
		}
		begin := randWord(rng, l, 3)
		var end string
		if rng.Intn(4) == 0 {
			end = randWord(rng, l, 3) // иногда конца может не быть в словаре
		} else {
			end = wordList[rng.Intn(n)]
		}
		want := naiveLadder(begin, end, wordList)
		if got := LadderLength(begin, end, wordList); got != want {
			t.Fatalf("LadderLength(%q, %q, %v) = %d, наивная BFS = %d",
				begin, end, wordList, got, want)
		}
	}
}
