package cyclicsort

import (
	"math/rand"
	"sort"
	"testing"
)

func shuffled(rng *rand.Rand, n int) []int {
	a := make([]int, n)
	for i := range a {
		a[i] = i + 1
	}
	rng.Shuffle(n, func(i, j int) { a[i], a[j] = a[j], a[i] })
	return a
}

func equal(a, b []int) bool {
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

// CyclicSort: перестановка 1..n должна стать отсортированной (эталон — sort.Ints).
func TestCyclicSortRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(801))
	for range 3000 {
		n := rng.Intn(40) + 1
		got := shuffled(rng, n)
		want := make([]int, n)
		copy(want, got)
		sort.Ints(want)
		CyclicSort(got)
		if !equal(got, want) {
			t.Fatalf("CyclicSort = %v, want %v", got, want)
		}
	}
}

// FindMissingNumber: n различных чисел из 0..n, одно пропущено. Brute — по множеству.
func TestFindMissingNumberRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(802))
	for range 3000 {
		n := rng.Intn(40) + 1
		full := make([]int, n+1)
		for i := range full {
			full[i] = i
		}
		rng.Shuffle(n+1, func(i, j int) { full[i], full[j] = full[j], full[i] })
		drop := full[n] // удаляем последний после перемешивания
		nums := append([]int{}, full[:n]...)
		seen := make([]bool, n+1)
		for _, v := range nums {
			seen[v] = true
		}
		want := 0
		for i := 0; i <= n; i++ {
			if !seen[i] {
				want = i
				break
			}
		}
		if got := FindMissingNumber(nums); got != want {
			t.Fatalf("FindMissingNumber(%v) = %d, want %d (dropped %d)", nums, got, want, drop)
		}
	}
}

// FindAllMissingNumbers: длина n, значения 1..n с повторами. Brute — счётчик присутствия.
func TestFindAllMissingNumbersRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(803))
	for range 3000 {
		n := rng.Intn(40) + 1
		nums := make([]int, n)
		seen := make([]bool, n+1)
		for i := range nums {
			nums[i] = rng.Intn(n) + 1
			seen[nums[i]] = true
		}
		want := []int{}
		for v := 1; v <= n; v++ {
			if !seen[v] {
				want = append(want, v)
			}
		}
		got := FindAllMissingNumbers(nums)
		if !equal(got, want) {
			t.Fatalf("FindAllMissingNumbers = %v, want %v", got, want)
		}
	}
}

// FindDuplicate: длина n+1, значения 1..n, ровно одно значение продублировано.
func TestFindDuplicateRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(804))
	for range 3000 {
		n := rng.Intn(40) + 1
		nums := make([]int, 0, n+1)
		for i := 1; i <= n; i++ {
			nums = append(nums, i)
		}
		dup := rng.Intn(n) + 1
		nums = append(nums, dup)
		rng.Shuffle(len(nums), func(i, j int) { nums[i], nums[j] = nums[j], nums[i] })
		if got := FindDuplicate(nums); got != dup {
			t.Fatalf("FindDuplicate(%v) = %d, want %d", nums, got, dup)
		}
	}
}

// FindAllDuplicates: длина n, значения 1..n, каждое встречается один или два раза.
// Конструируем вход через пары (дубль, выбывший): берём перестановку 1..n и для
// каждой пары перезаписываем место выбывшего значением дубля.
func TestFindAllDuplicatesRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(805))
	for range 3000 {
		n := rng.Intn(40) + 2
		nums := shuffled(rng, n)
		pos := make(map[int]int, n) // значение -> индекс
		for i, v := range nums {
			pos[v] = i
		}
		vals := shuffled(rng, n) // случайный порядок значений 1..n
		k := rng.Intn(n/2 + 1)   // число дублей
		want := []int{}
		for i := 0; i < k; i++ {
			dupVal := vals[2*i]
			victim := vals[2*i+1]
			nums[pos[victim]] = dupVal // victim исчезает, dupVal встречается дважды
			want = append(want, dupVal)
		}
		sort.Ints(want)
		got := FindAllDuplicates(nums)
		if !equal(got, want) {
			t.Fatalf("FindAllDuplicates(%v) = %v, want %v", nums, got, want)
		}
	}
}
