package cache

import (
	"math/rand"
	"testing"
)

// modelEntry — запись наивной модели TTL-кэша.
type modelEntry struct {
	key, val int
	expireAt int64
}

// modelCache — наивная модель TTLCache: срез записей от свежайшей к LRU,
// линейный поиск на каждый вызов. Медленно, зато семантика прозрачна:
//   - протухание ленивое и строго на границе (expireAt <= now — записи нет);
//   - Put обновляет значение, срок жизни И свежесть;
//   - вытеснение — чистое LRU по хвосту: протухшие записи занимают место,
//     пока их не тронет Get.
type modelCache struct {
	cap   int
	ttlMs int64
	items []modelEntry // items[0] — свежайшая, items[len-1] — LRU
}

func (m *modelCache) find(key int) int {
	for i, e := range m.items {
		if e.key == key {
			return i
		}
	}
	return -1
}

func (m *modelCache) get(key int, nowMs int64) (int, bool) {
	i := m.find(key)
	if i < 0 {
		return 0, false
	}
	e := m.items[i]
	m.items = append(m.items[:i], m.items[i+1:]...)
	if e.expireAt <= nowMs { // ровно на границе — уже протухла, удаляем лениво
		return 0, false
	}
	m.items = append([]modelEntry{e}, m.items...) // обращение освежает
	return e.val, true
}

func (m *modelCache) put(key, val int, nowMs int64) {
	if m.cap <= 0 {
		return
	}
	if i := m.find(key); i >= 0 {
		m.items = append(m.items[:i], m.items[i+1:]...)
	}
	m.items = append([]modelEntry{{key: key, val: val, expireAt: nowMs + m.ttlMs}}, m.items...)
	if len(m.items) > m.cap {
		m.items = m.items[:len(m.items)-1] // вытесняем LRU-хвост
	}
}

// TestTTLCacheRandom: случайные перемешанные Get/Put против наивной модели.
// Маленькие ёмкость и пул ключей заставляют вытеснение и обновление срабатывать
// постоянно; скачки времени РОВНО на ttlMs бьют по границе протухания
// (классическое '<' vs '<=' в expireAt). Сид фиксирован → падение воспроизводимо.
func TestTTLCacheRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(20260707))
	for run := 0; run < 50; run++ {
		capacity := rng.Intn(5)            // 0..4, включая вырожденный cap=0
		ttlMs := int64(10 + rng.Intn(191)) // 10..200 мс
		keys := 2 + rng.Intn(6)            // ключи из пула 0..keys-1
		c := NewTTLCache(capacity, ttlMs)
		model := &modelCache{cap: capacity, ttlMs: ttlMs}

		now := int64(0)
		for step := 0; step < 2000; step++ {
			switch rng.Intn(6) {
			case 0: // время стоит
			case 1:
				now += ttlMs // скачок ровно на TTL — граница протухания!
			case 2:
				now += ttlMs - 1 // на волосок до границы
			default:
				now += int64(rng.Intn(int(ttlMs)))
			}
			key := rng.Intn(keys)
			if rng.Intn(2) == 0 {
				val := rng.Intn(1000)
				c.Put(key, val, now)
				model.put(key, val, now)
			} else {
				gotV, gotOK := c.Get(key, now)
				wantV, wantOK := model.get(key, now)
				if gotV != wantV || gotOK != wantOK {
					t.Fatalf("run %d step %d: Get(%d, %d) = (%d,%v), модель = (%d,%v) (cap=%d ttl=%d)",
						run, step, key, now, gotV, gotOK, wantV, wantOK, capacity, ttlMs)
				}
			}
		}
	}
}
