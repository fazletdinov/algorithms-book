//go:build solution

package twoheaps

import (
	"container/heap"
	"sort"
)

// maxHeap — меньшая половина (максимум на вершине).
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

// minHeap — большая половина (минимум на вершине).
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

// MedianFinder поддерживает медиану потока чисел через две кучи.
type MedianFinder struct {
	lower *maxHeap // элементы <= медианы
	upper *minHeap // элементы >= медианы
}

// NewMedianFinder создаёт пустой MedianFinder.
func NewMedianFinder() *MedianFinder {
	return &MedianFinder{lower: &maxHeap{}, upper: &minHeap{}}
}

// AddNum добавляет число num в поток.
func (mf *MedianFinder) AddNum(num int) {
	if mf.lower.Len() == 0 || num <= (*mf.lower)[0] {
		heap.Push(mf.lower, num)
	} else {
		heap.Push(mf.upper, num)
	}

	// балансировка: размеры отличаются не более чем на 1
	if mf.lower.Len() > mf.upper.Len()+1 {
		heap.Push(mf.upper, heap.Pop(mf.lower).(int))
	} else if mf.upper.Len() > mf.lower.Len()+1 {
		heap.Push(mf.lower, heap.Pop(mf.upper).(int))
	}
}

// FindMedian возвращает медиану всех добавленных чисел (0 для пустого набора).
func (mf *MedianFinder) FindMedian() float64 {
	switch {
	case mf.lower.Len() == 0 && mf.upper.Len() == 0:
		return 0
	case mf.lower.Len() == mf.upper.Len():
		return float64((*mf.lower)[0]+(*mf.upper)[0]) / 2.0
	case mf.lower.Len() > mf.upper.Len():
		return float64((*mf.lower)[0])
	default:
		return float64((*mf.upper)[0])
	}
}

// SlidingWindowMedian возвращает медиану каждого окна размера k, скользящего по nums.
func SlidingWindowMedian(nums []int, k int) []float64 {
	if k <= 0 || k > len(nums) {
		return []float64{}
	}
	lo, hi := &maxHeap{}, &minHeap{} // меньшая и большая половины окна
	loSize, hiSize := 0, 0           // живые элементы: выбывшие ещё лежат в кучах
	delayed := map[int]int{}         // выбывшие, которых пока не сняли с куч

	// prune снимает с вершины выбывших: удаляем их, только когда всплывут наверх.
	pruneLo := func() {
		for lo.Len() > 0 && delayed[(*lo)[0]] > 0 {
			delayed[(*lo)[0]]--
			heap.Pop(lo)
		}
	}
	pruneHi := func() {
		for hi.Len() > 0 && delayed[(*hi)[0]] > 0 {
			delayed[(*hi)[0]]--
			heap.Pop(hi)
		}
	}
	// balance держит loSize == hiSize или loSize == hiSize+1.
	balance := func() {
		if loSize > hiSize+1 {
			heap.Push(hi, heap.Pop(lo).(int))
			loSize--
			hiSize++
			pruneLo()
		} else if loSize < hiSize {
			heap.Push(lo, heap.Pop(hi).(int))
			hiSize--
			loSize++
			pruneHi()
		}
	}
	add := func(x int) {
		if loSize == 0 || x <= (*lo)[0] {
			heap.Push(lo, x)
			loSize++
		} else {
			heap.Push(hi, x)
			hiSize++
		}
		balance()
	}
	remove := func(x int) {
		delayed[x]++
		if x <= (*lo)[0] {
			loSize--
			if x == (*lo)[0] {
				pruneLo()
			}
		} else {
			hiSize--
			if x == (*hi)[0] {
				pruneHi()
			}
		}
		balance()
	}
	median := func() float64 {
		if k%2 == 1 {
			return float64((*lo)[0])
		}
		return (float64((*lo)[0]) + float64((*hi)[0])) / 2.0
	}

	res := make([]float64, 0, len(nums)-k+1)
	for i, x := range nums {
		add(x)
		if i >= k {
			remove(nums[i-k])
		}
		if i >= k-1 {
			res = append(res, median())
		}
	}
	return res
}

// capitalItem — проект для задачи IPO.
type capitalItem struct {
	capital, profit int
}

// profitHeap — max-heap проектов по прибыли (вершина — максимальная прибыль).
type profitHeap []capitalItem

func (h profitHeap) Len() int           { return len(h) }
func (h profitHeap) Less(i, j int) bool { return h[i].profit > h[j].profit }
func (h profitHeap) Swap(i, j int)      { h[i], h[j] = h[j], h[i] }
func (h *profitHeap) Push(x any)        { *h = append(*h, x.(capitalItem)) }
func (h *profitHeap) Pop() any {
	old := *h
	n := len(old)
	x := old[n-1]
	*h = old[:n-1]
	return x
}

// MaximizeCapital решает задачу IPO: до k проектов при начальном капитале w.
func MaximizeCapital(k, w int, profits, capital []int) int {
	n := len(profits)
	items := make([]capitalItem, n)
	for i := range profits {
		items[i] = capitalItem{capital: capital[i], profit: profits[i]}
	}
	// проекты отсортированы по требуемому капиталу
	sort.Slice(items, func(i, j int) bool { return items[i].capital < items[j].capital })

	available := &profitHeap{}
	idx := 0
	for ; k > 0; k-- {
		// перекладываем в max-heap все доступные при текущем капитале проекты
		for idx < n && items[idx].capital <= w {
			heap.Push(available, items[idx])
			idx++
		}
		if available.Len() == 0 {
			break
		}
		w += heap.Pop(available).(capitalItem).profit
	}
	return w
}
