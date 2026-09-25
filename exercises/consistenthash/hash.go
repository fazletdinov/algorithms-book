// Готовая инфраструктура пакета — не задача, решать здесь нечего. Лежит без
// build-тега, потому что нужна и заготовке, и эталону.

package consistenthash

import "hash/fnv"

// HashKey — хеш ключа для кольца: FNV-1a на 32 бита с перемешивающим финалом.
//
// Финал (fmix32 из MurmurHash3) не украшение. Имена виртуальных узлов отличаются
// последним символом — «cache-1#0», «cache-1#1», … — а последний шаг FNV-1a это
// умножение на простое чуть больше 2^24: разница в единицу на входе даёт сдвиг
// хеша почти ровно на 2^24, то есть на 1/256 кольца. Точки одного узла встают
// частоколом рядом друг с другом, и 100 виртуальных узлов балансируют не лучше
// одного (замер — TestShardingExperiment). Баланс портит хеш, а не алгоритм.
func HashKey(s string) uint32 {
	return fmix32(fnv32a(s))
}

// HashKey64 — 64-битный хеш того же ключа: вход для JumpHash.
func HashKey64(s string) uint64 {
	h := fnv.New64a()
	h.Write([]byte(s))
	return fmix64(h.Sum64())
}

// ModShard — наивное шардирование «остаток от деления»: номер узла из n.
// Дано готовым как точка отсчёта: именно его заменяет кольцо. При n <= 0
// узлов нет — возвращает -1.
func ModShard(key string, n int) int {
	if n <= 0 {
		return -1
	}
	return int(HashKey(key) % uint32(n))
}

func fnv32a(s string) uint32 {
	h := fnv.New32a()
	h.Write([]byte(s))
	return h.Sum32()
}

func fmix32(h uint32) uint32 {
	h ^= h >> 16
	h *= 0x85ebca6b
	h ^= h >> 13
	h *= 0xc2b2ae35
	h ^= h >> 16
	return h
}

func fmix64(h uint64) uint64 {
	h ^= h >> 33
	h *= 0xff51afd7ed558ccd
	h ^= h >> 33
	h *= 0xc4ceb9fe1a85ec53
	h ^= h >> 33
	return h
}
