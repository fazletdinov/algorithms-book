package dsu

import (
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
)

// TestUnionFindScales — сложность, а не ответ. Без сжатия путей и без
// объединения по размеру Union(x, y) подвешивает корень одного к корню другого,
// и цепочка объединений соседей вытягивает дерево в путь длины n: тогда каждый
// Find с его дна — O(n), а n запросов — O(n²). Какой корень под какой
// подвешивать, перебор выбирает сам, поэтому цепочек две — с соседями в обоих
// порядках аргументов: одна из них станет путём при любом выборе. Быстрый
// поиск с перекраской всего массива на каждом Union — O(n) на объединение, тоже
// O(n²). Сжатие путей или объединение по размеру (хотя бы одно) — O(log n) на
// операцию и укладывается; вместе — почти O(1).
func TestUnionFindScales(t *testing.T) {
	const n = 100000
	failed, msg := false, ""
	scaletest.Within(t, scaletest.Limit,
		"UnionFind(n=100000): две цепочки Union соседей (x, x+1) и (x+1, x), затем по n запросов Connected"+
			" с дальнего конца — похоже на O(n) на операцию там, где нужен почти O(1)"+
			" (замер: эталон ~4 мс, без сжатия и размеров ~12.7 с, перекраска массива ~8.3 с)",
		func() {
			for _, forward := range []bool{true, false} {
				uf := NewUnionFind(n)
				for x := 0; x+1 < n; x++ {
					a, b := x, x+1
					if !forward {
						a, b = b, a
					}
					if !uf.Union(a, b) {
						failed, msg = true, "Union соседей вернул false: они ещё не были связаны"
						return
					}
				}
				for i := 0; i < n; i++ {
					// на пути глубины i и n−1−i в сумме дают n−1 при любом его направлении
					if !uf.Connected(i, n-1-i) {
						failed, msg = true, "Connected вернул false для связанных элементов"
						return
					}
				}
				if uf.Count() != 1 {
					failed, msg = true, "Count() после объединения всех соседей не равен 1"
					return
				}
			}
		})
	if failed {
		t.Fatal(msg)
	}
}
