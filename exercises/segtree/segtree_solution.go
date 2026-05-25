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

type LazySegmentTree struct {
	n          int
	tree, lazy []int
}

func NewLazySegmentTree(arr []int) *LazySegmentTree {
	n := len(arr)
	t := &LazySegmentTree{n: n, tree: make([]int, 4*n), lazy: make([]int, 4*n)}
	if n > 0 {
		t.build(1, 0, n-1, arr)
	}
	return t
}

func (t *LazySegmentTree) build(node, lo, hi int, arr []int) {
	if lo == hi {
		t.tree[node] = arr[lo]
		return
	}
	mid := (lo + hi) / 2
	t.build(2*node, lo, mid, arr)
	t.build(2*node+1, mid+1, hi, arr)
	t.tree[node] = t.tree[2*node] + t.tree[2*node+1]
}

func (t *LazySegmentTree) apply(node, lo, hi, delta int) {
	t.tree[node] += (hi - lo + 1) * delta
	t.lazy[node] += delta
}

func (t *LazySegmentTree) push(node, lo, hi int) {
	if t.lazy[node] != 0 {
		mid := (lo + hi) / 2
		t.apply(2*node, lo, mid, t.lazy[node])
		t.apply(2*node+1, mid+1, hi, t.lazy[node])
		t.lazy[node] = 0
	}
}

func (t *LazySegmentTree) RangeUpdate(l, r, delta int) { t.update(1, 0, t.n-1, l, r, delta) }

func (t *LazySegmentTree) update(node, lo, hi, ql, qr, delta int) {
	if qr < lo || hi < ql {
		return
	}
	if ql <= lo && hi <= qr {
		t.apply(node, lo, hi, delta)
		return
	}
	t.push(node, lo, hi)
	mid := (lo + hi) / 2
	t.update(2*node, lo, mid, ql, qr, delta)
	t.update(2*node+1, mid+1, hi, ql, qr, delta)
	t.tree[node] = t.tree[2*node] + t.tree[2*node+1]
}

func (t *LazySegmentTree) RangeQuery(l, r int) int { return t.query(1, 0, t.n-1, l, r) }

func (t *LazySegmentTree) query(node, lo, hi, ql, qr int) int {
	if qr < lo || hi < ql {
		return 0
	}
	if ql <= lo && hi <= qr {
		return t.tree[node]
	}
	t.push(node, lo, hi)
	mid := (lo + hi) / 2
	return t.query(2*node, lo, mid, ql, qr) + t.query(2*node+1, mid+1, hi, ql, qr)
}
