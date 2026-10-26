//go:build solution

package greedy

import (
	"cmp"
	"slices"
	"sort"
)

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

func PartitionLabels(s string) []int {
	var last [256]int
	for i := 0; i < len(s); i++ {
		last[s[i]] = i
	}
	res := []int{}
	start, end := 0, 0
	for i := 0; i < len(s); i++ {
		if last[s[i]] > end {
			end = last[s[i]] // кусок обязан дотянуться до последней такой буквы
		}
		if i == end {
			res = append(res, end-start+1)
			start = i + 1
		}
	}
	return res
}

func CanCompleteCircuit(gas, cost []int) int {
	total, tank, start := 0, 0, 0
	for i := range gas {
		d := gas[i] - cost[i]
		total += d
		tank += d
		if tank < 0 {
			// ни один старт от start до i не доедет дальше i
			start = i + 1
			tank = 0
		}
	}
	if total < 0 {
		return -1
	}
	return start
}

func LeastInterval(tasks []byte, n int) int {
	var freq [256]int
	maxF := 0
	for _, t := range tasks {
		freq[t]++
		if freq[t] > maxF {
			maxF = freq[t]
		}
	}
	cntMax := 0
	for _, f := range freq {
		if f == maxF {
			cntMax++
		}
	}
	if maxF == 0 {
		return 0
	}
	// каркас самой частой задачи: maxF−1 блоков по n+1 тактов и последний ряд
	frame := (maxF-1)*(n+1) + cntMax
	return max(frame, len(tasks))
}

func JobScheduling(startTime, endTime, profit []int) int {
	n := len(startTime)
	order := make([]int, n)
	for i := range order {
		order[i] = i
	}
	slices.SortFunc(order, func(a, b int) int { return cmp.Compare(endTime[a], endTime[b]) })
	ends := make([]int, n)
	for k, i := range order {
		ends[k] = endTime[i]
	}
	// best[k] — наибольшая плата среди первых k заявок по концу
	best := make([]int, n+1)
	for k, i := range order {
		// сколько заявок из первых k кончаются не позже начала заявки i
		j := sort.Search(k, func(x int) bool { return ends[x] > startTime[i] })
		best[k+1] = max(best[k], profit[i]+best[j])
	}
	return best[n]
}
