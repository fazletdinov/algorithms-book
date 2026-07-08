//go:build solution

package cache

// TTLCache — LRU-кэш с временем жизни записей (TTL): вытесняет и по
// переполнению (давно не использованные), и по истечении срока. Это «sweet
// spot» продовых кэшей (hashicorp/golang-lru expirable, ccache). Внутри —
// хеш-таблица + двусвязный список (как обычный LRU), но у записи есть expireAt.
type node struct {
	key, val   int
	expireAt   int64
	prev, next *node
}

type TTLCache struct {
	cap        int
	ttlMs      int64
	m          map[int]*node
	head, tail *node // сентинелы: head.next — свежайшая, tail.prev — LRU
}

func NewTTLCache(capacity int, ttlMs int64) *TTLCache {
	h, t := &node{}, &node{}
	h.next, t.prev = t, h
	return &TTLCache{cap: capacity, ttlMs: ttlMs, m: make(map[int]*node), head: h, tail: t}
}

func (c *TTLCache) remove(n *node) { n.prev.next, n.next.prev = n.next, n.prev }

func (c *TTLCache) addFront(n *node) {
	n.prev, n.next = c.head, c.head.next
	c.head.next.prev, c.head.next = n, n
}

// Get возвращает значение и true, если ключ есть и НЕ протух; иначе (0,false).
// Протухшую запись удаляем лениво при обращении.
func (c *TTLCache) Get(key int, nowMs int64) (int, bool) {
	n, ok := c.m[key]
	if !ok {
		return 0, false
	}
	if n.expireAt <= nowMs { // срок вышел — как будто записи нет
		c.remove(n)
		delete(c.m, key)
		return 0, false
	}
	c.remove(n)
	c.addFront(n) // обращение делает запись свежайшей
	return n.val, true
}

// Put кладёт/обновляет запись со сроком жизни nowMs+ttlMs и делает её свежайшей.
// При превышении ёмкости вытесняет наименее недавно использованную (LRU).
func (c *TTLCache) Put(key, value int, nowMs int64) {
	if c.cap <= 0 {
		return
	}
	if n, ok := c.m[key]; ok {
		n.val = value
		n.expireAt = nowMs + c.ttlMs
		c.remove(n)
		c.addFront(n)
		return
	}
	n := &node{key: key, val: value, expireAt: nowMs + c.ttlMs}
	c.m[key] = n
	c.addFront(n)
	if len(c.m) > c.cap {
		lru := c.tail.prev // наименее недавно использованная
		c.remove(lru)
		delete(c.m, lru.key)
	}
}
