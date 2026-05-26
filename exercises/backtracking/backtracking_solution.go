//go:build solution

package backtracking

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
