//go:build !solution

// Package binheap — бинарная min-куча на срезе.
// Теория структуры — в книге: ../../src/heap-structure.md
//
//	go test ./binheap/                 # ваши решения
//	go test -tags solution ./binheap/  # эталон
//
// Реализуйте Push/Pop/Peek/Len. Куча хранится в срезе: для узла i родитель —
// (i-1)/2, дети — 2i+1 и 2i+2. Push кладёт в конец и «всплывает» (siftUp);
// Pop меняет корень с последним, укорачивает срез и «погружает» новый корень
// (siftDown). Это min-куча: на вершине минимум.
package binheap

// Heap — бинарная min-куча: data[(i-1)/2] <= data[i] для всех i.
type Heap struct {
	data []int
}

// NewHeap создаёт пустую кучу.
func NewHeap() *Heap {
	// TODO: верните &Heap{} (пустого среза достаточно).
	panic("TODO: реализуйте NewHeap")
}

// Push добавляет значение, сохраняя свойство кучи. Ожидаемо O(log n).
func (h *Heap) Push(val int) {
	// TODO: допишите в конец data и «всплывайте» с последнего индекса: пока
	// элемент меньше родителя (i-1)/2 — меняйте их местами.
	panic("TODO: реализуйте Push")
}

// Pop удаляет и возвращает минимум; ok=false, если куча пуста. O(log n).
func (h *Heap) Pop() (int, bool) {
	// TODO: запомните корень data[0], переставьте в корень последний элемент,
	// укоротите срез и «погружайте» корень: меняйте с меньшим из детей, пока
	// он больше ребёнка.
	panic("TODO: реализуйте Pop")
}

// Peek возвращает минимум без удаления; ok=false, если куча пуста. O(1).
func (h *Heap) Peek() (int, bool) {
	panic("TODO: реализуйте Peek")
}

// Len возвращает число элементов.
func (h *Heap) Len() int {
	panic("TODO: реализуйте Len")
}

// BuildHeap строит кучу из готового среза за O(n) (heapify снизу вверх).
// Исходный срез не изменяется.
func BuildHeap(data []int) *Heap {
	// TODO: скопируйте data в новую кучу и просейте вниз (siftDown) каждый узел
	// от последнего внутреннего (len/2-1) к корню. Это O(n), а не O(n log n)
	// от n поэлементных Push: нижняя половина — листья, их сеять не нужно.
	panic("TODO: реализуйте BuildHeap")
}
