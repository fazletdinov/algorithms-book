package cache

import "testing"

func TestTTLCacheLRUEviction(t *testing.T) {
	// Ёмкость 2, большой TTL — чистое LRU-вытеснение.
	c := NewTTLCache(2, 100000)
	c.Put(1, 10, 0)
	c.Put(2, 20, 0)
	if v, ok := c.Get(1, 0); !ok || v != 10 { // 1 стал свежайшим
		t.Fatalf("Get(1) = (%d,%v), ожидалось (10,true)", v, ok)
	}
	c.Put(3, 30, 0) // ёмкость превышена — вытесняется 2 (давно не трогали)
	if _, ok := c.Get(2, 0); ok {
		t.Errorf("2 должен быть вытеснен")
	}
	if v, ok := c.Get(1, 0); !ok || v != 10 {
		t.Errorf("1 должен остаться")
	}
	if v, ok := c.Get(3, 0); !ok || v != 30 {
		t.Errorf("3 должен присутствовать")
	}
}

func TestTTLCacheExpiry(t *testing.T) {
	c := NewTTLCache(10, 1000) // живёт 1000мс
	c.Put(1, 10, 0)
	if v, ok := c.Get(1, 500); !ok || v != 10 { // в пределах TTL
		t.Errorf("Get(1,500) = (%d,%v), ожидалось (10,true)", v, ok)
	}
	if _, ok := c.Get(1, 1000); ok { // ровно на границе TTL — уже протух
		t.Errorf("на границе TTL запись должна считаться протухшей")
	}
	if _, ok := c.Get(1, 1500); ok {
		t.Errorf("после TTL запись должна отсутствовать")
	}
}

func TestTTLCacheRefreshOnPut(t *testing.T) {
	c := NewTTLCache(10, 1000)
	c.Put(1, 10, 0)   // истекает в 1000
	c.Put(1, 11, 900) // обновили — истекает в 1900
	if v, ok := c.Get(1, 1500); !ok || v != 11 {
		t.Errorf("Get(1,1500) = (%d,%v), ожидалось (11,true) после обновления TTL", v, ok)
	}
}

func TestTTLCacheUpdateMovesToFront(t *testing.T) {
	// Обновление существующего ключа освежает его и не считается новой вставкой.
	c := NewTTLCache(2, 100000)
	c.Put(1, 10, 0)
	c.Put(2, 20, 0)
	c.Put(1, 100, 0) // 1 обновлён и стал свежайшим
	c.Put(3, 30, 0)  // вытесняется 2 (1 свежее)
	if _, ok := c.Get(2, 0); ok {
		t.Errorf("2 должен быть вытеснен, а не 1")
	}
	if v, ok := c.Get(1, 0); !ok || v != 100 {
		t.Errorf("Get(1) = (%d,%v), ожидалось (100,true)", v, ok)
	}
}

func TestTTLCacheExpiredFreesRoom(t *testing.T) {
	// Протухшая запись не должна ложно занимать место.
	c := NewTTLCache(1, 1000)
	c.Put(1, 10, 0)
	if _, ok := c.Get(1, 2000); ok { // протухла и удалена лениво
		t.Fatalf("1 должен протухнуть")
	}
	c.Put(2, 20, 2000)
	if v, ok := c.Get(2, 2000); !ok || v != 20 {
		t.Errorf("Get(2) = (%d,%v), ожидалось (20,true)", v, ok)
	}
}

func TestTTLCacheZeroCapacity(t *testing.T) {
	c := NewTTLCache(0, 1000)
	c.Put(1, 10, 0)
	if _, ok := c.Get(1, 0); ok {
		t.Errorf("при ёмкости 0 кэш ничего не хранит")
	}
}
