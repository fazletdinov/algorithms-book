//go:build !solution

// Package hashtable — хеш-таблица на цепочках (separate chaining).
// Теория структуры — в книге: ../../src/hash-table-structure.md
//
//	go test ./hashtable/                 # ваши решения
//	go test -tags solution ./hashtable/  # эталон
//
// Реализуйте Put/Get/Delete/Len. Коллизии разрешаются цепочкой записей в
// бакете; при превышении коэффициента загрузки таблица расширяется и
// перехешируется. Ключи и значения — int.
package hashtable

// entry — одна пара ключ/значение в цепочке бакета.
type entry struct {
	key, val int
}

// HashMap — массив бакетов; каждый бакет хранит цепочку записей.
// size — текущее число пар (для коэффициента загрузки и Len).
type HashMap struct {
	buckets [][]entry
	size    int
}

// NewHashMap создаёт пустую таблицу с несколькими бакетами.
func NewHashMap() *HashMap {
	// TODO: верните таблицу с небольшим числом пустых бакетов (например, 4):
	// make([][]entry, 4). Главное — len(buckets) > 0, иначе деление на ноль.
	panic("TODO: реализуйте NewHashMap")
}

// Put вставляет пару key->val или обновляет значение, если ключ уже есть.
// Ожидаемая сложность: амортизированно O(1).
func (h *HashMap) Put(key, val int) {
	// TODO: i := индекс бакета по хешу (key mod len(buckets), нормализуя знак);
	// если ключ уже в цепочке — обновите val и выйдите; иначе допишите запись,
	// увеличьте size и при load factor > 0.75 расширьте таблицу (resize).
	panic("TODO: реализуйте Put")
}

// Get возвращает значение по ключу и true, либо 0 и false, если ключа нет.
// Ожидаемая сложность: в среднем O(1).
func (h *HashMap) Get(key int) (int, bool) {
	// TODO: сосканируйте цепочку нужного бакета, сравнивая ключи.
	panic("TODO: реализуйте Get")
}

// Delete удаляет ключ и возвращает true, если он был; иначе false и таблица
// не меняется. Ожидаемая сложность: в среднем O(1).
func (h *HashMap) Delete(key int) bool {
	// TODO: найдите запись в цепочке бакета; вырежьте её (append из двух частей),
	// уменьшите size, верните true. Если ключа нет — false.
	panic("TODO: реализуйте Delete")
}

// Len возвращает число пар в таблице.
func (h *HashMap) Len() int {
	// TODO: верните size.
	panic("TODO: реализуйте Len")
}
