package matrix

import (
	"math/rand"
	"reflect"
	"testing"
)

// Модели ниже — прямые, «как в условии»: отдельный массив посещённых, вторая
// матрица, полный перебор. Они медленнее или тратят память, зато очевидно верны.

func randMatrix(rng *rand.Rand, rows, cols, maxV int) [][]int {
	m := make([][]int, rows)
	for r := range m {
		m[r] = make([]int, cols)
		for c := range m[r] {
			m[r][c] = rng.Intn(maxV)
		}
	}
	return m
}

func spiralModel(m [][]int) []int {
	rows, cols := len(m), len(m[0])
	seen := make([][]bool, rows)
	for i := range seen {
		seen[i] = make([]bool, cols)
	}
	dr, dc := [4]int{0, 1, 0, -1}, [4]int{1, 0, -1, 0}
	var res []int
	r, c, d := 0, 0, 0
	for range rows * cols {
		res = append(res, m[r][c])
		seen[r][c] = true
		nr, nc := r+dr[d], c+dc[d]
		if nr < 0 || nr >= rows || nc < 0 || nc >= cols || seen[nr][nc] {
			d = (d + 1) % 4
			nr, nc = r+dr[d], c+dc[d]
		}
		r, c = nr, nc
	}
	return res
}

func rotateModel(m [][]int) [][]int {
	n := len(m)
	out := make([][]int, n)
	for i := range out {
		out[i] = make([]int, n)
		for j := range out[i] {
			out[i][j] = m[n-1-j][i]
		}
	}
	return out
}

func setZeroesModel(m [][]int) [][]int {
	out := clone(m)
	for r := range m {
		for c := range m[r] {
			if m[r][c] != 0 {
				continue
			}
			for k := range out[r] {
				out[r][k] = 0
			}
			for k := range out {
				out[k][c] = 0
			}
		}
	}
	return out
}

func lifeModel(b [][]int) [][]int {
	out := clone(b)
	for r := range b {
		for c := range b[r] {
			n := 0
			for dr := -1; dr <= 1; dr++ {
				for dc := -1; dc <= 1; dc++ {
					nr, nc := r+dr, c+dc
					if (dr != 0 || dc != 0) && nr >= 0 && nr < len(b) && nc >= 0 && nc < len(b[r]) {
						n += b[nr][nc]
					}
				}
			}
			switch {
			case b[r][c] == 1 && (n < 2 || n > 3):
				out[r][c] = 0
			case b[r][c] == 0 && n == 3:
				out[r][c] = 1
			}
		}
	}
	return out
}

func contains(m [][]int, target int) bool {
	for _, row := range m {
		for _, v := range row {
			if v == target {
				return true
			}
		}
	}
	return false
}

func TestSpiralOrderRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(54))
	for range 500 {
		m := randMatrix(rng, 1+rng.Intn(7), 1+rng.Intn(7), 100)
		want := spiralModel(m)
		if got := SpiralOrder(m); !reflect.DeepEqual(got, want) {
			t.Fatalf("SpiralOrder(%v) = %v, ожидалось %v", m, got, want)
		}
	}
}

func TestRotateRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(48))
	for range 300 {
		n := 1 + rng.Intn(7)
		m := randMatrix(rng, n, n, 100)
		want := rotateModel(m)
		got := clone(m)
		Rotate(got)
		if !reflect.DeepEqual(got, want) {
			t.Fatalf("Rotate(%v): получилось %v, ожидалось %v", m, got, want)
		}
	}
}

func TestSetZeroesRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(73))
	for range 1000 {
		// Значения 0…4: нули встречаются часто, в том числе в первой строке и столбце.
		m := randMatrix(rng, 1+rng.Intn(6), 1+rng.Intn(6), 5)
		want := setZeroesModel(m)
		got := clone(m)
		SetZeroes(got)
		if !reflect.DeepEqual(got, want) {
			t.Fatalf("SetZeroes(%v): получилось %v, ожидалось %v", m, got, want)
		}
	}
}

func TestGameOfLifeRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(289))
	for range 500 {
		b := randMatrix(rng, 1+rng.Intn(7), 1+rng.Intn(7), 2)
		want := lifeModel(b)
		got := clone(b)
		GameOfLife(got)
		if !reflect.DeepEqual(got, want) {
			t.Fatalf("GameOfLife(%v): получилось %v, ожидалось %v", b, got, want)
		}
	}
}

// sortedRowMajor — строки подряд образуют возрастающий ряд с шагами 1…3.
func sortedRowMajor(rng *rand.Rand, rows, cols int) [][]int {
	m := make([][]int, rows)
	v := rng.Intn(5) - 2
	for r := range m {
		m[r] = make([]int, cols)
		for c := range m[r] {
			v += 1 + rng.Intn(3)
			m[r][c] = v
		}
	}
	return m
}

// sortedRowsCols — m[r][c] = max(сверху, слева) + случайный шаг 0…2: строки и
// столбцы не убывают, а конец строки часто больше начала следующей.
func sortedRowsCols(rng *rand.Rand, rows, cols int) [][]int {
	m := make([][]int, rows)
	for r := range m {
		m[r] = make([]int, cols)
		for c := range m[r] {
			base := 0
			if r > 0 {
				base = m[r-1][c]
			}
			if c > 0 && m[r][c-1] > base {
				base = m[r][c-1]
			}
			m[r][c] = base + rng.Intn(3)
		}
	}
	return m
}

func TestSearchMatrixRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(74))
	for range 300 {
		m := sortedRowMajor(rng, 1+rng.Intn(6), 1+rng.Intn(6))
		last := m[len(m)-1][len(m[0])-1]
		for target := m[0][0] - 2; target <= last+2; target++ {
			if got, want := SearchMatrix(m, target), contains(m, target); got != want {
				t.Fatalf("SearchMatrix(%v, %d) = %v, ожидалось %v", m, target, got, want)
			}
		}
	}
}

func TestSearchMatrixIIRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(240))
	for range 300 {
		m := sortedRowsCols(rng, 1+rng.Intn(6), 1+rng.Intn(6))
		last := m[len(m)-1][len(m[0])-1]
		for target := m[0][0] - 2; target <= last+2; target++ {
			if got, want := SearchMatrixII(m, target), contains(m, target); got != want {
				t.Fatalf("SearchMatrixII(%v, %d) = %v, ожидалось %v", m, target, got, want)
			}
		}
	}
}
