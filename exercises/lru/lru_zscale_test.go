package lru

import (
	"math/rand"
	"sort"
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
)

// TestLRUCacheScales — сложность, а не ответ. Кэш на C = 10⁵: C вставок,
// 10⁵ попаданий Get по случайным ключам, 5·10⁴ промахов, затем 10 вставок с
// вытеснением. Хеш-таблица + двусвязный список — O(1) на вызов. Срез пар с
// линейным поиском ключа — O(C) на вызов: каждая вставка ищет, нет ли ключа,
// каждое попадание ищет его и переносит в начало, каждый промах проходит срез
// целиком.
func TestLRUCacheScales(t *testing.T) {
	const c = 100000
	r := rand.New(rand.NewSource(1))
	hits := make([]int, 100000)
	for i := range hits {
		hits[i] = r.Intn(c)
	}
	lastUse := make([]int, c) // модель: когда к ключу обращались последний раз
	failed, what, got, want := false, "", 0, 0
	cache := Constructor(c)
	scaletest.Within(t, scaletest.Limit,
		"LRUCache(capacity=10⁵): 10⁵ Put, 10⁵ Get-попаданий, 5·10⁴ Get-промахов —"+
			" похоже на O(capacity) на вызов там, где нужен O(1)"+
			" (замер: эталон ~15 мс, срез с линейным поиском ~12.6 с)",
		func() {
			clock := 0
			for k := 0; k < c; k++ {
				cache.Put(k, 3*k)
				clock++
				lastUse[k] = clock
			}
			for _, k := range hits {
				if v := cache.Get(k); v != 3*k {
					failed, what, got, want = true, "Get(попадание)", v, 3*k
					return
				}
				clock++
				lastUse[k] = clock
			}
			for k := c; k < c+50000; k++ {
				if v := cache.Get(k); v != -1 {
					failed, what, got, want = true, "Get(промах)", v, -1
					return
				}
			}
		})
	if failed {
		t.Fatalf("%s вернул %d, ожидалось %d", what, got, want)
	}
	// 10 новых ключей вытесняют 10 ключей с самым давним обращением.
	order := make([]int, c)
	for k := range order {
		order[k] = k
	}
	sort.Slice(order, func(i, j int) bool { return lastUse[order[i]] < lastUse[order[j]] })
	for j := 0; j < 10; j++ {
		cache.Put(2*c+j, 1)
	}
	for _, k := range order[:10] {
		if v := cache.Get(k); v != -1 {
			t.Fatalf("Get(%d) = %d после вытеснения: ключ с самым давним обращением должен уйти", k, v)
		}
	}
	if k := order[10]; cache.Get(k) != 3*k {
		t.Fatalf("Get(%d) != %d: вытеснен лишний ключ", k, 3*k)
	}
}
