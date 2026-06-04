//go:build solution

package grids

func NumIslands(grid [][]int) int {
	rows := len(grid)
	if rows == 0 {
		return 0
	}
	cols := len(grid[0])
	visited := make([][]bool, rows)
	for i := range visited {
		visited[i] = make([]bool, cols)
	}

	var dfs func(r, c int)
	dfs = func(r, c int) {
		if r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] == 0 || visited[r][c] {
			return
		}
		visited[r][c] = true
		dfs(r-1, c)
		dfs(r+1, c)
		dfs(r, c-1)
		dfs(r, c+1)
	}

	count := 0
	for r := 0; r < rows; r++ {
		for c := 0; c < cols; c++ {
			if grid[r][c] == 1 && !visited[r][c] {
				count++
				dfs(r, c)
			}
		}
	}
	return count
}

func MaxAreaOfIsland(grid [][]int) int {
	rows := len(grid)
	if rows == 0 {
		return 0
	}
	cols := len(grid[0])
	visited := make([][]bool, rows)
	for i := range visited {
		visited[i] = make([]bool, cols)
	}

	var area func(r, c int) int
	area = func(r, c int) int {
		if r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] == 0 || visited[r][c] {
			return 0
		}
		visited[r][c] = true
		return 1 + area(r-1, c) + area(r+1, c) + area(r, c-1) + area(r, c+1)
	}

	best := 0
	for r := 0; r < rows; r++ {
		for c := 0; c < cols; c++ {
			if grid[r][c] == 1 && !visited[r][c] {
				if a := area(r, c); a > best {
					best = a
				}
			}
		}
	}
	return best
}

func FloodFill(image [][]int, sr, sc, newColor int) [][]int {
	rows := len(image)
	if rows == 0 {
		return image
	}
	cols := len(image[0])
	old := image[sr][sc]
	if old == newColor {
		return image
	}

	var fill func(r, c int)
	fill = func(r, c int) {
		if r < 0 || r >= rows || c < 0 || c >= cols || image[r][c] != old {
			return
		}
		image[r][c] = newColor
		fill(r-1, c)
		fill(r+1, c)
		fill(r, c-1)
		fill(r, c+1)
	}
	fill(sr, sc)
	return image
}

func RottingOranges(grid [][]int) int {
	rows := len(grid)
	if rows == 0 {
		return 0
	}
	cols := len(grid[0])

	type cell struct{ r, c int }
	var queue []cell
	fresh := 0
	for r := 0; r < rows; r++ {
		for c := 0; c < cols; c++ {
			switch grid[r][c] {
			case 2:
				queue = append(queue, cell{r, c})
			case 1:
				fresh++
			}
		}
	}
	if fresh == 0 {
		return 0
	}

	dirs := [4][2]int{{-1, 0}, {1, 0}, {0, -1}, {0, 1}}
	minutes := 0
	for len(queue) > 0 && fresh > 0 {
		minutes++
		next := []cell{}
		for _, cur := range queue {
			for _, d := range dirs {
				nr, nc := cur.r+d[0], cur.c+d[1]
				if nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] == 1 {
					grid[nr][nc] = 2
					fresh--
					next = append(next, cell{nr, nc})
				}
			}
		}
		queue = next
	}
	if fresh > 0 {
		return -1
	}
	return minutes
}

func ShortestPathInBinaryMatrix(grid [][]int) int {
	rows := len(grid)
	if rows == 0 {
		return -1
	}
	cols := len(grid[0])
	if grid[0][0] != 0 || grid[rows-1][cols-1] != 0 {
		return -1
	}

	type cell struct{ r, c int }
	visited := make([][]bool, rows)
	for i := range visited {
		visited[i] = make([]bool, cols)
	}
	dirs := [8][2]int{
		{-1, -1}, {-1, 0}, {-1, 1},
		{0, -1}, {0, 1},
		{1, -1}, {1, 0}, {1, 1},
	}

	queue := []cell{{0, 0}}
	visited[0][0] = true
	length := 1
	for len(queue) > 0 {
		next := []cell{}
		for _, cur := range queue {
			if cur.r == rows-1 && cur.c == cols-1 {
				return length
			}
			for _, d := range dirs {
				nr, nc := cur.r+d[0], cur.c+d[1]
				if nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] == 0 && !visited[nr][nc] {
					visited[nr][nc] = true
					next = append(next, cell{nr, nc})
				}
			}
		}
		queue = next
		length++
	}
	return -1
}
