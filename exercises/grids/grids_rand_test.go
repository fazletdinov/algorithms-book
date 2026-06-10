package grids

import (
	"math/rand"
	"testing"
)

func randGrid(rng *rand.Rand, rows, cols, maxVal int) [][]int {
	g := make([][]int, rows)
	for r := range g {
		g[r] = make([]int, cols)
		for c := range g[r] {
			g[r][c] = rng.Intn(maxVal + 1)
		}
	}
	return g
}

func cloneGrid(g [][]int) [][]int {
	out := make([][]int, len(g))
	for r := range g {
		out[r] = append([]int{}, g[r]...)
	}
	return out
}

func equalGrids(a, b [][]int) bool {
	if len(a) != len(b) {
		return false
	}
	for r := range a {
		if len(a[r]) != len(b[r]) {
			return false
		}
		for c := range a[r] {
			if a[r][c] != b[r][c] {
				return false
			}
		}
	}
	return true
}

// dsu — союз-найди для брутфорса островов.
type dsu struct{ p []int }

func newDSU(n int) *dsu {
	p := make([]int, n)
	for i := range p {
		p[i] = i
	}
	return &dsu{p}
}
func (d *dsu) find(x int) int {
	for d.p[x] != x {
		d.p[x] = d.p[d.p[x]]
		x = d.p[x]
	}
	return x
}
func (d *dsu) union(a, b int) { d.p[d.find(a)] = d.find(b) }

// bruteIslandSizes — размеры компонент суши (4-связность) через union-find.
func bruteIslandSizes(grid [][]int) map[int]int {
	rows := len(grid)
	if rows == 0 {
		return nil
	}
	cols := len(grid[0])
	d := newDSU(rows * cols)
	id := func(r, c int) int { return r*cols + c }
	for r := 0; r < rows; r++ {
		for c := 0; c < cols; c++ {
			if grid[r][c] != 1 {
				continue
			}
			if r+1 < rows && grid[r+1][c] == 1 {
				d.union(id(r, c), id(r+1, c))
			}
			if c+1 < cols && grid[r][c+1] == 1 {
				d.union(id(r, c), id(r, c+1))
			}
		}
	}
	sizes := map[int]int{}
	for r := 0; r < rows; r++ {
		for c := 0; c < cols; c++ {
			if grid[r][c] == 1 {
				sizes[d.find(id(r, c))]++
			}
		}
	}
	return sizes
}

func TestNumIslandsRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(1401))
	for range 3000 {
		rows, cols := rng.Intn(5)+1, rng.Intn(5)+1
		grid := randGrid(rng, rows, cols, 1)
		want := len(bruteIslandSizes(grid))
		if got := NumIslands(cloneGrid(grid)); got != want {
			t.Fatalf("NumIslands(%v) = %d, want %d", grid, got, want)
		}
	}
}

func TestMaxAreaOfIslandRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(1402))
	for range 3000 {
		rows, cols := rng.Intn(5)+1, rng.Intn(5)+1
		grid := randGrid(rng, rows, cols, 1)
		want := 0
		for _, s := range bruteIslandSizes(grid) {
			if s > want {
				want = s
			}
		}
		if got := MaxAreaOfIsland(cloneGrid(grid)); got != want {
			t.Fatalf("MaxAreaOfIsland(%v) = %d, want %d", grid, got, want)
		}
	}
}

// bruteFlood — независимый BFS-заливка 4-связной области одного цвета.
func bruteFlood(image [][]int, sr, sc, newColor int) [][]int {
	out := cloneGrid(image)
	rows, cols := len(out), len(out[0])
	old := out[sr][sc]
	if old == newColor {
		return out
	}
	type cell struct{ r, c int }
	q := []cell{{sr, sc}}
	out[sr][sc] = newColor
	for len(q) > 0 {
		cur := q[0]
		q = q[1:]
		for _, d := range [][2]int{{-1, 0}, {1, 0}, {0, -1}, {0, 1}} {
			nr, nc := cur.r+d[0], cur.c+d[1]
			if nr >= 0 && nr < rows && nc >= 0 && nc < cols && out[nr][nc] == old {
				out[nr][nc] = newColor
				q = append(q, cell{nr, nc})
			}
		}
	}
	return out
}

func TestFloodFillRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(1403))
	for range 3000 {
		rows, cols := rng.Intn(5)+1, rng.Intn(5)+1
		grid := randGrid(rng, rows, cols, 3)
		sr, sc := rng.Intn(rows), rng.Intn(cols)
		nc := rng.Intn(4)
		want := bruteFlood(grid, sr, sc, nc)
		got := FloodFill(cloneGrid(grid), sr, sc, nc)
		if !equalGrids(got, want) {
			t.Fatalf("FloodFill(%v, %d, %d, %d) = %v, want %v", grid, sr, sc, nc, got, want)
		}
	}
}

// bruteRotting — многоисточниковый BFS: сколько минут до гниения всей свежести.
func bruteRotting(grid [][]int) int {
	rows, cols := len(grid), len(grid[0])
	g := cloneGrid(grid)
	type cell struct{ r, c int }
	var q []cell
	fresh := 0
	for r := 0; r < rows; r++ {
		for c := 0; c < cols; c++ {
			switch g[r][c] {
			case 2:
				q = append(q, cell{r, c})
			case 1:
				fresh++
			}
		}
	}
	if fresh == 0 {
		return 0
	}
	minutes := 0
	for len(q) > 0 && fresh > 0 {
		minutes++
		var next []cell
		for _, cur := range q {
			for _, d := range [][2]int{{-1, 0}, {1, 0}, {0, -1}, {0, 1}} {
				nr, nc := cur.r+d[0], cur.c+d[1]
				if nr >= 0 && nr < rows && nc >= 0 && nc < cols && g[nr][nc] == 1 {
					g[nr][nc] = 2
					fresh--
					next = append(next, cell{nr, nc})
				}
			}
		}
		q = next
	}
	if fresh > 0 {
		return -1
	}
	return minutes
}

func TestRottingOrangesRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(1404))
	for range 3000 {
		rows, cols := rng.Intn(5)+1, rng.Intn(5)+1
		grid := randGrid(rng, rows, cols, 2)
		want := bruteRotting(grid)
		if got := RottingOranges(cloneGrid(grid)); got != want {
			t.Fatalf("RottingOranges(%v) = %d, want %d", grid, got, want)
		}
	}
}

// bruteShortestBinary — независимый BFS 8-связности от (0,0) до правого-нижнего
// угла по клеткам со значением 0. Длина = число клеток в пути.
func bruteShortestBinary(grid [][]int) int {
	rows, cols := len(grid), len(grid[0])
	if grid[0][0] != 0 || grid[rows-1][cols-1] != 0 {
		return -1
	}
	type cell struct{ r, c int }
	dist := make([][]int, rows)
	for r := range dist {
		dist[r] = make([]int, cols)
		for c := range dist[r] {
			dist[r][c] = -1
		}
	}
	dist[0][0] = 1
	q := []cell{{0, 0}}
	for len(q) > 0 {
		cur := q[0]
		q = q[1:]
		for dr := -1; dr <= 1; dr++ {
			for dc := -1; dc <= 1; dc++ {
				if dr == 0 && dc == 0 {
					continue
				}
				nr, nc := cur.r+dr, cur.c+dc
				if nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] == 0 && dist[nr][nc] == -1 {
					dist[nr][nc] = dist[cur.r][cur.c] + 1
					q = append(q, cell{nr, nc})
				}
			}
		}
	}
	return dist[rows-1][cols-1]
}

func TestShortestPathInBinaryMatrixRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(1405))
	for range 3000 {
		rows, cols := rng.Intn(5)+1, rng.Intn(5)+1
		grid := randGrid(rng, rows, cols, 1)
		want := bruteShortestBinary(grid)
		if got := ShortestPathInBinaryMatrix(cloneGrid(grid)); got != want {
			t.Fatalf("ShortestPathInBinaryMatrix(%v) = %d, want %d", grid, got, want)
		}
	}
}
