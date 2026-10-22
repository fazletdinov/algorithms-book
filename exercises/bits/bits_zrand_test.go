package bits

import (
	"math/bits"
	"math/rand"
	"sort"
	"testing"
)

// distinctPairs возвращает k пар v, v со значениями, которых нет в taken и которые
// не повторяются между парами: условие «каждое число встречается ровно дважды»
// выполнено, и решение на счётчиках, верное по условию, тест не уронит.
func distinctPairs(rng *rand.Rand, k int, taken ...int) []int {
	used := map[int]bool{}
	for _, v := range taken {
		used[v] = true
	}
	var out []int
	for len(out) < 2*k {
		v := rng.Intn(1000)
		if used[v] {
			continue
		}
		used[v] = true
		out = append(out, v, v)
	}
	return out
}

// SingleNumber: все числа парами, одно одиночное. Brute — счётчик частот.
func TestSingleNumberRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(1001))
	for range 3000 {
		single := rng.Intn(1000)
		nums := append([]int{single}, distinctPairs(rng, rng.Intn(8), single)...)
		rng.Shuffle(len(nums), func(i, j int) { nums[i], nums[j] = nums[j], nums[i] })
		if got := SingleNumber(nums); got != single {
			t.Fatalf("SingleNumber(%v) = %d, want %d", nums, got, single)
		}
	}
}

// IsPowerOfTwo против math/bits: степень двойки ⇔ ровно один установленный бит и n>0.
func TestIsPowerOfTwoRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(1002))
	for range 5000 {
		n := rng.Intn(1 << 20)
		want := n > 0 && bits.OnesCount(uint(n)) == 1
		if got := IsPowerOfTwo(n); got != want {
			t.Fatalf("IsPowerOfTwo(%d) = %v, want %v", n, got, want)
		}
	}
}

// HammingWeight против эталонного popcount из стандартной библиотеки.
func TestHammingWeightRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(1003))
	for range 5000 {
		n := rng.Uint32()
		want := bits.OnesCount32(n)
		if got := HammingWeight(n); got != want {
			t.Fatalf("HammingWeight(%d) = %d, want %d", n, got, want)
		}
	}
}

// MissingNumber: n различных значений из 0..n, одно пропущено. Brute — сумма Гаусса.
func TestMissingNumberRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(1004))
	for range 3000 {
		n := rng.Intn(50) + 1
		full := make([]int, n+1)
		for i := range full {
			full[i] = i
		}
		rng.Shuffle(n+1, func(i, j int) { full[i], full[j] = full[j], full[i] })
		miss := full[n]
		nums := full[:n]
		want := n * (n + 1) / 2
		for _, v := range nums {
			want -= v
		}
		if got := MissingNumber(nums); got != want || got != miss {
			t.Fatalf("MissingNumber(%v) = %d, want %d", nums, got, want)
		}
	}
}

// CountBits против поразрядного popcount для каждого i из 0..n.
func TestCountBitsRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(1005))
	for range 500 {
		n := rng.Intn(500)
		got := CountBits(n)
		if len(got) != n+1 {
			t.Fatalf("CountBits(%d): длина %d, want %d", n, len(got), n+1)
		}
		for i := 0; i <= n; i++ {
			if want := bits.OnesCount(uint(i)); got[i] != want {
				t.Fatalf("CountBits(%d)[%d] = %d, want %d", n, i, got[i], want)
			}
		}
	}
}

// TwoSingleNumbers: ровно два одиночных, остальные парами. Результат — пара по
// возрастанию. Brute — частоты + сортировка.
func TestTwoSingleNumbersRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(1006))
	for range 3000 {
		a, b := rng.Intn(1000), rng.Intn(1000)
		for a == b {
			b = rng.Intn(1000)
		}
		nums := append([]int{a, b}, distinctPairs(rng, rng.Intn(8), a, b)...)
		rng.Shuffle(len(nums), func(i, j int) { nums[i], nums[j] = nums[j], nums[i] })
		want := []int{a, b}
		sort.Ints(want)
		got := TwoSingleNumbers(nums)
		if len(got) != 2 || got[0] != want[0] || got[1] != want[1] {
			t.Fatalf("TwoSingleNumbers(%v) = %v, want %v", nums, got, want)
		}
	}
}
