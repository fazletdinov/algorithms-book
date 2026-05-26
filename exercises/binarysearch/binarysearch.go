//go:build !solution

// Package binarysearch — задачи на шаблон «Модифицированный бинарный поиск».
//
//	go test ./binarysearch/                 # ваши решения
//	go test -tags solution ./binarysearch/  # эталон
package binarysearch

// Search возвращает индекс target в отсортированном по возрастанию массиве,
// либо -1, если элемента нет.
//
// Ожидаемая сложность: O(log n).
func Search(arr []int, target int) int {
	// TODO: классический бинарный поиск; mid := low + (high-low)/2,
	// чтобы избежать переполнения.
	panic("TODO: реализуйте Search")
}

// FindCeiling возвращает индекс наименьшего элемента, который >= key
// («потолок»), либо -1, если все элементы меньше key. Массив отсортирован
// по возрастанию.
//
// Пример: arr=[1,3,8,10,15], key=12 -> 4 (элемент 15).
//
// Ожидаемая сложность: O(log n).
func FindCeiling(arr []int, key int) int {
	// TODO: вариант бинарного поиска — после цикла low указывает на потолок.
	panic("TODO: реализуйте FindCeiling")
}
