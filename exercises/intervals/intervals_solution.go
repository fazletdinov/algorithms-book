//go:build solution

package intervals

import "sort"

func MergeIntervals(intervals [][]int) [][]int {
	result := [][]int{}
	if len(intervals) == 0 {
		return result
	}
	sorted := make([][]int, len(intervals))
	copy(sorted, intervals)
	sort.Slice(sorted, func(i, j int) bool {
		return sorted[i][0] < sorted[j][0]
	})
	cur := []int{sorted[0][0], sorted[0][1]}
	for _, iv := range sorted[1:] {
		if iv[0] <= cur[1] {
			if iv[1] > cur[1] {
				cur[1] = iv[1]
			}
		} else {
			result = append(result, cur)
			cur = []int{iv[0], iv[1]}
		}
	}
	result = append(result, cur)
	return result
}

func InsertInterval(intervals [][]int, newInterval []int) [][]int {
	result := [][]int{}
	i, n := 0, len(intervals)
	for i < n && intervals[i][1] < newInterval[0] {
		result = append(result, intervals[i])
		i++
	}
	merged := []int{newInterval[0], newInterval[1]}
	for i < n && intervals[i][0] <= merged[1] {
		if intervals[i][0] < merged[0] {
			merged[0] = intervals[i][0]
		}
		if intervals[i][1] > merged[1] {
			merged[1] = intervals[i][1]
		}
		i++
	}
	result = append(result, merged)
	for i < n {
		result = append(result, intervals[i])
		i++
	}
	return result
}

func IntervalsIntersection(a, b [][]int) [][]int {
	result := [][]int{}
	i, j := 0, 0
	for i < len(a) && j < len(b) {
		start := a[i][0]
		if b[j][0] > start {
			start = b[j][0]
		}
		end := a[i][1]
		if b[j][1] < end {
			end = b[j][1]
		}
		if start <= end {
			result = append(result, []int{start, end})
		}
		if a[i][1] < b[j][1] {
			i++
		} else {
			j++
		}
	}
	return result
}

func CanAttendAllMeetings(intervals [][]int) bool {
	sorted := make([][]int, len(intervals))
	copy(sorted, intervals)
	sort.Slice(sorted, func(i, j int) bool {
		return sorted[i][0] < sorted[j][0]
	})
	for i := 1; i < len(sorted); i++ {
		if sorted[i][0] < sorted[i-1][1] {
			return false
		}
	}
	return true
}

func MinMeetingRooms(intervals [][]int) int {
	n := len(intervals)
	if n == 0 {
		return 0
	}
	starts := make([]int, n)
	ends := make([]int, n)
	for i, iv := range intervals {
		starts[i] = iv[0]
		ends[i] = iv[1]
	}
	sort.Ints(starts)
	sort.Ints(ends)
	rooms, maxRooms := 0, 0
	i, j := 0, 0
	for i < n {
		if starts[i] < ends[j] {
			rooms++
			if rooms > maxRooms {
				maxRooms = rooms
			}
			i++
		} else {
			rooms--
			j++
		}
	}
	return maxRooms
}
