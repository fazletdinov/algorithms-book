package astar

import (
	"math/rand"
	"testing"
)

func randGrid(rng *rand.Rand, rows, cols int) [][]int {
	g := make([][]int, rows)
	for r := range g {
		g[r] = make([]int, cols)
		for c := range g[r] {
			if rng.Intn(100) < 30 {
				g[r][c] = 1 // ~30% стен
			}
		}
	}
	return g
}

func absTest(x int) int {
	if x < 0 {
		return -x
	}
	return x
}

// bruteShortest — кратчайший путь в шагах (рёбрах) 4-связно от (0,0) до правого
// нижнего угла обычным BFS; -1, если недостижимо. Независимо от A*-эталона.
func bruteShortest(grid [][]int) int {
	rows := len(grid)
	if rows == 0 {
		return -1
	}
	cols := len(grid[0])
	gr, gc := rows-1, cols-1
	if grid[0][0] == 1 || grid[gr][gc] == 1 {
		return -1
	}
	dist := make([][]int, rows)
	for r := range dist {
		dist[r] = make([]int, cols)
		for c := range dist[r] {
			dist[r][c] = -1
		}
	}
	dist[0][0] = 0
	q := [][2]int{{0, 0}}
	for len(q) > 0 {
		cur := q[0]
		q = q[1:]
		for _, d := range [][2]int{{-1, 0}, {1, 0}, {0, -1}, {0, 1}} {
			nr, nc := cur[0]+d[0], cur[1]+d[1]
			if nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] == 0 && dist[nr][nc] == -1 {
				dist[nr][nc] = dist[cur[0]][cur[1]] + 1
				q = append(q, [2]int{nr, nc})
			}
		}
	}
	return dist[gr][gc]
}

func TestShortestPathRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(2001))
	for range 5000 {
		g := randGrid(rng, rng.Intn(5)+1, rng.Intn(5)+1)
		if got, want := ShortestPath(g), bruteShortest(g); got != want {
			t.Fatalf("ShortestPath(%v) = %d, want %d", g, got, want)
		}
	}
}

func TestPathExistsRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(2002))
	for range 5000 {
		g := randGrid(rng, rng.Intn(5)+1, rng.Intn(5)+1)
		want := bruteShortest(g) != -1
		if got := PathExists(g); got != want {
			t.Fatalf("PathExists(%v) = %v, want %v", g, got, want)
		}
	}
}

func TestManhattanDistanceRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(2003))
	for range 5000 {
		r1, c1 := rng.Intn(50)-25, rng.Intn(50)-25
		r2, c2 := rng.Intn(50)-25, rng.Intn(50)-25
		want := absTest(r1-r2) + absTest(c1-c2)
		if got := ManhattanDistance(r1, c1, r2, c2); got != want {
			t.Fatalf("ManhattanDistance(%d,%d,%d,%d) = %d, want %d", r1, c1, r2, c2, got, want)
		}
	}
}
