package stack

// Демонстрация для раздела «Цена на практике» главы: стек на срезе указателей.
// Не упражнение — решать нечего, файл работает без -tags solution:
//
//	go test -run PopLeak -v ./stack/
//
// s = s[:len(s)-1] убирает элемент из СРЕЗА, но не из массива под ним: ячейка
// за пределами len по-прежнему указывает на объект, и сборщик мусора считает
// его живым, пока жив сам массив (обычно — пока жив стек: поле структуры,
// очередь задач воркера). Тест снимает HeapAlloc после полного runtime.GC()
// для двух вариантов pop и печатает разницу.

import (
	"runtime"
	"testing"
)

type blob struct{ data [1 << 20]byte } // 1 МиБ — чтобы разница была видна сразу

const blobs = 64

// heapAfterPops кладёт blobs объектов на стек, снимает все и возвращает
// HeapAlloc после сборки мусора, пока сам стек ещё жив.
func heapAfterPops(clear bool) uint64 {
	s := make([]*blob, 0, blobs)
	for range blobs {
		s = append(s, new(blob))
	}
	for len(s) > 0 {
		if clear {
			s[len(s)-1] = nil // обнулить ячейку ДО укорачивания
		}
		s = s[:len(s)-1]
	}
	runtime.GC()
	var m runtime.MemStats
	runtime.ReadMemStats(&m)
	runtime.KeepAlive(s) // стек жив во время замера — как поле долгоживущей структуры
	return m.HeapAlloc
}

func TestPopLeak(t *testing.T) {
	const mib = 1 << 20
	leaky := heapAfterPops(false)
	clean := heapAfterPops(true)
	t.Logf("после снятия всех %d объектов по 1 МиБ: без обнуления %.1f МиБ в куче, с обнулением %.1f МиБ",
		blobs, float64(leaky)/mib, float64(clean)/mib)
	// Порог вдвое ниже ожидаемых 64 МиБ: разница — не шум сборщика, а весь стек целиком.
	if leaky < clean+blobs/2*mib {
		t.Errorf("ожидалось, что pop без обнуления удержит ~%d МиБ, разница лишь %.1f МиБ",
			blobs, (float64(leaky)-float64(clean))/mib)
	}
}
