package segtree

import (
	"math/rand"
	"testing"

	"github.com/fazletdinov/algorithms-book/exercises/internal/scaletest"
)

// Вход тестов масштаба: n = 5·10⁵, изменения и запросы вперемешку, каждый
// запрос — широкий отрезок (от первой десятой массива до последней), так что
// перебор отрезка стоит ~0.8·n. Дерево — O(log n) на вызов, массив с суммой
// (минимумом) в цикле по отрезку — O(n) на запрос. Сумма в цикле — самый
// быстрый перебор, какой бывает (~0.15 нс на элемент), поэтому n — 5·10⁵, а не
// 2·10⁵: на 2·10⁵ и 10⁵ запросах перебор шёл 2.25 с, на грани срока.
const scaleN = 500000

type scaleOp struct{ i, v, l, r int }

func scaleInput(seed int64, maxV, scaleOps int) ([]int, []scaleOp) {
	r := rand.New(rand.NewSource(seed))
	arr := make([]int, scaleN)
	for i := range arr {
		arr[i] = r.Intn(2*maxV+1) - maxV
	}
	ops := make([]scaleOp, scaleOps)
	for k := range ops {
		ops[k] = scaleOp{
			i: r.Intn(scaleN),
			v: r.Intn(2*maxV+1) - maxV,
			l: r.Intn(scaleN / 10),
			r: scaleN - 1 - r.Intn(scaleN/10),
		}
	}
	return arr, ops
}

// TestSegmentTreeScales — сложность, а не ответ (сумма, точечное обновление).
func TestSegmentTreeScales(t *testing.T) {
	arr, ops := scaleInput(1, 1000000000, 100000)
	model := append([]int(nil), arr...)
	var st *SegmentTree
	scaletest.Within(t, scaletest.Limit,
		"SegmentTree: n=5·10⁵, 10⁵ Update и 10⁵ Query широких отрезков вперемешку —"+
			" похоже на O(n) на Query (сумма в цикле) там, где нужен O(log n)"+
			" (замер: эталон ~22 мс, сумма в цикле ~5.5 с)",
		func() {
			st = NewSegmentTree(arr)
			for _, op := range ops {
				st.Update(op.i, op.v)
				model[op.i] = op.v
				st.Query(op.l, op.r)
			}
		})
	for _, q := range [][2]int{{0, scaleN - 1}, {0, 0}, {123, scaleN - 124}, {scaleN - 1, scaleN - 1}} {
		want := 0
		for i := q[0]; i <= q[1]; i++ {
			want += model[i]
		}
		if g := st.Query(q[0], q[1]); g != want {
			t.Fatalf("Query(%d, %d) = %d после изменений, ожидалось %d", q[0], q[1], g, want)
		}
	}
}

// TestMinSegmentTreeScales — сложность, а не ответ (минимум, точечное обновление).
func TestMinSegmentTreeScales(t *testing.T) {
	arr, ops := scaleInput(2, 1000000000, 100000)
	model := append([]int(nil), arr...)
	var st *MinSegmentTree
	scaletest.Within(t, scaletest.Limit,
		"MinSegmentTree: n=5·10⁵, 10⁵ Update и 10⁵ Query широких отрезков вперемешку —"+
			" похоже на O(n) на Query (минимум в цикле) там, где нужен O(log n)"+
			" (замер: эталон ~22 мс, минимум в цикле ~5.7 с)",
		func() {
			st = NewMinSegmentTree(arr)
			for _, op := range ops {
				st.Update(op.i, op.v)
				model[op.i] = op.v
				st.Query(op.l, op.r)
			}
		})
	for _, q := range [][2]int{{0, scaleN - 1}, {0, 0}, {123, scaleN - 124}, {scaleN - 1, scaleN - 1}} {
		want := model[q[0]]
		for i := q[0]; i <= q[1]; i++ {
			want = min(want, model[i])
		}
		if g := st.Query(q[0], q[1]); g != want {
			t.Fatalf("Query(%d, %d) = %d после изменений, ожидалось %d", q[0], q[1], g, want)
		}
	}
}

// TestLazySegmentTreeScales — сложность, а не ответ. 4·10⁴ прибавок и 4·10⁴ сумм
// на широких отрезках вперемешку. Отложенные прибавки — O(log n) на вызов;
// прибавка поэлементно в цикле по отрезку — O(n) на RangeUpdate, и сумма в
// цикле — O(n) на RangeQuery.
func TestLazySegmentTreeScales(t *testing.T) {
	arr, ops := scaleInput(3, 10000, 40000)
	diff := make([]int, scaleN+1) // модель: разностный массив прибавок
	var lt *LazySegmentTree
	scaletest.Within(t, scaletest.Limit,
		"LazySegmentTree: n=5·10⁵, 4·10⁴ RangeUpdate и 4·10⁴ RangeQuery широких отрезков вперемешку —"+
			" похоже на O(n) на вызов там, где нужен O(log n)"+
			" (замер: эталон ~42 мс, прибавка поэлементно и сумма в цикле ~7 с)",
		func() {
			lt = NewLazySegmentTree(arr)
			for _, op := range ops {
				lt.RangeUpdate(op.l, op.r, op.v)
				diff[op.l] += op.v
				diff[op.r+1] -= op.v
				lt.RangeQuery(op.l, op.r)
			}
		})
	model := append([]int(nil), arr...)
	run := 0
	for i := range model {
		run += diff[i]
		model[i] += run
	}
	for _, q := range [][2]int{{0, scaleN - 1}, {0, 0}, {123, scaleN - 124}, {scaleN - 1, scaleN - 1}} {
		want := 0
		for i := q[0]; i <= q[1]; i++ {
			want += model[i]
		}
		if g := lt.RangeQuery(q[0], q[1]); g != want {
			t.Fatalf("RangeQuery(%d, %d) = %d после прибавок, ожидалось %d", q[0], q[1], g, want)
		}
	}
}
