package hashtable

import (
	"math/rand"
	"testing"
)

// Случайная последовательность Put/Get/Delete сверяется с эталоном map[int]int.
// Узкий диапазон ключей (включая отрицательные) даёт много коллизий, обновлений
// и реальных удалений; после каждой операции проверяется и Len.
func TestHashMapRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(1009))
	for range 300 {
		h := NewHashMap()
		ref := map[int]int{}
		for range 200 {
			key := rng.Intn(40) - 5 // -5..34, включая отрицательные
			switch rng.Intn(4) {
			case 0, 1: // вставка/обновление (чаще, чтобы таблица росла)
				val := rng.Intn(1000)
				h.Put(key, val)
				ref[key] = val
			case 2: // удаление
				_, want := ref[key]
				if got := h.Delete(key); got != want {
					t.Fatalf("Delete(%d) = %v, want %v", key, got, want)
				}
				delete(ref, key)
			case 3: // поиск
				v, ok := h.Get(key)
				wv, wok := ref[key]
				if ok != wok || (ok && v != wv) {
					t.Fatalf("Get(%d) = (%d, %v), want (%d, %v)", key, v, ok, wv, wok)
				}
			}
			if h.Len() != len(ref) {
				t.Fatalf("Len() = %d, want %d", h.Len(), len(ref))
			}
		}
		// Полная сверка содержимого с эталоном.
		for k, want := range ref {
			if v, ok := h.Get(k); !ok || v != want {
				t.Fatalf("итог: Get(%d) = (%d, %v), want (%d, true)", k, v, ok, want)
			}
		}
	}
}
