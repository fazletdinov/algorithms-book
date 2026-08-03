//go:build solution

package codereview

import (
	"fmt"
	"strconv"
	"sync"
)

// SumSquaresConcurrent — исправленная версия. Два независимых изъяна в
// заготовке:
//  1. chunk := len(nums)/workers усекается целочисленным делением: если
//     len(nums) не делится на workers нацело, «хвост» после последнего
//     чанка НИКОГДА не обходит ни одна горутина — недостача, не гонка,
//     воспроизводится ВСЕГДА, а не иногда.
//  2. total += ... из нескольких горутин без синхронизации — гонка данных
//     (find via -race), даже если бы п.1 починили отдельно.
//
// Правка ниже устраняет оба сразу, а не патчит по одному: каждая горутина
// копит СВОЮ локальную сумму (никакой разделяемой памяти вообще, значит
// нечему гонять) и отправляет её в канал; последний чанк получает остаток от
// деления, чтобы ни один элемент не терялся. Мьютекс здесь не нужен — race
// не чинят добавлением синхронизации к разделяемому состоянию, если можно
// вообще убрать разделяемое состояние.
func SumSquaresConcurrent(nums []int, workers int) int64 {
	if workers < 1 {
		workers = 1
	}
	if workers > len(nums) {
		workers = max(len(nums), 1)
	}
	chunk := len(nums) / workers
	results := make(chan int64, workers)
	var wg sync.WaitGroup
	for w := 0; w < workers; w++ {
		start := w * chunk
		end := start + chunk
		if w == workers-1 {
			end = len(nums) // последний забирает остаток от деления
		}
		wg.Add(1)
		go func(lo, hi int) {
			defer wg.Done()
			var partial int64
			for _, n := range nums[lo:hi] {
				partial += int64(n) * int64(n)
			}
			results <- partial
		}(start, end)
	}
	wg.Wait()
	close(results)
	var total int64
	for partial := range results {
		total += partial
	}
	return total
}

// HasDuplicate — исправленная версия. Заготовка была корректна по ответу, но
// O(n²) — двойной цикл сравнивает каждую пару. Set на карте даёт тот же
// ответ за O(n) по времени ценой O(n) памяти — тот самый компромисс
// «время против памяти», разобранный в главе про хеш-таблицы.
func HasDuplicate(nums []int) bool {
	seen := make(map[int]struct{}, len(nums))
	for _, n := range nums {
		if _, ok := seen[n]; ok {
			return true
		}
		seen[n] = struct{}{}
	}
	return false
}

// ParseAndSum — исправленная версия. Заготовка проглатывала ошибку
// strconv.Atoi через continue: некорректная строка молча выпадала из суммы
// вместо того, чтобы сообщить о себе вызывающему коду — классический
// анти-паттерн Go «error проверили, но не обработали». Здесь первая же
// нераспознанная строка немедленно возвращает обёрнутую ошибку.
func ParseAndSum(strs []string) (int, error) {
	sum := 0
	for _, s := range strs {
		n, err := strconv.Atoi(s)
		if err != nil {
			return 0, fmt.Errorf("codereview: не удалось разобрать %q: %w", s, err)
		}
		sum += n
	}
	return sum, nil
}
