package consistenthash

import (
	"math/rand"
	"strconv"
	"testing"
)

// modelOwner — владелец ключа по определению, без всякой структуры: на каждый
// запрос заново строим все точки кольца и перебором ищем первую с хешем >= хеша
// ключа (при равенстве — меньшее имя узла), а если такой нет — самую первую.
// Медленно и очевидно верно — этим и полезно как эталон для сверки.
func modelOwner(nodes map[string]bool, replicas int, key string) string {
	h := HashKey(key)
	var bestNode, firstNode string
	var bestH, firstH uint32
	haveBest, haveFirst := false, false
	less := func(ah uint32, an string, bh uint32, bn string) bool {
		return ah < bh || (ah == bh && an < bn)
	}
	for n := range nodes {
		for i := range replicas {
			ph := HashKey(n + "#" + strconv.Itoa(i))
			if !haveFirst || less(ph, n, firstH, firstNode) {
				firstH, firstNode, haveFirst = ph, n, true
			}
			if ph >= h && (!haveBest || less(ph, n, bestH, bestNode)) {
				bestH, bestNode, haveBest = ph, n, true
			}
		}
	}
	if haveBest {
		return bestNode
	}
	return firstNode // за последней точкой — снова первая
}

// TestRingRandom гоняет случайные Add/Remove/Get и сверяет каждый Get с моделью.
func TestRingRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(20260924))
	pool := nodeNames(12)
	for round := range 30 {
		replicas := 1 + rng.Intn(20)
		r := NewRing(replicas)
		nodes := map[string]bool{}
		for op := range 300 {
			switch x := rng.Intn(10); {
			case x < 3:
				n := pool[rng.Intn(len(pool))]
				r.Add(n)
				nodes[n] = true
			case x < 5:
				n := pool[rng.Intn(len(pool))]
				r.Remove(n)
				delete(nodes, n)
			default:
				k := "k" + strconv.Itoa(rng.Intn(100000))
				want := ""
				if len(nodes) > 0 {
					want = modelOwner(nodes, replicas, k)
				}
				if got := r.Get(k); got != want {
					t.Fatalf("раунд %d, операция %d (V=%d, узлы %v): Get(%q) = %q, по определению %q",
						round, op, replicas, nodes, k, got, want)
				}
			}
		}
	}
}

// TestJumpHashRandom сверяет распределение: на случайных ключах корзины
// заполняются равномерно — отклонение от среднего не больше нескольких процентов.
func TestJumpHashRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(20260925))
	for _, buckets := range []int{3, 10, 37} {
		load := make([]int, buckets)
		const n = 60000
		for range n {
			b := JumpHash(rng.Uint64(), buckets)
			if b < 0 || b >= buckets {
				t.Fatalf("JumpHash(…, %d) = %d вне диапазона", buckets, b)
			}
			load[b]++
		}
		mean := float64(n) / float64(buckets)
		for b, l := range load {
			if dev := (float64(l) - mean) / mean; dev > 0.08 || dev < -0.08 {
				t.Errorf("%d корзин: корзина %d получила %d ключей при среднем %.0f (отклонение %.1f%%)",
					buckets, b, l, mean, 100*dev)
			}
		}
	}
}
