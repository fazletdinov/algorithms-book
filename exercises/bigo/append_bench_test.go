package bigo

// Бенчмарк для главы «Big-O и амортизированный анализ»: чего стоит
// амортизация роста среза на самом деле. append без преаллокации платит
// за перевыделения и копирования; make([]int, 0, n) убирает их все.
// Файл самодостаточен (работает без -tags solution):
//
//	go test -bench=Append -benchmem ./bigo/
//
// Числа из этого прогона приведены в книге — перепроверь на своей машине.

import "testing"

const appendN = 1 << 20 // ~1M элементов

func BenchmarkAppend_NoPrealloc(b *testing.B) {
	for i := 0; i < b.N; i++ {
		var s []int
		for j := 0; j < appendN; j++ {
			s = append(s, j)
		}
		_ = s
	}
}

func BenchmarkAppend_Prealloc(b *testing.B) {
	for i := 0; i < b.N; i++ {
		s := make([]int, 0, appendN)
		for j := 0; j < appendN; j++ {
			s = append(s, j)
		}
		_ = s
	}
}
