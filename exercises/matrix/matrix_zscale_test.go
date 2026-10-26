package matrix

import (
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
)

// Поиск в матрице: один запрос перебором — четыре миллиона клеток, это ещё
// быстро. Поэтому тест задаёт много запросов к одной матрице 2000×2000, как и
// обещает условие: перебор платит до rows·cols на запрос, нужный приём — log
// или rows+cols.

const (
	searchN       = 2000 // матрица searchN × searchN
	searchQueries = 4000 // запросов к ней
)

// TestSearchMatrixScales — сложность, а не ответ. m[i][j] = 2·(i·n + j), цели —
// из последней четверти значений: чётные есть в матрице, нечётные — нет.
// Перебор с досрочным выходом (строки подряд возрастают, «дальше только больше»)
// всё равно проходит ≥ 3/4 клеток на запрос.
func TestSearchMatrixScales(t *testing.T) {
	m := make([][]int, searchN)
	for i := range m {
		m[i] = make([]int, searchN)
		for j := range m[i] {
			m[i][j] = 2 * (i*searchN + j)
		}
	}
	total := 2 * searchN * searchN
	targets := make([]int, searchQueries)
	want := 0
	for q := range targets {
		targets[q] = total*3/4 + q*(total/4)/searchQueries + q%2
		if targets[q]%2 == 0 {
			want++
		}
	}
	got := 0
	scaletest.Within(t, scaletest.Limit,
		"SearchMatrix(2000×2000, 4·10³ запросов) — похоже на перебор клеток O(rows·cols) на запрос"+
			" (замер: эталон ~1 мс, перебор с досрочным выходом ~9 с)",
		func() {
			for _, x := range targets {
				if SearchMatrix(m, x) {
					got++
				}
			}
		})
	if got != want {
		t.Fatalf("SearchMatrix: найдено %d целей из %d запросов, ожидалось %d", got, searchQueries, want)
	}
}

// TestSearchMatrixIIScales — сложность, а не ответ. m[i][j] = 2·(i + j): строки
// и столбцы возрастают, а значение k встречается на всей антидиагонали. Цели —
// нечётные около середины (их нет), каждая десятая — чётная (есть). Перебор,
// который пропускает строки «вся меньше» и обрывает строку на первом большем,
// всё равно проходит треугольник ~k²/2 ≈ 2·10⁶ клеток на запрос.
func TestSearchMatrixIIScales(t *testing.T) {
	m := make([][]int, searchN)
	for i := range m {
		m[i] = make([]int, searchN)
		for j := range m[i] {
			m[i][j] = 2 * (i + j)
		}
	}
	targets := make([]int, searchQueries)
	want := 0
	for q := range targets {
		k := searchN - 400 + q%800
		targets[q] = 2*k + 1
		if q%10 == 0 {
			targets[q] = 2 * k
			want++
		}
	}
	got := 0
	scaletest.Within(t, scaletest.Limit,
		"SearchMatrixII(2000×2000, 4·10³ запросов) — похоже на перебор клеток O(rows·cols) на запрос"+
			" (замер: эталон ~30 мс, бинарный поиск в каждой строке ~0.4 с, перебор с отсечением строк ~4.5 с)",
		func() {
			for _, x := range targets {
				if SearchMatrixII(m, x) {
					got++
				}
			}
		})
	if got != want {
		t.Fatalf("SearchMatrixII: найдено %d целей из %d запросов, ожидалось %d", got, searchQueries, want)
	}
}

// Тесты ниже — не про время, а про память: условие требует «на месте», O(1)
// дополнительной памяти. Вторая матрица, массивы отметок строк и столбцов, копия
// поля — это выделения памяти; решение на месте не выделяет ничего. Матрица
// собирается ДО замера, а повторные вызовы на ней законны (поворот остаётся
// поворотом, поле «Жизни» живёт дальше; матрицу для обнуления замер сам
// восстанавливает копированием), поэтому любая аллокация в замере — аллокация
// самой функции.

const (
	allocN    = 200 // матрица allocN × allocN
	allocRuns = 20  // прогонов в testing.AllocsPerRun
)

func filled(n int, f func(r, c int) int) [][]int {
	m := make([][]int, n)
	for r := range m {
		m[r] = make([]int, n)
		for c := range m[r] {
			m[r][c] = f(r, c)
		}
	}
	return m
}

func TestRotateNoAllocs(t *testing.T) {
	m := filled(allocN, func(r, c int) int { return r*allocN + c })
	allocs := testing.AllocsPerRun(allocRuns, func() { Rotate(m) })
	// 1 разогрев + allocRuns прогонов = 21 поворот = 1 поворот по модулю 4.
	if m[0][0] != (allocN-1)*allocN || m[0][allocN-1] != 0 {
		t.Fatalf("Rotate(%d×%d) после 21 поворота: m[0][0] = %d, m[0][n-1] = %d, ожидалось %d и 0",
			allocN, allocN, m[0][0], m[0][allocN-1], (allocN-1)*allocN)
	}
	if allocs != 0 {
		t.Fatalf("Rotate(%d×%d): %.0f аллокаций за вызов, ожидалось 0 — "+
			"похоже на вторую матрицу там, где нужен поворот на месте", allocN, allocN, allocs)
	}
}

func TestSetZeroesNoAllocs(t *testing.T) {
	// Нули — на диагонали каждой седьмой клетки: обнулятся строки и столбцы 0, 7, 14, …
	// Повторный вызов на обнулённой матрице занулил бы всё, поэтому перед каждым
	// вызовом матрица восстанавливается из orig: copy в готовые строки памяти не выделяет.
	orig := filled(allocN, func(r, c int) int {
		if r == c && r%7 == 0 {
			return 0
		}
		return 1 + r + c
	})
	m := filled(allocN, func(r, c int) int { return 0 })
	allocs := testing.AllocsPerRun(allocRuns, func() {
		for r := range m {
			copy(m[r], orig[r])
		}
		SetZeroes(m)
	})
	if m[1][1] != 3 || m[1][7] != 0 || m[7][1] != 0 {
		t.Fatalf("SetZeroes(%d×%d): m[1][1] = %d, m[1][7] = %d, m[7][1] = %d, ожидалось 3, 0, 0",
			allocN, allocN, m[1][1], m[1][7], m[7][1])
	}
	if allocs != 0 {
		t.Fatalf("SetZeroes(%d×%d): %.0f аллокаций за вызов, ожидалось 0 — "+
			"похоже на отдельные отметки строк и столбцов (или копию матрицы) там, где нужна O(1) памяти",
			allocN, allocN, allocs)
	}
}

func TestGameOfLifeNoAllocs(t *testing.T) {
	// Мигалки в каждой клетке 5×5: через нечётное число шагов каждая — вертикальная.
	m := filled(allocN, func(r, c int) int {
		if r%5 == 2 && c%5 >= 1 && c%5 <= 3 {
			return 1
		}
		return 0
	})
	allocs := testing.AllocsPerRun(allocRuns, func() { GameOfLife(m) })
	// 21 шаг — нечётное число: мигалка в клетке (0..4, 0..4) стоит вертикально.
	if m[1][2] != 1 || m[2][2] != 1 || m[3][2] != 1 || m[2][1] != 0 || m[2][3] != 0 {
		t.Fatalf("GameOfLife(%d×%d мигалок) после 21 шага: мигалка не вертикальна", allocN, allocN)
	}
	if allocs != 0 {
		t.Fatalf("GameOfLife(%d×%d): %.0f аллокаций за вызов, ожидалось 0 — "+
			"похоже на копию поля там, где нужна разметка в самих клетках", allocN, allocN, allocs)
	}
}
