//go:build !solution

// Package wordladder — Word Ladder: BFS + хеш-множество (комбинация паттернов).
// Разбор — в книге: ../../src/pattern-combinations.md (раздел «Word Ladder»).
//
//	go test ./wordladder/                 # твои решения
//	go test -tags solution ./wordladder/  # эталон
//
// Реализуй LadderLength: длина кратчайшей цепочки превращений beginWord ->
// endWord, где на каждом шаге меняется одна буква и слово есть в словаре.
// Считается число слов в цепочке (включая begin и end); 0, если пути нет.
package wordladder

// LadderLength возвращает длину кратчайшей цепочки превращений или 0.
func LadderLength(beginWord, endWord string, wordList []string) int {
	// TODO: BFS по уровням. Словарь — map[string]bool для O(1) проверки и отметки
	// посещённых (удаляй слово из словаря, добавляя его в очередь). Для каждого
	// слова перебирай len*25 соседей, меняя по одной букве.
	panic("TODO: реализуй LadderLength")
}
