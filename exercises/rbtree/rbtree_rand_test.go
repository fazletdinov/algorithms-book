package rbtree

import (
	"math/rand"
	"sort"
	"testing"
)

// TestRBRandom: случайные перемешанные Insert/Delete/Search против модели
// (map ключей) с проверкой ВСЕХ инвариантов КЧ-дерева (checkRB: чёрный корень,
// нет красный-красный, равная чёрная высота, порядок BST) после каждой операции.
// Маленький пул ключей 0..29 заставляет постоянно срабатывать дубликаты при
// вставке и удаление отсутствующих; такие последовательности прогоняют все
// случаи fixup (красный/чёрный дядя, 4 случая «двойного чёрного»), которые
// фиксированные сценарии из rbtree_test.go покрывают лишь частично.
// Сид фиксирован → падение воспроизводимо.
func TestRBRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(20260728))
	for run := 0; run < 60; run++ {
		tr := NewRBTree()
		ref := map[int]bool{}
		for step := 0; step < 300; step++ {
			key := rng.Intn(30) // маленький пул — дубликаты и повторные удаления часты
			switch rng.Intn(3) {
			case 0, 1: // вставка чаще удаления — дерево успевает подрасти
				tr.Insert(key)
				ref[key] = true
			case 2:
				tr.Delete(key)
				delete(ref, key)
			}
			checkRB(t, tr)
			if got, want := tr.Search(key), ref[key]; got != want {
				t.Fatalf("run %d step %d: Search(%d) = %v, модель = %v", run, step, key, got, want)
			}
			if got, want := tr.InOrder(), sortedKeysRB(ref); !equalIntsRB(got, want) {
				t.Fatalf("run %d step %d: InOrder() = %v, модель = %v", run, step, got, want)
			}
		}
	}
}

// TestRBRandomShrinkToEmpty: дерево наполняется и полностью опустошается в
// случайном порядке — ловит порчу стража nilNode (его parent/цвет) при
// deleteFixup у корня и «хвосты» после удаления последнего узла.
func TestRBRandomShrinkToEmpty(t *testing.T) {
	rng := rand.New(rand.NewSource(31338))
	for run := 0; run < 40; run++ {
		tr := NewRBTree()
		n := 1 + rng.Intn(40)
		keys := rng.Perm(200)[:n]
		for _, k := range keys {
			tr.Insert(k)
			checkRB(t, tr)
		}
		order := rng.Perm(n)
		for _, i := range order {
			tr.Delete(keys[i])
			checkRB(t, tr)
			if tr.Search(keys[i]) {
				t.Fatalf("run %d: Search(%d) = true после Delete", run, keys[i])
			}
		}
		if got := tr.InOrder(); len(got) != 0 {
			t.Fatalf("run %d: после удаления всех ключей InOrder() = %v", run, got)
		}
	}
}

func sortedKeysRB(m map[int]bool) []int {
	out := make([]int, 0, len(m))
	for k := range m {
		out = append(out, k)
	}
	sort.Ints(out)
	return out
}

func equalIntsRB(a, b []int) bool {
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
