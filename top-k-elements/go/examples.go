package main

import (
	"container/heap"
	"fmt"
	"sort"
	"strings"
)

// MinHeap для K наибольших элементов
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

// MaxHeap для K наименьших элементов
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

// Пример 1: K наибольших элементов
//
// Задача: Найти K наибольших элементов в массиве
// Временная сложность: O(n log k)
// Пространственная сложность: O(k)
func findKLargest(nums []int, k int) []int {
	minHeap := &MinHeap{}
	heap.Init(minHeap)

	for _, num := range nums {
		if minHeap.Len() < k {
			heap.Push(minHeap, num)
		} else if (*minHeap)[0] < num {
			heap.Pop(minHeap)
			heap.Push(minHeap, num)
		}
	}

	result := make([]int, minHeap.Len())
	for i := len(result) - 1; i >= 0; i-- {
		result[i] = heap.Pop(minHeap).(int)
	}
	return result
}

// Пример 2: K наименьших элементов
//
// Задача: Найти K наименьших элементов в массиве
// Временная сложность: O(n log k)
// Пространственная сложность: O(k)
func findKSmallest(nums []int, k int) []int {
	maxHeap := &MaxHeap{}
	heap.Init(maxHeap)

	for _, num := range nums {
		if maxHeap.Len() < k {
			heap.Push(maxHeap, num)
		} else if (*maxHeap)[0] > num {
			heap.Pop(maxHeap)
			heap.Push(maxHeap, num)
		}
	}

	result := make([]int, maxHeap.Len())
	for i := len(result) - 1; i >= 0; i-- {
		result[i] = heap.Pop(maxHeap).(int)
	}
	return result
}

// Пример 3: K-й наибольший элемент
//
// Задача: Найти K-й наибольший элемент в массиве
// Временная сложность: O(n log k)
// Пространственная сложность: O(k)
func findKthLargest(nums []int, k int) int {
	minHeap := &MinHeap{}
	heap.Init(minHeap)

	for _, num := range nums {
		if minHeap.Len() < k {
			heap.Push(minHeap, num)
		} else if (*minHeap)[0] < num {
			heap.Pop(minHeap)
			heap.Push(minHeap, num)
		}
	}

	return (*minHeap)[0]
}

// Пример 4: Топ K частых элементов
//
// Задача: Найти K наиболее частых элементов
// Временная сложность: O(n + k log k)
// Пространственная сложность: O(n)
func topKFrequent(nums []int, k int) []int {
	// Подсчитываем частоту
	freqMap := make(map[int]int)
	for _, num := range nums {
		freqMap[num]++
	}

	// Используем min-heap для хранения топ K
	type Item struct {
		freq int
		num  int
	}

	minHeap := make([]Item, 0)
	for num, freq := range freqMap {
		if len(minHeap) < k {
			minHeap = append(minHeap, Item{freq: freq, num: num})
			// Просеиваем вверх
			for i := len(minHeap) - 1; i > 0 && minHeap[i].freq < minHeap[(i-1)/2].freq; i = (i - 1) / 2 {
				minHeap[i], minHeap[(i-1)/2] = minHeap[(i-1)/2], minHeap[i]
			}
		} else if freq > minHeap[0].freq {
			minHeap[0] = Item{freq: freq, num: num}
			// Просеиваем вниз
			i := 0
			for {
				smallest := i
				left := 2*i + 1
				right := 2*i + 2
				if left < len(minHeap) && minHeap[left].freq < minHeap[smallest].freq {
					smallest = left
				}
				if right < len(minHeap) && minHeap[right].freq < minHeap[smallest].freq {
					smallest = right
				}
				if smallest == i {
					break
				}
				minHeap[i], minHeap[smallest] = minHeap[smallest], minHeap[i]
				i = smallest
			}
		}
	}

	result := make([]int, len(minHeap))
	for i, item := range minHeap {
		result[i] = item.num
	}
	return result
}

