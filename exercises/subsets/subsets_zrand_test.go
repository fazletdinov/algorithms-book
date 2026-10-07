package subsets

import (
	"math/rand"
	"sort"
	"strconv"
	"strings"
	"testing"
)

// canonSubset — отсортированное подмножество как ключ-строка.
func canonSubset(s []int) string {
	cp := append([]int{}, s...)
	sort.Ints(cp)
	parts := make([]string, len(cp))
	for i, v := range cp {
		parts[i] = strconv.Itoa(v)
	}
	return strings.Join(parts, ",")
}

func canonSet(subs [][]int) []string {
	keys := make([]string, len(subs))
	for i, s := range subs {
		keys[i] = canonSubset(s)
	}
	sort.Strings(keys)
	return keys
}

// uniqueStrs — отсортированные уникальные ключи (вход уже отсортирован).
func uniqueStrs(keys []string) []string {
	var out []string
	for i, k := range keys {
		if i == 0 || k != keys[i-1] {
			out = append(out, k)
		}
	}
	return out
}

func equalStrs(a, b []string) bool {
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

// bruteSubsets — все 2^n подмножеств через битовую маску (вход — различные числа).
func bruteSubsets(nums []int) [][]int {
	n := len(nums)
	var res [][]int
	for mask := 0; mask < (1 << n); mask++ {
		var sub []int
		for i := 0; i < n; i++ {
			if mask&(1<<i) != 0 {
				sub = append(sub, nums[i])
			}
		}
		res = append(res, sub)
	}
	return res
}

func TestSubsetsRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(1201))
	for range 2000 {
		n := rng.Intn(8)
		nums := rng.Perm(n + 5)[:n] // n различных чисел
		got := canonSet(Subsets(nums))
		want := canonSet(bruteSubsets(nums))
		if len(got) != (1 << n) {
			t.Fatalf("Subsets(%v): %d подмножеств, want %d", nums, len(got), 1<<n)
		}
		if !equalStrs(got, want) {
			t.Fatalf("Subsets(%v) = %v, want %v", nums, got, want)
		}
	}
}

// SubsetsWithDup: тот же битовый перебор, но множество ключей сам схлопывает
// дубликаты — на вход подаём массив с повторами.
func TestSubsetsWithDupRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(1202))
	for range 2000 {
		n := rng.Intn(8)
		nums := make([]int, n)
		for i := range nums {
			nums[i] = rng.Intn(4) // узкий диапазон → много дублей
		}
		raw := SubsetsWithDup(nums)
		got := canonSet(raw)
		want := uniqueStrs(canonSet(bruteSubsets(nums)))
		// решение не должно выдавать дубликаты подмножеств
		if len(uniqueStrs(got)) != len(got) {
			t.Fatalf("SubsetsWithDup(%v) выдал дубликаты: %v", nums, got)
		}
		if !equalStrs(got, want) {
			t.Fatalf("SubsetsWithDup(%v) = %v, want %v", nums, got, want)
		}
	}
}

func choose(n, k int) int {
	if k < 0 || k > n {
		return 0
	}
	res := 1
	for i := 0; i < k; i++ {
		res = res * (n - i) / (i + 1)
	}
	return res
}

// Combinations(n,k): число == C(n,k), каждое — строго возрастающий набор размера k
// из 1..n, без повторов. Сверяем множество с битовым перебором подмножеств [1..n]
// размера k.
func TestCombinationsRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(1203))
	for range 2000 {
		n := rng.Intn(7) + 1
		k := rng.Intn(n) + 1
		got := Combinations(n, k)
		if len(got) != choose(n, k) {
			t.Fatalf("Combinations(%d,%d): %d, want C = %d", n, k, len(got), choose(n, k))
		}
		var want [][]int
		for mask := 0; mask < (1 << n); mask++ {
			if popcount(mask) != k {
				continue
			}
			var c []int
			for i := 0; i < n; i++ {
				if mask&(1<<i) != 0 {
					c = append(c, i+1)
				}
			}
			want = append(want, c)
		}
		if !equalStrs(canonSet(got), canonSet(want)) {
			t.Fatalf("Combinations(%d,%d) = %v не совпало с перебором", n, k, got)
		}
	}
}

func popcount(x int) int {
	c := 0
	for x != 0 {
		x &= x - 1
		c++
	}
	return c
}

// bruteLetterCase — рекурсивный перебор регистров каждой буквы.
func bruteLetterCase(s string) []string {
	res := []string{""}
	for i := 0; i < len(s); i++ {
		c := s[i]
		var variants []byte
		switch {
		case c >= 'a' && c <= 'z':
			variants = []byte{c, c - ('a' - 'A')}
		case c >= 'A' && c <= 'Z':
			variants = []byte{c, c + ('a' - 'A')}
		default:
			variants = []byte{c}
		}
		var next []string
		for _, prefix := range res {
			for _, v := range variants {
				next = append(next, prefix+string(v))
			}
		}
		res = next
	}
	return res
}

func TestLetterCasePermutationRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(1204))
	alphabet := "aA1bB2zZ9"
	for range 3000 {
		k := rng.Intn(5)
		buf := make([]byte, k)
		for i := range buf {
			buf[i] = alphabet[rng.Intn(len(alphabet))]
		}
		s := string(buf)
		got := append([]string{}, LetterCasePermutation(s)...)
		want := bruteLetterCase(s)
		sort.Strings(got)
		sort.Strings(want)
		if !equalStrs(got, want) {
			t.Fatalf("LetterCasePermutation(%q) = %v, want %v", s, got, want)
		}
	}
}
