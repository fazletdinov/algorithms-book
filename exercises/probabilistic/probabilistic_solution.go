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

// hashes возвращает два независимых хеша (для приёма h1 + i*h2).
func hashes(data []byte) (uint64, uint64) {
	h1 := fnv.New64a()
	_, _ = h1.Write(data)
	h2 := fnv.New64()
	_, _ = h2.Write(data)
	return h1.Sum64(), h2.Sum64()
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
