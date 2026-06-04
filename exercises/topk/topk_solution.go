//go:build solution

package topk

import (
	"container/heap"
	"sort"
)

// minHeap — min-куча целых: вершина минимальна.
type minHeap []int

func (h minHeap) Len() int            { return len(h) }
func (h minHeap) Less(i, j int) bool  { return h[i] < h[j] }
func (h minHeap) Swap(i, j int)       { h[i], h[j] = h[j], h[i] }
func (h *minHeap) Push(x interface{}) { *h = append(*h, x.(int)) }
func (h *minHeap) Pop() interface{} {
	old := *h
	n := len(old)
	x := old[n-1]
	*h = old[:n-1]
	return x
}

// pointHeap — max-куча точек по квадрату расстояния до начала координат:
// вершина — самая дальняя.
type pointHeap [][]int

func dist2(p []int) int { return p[0]*p[0] + p[1]*p[1] }

func (h pointHeap) Len() int            { return len(h) }
func (h pointHeap) Less(i, j int) bool  { return dist2(h[i]) > dist2(h[j]) }
func (h pointHeap) Swap(i, j int)       { h[i], h[j] = h[j], h[i] }
func (h *pointHeap) Push(x interface{}) { *h = append(*h, x.([]int)) }
func (h *pointHeap) Pop() interface{} {
	old := *h
	n := len(old)
	x := old[n-1]
	*h = old[:n-1]
	return x
}

func FindKLargest(nums []int, k int) []int {
	if k <= 0 || len(nums) == 0 {
		return []int{}
	}
	h := &minHeap{}
	heap.Init(h)
	for _, num := range nums {
		if h.Len() < k {
			heap.Push(h, num)
		} else if num > (*h)[0] {
			heap.Pop(h)
			heap.Push(h, num)
		}
	}
	result := make([]int, h.Len())
	for i := len(result) - 1; i >= 0; i-- {
		result[i] = heap.Pop(h).(int)
	}
	return result
}

func TopKFrequent(nums []int, k int) []int {
	if k <= 0 || len(nums) == 0 {
		return []int{}
	}
	freq := make(map[int]int, len(nums))
	for _, num := range nums {
		freq[num]++
	}
	type pair struct{ num, count int }
	pairs := make([]pair, 0, len(freq))
	for num, count := range freq {
		pairs = append(pairs, pair{num, count})
	}
	sort.Slice(pairs, func(i, j int) bool { return pairs[i].count > pairs[j].count })
	if k > len(pairs) {
		k = len(pairs)
	}
	result := make([]int, k)
	for i := 0; i < k; i++ {
		result[i] = pairs[i].num
	}
	return result
}

func KthLargest(nums []int, k int) int {
	h := &minHeap{}
	heap.Init(h)
	for _, num := range nums {
		if h.Len() < k {
			heap.Push(h, num)
		} else if num > (*h)[0] {
			heap.Pop(h)
			heap.Push(h, num)
		}
	}
	return (*h)[0]
}

func KClosestPoints(points [][]int, k int) [][]int {
	if k <= 0 || len(points) == 0 {
		return [][]int{}
	}
	h := &pointHeap{}
	heap.Init(h)
	for _, p := range points {
		if h.Len() < k {
			heap.Push(h, p)
		} else if dist2(p) < dist2((*h)[0]) {
			heap.Pop(h)
			heap.Push(h, p)
		}
	}
	result := make([][]int, h.Len())
	for i := range result {
		result[i] = heap.Pop(h).([]int)
	}
	return result
}

func KClosestNumbers(arr []int, k, x int) []int {
	if k <= 0 || len(arr) == 0 {
		return []int{}
	}
	if k >= len(arr) {
		k = len(arr)
	}
	lo, hi := 0, len(arr)-1
	for hi-lo+1 > k {
		// Отбрасываем дальний конец; при равном расстоянии — правый (большее число).
		if x-arr[lo] <= arr[hi]-x {
			hi--
		} else {
			lo++
		}
	}
	result := make([]int, k)
	copy(result, arr[lo:lo+k])
	return result
}
