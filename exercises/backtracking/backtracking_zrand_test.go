package backtracking

import (
	"math/rand"
	"sort"
	"testing"
)

func factorial(n int) int {
	f := 1
	for i := 2; i <= n; i++ {
		f *= i
	}
	return f
}

// Permutations: проверяем число (n!), уникальность и что каждая строка —
// перестановка исходного мультимножества (вход — различные числа).
func TestPermutationsRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(1101))
	for range 1000 {
		n := rng.Intn(6) + 1
		nums := rng.Perm(n) // n различных чисел 0..n-1 в случайном порядке
		got := Permutations(nums)
		if len(got) != factorial(n) {
			t.Fatalf("Permutations(%v): %d перестановок, want %d", nums, len(got), factorial(n))
		}
		want := append([]int{}, nums...)
		sort.Ints(want)
		seen := map[string]bool{}
		for _, p := range got {
			if len(p) != n {
				t.Fatalf("перестановка %v не длины %d", p, n)
			}
			cp := append([]int{}, p...)
			sort.Ints(cp)
			for i := range cp {
				if cp[i] != want[i] {
					t.Fatalf("%v не перестановка %v", p, nums)
				}
			}
			key := keyOf(p)
			if seen[key] {
				t.Fatalf("повтор перестановки %v", p)
			}
			seen[key] = true
		}
	}
}

func keyOf(a []int) string {
	b := make([]byte, 0, len(a)*3)
	for _, v := range a {
		b = append(b, byte(v+1), ',')
	}
	return string(b)
}

func catalan(n int) int {
	// C_n = (2n)! / ((n+1)! n!) — считаем итеративно.
	res := 1
	for i := 0; i < n; i++ {
		res = res * 2 * (2*i + 1) / (i + 2)
	}
	return res
}

// GenerateParentheses: число == каталановскому, каждая строка валидна и уникальна.
func TestGenerateParenthesesRandom(t *testing.T) {
	for n := 0; n <= 9; n++ {
		got := GenerateParentheses(n)
		if n == 0 {
			continue // контракт на n=0 не фиксируем
		}
		if len(got) != catalan(n) {
			t.Fatalf("GenerateParentheses(%d): %d штук, want C_%d = %d", n, len(got), n, catalan(n))
		}
		seen := map[string]bool{}
		for _, s := range got {
			if len(s) != 2*n {
				t.Fatalf("«%s» не длины %d", s, 2*n)
			}
			if seen[s] {
				t.Fatalf("повтор «%s»", s)
			}
			seen[s] = true
			bal := 0
			for _, c := range s {
				if c == '(' {
					bal++
				} else {
					bal--
				}
				if bal < 0 {
					t.Fatalf("«%s» невалидна", s)
				}
			}
			if bal != 0 {
				t.Fatalf("«%s» несбалансирована", s)
			}
		}
	}
}

// bruteCombinationSum — независимый перебор: берём кандидаты по неубыванию
// индекса (повторы разрешены), собираем все комбинации с нужной суммой.
func bruteCombinationSum(cand []int, target int) [][]int {
	sorted := append([]int{}, cand...)
	sort.Ints(sorted)
	var res [][]int
	var cur []int
	var rec func(start, rem int)
	rec = func(start, rem int) {
		if rem == 0 {
			res = append(res, append([]int{}, cur...))
			return
		}
		for i := start; i < len(sorted); i++ {
			if sorted[i] > rem {
				break
			}
			cur = append(cur, sorted[i])
			rec(i, rem-sorted[i])
			cur = cur[:len(cur)-1]
		}
	}
	rec(0, target)
	sortCombos(res)
	return res
}

func sortCombos(c [][]int) {
	sort.Slice(c, func(i, j int) bool {
		a, b := c[i], c[j]
		for k := 0; k < len(a) && k < len(b); k++ {
			if a[k] != b[k] {
				return a[k] < b[k]
			}
		}
		return len(a) < len(b)
	})
}

func equalCombos(a, b [][]int) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if len(a[i]) != len(b[i]) {
			return false
		}
		for j := range a[i] {
			if a[i][j] != b[i][j] {
				return false
			}
		}
	}
	return true
}

func TestCombinationSumRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(1102))
	for range 2000 {
		n := rng.Intn(5) + 1
		set := map[int]bool{}
		var cand []int
		for len(cand) < n {
			v := rng.Intn(8) + 1
			if !set[v] {
				set[v] = true
				cand = append(cand, v)
			}
		}
		target := rng.Intn(15) + 1
		got := CombinationSum(cand, target)
		sortCombos(got)
		want := bruteCombinationSum(cand, target)
		if !equalCombos(got, want) {
			t.Fatalf("CombinationSum(%v, %d) = %v, want %v", cand, target, got, want)
		}
	}
}

// SolveNQueensCount против известной последовательности A000170.
func TestSolveNQueensCountTable(t *testing.T) {
	want := []int{1, 1, 0, 0, 2, 10, 4, 40, 92, 352}
	for n := 1; n <= 9; n++ {
		if got := SolveNQueensCount(n); got != want[n] {
			t.Fatalf("SolveNQueensCount(%d) = %d, want %d", n, got, want[n])
		}
	}
}

// bruteLetters — прямое декартово произведение строк раскладки.
func bruteLetters(digits string) []string {
	if len(digits) == 0 {
		return []string{}
	}
	m := map[byte]string{
		'2': "abc", '3': "def", '4': "ghi", '5': "jkl",
		'6': "mno", '7': "pqrs", '8': "tuv", '9': "wxyz",
	}
	res := []string{""}
	for i := 0; i < len(digits); i++ {
		var next []string
		for _, prefix := range res {
			for j := 0; j < len(m[digits[i]]); j++ {
				next = append(next, prefix+string(m[digits[i]][j]))
			}
		}
		res = next
	}
	return res
}

func TestLetterCombinationsRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(1103))
	for range 3000 {
		k := rng.Intn(4)
		buf := make([]byte, k)
		for i := range buf {
			buf[i] = byte('2' + rng.Intn(8)) // цифры 2..9
		}
		digits := string(buf)
		got := append([]string{}, LetterCombinations(digits)...)
		want := bruteLetters(digits)
		sort.Strings(got)
		sort.Strings(want)
		if len(got) != len(want) {
			t.Fatalf("LetterCombinations(%q): %d, want %d", digits, len(got), len(want))
		}
		for i := range got {
			if got[i] != want[i] {
				t.Fatalf("LetterCombinations(%q) = %v, want %v", digits, got, want)
			}
		}
	}
}
