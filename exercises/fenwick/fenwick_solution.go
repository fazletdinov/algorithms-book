//go:build solution

package fenwick

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
