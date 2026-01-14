package main

import (
	"fmt"
	"sort"
)

// Пример 1: Генерация всех подмножеств (рекурсивный подход)
//
// Задача: Вернуть все возможные подмножества массива
// Временная сложность: O(2^n × n)
// Пространственная сложность: O(2^n × n)
func subsets(nums []int) [][]int {
	var result [][]int
	var current []int

	var backtrack func(int)
	backtrack = func(start int) {
		// Добавляем текущее подмножество
		temp := make([]int, len(current))
		copy(temp, current)
		result = append(result, temp)

		// Генерируем подмножества для оставшихся элементов
		for i := start; i < len(nums); i++ {
			current = append(current, nums[i])
			backtrack(i + 1)
			current = current[:len(current)-1] // Backtrack
		}
	}

	backtrack(0)
	return result
}

// Пример 2: Генерация всех подмножеств (итеративный подход)
//
// Задача: Вернуть все возможные подмножества массива итеративно
// Временная сложность: O(2^n × n)
// Пространственная сложность: O(2^n × n)
func subsetsIterative(nums []int) [][]int {
	result := [][]int{{}}

	for _, num := range nums {
		var newSubsets [][]int
		for _, subset := range result {
			newSubset := make([]int, len(subset))
			copy(newSubset, subset)
			newSubset = append(newSubset, num)
			newSubsets = append(newSubsets, newSubset)
		}
		result = append(result, newSubsets...)
	}

	return result
}

// Пример 3: Подмножества с дубликатами
//
// Задача: Вернуть все подмножества массива с дубликатами
// Временная сложность: O(2^n × n)
// Пространственная сложность: O(2^n × n)
func subsetsWithDup(nums []int) [][]int {
	sort.Ints(nums)
	var result [][]int
	var current []int

	var backtrack func(int)
	backtrack = func(start int) {
		temp := make([]int, len(current))
		copy(temp, current)
		result = append(result, temp)

		for i := start; i < len(nums); i++ {
			// Пропускаем дубликаты
			if i > start && nums[i] == nums[i-1] {
				continue
			}
			current = append(current, nums[i])
			backtrack(i + 1)
			current = current[:len(current)-1]
		}
	}

	backtrack(0)
	return result
}

// Пример 4: Комбинации заданной длины
//
// Задача: Вернуть все комбинации длины k из массива
// Временная сложность: O(C(n,k) × k)
// Пространственная сложность: O(C(n,k) × k)
func combine(n, k int) [][]int {
	var result [][]int
	var current []int

	var backtrack func(int)
	backtrack = func(start int) {
		if len(current) == k {
			temp := make([]int, len(current))
			copy(temp, current)
			result = append(result, temp)
			return
		}

		for i := start; i <= n; i++ {
			current = append(current, i)
			backtrack(i + 1)
			current = current[:len(current)-1]
		}
	}

	backtrack(1)
	return result
}

// Пример 5: Комбинации с суммой
//
// Задача: Найти все уникальные комбинации, сумма которых равна target
// Временная сложность: O(2^n)
// Пространственная сложность: O(target)
func combinationSum(candidates []int, target int) [][]int {
	var result [][]int
	var current []int
	sort.Ints(candidates)

	var backtrack func(int, int)
	backtrack = func(start, remaining int) {
		if remaining == 0 {
			temp := make([]int, len(current))
			copy(temp, current)
			result = append(result, temp)
			return
		}

		if remaining < 0 {
			return
		}

		for i := start; i < len(candidates); i++ {
			current = append(current, candidates[i])
			backtrack(i, remaining-candidates[i])
			current = current[:len(current)-1]
		}
	}

	backtrack(0, target)
	return result
}

// Пример 6: Перестановки
//
// Задача: Вернуть все возможные перестановки массива
// Временная сложность: O(n! × n)
// Пространственная сложность: O(n! × n)
func permute(nums []int) [][]int {
	var result [][]int
	var current []int
	used := make([]bool, len(nums))

	var backtrack func()
	backtrack = func() {
		if len(current) == len(nums) {
			temp := make([]int, len(current))
			copy(temp, current)
			result = append(result, temp)
			return
		}

		for i := 0; i < len(nums); i++ {
			if !used[i] {
				used[i] = true
				current = append(current, nums[i])
				backtrack()
				current = current[:len(current)-1]
				used[i] = false
			}
		}
	}

	backtrack()
	return result
}

// Примеры использования
func main() {
	// Пример 1
	nums1 := []int{1, 2, 3}
	fmt.Printf("Подмножества [1,2,3]: %v\n", subsets(nums1))

	// Пример 2
	nums2 := []int{1, 2}
	fmt.Printf("Подмножества (итеративно): %v\n", subsetsIterative(nums2))

	// Пример 3
	nums3 := []int{1, 2, 2}
	fmt.Printf("Подмножества с дубликатами: %v\n", subsetsWithDup(nums3))

	// Пример 4
	fmt.Printf("Комбинации из 4 по 2: %v\n", combine(4, 2))

	// Пример 5
	candidates := []int{2, 3, 6, 7}
	fmt.Printf("Комбинации с суммой 7: %v\n", combinationSum(candidates, 7))

	// Пример 6
	nums4 := []int{1, 2, 3}
	fmt.Printf("Перестановки [1,2,3]: %v\n", permute(nums4))
}

