package main

import (
	"fmt"
	"sort"
)

// Пример 1: Поиск двух чисел с заданной суммой в отсортированном массиве
//
// Задача: Найти два числа в отсортированном массиве, сумма которых равна target
// Временная сложность: O(n)
// Пространственная сложность: O(1)
func twoSumSorted(arr []int, target int) (int, int, bool) {
	left := 0
	right := len(arr) - 1

	for left < right {
		sum := arr[left] + arr[right]

		if sum == target {
			return left, right, true
		} else if sum < target {
			left++
		} else {
			right--
		}
	}

	return 0, 0, false
}

// Пример 2: Удаление дубликатов из отсортированного массива
//
// Задача: Удалить дубликаты из отсортированного массива на месте
// Временная сложность: O(n)
// Пространственная сложность: O(1)
func removeDuplicates(nums []int) int {
	if len(nums) == 0 {
		return 0
	}

	slow := 0

	for fast := 1; fast < len(nums); fast++ {
		if nums[slow] != nums[fast] {
			slow++
			nums[slow] = nums[fast]
		}
	}

	return slow + 1
}

// Пример 3: Три числа с нулевой суммой (3Sum)
//
// Задача: Найти все уникальные тройки чисел, сумма которых равна нулю
// Временная сложность: O(n²)
// Пространственная сложность: O(1) без учета результата
func threeSum(nums []int) [][]int {
	sort.Ints(nums)
	var result [][]int
	n := len(nums)

	for i := 0; i < n-2; i++ {
		// Пропускаем дубликаты для первого числа
		if i > 0 && nums[i] == nums[i-1] {
			continue
		}

		left := i + 1
		right := n - 1
		target := -nums[i]

		for left < right {
			sum := nums[left] + nums[right]

			if sum == target {
				result = append(result, []int{nums[i], nums[left], nums[right]})

				// Пропускаем дубликаты
				for left < right && nums[left] == nums[left+1] {
					left++
				}
				for left < right && nums[right] == nums[right-1] {
					right--
				}

				left++
				right--
			} else if sum < target {
				left++
			} else {
				right--
			}
		}
	}

	return result
}

// Пример 4: Контейнер с наибольшим количеством воды
//
// Задача: Найти два столбца, которые вместе с осью X образуют контейнер,
// содержащий наибольшее количество воды
// Временная сложность: O(n)
// Пространственная сложность: O(1)
func maxArea(height []int) int {
	left := 0
	right := len(height) - 1
	maxArea := 0

	for left < right {
		width := right - left
		currentArea := width * min(height[left], height[right])
		if currentArea > maxArea {
			maxArea = currentArea
		}

		// Перемещаем указатель с меньшей высотой
		if height[left] < height[right] {
			left++
		} else {
			right--
		}
	}

	return maxArea
}

// Пример 5: Захват дождевой воды (Trapping Rain Water)
//
// Задача: Вычислить, сколько воды можно захватить между столбцами
// Временная сложность: O(n)
// Пространственная сложность: O(1)
func trapRainWater(height []int) int {
	if len(height) == 0 {
		return 0
	}

	left := 0
	right := len(height) - 1
	leftMax := 0
	rightMax := 0
	water := 0

	for left < right {
		if height[left] < height[right] {
			if height[left] >= leftMax {
				leftMax = height[left]
			} else {
				water += leftMax - height[left]
			}
			left++
		} else {
			if height[right] >= rightMax {
				rightMax = height[right]
			} else {
				water += rightMax - height[right]
			}
			right--
		}
	}

	return water
}

// Пример 6: Квадраты отсортированного массива
//
// Задача: Вернуть массив квадратов каждого числа в отсортированном порядке
// Временная сложность: O(n)
// Пространственная сложность: O(n)
func sortedSquares(nums []int) []int {
	n := len(nums)
	result := make([]int, n)
	left := 0
	right := n - 1
	pos := n - 1

	for left <= right {
		leftSq := nums[left] * nums[left]
		rightSq := nums[right] * nums[right]

		if leftSq > rightSq {
			result[pos] = leftSq
			left++
		} else {
			result[pos] = rightSq
			right--
		}
		pos--
	}

	return result
}

// Вспомогательная функция для min
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// Примеры использования
func main() {
	// Пример 1
	arr := []int{2, 7, 11, 15}
	if left, right, found := twoSumSorted(arr, 9); found {
		fmt.Printf("Два числа с суммой 9: индексы %d и %d\n", left, right)
	}

	// Пример 2
	nums1 := []int{1, 1, 2}
	length := removeDuplicates(nums1)
	fmt.Printf("Массив без дубликатов (длина %d): %v\n", length, nums1[:length])

	// Пример 3
	nums2 := []int{-1, 0, 1, 2, -1, -4}
	result := threeSum(nums2)
	fmt.Printf("Тройки с нулевой суммой: %v\n", result)

	// Пример 4
	height1 := []int{1, 8, 6, 2, 5, 4, 8, 3, 7}
	fmt.Printf("Максимальная площадь контейнера: %d\n", maxArea(height1))

	// Пример 5
	height2 := []int{0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1}
	fmt.Printf("Захваченная вода: %d\n", trapRainWater(height2))

	// Пример 6
	nums3 := []int{-4, -1, 0, 3, 10}
	fmt.Printf("Квадраты отсортированного массива: %v\n", sortedSquares(nums3))
}

