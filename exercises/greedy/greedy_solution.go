//go:build solution

package greedy

import "sort"

func MaxNonOverlapping(intervals [][]int) int {
	if len(intervals) == 0 {
		return 0
	}
	sort.Slice(intervals, func(i, j int) bool {
		return intervals[i][1] < intervals[j][1]
	})
	count := 1
	lastEnd := intervals[0][1]
	for _, iv := range intervals[1:] {
		if iv[0] >= lastEnd {
			count++
			lastEnd = iv[1]
		}
	}
	return count
}

func CanJump(nums []int) bool {
	maxReach := 0
	for i, v := range nums {
		if i > maxReach {
			return false
		}
		if i+v > maxReach {
			maxReach = i + v
		}
	}
	return true
}

func MinJumps(nums []int) int {
	jumps := 0
	curEnd := 0
	farthest := 0
	for i := 0; i < len(nums)-1; i++ {
		if i+nums[i] > farthest {
			farthest = i + nums[i]
		}
		if i == curEnd {
			jumps++
			curEnd = farthest
		}
	}
	return jumps
}

func MaxProfit(prices []int) int {
	profit := 0
	for i := 1; i < len(prices); i++ {
		if prices[i] > prices[i-1] {
			profit += prices[i] - prices[i-1]
		}
	}
	return profit
}

func FractionalKnapsack(values, weights []int, capacity int) float64 {
	n := len(values)
	idx := make([]int, n)
	for i := range idx {
		idx[i] = i
	}
	sort.Slice(idx, func(a, b int) bool {
		ra := float64(values[idx[a]]) / float64(weights[idx[a]])
		rb := float64(values[idx[b]]) / float64(weights[idx[b]])
		return ra > rb
	})
	total := 0.0
	remaining := capacity
	for _, i := range idx {
		if remaining == 0 {
			break
		}
		if weights[i] <= remaining {
			total += float64(values[i])
			remaining -= weights[i]
		} else {
			total += float64(values[i]) * float64(remaining) / float64(weights[i])
			remaining = 0
		}
	}
	return total
}
