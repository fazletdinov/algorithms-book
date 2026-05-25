//go:build solution

package segtree

type SegmentTree struct {
	n    int
	tree []int
}

func NewSegmentTree(arr []int) *SegmentTree {
	n := len(arr)
	st := &SegmentTree{n: n, tree: make([]int, 2*n)}
	for i := 0; i < n; i++ {
		st.tree[n+i] = arr[i]
	}
	for i := n - 1; i > 0; i-- {
		st.tree[i] = st.tree[2*i] + st.tree[2*i+1]
	}
	return st
}

func (st *SegmentTree) Update(i, val int) {
	i += st.n
	st.tree[i] = val
	for i > 1 {
		i /= 2
		st.tree[i] = st.tree[2*i] + st.tree[2*i+1]
	}
}

func (st *SegmentTree) Query(l, r int) int {
	res := 0
	l += st.n
	r += st.n + 1
	for l < r {
		if l&1 == 1 {
			res += st.tree[l]
			l++
		}
		if r&1 == 1 {
			r--
			res += st.tree[r]
		}
		l /= 2
		r /= 2
	}
	return res
}
