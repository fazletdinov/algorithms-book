package grids

import (
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
)

// snake — змейка из единиц на сетке rows×cols (rows нечётно): чётные строки
// целиком 1, в нечётной строке одна клетка-перемычка — справа, затем слева,
// затем снова справа. Получается один путь длиной ~rows·cols/2 без коротких
// дорог: волна обхода в ширину идёт по нему клетка за клеткой, а пересчёт
// «пока что-то меняется» проходит всю сетку на каждом шаге волны.
func snake(rows, cols int) (grid [][]int, cells int) {
	grid = make([][]int, rows)
	for r := range grid {
		grid[r] = make([]int, cols)
		switch {
		case r%2 == 0:
			for c := range grid[r] {
				grid[r][c] = 1
			}
			cells += cols
		case (r/2)%2 == 0:
			grid[r][cols-1] = 1
			cells++
		default:
			grid[r][0] = 1
			cells++
		}
	}
	return grid, cells
}

const snakeRows, snakeCols = 299, 300

// TestNumIslandsScales — сложность, а не ответ. Один остров-змейка на 299×300.
// Обход из каждой непосещённой клетки — O(rows·cols). Разметка «каждой клетке —
// наименьшая метка соседей, пока метки меняются» — O((rows·cols)²): метка ползёт
// по змейке против хода цикла на клетку за проход.
func TestNumIslandsScales(t *testing.T) {
	grid, _ := snake(snakeRows, snakeCols)
	var got int
	scaletest.Within(t, scaletest.Limit,
		"NumIslands(змейка 299×300) — похоже на O((rows·cols)²): повторные проходы по сетке до стабилизации"+
			" (замер: эталон ~3 мс, проходы до стабилизации меток ~8 с)",
		func() { got = NumIslands(grid) })
	if got != 1 {
		t.Fatalf("NumIslands(змейка) = %d, ожидалось 1", got)
	}
}

// TestRottingOrangesScales — сложность, а не ответ. Змейка свежих апельсинов
// на 299×300, гнилой — в углу (0,0): гниль ползёт по змейке 45148 минут.
// Обход в ширину из гнилых — O(rows·cols). Поминутная симуляция из главы
// (каждую минуту копия и проход всей сетки) — O((rows·cols)²).
func TestRottingOrangesScales(t *testing.T) {
	grid, cells := snake(snakeRows, snakeCols)
	grid[0][0] = 2
	var got int
	scaletest.Within(t, scaletest.Limit,
		"RottingOranges(змейка 299×300, гнилой в углу) — похоже на поминутную симуляцию O((rows·cols)²)"+
			" вместо обхода в ширину из всех гнилых (замер: эталон ~1 мс, симуляция из главы ~15 с)",
		func() { got = RottingOranges(grid) })
	if want := cells - 1; got != want {
		t.Fatalf("RottingOranges(змейка) = %d, ожидалось %d", got, want)
	}
}

// bfsLen — длина кратчайшего пути в клетках по 8 направлениям: независимая
// модель для сверки ответа на змейке.
func bfsLen(free [][]bool) int {
	rows, cols := len(free), len(free[0])
	dist := make([][]int, rows)
	for r := range dist {
		dist[r] = make([]int, cols)
	}
	dist[0][0] = 1
	q := [][2]int{{0, 0}}
	for len(q) > 0 {
		cur := q[0]
		q = q[1:]
		for dr := -1; dr <= 1; dr++ {
			for dc := -1; dc <= 1; dc++ {
				nr, nc := cur[0]+dr, cur[1]+dc
				if nr < 0 || nr >= rows || nc < 0 || nc >= cols || !free[nr][nc] || dist[nr][nc] != 0 {
					continue
				}
				dist[nr][nc] = dist[cur[0]][cur[1]] + 1
				q = append(q, [2]int{nr, nc})
			}
		}
	}
	if dist[rows-1][cols-1] == 0 {
		return -1
	}
	return dist[rows-1][cols-1]
}

// TestShortestPathInBinaryMatrixScales — сложность, а не ответ. Свободные
// клетки — змейка на 299×300 (0 — свободно, поэтому единицы и нули змейки
// переставлены), путь из угла в угол — ~45000 клеток. Обход в ширину —
// O(rows·cols). Пересчёт расстояний проходами по сетке, пока они меняются
// (как Беллман — Форд), — O((rows·cols)²).
func TestShortestPathInBinaryMatrixScales(t *testing.T) {
	s, _ := snake(snakeRows, snakeCols)
	grid := make([][]int, snakeRows)
	free := make([][]bool, snakeRows)
	for r := range s {
		grid[r] = make([]int, snakeCols)
		free[r] = make([]bool, snakeCols)
		for c, v := range s[r] {
			grid[r][c] = 1 - v
			free[r][c] = v == 1
		}
	}
	want := bfsLen(free)
	var got int
	scaletest.Within(t, scaletest.Limit,
		"ShortestPathInBinaryMatrix(змейка 299×300) — похоже на O((rows·cols)²): пересчёт расстояний"+
			" проходами по сетке вместо обхода в ширину (замер: эталон ~2 мс, проходы до стабилизации ~14 с)",
		func() { got = ShortestPathInBinaryMatrix(grid) })
	if got != want {
		t.Fatalf("ShortestPathInBinaryMatrix(змейка) = %d, ожидалось %d", got, want)
	}
}
