//go:build solution

package backtracking

import "sort"

func Permutations(nums []int) [][]int {
	var result [][]int
	used := make([]bool, len(nums))
	current := make([]int, 0, len(nums))

	var backtrack func()
	backtrack = func() {
		if len(current) == len(nums) {
			perm := make([]int, len(current))
			copy(perm, current)
			result = append(result, perm)
			return
		}
		for i, n := range nums {
			if used[i] {
				continue
			}
			used[i] = true
			current = append(current, n)
			backtrack()
			current = current[:len(current)-1]
			used[i] = false
		}
	}

	backtrack()
	return result
}

func GenerateParentheses(n int) []string {
	var result []string
	buf := make([]byte, 0, 2*n)

	var backtrack func(open, closed int)
	backtrack = func(open, closed int) {
		if len(buf) == 2*n {
			result = append(result, string(buf))
			return
		}
		if open < n {
			buf = append(buf, '(')
			backtrack(open+1, closed)
			buf = buf[:len(buf)-1]
		}
		if closed < open {
			buf = append(buf, ')')
			backtrack(open, closed+1)
			buf = buf[:len(buf)-1]
		}
	}

	backtrack(0, 0)
	return result
}

func CombinationSum(candidates []int, target int) [][]int {
	sorted := make([]int, len(candidates))
	copy(sorted, candidates)
	sort.Ints(sorted)

	var result [][]int
	var current []int

	var backtrack func(start, remaining int)
	backtrack = func(start, remaining int) {
		if remaining == 0 {
			combo := make([]int, len(current))
			copy(combo, current)
			result = append(result, combo)
			return
		}
		for i := start; i < len(sorted); i++ {
			if sorted[i] > remaining {
				break
			}
			current = append(current, sorted[i])
			backtrack(i, remaining-sorted[i])
			current = current[:len(current)-1]
		}
	}

	backtrack(0, target)
	return result
}

func SolveNQueensCount(n int) int {
	count := 0
	cols := make([]bool, n)
	diag1 := make([]bool, 2*n-1) // col - row + (n-1)
	diag2 := make([]bool, 2*n-1) // col + row

	var backtrack func(row int)
	backtrack = func(row int) {
		if row == n {
			count++
			return
		}
		for col := 0; col < n; col++ {
			d1 := col - row + (n - 1)
			d2 := col + row
			if cols[col] || diag1[d1] || diag2[d2] {
				continue
			}
			cols[col], diag1[d1], diag2[d2] = true, true, true
			backtrack(row + 1)
			cols[col], diag1[d1], diag2[d2] = false, false, false
		}
	}

	backtrack(0)
	return count
}

func LetterCombinations(digits string) []string {
	if len(digits) == 0 {
		return []string{}
	}

	letters := map[byte]string{
		'2': "abc", '3': "def", '4': "ghi", '5': "jkl",
		'6': "mno", '7': "pqrs", '8': "tuv", '9': "wxyz",
	}

	var result []string
	buf := make([]byte, 0, len(digits))

	var backtrack func(pos int)
	backtrack = func(pos int) {
		if pos == len(digits) {
			result = append(result, string(buf))
			return
		}
		for i := 0; i < len(letters[digits[pos]]); i++ {
			buf = append(buf, letters[digits[pos]][i])
			backtrack(pos + 1)
			buf = buf[:len(buf)-1]
		}
	}

	backtrack(0)
	return result
}
