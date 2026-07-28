//go:build solution

package lru

type node struct {
	key, val   int
	prev, next *node
}

// LRUCache — хеш-таблица key->узел + двусвязный список порядка свежести.
type LRUCache struct {
	cap        int
	m          map[int]*node
	head, tail *node // head.next — самый свежий, tail.prev — самый старый
}

func Constructor(capacity int) LRUCache {
	head, tail := &node{}, &node{}
	head.next, tail.prev = tail, head
	return LRUCache{cap: capacity, m: make(map[int]*node), head: head, tail: tail}
}

func (c *LRUCache) remove(n *node) { n.prev.next, n.next.prev = n.next, n.prev }

func (c *LRUCache) addFront(n *node) {
	n.prev, n.next = c.head, c.head.next
	c.head.next.prev = n
	c.head.next = n
}

func (c *LRUCache) Get(key int) int {
	n, ok := c.m[key]
	if !ok {
		return -1
	}
	c.remove(n)
	c.addFront(n)
	return n.val
}

func (c *LRUCache) Put(key, value int) {
	if n, ok := c.m[key]; ok {
		n.val = value
		c.remove(n)
		c.addFront(n)
		return
	}
	if c.cap <= 0 { // вырожденный кэш: хранить негде, Put — no-op
		return
	}
	if len(c.m) >= c.cap {
		lru := c.tail.prev
		c.remove(lru)
		delete(c.m, lru.key)
	}
	n := &node{key: key, val: value}
	c.m[key] = n
	c.addFront(n)
}
