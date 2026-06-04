//go:build solution

package kwaymerge

import "container/heap"

// element — элемент кучи: значение и информация, откуда оно пришло.
type element struct {
	val      int // значение
	arrayIdx int // индекс массива
	elemIdx  int // позиция в этом массиве
}

type minHeap []element

func (h minHeap) Len() int            { return len(h) }
func (h minHeap) Less(i, j int) bool  { return h[i].val < h[j].val }
func (h minHeap) Swap(i, j int)       { h[i], h[j] = h[j], h[i] }
func (h *minHeap) Push(x interface{}) { *h = append(*h, x.(element)) }
func (h *minHeap) Pop() interface{} {
	old := *h
	n := len(old)
	x := old[n-1]
	*h = old[:n-1]
	return x
}

// buildHeap кладёт первый элемент каждого непустого массива в кучу.
func buildHeap(arrays [][]int) *minHeap {
	h := &minHeap{}
	for i := range arrays {
		if len(arrays[i]) > 0 {
			*h = append(*h, element{val: arrays[i][0], arrayIdx: i, elemIdx: 0})
		}
	}
	heap.Init(h)
	return h
}

// advance извлекает минимум из кучи и подкладывает следующий элемент того же массива.
func advance(h *minHeap, arrays [][]int) element {
	minElem := heap.Pop(h).(element)
	next := minElem.elemIdx + 1
	if next < len(arrays[minElem.arrayIdx]) {
		heap.Push(h, element{
			val:      arrays[minElem.arrayIdx][next],
			arrayIdx: minElem.arrayIdx,
			elemIdx:  next,
		})
	}
	return minElem
}

func MergeKSortedArrays(arrays [][]int) []int {
	h := buildHeap(arrays)
	result := make([]int, 0)
	for h.Len() > 0 {
		result = append(result, advance(h, arrays).val)
	}
	return result
}

func KthSmallestInSortedArrays(arrays [][]int, k int) int {
	if k <= 0 {
		return 0
	}
	total := 0
	for i := range arrays {
		total += len(arrays[i])
	}
	if k > total {
		return 0
	}
	h := buildHeap(arrays)
	var val int
	for i := 0; i < k; i++ {
		val = advance(h, arrays).val
	}
	return val
}

func SmallestRange(arrays [][]int) []int {
	// Текущий максимум среди голов всех списков.
	curMax := 0
	h := &minHeap{}
	for i := range arrays {
		if len(arrays[i]) == 0 {
			// Список пуст — покрыть все списки невозможно.
			return []int{}
		}
		v := arrays[i][0]
		*h = append(*h, element{val: v, arrayIdx: i, elemIdx: 0})
		if len(*h) == 1 || v > curMax {
			curMax = v
		}
	}
	heap.Init(h)

	bestStart, bestEnd := (*h)[0].val, curMax
	for {
		minElem := heap.Pop(h).(element)
		// Текущий диапазон [minElem.val, curMax] покрывает все списки.
		if curMax-minElem.val < bestEnd-bestStart ||
			(curMax-minElem.val == bestEnd-bestStart && minElem.val < bestStart) {
			bestStart, bestEnd = minElem.val, curMax
		}
		next := minElem.elemIdx + 1
		if next >= len(arrays[minElem.arrayIdx]) {
			// Список исчерпан — дальше покрыть все нельзя.
			break
		}
		nv := arrays[minElem.arrayIdx][next]
		if nv > curMax {
			curMax = nv
		}
		heap.Push(h, element{val: nv, arrayIdx: minElem.arrayIdx, elemIdx: next})
	}
	return []int{bestStart, bestEnd}
}

func KthSmallestInMatrix(matrix [][]int, k int) int {
	h := buildHeap(matrix)
	var val int
	for i := 0; i < k; i++ {
		val = advance(h, matrix).val
	}
	return val
}
