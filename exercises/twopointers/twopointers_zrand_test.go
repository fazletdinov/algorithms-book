package twopointers

import (
	"math/rand"
	"sort"
	"testing"
)

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

// PairWithTargetSum: вход отсортирован. Brute O(n²) ищет первую валидную пару;
// эталон обязан вернуть какую-то корректную пару с такой же суммой.
func TestPairWithTargetSumRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(901))
	for range 3000 {
		n := rng.Intn(20) + 1
		arr := make([]int, n)
		for i := range arr {
			arr[i] = rng.Intn(25) - 5
		}
		sort.Ints(arr)
		target := rng.Intn(40) - 10
		// существует ли вообще пара
		exists := false
		for i := 0; i < n && !exists; i++ {
			for j := i + 1; j < n; j++ {
				if arr[i]+arr[j] == target {
					exists = true
					break
				}
			}
		}
		got := PairWithTargetSum(arr, target)
		if !exists {
			if got[0] != -1 || got[1] != -1 {
				t.Fatalf("PairWithTargetSum(%v, %d) = %v, пары нет — ждали [-1 -1]", arr, target, got)
			}
			continue
		}
		if got[0] < 0 || got[1] < 0 || got[0] >= got[1] || arr[got[0]]+arr[got[1]] != target {
			t.Fatalf("PairWithTargetSum(%v, %d) = %v — невалидная пара", arr, target, got)
		}
	}
}

// RemoveDuplicates: новая длина и префикс должны совпасть с уникальными значениями
// по порядку (эталон — обход с map/проверкой). Вход отсортирован.
func TestRemoveDuplicatesRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(902))
	for range 3000 {
		n := rng.Intn(20)
		arr := make([]int, n)
		for i := range arr {
			arr[i] = rng.Intn(6)
		}
		sort.Ints(arr)
		var want []int
		for i, v := range arr {
			if i == 0 || v != arr[i-1] {
				want = append(want, v)
			}
		}
		orig := append([]int{}, arr...)
		k := RemoveDuplicates(arr)
		if k != len(want) || !equalInts(arr[:k], want) {
			t.Fatalf("RemoveDuplicates(%v) длина %d, префикс %v, want %v", orig, k, arr[:k], want)
		}
	}
}

// SortedSquares: квадраты отсортированного массива. Brute — возвести и пересортировать.
func TestSortedSquaresRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(903))
	for range 3000 {
		n := rng.Intn(20) + 1
		arr := make([]int, n)
		for i := range arr {
			arr[i] = rng.Intn(21) - 10
		}
		sort.Ints(arr)
		want := make([]int, n)
		for i, v := range arr {
			want[i] = v * v
		}
		sort.Ints(want)
		if got := SortedSquares(arr); !equalInts(got, want) {
			t.Fatalf("SortedSquares(%v) = %v, want %v", arr, got, want)
		}
	}
}

// TripletsSumToZero против честного O(n³) перебора уникальных троек.
func TestTripletsSumToZeroRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(904))
	for range 2000 {
		n := rng.Intn(12) + 1
		arr := make([]int, n)
		for i := range arr {
			arr[i] = rng.Intn(11) - 5
		}
		want := bruteTriplets(arr)
		got := TripletsSumToZero(arr)
		sortTriples(got)
		if !equalTriples(got, want) {
			t.Fatalf("TripletsSumToZero(%v) = %v, want %v", arr, got, want)
		}
	}
}

// bruteTriplets — все тройки разных индексов с нулевой суммой, дедуплицированные
// по значению (как и контракт эталона), в каноническом отсортированном виде.
func bruteTriplets(arr []int) [][]int {
	seen := map[[3]int]bool{}
	var res [][]int
	n := len(arr)
	for i := 0; i < n; i++ {
		for j := i + 1; j < n; j++ {
			for k := j + 1; k < n; k++ {
				if arr[i]+arr[j]+arr[k] != 0 {
					continue
				}
				t := []int{arr[i], arr[j], arr[k]}
				sort.Ints(t)
				key := [3]int{t[0], t[1], t[2]}
				if !seen[key] {
					seen[key] = true
					res = append(res, t)
				}
			}
		}
	}
	sortTriples(res)
	return res
}

func equalTriples(a, b [][]int) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if !equalInts(a[i], b[i]) {
			return false
		}
	}
	return true
}

// DutchFlagSort: сортировка массива из 0/1/2 на месте. Brute — обычный sort.
func TestDutchFlagSortRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(905))
	for range 3000 {
		n := rng.Intn(30)
		arr := make([]int, n)
		for i := range arr {
			arr[i] = rng.Intn(3)
		}
		want := append([]int{}, arr...)
		sort.Ints(want)
		orig := append([]int{}, arr...)
		DutchFlagSort(arr)
		if !equalInts(arr, want) {
			t.Fatalf("DutchFlagSort(%v) → %v, want %v", orig, arr, want)
		}
	}
}

