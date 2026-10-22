//go:build !solution

// Package sparsetable — разреженная таблица для идемпотентного RMQ (минимум).
// Теория структуры — в книге: ../../src/sparse-table-structure.md
//
//	go test ./sparsetable/                 # твои решения
//	go test -tags solution ./sparsetable/  # эталон
//
// Реализуй NewSparse (предобработка O(n log n)) и Query (минимум на [l, r]
// включительно за O(1)). Таблица неизменяема: массив фиксируется при
// построении. Идея: table[k][i] — минимум на отрезке длиной 2^k, начиная с i;
// любой [l, r] покрывается двумя перекрывающимися отрезками степени двойки, а
// минимум идемпотентен — перекрытие не мешает.
package sparsetable

// Sparse — разреженная таблица. table[k][i] = min на [i, i+2^k-1];
// log[x] = ⌊log2 x⌋ для запроса за O(1).
type Sparse struct {
	table [][]int
	log   []int
}

// NewSparse строит таблицу по массиву за O(n log n). Массив копируется.
//
// Ограничения: len(arr) ≤ 2·10⁵, |arr[i]| ≤ 10⁹.
func NewSparse(arr []int) *Sparse {
	// TODO: предпосчитай log[], затем table[0] = копия arr, и далее
	// table[k][i] = min(table[k-1][i], table[k-1][i + 2^(k-1)]).
	panic("TODO: реализуй NewSparse")
}

// Query возвращает минимум на отрезке [l, r] включительно за O(1).
// Предполагается 0 <= l <= r < n.
//
// Ограничения: до 2·10⁵ запросов.
func (s *Sparse) Query(l, r int) int {
	// TODO: k = log[r-l+1]; ответ = min(table[k][l], table[k][r-2^k+1]).
	panic("TODO: реализуй Query")
}
