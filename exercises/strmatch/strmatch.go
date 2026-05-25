//go:build !solution

// Package strmatch — поиск подстроки (KMP и Rabin–Karp).
//
//	go test ./strmatch/                 # ваши решения
//	go test -tags solution ./strmatch/  # эталон
package strmatch

// KMPSearch возвращает индекс первого вхождения pattern в text, либо -1.
// Для пустого pattern верните 0.
//
// Пример: KMPSearch("hello world", "world") -> 6.
//
// Ожидаемая сложность: O(n + m).
func KMPSearch(text, pattern string) int {
	// TODO: постройте префикс-функцию (LPS) образца, затем идите по тексту,
	// откатывая только указатель образца j = lps[j-1] при несовпадении.
	panic("TODO: реализуйте KMPSearch")
}

// RabinKarp возвращает индекс первого вхождения pattern в text, либо -1.
// Для пустого pattern верните 0.
//
// Пример: RabinKarp("mississippi", "issip") -> 4.
//
// Ожидаемая сложность: O(n + m) в среднем.
func RabinKarp(text, pattern string) int {
	// TODO: полиномиальный хеш образца и первого окна; обновляйте хеш окна
	// за O(1) (rolling hash); при равенстве хешей сверяйте строки.
	panic("TODO: реализуйте RabinKarp")
}
