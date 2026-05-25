//go:build !solution

// Package slidingwindow — задачи на шаблон «Скользящее окно».
//
// Реализуйте функции ниже, затем запустите тесты:
//
//	go test ./slidingwindow/
//
// Тесты должны стать зелёными. Чтобы посмотреть эталонное решение:
//
//	go test -tags solution ./slidingwindow/
package slidingwindow

// MaxSumSubarray возвращает максимальную сумму подмассива фиксированного
// размера k. Если k <= 0 или k > len(arr) — верните 0.
//
// Пример: arr=[2,1,5,1,3,2], k=3 -> 9 (подмассив [5,1,3]).
//
// Ожидаемая сложность: O(n) по времени, O(1) по памяти.
func MaxSumSubarray(arr []int, k int) int {
	// TODO: реализуйте инкрементальное окно: посчитайте сумму первых k
	// элементов, затем двигайте окно, добавляя arr[i] и вычитая arr[i-k].
	panic("TODO: реализуйте MaxSumSubarray")
}

// LongestSubstringKDistinct возвращает длину самой длинной подстроки,
// содержащей не более k различных символов.
//
// Пример: s="araaci", k=2 -> 4 (подстрока "araa").
//
// Ожидаемая сложность: O(n) по времени, O(k) по памяти.
func LongestSubstringKDistinct(s string, k int) int {
	// TODO: ведите map[byte]int частот символов в окне; при росте числа
	// различных символов выше k — сжимайте окно слева.
	panic("TODO: реализуйте LongestSubstringKDistinct")
}
