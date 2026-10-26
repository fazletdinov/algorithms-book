//go:build solution

package probabilistic

import "hash/fnv"

// Bloom — вероятностное множество на битовом массиве.
type Bloom struct {
	bits []uint64
	m    uint
	k    uint
}

// NewBloom создаёт фильтр на m бит с k хеш-функциями.
func NewBloom(m, k uint) *Bloom {
	if m == 0 {
		m = 1
	}
	if k == 0 {
		k = 1
	}
	return &Bloom{bits: make([]uint64, (m+63)/64), m: m, k: k}
}

// hashes возвращает два хеша для приёма h1 + i*h2. Второй — не другой FNV:
// FNV-1 и FNV-1a почти одинаковы и вместе дают в 3–5 раз больше ложных
// срабатываний, чем обещает формула. Перемешивание h1 финалом splitmix64 даёт
// независимые на вид биты; | 1 делает шаг нечётным, чтобы он не был нулём.
func hashes(data []byte) (uint64, uint64) {
	h := fnv.New64a()
	_, _ = h.Write(data)
	h1 := h.Sum64()
	h2 := h1 + 0x9e3779b97f4a7c15
	h2 = (h2 ^ (h2 >> 30)) * 0xbf58476d1ce4e5b9
	h2 = (h2 ^ (h2 >> 27)) * 0x94d049bb133111eb
	h2 ^= h2 >> 31
	return h1, h2 | 1
}

// positions вычисляет k позиций бит для элемента.
func (b *Bloom) positions(data []byte) []uint {
	a, c := hashes(data)
	pos := make([]uint, b.k)
	for i := uint(0); i < b.k; i++ {
		pos[i] = uint((a + uint64(i)*c) % uint64(b.m))
	}
	return pos
}

// Add ставит в 1 все k бит элемента.
func (b *Bloom) Add(data []byte) {
	for _, p := range b.positions(data) {
		b.bits[p/64] |= 1 << (p % 64)
	}
}

// MightContain: false — точно не было, true — возможно было.
func (b *Bloom) MightContain(data []byte) bool {
	for _, p := range b.positions(data) {
		if b.bits[p/64]&(1<<(p%64)) == 0 {
			return false
		}
	}
	return true
}
