//go:build solution

package wordladder

func LadderLength(beginWord, endWord string, wordList []string) int {
	dict := make(map[string]bool, len(wordList))
	for _, w := range wordList {
		dict[w] = true
	}
	if !dict[endWord] {
		return 0
	}
	queue := []string{beginWord}
	steps := 1
	for len(queue) > 0 {
		next := []string{}
		for _, w := range queue {
			if w == endWord {
				return steps
			}
			b := []byte(w)
			for i := 0; i < len(b); i++ {
				orig := b[i]
				for ch := byte('a'); ch <= 'z'; ch++ {
					b[i] = ch
					if cand := string(b); dict[cand] {
						delete(dict, cand) // помечаем посещённым
						next = append(next, cand)
					}
				}
				b[i] = orig
			}
		}
		queue = next
		steps++
	}
	return 0
}
