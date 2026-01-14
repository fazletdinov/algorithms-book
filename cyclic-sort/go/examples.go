package main

import (
	"fmt"
)

// Пример 1: Циклическая сортировка массива от 1 до N
//
// Задача: Отсортировать массив, содержащий числа от 1 до N
// Временная сложность: O(n)
// Пространственная сложность: O(1)
func cyclicSort(nums []int) {
	i := 0
	for i < len(nums) {
		// Правильная позиция для числа nums[i] - это nums[i] - 1
		correctPos := nums[i] - 1

		// Если число не на правильной позиции, меняем местами
		if nums[i] > 0 && nums[i] <= len(nums) && nums[i] != nums[correctPos] {
			nums[i], nums[correctPos] = nums[correctPos], nums[i]
		} else {
			i++
		}
	}
}

// Пример 2: Поиск отсутствующего числа
//
// Задача: Найти отсутствующее число в массиве от 0 до n
// Временная сложность: O(n)
// Пространственная сложность: O(1)
func missingNumber(nums []int) int {
	n := len(nums)
	i := 0

	// Используем циклическую сортировку
	for i < n {
		correctPos := nums[i]

		// Для диапазона 0..n правильная позиция - это само значение
		if nums[i] < n && nums[i] != nums[correctPos] {
			nums[i], nums[correctPos] = nums[correctPos], nums[i]
		} else {
			i++
		}
	}

	// Ищем отсутствующее число
	for i, num := range nums {
		if num != i {
			return i
		}
	}

	return n
}

// Пример 3: Поиск всех исчезнувших чисел
//
// Задача: Найти все числа от 1 до n, которых нет в массиве
// Временная сложность: O(n)
// Пространственная сложность: O(1) без учета результата
func findDisappearedNumbers(nums []int) []int {
	i := 0
	n := len(nums)

	// Используем циклическую сортировку
	for i < n {
		correctPos := nums[i] - 1

		if nums[i] > 0 && nums[i] <= n && nums[i] != nums[correctPos] {
			nums[i], nums[correctPos] = nums[correctPos], nums[i]
		} else {
			i++
		}
	}

	// Находим все числа, которых нет на правильных позициях
	var result []int
	for i, num := range nums {
		if num != i+1 {
			result = append(result, i+1)
		}
	}

	return result
}

// Пример 4: Поиск дубликата числа
//
// Задача: Найти дубликат числа в массиве от 1 до n (один дубликат)
// Временная сложность: O(n)
// Пространственная сложность: O(1)
func findDuplicate(nums []int) int {
	i := 0
	n := len(nums)

	// Используем циклическую сортировку
	for i < n {
		correctPos := nums[i] - 1

		if nums[i] != nums[correctPos] {
			nums[i], nums[correctPos] = nums[correctPos], nums[i]
		} else {
			i++
		}
	}

	// Ищем дубликат (число не на правильной позиции)
	for i, num := range nums {
		if num != i+1 {
			return num
		}
	}

	return -1
}

// Пример 5: Поиск всех дубликатов
//
// Задача: Найти все дубликаты в массиве от 1 до n
// Временная сложность: O(n)
// Пространственная сложность: O(1) без учета результата
func findAllDuplicates(nums []int) []int {
	i := 0
	n := len(nums)

	// Используем циклическую сортировку
	for i < n {
		correctPos := nums[i] - 1

		if nums[i] != nums[correctPos] {
			nums[i], nums[correctPos] = nums[correctPos], nums[i]
		} else {
			i++
		}
	}

	// Находим все дубликаты
	var result []int
	for i, num := range nums {
		if num != i+1 {
			result = append(result, num)
		}
	}

	return result
}

// Пример 6: Первое отсутствующее положительное число
//
// Задача: Найти первое отсутствующее положительное число
// Временная сложность: O(n)
// Пространственная сложность: O(1)
func firstMissingPositive(nums []int) int {
	n := len(nums)
	i := 0

	// Используем циклическую сортировку
	// Правильная позиция для числа x - это x - 1
	for i < n {
		correctPos := nums[i] - 1

		// Игнорируем числа вне диапазона [1, n]
		if nums[i] > 0 && nums[i] <= n && nums[i] != nums[correctPos] {
			nums[i], nums[correctPos] = nums[correctPos], nums[i]
		} else {
			i++
		}
	}

	// Находим первое отсутствующее положительное число
	for i, num := range nums {
		if num != i+1 {
			return i + 1
		}
	}

	return n + 1
}

// Примеры использования
func main() {
	// Пример 1
	nums1 := []int{3, 1, 5, 4, 2}
	cyclicSort(nums1)
	fmt.Printf("Отсортированный массив: %v\n", nums1)

	// Пример 2
	nums2 := []int{3, 0, 1}
	fmt.Printf("Отсутствующее число: %d\n", missingNumber(nums2))

	// Пример 3
	nums3 := []int{4, 3, 2, 7, 8, 2, 3, 1}
	fmt.Printf("Исчезнувшие числа: %v\n", findDisappearedNumbers(nums3))

	// Пример 4
	nums4 := []int{1, 3, 4, 2, 2}
	fmt.Printf("Дубликат: %d\n", findDuplicate(nums4))

	// Пример 5
	nums5 := []int{4, 3, 2, 7, 8, 2, 3, 1}
	fmt.Printf("Все дубликаты: %v\n", findAllDuplicates(nums5))

	// Пример 6
	nums6 := []int{3, 4, -1, 1}
	fmt.Printf("Первое отсутствующее положительное: %d\n", firstMissingPositive(nums6))
}

