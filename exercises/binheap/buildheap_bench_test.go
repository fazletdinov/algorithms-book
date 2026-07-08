package binheap

// Бенчмарк для главы «Бинарная куча», раздел про heapify: строит ли Флойд
// (BuildHeap, siftDown от середины) кучу реально быстрее, чем n последовательных
// Push (siftUp). Теория обещает O(n) против O(n log n) — проверь числами:
//
//	go test -tags solution -bench=Build -benchmem ./binheap/
//
// Без -tags solution бенч запускает ВАШУ реализацию — сравните с эталоном.

import (
	"math/rand"
	"testing"
)

func benchData(n int) []int {
	rng := rand.New(rand.NewSource(42))
	data := make([]int, n)
	for i := range data {
		data[i] = rng.Intn(1 << 30)
	}
	return data
}

func benchmarkBuildHeap(b *testing.B, n int) {
	src := benchData(n)
	buf := make([]int, n)
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		copy(buf, src) // BuildHeap перестраивает вход — даём свежую копию
		BuildHeap(buf)
	}
}

func benchmarkPushAll(b *testing.B, n int) {
	src := benchData(n)
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		h := NewHeap()
		for _, v := range src {
			h.Push(v)
		}
	}
}

func BenchmarkBuildHeap_Floyd_100k(b *testing.B)   { benchmarkBuildHeap(b, 100_000) }
func BenchmarkBuildHeap_PushAll_100k(b *testing.B) { benchmarkPushAll(b, 100_000) }
func BenchmarkBuildHeap_Floyd_1M(b *testing.B)     { benchmarkBuildHeap(b, 1_000_000) }
func BenchmarkBuildHeap_PushAll_1M(b *testing.B)   { benchmarkPushAll(b, 1_000_000) }
