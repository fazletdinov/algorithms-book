package streamstats

import (
	"math"
	"sort"
	"testing"
)

func approx(a, b float64) bool { return math.Abs(a-b) < 1e-9 }

// ── MedianFinder ────────────────────────────────────────────────────────────

func TestMedianFinderBasic(t *testing.T) {
	m := NewMedianFinder()
	if got := m.Median(); got != 0 {
		t.Errorf("пустой поток: Median = %v, ожидалось 0", got)
	}
	m.Add(1)
	m.Add(2)
	m.Add(3)
	if got := m.Median(); !approx(got, 2) {
		t.Errorf("[1 2 3]: Median = %v, ожидалось 2", got)
	}
	m.Add(4) // [1 2 3 4]
	if got := m.Median(); !approx(got, 2.5) {
		t.Errorf("[1 2 3 4]: Median = %v, ожидалось 2.5", got)
	}
}

func TestMedianFinderUnorderedInput(t *testing.T) {
	m := NewMedianFinder()
	for _, x := range []float64{5, 15, 1, 3} { // отсортировано: 1 3 5 15
		m.Add(x)
	}
	if got := m.Median(); !approx(got, 4) { // (3+5)/2
		t.Errorf("Median = %v, ожидалось 4", got)
	}
}

func TestMedianFinderMatchesSort(t *testing.T) {
	// Сверяем бегущую медиану с точной медианой отсортированного префикса.
	data := []float64{7, 2, 9, 1, 5, 8, 3, 6, 4, 10, 0, 12, 11, 13, 14}
	m := NewMedianFinder()
	var seen []float64
	for _, x := range data {
		m.Add(x)
		seen = append(seen, x)
		sorted := append([]float64(nil), seen...)
		sort.Float64s(sorted)
		var want float64
		n := len(sorted)
		if n%2 == 1 {
			want = sorted[n/2]
		} else {
			want = (sorted[n/2-1] + sorted[n/2]) / 2
		}
		if got := m.Median(); !approx(got, want) {
			t.Fatalf("после %d значений Median = %v, ожидалось %v", n, got, want)
		}
	}
}

// ── Histogram ────────────────────────────────────────────────────────────────

func TestHistogramQuantile(t *testing.T) {
	h := NewHistogram([]float64{10, 20, 30})
	for _, x := range []float64{5, 15, 15, 25, 35} {
		h.Observe(x)
	}
	// counts: (≤10)=1, (≤20)=2, (≤30)=1, (>30)=1; total=5.
	tests := []struct {
		q, want float64
	}{
		{0.2, 10},   // rank 1.0 — конец бакета 0
		{0.5, 17.5}, // rank 2.5 — в бакете 1: 10 + 10·(1.5/2)
		{0.9, 30},   // rank 4.5 — переполнение, клампим к последней границе
	}
	for _, tt := range tests {
		if got := h.Quantile(tt.q); !approx(got, tt.want) {
			t.Errorf("Quantile(%.2f) = %v, ожидалось %v", tt.q, got, tt.want)
		}
	}
}

func TestHistogramEmpty(t *testing.T) {
	h := NewHistogram([]float64{10, 20})
	if got := h.Quantile(0.5); got != 0 {
		t.Errorf("пустая гистограмма: Quantile = %v, ожидалось 0", got)
	}
}

func TestHistogramUnsortedBounds(t *testing.T) {
	// Границы можно передать в любом порядке — реализация обязана упорядочить.
	h := NewHistogram([]float64{30, 10, 20})
	h.Observe(5)                                  // бакет ≤10
	h.Observe(25)                                 // бакет ≤30
	if got := h.Quantile(0.5); !approx(got, 10) { // rank 1.0 → конец бакета 0
		t.Errorf("Quantile(0.5) = %v, ожидалось 10", got)
	}
}

func TestHistogramMerge(t *testing.T) {
	// Два «сервера» с одинаковыми границами; перцентиль считается ПОСЛЕ слияния
	// (перцентили не аддитивны — гистограммы да).
	h1 := NewHistogram([]float64{10, 20})
	h1.Observe(5)
	h1.Observe(5) // counts (≤10)=2
	h2 := NewHistogram([]float64{10, 20})
	h2.Observe(15)
	h2.Observe(15) // counts (≤20)=2

	h1.Merge(h2)                                   // объединённые counts: (≤10)=2, (≤20)=2; total=4
	if got := h1.Quantile(0.5); !approx(got, 10) { // rank 2.0 → конец бакета 0
		t.Errorf("после Merge Quantile(0.5) = %v, ожидалось 10", got)
	}
	if got := h1.Quantile(0.75); !approx(got, 15) { // rank 3.0 → в бакете 1: 10+10·0.5
		t.Errorf("после Merge Quantile(0.75) = %v, ожидалось 15", got)
	}
}
