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
