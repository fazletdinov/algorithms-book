//go:build solution

package prefixsum

func RangeSums(nums []int, queries [][2]int) []int {
	prefix := make([]int, len(nums)+1)
	for i, v := range nums {
		prefix[i+1] = prefix[i] + v
	}
	res := make([]int, len(queries))
	for qi, q := range queries {
		res[qi] = prefix[q[1]+1] - prefix[q[0]]
	}
	return res
}

func CountSubarraysWithSum(nums []int, k int) int {
	seen := map[int]int{0: 1} // пустой префикс: без него потеряются подмассивы от начала
	sum, count := 0, 0
	for _, v := range nums {
		sum += v
		count += seen[sum-k]
		seen[sum]++
	}
	return count
}

func LongestBalanced(bits []int) int {
	first := map[int]int{0: -1} // сумма 0 «встречена» до начала массива
	sum, best := 0, 0
	for i, b := range bits {
		if b == 1 {
			sum++
		} else {
			sum--
		}
		if j, ok := first[sum]; ok {
			if i-j > best {
				best = i - j
			}
		} else {
			first[sum] = i // только первое вхождение: оно даёт самый длинный отрезок
		}
	}
	return best
}

func CountDivisibleSubarrays(nums []int, k int) int {
	seen := make([]int, k)
	seen[0] = 1
	sum, count := 0, 0
	for _, v := range nums {
		sum += v
		r := sum % k
		if r < 0 {
			r += k // в Go остаток берёт знак делимого
		}
		count += seen[r]
		seen[r]++
	}
	return count
}

func MaxSubarraySum(nums []int) int {
	sum, minPrefix := 0, 0
	best := nums[0]
	for _, v := range nums {
		sum += v
		if sum-minPrefix > best {
			best = sum - minPrefix
		}
		if sum < minPrefix {
			minPrefix = sum
		}
	}
	return best
}

func ProductExceptSelf(nums []int) []int {
	n := len(nums)
	res := make([]int, n)
	res[0] = 1
	for i := 1; i < n; i++ {
		res[i] = res[i-1] * nums[i-1]
	}
	suffix := 1
	for i := n - 1; i >= 0; i-- {
		res[i] *= suffix
		suffix *= nums[i]
	}
	return res
}

func ApplyRangeAdds(n int, updates [][3]int) []int {
	diff := make([]int, n+1)
	for _, u := range updates {
		diff[u[0]] += u[2]
		diff[u[1]+1] -= u[2]
	}
	res := make([]int, n)
	run := 0
	for i := 0; i < n; i++ {
		run += diff[i]
		res[i] = run
	}
	return res
}

func MatrixRegionSums(matrix [][]int, queries [][4]int) []int {
	rows, cols := len(matrix), len(matrix[0])
	p := make([][]int, rows+1)
	for i := range p {
		p[i] = make([]int, cols+1)
	}
	for i := 0; i < rows; i++ {
		for j := 0; j < cols; j++ {
			p[i+1][j+1] = matrix[i][j] + p[i][j+1] + p[i+1][j] - p[i][j]
		}
	}
	res := make([]int, len(queries))
	for qi, q := range queries {
		r1, c1, r2, c2 := q[0], q[1], q[2], q[3]
		res[qi] = p[r2+1][c2+1] - p[r1][c2+1] - p[r2+1][c1] + p[r1][c1]
	}
	return res
}
