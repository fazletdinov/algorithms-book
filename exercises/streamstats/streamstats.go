//go:build !solution

// Package streamstats — боевой мини-проект: перцентили на потоке.
// Теория паттерна — в книге: ../../src/two-heaps.md
//
//	go test ./streamstats/                 # твоя реализация
//	go test -tags solution ./streamstats/  # эталон
//
// Реализуй ДВА подхода и сравни:
//  1. MedianFinder — две кучи (паттерн главы): точная медиана, память O(n);
//  2. Histogram — то, что реально в проде (Prometheus/HdrHistogram): любой
//     квантиль (p50, p99…) в фиксированной памяти, и гистограммы СКЛАДЫВАЮТСЯ.
package streamstats

// MedianFinder держит бегущую медиану потока значений на двух кучах.
type MedianFinder struct {
	// TODO: max-куча нижней половины + min-куча верхней (например, через
	// container/heap). Медиана лежит на их вершинах.
}

func NewMedianFinder() *MedianFinder { return &MedianFinder{} }

// Add добавляет значение в поток.
func (m *MedianFinder) Add(x float64) {
	// TODO: положить x в нужную половину (x <= вершины нижней → в нижнюю, иначе
	// в верхнюю), затем сбалансировать кучи так, чтобы их размеры отличались ≤ 1.
	panic("TODO: реализуй Add")
}

// Median возвращает текущую медиану (0, если поток пуст). При равных размерах
// куч — среднее их вершин; иначе — вершина большей.
func (m *MedianFinder) Median() float64 {
	panic("TODO: реализуй Median")
}

// Histogram приближает перцентили в фиксированной памяти: значения падают в
// бакеты с верхними границами upperBounds, храним только счётчики.
type Histogram struct {
	bounds []float64
	counts []int64 // len(bounds)+1: последний — переполнение
	total  int64
}

// NewHistogram создаёт гистограмму с заданными верхними границами бакетов.
func NewHistogram(upperBounds []float64) *Histogram {
	b := append([]float64(nil), upperBounds...)
	// границы должны быть отсортированы; при необходимости отсортируй сами
	return &Histogram{bounds: b, counts: make([]int64, len(b)+1)}
}

// Observe учитывает значение x: увеличивает счётчик первого бакета с границей
// >= x (значения больше всех границ идут в бакет переполнения).
func (h *Histogram) Observe(x float64) {
	// TODO: найди индекс бакета (первый bound >= x; если больше всех —
	// len(bounds), переполнение), увеличь counts[i] и total.
	panic("TODO: реализуй Observe")
}

// Quantile возвращает приближённый q-квантиль (0<q<1), 0 при пустом потоке.
// Внутри бакета — линейная интерполяция (как histogram_quantile в Prometheus).
func (h *Histogram) Quantile(q float64) float64 {
	// TODO: rank = q*total; иди по бакетам, накапливая счётчики, пока не
	// перевали rank; интерполируй между нижней и верхней границей бакета.
	panic("TODO: реализуй Quantile")
}

// Merge складывает гистограмму other (с теми же границами) в эту — так
// перцентили агрегируют между серверами (сложить гистограммы → считать квантиль).
func (h *Histogram) Merge(other *Histogram) {
	// TODO: поэлементно сложи counts и total.
	panic("TODO: реализуй Merge")
}
