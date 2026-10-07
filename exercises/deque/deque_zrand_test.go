package deque

import (
	"math/rand"
	"testing"
)

// Случайная последовательность операций сверяется с эталоном — обычным срезом,
// где фронт/бэк меняются явными append/срезами (наивно, но очевидно верно).
func TestDequeRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(7))
	for range 300 {
		d := NewDeque()
		ref := []int{}
		for range 200 {
			switch rng.Intn(6) {
			case 0:
				x := rng.Intn(1000)
				d.PushBack(x)
				ref = append(ref, x)
			case 1:
				x := rng.Intn(1000)
				d.PushFront(x)
				ref = append([]int{x}, ref...)
			case 2:
				v, ok := d.PopFront()
				if len(ref) == 0 {
					if ok {
						t.Fatalf("PopFront пустого = ok=true")
					}
				} else {
					if !ok || v != ref[0] {
						t.Fatalf("PopFront() = (%d,%v), want (%d,true)", v, ok, ref[0])
					}
					ref = ref[1:]
				}
			case 3:
				v, ok := d.PopBack()
				if len(ref) == 0 {
					if ok {
						t.Fatalf("PopBack пустого = ok=true")
					}
				} else {
					want := ref[len(ref)-1]
					if !ok || v != want {
						t.Fatalf("PopBack() = (%d,%v), want (%d,true)", v, ok, want)
					}
					ref = ref[:len(ref)-1]
				}
			case 4:
				v, ok := d.Front()
				checkPeek(t, "Front", v, ok, ref, 0)
			case 5:
				v, ok := d.Back()
				checkPeek(t, "Back", v, ok, ref, len(ref)-1)
			}
			if d.Len() != len(ref) {
				t.Fatalf("Len() = %d, want %d", d.Len(), len(ref))
			}
		}
	}
}

func checkPeek(t *testing.T, name string, v int, ok bool, ref []int, idx int) {
	t.Helper()
	if len(ref) == 0 {
		if ok {
			t.Fatalf("%s пустого = ok=true", name)
		}
		return
	}
	if !ok || v != ref[idx] {
		t.Fatalf("%s() = (%d,%v), want (%d,true)", name, v, ok, ref[idx])
	}
}
