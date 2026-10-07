package listcrud

import (
	"math/rand"
	"reflect"
	"testing"
)

// modelInsertAt — вставка в срез по семантике InsertAt: pos за концом = в хвост.
func modelInsertAt(s []int, val, pos int) []int {
	if pos > len(s) {
		pos = len(s)
	}
	out := make([]int, 0, len(s)+1)
	out = append(out, s[:pos]...)
	out = append(out, val)
	out = append(out, s[pos:]...)
	return out
}

// modelSearch — индекс первого вхождения или -1.
func modelSearch(s []int, target int) int {
	for i, v := range s {
		if v == target {
			return i
		}
	}
	return -1
}

// modelDeleteVal — удаление ПЕРВОГО вхождения (остальные остаются).
func modelDeleteVal(s []int, target int) []int {
	out := make([]int, 0, len(s))
	deleted := false
	for _, v := range s {
		if !deleted && v == target {
			deleted = true
			continue
		}
		out = append(out, v)
	}
	return out
}

// TestListCRUDRandom: случайные последовательности InsertAt/Search/DeleteVal
// против модели-среза. Значения из пула 0..4 — дубликаты постоянны, поэтому
// «удалить только первое вхождение» и «найти первый индекс» проверяются на
// каждом шаге; pos берётся с запасом за длину (ветка «в хвост»), список
// регулярно пустеет (операции над пустым списком и nil-головой). После каждой
// операции список сверяется с моделью целиком. Сид фиксирован.
func TestListCRUDRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(2615))
	for run := 0; run < 50; run++ {
		var head *ListNode
		model := []int{}
		for step := 0; step < 400; step++ {
			val := rng.Intn(5) // маленький пул значений — дубликаты часты
			switch rng.Intn(3) {
			case 0:
				pos := rng.Intn(len(model) + 3) // включая позиции за концом
				head = InsertAt(head, val, pos)
				model = modelInsertAt(model, val, pos)
			case 1:
				if got, want := Search(head, val), modelSearch(model, val); got != want {
					t.Fatalf("run %d step %d: Search(%v, %d) = %d, модель = %d",
						run, step, model, val, got, want)
				}
			case 2:
				head = DeleteVal(head, val)
				model = modelDeleteVal(model, val)
			}
			if got := toSlice(head); !reflect.DeepEqual(got, model) {
				t.Fatalf("run %d step %d: список = %v, модель = %v", run, step, got, model)
			}
		}
	}
}
