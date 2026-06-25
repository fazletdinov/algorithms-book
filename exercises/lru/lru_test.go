package lru

import "testing"

// Классический сценарий LeetCode (capacity = 2): проверяем вытеснение по LRU и
// то, что Get обновляет свежесть.
func TestLRUSequence(t *testing.T) {
	c := Constructor(2)
	c.Put(1, 1)
	c.Put(2, 2)
	if got := c.Get(1); got != 1 { // 1 стал свежим
		t.Fatalf("Get(1) = %d, ожидалось 1", got)
	}
	c.Put(3, 3) // ёмкость превышена — вытесняется 2 (давно не используемый)
	if got := c.Get(2); got != -1 {
		t.Errorf("Get(2) = %d, ожидалось -1 (2 должен быть вытеснен)", got)
	}
	c.Put(4, 4) // вытесняется 1
	if got := c.Get(1); got != -1 {
		t.Errorf("Get(1) = %d, ожидалось -1 (1 должен быть вытеснен)", got)
	}
	if got := c.Get(3); got != 3 {
		t.Errorf("Get(3) = %d, ожидалось 3", got)
	}
	if got := c.Get(4); got != 4 {
		t.Errorf("Get(4) = %d, ожидалось 4", got)
	}
}

// Put существующего ключа обновляет значение и не считается новой вставкой.
func TestLRUUpdateExisting(t *testing.T) {
	c := Constructor(2)
	c.Put(1, 10)
	c.Put(2, 20)
	c.Put(1, 100) // обновляем значение и делаем свежим
	if got := c.Get(1); got != 100 {
		t.Fatalf("Get(1) = %d, ожидалось 100", got)
	}
	c.Put(3, 30) // вытесняется 2 (1 свежее после обновления)
	if got := c.Get(2); got != -1 {
		t.Errorf("Get(2) = %d, ожидалось -1", got)
	}
	if got := c.Get(1); got != 100 {
		t.Errorf("Get(1) = %d, ожидалось 100", got)
	}
}

// Кэш ёмкости 1: каждая новая вставка вытесняет предыдущую.
func TestLRUCapacityOne(t *testing.T) {
	c := Constructor(1)
	c.Put(1, 1)
	c.Put(2, 2) // вытесняет 1
	if got := c.Get(1); got != -1 {
		t.Errorf("Get(1) = %d, ожидалось -1", got)
	}
	if got := c.Get(2); got != 2 {
		t.Errorf("Get(2) = %d, ожидалось 2", got)
	}
}