// TestMoveZeroesRandom: тысяча случайных входов против «собрать ненулевые, дописать
// нули» — частые нули подряд и в начале вскрывают ошибки границы.
func TestMoveZeroesRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(6))
	for range 1000 {
		arr := make([]int, rng.Intn(15))
		for i := range arr {
			arr[i] = rng.Intn(4) - 1 // [-1..2]: много нулей
		}
		want := make([]int, 0, len(arr))
		for _, v := range arr {
			if v != 0 {
				want = append(want, v)
			}
		}
		for len(want) < len(arr) {
			want = append(want, 0)
		}
		orig := append([]int{}, arr...)
		MoveZeroes(arr)
		if !equalInts(arr, want) {
			t.Fatalf("MoveZeroes(%v) = %v, ожидалось %v", orig, arr, want)
		}
	}
}

// TestMaxAreaRandom: тысяча случайных входов против перебора всех пар стенок;
// узкий диапазон высот даёт много равных — ничья при сдвиге стенок.
func TestMaxAreaRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(7))
	for range 1000 {
		h := make([]int, rng.Intn(15))
		for i := range h {
			h[i] = rng.Intn(6)
		}
		want := 0
		for i := range h {
			for j := i + 1; j < len(h); j++ {
				want = max(want, min(h[i], h[j])*(j-i))
			}
		}
		if got := MaxArea(h); got != want {
			t.Fatalf("MaxArea(%v) = %d, перебор = %d", h, got, want)
		}
	}
}

// TestMergeSortedRandom: тысяча случайных пар отсортированных массивов против
// склейки с сортировкой.
func TestMergeSortedRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(8))
	for range 1000 {
		m, n := rng.Intn(8), rng.Intn(8)
		nums1 := make([]int, m+n)
		nums2 := make([]int, n)
		for i := 0; i < m; i++ {
			nums1[i] = rng.Intn(10) - 3
		}
		for i := range nums2 {
			nums2[i] = rng.Intn(10) - 3
		}
		sort.Ints(nums1[:m])
		sort.Ints(nums2)
		for i := m; i < m+n; i++ {
			nums1[i] = 99 // мусор в свободных ячейках
		}
		want := append(append([]int{}, nums1[:m]...), nums2...)
		sort.Ints(want)
		orig := append([]int{}, nums1...)
		MergeSorted(nums1, m, nums2, n)
		if !equalInts(nums1, want) {
			t.Fatalf("MergeSorted(%v, %d, %v, %d) = %v, ожидалось %v", orig, m, nums2, n, nums1, want)
		}
	}
}

func TestIsSubsequenceRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(11))
	randStr := func(n int) string {
		b := make([]byte, n)
		for i := range b {
			b[i] = byte('a' + rng.Intn(3))
		}
		return string(b)
	}
	// isSub — перебор: можно ли выбрать из t позиции под каждую букву s по порядку
	var isSub func(s, t string) bool
	isSub = func(s, t string) bool {
		if s == "" {
			return true
		}
		for j := 0; j < len(t); j++ {
			if t[j] == s[0] && isSub(s[1:], t[j+1:]) {
				return true
			}
		}
		return false
	}
	for range 1000 {
		s, tt := randStr(rng.Intn(5)), randStr(rng.Intn(10))
		if got, want := IsSubsequence(s, tt), isSub(s, tt); got != want {
			t.Fatalf("IsSubsequence(%q, %q) = %v, перебор = %v", s, tt, got, want)
		}
	}
}

func TestIntersectSortedRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(12))
	randSorted := func(n int) []int {
		a := make([]int, n)
		for i := range a {
			a[i] = rng.Intn(6) - 2
		}
		sort.Ints(a)
		return a
	}
	for range 1000 {
		a, b := randSorted(rng.Intn(10)), randSorted(rng.Intn(10))
		// модель: для каждого значения — min из двух счётчиков
		ca, cb := map[int]int{}, map[int]int{}
		for _, x := range a {
			ca[x]++
		}
		for _, x := range b {
			cb[x]++
		}
		var want []int
		for v := -2; v <= 3; v++ {
			for range min(ca[v], cb[v]) {
				want = append(want, v)
			}
		}
		if got := IntersectSorted(a, b); !equalInts(got, want) {
			t.Fatalf("IntersectSorted(%v, %v) = %v, модель = %v", a, b, got, want)
		}
	}
}

func TestThreeSumClosestRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(13))
	for range 1000 {
		nums := make([]int, rng.Intn(6)+3)
		for i := range nums {
			nums[i] = rng.Intn(21) - 10
		}
		target := rng.Intn(61) - 30
		want, set := 0, false
		for i := range nums {
			for j := i + 1; j < len(nums); j++ {
				for k := j + 1; k < len(nums); k++ {
					s := nums[i] + nums[j] + nums[k]
					ds, dw := s-target, want-target
					if ds < 0 {
						ds = -ds
					}
					if dw < 0 {
						dw = -dw
					}
					if !set || ds < dw || (ds == dw && s < want) {
						want, set = s, true
					}
				}
			}
		}
		in := append([]int(nil), nums...)
		if got := ThreeSumClosest(in, target); got != want {
			t.Fatalf("ThreeSumClosest(%v, %d) = %d, перебор = %d", nums, target, got, want)
		}
	}
}
