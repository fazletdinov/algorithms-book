//go:build solution

package matrix

func SpiralOrder(matrix [][]int) []int {
	if len(matrix) == 0 || len(matrix[0]) == 0 {
		return []int{}
	}
	top, bottom := 0, len(matrix)-1
	left, right := 0, len(matrix[0])-1
	res := make([]int, 0, len(matrix)*len(matrix[0]))
	for top <= bottom && left <= right {
		for c := left; c <= right; c++ {
			res = append(res, matrix[top][c])
		}
		top++
		for r := top; r <= bottom; r++ {
			res = append(res, matrix[r][right])
		}
		right--
		// Остался один ряд или один столбец — обратный проход прошёл бы его второй раз.
		if top > bottom || left > right {
			break
		}
		for c := right; c >= left; c-- {
			res = append(res, matrix[bottom][c])
		}
		bottom--
		for r := bottom; r >= top; r-- {
			res = append(res, matrix[r][left])
		}
		left++
	}
	return res
}

func Rotate(matrix [][]int) {
	n := len(matrix)
	// Транспонирование: (i, j) ↔ (j, i).
	for i := 0; i < n; i++ {
		for j := i + 1; j < n; j++ {
			matrix[i][j], matrix[j][i] = matrix[j][i], matrix[i][j]
		}
	}
	// Отражение каждой строки слева направо.
	for i := 0; i < n; i++ {
		row := matrix[i]
		for l, r := 0, n-1; l < r; l, r = l+1, r-1 {
			row[l], row[r] = row[r], row[l]
		}
	}
}

func SetZeroes(matrix [][]int) {
	rows := len(matrix)
	if rows == 0 {
		return
	}
	cols := len(matrix[0])
	// Первая строка и первый столбец служат отметками для остальных; их
	// собственные нули запоминаем заранее, иначе отметки их бы затёрли.
	firstRowZero, firstColZero := false, false
	for c := 0; c < cols; c++ {
		if matrix[0][c] == 0 {
			firstRowZero = true
		}
	}
	for r := 0; r < rows; r++ {
		if matrix[r][0] == 0 {
			firstColZero = true
		}
	}
	for r := 1; r < rows; r++ {
		for c := 1; c < cols; c++ {
			if matrix[r][c] == 0 {
				matrix[r][0] = 0
				matrix[0][c] = 0
			}
		}
	}
	for r := 1; r < rows; r++ {
		for c := 1; c < cols; c++ {
			if matrix[r][0] == 0 || matrix[0][c] == 0 {
				matrix[r][c] = 0
			}
		}
	}
	if firstRowZero {
		for c := 0; c < cols; c++ {
			matrix[0][c] = 0
		}
	}
	if firstColZero {
		for r := 0; r < rows; r++ {
			matrix[r][0] = 0
		}
	}
}

func GameOfLife(board [][]int) {
	rows := len(board)
	if rows == 0 {
		return
	}
	cols := len(board[0])
	// Бит 0 — старое состояние, бит 1 — новое: соседи читают только бит 0.
	for r := 0; r < rows; r++ {
		for c := 0; c < cols; c++ {
			alive := 0
			for dr := -1; dr <= 1; dr++ {
				for dc := -1; dc <= 1; dc++ {
					nr, nc := r+dr, c+dc
					if (dr != 0 || dc != 0) && nr >= 0 && nr < rows && nc >= 0 && nc < cols {
						alive += board[nr][nc] & 1
					}
				}
			}
			if alive == 3 || (alive == 2 && board[r][c]&1 == 1) {
				board[r][c] |= 2
			}
		}
	}
	for r := 0; r < rows; r++ {
		for c := 0; c < cols; c++ {
			board[r][c] >>= 1
		}
	}
}

func SearchMatrix(matrix [][]int, target int) bool {
	if len(matrix) == 0 || len(matrix[0]) == 0 {
		return false
	}
	cols := len(matrix[0])
	lo, hi := 0, len(matrix)*cols-1
	for lo <= hi {
		mid := lo + (hi-lo)/2
		v := matrix[mid/cols][mid%cols]
		switch {
		case v == target:
			return true
		case v < target:
			lo = mid + 1
		default:
			hi = mid - 1
		}
	}
	return false
}

func SearchMatrixII(matrix [][]int, target int) bool {
	if len(matrix) == 0 {
		return false
	}
	r, c := 0, len(matrix[0])-1
	for r < len(matrix) && c >= 0 {
		v := matrix[r][c]
		switch {
		case v == target:
			return true
		case v > target:
			c-- // весь столбец c ниже ещё больше
		default:
			r++ // вся строка r левее ещё меньше
		}
	}
	return false
}
