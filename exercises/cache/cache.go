//go:build !solution

// Package cache — боевой мини-проект: LRU-кэш с TTL.
// Теория паттерна — в книге: ../../src/pattern-combinations.md (раздел LRU Cache)
//
//	go test ./cache/                 # ваша реализация
//	go test -tags solution ./cache/  # эталон
//
// Обычный LRU (хеш-таблица + двусвязный список) ты уже собрал в пакете `lru`.
// Здесь — продовый вариант: LRU + TTL (запись живёт ограниченное время).
package cache

// TTLCache — LRU-кэш со сроком жизни записей: вытесняет и по переполнению
// (LRU), и по истечении TTL. Время подаётся снаружи (nowMs) для детерминизма.
type TTLCache struct {
	cap   int
	ttlMs int64
	// TODO: как в LRU — map[int]*node + двусвязный список со сентинелами,
	// но у узла добавьте поле expireAt (nowMs + ttlMs на момент записи).
}

// NewTTLCache создаёт кэш на capacity записей, каждая живёт ttlMs миллисекунд.
func NewTTLCache(capacity int, ttlMs int64) *TTLCache {
	return &TTLCache{cap: capacity, ttlMs: ttlMs}
}

// Get возвращает значение и true, если ключ есть и НЕ протух (expireAt > nowMs);
// иначе (0, false). Протухшую запись удобно удалить прямо здесь (лениво).
func (c *TTLCache) Get(key int, nowMs int64) (int, bool) {
	// TODO: найдите ключ; если протух (expireAt <= nowMs) — удалите и верните
	// (0,false); иначе передвиньте запись в начало (свежайшая) и верните значение.
	panic("TODO: реализуйте Get")
}

// Put кладёт/обновляет запись со сроком жизни nowMs+ttlMs, делает её свежайшей;
// при превышении ёмкости вытесняет наименее недавно использованную (LRU-хвост).
func (c *TTLCache) Put(key, value int, nowMs int64) {
	// TODO: если ключ есть — обновите значение и expireAt, передвиньте в начало;
	// иначе создайте узел, добавьте в начало и, если размер превысил cap,
	// вытесните узел с хвоста (LRU).
	panic("TODO: реализуйте Put")
}
