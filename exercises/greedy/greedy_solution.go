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