// Пример 5: K ближайших точек к началу координат
//
// Задача: Найти K ближайших точек к началу координат
// Временная сложность: O(n log k)
// Пространственная сложность: O(k)
func kClosest(points [][]int, k int) [][]int {
	maxHeap := make([][]int, 0)

	for _, point := range points {
		distance := point[0]*point[0] + point[1]*point[1]

		if len(maxHeap) < k {
			maxHeap = append(maxHeap, point)
			// Просеиваем вверх
			i := len(maxHeap) - 1
			for i > 0 {
				parent := (i - 1) / 2
				parentDist := maxHeap[parent][0]*maxHeap[parent][0] + maxHeap[parent][1]*maxHeap[parent][1]
				if distance <= parentDist {
					break
				}
				maxHeap[i], maxHeap[parent] = maxHeap[parent], maxHeap[i]
				i = parent
			}
		} else {
			topDist := maxHeap[0][0]*maxHeap[0][0] + maxHeap[0][1]*maxHeap[0][1]
			if distance < topDist {
				maxHeap[0] = point
				// Просеиваем вниз
				i := 0
				for {
					largest := i
					left := 2*i + 1
					right := 2*i + 2
					if left < len(maxHeap) {
						leftDist := maxHeap[left][0]*maxHeap[left][0] + maxHeap[left][1]*maxHeap[left][1]
						topDist := maxHeap[largest][0]*maxHeap[largest][0] + maxHeap[largest][1]*maxHeap[largest][1]
						if leftDist > topDist {
							largest = left
						}
					}
					if right < len(maxHeap) {
						rightDist := maxHeap[right][0]*maxHeap[right][0] + maxHeap[right][1]*maxHeap[right][1]
						largestDist := maxHeap[largest][0]*maxHeap[largest][0] + maxHeap[largest][1]*maxHeap[largest][1]
						if rightDist > largestDist {
							largest = right
						}
					}
					if largest == i {
						break
					}
					maxHeap[i], maxHeap[largest] = maxHeap[largest], maxHeap[i]
					i = largest
				}
			}
		}
	}

	return maxHeap
}

// Пример 6: Сортировка символов по частоте
//
// Задача: Отсортировать символы строки по убыванию частоты
// Временная сложность: O(n log n)
// Пространственная сложность: O(n)
func frequencySort(s string) string {
	// Подсчитываем частоту
	freqMap := make(map[rune]int)
	for _, ch := range s {
		freqMap[ch]++
	}

	// Создаем слайс пар (символ, частота) и сортируем
	type Pair struct {
		char rune
		freq int
	}
	pairs := make([]Pair, 0, len(freqMap))
	for ch, freq := range freqMap {
		pairs = append(pairs, Pair{char: ch, freq: freq})
	}

	sort.Slice(pairs, func(i, j int) bool {
		return pairs[i].freq > pairs[j].freq
	})

	// Строим результирующую строку
	var result strings.Builder
	for _, pair := range pairs {
		result.WriteString(strings.Repeat(string(pair.char), pair.freq))
	}

	return result.String()
}

// Примеры использования
func main() {
	// Пример 1
	nums1 := []int{3, 1, 5, 12, 2, 11}
	fmt.Printf("Топ-3 наибольших: %v\n", findKLargest(nums1, 3))

	// Пример 2
	nums2 := []int{3, 2, 1, 5, 6, 4}
	fmt.Printf("2-й наибольший элемент: %d\n", findKthLargest(nums2, 2))

	// Пример 3
	nums3 := []int{1, 1, 1, 2, 2, 3}
	fmt.Printf("Топ-2 частых элемента: %v\n", topKFrequent(nums3, 2))

	// Пример 4
	points := [][]int{{1, 3}, {-2, 2}}
	fmt.Printf("1 ближайшая точка: %v\n", kClosest(points, 1))

	// Пример 5
	s := "tree"
	fmt.Printf("Строка отсортированная по частоте: %s\n", frequencySort(s))
}

