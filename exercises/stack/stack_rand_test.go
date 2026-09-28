package stack

import (
	"math/rand"
	"reflect"
	"strconv"
	"strings"
	"testing"
)

// Модели ниже решают те же задачи ДРУГИМ способом — перебором или рекурсией,
// без единого монотонного стека. Совпадение на тысячах случайных входов ловит
// то, что не видно в таблице: неверное правило ничьей, забытый второй круг,
// лишнее снятие со стека.

// bracketsModel: вырезать пары «()», «[]», «{}», пока вырезается. Правильная
// запись схлопывается в пустую строку — другой алгоритм, но тот же ответ.
func bracketsModel(s string) bool {
	var b strings.Builder
	for _, c := range s {
		if strings.ContainsRune("()[]{}", c) {
			b.WriteRune(c)
		}
	}
	cur := b.String()
	for {
		next := strings.NewReplacer("()", "", "[]", "", "{}", "").Replace(cur)
		if next == cur {
			return cur == ""
		}
		cur = next
	}
}

func TestIsValidBracketsRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(1201))
	const alphabet = "()[]{}x"
	for range 5000 {
		b := make([]byte, rng.Intn(9))
		for i := range b {
			b[i] = alphabet[rng.Intn(len(alphabet))]
		}
		s := string(b)
		if got, want := IsValidBrackets(s), bracketsModel(s); got != want {
			t.Fatalf("IsValidBrackets(%q) = %v, модель = %v", s, got, want)
		}
	}
}

// encodeRandom строит случайную КОРРЕКТНУЮ запись и одновременно её раскрытие —
// модель здесь сам генератор: он знает ответ по построению.
func encodeRandom(rng *rand.Rand, depth int) (enc, dec string) {
	var e, d strings.Builder
	for range rng.Intn(3) + 1 {
		if depth > 0 && rng.Intn(2) == 0 {
			k := rng.Intn(12) + 1 // до 12 — чтобы попадались двузначные
			ie, id := encodeRandom(rng, depth-1)
			e.WriteString(strconv.Itoa(k) + "[" + ie + "]")
			d.WriteString(strings.Repeat(id, k))
		} else {
			c := string(rune('a' + rng.Intn(3)))
			e.WriteString(c)
			d.WriteString(c)
		}
	}
	return e.String(), d.String()
}

func TestDecodeStringRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(1202))
	for range 2000 {
		enc, want := encodeRandom(rng, 3)
		if got := DecodeString(enc); got != want {
			t.Fatalf("DecodeString(%q) = %q, ожидалось %q", enc, got, want)
		}
	}
}

func randInts(rng *rand.Rand, n, lo, hi int) []int {
	res := make([]int, n)
	for i := range res {
		res[i] = lo + rng.Intn(hi-lo+1)
	}
	return res
}

func TestNextGreaterCircularRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(1203))
	for range 3000 {
		nums := randInts(rng, rng.Intn(8), 0, 5)
		want := make([]int, len(nums))
		for i := range nums {
			want[i] = -1
			for step := 1; step < len(nums); step++ {
				if v := nums[(i+step)%len(nums)]; v > nums[i] {
					want[i] = v
					break
				}
			}
		}
		if got := NextGreaterCircular(nums); !reflect.DeepEqual(got, want) {
			t.Fatalf("NextGreaterCircular(%v) = %v, перебор = %v", nums, got, want)
		}
	}
}

func TestStockSpansRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(1204))
	for range 3000 {
		prices := randInts(rng, rng.Intn(9), 1, 6)
		want := make([]int, len(prices))
		for i := range prices {
			for j := i; j >= 0 && prices[j] <= prices[i]; j-- {
				want[i]++
			}
		}
		if got := StockSpans(prices); !reflect.DeepEqual(got, want) {
			t.Fatalf("StockSpans(%v) = %v, перебор = %v", prices, got, want)
		}
	}
}

func TestLargestRectangleRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(1205))
	for range 3000 {
		h := randInts(rng, rng.Intn(9), 0, 6)
		want := 0
		for l := range h {
			low := h[l]
			for r := l; r < len(h); r++ {
				low = min(low, h[r])
				want = max(want, low*(r-l+1))
			}
		}
		if got := LargestRectangle(h); got != want {
			t.Fatalf("LargestRectangle(%v) = %d, перебор = %d", h, got, want)
		}
	}
}

func TestSumSubarrayMinsRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(1206))
	for range 3000 {
		arr := randInts(rng, rng.Intn(9), 1, 4) // узкий диапазон — много равных, на них живёт правило ничьей
		want := 0
		for l := range arr {
			low := arr[l]
			for r := l; r < len(arr); r++ {
				low = min(low, arr[r])
				want += low
			}
		}
		if got := SumSubarrayMins(arr); got != want {
			t.Fatalf("SumSubarrayMins(%v) = %d, перебор = %d", arr, got, want)
		}
	}
}

// removeModel перебирает все способы оставить len(num)-k цифр. Кандидаты одной
// длины, поэтому наименьшее число — лексикографически наименьшая строка.
func removeModel(num string, k int) string {
	keep := len(num) - k
	best := ""
	var rec func(i int, cur []byte)
	rec = func(i int, cur []byte) {
		if len(cur) == keep {
			if s := string(cur); best == "" || s < best {
				best = s
			}
			return
		}
		if i == len(num) || len(num)-i < keep-len(cur) {
			return
		}
		rec(i+1, append(cur, num[i]))
		rec(i+1, cur)
	}
	rec(0, make([]byte, 0, keep))
	best = strings.TrimLeft(best, "0")
	if best == "" {
		return "0"
	}
	return best
}

func TestRemoveKDigitsRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(1207))
	for range 3000 {
		n := rng.Intn(8) + 1
		b := make([]byte, n)
		for i := range b {
			b[i] = byte('0' + rng.Intn(4))
		}
		if b[0] == '0' && n > 1 {
			b[0] = '1' // по условию ведущих нулей во входе нет
		}
		num, k := string(b), rng.Intn(n+1)
		if got, want := RemoveKDigits(num, k), removeModel(num, k); got != want {
			t.Fatalf("RemoveKDigits(%q, %d) = %q, перебор = %q", num, k, got, want)
		}
	}
}
