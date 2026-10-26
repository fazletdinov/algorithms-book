package numbertheory

import (
	"slices"
	"testing"
)

func TestGCD(t *testing.T) {
	cases := []struct{ a, b, want int }{
		{48, 36, 12}, {36, 48, 12}, {17, 5, 1}, {0, 0, 0},
		{0, 7, 7}, {7, 0, 7}, {100, 10, 10}, {-12, 8, 4}, {13, 13, 13},
	}
	for _, c := range cases {
		if got := GCD(c.a, c.b); got != c.want {
			t.Errorf("GCD(%d, %d) = %d, want %d", c.a, c.b, got, c.want)
		}
	}
}

func TestLCM(t *testing.T) {
	cases := []struct{ a, b, want int }{
		{4, 6, 12}, {3, 5, 15}, {0, 5, 0}, {5, 0, 0}, {21, 6, 42}, {7, 7, 7},
	}
	for _, c := range cases {
		if got := LCM(c.a, c.b); got != c.want {
			t.Errorf("LCM(%d, %d) = %d, want %d", c.a, c.b, got, c.want)
		}
	}
}

func TestIsPrime(t *testing.T) {
	cases := []struct {
		n    int
		want bool
	}{
		{-1, false}, {0, false}, {1, false}, {2, true}, {3, true}, {4, false},
		{9, false}, {11, true}, {15, false}, {17, true}, {25, false}, {97, true},
	}
	for _, c := range cases {
		if got := IsPrime(c.n); got != c.want {
			t.Errorf("IsPrime(%d) = %v, want %v", c.n, got, c.want)
		}
	}
}

func TestSieveOfEratosthenes(t *testing.T) {
	cases := []struct {
		n    int
		want []int
	}{
		{1, []int{}}, {2, []int{2}}, {11, []int{2, 3, 5, 7, 11}},
		{20, []int{2, 3, 5, 7, 11, 13, 17, 19}},
	}
	for _, c := range cases {
		if got := SieveOfEratosthenes(c.n); !slices.Equal(got, c.want) {
			t.Errorf("SieveOfEratosthenes(%d) = %v, want %v", c.n, got, c.want)
		}
	}
}

func TestPowMod(t *testing.T) {
	cases := []struct{ b, e, m, want int }{
		{2, 10, 1000, 24}, {3, 0, 7, 1}, {2, 5, 1, 0},
		{5, 3, 13, 8}, {7, 4, 100, 1}, {10, 9, 6, 4},
	}
	for _, c := range cases {
		if got := PowMod(c.b, c.e, c.m); got != c.want {
			t.Errorf("PowMod(%d, %d, %d) = %d, want %d", c.b, c.e, c.m, got, c.want)
		}
	}
}

func TestModInversePrime(t *testing.T) {
	cases := []struct{ a, p, want int }{
		{3, 7, 5}, {4, 7, 2}, {1, 13, 1}, {12, 13, 12}, {1, 2, 1},
		{2, 1000000007, 500000004},
		{10, 7, 5}, // a больше p: 10 ≡ 3
		{-4, 7, 5}, // отрицательное a: −4 ≡ 3
	}
	for _, c := range cases {
		if got := ModInversePrime(c.a, c.p); got != c.want {
			t.Errorf("ModInversePrime(%d, %d) = %d, ожидалось %d", c.a, c.p, got, c.want)
		}
	}
}

func TestBinomialMod(t *testing.T) {
	cases := []struct {
		name    string
		queries [][2]int
		p       int
		want    []int
	}{
		{"пример из условия", [][2]int{{5, 2}, {5, 0}, {3, 5}}, 7, []int{3, 1, 0}},
		{"k = 0 и k = n", [][2]int{{0, 0}, {6, 0}, {6, 6}, {1, 1}}, 13, []int{1, 1, 1, 1}},
		{"k > n и k < 0", [][2]int{{2, 3}, {0, 1}, {4, -1}}, 13, []int{0, 0, 0}},
		{"треугольник Паскаля", [][2]int{{4, 1}, {4, 2}, {4, 3}, {6, 3}, {10, 5}}, 1000000007, []int{4, 6, 4, 20, 252}},
		{"ответ больше модуля", [][2]int{{10, 5}, {12, 6}}, 13, []int{252 % 13, 924 % 13}},
		{"n до p − 1", [][2]int{{6, 3}, {6, 2}}, 7, []int{20 % 7, 15 % 7}},
		{"большой модуль", [][2]int{{1000000, 1}, {1000000, 2}}, 1000000007, []int{1000000, 499999500000 % 1000000007}},
		{"пустой список", [][2]int{}, 7, []int{}},
	}
	for _, c := range cases {
		got := BinomialMod(c.queries, c.p)
		if !slices.Equal(got, c.want) {
			t.Errorf("%s: BinomialMod(%v, %d) = %v, ожидалось %v", c.name, c.queries, c.p, got, c.want)
		}
	}
}
