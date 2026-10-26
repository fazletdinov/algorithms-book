package slidingwindow

import (
	"math/rand"
	"testing"
)

// bruteMaxWindow — наивный O(n·k) максимум каждого окна (эталон для сверки).
func bruteMaxWindow(arr []int, k int) []int {
	res := make([]int, 0, len(arr)-k+1)
	for i := 0; i+k <= len(arr); i++ {
		mx := arr[i]
		for j := i + 1; j < i+k; j++ {
			if arr[j] > mx {
				mx = arr[j]
			}
		}
		res = append(res, mx)
	}
	return res
}

// TestMaxSlidingWindowRandom: тысяча случайных входов против наивного решения.
// Узкий диапазон значений даёт много равных элементов — это вскрывает классические
// ошибки монотонного дека (устаревшая голова окна, '<' vs '<=' при чистке хвоста),
// которые маленькие табличные кейсы пропускают. Сид фиксирован → падение
// воспроизводимо.
func TestMaxSlidingWindowRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(1))
	for range 1000 {
		n := rng.Intn(30) + 1
		k := rng.Intn(n) + 1
		arr := make([]int, n)
		for i := range arr {
			arr[i] = rng.Intn(12) - 4 // [-4..7]: дубликаты и отрицательные
		}
		got := MaxSlidingWindow(arr, k)
		want := bruteMaxWindow(arr, k)
		if !equalInts(got, want) {
			t.Fatalf("MaxSlidingWindow(%v, %d) = %v, brute = %v", arr, k, got, want)
		}
	}
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

// Ниже — сверка четырёх функций окна с перебором всех окон [i..j] на маленьких
// случайных входах из узкого алфавита: много повторов, ничьих и пустых ответов.

func TestCharacterReplacementRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(2))
	for range 1000 {
		b := make([]byte, rng.Intn(16))
		for i := range b {
			b[i] = byte('A' + rng.Intn(3))
		}
		s, k := string(b), rng.Intn(4)
		want := 0
		for i := range len(s) {
			var cnt [26]int
			top := 0
			for j := i; j < len(s); j++ {
				cnt[s[j]-'A']++
				top = max(top, cnt[s[j]-'A'])
				if j-i+1-top <= k {
					want = max(want, j-i+1)
				}
			}
		}
		if got := CharacterReplacement(s, k); got != want {
			t.Fatalf("CharacterReplacement(%q, %d) = %d, перебор = %d", s, k, got, want)
		}
	}
}

func TestCheckInclusionRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(3))
	for range 1000 {
		randStr := func(n int) string {
			b := make([]byte, n)
			for i := range b {
				b[i] = byte('a' + rng.Intn(3))
			}
			return string(b)
		}
		s1, s2 := randStr(rng.Intn(5)), randStr(rng.Intn(12))
		var need [26]int
		for i := range len(s1) {
			need[s1[i]-'a']++
		}
		want := false
		for i := 0; i+len(s1) <= len(s2); i++ {
			var have [26]int
			for j := i; j < i+len(s1); j++ {
				have[s2[j]-'a']++
			}
			want = want || have == need
		}
		if got := CheckInclusion(s1, s2); got != want {
			t.Fatalf("CheckInclusion(%q, %q) = %v, перебор = %v", s1, s2, got, want)
		}
	}
}

func TestLongestOnesRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(4))
	for range 1000 {
		nums := make([]int, rng.Intn(16))
		for i := range nums {
			nums[i] = rng.Intn(2)
		}
		k := rng.Intn(4)
		want := 0
		for i := range nums {
			zeros := 0
			for j := i; j < len(nums); j++ {
				if nums[j] == 0 {
					zeros++
				}
				if zeros <= k {
					want = max(want, j-i+1)
				}
			}
		}
		if got := LongestOnes(nums, k); got != want {
			t.Fatalf("LongestOnes(%v, %d) = %d, перебор = %d", nums, k, got, want)
		}
	}
}

func TestNumSubarrayProductLessThanKRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(5))
	for range 1000 {
		nums := make([]int, rng.Intn(12))
		for i := range nums {
			nums[i] = rng.Intn(5) + 1
		}
		k := rng.Intn(40)
		want := 0
		for i := range nums {
			p := 1
			for j := i; j < len(nums); j++ {
				p *= nums[j]
				if p < k {
					want++
				}
			}
		}
		if got := NumSubarrayProductLessThanK(nums, k); got != want {
			t.Fatalf("NumSubarrayProductLessThanK(%v, %d) = %d, перебор = %d", nums, k, got, want)
		}
	}
}

func TestSubarraysWithKDistinctRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(6))
	for range 1000 {
		nums := make([]int, rng.Intn(14))
		for i := range nums {
			nums[i] = rng.Intn(4) + 1
		}
		k := rng.Intn(4) + 1
		want := 0
		for i := range nums {
			seen := map[int]bool{}
			for j := i; j < len(nums); j++ {
				seen[nums[j]] = true
				if len(seen) == k {
					want++
				}
			}
		}
		if got := SubarraysWithKDistinct(nums, k); got != want {
			t.Fatalf("SubarraysWithKDistinct(%v, %d) = %d, перебор = %d", nums, k, got, want)
		}
	}
}

func TestFindAnagramsRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(7))
	for range 1000 {
		randStr := func(n int) string {
			b := make([]byte, n)
			for i := range b {
				b[i] = byte('a' + rng.Intn(3))
			}
			return string(b)
		}
		s, p := randStr(rng.Intn(12)), randStr(rng.Intn(4)+1)
		var need [26]int
		for i := range len(p) {
			need[p[i]-'a']++
		}
		var want []int
		for i := 0; i+len(p) <= len(s); i++ {
			var have [26]int
			for j := i; j < i+len(p); j++ {
				have[s[j]-'a']++
			}
			if have == need {
				want = append(want, i)
			}
		}
		if got := FindAnagrams(s, p); !equalInts(got, want) {
			t.Fatalf("FindAnagrams(%q, %q) = %v, перебор = %v", s, p, got, want)
		}
	}
}
