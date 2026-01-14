package main

import (
	"fmt"
)

// Пример 1: Классический бинарный поиск
//
// Задача: Найти индекс элемента target в отсортированном массиве
// Временная сложность: O(log n)
// Пространственная сложность: O(1)
func binarySearch(nums []int, target int) int {
	left := 0
	right := len(nums) - 1

	for left <= right {
		mid := left + (right-left)/2
		midVal := nums[mid]

		if midVal == target {
			return mid
		} else if midVal < target {
			left = mid + 1
		} else {
			right = mid - 1
		}
	}

	return -1
}

// Пример 2: Поиск первого вхождения элемента
//
// Задача: Найти индекс первого вхождения target в отсортированном массиве
// Временная сложность: O(log n)
// Пространственная сложность: O(1)
func searchFirst(nums []int, target int) int {
	left := 0
	right := len(nums) - 1
	result := -1

	for left <= right {
		mid := left + (right-left)/2
		midVal := nums[mid]

		if midVal == target {
			result = mid
			right = mid - 1 // Продолжаем искать влево
		} else if midVal < target {
			left = mid + 1
		} else {
			right = mid - 1
		}
	}

	return result
}

// Пример 3: Поиск последнего вхождения элемента
//
// Задача: Найти индекс последнего вхождения target в отсортированном массиве
// Временная сложность: O(log n)
// Пространственная сложность: O(1)
func searchLast(nums []int, target int) int {
	left := 0
	right := len(nums) - 1
	result := -1

	for left <= right {
		mid := left + (right-left)/2
		midVal := nums[mid]

		if midVal == target {
			result = mid
			left = mid + 1 // Продолжаем искать вправо
		} else if midVal < target {
			left = mid + 1
		} else {
			right = mid - 1
		}
	}

	return result
}

// Пример 4: Поиск в повернутом отсортированном массиве
//
// Задача: Найти target в массиве, который был повернут
// Временная сложность: O(log n)
// Пространственная сложность: O(1)
func searchRotated(nums []int, target int) int {
	left := 0
	right := len(nums) - 1

	for left <= right {
		mid := left + (right-left)/2
		midVal := nums[mid]

		if midVal == target {
			return mid
		}

		// Определяем, какая часть отсортирована
		if nums[left] <= midVal {
			// Левая часть отсортирована
			if nums[left] <= target && target < midVal {
				right = mid - 1
			} else {
				left = mid + 1
			}
		} else {
			// Правая часть отсортирована
			if midVal < target && target <= nums[right] {
				left = mid + 1
			} else {
				right = mid - 1
			}
		}
	}

	return -1
}

// Пример 5: Поиск минимума в повернутом массиве
//
// Задача: Найти минимальный элемент в повернутом отсортированном массиве
// Временная сложность: O(log n)
// Пространственная сложность: O(1)
func findMinRotated(nums []int) int {
	left := 0
	right := len(nums) - 1

	for left < right {
		mid := left + (right-left)/2
		midVal := nums[mid]
		rightVal := nums[right]

		if midVal > rightVal {
			// Минимум в правой части
			left = mid + 1
		} else {
			// Минимум в левой части (включая mid)
			right = mid
		}
	}

	return nums[left]
}

// Пример 6: Поиск в 2D матрице
//
// Задача: Найти target в отсортированной 2D матрице
// Временная сложность: O(log(m×n))
// Пространственная сложность: O(1)
func searchMatrix(matrix [][]int, target int) bool {
	if len(matrix) == 0 || len(matrix[0]) == 0 {
		return false
	}

	rows := len(matrix)
	cols := len(matrix[0])
	left := 0
	right := rows*cols - 1

	for left <= right {
		mid := left + (right-left)/2
		row := mid / cols
		col := mid % cols
		midVal := matrix[row][col]

		if midVal == target {
			return true
		} else if midVal < target {
			left = mid + 1
		} else {
			right = mid - 1
		}
	}

	return false
}

// Пример 7: Поиск вставки элемента
//
// Задача: Найти индекс, куда нужно вставить target в отсортированном массиве
// Временная сложность: O(log n)
// Пространственная сложность: O(1)
func searchInsert(nums []int, target int) int {
	left := 0
	right := len(nums) - 1

	for left <= right {
		mid := left + (right-left)/2
		midVal := nums[mid]

		if midVal == target {
			return mid
		} else if midVal < target {
			left = mid + 1
		} else {
			right = mid - 1
		}
	}

	return left
}

// Примеры использования
func main() {
	// Пример 1
	nums1 := []int{1, 2, 3, 4, 5}
	fmt.Printf("Индекс 3 в массиве: %d\n", binarySearch(nums1, 3))

	// Пример 2
	nums2 := []int{1, 2, 2, 2, 3}
	fmt.Printf("Первое вхождение 2: %d\n", searchFirst(nums2, 2))

	// Пример 3
	fmt.Printf("Последнее вхождение 2: %d\n", searchLast(nums2, 2))

	// Пример 4
	nums3 := []int{4, 5, 6, 7, 0, 1, 2}
	fmt.Printf("Индекс 0 в повернутом массиве: %d\n", searchRotated(nums3, 0))

	// Пример 5
	nums4 := []int{3, 4, 5, 1, 2}
	fmt.Printf("Минимум в повернутом массиве: %d\n", findMinRotated(nums4))

	// Пример 6
	matrix := [][]int{
		{1, 3, 5, 7},
		{10, 11, 16, 20},
		{23, 30, 34, 60},
	}
	fmt.Printf("Найден 3 в матрице: %v\n", searchMatrix(matrix, 3))

	// Пример 7
	nums5 := []int{1, 3, 5, 6}
	fmt.Printf("Индекс вставки 5: %d\n", searchInsert(nums5, 5))
	fmt.Printf("Индекс вставки 2: %d\n", searchInsert(nums5, 2))
}

