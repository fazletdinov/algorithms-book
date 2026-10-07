package streamstats

import (
	"math"
	"math/rand"
	"sort"
	"testing"
)

// exactMedian — точная медиана: отсортировать всё и взять середину.
func exactMedian(data []float64) float64 {
	s := append([]float64(nil), data...)
	sort.Float64s(s)
	n := len(s)
	if n%2 == 1 {
		return s[n/2]
	}
	return (s[n/2-1] + s[n/2]) / 2
}

// TestMedianFinderRandom: случайные потоки против точной медианы сортировкой.
// Узкий целочисленный диапазон даёт много повторов — это вскрывает ошибки
// баланса куч и выбора кучи при равных значениях. Сид фиксирован.
func TestMedianFinderRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(20260707))
	for run := 0; run < 100; run++ {
		m := NewMedianFinder()
		var seen []float64
		n := 1 + rng.Intn(80)
		for i := 0; i < n; i++ {
			x := float64(rng.Intn(21) - 10) // [-10..10]: повторы и отрицательные
			m.Add(x)
			seen = append(seen, x)
			if got, want := m.Median(), exactMedian(seen); math.Abs(got-want) > 1e-9 {
				t.Fatalf("run %d: после %v Median = %v, точная = %v", run, seen, got, want)
			}
		}
	}
}

// TestHistogramQuantileRandom: квантиль гистограммы против точного квантиля по
// сырым данным. Гистограмма знает про наблюдение только его бакет, поэтому
// честный допуск — «не дальше ширины бакета»: ответ обязан лежать в том же
// бакете [lo, hi], что и точный квантиль (тогда |got-exact| <= hi-lo).
// Для точного значения из бакета переполнения ответ клампится к последней границе.
func TestHistogramQuantileRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(20260707))
	for run := 0; run < 200; run++ {
		nb := 2 + rng.Intn(4) // 2..5 бакетов с границами 10, 20, ...
		bounds := make([]float64, nb)
		for i := range bounds {
			bounds[i] = float64((i + 1) * 10)
		}
		h := NewHistogram(bounds)

		n := 1 + rng.Intn(200)
		data := make([]float64, n)
		for i := range data {
			// Непрерывные значения не попадают ровно на границы; хвост ~13%
			// уходит в бакет переполнения (> последней границы).
			data[i] = rng.Float64() * (bounds[nb-1] + 15)
			h.Observe(data[i])
		}
		sort.Float64s(data)

		for probe := 0; probe < 5; probe++ {
			q := 0.05 + 0.9*rng.Float64()
			got := h.Quantile(q)

			// Точный квантиль при том же определении ранга: k-я порядковая
			// статистика, k = ceil(q·n).
			k := int(math.Ceil(q * float64(n)))
			if k < 1 {
				k = 1
			}
			if k > n {
				k = n
			}
			exact := data[k-1]

			bi := sort.SearchFloat64s(bounds, exact) // бакет точного квантиля
			if bi == nb {                            // переполнение — лучшая оценка это последняя граница
				if got != bounds[nb-1] {
					t.Fatalf("run %d: Quantile(%v) = %v, точный %v в переполнении — ожидался кламп к %v",
						run, q, got, exact, bounds[nb-1])
				}
				continue
			}
			lo := 0.0
			if bi > 0 {
				lo = bounds[bi-1]
			}
			hi := bounds[bi]
			if got < lo || got > hi {
				t.Fatalf("run %d: Quantile(%v) = %v вне бакета точного квантиля [%v, %v] (точный = %v, n=%d)",
					run, q, got, lo, hi, exact, n)
			}
		}
	}
}

// TestHistogramMergeRandom: слить две гистограммы == построить одну по
// конкатенации потоков. Именно это свойство делает гистограммы агрегируемыми
// между серверами (в отличие от самих перцентилей).
func TestHistogramMergeRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(20260707))
	for run := 0; run < 100; run++ {
		nb := 2 + rng.Intn(4)
		bounds := make([]float64, nb)
		for i := range bounds {
			bounds[i] = float64((i + 1) * 10)
		}
		h1, h2, all := NewHistogram(bounds), NewHistogram(bounds), NewHistogram(bounds)

		n1, n2 := rng.Intn(60), rng.Intn(60) // включая пустые половины
		for i := 0; i < n1; i++ {
			x := rng.Float64() * (bounds[nb-1] + 15)
			h1.Observe(x)
			all.Observe(x)
		}
		for i := 0; i < n2; i++ {
			x := rng.Float64() * (bounds[nb-1] + 15)
			h2.Observe(x)
			all.Observe(x)
		}

		h1.Merge(h2)
		for _, q := range []float64{0.1, 0.25, 0.5, 0.75, 0.9, 0.99} {
			if got, want := h1.Quantile(q), all.Quantile(q); math.Abs(got-want) > 1e-9 {
				t.Fatalf("run %d: после Merge Quantile(%v) = %v, по конкатенации = %v (n1=%d n2=%d)",
					run, q, got, want, n1, n2)
			}
		}
	}
}
