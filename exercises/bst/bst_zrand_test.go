package bst

import (
	"math/rand"
	"sort"
	"strconv"
	"testing"
)

// Эталон — множество map[int]bool с сортировкой ключей. После каждой операции
// InOrder() должен совпадать с отсортированными ключами эталона, а Search — с
// принадлежностью множеству (другой способ хранения, чем дерево).
func TestBSTRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(2024))
	for range 300 {
		tr := NewBST()
		ref := map[int]bool{}
		for range 200 {
			key := rng.Intn(30)
			switch rng.Intn(4) {
			case 0, 1:
				tr.Insert(key)
				ref[key] = true
			case 2:
				_, want := ref[key]
				if got := tr.Delete(key); got != want {
					t.Fatalf("Delete(%d) = %v, want %v", key, got, want)
				}
				delete(ref, key)
			case 3:
				if got, want := tr.Search(key), ref[key]; got != want {
					t.Fatalf("Search(%d) = %v, want %v", key, got, want)
				}
			}
			if got, want := tr.InOrder(), sortedKeys(ref); !equalInts(got, want) {
				t.Fatalf("InOrder() = %v, want %v", got, want)
			}
		}
	}
}

func sortedKeys(m map[int]bool) []int {
	out := make([]int, 0, len(m))
	for k := range m {
		out = append(out, k)
	}
	sort.Ints(out)
	return out
}

func equalInts(a, b []int) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}

// randomTree — дерево случайной формы со случайными значениями из [0, vals):
// чаще всего неправильное, иногда правильное. Порча одного значения в
// правильном дереве даёт трудные случаи — нарушена граница дальнего предка.
func randomTree(rng *rand.Rand, size, vals int) *Node {
	if size == 0 {
		return nil
	}
	left := rng.Intn(size)
	return nd(rng.Intn(vals), randomTree(rng, left, vals), randomTree(rng, size-1-left, vals))
}

// allNodes — узлы поддерева в любом порядке.
func allNodes(n *Node, out []*Node) []*Node {
	if n == nil {
		return out
	}
	out = append(out, n)
	out = allNodes(n.Left, out)
	return allNodes(n.Right, out)
}

// validByDefinition — инвариант дословно: у каждого узла КАЖДЫЙ узел левого
// поддерева меньше, КАЖДЫЙ узел правого — больше. O(n²), зато без границ.
func validByDefinition(root *Node) bool {
	for _, n := range allNodes(root, nil) {
		for _, l := range allNodes(n.Left, nil) {
			if l.Val >= n.Val {
				return false
			}
		}
		for _, r := range allNodes(n.Right, nil) {
			if r.Val <= n.Val {
				return false
			}
		}
	}
	return true
}

func TestIsValidBSTRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(7))
	valid := 0
	for range 3000 {
		var root *Node
		if rng.Intn(2) == 0 {
			root = randomTree(rng, rng.Intn(8), 10)
		} else {
			// правильное дерево, у которого, может быть, испорчено одно значение
			perm := rng.Perm(20)
			root = buildBST(perm[:1+rng.Intn(12)]...)
			if rng.Intn(3) > 0 {
				nodes := allNodes(root, nil)
				nodes[rng.Intn(len(nodes))].Val = rng.Intn(20)
			}
		}
		want := validByDefinition(root)
		if want {
			valid++
		}
		if got := IsValidBST(root); got != want {
			t.Fatalf("IsValidBST(%s) = %v, по определению %v", treeString(root), got, want)
		}
	}
	if valid < 300 || valid > 2700 {
		t.Fatalf("генератор перекошен: правильных деревьев %d из 3000", valid)
	}
}

func TestKthSmallestRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(11))
	for range 1000 {
		vals := rng.Perm(40)[:1+rng.Intn(25)]
		root := buildBST(vals...)
		sorted := append([]int(nil), vals...)
		sort.Ints(sorted)
		k := 1 + rng.Intn(len(sorted))
		if got := KthSmallest(root, k); got != sorted[k-1] {
			t.Fatalf("KthSmallest(%s, %d) = %d, ожидалось %d", treeString(root), k, got, sorted[k-1])
		}
	}
}

// pathTo — значения на пути от корня до v (v в дереве есть).
func pathTo(root *Node, v int) []int {
	var path []int
	for n := root; n != nil; {
		path = append(path, n.Val)
		if v == n.Val {
			break
		}
		if v < n.Val {
			n = n.Left
		} else {
			n = n.Right
		}
	}
	return path
}

// Модель: последний общий узел путей от корня к p и к q.
func TestLowestCommonAncestorRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(13))
	for range 2000 {
		vals := rng.Perm(40)[:1+rng.Intn(25)]
		root := buildBST(vals...)
		p, q := vals[rng.Intn(len(vals))], vals[rng.Intn(len(vals))]
		pp, pq := pathTo(root, p), pathTo(root, q)
		want := pp[0]
		for i := 0; i < len(pp) && i < len(pq) && pp[i] == pq[i]; i++ {
			want = pp[i]
		}
		if got := LowestCommonAncestor(root, p, q); got != want {
			t.Fatalf("LowestCommonAncestor(%s, %d, %d) = %d, ожидалось %d", treeString(root), p, q, got, want)
		}
	}
}

// treeString — запись «узел(левый, правый)», _ — нет ребёнка.
func treeString(n *Node) string {
	if n == nil {
		return "_"
	}
	if n.Left == nil && n.Right == nil {
		return strconv.Itoa(n.Val)
	}
	return strconv.Itoa(n.Val) + "(" + treeString(n.Left) + "," + treeString(n.Right) + ")"
}
