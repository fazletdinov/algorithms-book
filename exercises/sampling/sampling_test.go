package sampling

import (
	"fmt"
	"math"
	"math/rand"
	"slices"
	"testing"
)

func TestShuffleKeepsMultiset(t *testing.T) {
	rng := rand.New(rand.NewSource(1))
	cases := [][]int{
		{},
		{7},
		{1, 2},
		{1, 2, 3, 4, 5},
		{3, 3, 1, 2, 2}, // дубликаты тоже должны сохраниться
	}
	for _, orig := range cases {
		a := slices.Clone(orig)
		Shuffle(a, rng)
		got, want := slices.Clone(a), slices.Clone(orig)
		slices.Sort(got)
		slices.Sort(want)
		if !slices.Equal(got, want) {
			t.Errorf("Shuffle(%v) = %v: мультимножество элементов изменилось", orig, a)
		}
	}
}

// TestShuffleUniform — частотный тест равномерности: на массиве из 4 элементов
// каждая из 24 перестановок должна выпадать ~1000 раз из 24000. Допуск ±20%
// (~6 сигм при честном shuffle — тест стабилен при фиксированном сиде).
// Смещённый shuffle через rng.Intn(n) вместо rng.Intn(i+1) даёт перекос
// до ~40% и проваливает тест.
func TestShuffleUniform(t *testing.T) {
	const runs = 24000
	const perms = 24 // 4! перестановки
	rng := rand.New(rand.NewSource(42))
	counts := make(map[string]int, perms)
	for r := 0; r < runs; r++ {
		a := []int{0, 1, 2, 3}
		Shuffle(a, rng)
		counts[fmt.Sprint(a)]++
	}
	if len(counts) != perms {
		t.Fatalf("получено %d различных перестановок, ожидалось %d: %v", len(counts), perms, counts)
	}
	const want = runs / perms // 1000
	lo, hi := want*8/10, want*12/10
	for p, c := range counts {
		if c < lo || c > hi {
			t.Errorf("перестановка %s выпала %d раз, ожидалось ~%d (допуск %d..%d) — shuffle смещён?", p, c, want, lo, hi)
		}
	}
}

func TestReservoirSampleBasic(t *testing.T) {
	rng := rand.New(rand.NewSource(2))
	stream := []int{10, 20, 30, 40, 50, 60, 70, 80, 90, 100}

	// k <= 0 — пустой срез
	for _, k := range []int{0, -3} {
		if got := ReservoirSample(stream, k, rng); len(got) != 0 {
			t.Errorf("ReservoirSample(stream, %d) = %v, ожидался пустой срез", k, got)
		}
	}

	// пустой поток
	if got := ReservoirSample(nil, 3, rng); len(got) != 0 {
		t.Errorf("ReservoirSample(nil, 3) = %v, ожидался пустой срез", got)
	}

	// k >= n — весь поток в исходном порядке
	small := []int{4, 5, 6}
	for _, k := range []int{3, 5} {
		if got := ReservoirSample(small, k, rng); !slices.Equal(got, small) {
			t.Errorf("ReservoirSample(%v, %d) = %v, ожидался весь поток %v", small, k, got, small)
		}
	}

	// k < n: размер k, все элементы из потока, без дубликатов (поток различен)
	for r := 0; r < 100; r++ {
		got := ReservoirSample(stream, 3, rng)
		if len(got) != 3 {
			t.Fatalf("ReservoirSample(stream, 3): len = %d, ожидалось 3", len(got))
		}
		seen := make(map[int]bool, 3)
		for _, x := range got {
			if !slices.Contains(stream, x) {
				t.Fatalf("ReservoirSample вернул %d — его нет в потоке", x)
			}
			if seen[x] {
				t.Fatalf("ReservoirSample вернул дубликат %d при различных элементах потока: %v", x, got)
			}
			seen[x] = true
		}
	}
}

// TestReservoirSampleUniform — равномерность включения: каждый из 10 элементов
// должен попадать в выборку размера 3 с вероятностью 3/10, то есть ~9000 раз
// из 30000. Допуск ±8% (~9 сигм) — стабильно при фиксированном сиде, но ловит
// типичные смещения (пропуск замены первых элементов, неверная вероятность k/i).
func TestReservoirSampleUniform(t *testing.T) {
	const runs = 30000
	const n, k = 10, 3
	rng := rand.New(rand.NewSource(7))
	stream := make([]int, n)
	for i := range stream {
		stream[i] = i
	}
	counts := make([]int, n)
	for r := 0; r < runs; r++ {
		for _, x := range ReservoirSample(stream, k, rng) {
			counts[x]++
		}
	}
	const want = runs * k / n // 9000
	lo, hi := want*92/100, want*108/100
	for x, c := range counts {
		if c < lo || c > hi {
			t.Errorf("элемент %d попал в выборку %d раз, ожидалось ~%d (допуск %d..%d) — резервуар смещён?", x, c, want, lo, hi)
		}
	}
}

func TestExpectedCollisions(t *testing.T) {
	cases := []struct {
		n, m int
		want float64
	}{
		{0, 10, 0},
		{1, 5, 0},
		{2, 1, 1},
		{2, 2, 0.5},
		{10, 5, 9},
		{23, 365, 253.0 / 365.0},
		{1000, 1000000, 0.4995},
	}
	for _, c := range cases {
		if got := ExpectedCollisions(c.n, c.m); math.Abs(got-c.want) > 1e-9 {
			t.Errorf("ExpectedCollisions(%d, %d) = %v, want %v", c.n, c.m, got, c.want)
		}
	}
}

func TestBirthdayThreshold(t *testing.T) {
	cases := []struct{ m, want int }{
		{1, 2},
		{2, 3},
		{3, 3},
		{365, 28},
		{1000000, 1415},
		{1 << 32, 92683}, // 32-битный хеш: первая коллизия ожидаема на ~93 тыс.
	}
	for _, c := range cases {
		if got := BirthdayThreshold(c.m); got != c.want {
			t.Errorf("BirthdayThreshold(%d) = %d, want %d", c.m, got, c.want)
		}
	}
	// согласованность с ExpectedCollisions: n — минимальное с E >= 1
	for _, m := range []int{1, 2, 3, 10, 365, 12345} {
		n := BirthdayThreshold(m)
		if ExpectedCollisions(n, m) < 1 {
			t.Errorf("BirthdayThreshold(%d) = %d, но ExpectedCollisions = %v < 1", m, n, ExpectedCollisions(n, m))
		}
		if n > 2 && ExpectedCollisions(n-1, m) >= 1 {
			t.Errorf("BirthdayThreshold(%d) = %d не минимален: ExpectedCollisions(%d) = %v >= 1", m, n, n-1, ExpectedCollisions(n-1, m))
		}
	}
}
