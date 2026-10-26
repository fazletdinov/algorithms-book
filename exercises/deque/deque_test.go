package deque

import "testing"

func TestDequeBasic(t *testing.T) {
	d := NewDeque()
	if d.Len() != 0 {
		t.Fatalf("пустой дек: Len() = %d, ожидалось 0", d.Len())
	}
	if _, ok := d.PopFront(); ok {
		t.Errorf("PopFront пустого дека вернул ok=true")
	}
	if _, ok := d.Back(); ok {
		t.Errorf("Back пустого дека вернул ok=true")
	}

	// [10] -> [10,20] -> [5,10,20]
	d.PushBack(10)
	d.PushBack(20)
	d.PushFront(5)
	if d.Len() != 3 {
		t.Fatalf("Len() = %d, ожидалось 3", d.Len())
	}
	if v, ok := d.Front(); !ok || v != 5 {
		t.Errorf("Front() = (%d,%v), ожидалось (5,true)", v, ok)
	}
	if v, ok := d.Back(); !ok || v != 20 {
		t.Errorf("Back() = (%d,%v), ожидалось (20,true)", v, ok)
	}

	// снимаем с обоих концов: 5, 20, 10
	if v, ok := d.PopFront(); !ok || v != 5 {
		t.Errorf("PopFront() = (%d,%v), ожидалось (5,true)", v, ok)
	}
	if v, ok := d.PopBack(); !ok || v != 20 {
		t.Errorf("PopBack() = (%d,%v), ожидалось (20,true)", v, ok)
	}
	if v, ok := d.PopBack(); !ok || v != 10 {
		t.Errorf("PopBack() = (%d,%v), ожидалось (10,true)", v, ok)
	}
	if d.Len() != 0 {
		t.Errorf("после опустошения Len() = %d, ожидалось 0", d.Len())
	}
}

// Рост кольцевого буфера и обёртка индексов через границу: чередуем концы,
// чтобы голова уехала и случились и обёртка, и удвоение ёмкости.
func TestDequeGrowAndWrap(t *testing.T) {
	d := NewDeque()
	for i := range 50 {
		if i%2 == 0 {
			d.PushBack(i) // последний чётный — 48
		} else {
			d.PushFront(i) // последний нечётный — 49
		}
	}
	if d.Len() != 50 {
		t.Fatalf("Len() = %d, ожидалось 50", d.Len())
	}
	if v, ok := d.Back(); !ok || v != 48 {
		t.Errorf("Back() = (%d,%v), ожидалось (48,true)", v, ok)
	}
	if v, ok := d.Front(); !ok || v != 49 {
		t.Errorf("Front() = (%d,%v), ожидалось (49,true)", v, ok)
	}
}

// Нулевое значение — рабочий дек, как bytes.Buffer или sync.Mutex: без NewDeque
// первая вставка не должна делить на нулевую ёмкость.
func TestDequeZeroValue(t *testing.T) {
	var d Deque
	if _, ok := d.PopFront(); ok {
		t.Fatal("PopFront на пустом нулевом деке вернул ok = true")
	}
	d.PushFront(2)
	d.PushBack(3)
	d.PushFront(1)
	for want := 1; want <= 3; want++ {
		if got, ok := d.PopFront(); !ok || got != want {
			t.Fatalf("PopFront() = %d, %v, ожидалось %d, true", got, ok, want)
		}
	}
}
