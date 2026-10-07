package linkedlist

import (
	"math/rand"
	"testing"
)

func randVals(rng *rand.Rand, n int) []int {
	v := make([]int, n)
	for i := range v {
		v[i] = rng.Intn(20)
	}
	return v
}

func equalInts(a, b []int) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}

func TestReverseListRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(2501))
	for range 5000 {
		vals := randVals(rng, rng.Intn(12))
		want := make([]int, len(vals))
		for i, v := range vals {
			want[len(vals)-1-i] = v
		}
		got := toSlice(ReverseList(fromSlice(vals)))
		if !equalInts(got, want) {
			t.Fatalf("ReverseList(%v) = %v, want %v", vals, got, want)
		}
	}
}

func TestReverseSublistRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(2502))
	for range 5000 {
		n := rng.Intn(12) + 1
		vals := randVals(rng, n)
		p := rng.Intn(n) + 1     // 1..n
		q := p + rng.Intn(n-p+1) // p..n
		want := append([]int{}, vals...)
		for l, r := p-1, q-1; l < r; l, r = l+1, r-1 { // развернуть [p-1 .. q-1]
			want[l], want[r] = want[r], want[l]
		}
		got := toSlice(ReverseSublist(fromSlice(vals), p, q))
		if !equalInts(got, want) {
			t.Fatalf("ReverseSublist(%v, %d, %d) = %v, want %v", vals, p, q, got, want)
		}
	}
}

// reverseKBrute — развернуть каждую полную группу из k элементов; хвост (<k) как есть.
func reverseKBrute(vals []int, k int) []int {
	out := append([]int{}, vals...)
	if k <= 1 {
		return out
	}
	for i := 0; i+k <= len(out); i += k {
		for l, r := i, i+k-1; l < r; l, r = l+1, r-1 {
			out[l], out[r] = out[r], out[l]
		}
	}
	return out
}

func TestReverseKGroupRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(2503))
	for range 5000 {
		vals := randVals(rng, rng.Intn(13))
		k := rng.Intn(5) + 1
		want := reverseKBrute(vals, k)
		got := toSlice(ReverseKGroup(fromSlice(vals), k))
		if !equalInts(got, want) {
			t.Fatalf("ReverseKGroup(%v, %d) = %v, want %v", vals, k, got, want)
		}
	}
}

func TestIsPalindromeRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(2504))
	for range 5000 {
		n := rng.Intn(10)
		vals := make([]int, n)
		for i := range vals {
			vals[i] = rng.Intn(3) // узкий диапазон → реальные палиндромы тоже попадаются
		}
		want := true
		for l, r := 0, n-1; l < r; l, r = l+1, r-1 {
			if vals[l] != vals[r] {
				want = false
				break
			}
		}
		if got := IsPalindrome(fromSlice(vals)); got != want {
			t.Fatalf("IsPalindrome(%v) = %v, want %v", vals, got, want)
		}
	}
}
