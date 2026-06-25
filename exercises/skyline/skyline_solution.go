//go:build solution

package skyline

import (
	"container/heap"
	"sort"
)

func GetSkyline(buildings [][]int) [][]int {
	type ev struct{ x, h int } // h<0 — вход здания (левый край), h>0 — выход (правый)
	var events []ev
	for _, b := range buildings {
		events = append(events, ev{b[0], -b[2]}, ev{b[1], b[2]})
	}
	sort.Slice(events, func(i, j int) bool {
		if events[i].x != events[j].x {
			return events[i].x < events[j].x
		}
		return events[i].h < events[j].h // при равном x: входы (отриц.) раньше выходов
	})

	h := &maxHeap{0} // 0 — уровень земли, всегда в куче
	toRemove := map[int]int{}
	prev := 0
	res := [][]int{}
	for _, e := range events {
		if e.h < 0 {
			heap.Push(h, -e.h) // здание началось — высота активна
		} else {
			toRemove[e.h]++ // здание кончилось — ленивое удаление
		}
		for h.Len() > 0 && toRemove[(*h)[0]] > 0 {
			toRemove[(*h)[0]]--
			heap.Pop(h)
		}
		if cur := (*h)[0]; cur != prev {
			res = append(res, []int{e.x, cur})
			prev = cur
		}
	}
	return res
}

type maxHeap []int

func (h maxHeap) Len() int           { return len(h) }
func (h maxHeap) Less(i, j int) bool { return h[i] > h[j] }
func (h maxHeap) Swap(i, j int)      { h[i], h[j] = h[j], h[i] }
func (h *maxHeap) Push(x any)        { *h = append(*h, x.(int)) }
func (h *maxHeap) Pop() any {
	old := *h
	n := len(old)
	x := old[n-1]
	*h = old[:n-1]
	return x
}
