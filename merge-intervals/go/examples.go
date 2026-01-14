package main

import (
	"fmt"
	"sort"
)

// Пример 1: Слияние перекрывающихся интервалов
//
// Задача: Объединить все перекрывающиеся интервалы
// Временная сложность: O(n log n)
// Пространственная сложность: O(n)
func mergeIntervals(intervals [][]int) [][]int {
	if len(intervals) == 0 {
		return [][]int{}
	}

	// Сортируем интервалы по начальной точке
	sort.Slice(intervals, func(i, j int) bool {
		return intervals[i][0] < intervals[j][0]
	})

	merged := [][]int{intervals[0]}

	for i := 1; i < len(intervals); i++ {
		current := intervals[i]
		last := merged[len(merged)-1]

		// Если текущий интервал перекрывается с последним, объединяем
		if current[0] <= last[1] {
			if current[1] > last[1] {
				last[1] = current[1]
			}
		} else {
			// Иначе добавляем новый интервал
			merged = append(merged, current)
		}
	}

	return merged
}

// Пример 2: Вставка нового интервала
//
// Задача: Вставить новый интервал в отсортированный список неперекрывающихся интервалов
// Временная сложность: O(n)
// Пространственная сложность: O(n)
func insertInterval(intervals [][]int, newInterval []int) [][]int {
	var result [][]int
	i := 0
	n := len(intervals)

	// Добавляем все интервалы, которые заканчиваются до начала нового интервала
	for i < n && intervals[i][1] < newInterval[0] {
		result = append(result, intervals[i])
		i++
	}

	// Объединяем все перекрывающиеся интервалы
	mergedInterval := []int{newInterval[0], newInterval[1]}
	for i < n && intervals[i][0] <= mergedInterval[1] {
		if intervals[i][0] < mergedInterval[0] {
			mergedInterval[0] = intervals[i][0]
		}
		if intervals[i][1] > mergedInterval[1] {
			mergedInterval[1] = intervals[i][1]
		}
		i++
	}
	result = append(result, mergedInterval)

	// Добавляем оставшиеся интервалы
	for i < n {
		result = append(result, intervals[i])
		i++
	}

	return result
}

// Пример 3: Поиск неперекрывающихся интервалов
//
// Задача: Найти минимальное количество интервалов для удаления,
// чтобы сделать остальные неперекрывающимися
// Временная сложность: O(n log n)
// Пространственная сложность: O(1)
func eraseOverlapIntervals(intervals [][]int) int {
	if len(intervals) == 0 {
		return 0
	}

	// Сортируем по конечной точке
	sort.Slice(intervals, func(i, j int) bool {
		return intervals[i][1] < intervals[j][1]
	})

	count := 0
	end := intervals[0][1]

	for i := 1; i < len(intervals); i++ {
		// Если интервал перекрывается с предыдущим, удаляем его
		if intervals[i][0] < end {
			count++
		} else {
			end = intervals[i][1]
		}
	}

	return count
}

// Пример 4: Пересечения двух списков интервалов
//
// Задача: Найти пересечения интервалов из двух списков
// Временная сложность: O(n + m)
// Пространственная сложность: O(k), где k - количество пересечений
func intervalIntersection(firstList [][]int, secondList [][]int) [][]int {
	var result [][]int
	i, j := 0, 0

	for i < len(firstList) && j < len(secondList) {
		first := firstList[i]
		second := secondList[j]

		// Находим пересечение
		start := max(first[0], second[0])
		end := min(first[1], second[1])

		if start <= end {
			result = append(result, []int{start, end})
		}

		// Перемещаем указатель с меньшей конечной точкой
		if first[1] < second[1] {
			i++
		} else {
			j++
		}
	}

	return result
}

// Пример 5: Комнаты для встреч II (Meeting Rooms II)
//
// Задача: Найти минимальное количество комнат, необходимое для всех встреч
// Временная сложность: O(n log n)
// Пространственная сложность: O(n)
func minMeetingRooms(intervals [][]int) int {
	if len(intervals) == 0 {
		return 0
	}

	// Извлекаем времена начала и конца
	starts := make([]int, len(intervals))
	ends := make([]int, len(intervals))

	for i, interval := range intervals {
		starts[i] = interval[0]
		ends[i] = interval[1]
	}

	sort.Ints(starts)
	sort.Ints(ends)

	rooms := 0
	endPtr := 0

	// Проходим по временам начала
	for _, start := range starts {
		// Если текущее время начала >= времени окончания,
		// освобождаем комнату
		if start >= ends[endPtr] {
			endPtr++
		} else {
			// Иначе нужна новая комната
			rooms++
		}
	}

	return rooms
}

// Вспомогательные функции
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

// Примеры использования
func main() {
	// Пример 1
	intervals1 := [][]int{{1, 3}, {2, 6}, {8, 10}, {15, 18}}
	fmt.Printf("Объединенные интервалы: %v\n", mergeIntervals(intervals1))

	// Пример 2
	intervals2 := [][]int{{1, 3}, {6, 9}}
	newInterval := []int{2, 5}
	fmt.Printf("После вставки интервала: %v\n", insertInterval(intervals2, newInterval))

	// Пример 3
	intervals3 := [][]int{{1, 2}, {2, 3}, {3, 4}, {1, 3}}
	fmt.Printf("Минимальное количество удалений: %d\n", eraseOverlapIntervals(intervals3))

	// Пример 4
	first := [][]int{{0, 2}, {5, 10}, {13, 23}, {24, 25}}
	second := [][]int{{1, 5}, {8, 12}, {15, 24}, {25, 26}}
	fmt.Printf("Пересечения интервалов: %v\n", intervalIntersection(first, second))

	// Пример 5
	intervals5 := [][]int{{0, 30}, {5, 10}, {15, 20}}
	fmt.Printf("Минимальное количество комнат: %d\n", minMeetingRooms(intervals5))
}

