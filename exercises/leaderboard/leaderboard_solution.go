//go:build solution

package leaderboard

import (
	"container/heap"
	"sort"
)

// ── 1. TopK: min-куча размера K (паттерн главы) ─────────────────────────────
//
// Держим K наибольших значений потока в min-куче: корень — наименьший из
// отобранных, его дёшево вытеснить бо́льшим. Память O(k), событие O(log k).
// Но: только значения — ни обновить очки игрока, ни узнать его ранг нельзя.

type minHeap []int

func (h minHeap) Len() int           { return len(h) }
func (h minHeap) Less(i, j int) bool { return h[i] < h[j] }
func (h minHeap) Swap(i, j int)      { h[i], h[j] = h[j], h[i] }
func (h *minHeap) Push(x any)        { *h = append(*h, x.(int)) }
func (h *minHeap) Pop() any          { o := *h; n := len(o); v := o[n-1]; *h = o[:n-1]; return v }

type TopK struct {
	k int
	h minHeap
}

func NewTopK(k int) *TopK { return &TopK{k: k} }

func (t *TopK) Add(x int) {
	if t.k <= 0 {
		return
	}
	if t.h.Len() < t.k {
		heap.Push(&t.h, x)
	} else if x > t.h[0] { // больше слабейшего в топе — вытесняем корень
		t.h[0] = x
		heap.Fix(&t.h, 0)
	}
}

// Top возвращает текущие K наибольших по убыванию.
func (t *TopK) Top() []int {
	out := append([]int(nil), t.h...)
	sort.Sort(sort.Reverse(sort.IntSlice(out)))
	return out
}

// ── 2. Leaderboard: упорядоченный набор (модель Redis ZSET) ─────────────────
//
// Именованные участники с обновляемыми очками, топ-N и ранг. В Redis это Sorted
// Set (skip list + хеш): ZADD/ZINCRBY/ZREVRANGE/ZREVRANK — O(log n), ZSCORE O(1).
// Здесь — учебная реализация семантики (порядок считаем при запросе).
// Тай-брейк: по очкам убыв., при равенстве — по имени лексикографически.

type Leaderboard struct {
	score map[string]int
}

func NewLeaderboard() *Leaderboard { return &Leaderboard{score: make(map[string]int)} }

// Set задаёт очки участнику (ZADD — перезапись).
func (l *Leaderboard) Set(member string, score int) { l.score[member] = score }

// Incr прибавляет delta к очкам участника (ZINCRBY) и возвращает новое значение.
func (l *Leaderboard) Incr(member string, delta int) int {
	l.score[member] += delta
	return l.score[member]
}

// Score возвращает очки участника (ZSCORE); ok=false, если его нет.
func (l *Leaderboard) Score(member string) (int, bool) {
	s, ok := l.score[member]
	return s, ok
}

func (l *Leaderboard) ordered() []string {
	ms := make([]string, 0, len(l.score))
	for m := range l.score {
		ms = append(ms, m)
	}
	sort.Slice(ms, func(i, j int) bool {
		if l.score[ms[i]] != l.score[ms[j]] {
			return l.score[ms[i]] > l.score[ms[j]]
		}
		return ms[i] < ms[j]
	})
	return ms
}

// TopN возвращает первых n участников по убыванию очков (ZREVRANGE 0..n-1).
func (l *Leaderboard) TopN(n int) []string {
	ms := l.ordered()
	if n < 0 {
		n = 0
	}
	if n > len(ms) {
		n = len(ms)
	}
	return ms[:n]
}

// Rank возвращает 0-based позицию участника сверху (ZREVRANK); -1, если его нет.
func (l *Leaderboard) Rank(member string) int {
	if _, ok := l.score[member]; !ok {
		return -1
	}
	for i, m := range l.ordered() {
		if m == member {
			return i
		}
	}
	return -1
}
