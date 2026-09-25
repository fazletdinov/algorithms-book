package consistenthash

import (
	"strconv"
	"testing"
)

// Цена одного выбора узла тремя способами. Хеширование ключа входит в замер
// везде — сравнивается полная стоимость ответа «куда идти», а не одна формула.
//
//	go test -p 1 -tags solution -run='^$' -bench=. -count=5 ./consistenthash/

var sink int

func benchKeys() []string {
	keys := make([]string, 4096)
	for i := range keys {
		keys[i] = "user:" + strconv.Itoa(i)
	}
	return keys
}

func BenchmarkModShard(b *testing.B) {
	keys := benchKeys()
	for i := 0; i < b.N; i++ {
		sink += ModShard(keys[i&4095], 10)
	}
}

func benchRing(b *testing.B, nodes int) {
	r := NewRing(100)
	for n := range nodes {
		r.Add("cache-" + strconv.Itoa(n+1))
	}
	keys := benchKeys()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		sink += len(r.Get(keys[i&4095]))
	}
}

func BenchmarkRingGet10Nodes(b *testing.B)  { benchRing(b, 10) }
func BenchmarkRingGet100Nodes(b *testing.B) { benchRing(b, 100) }

func benchJump(b *testing.B, buckets int) {
	keys := benchKeys()
	for i := 0; i < b.N; i++ {
		sink += JumpHash(HashKey64(keys[i&4095]), buckets)
	}
}

func BenchmarkJumpHash10(b *testing.B)   { benchJump(b, 10) }
func BenchmarkJumpHash1000(b *testing.B) { benchJump(b, 1000) }
