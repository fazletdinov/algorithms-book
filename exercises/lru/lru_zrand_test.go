package lru

import (
	"math/rand"
	"testing"
)

// modelLRU — наивная модель LRU-кэша: срез пар {key, val} от свежайшей записи
// к LRU-хвосту, линейный поиск на каждый вызов. Медленно, зато семантика
// прозрачна: любое обращение (Get/Put существующего) освежает запись,
// вытеснение — чистое LRU по хвосту, при cap <= 0 ничего не хранится.
type modelLRU struct {
	cap   int
	items [][2]int // items[0] — свежайшая {key, val}
}

func (m *modelLRU) find(key int) int {
	for i, kv := range m.items {
		if kv[0] == key {
			return i
		}
	}
	return -1
}

func (m *modelLRU) get(key int) int {
	i := m.find(key)
	if i < 0 {
		return -1
	}
	kv := m.items[i]
	m.items = append(m.items[:i], m.items[i+1:]...)
	m.items = append([][2]int{kv}, m.items...) // обращение освежает
	return kv[1]
}

func (m *modelLRU) put(key, val int) {
	if m.cap <= 0 {
		return
	}
	if i := m.find(key); i >= 0 {
		m.items = append(m.items[:i], m.items[i+1:]...)
	}
	m.items = append([][2]int{{key, val}}, m.items...)
	if len(m.items) > m.cap {
		m.items = m.items[:len(m.items)-1] // вытесняем LRU-хвост
	}
}

// TestLRUCacheRandom: случайные перемешанные Get/Put против наивной модели.
// Маленькие ёмкость и пул ключей заставляют вытеснение и обновление срабатывать
// постоянно; ёмкость 0 включена как вырожденный случай. Сид фиксирован →
// падение воспроизводимо.
func TestLRUCacheRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(20260728))
	for run := 0; run < 50; run++ {
		capacity := rng.Intn(5) // 0..4, включая вырожденный cap=0
		keys := 2 + rng.Intn(6) // ключи из пула 0..keys-1
		c := Constructor(capacity)
		model := &modelLRU{cap: capacity}
		for step := 0; step < 2000; step++ {
			key := rng.Intn(keys)
			if rng.Intn(2) == 0 {
				val := rng.Intn(1000)
				c.Put(key, val)
				model.put(key, val)
			} else {
				if got, want := c.Get(key), model.get(key); got != want {
					t.Fatalf("run %d step %d: Get(%d) = %d, модель = %d (cap=%d)",
						run, step, key, got, want, capacity)
				}
			}
		}
	}
}
