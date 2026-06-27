package recursion

import "testing"

func TestFactorial(t *testing.T) {
	cases := []struct{ n, want int }{
		{0, 1}, {1, 1}, {2, 2}, {3, 6}, {5, 120}, {10, 3628800},
	}
	for _, c := range cases {
		if got := Factorial(c.n); got != c.want {
			t.Errorf("Factorial(%d) = %d, want %d", c.n, got, c.want)
		}
	}
}

func TestFib(t *testing.T) {
	cases := []struct{ n, want int }{
		{0, 0}, {1, 1}, {2, 1}, {3, 2}, {10, 55}, {20, 6765}, {30, 832040},
	}
	for _, c := range cases {
		if got := Fib(c.n); got != c.want {
			t.Errorf("Fib(%d) = %d, want %d", c.n, got, c.want)
		}
	}
}

func TestPower(t *testing.T) {
	cases := []struct{ b, e, want int }{
		{2, 0, 1}, {2, 10, 1024}, {3, 4, 81}, {5, 3, 125}, {7, 1, 7}, {10, 6, 1000000},
	}
	for _, c := range cases {
		if got := Power(c.b, c.e); got != c.want {
			t.Errorf("Power(%d, %d) = %d, want %d", c.b, c.e, got, c.want)
		}
	}
}

func TestHanoiMoves(t *testing.T) {
	cases := []struct{ n, want int }{
		{0, 0}, {1, 1}, {2, 3}, {3, 7}, {4, 15}, {10, 1023},
	}
	for _, c := range cases {
		if got := HanoiMoves(c.n); got != c.want {
			t.Errorf("HanoiMoves(%d) = %d, want %d", c.n, got, c.want)
		}
	}
}

func TestSumDigits(t *testing.T) {
	cases := []struct{ n, want int }{
		{0, 0}, {7, 7}, {10, 1}, {99, 18}, {1234, 10}, {1000000, 1},
	}
	for _, c := range cases {
		if got := SumDigits(c.n); got != c.want {
			t.Errorf("SumDigits(%d) = %d, want %d", c.n, got, c.want)
		}
	}
}
