package main

import (
	"container/heap"
	"fmt"
)

// Определение узла связанного списка
type ListNode struct {
	Val  int
	Next *ListNode
}

// MinHeap для элементов с индексами массива
type Element struct {
	val    int
	arrIdx int
	elemIdx int
}

type MinHeap []Element

func (h MinHeap) Len() int           { return len(h) }
func (h MinHeap) Less(i, j int) bool { return h[i].val < h[j].val }
func (h MinHeap) Swap(i, j int)      { h[i], h[j] = h[j], h[i] }

func (h *MinHeap) Push(x interface{}) {
	*h = append(*h, x.(Element))
}

func (h *MinHeap) Pop() interface{} {
	old := *h
	n := len(old)
	x := old[n-1]
	*h = old[0 : n-1]
	return x
}

// Пример 1: Слияние K отсортированных массивов
//
// Задача: Объединить K отсортированных массивов в один отсортированный массив
// Временная сложность: O(n log k)
// Пространственная сложность: O(k)
func mergeKArrays(arrays [][]int) []int {
	minHeap := &MinHeap{}
	heap.Init(minHeap)
	indices := make([]int, len(arrays))
	var result []int

	// Добавляем первые элементы всех массивов в кучу
	for i, arr := range arrays {
		if len(arr) > 0 {
			heap.Push(minHeap, Element{val: arr[0], arrIdx: i, elemIdx: 0})
		}
	}

	for minHeap.Len() > 0 {
		elem := heap.Pop(minHeap).(Element)
		result = append(result, elem.val)
		indices[elem.arrIdx]++

		// Добавляем следующий элемент из того же массива
		if indices[elem.arrIdx] < len(arrays[elem.arrIdx]) {
			nextVal := arrays[elem.arrIdx][indices[elem.arrIdx]]
			heap.Push(minHeap, Element{
				val:     nextVal,
				arrIdx:  elem.arrIdx,
				elemIdx: indices[elem.arrIdx],
			})
		}
	}

	return result
}

// Пример 2: K-й наименьший элемент в отсортированной матрице
//
// Задача: Найти K-й наименьший элемент в матрице, где каждая строка и столбец отсортированы
// Временная сложность: O(k log k)
// Пространственная сложность: O(k)
func kthSmallest(matrix [][]int, k int) int {
	minHeap := &MinHeap{}
	heap.Init(minHeap)
	n := len(matrix)

	// Добавляем первые элементы каждой строки
	for i := 0; i < n && i < k; i++ {
		heap.Push(minHeap, Element{val: matrix[i][0], arrIdx: i, elemIdx: 0})
	}

	count := 0
	result := 0

	for minHeap.Len() > 0 {
		elem := heap.Pop(minHeap).(Element)
		count++
		if count == k {
			result = elem.val
			break
		}

		// Добавляем следующий элемент из той же строки
		if elem.elemIdx+1 < n {
			heap.Push(minHeap, Element{
				val:     matrix[elem.arrIdx][elem.elemIdx+1],
				arrIdx:  elem.arrIdx,
				elemIdx: elem.elemIdx + 1,
			})
		}
	}

	return result
}

// Пример 3: K пар с наименьшими суммами
//
// Задача: Найти K пар (u, v), где u из nums1, v из nums2, с наименьшими суммами
// Временная сложность: O(k log k)
// Пространственная сложность: O(k)
func kSmallestPairs(nums1, nums2 []int, k int) [][]int {
	type Pair struct {
		sum int
		i   int
		j   int
	}

	minHeap := make([]Pair, 0)
	for i := 0; i < len(nums1) && i < k; i++ {
		minHeap = append(minHeap, Pair{sum: nums1[i] + nums2[0], i: i, j: 0})
		// Просеиваем вверх
		for idx := len(minHeap) - 1; idx > 0 && minHeap[idx].sum < minHeap[(idx-1)/2].sum; idx = (idx - 1) / 2 {
			minHeap[idx], minHeap[(idx-1)/2] = minHeap[(idx-1)/2], minHeap[idx]
		}
	}

	var result [][]int
	for len(minHeap) > 0 && len(result) < k {
		// Извлекаем минимум
		pair := minHeap[0]
		result = append(result, []int{nums1[pair.i], nums2[pair.j]})

		// Просеиваем вниз
		minHeap[0] = minHeap[len(minHeap)-1]
		minHeap = minHeap[:len(minHeap)-1]
		i := 0
		for {
			smallest := i
			left := 2*i + 1
			right := 2*i + 2
			if left < len(minHeap) && minHeap[left].sum < minHeap[smallest].sum {
				smallest = left
			}
			if right < len(minHeap) && minHeap[right].sum < minHeap[smallest].sum {
				smallest = right
			}
			if smallest == i {
				break
			}
			minHeap[i], minHeap[smallest] = minHeap[smallest], minHeap[i]
			i = smallest
		}

		// Добавляем следующую пару
		if pair.j+1 < len(nums2) {
			newPair := Pair{sum: nums1[pair.i] + nums2[pair.j+1], i: pair.i, j: pair.j + 1}
			minHeap = append(minHeap, newPair)
			// Просеиваем вверх
			idx := len(minHeap) - 1
			for idx > 0 && minHeap[idx].sum < minHeap[(idx-1)/2].sum {
				minHeap[idx], minHeap[(idx-1)/2] = minHeap[(idx-1)/2], minHeap[idx]
				idx = (idx - 1) / 2
			}
		}
	}

	return result
}

// Примеры использования
func main() {
	// Пример 1: Слияние K массивов
	arrays := [][]int{
		{1, 4, 7},
		{2, 5, 8},
		{3, 6, 9},
	}
	fmt.Printf("Объединенный массив: %v\n", mergeKArrays(arrays))

	// Пример 2: K-й наименьший элемент в матрице
	matrix := [][]int{
		{1, 5, 9},
		{10, 11, 13},
		{12, 13, 15},
	}
	fmt.Printf("8-й наименьший элемент: %d\n", kthSmallest(matrix, 8))

	// Пример 3: K пар с наименьшими суммами
	nums1 := []int{1, 7, 11}
	nums2 := []int{2, 4, 6}
	fmt.Printf("3 пары с наименьшими суммами: %v\n", kSmallestPairs(nums1, nums2, 3))
}

