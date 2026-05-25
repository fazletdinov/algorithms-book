//go:build !solution

// Package twopointers — задачи на шаблон «Два указателя».
//
//	go test ./twopointers/                 # ваши решения
//	go test -tags solution ./twopointers/  # эталон
package twopointers

// PairWithTargetSum принимает отсортированный по возрастанию массив и target.
// Возвращает индексы двух чисел, дающих в сумме target, как []int{i, j} (i < j),
// либо []int{-1, -1}, если такой пары нет.
//
// Пример: arr=[1,2,3,4,6], target=6 -> [1,3] (2 + 4).
//
// Ожидаемая сложность: O(n) по времени, O(1) по памяти.
func PairWithTargetSum(arr []int, target int) []int {
	// TODO: указатели с двух концов; двигайте left при сумме < target,
	// right — при сумме > target.
	panic("TODO: реализуйте PairWithTargetSum")
}

// RemoveDuplicates удаляет дубликаты из отсортированного массива «на месте»
// и возвращает количество уникальных элементов. Первые n элементов arr
// должны содержать уникальные значения в исходном порядке.
//
// Пример: arr=[2,3,3,3,6,9,9] -> 4, arr[:4]=[2,3,6,9].
//
// Ожидаемая сложность: O(n) по времени, O(1) по памяти.
func RemoveDuplicates(arr []int) int {
	// TODO: «медленный» указатель на позицию следующего уникального элемента,
	// «быстрый» проходит массив.
	panic("TODO: реализуйте RemoveDuplicates")
}
