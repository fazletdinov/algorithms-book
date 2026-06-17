package hashtable

import "testing"

func TestHashMapBasic(t *testing.T) {
	h := NewHashMap()
	if h.Len() != 0 {
		t.Fatalf("пустая таблица: Len() = %d, ожидалось 0", h.Len())
	}

	// При 4 бакетах ключи 1 и 5 дают один бакет (коллизия) — цепочка.
	h.Put(1, 10)
	h.Put(5, 50)
	h.Put(3, 30)
	if h.Len() != 3 {
		t.Fatalf("после трёх вставок Len() = %d, ожидалось 3", h.Len())
	}

	if v, ok := h.Get(5); !ok || v != 50 {
		t.Errorf("Get(5) = (%d, %v), ожидалось (50, true) — коллизия с 1", v, ok)
	}
	if v, ok := h.Get(1); !ok || v != 10 {
		t.Errorf("Get(1) = (%d, %v), ожидалось (10, true)", v, ok)
	}
	if _, ok := h.Get(7); ok {
		t.Errorf("Get(7) = _, true, ожидалось false (ключа нет)")
	}

	// Повторный Put обновляет значение, не увеличивая размер.
	h.Put(1, 99)
	if v, _ := h.Get(1); v != 99 {
		t.Errorf("после Put(1,99) Get(1) = %d, ожидалось 99", v)
	}
	if h.Len() != 3 {
		t.Errorf("обновление значения изменило Len() = %d, ожидалось 3", h.Len())
	}

	// Delete: первый раз true, повторный — false.
	if !h.Delete(5) {
		t.Errorf("Delete(5) = false, ожидалось true (ключ был)")
	}
	if _, ok := h.Get(5); ok {
		t.Errorf("после Delete(5) Get(5) даёт true, ожидалось false")
	}
	if v, ok := h.Get(1); !ok || v != 99 {
		t.Errorf("Delete(5) задел соседа по цепочке: Get(1) = (%d, %v)", v, ok)
	}
	if h.Delete(5) {
		t.Errorf("повторный Delete(5) = true, ожидалось false")
	}
	if h.Len() != 2 {
		t.Errorf("после удаления Len() = %d, ожидалось 2", h.Len())
	}
}

// Рост: 100 ключей переживают несколько перехеширований без потерь.
func TestHashMapResize(t *testing.T) {
	h := NewHashMap()
	const n = 100
	for i := range n {
		h.Put(i, i*i)
	}
	if h.Len() != n {
		t.Fatalf("Len() = %d, ожидалось %d", h.Len(), n)
	}
	for i := range n {
		if v, ok := h.Get(i); !ok || v != i*i {
			t.Fatalf("после роста Get(%d) = (%d, %v), ожидалось (%d, true)", i, v, ok, i*i)
		}
	}
}

// Отрицательные ключи: индекс бакета должен нормализовать знак.
func TestHashMapNegativeKeys(t *testing.T) {
	h := NewHashMap()
	for _, k := range []int{-7, -3, -1, 0, 2} {
		h.Put(k, k*10)
	}
	for _, k := range []int{-7, -3, -1, 0, 2} {
		if v, ok := h.Get(k); !ok || v != k*10 {
			t.Errorf("Get(%d) = (%d, %v), ожидалось (%d, true)", k, v, ok, k*10)
		}
	}
}
