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

// starEdges — звезда: центр first связан с first+1, …, first+n−1 (n−1 связь);
// forward задаёт порядок концов в паре. Звезда бьёт два перебора сразу.
// (1) Обход с нуля от одного конца перед каждой связью: от центра он проходит
// весь уже собранный кусок — O(n²). (2) Union без сжатия пути и без размеров:
// Union(центр, x) подвешивает корень центра под x, и путь от центра к корню
// растёт на каждой связи — O(n²). Какой конец взять (или какой корень под какой
// подвесить), перебор решает сам, поэтому тесты гоняют оба порядка.
func starEdges(n, first int, forward bool) [][]int {
	edges := make([][]int, 0, n)
	for x := first + 1; x < first+n; x++ {
		if forward {
			edges = append(edges, []int{first, x})
		} else {
			edges = append(edges, []int{x, first})
		}
	}
	return edges
}

// TestFindRedundantConnectionScales — сложность, а не ответ: звезда на 1…n и в
// конце связь двух лучей, замыкающая цикл.
func TestFindRedundantConnectionScales(t *testing.T) {
	const n = 100000
	var got [2][]int
	scaletest.Within(t, scaletest.Limit,
		"FindRedundantConnection(звезда из 100000 узлов + связь двух лучей, оба порядка концов) — похоже на O(n²):"+
			" перед каждой связью обходишь граф с нуля или поднимаешься к корню по длинному пути"+
			" (замер: эталон ~10 мс, обход с нуля ~16.5 с, Union без сжатия и размеров ~6.4 с)",
		func() {
			for i, forward := range []bool{true, false} {
				edges := append(starEdges(n, 1, forward), []int{2, 3})
				got[i] = FindRedundantConnection(edges)
			}
		})
	for _, g := range got {
		if len(g) != 2 || g[0] != 2 || g[1] != 3 {
			t.Fatalf("FindRedundantConnection = %v, ожидалось [2 3]", g)
		}
	}
}

// TestValidTreeScales — звезда на 0…n−1: рёбер ровно n−1, поэтому проверка
// числа рёбер ответа не даёт, и перебор идёт O(n²).
func TestValidTreeScales(t *testing.T) {
	const n = 100000
	got := [2]bool{}
	scaletest.Within(t, scaletest.Limit,
		"ValidTree(звезда из 100000 вершин, оба порядка концов) — похоже на O(n²): перед каждым ребром"+
			" обходишь граф с нуля или поднимаешься к корню по длинному пути"+
			" (замер: эталон ~8 мс, обход с нуля ~16.3 с, Union без сжатия и размеров ~6.4 с)",
		func() {
			for i, forward := range []bool{true, false} {
				got[i] = ValidTree(n, starEdges(n, 0, forward))
			}
		})
	if !got[0] || !got[1] {
		t.Fatalf("ValidTree(звезда) = %v, ожидалось true в обоих порядках", got)
	}
}

// varName — имя переменной по номеру: буквы base-26, до 4 букв на 4.5·10⁵ имён.
func varName(i int) string {
	b := []byte{}
	for {
		b = append(b, byte('a'+i%26))
		i /= 26
		if i == 0 {
			return string(b)
		}
	}
}

// TestEquationsPossibleScales — две цепочки равенств по m переменных и m
// неравенств «переменная первой ↔ переменная второй». Ответ true, поэтому
// досрочного выхода нет; перебор, который на каждое неравенство ищет обходом
// по равенствам путь от одного конца к другому, проходит целую цепочку с любого
// конца — O(m²).
func TestEquationsPossibleScales(t *testing.T) {
	const m = 50000
	eqs := make([]string, 0, 3*m)
	for k := range 2 {
		for i := 0; i+1 < m; i++ {
			eqs = append(eqs, varName(k*m+i)+"=="+varName(k*m+i+1))
		}
	}
	for i := range m {
		eqs = append(eqs, varName(i)+"!="+varName(m+(i*7919)%m))
	}
	got := false
	scaletest.Within(t, scaletest.Limit,
		"EquationsPossible(2 цепочки равенств по 50000 переменных и 50000 неравенств между ними) — похоже на O(m²):"+
			" на каждое неравенство ищешь путь обходом по равенствам (замер: эталон ~30 мс, обход ~15.7 с, Union без сжатия пути ~3.2 с)",
		func() { got = EquationsPossible(eqs) })
	if !got {
		t.Fatal("EquationsPossible = false, ожидалось true: неравенства связывают разные группы")
	}
}
