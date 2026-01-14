package main

import (
	"container/heap"
	"fmt"
)

// MinHeap для большей половины
type MinHeap []int

func (h MinHeap) Len() int           { return len(h) }
func (h MinHeap) Less(i, j int) bool { return h[i] < h[j] }
func (h MinHeap) Swap(i, j int)      { h[i], h[j] = h[j], h[i] }

func (h *MinHeap) Push(x interface{}) {
	*h = append(*h, x.(int))
}

func (h *MinHeap) Pop() interface{} {
	old := *h
	n := len(old)
	x := old[n-1]
	*h = old[0 : n-1]
	return x
}

// MaxHeap для меньшей половины
type MaxHeap []int

func (h MaxHeap) Len() int           { return len(h) }
func (h MaxHeap) Less(i, j int) bool { return h[i] > h[j] }
func (h MaxHeap) Swap(i, j int)      { h[i], h[j] = h[j], h[i] }

func (h *MaxHeap) Push(x interface{}) {
	*h = append(*h, x.(int))
}

func (h *MaxHeap) Pop() interface{} {
	old := *h
	n := len(old)
	x := old[n-1]
	*h = old[0 : n-1]
	return x
}

// Структура для поддержания медианы с двумя кучами
type MedianFinder struct {
	maxHeap *MaxHeap // Для меньшей половины
	minHeap *MinHeap // Для большей половины
}

func NewMedianFinder() *MedianFinder {
	maxHeap := &MaxHeap{}
	minHeap := &MinHeap{}
	heap.Init(maxHeap)
	heap.Init(minHeap)
	return &MedianFinder{
		maxHeap: maxHeap,
		minHeap: minHeap,
	}
}

// Добавление числа в структуру
// Временная сложность: O(log n)
func (mf *MedianFinder) AddNum(num int) {
	// Добавляем в maxHeap по умолчанию
	heap.Push(mf.maxHeap, num)

	// Перемещаем максимум из maxHeap в minHeap
	if mf.maxHeap.Len() > 0 {
		maxVal := heap.Pop(mf.maxHeap).(int)
		heap.Push(mf.minHeap, maxVal)
	}

	// Балансируем кучи: maxHeap должен быть >= minHeap
	if mf.maxHeap.Len() < mf.minHeap.Len() {
		if mf.minHeap.Len() > 0 {
			minVal := heap.Pop(mf.minHeap).(int)
			heap.Push(mf.maxHeap, minVal)
		}
	}
}

// Получение медианы
// Временная сложность: O(1)
func (mf *MedianFinder) FindMedian() float64 {
	if mf.maxHeap.Len() > mf.minHeap.Len() {
		return float64((*mf.maxHeap)[0])
	}
	maxVal := float64((*mf.maxHeap)[0])
	minVal := float64((*mf.minHeap)[0])
	return (maxVal + minVal) / 2.0
}

// Пример 1: Медиана из потока данных
//
// Задача: Поддерживать медиану потока чисел
// Временная сложность: O(log n) для добавления, O(1) для получения медианы
// Пространственная сложность: O(n)
type MedianOfStream struct {
	maxHeap *MaxHeap
	minHeap *MinHeap
}

func NewMedianOfStream() *MedianOfStream {
	maxHeap := &MaxHeap{}
	minHeap := &MinHeap{}
	heap.Init(maxHeap)
	heap.Init(minHeap)
	return &MedianOfStream{
		maxHeap: maxHeap,
		minHeap: minHeap,
	}
}

func (ms *MedianOfStream) Insert(num int) {
	if ms.maxHeap.Len() == 0 || num <= (*ms.maxHeap)[0] {
		heap.Push(ms.maxHeap, num)
	} else {
		heap.Push(ms.minHeap, num)
	}

	// Балансируем кучи
	if ms.maxHeap.Len() > ms.minHeap.Len()+1 {
		val := heap.Pop(ms.maxHeap).(int)
		heap.Push(ms.minHeap, val)
	} else if ms.minHeap.Len() > ms.maxHeap.Len() {
		val := heap.Pop(ms.minHeap).(int)
		heap.Push(ms.maxHeap, val)
	}
}

func (ms *MedianOfStream) GetMedian() float64 {
	if ms.maxHeap.Len() == ms.minHeap.Len() {
		maxVal := float64((*ms.maxHeap)[0])
		minVal := float64((*ms.minHeap)[0])
		return (maxVal + minVal) / 2.0
	}
	return float64((*ms.maxHeap)[0])
}

// Пример 2: Разделение массива на две части с помощью двух куч
//
// Задача: Разделить массив так, чтобы разница сумм была минимальной
// Временная сложность: O(n log n)
// Пространственная сложность: O(n)
func partitionArray(nums []int) int {
	maxHeap := &MaxHeap{}
	minHeap := &MinHeap{}
	heap.Init(maxHeap)
	heap.Init(minHeap)

	for _, num := range nums {
		if maxHeap.Len() <= minHeap.Len() {
			heap.Push(maxHeap, num)
		} else {
			heap.Push(minHeap, num)
		}

		// Балансируем
		if maxHeap.Len() > 0 && minHeap.Len() > 0 {
			if (*maxHeap)[0] > (*minHeap)[0] {
				maxVal := heap.Pop(maxHeap).(int)
				minVal := heap.Pop(minHeap).(int)
				heap.Push(maxHeap, minVal)
				heap.Push(minHeap, maxVal)
			}
		}
	}

	sum1 := 0
	for maxHeap.Len() > 0 {
		sum1 += heap.Pop(maxHeap).(int)
	}

	sum2 := 0
	for minHeap.Len() > 0 {
		sum2 += heap.Pop(minHeap).(int)
	}

	if sum1 > sum2 {
		return sum1 - sum2
	}
	return sum2 - sum1
}

// Примеры использования
func main() {
	// Пример 1: Медиана из потока данных
	finder := NewMedianFinder()
	finder.AddNum(1)
	finder.AddNum(2)
	fmt.Printf("Медиана после добавления 1, 2: %.1f\n", finder.FindMedian())
	finder.AddNum(3)
	fmt.Printf("Медиана после добавления 3: %.1f\n", finder.FindMedian())

	// Пример 2: Медиана потока
	stream := NewMedianOfStream()
	stream.Insert(1)
	stream.Insert(2)
	fmt.Printf("Медиана потока: %.1f\n", stream.GetMedian())
	stream.Insert(3)
	fmt.Printf("Медиана потока: %.1f\n", stream.GetMedian())
}

