//go:build !solution

// Package strmatch — поиск подстроки (KMP и Rabin–Karp).
// Теория паттерна — в книге: ../../src/string-algorithms.md
//
//	go test ./strmatch/                 # твои решения
//	go test -tags solution ./strmatch/  # эталон
package strmatch

// KMPSearch возвращает индекс первого вхождения pattern в text, либо -1.
// Для пустого pattern верни 0.
//
// Пример: KMPSearch("hello world", "world") -> 6.
//
// Ограничения: len(text) ≤ 2·10⁶, len(pattern) ≤ 10⁶.
//
// Ожидаемая сложность: O(n + m).
func KMPSearch(text, pattern string) int {
	// TODO: построй префикс-функцию (LPS) образца, затем иди по тексту,
	// откатывая только указатель образца j = lps[j-1] при несовпадении.
	panic("TODO: реализуй KMPSearch")
}

// RabinKarp возвращает индекс первого вхождения pattern в text, либо -1.
// Для пустого pattern верни 0.
//
// Пример: RabinKarp("mississippi", "issip") -> 4.
//
// Ограничения: len(text) ≤ 2·10⁶, len(pattern) ≤ 10⁶.
//
// Ожидаемая сложность: O(n + m) в среднем.
func RabinKarp(text, pattern string) int {
	// TODO: полиномиальный хеш образца и первого окна; обновляй хеш окна
	// за O(1) (rolling hash); при равенстве хешей сверяй строки.
	panic("TODO: реализуй RabinKarp")
}

// CountOccurrences возвращает число вхождений pattern в text, включая
// ПЕРЕКРЫВАЮЩИЕСЯ. Для пустого pattern верни 0.
//
// Пример: CountOccurrences("aaaa", "aa") -> 3; CountOccurrences("abcabc", "abc") -> 2.
//
// Ограничения: len(text) ≤ 2·10⁶, len(pattern) ≤ 10⁶.
//
// Ожидаемая сложность: O(n + m).
func CountOccurrences(text, pattern string) int {
	// TODO: KMP-проход по тексту; при совпадении (j == len(pattern))
	// увеличивай счётчик и продолжай с j = lps[j-1], чтобы ловить
	// перекрывающиеся вхождения, не откатывая указатель текста.
	panic("TODO: реализуй CountOccurrences")
}

// LongestPrefixSuffix возвращает длину наибольшего собственного префикса строки s,
// который одновременно является её суффиксом (значение префикс-функции KMP для всей строки).
//
// Пример: LongestPrefixSuffix("ababab") -> 4; LongestPrefixSuffix("abcdabc") -> 3;
// LongestPrefixSuffix("aaaa") -> 3; LongestPrefixSuffix("abc") -> 0.
//
// Ограничения: len(s) ≤ 2·10⁶.
//
// Ожидаемая сложность: O(n).
func LongestPrefixSuffix(s string) int {
	// TODO: построй префикс-функцию (LPS) для s и верни её последний элемент
	// (для пустой строки — 0).
	panic("TODO: реализуй LongestPrefixSuffix")
}

// ZSearch возвращает все стартовые индексы вхождений pattern в text (по возрастанию)
// через Z-алгоритм. Если вхождений нет, верни пустой срез []int{}.
//
// Пример: ZSearch("abcabcabc", "abc") -> [0 3 6]; ZSearch("aaaa", "aa") -> [0 1 2].
//
// Ограничения: len(text) ≤ 2·10⁶, len(pattern) ≤ 10⁶.
//
// Ожидаемая сложность: O(n + m).
func ZSearch(text, pattern string) []int {
	// TODO: построй строку pattern + разделитель + text, посчитай Z-функцию
	// и собери позиции, где z[i] == len(pattern), пересчитав их в индексы text.
	panic("TODO: реализуй ZSearch")
}
