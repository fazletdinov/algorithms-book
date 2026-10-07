package fastslow

import (
	"math/rand"
	"testing"
)

// bruteDetect — первый узел, встреченный дважды при обходе по ссылкам (= вход в
// цикл), через множество посещённых указателей. Независимо от «зайца и черепахи».
func bruteDetect(head *ListNode) *ListNode {
	seen := map[*ListNode]bool{}
	for n := head; n != nil; n = n.Next {
		if seen[n] {
			return n
		}
		seen[n] = true
	}
	return nil
}

func randVals(rng *rand.Rand, n int) []int {
	v := make([]int, n)
	for i := range v {
		v[i] = rng.Intn(100)
	}
	return v
}

func TestHasCycleRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(2401))
	for range 5000 {
		n := rng.Intn(10)
		pos := rng.Intn(n+2) - 1 // [-1 .. n], -1 = без цикла
		if n == 0 {
			pos = -1
		}
		head := fromSliceWithCycle(randVals(rng, n), pos)
		want := bruteDetect(head) != nil
		if got := HasCycle(head); got != want {
			t.Fatalf("HasCycle(n=%d, pos=%d) = %v, want %v", n, pos, got, want)
		}
	}
}

func TestDetectCycleRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(2402))
	for range 5000 {
		n := rng.Intn(10)
		pos := rng.Intn(n+2) - 1
		if n == 0 {
			pos = -1
		}
		head := fromSliceWithCycle(randVals(rng, n), pos)
		want := bruteDetect(head) // тот же узел по указателю
		if got := DetectCycle(head); got != want {
			t.Fatalf("DetectCycle(n=%d, pos=%d) вернул не тот узел", n, pos)
		}
	}
}

func TestCycleLengthRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(2403))
	for range 5000 {
		n := rng.Intn(10)
		pos := rng.Intn(n+2) - 1
		if n == 0 {
			pos = -1
		}
		head := fromSliceWithCycle(randVals(rng, n), pos)
		want := 0
		if e := bruteDetect(head); e != nil {
			want = 1
			for c := e.Next; c != e; c = c.Next {
				want++
			}
		}
		if got := CycleLength(head); got != want {
			t.Fatalf("CycleLength(n=%d, pos=%d) = %d, want %d", n, pos, got, want)
		}
	}
}

func TestMiddleNodeRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(2404))
	for range 5000 {
		n := rng.Intn(12) + 1 // ациклический непустой список
		head := fromSlice(randVals(rng, n))
		want := nodeAt(head, n/2) // для чётной длины — второй из двух средних
		if got := MiddleNode(head); got != want {
			t.Fatalf("MiddleNode(n=%d) вернул не узел с индексом %d", n, n/2)
		}
	}
}

func TestIsHappyNumberRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(2405))
	next := func(x int) int {
		s := 0
		for x > 0 {
			d := x % 10
			s += d * d
			x /= 10
		}
		return s
	}
	for range 5000 {
		x := rng.Intn(500) + 1
		// brute: крутим до 1 или повтора (множество посещённых)
		seen := map[int]bool{}
		cur := x
		for cur != 1 && !seen[cur] {
			seen[cur] = true
			cur = next(cur)
		}
		want := cur == 1
		if got := IsHappyNumber(x); got != want {
			t.Fatalf("IsHappyNumber(%d) = %v, want %v", x, got, want)
		}
	}
}
