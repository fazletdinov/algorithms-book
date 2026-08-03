//go:build !solution

// Package profiling — единственный пакет, где тест не судья: правильность и
// без того ясна (табличный тест это лишь подтверждает), суть задачи —
// найти, КУДА уходит время и память, не гадая, а измерив pprof'ом, и уже
// после этого чинить. Теория — в книге: ../../src/appendix-go-memory.md
// (раздел «Профилирование»), само упражнение — там же.
//
//	go test ./profiling/                              # корректность (уже зелёная)
//	go test -bench=. -benchmem ./profiling/           # цена — не судит pass/fail
//	go test -cpuprofile=cpu.prof -bench=. ./profiling/
//	go tool pprof cpu.prof                             # top — где ВПРАВДУ горячо
//	go test -tags solution ./profiling/                # эталон — для сверки ПОСЛЕ
package profiling

import "fmt"

// FormatScores строит отчёт из чисел через запятую: "1, 4, 9, ".
func FormatScores(nums []int) string {
	result := ""
	for _, n := range nums {
		result += fmt.Sprintf("%d, ", n)
	}
	return result
}
