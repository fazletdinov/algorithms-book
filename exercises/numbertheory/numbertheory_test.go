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
