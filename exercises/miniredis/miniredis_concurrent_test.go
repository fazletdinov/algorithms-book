package miniredis

import (
	"fmt"
	"sync"
	"sync/atomic"
	"testing"
)

// TestDispatchConcurrentDelRace — единственный тест капстоуна, что реально
// бьёт по одному Store из многих горутин одновременно (все остальные тесты
// последовательны на своём Store — Store и правда общий на все TCP-
// подключения с этапа 2, но остальным тестам такая нагрузка не нужна, там
// go test -race просто нечего ловить). goroutines горутин одновременно
// пытаются DEL один и тот же набор из keys ключей — конкурируют за одни и те
// же записи в store.data/store.expire.
//
// Без store.mu это классическая гонка на map: под -race детектор укажет на
// конкретную строку, а без -race в худшем случае — паника рантайма
// "concurrent map writes", в лучшем — потерянное обновление (lost update),
// когда две горутины видят ключ живым одновременно и обе засчитывают его
// себе. Инвариант, который ловит именно lost update: суммарное число
// удалений по ВСЕМ горутинам обязано быть РОВНО keys — каждый ключ реально
// удаляется РОВНО одной горутиной, для всех остальных store.live(key) к
// моменту их DEL уже должен сказать "нет" (см. TestSafeTokenBucketConcurrent
// в ratelimiter — тот же приём: конкурирующие горутины за общий ресурс,
// точная сумма вместо простого "не упало").
func TestDispatchConcurrentDelRace(t *testing.T) {
	const (
		goroutines = 8
		keys       = 200
	)
	store := NewStore()
	for i := 0; i < keys; i++ {
		Dispatch(store, []string{"SET", fmt.Sprintf("k%d", i), "v"})
	}

	var deleted atomic.Int64
	var wg sync.WaitGroup
	for g := 0; g < goroutines; g++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for i := 0; i < keys; i++ {
				reply := Dispatch(store, []string{"DEL", fmt.Sprintf("k%d", i)})
				n, ok := reply.(integerReply)
				if !ok {
					t.Errorf("DEL k%d: не Integer-ответ: %#v", i, reply)
					continue
				}
				deleted.Add(int64(n))
			}
		}()
	}
	wg.Wait()

	if got := deleted.Load(); got != keys {
		t.Fatalf("конкурентный DEL: суммарно удалено %d, ожидалось ровно %d (каждый ключ должен быть учтён РОВНО одним DEL)", got, keys)
	}
}
