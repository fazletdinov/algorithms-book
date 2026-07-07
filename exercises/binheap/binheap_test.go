package binheap

import "testing"

func TestBuildHeap(t *testing.T) {
	src := []int{9, 4, 7, 1, 8, 3, 6, 2, 5, 0}
	h := BuildHeap(src)
	if h.Len() != len(src) {
		t.Fatalf("BuildHeap Len() = %d, ожидалось %d", h.Len(), len(src))
	}
	if min, ok := h.Peek(); !ok || min != 0 {
		t.Errorf("вершина = %d (ok=%v), ожидался минимум 0", min, ok)
	}
	// извлечение по одному должно давать возрастающий порядок — значит куча валидна
	prev := -1 << 30
	for range src {
		v, ok := h.Pop()
		if !ok {
			t.Fatal("Pop вернул ok=false раньше времени")
		}
		if v < prev {
			t.Fatalf("Pop дал %d после %d — куча построена неверно", v, prev)
		}
		prev = v
	}
	// исходный срез не должен измениться
	want := []int{9, 4, 7, 1, 8, 3, 6, 2, 5, 0}
	for i := range src {
		if src[i] != want[i] {
			t.Fatalf("BuildHeap изменил исходный срез: %v", src)
		}
	}
	if h := BuildHeap(nil); h.Len() != 0 {
		t.Errorf("BuildHeap(nil) Len() = %d, ожидалось 0", h.Len())
	}
}

func TestHeapBasic(t *testing.T) {
	h := NewHeap()
	if h.Len() != 0 {
		t.Fatalf("пустая куча Len() = %d, ожидалось 0", h.Len())
	}
	if _, ok := h.Pop(); ok {
		t.Errorf("Pop пустой кучи вернул ok=true")
	}
	if _, ok := h.Peek(); ok {
		t.Errorf("Peek пустой кучи вернул ok=true")
	}

	for _, v := range []int{5, 3, 8, 1, 9, 2} {
		h.Push(v)
	}
	if v, ok := h.Peek(); !ok || v != 1 {
		t.Errorf("Peek() = (%d,%v), ожидалось (1,true)", v, ok)
	}
	if h.Len() != 6 {
		t.Errorf("Len() = %d, ожидалось 6", h.Len())
	}

	// извлечение даёт элементы по возрастанию
	want := []int{1, 2, 3, 5, 8, 9}
	for _, w := range want {
		v, ok := h.Pop()
		if !ok || v != w {
			t.Fatalf("Pop() = (%d,%v), ожидалось (%d,true)", v, ok, w)
		}
	}
	if h.Len() != 0 {
		t.Errorf("после извлечения Len() = %d, ожидалось 0", h.Len())
	}
}

// Дубликаты не теряются.
func TestHeapDuplicates(t *testing.T) {
	h := NewHeap()
	for _, v := range []int{4, 4, 1, 4, 1} {
		h.Push(v)
	}
	got := []int{}
	for h.Len() > 0 {
		v, _ := h.Pop()
		got = append(got, v)
	}
	want := []int{1, 1, 4, 4, 4}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("с дубликатами got=%v, ожидалось %v", got, want)
		}
	}
}
