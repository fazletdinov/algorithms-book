package main

import (
	"fmt"
)

// Пример 1: Максимальная сумма подмассива фиксированного размера K
//
// Задача: Найти максимальную сумму подмассива размера K
// Временная сложность: O(n)
// Пространственная сложность: O(1)
func maxSumSubarrayFixedK(arr []int, k int) int {
	if len(arr) < k {
		return 0
	}

	// Вычисляем сумму первого окна
	windowSum := 0
	for i := 0; i < k; i++ {
		windowSum += arr[i]
	}
	maxSum := windowSum

	// Скользим окном по массиву
	for i := k; i < len(arr); i++ {
		// Добавляем новый элемент и удаляем старый
		windowSum += arr[i] - arr[i-k]
		if windowSum > maxSum {
			maxSum = windowSum
		}
	}

	return maxSum
}

// Пример 2: Самая длинная подстрока без повторяющихся символов
//
// Задача: Найти длину самой длинной подстроки без повторяющихся символов
// Временная сложность: O(n)
// Пространственная сложность: O(min(n, m)), где m - размер алфавита
func longestSubstringNoRepeats(s string) int {
	charIndex := make(map[rune]int)
	maxLen := 0
	start := 0

	for end, ch := range s {
		// Если символ уже встречался в текущем окне, сдвигаем начало
		if prevIndex, exists := charIndex[ch]; exists && prevIndex >= start {
			start = prevIndex + 1
		}

		charIndex[ch] = end
		currentLen := end - start + 1
		if currentLen > maxLen {
			maxLen = currentLen
		}
	}

	return maxLen
}

// Пример 3: Самая длинная подстрока с максимум K различными символами
//
// Задача: Найти длину самой длинной подстроки с максимум K различными символами
// Временная сложность: O(n)
// Пространственная сложность: O(k)
func longestSubstringKDistinct(s string, k int) int {
	charCount := make(map[rune]int)
	maxLen := 0
	start := 0

	for end, ch := range s {
		// Добавляем текущий символ в окно
		charCount[ch]++

		// Если количество различных символов превышает K, сжимаем окно
		for len(charCount) > k {
			startChar := rune(s[start])
			charCount[startChar]--
			if charCount[startChar] == 0 {
				delete(charCount, startChar)
			}
			start++
		}

		currentLen := end - start + 1
		if currentLen > maxLen {
			maxLen = currentLen
		}
	}

	return maxLen
}

// Пример 4: Минимальное окно подстроки (сложная задача)
//
// Задача: Найти минимальную подстроку, содержащую все символы из строки t
// Временная сложность: O(|s| + |t|)
// Пространственная сложность: O(|s| + |t|)
func minWindowSubstring(s, t string) string {
	if len(s) == 0 || len(t) == 0 || len(s) < len(t) {
		return ""
	}

	// Подсчитываем частоту символов в t
	required := make(map[rune]int)
	for _, ch := range t {
		required[ch]++
	}

	requiredLen := len(required)
	windowCounts := make(map[rune]int)
	formed := 0

	left := 0
	minLen := len(s) + 1
	minLeft := 0

	for right, ch := range s {
		// Добавляем символ справа в окно
		windowCounts[ch]++

		// Проверяем, соответствует ли частота символа требуемой
		if count, exists := required[ch]; exists && windowCounts[ch] == count {
			formed++
		}

		// Пытаемся сжать окно слева
		for left <= right && formed == requiredLen {
			leftChar := rune(s[left])

			// Обновляем минимальное окно
			if right-left+1 < minLen {
				minLen = right - left + 1
				minLeft = left
			}

			// Удаляем символ слева из окна
			windowCounts[leftChar]--
			if count, exists := required[leftChar]; exists && windowCounts[leftChar] < count {
				formed--
			}

			left++
		}
	}

	if minLen == len(s)+1 {
		return ""
	}
	return s[minLeft : minLeft+minLen]
}

// Примеры использования
func main() {
	// Пример 1
	arr := []int{2, 1, 5, 1, 3, 2}
	fmt.Printf("Максимальная сумма подмассива размера 3: %d\n", maxSumSubarrayFixedK(arr, 3))

	// Пример 2
	s1 := "abcabcbb"
	fmt.Printf("Самая длинная подстрока без повторений в '%s': %d\n", s1, longestSubstringNoRepeats(s1))

	// Пример 3
	s2 := "araaci"
	fmt.Printf("Самая длинная подстрока с 2 различными символами в '%s': %d\n", s2, longestSubstringKDistinct(s2, 2))

	// Пример 4
	s3 := "ADOBECODEBANC"
	t := "ABC"
	fmt.Printf("Минимальное окно подстроки '%s' в '%s': '%s'\n", t, s3, minWindowSubstring(s3, t))
}

