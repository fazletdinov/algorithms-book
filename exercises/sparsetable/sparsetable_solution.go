//go:build solution

package sparsetable

type Sparse struct {
	table [][]int
	log   []int
}

func NewSparse(arr []int) *Sparse {
	n := len(arr)
	logs := make([]int, n+1)
	for i := 2; i <= n; i++ {
		logs[i] = logs[i/2] + 1
	}
	maxK := 0
	if n > 0 {
		maxK = logs[n] + 1
	}
	table := make([][]int, maxK)
	if maxK > 0 {
		table[0] = make([]int, n)
		copy(table[0], arr)
	}
	for k := 1; k < maxK; k++ {
		width := 1 << k
		table[k] = make([]int, n-width+1)
		half := 1 << (k - 1)
		for i := 0; i+width <= n; i++ {
			a, b := table[k-1][i], table[k-1][i+half]
			if a < b {
				table[k][i] = a
			} else {
				table[k][i] = b
			}
		}
	}
	return &Sparse{table: table, log: logs}
}

func (s *Sparse) Query(l, r int) int {
	k := s.log[r-l+1]
	a := s.table[k][l]
	b := s.table[k][r-(1<<k)+1]
	if a < b {
		return a
	}
	return b
}
