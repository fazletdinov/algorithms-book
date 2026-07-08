//go:build solution

package streamstats

import (
	"container/heap"
	"sort"
)

// ── 1. MedianFinder: две кучи (паттерн главы) ───────────────────────────────
//
// Нижняя половина потока — в max-куче (вершина = наибольший из «маленьких»),
// верхняя — в min-куче (вершина = наименьший из «больших»). Медиана — на
// вершинах. Точно, но память O(n): храним все значения.

type maxHeap []float64

func (h maxHeap) Len() int           { return len(h) }
func (h maxHeap) Less(i, j int) bool { return h[i] > h[j] }
func (h maxHeap) Swap(i, j int)      { h[i], h[j] = h[j], h[i] }
func (h *maxHeap) Push(x any)        { *h = append(*h, x.(float64)) }
func (h *maxHeap) Pop() any          { o := *h; n := len(o); v := o[n-1]; *h = o[:n-1]; return v }

type minHeap []float64

func (h minHeap) Len() int           { return len(h) }
func (h minHeap) Less(i, j int) bool { return h[i] < h[j] }
func (h minHeap) Swap(i, j int)      { h[i], h[j] = h[j], h[i] }
func (h *minHeap) Push(x any)        { *h = append(*h, x.(float64)) }
func (h *minHeap) Pop() any          { o := *h; n := len(o); v := o[n-1]; *h = o[:n-1]; return v }

type MedianFinder struct {
	lo maxHeap // нижняя половина
	hi minHeap // верхняя половина
}

func NewMedianFinder() *MedianFinder { return &MedianFinder{} }

func (m *MedianFinder) Add(x float64) {
	if m.lo.Len() == 0 || x <= m.lo[0] {
		heap.Push(&m.lo, x)
	} else {
		heap.Push(&m.hi, x)
	}
	// Баланс: в lo либо столько же, либо на 1 больше, чем в hi.
	if m.lo.Len() > m.hi.Len()+1 {
		heap.Push(&m.hi, heap.Pop(&m.lo))
	} else if m.hi.Len() > m.lo.Len() {
		heap.Push(&m.lo, heap.Pop(&m.hi))
	}
}

func (m *MedianFinder) Median() float64 {
	if m.lo.Len() == 0 {
		return 0
	}
	if m.lo.Len() > m.hi.Len() {
		return m.lo[0]
	}
	return (m.lo[0] + m.hi[0]) / 2
}

// ── 2. Histogram: приближённые перцентили в фиксированной памяти ────────────
//
// Модель Prometheus/HdrHistogram: значения раскладываются по бакетам с
// верхними границами (le), храним только счётчики. Память O(бакетов) при любом
// объёме потока; даёт ЛЮБОЙ квантиль (p50, p99…) и, главное, СКЛАДЫВАЕТСЯ между
// серверами (перцентили не аддитивны — гистограммы да).

type Histogram struct {
	bounds []float64 // верхние границы бакетов (по возрастанию)
	counts []int64   // len(bounds)+1: последний — переполнение (значения > последней границы)
	total  int64
}

func NewHistogram(upperBounds []float64) *Histogram {
	b := append([]float64(nil), upperBounds...)
	sort.Float64s(b)
	return &Histogram{bounds: b, counts: make([]int64, len(b)+1)}
}

func (h *Histogram) Observe(x float64) {
	// Первый бакет с границей >= x (Prometheus «le»); x больше всех — переполнение.
	i := sort.SearchFloat64s(h.bounds, x)
	h.counts[i]++
	h.total++
}

func (h *Histogram) Quantile(q float64) float64 {
	if h.total == 0 {
		return 0
	}
	rank := q * float64(h.total)
	var cum float64
	for i := 0; i < len(h.counts); i++ {
		c := float64(h.counts[i])
		if cum+c >= rank {
			if i == len(h.bounds) { // переполнение — лучшая конечная оценка
				return h.bounds[len(h.bounds)-1]
			}
			lower := 0.0
			if i > 0 {
				lower = h.bounds[i-1]
			}
			upper := h.bounds[i]
			if c == 0 {
				return upper
			}
			// Линейная интерполяция внутри бакета (как histogram_quantile).
			return lower + (upper-lower)*((rank-cum)/c)
		}
		cum += c
	}
	return h.bounds[len(h.bounds)-1]
}

// Merge складывает другую гистограмму с ТЕМИ ЖЕ границами в эту. Так перцентили
// агрегируются между серверами/окнами: сложить гистограммы, затем считать квантиль.
func (h *Histogram) Merge(other *Histogram) {
	for i := range h.counts {
		h.counts[i] += other.counts[i]
	}
	h.total += other.total
}
