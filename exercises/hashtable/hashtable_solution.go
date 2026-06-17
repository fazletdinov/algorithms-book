//go:build solution

package hashtable

type entry struct {
	key, val int
}

type HashMap struct {
	buckets [][]entry
	size    int
}

const initialBuckets = 4

func NewHashMap() *HashMap {
	return &HashMap{buckets: make([][]entry, initialBuckets)}
}

// index превращает ключ в номер бакета, нормализуя знак (key mod m в Go
// может быть отрицательным).
func (h *HashMap) index(key int) int {
	m := len(h.buckets)
	i := key % m
	if i < 0 {
		i += m
	}
	return i
}

func (h *HashMap) Put(key, val int) {
	i := h.index(key)
	for j := range h.buckets[i] {
		if h.buckets[i][j].key == key {
			h.buckets[i][j].val = val // обновляем на месте
			return
		}
	}
	h.buckets[i] = append(h.buckets[i], entry{key, val})
	h.size++
	if h.size*4 > len(h.buckets)*3 { // load factor > 0.75
		h.resize(len(h.buckets) * 2)
	}
}

func (h *HashMap) Get(key int) (int, bool) {
	i := h.index(key)
	for _, e := range h.buckets[i] {
		if e.key == key {
			return e.val, true
		}
	}
	return 0, false
}

func (h *HashMap) Delete(key int) bool {
	i := h.index(key)
	chain := h.buckets[i]
	for j, e := range chain {
		if e.key == key {
			h.buckets[i] = append(chain[:j], chain[j+1:]...) // вырезаем из цепочки
			h.size--
			return true
		}
	}
	return false
}

func (h *HashMap) Len() int { return h.size }

// resize создаёт newCap бакетов и перехеширует все записи: после смены len
// меняется и index(key), поэтому каждый ключ кладётся в новый бакет.
func (h *HashMap) resize(newCap int) {
	old := h.buckets
	h.buckets = make([][]entry, newCap)
	for _, chain := range old {
		for _, e := range chain {
			i := h.index(e.key)
			h.buckets[i] = append(h.buckets[i], e)
		}
	}
}
