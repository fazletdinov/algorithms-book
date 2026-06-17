package parallelbfs

import "testing"

// layered — граф из layers слоёв по width вершин; соседние слои соединены
// полностью. Даёт широкий фронт (width вершин на уровень) — единственный
// случай, где у конкурентного BFS вообще есть шанс на выигрыш.
func layered(layers, width int) [][]int {
	n := layers * width
	adj := make([][]int, n)
	id := func(l, i int) int { return l*width + i }
	for l := 0; l < layers-1; l++ {
		for i := range width {
			for j := range width {
				a, b := id(l, i), id(l+1, j)
				adj[a] = append(adj[a], b)
				adj[b] = append(adj[b], a)
			}
		}
	}
	return adj
}

// Сравни сам: на узких графах и при дешёвой работе на вершину конкурентная
// версия обычно ПРОИГРЫВАЕТ (накладные расходы + контеншн на мьютексе). Это и
// есть урок: горутины — не бесплатное ускорение.
func BenchmarkSeq(b *testing.B) {
	g := layered(20, 60)
	b.ResetTimer()
	for range b.N {
		BFSLevelsSeq(g, 0)
	}
}

func BenchmarkConc(b *testing.B) {
	g := layered(20, 60)
	b.ResetTimer()
	for range b.N {
		BFSLevelsConc(g, 0)
	}
}

// ConcLocal (atomic + локальные фронты) убирает контеншн на мьютексе: должен
// заметно обгонять BenchmarkConc. Обогнать Seq при ТАКОЙ дешёвой работе на
// вершину всё равно тяжело — для этого нужна тяжёлая обработка узла.
func BenchmarkConcLocal(b *testing.B) {
	g := layered(20, 60)
	b.ResetTimer()
	for range b.N {
		BFSLevelsConcLocal(g, 0)
	}
}
