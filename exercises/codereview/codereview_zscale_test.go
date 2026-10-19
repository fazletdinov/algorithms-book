package codereview

import (
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
)

// TestHasDuplicateScales — не про правильность ответа (заготовка и так
// отвечает верно), а про то, что реализация обязана уложиться в разумное
// время на большом входе. Худший случай для повторного поиска — массив БЕЗ
// повторов: цикл не может выйти досрочно и обязан пройти все пары.
// O(n) через set укладывается на порядки быстрее срока; O(n²) — нет.
func TestHasDuplicateScales(t *testing.T) {
	n := 200000
	nums := make([]int, n)
	for i := range nums {
		nums[i] = i // все различны — худший случай, никакого досрочного return
	}
	var got bool
	scaletest.Within(t, scaletest.Limit,
		"HasDuplicate(n=200000, все различны) — похоже на O(n²) там, где нужен O(n)"+
			" (замер: заготовка ~4.8 с, исправленная версия ~7 мс)",
		func() { got = HasDuplicate(nums) })
	if got {
		t.Fatalf("HasDuplicate() = true на входе без дубликатов")
	}
}
