//go:build !solution

// Package probabilistic — вероятностные структуры данных.
// Теория — в книге: ../../src/probabilistic-structures.md
//
// Реализуй Bloom-фильтр, затем запусти тесты:
//
//	go test ./probabilistic/
//
// Bloom-фильтр отвечает на вопрос «видели ли мы уже этот элемент?»:
//   - «точно нет» — если хоть один из k бит равен 0;
//   - «возможно да» — если все k бит стоят (может быть ложным срабатыванием).
//
// Подсказка: k позиций удобно получить из ДВУХ хешей приёмом
// Кирша — Мицендмахера: p_i = (h1 + i*h2) % m. Возьми, например,
// hash/fnv (fnv.New64a и fnv.New64) для двух независимых хешей.
package probabilistic

// Bloom — вероятностное множество на битовом массиве.
type Bloom struct {
	bits []uint64 // упакованный битовый массив (64 бита на слово)
	m    uint     // всего бит
	k    uint     // число хеш-функций
}

// NewBloom создаёт фильтр на m бит с k хеш-функциями.
func NewBloom(m, k uint) *Bloom {
	panic("TODO: реализуй NewBloom — выдели битовый массив на m бит")
}

// Add добавляет элемент: ставит в 1 все k его бит.
func (b *Bloom) Add(data []byte) {
	panic("TODO: реализуй Add — зажги k бит по k хешам")
}

// MightContain возвращает false, если элемента ТОЧНО не было,
// и true, если он ВОЗМОЖНО был (либо ложное срабатывание).
func (b *Bloom) MightContain(data []byte) bool {
	panic("TODO: реализуй MightContain — верни false на первом нулевом бите")
}
