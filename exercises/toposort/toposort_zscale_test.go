package toposort

import (
	"math/rand/v2"
	"slices"
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
)

// Тесты масштаба: V = 2·10⁵ вершин. Медленные на класс варианты Кана — на каждом
// шаге искать вершину с нулевой степенью захода проходом по всем вершинам
// (O(V²)) или пересчитывать степени заново по всем рёбрам (O(V·E)).
const scaleV = 200000

// scaleChain — цепочка perm[0] → perm[1] → … по случайной (с фиксированным
// зерном) перестановке: порядок единственный — perm. Перестановка случайная,
// чтобы проход по вершинам в поисках готовой в среднем шёл через половину
// массива, с какого бы конца или с какого бы места он ни начинал.
func scaleChain() (perm []int, prereq [][]int) {
	perm = rand.New(rand.NewPCG(1, 2)).Perm(scaleV)
	prereq = make([][]int, 0, scaleV-1)
	for i := 0; i+1 < scaleV; i++ {
		prereq = append(prereq, []int{perm[i+1], perm[i]}) // perm[i] раньше perm[i+1]
	}
	return perm, prereq
}

func TestTopologicalSortScales(t *testing.T) {
	perm, prereq := scaleChain()
	var got []int
	scaletest.Within(t, scaletest.Limit,
		"TopologicalSort(цепочка из 200000 вершин вразброс) — похоже на O(V²) или O(V·E) там, где нужен O(V + E)"+
			" (замер: эталон ~36 мс, поиск готовой вершины проходом ~47 с, он же по кругу с места прошлой находки ~101 с, пересчёт степеней каждый раунд > 300 с)",
		func() { got = TopologicalSort(scaleV, prereq) })
	if !slices.Equal(got, perm) {
		t.Fatal("TopologicalSort(цепочка): порядок не совпал с единственным верным")
	}
}

func TestCanFinishScales(t *testing.T) {
	_, prereq := scaleChain()
	var got bool
	scaletest.Within(t, scaletest.Limit,
		"CanFinish(цепочка из 200000 вершин вразброс) — похоже на O(V²) или O(V·E) там, где нужен O(V + E)"+
			" (замер: эталон ~42 мс, поиск готовой вершины проходом ~45 с, DFS с путём в срезе и линейной проверкой «на пути?» ~3.2 с)",
		func() { got = CanFinish(scaleV, prereq) })
	if !got {
		t.Fatal("CanFinish(цепочка) = false, ожидалось true")
	}
}

// TestFindOrderLexSmallestScales — два графа, потому что медленные варианты
// бьются разными входами.
//
// «Половина готова»: рёбра b → b+V/2. Готовых вершин всё время около V/2, и
// линейный поиск минимума среди готовых — O(V²); ответ 0, 1, …, V−1.
//
// «Зигзаг»: цепочка V/2 → V/2+1 → … → V−1 и рёбра V/2+j → j. Готовых не больше
// двух, зато «искать первую готовую, начиная с наименьшей невзятой» каждый
// второй шаг проходит V/2 вершин; ответ V/2, 0, V/2+1, 1, …
//
// Куча — O((V + E) log V) на обоих.
func TestFindOrderLexSmallestScales(t *testing.T) {
	const half = scaleV / 2
	var halfReady, zigzag [][]int
	for b := 0; b < half; b++ {
		halfReady = append(halfReady, []int{b + half, b})
		zigzag = append(zigzag, []int{b, half + b})
		if b+1 < half {
			zigzag = append(zigzag, []int{half + b + 1, half + b})
		}
	}
	var gotHalf, gotZig []int
	scaletest.Within(t, scaletest.Limit,
		"FindOrderLexSmallest(«половина готова», 200000 вершин) — похоже на O(V²) там, где нужен O((V + E) log V)"+
			" (замер: эталон ~40 мс, минимум среди готовых проходом ~9.7 с)",
		func() { gotHalf = FindOrderLexSmallest(scaleV, halfReady) })
	scaletest.Within(t, scaletest.Limit,
		"FindOrderLexSmallest(«зигзаг», 200000 вершин) — похоже на O(V²) там, где нужен O((V + E) log V)"+
			" (замер: эталон ~15 мс, первая готовая от наименьшей невзятой ~5.7 с)",
		func() { gotZig = FindOrderLexSmallest(scaleV, zigzag) })
	for i, v := range gotHalf {
		if v != i {
			t.Fatalf("FindOrderLexSmallest(«половина готова»): [%d] = %d, ожидалось %d", i, v, i)
		}
	}
	if len(gotHalf) != scaleV || len(gotZig) != scaleV {
		t.Fatalf("FindOrderLexSmallest: длины %d и %d, ожидалось %d", len(gotHalf), len(gotZig), scaleV)
	}
	for i, v := range gotZig {
		want := half + i/2
		if i%2 == 1 {
			want = i / 2
		}
		if v != want {
			t.Fatalf("FindOrderLexSmallest(«зигзаг»): [%d] = %d, ожидалось %d", i, v, want)
		}
	}
}
