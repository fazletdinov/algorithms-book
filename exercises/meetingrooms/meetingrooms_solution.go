//go:build solution

package meetingrooms

import (
	"container/heap"
	"sort"
)

func MinMeetingRooms(intervals [][]int) int {
	if len(intervals) == 0 {
		return 0
	}
	sort.Slice(intervals, func(i, j int) bool {
		return intervals[i][0] < intervals[j][0]
	})
	h := &minHeap{} // времена окончаний занятых комнат
	heap.Init(h)
	for _, iv := range intervals {
		if h.Len() > 0 && (*h)[0] <= iv[0] {
			heap.Pop(h) // комната освободилась — переиспользуем
		}
		heap.Push(h, iv[1])
	}
	return h.Len()
}

type minHeap []int

func (h minHeap) Len() int           { return len(h) }
func (h minHeap) Less(i, j int) bool { return h[i] < h[j] }
func (h minHeap) Swap(i, j int)      { h[i], h[j] = h[j], h[i] }
func (h *minHeap) Push(x any)        { *h = append(*h, x.(int)) }
func (h *minHeap) Pop() any {
	old := *h
	n := len(old)
	x := old[n-1]
	*h = old[:n-1]
	return x
}
