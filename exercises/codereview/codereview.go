//go:build !solution

// Package codereview — единственный пакет тренажёра ДРУГОГО типа. Все
// остальные пакеты дают заготовку с panic("TODO") — писать реализацию с
// нуля по спецификации. Здесь ТРИ функции уже полностью реализованы и даже
// компилируются без единой паники — но в каждой спрятан один изъян, который
// найдётся только если запустить тесты и прочитать код придирчиво, как это
// делает ревьюер на code review в проде. Задача — не дописать, а
// ДИАГНОСТИРОВАТЬ и ИСПРАВИТЬ прямо в этом файле, глядя на упавший тест (или
// -race), а не на список TODO. Теория — в книге: ../../src/code-review.md
//
//	go test ./codereview/                 # эти три реализации (изъян ловится тестом)
//	go test -race ./codereview/           # ОБЯЗАТЕЛЬНО отдельно — гонка не всегда видна без него
//	go test -tags solution ./codereview/  # эталон (исправленные версии) — для сверки ПОСЛЕ
package codereview

import (
	"strconv"
	"sync"
)

// SumSquaresConcurrent считает сумму квадратов nums, разделив работу между
// workers горутинами. Изъян — не там, где кажется на первый взгляд.
func SumSquaresConcurrent(nums []int, workers int) int64 {
	if workers < 1 {
		workers = 1
	}
	chunk := len(nums) / workers
	var total int64
	var wg sync.WaitGroup
	for w := 0; w < workers; w++ {
		start := w * chunk
		end := start + chunk
		wg.Add(1)
		go func(lo, hi int) {
			defer wg.Done()
			for _, n := range nums[lo:hi] {
				total += int64(n) * int64(n)
			}
		}(start, end)
	}
	wg.Wait()
	return total
}

// HasDuplicate отвечает, есть ли в nums повторяющееся значение.
func HasDuplicate(nums []int) bool {
	for i := range len(nums) {
		for j := i + 1; j < len(nums); j++ {
			if nums[i] == nums[j] {
				return true
			}
		}
	}
	return false
}

// ParseAndSum разбирает каждую строку как целое число и суммирует их.
func ParseAndSum(strs []string) (int, error) {
	sum := 0
	for _, s := range strs {
		n, err := strconv.Atoi(s)
		if err != nil {
			continue
		}
		sum += n
	}
	return sum, nil
}
