//go:build solution

package fenwick

import "sort"

type Fenwick struct {
	n    int
	tree []int
}

func NewFenwick(arr []int) *Fenwick {
	f := &Fenwick{n: len(arr), tree: make([]int, len(arr)+1)}
	for i, v := range arr {
		f.add(i+1, v)
	}
	return f
}

func (f *Fenwick) add(i, delta int) {
	for ; i <= f.n; i += i & (-i) {
		f.tree[i] += delta
	}
}

func (f *Fenwick) Update(i, delta int) {
	f.add(i+1, delta)
}

func (f *Fenwick) prefix(i int) int {
	sum := 0
	for ; i > 0; i -= i & (-i) {
		sum += f.tree[i]
	}
	return sum
}

func (f *Fenwick) PrefixSum(i int) int {
	return f.prefix(i + 1)
}

func (f *Fenwick) RangeSum(l, r int) int {
	return f.PrefixSum(r) - f.PrefixSum(l-1)
}

// compressRanks возвращает для каждого элемента arr его 1-индексированный ранг
// в отсортированном множестве уникальных значений, а также число уникальных
// значений (размер алфавита).
func compressRanks(arr []int) (ranks []int, size int) {
	sorted := make([]int, len(arr))
	copy(sorted, arr)
	sort.Ints(sorted)
	uniq := sorted[:0]
	for i, v := range sorted {
		if i == 0 || v != sorted[i-1] {
			uniq = append(uniq, v)
		}
	}
	ranks = make([]int, len(arr))
	for i, v := range arr {
		// нижняя граница: индекс первого элемента >= v
		ranks[i] = sort.SearchInts(uniq, v) + 1
	}
	return ranks, len(uniq)
}

func CountInversions(arr []int) int {
	ranks, size := compressRanks(arr)
	bit := &Fenwick{n: size, tree: make([]int, size+1)}
	inv := 0
	// идём справа налево: для текущего элемента считаем уже встреченные строго меньшие.
	for i := len(ranks) - 1; i >= 0; i-- {
		r := ranks[i]
		inv += bit.prefix(r - 1) // число элементов с рангом < r
		bit.add(r, 1)
	}
	return inv
}

func CountSmallerToRight(arr []int) []int {
	res := make([]int, len(arr))
	ranks, size := compressRanks(arr)
	bit := &Fenwick{n: size, tree: make([]int, size+1)}
	for i := len(ranks) - 1; i >= 0; i-- {
		r := ranks[i]
		res[i] = bit.prefix(r - 1)
		bit.add(r, 1)
	}
	return res
}
