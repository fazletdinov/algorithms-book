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

// TestMinSemestersScales — та же цепочка из scaleV курсов вразброс, ответ scaleV
// семестров. «Каждый семестр заново ищи перебором все курсы с нулевой степенью» —
// scaleV раундов по scaleV вершин, O(V²); раунды по очереди Кана — O(V + E).
func TestMinSemestersScales(t *testing.T) {
	perm, _ := scaleChain()
	rel := make([][]int, 0, scaleV-1)
	for i := 0; i+1 < scaleV; i++ {
		rel = append(rel, []int{perm[i] + 1, perm[i+1] + 1}) // курсы 1..n, [prev, next]
	}
	var got int
	scaletest.Within(t, scaletest.Limit,
		"MinSemesters(цепочка из 200000 курсов вразброс) — похоже на O(V²) там, где нужен O(V + E)"+
			" (замер: эталон ~16 мс, перебор готовых курсов каждый семестр ~90 с)",
		func() { got = MinSemesters(scaleV, rel) })
	if got != scaleV {
		t.Fatalf("MinSemesters(цепочка) = %d, ожидалось %d", got, scaleV)
	}
}

// TestFindMinHeightTreesScales — путь из scaleV вершин вразброс: центр — две
// средние вершины пути. «Обход в ширину из каждой вершины» — O(n²), он же с
// остановкой, как только высота превысила лучшую, на пути всё равно проходит
// не меньше половины вершин; обрезка листьев слоями — O(n).
func TestFindMinHeightTreesScales(t *testing.T) {
	perm := rand.New(rand.NewPCG(3, 10)).Perm(scaleV)
	edges := make([][]int, 0, scaleV-1)
	for i := 0; i+1 < scaleV; i++ {
		edges = append(edges, []int{perm[i], perm[i+1]})
	}
	want := []int{perm[scaleV/2-1], perm[scaleV/2]}
	slices.Sort(want)
	var got []int
	scaletest.Within(t, scaletest.Limit,
		"FindMinHeightTrees(путь из 200000 вершин вразброс) — похоже на O(n²) там, где нужен O(n)"+
			" (замер: эталон ~20 мс, обход в ширину из каждой вершины с остановкой по лучшей высоте > 5 мин)",
		func() { got = FindMinHeightTrees(scaleV, edges) })
	if !slices.Equal(got, want) {
		t.Fatalf("FindMinHeightTrees(путь) = %v, ожидалось %v", got, want)
	}
}

// scaleDiamondsPrereq — цепочка из k ромбов плюс free отдельных вершин без
// рёбер, всё вразброс: стык c, от него две зависимые вершины a и b, обе нужны
// следующему стыку. Вершин 3k + 1 + free, рёбер 4k; путей от первого стыка до
// последнего 2^k. Номера — случайная (с фиксированным зерном) перестановка,
// чтобы порядок запусков по номерам не совпадал с ответом.
func scaleDiamondsPrereq(k, free int) (n int, prereq [][]int) {
	n = 3*k + 1 + free
	id := rand.New(rand.NewPCG(5, 8)).Perm(n)
	prereq = make([][]int, 0, 4*k)
	for i := 0; i < k; i++ {
		c, a, b, next := id[3*i], id[3*i+1], id[3*i+2], id[3*i+3]
		// [x, y]: y раньше x
		prereq = append(prereq, []int{a, c}, []int{b, c}, []int{next, a}, []int{next, b})
	}
	return n, prereq
}

// TestTopologicalSortDFSScales — бьёт два медленных варианта обхода: вершину
// дописывают в НАЧАЛО ответа (каждая вставка сдвигает весь срез — O(V²)) и
// помечают вершину только на текущем пути, снимая пометку на выходе (без
// «закончена» каждый из 2^k путей проходится заново). Отдельные вершины нужны
// первому: сдвиг среза — быстрый memmove, и на 150 тысячах вершин вставка
// через slices.Insert укладывается в ~2.7 с; на 500 тысячах — нет.
func TestTopologicalSortDFSScales(t *testing.T) {
	n, prereq := scaleDiamondsPrereq(50000, 349999) // 500000 вершин, 200000 рёбер
	var got []int
	scaletest.Within(t, scaletest.Limit,
		"TopologicalSortDFS(50000 ромбов цепочкой и 349999 отдельных вершин, вразброс) — похоже на O(V²) или экспоненту там, где нужен O(V + E)"+
			" (замер: эталон ~35 мс, вставка в начало ответа slices.Insert ~69 с, append([]int{v}, post...) ~150 с, пометка только на пути — 2^50000 путей, не дождаться)",
		func() { got = TopologicalSortDFS(n, prereq) })
	if !isValidTopo(n, prereq, got) {
		t.Fatal("TopologicalSortDFS(цепочка ромбов): порядок не уважает зависимости")
	}
}
