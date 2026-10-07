package prefixsum

import (
	"math/rand"
	"reflect"
	"testing"
)

// Модели ниже считают ответ ПО ОПРЕДЕЛЕНИЮ — перебором всех отрезков, без
// единого префикса. Совпадение с ними на тысячах случайных входов — независимая
// проверка: ошибка «на единицу» в prefix[r+1] или забытый пустой префикс
// разойдутся с перебором уже на входах длины 2–3.

func randInts(rng *rand.Rand, n, lo, hi int) []int {
	res := make([]int, n)
	for i := range res {
		res[i] = lo + rng.Intn(hi-lo+1)
	}
	return res
}

func bruteSum(a []int, l, r int) int {
	s := 0
	for i := l; i <= r; i++ {
		s += a[i]
	}
	return s
}

func TestRangeSumsRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(1101))
	for range 2000 {
		nums := randInts(rng, rng.Intn(8)+1, -5, 5)
		qs := make([][2]int, rng.Intn(5))
		want := make([]int, len(qs))
		for i := range qs {
			l := rng.Intn(len(nums))
			r := l + rng.Intn(len(nums)-l)
			qs[i] = [2]int{l, r}
			want[i] = bruteSum(nums, l, r)
		}
		if got := RangeSums(nums, qs); !reflect.DeepEqual(got, want) {
			t.Fatalf("RangeSums(%v, %v) = %v, перебор = %v", nums, qs, got, want)
		}
	}
}

func TestCountSubarraysWithSumRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(1102))
	for range 3000 {
		nums := randInts(rng, rng.Intn(9), -3, 3)
		k := rng.Intn(7) - 3
		want := 0
		for l := range nums {
			for r := l; r < len(nums); r++ {
				if bruteSum(nums, l, r) == k {
					want++
				}
			}
		}
		if got := CountSubarraysWithSum(nums, k); got != want {
			t.Fatalf("CountSubarraysWithSum(%v, %d) = %d, перебор = %d", nums, k, got, want)
		}
	}
}

func TestLongestBalancedRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(1103))
	for range 3000 {
		bits := randInts(rng, rng.Intn(10), 0, 1)
		want := 0
		for l := range bits {
			ones := 0
			for r := l; r < len(bits); r++ {
				ones += bits[r]
				if n := r - l + 1; 2*ones == n && n > want {
					want = n
				}
			}
		}
		if got := LongestBalanced(bits); got != want {
			t.Fatalf("LongestBalanced(%v) = %d, перебор = %d", bits, got, want)
		}
	}
}

func TestCountDivisibleSubarraysRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(1104))
	for range 3000 {
		nums := randInts(rng, rng.Intn(9), -9, 9)
		k := rng.Intn(6) + 1
		want := 0
		for l := range nums {
			for r := l; r < len(nums); r++ {
				if bruteSum(nums, l, r)%k == 0 {
					want++
				}
			}
		}
		if got := CountDivisibleSubarrays(nums, k); got != want {
			t.Fatalf("CountDivisibleSubarrays(%v, %d) = %d, перебор = %d", nums, k, got, want)
		}
	}
}

func TestMaxSubarraySumRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(1105))
	for range 3000 {
		nums := randInts(rng, rng.Intn(9)+1, -6, 6)
		want := nums[0]
		for l := range nums {
			for r := l; r < len(nums); r++ {
				if s := bruteSum(nums, l, r); s > want {
					want = s
				}
			}
		}
		if got := MaxSubarraySum(nums); got != want {
			t.Fatalf("MaxSubarraySum(%v) = %d, перебор = %d", nums, got, want)
		}
	}
}

func TestProductExceptSelfRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(1106))
	for range 3000 {
		nums := randInts(rng, rng.Intn(6)+2, -3, 3) // нули выпадают часто — на них ломается деление
		want := make([]int, len(nums))
		for i := range nums {
			want[i] = 1
			for j, v := range nums {
				if j != i {
					want[i] *= v
				}
			}
		}
		in := append([]int(nil), nums...)
		if got := ProductExceptSelf(in); !reflect.DeepEqual(got, want) {
			t.Fatalf("ProductExceptSelf(%v) = %v, перебор = %v", nums, got, want)
		}
	}
}

func TestApplyRangeAddsRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(1107))
	for range 2000 {
		n := rng.Intn(8) + 1
		ups := make([][3]int, rng.Intn(6))
		want := make([]int, n)
		for i := range ups {
			l := rng.Intn(n)
			r := l + rng.Intn(n-l)
			d := rng.Intn(11) - 5
			ups[i] = [3]int{l, r, d}
			for j := l; j <= r; j++ {
				want[j] += d
			}
		}
		if got := ApplyRangeAdds(n, ups); !reflect.DeepEqual(got, want) {
			t.Fatalf("ApplyRangeAdds(%d, %v) = %v, перебор = %v", n, ups, got, want)
		}
	}
}

func TestMatrixRegionSumsRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(1108))
	for range 1500 {
		rows, cols := rng.Intn(4)+1, rng.Intn(4)+1
		m := make([][]int, rows)
		for i := range m {
			m[i] = randInts(rng, cols, -4, 4)
		}
		qs := make([][4]int, rng.Intn(4)+1)
		want := make([]int, len(qs))
		for i := range qs {
			r1, c1 := rng.Intn(rows), rng.Intn(cols)
			r2, c2 := r1+rng.Intn(rows-r1), c1+rng.Intn(cols-c1)
			qs[i] = [4]int{r1, c1, r2, c2}
			for r := r1; r <= r2; r++ {
				want[i] += bruteSum(m[r], c1, c2)
			}
		}
		if got := MatrixRegionSums(m, qs); !reflect.DeepEqual(got, want) {
			t.Fatalf("MatrixRegionSums(%v, %v) = %v, перебор = %v", m, qs, got, want)
		}
	}
}
