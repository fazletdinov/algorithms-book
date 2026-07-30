//go:build solution

package npcomplete

import "sort"

func VerifySubsetSum(nums []int, chosen []int, target int) bool {
	used := make([]bool, len(nums))
	sum := 0
	for _, i := range chosen {
		if i < 0 || i >= len(nums) || used[i] {
			return false
		}
		used[i] = true
		sum += nums[i]
	}
	return sum == target
}

func SubsetSumExact(nums []int, target int) bool {
	var rec func(i, sum int) bool
	rec = func(i, sum int) bool {
		if sum == target {
			return true
		}
		if i == len(nums) || sum > target {
			return false
		}
		return rec(i+1, sum+nums[i]) || // взять nums[i]
			rec(i+1, sum) //            не взять
	}
	return rec(0, 0)
}

func FirstFitDecreasing(weights []int, cap int) int {
	ws := make([]int, len(weights))
	copy(ws, weights)
	sort.SliceStable(ws, func(i, j int) bool { return ws[i] > ws[j] })

	var bins []int // остаток места в каждой корзине
	for _, w := range ws {
		placed := false
		for i := range bins {
			if bins[i] >= w {
				bins[i] -= w
				placed = true
				break
			}
		}
		if !placed {
			bins = append(bins, cap-w)
		}
	}
	return len(bins)
}

func VertexCoverGreedy2Approx(n int, edges [][2]int) []int {
	covered := make([]bool, n)
	for _, e := range edges {
		u, v := e[0], e[1]
		if !covered[u] && !covered[v] {
			covered[u] = true
			covered[v] = true
		}
	}
	cover := make([]int, 0, n)
	for i := 0; i < n; i++ {
		if covered[i] {
			cover = append(cover, i)
		}
	}
	return cover
}
