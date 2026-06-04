//go:build solution

package subsets

import "sort"

func Subsets(nums []int) [][]int {
	var result [][]int
	current := make([]int, 0, len(nums))

	var backtrack func(start int)
	backtrack = func(start int) {
		subset := make([]int, len(current))
		copy(subset, current)
		result = append(result, subset)

		for i := start; i < len(nums); i++ {
			current = append(current, nums[i])
			backtrack(i + 1)
			current = current[:len(current)-1]
		}
	}

	backtrack(0)
	return result
}

func Combinations(n, k int) [][]int {
	var result [][]int
	current := make([]int, 0, k)

	var backtrack func(start int)
	backtrack = func(start int) {
		if len(current) == k {
			combo := make([]int, k)
			copy(combo, current)
			result = append(result, combo)
			return
		}
		// Отсечение: чисел от i до n должно хватить, чтобы добрать до k.
		for i := start; i <= n-(k-len(current))+1; i++ {
			current = append(current, i)
			backtrack(i + 1)
			current = current[:len(current)-1]
		}
	}

	backtrack(1)
	return result
}

func LetterCasePermutation(s string) []string {
	var result []string
	chars := []byte(s)

	var backtrack func(i int)
	backtrack = func(i int) {
		if i == len(chars) {
			result = append(result, string(chars))
			return
		}
		c := chars[i]
		if c >= 'a' && c <= 'z' {
			chars[i] = c - ('a' - 'A')
			backtrack(i + 1)
			chars[i] = c
			backtrack(i + 1)
		} else if c >= 'A' && c <= 'Z' {
			chars[i] = c + ('a' - 'A')
			backtrack(i + 1)
			chars[i] = c
			backtrack(i + 1)
		} else {
			backtrack(i + 1)
		}
	}

	backtrack(0)
	return result
}

func SubsetsWithDup(nums []int) [][]int {
	sorted := make([]int, len(nums))
	copy(sorted, nums)
	sort.Ints(sorted)

	var result [][]int
	current := make([]int, 0, len(sorted))

	var backtrack func(start int)
	backtrack = func(start int) {
		subset := make([]int, len(current))
		copy(subset, current)
		result = append(result, subset)

		for i := start; i < len(sorted); i++ {
			if i > start && sorted[i] == sorted[i-1] {
				continue
			}
			current = append(current, sorted[i])
			backtrack(i + 1)
			current = current[:len(current)-1]
		}
	}

	backtrack(0)
	return result
}
