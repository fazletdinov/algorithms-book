package hashtable

import (
	"math/rand"
	"slices"
	"strings"
	"testing"
)

// Случайная последовательность Put/Get/Delete сверяется с эталоном map[int]int.
// Узкий диапазон ключей (включая отрицательные) даёт много коллизий, обновлений
// и реальных удалений; после каждой операции проверяется и Len.
func TestHashMapRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(1009))
	for range 300 {
		h := NewHashMap()
		ref := map[int]int{}
		for range 200 {
			key := rng.Intn(40) - 5 // -5..34, включая отрицательные
			switch rng.Intn(4) {
			case 0, 1: // вставка/обновление (чаще, чтобы таблица росла)
				val := rng.Intn(1000)
				h.Put(key, val)
				ref[key] = val
			case 2: // удаление
				_, want := ref[key]
				if got := h.Delete(key); got != want {
					t.Fatalf("Delete(%d) = %v, want %v", key, got, want)
				}
				delete(ref, key)
			case 3: // поиск
				v, ok := h.Get(key)
				wv, wok := ref[key]
				if ok != wok || (ok && v != wv) {
					t.Fatalf("Get(%d) = (%d, %v), want (%d, %v)", key, v, ok, wv, wok)
				}
			}
			if h.Len() != len(ref) {
				t.Fatalf("Len() = %d, want %d", h.Len(), len(ref))
			}
		}
		// Полная сверка содержимого с эталоном.
		for k, want := range ref {
			if v, ok := h.Get(k); !ok || v != want {
				t.Fatalf("итог: Get(%d) = (%d, %v), want (%d, true)", k, v, ok, want)
			}
		}
	}
}

// Сверка TwoSum с перебором пар: из случайных чисел оставляем только входы, где
// пара ровно одна (так обещает условие), — перебор тогда даёт единственный ответ.
// Мелкий диапазон значений даёт повторы и половинки target.
func TestTwoSumRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(2027))
	checked := 0
	for checked < 2000 {
		n := 2 + rng.Intn(12)
		nums := make([]int, n)
		for i := range nums {
			nums[i] = rng.Intn(21) - 10
		}
		target := rng.Intn(31) - 15
		var want []int
		pairs := 0
		for i := 0; i < n; i++ {
			for j := i + 1; j < n; j++ {
				if nums[i]+nums[j] == target {
					pairs++
					want = []int{i, j}
				}
			}
		}
		if pairs != 1 {
			continue
		}
		checked++
		if got := TwoSum(slices.Clone(nums), target); !slices.Equal(got, want) {
			t.Fatalf("TwoSum(%v, %d) = %v, перебор даёт %v", nums, target, got, want)
		}
	}
}

// Сверка GroupAnagrams с перебором: два слова в одной группе, если их буквы
// совпадают как мультимножества (проверка подсчётом, без сортировки). Алфавит из
// трёх букв и короткие слова дают много анаграмм и повторов.
func TestGroupAnagramsRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(2029))
	sameLetters := func(a, b string) bool {
		if len(a) != len(b) {
			return false
		}
		var c [26]int
		for i := range len(a) {
			c[a[i]-'a']++
			c[b[i]-'a']--
		}
		return c == [26]int{}
	}
	for range 1000 {
		words := make([]string, rng.Intn(15))
		for i := range words {
			b := make([]byte, rng.Intn(4))
			for k := range b {
				b[k] = byte('a' + rng.Intn(3))
			}
			words[i] = string(b)
		}
		var want [][]string
	next:
		for _, w := range words {
			for gi := range want {
				if sameLetters(want[gi][0], w) {
					want[gi] = append(want[gi], w)
					continue next
				}
			}
			want = append(want, []string{w})
		}
		if got := GroupAnagrams(slices.Clone(words)); !equalGroups(got, want) {
			t.Fatalf("GroupAnagrams(%q) = %q, перебор даёт группы %q", words, got, want)
		}
	}
}

// Сверка LongestConsecutive с перебором: от каждого числа идём вверх, проверяя
// наличие следующего линейным поиском. Узкий диапазон — длинные цепочки и повторы.
func TestLongestConsecutiveRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(2039))
	for range 2000 {
		nums := make([]int, rng.Intn(20))
		for i := range nums {
			nums[i] = rng.Intn(25) - 12
		}
		want := 0
		for _, x := range nums {
			length := 1
			for slices.Contains(nums, x+length) {
				length++
			}
			want = max(want, length)
		}
		if got := LongestConsecutive(slices.Clone(nums)); got != want {
			t.Fatalf("LongestConsecutive(%v) = %d, перебор даёт %d", nums, got, want)
		}
	}
}

// Сверка FirstUniqueChar с перебором: для каждой позиции считаем её букву по всей
// строке. Алфавит из четырёх букв — уникальные буквы то есть, то нет.
func TestFirstUniqueCharRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(2053))
	for range 2000 {
		b := make([]byte, rng.Intn(12))
		for i := range b {
			b[i] = byte('a' + rng.Intn(4))
		}
		s := string(b)
		want := -1
		for i := range len(s) {
			if strings.Count(s, s[i:i+1]) == 1 {
				want = i
				break
			}
		}
		if got := FirstUniqueChar(s); got != want {
			t.Fatalf("FirstUniqueChar(%q) = %d, перебор даёт %d", s, got, want)
		}
	}
}
