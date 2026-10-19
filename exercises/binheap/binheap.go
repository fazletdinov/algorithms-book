//go:build !solution

// Package binheap — бинарная min-куча на срезе.
// Теория структуры — в книге: ../../src/heap-structure.md
//
//	go test ./binheap/                 # твои решения
//	go test -tags solution ./binheap/  # эталон
//
// Реализуй Push/Pop/Peek/Len. Куча хранится в срезе: для узла i родитель —
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
	// TODO: верни &Heap{} (пустого среза достаточно).
	panic("TODO: реализуй NewHeap")
}

// Push добавляет значение, сохраняя свойство кучи. Ожидаемо O(log n).
//
// Ограничения: до 5·10⁵ элементов.
func (h *Heap) Push(val int) {
	// TODO: допиши в конец data и «всплывай» с последнего индекса: пока
	// элемент меньше родителя (i-1)/2 — меняй их местами.
	panic("TODO: реализуй Push")
}

// Pop удаляет и возвращает минимум; ok=false, если куча пуста. O(log n).
func (h *Heap) Pop() (int, bool) {
	// TODO: запомни корень data[0], переставь в корень последний элемент,
	// укороти срез и «погружай» корень: меняй с меньшим из детей, пока
	// он больше ребёнка.
	panic("TODO: реализуй Pop")
}

// Peek возвращает минимум без удаления; ok=false, если куча пуста. O(1).
func (h *Heap) Peek() (int, bool) {
	panic("TODO: реализуй Peek")
}

// Len возвращает число элементов.
func (h *Heap) Len() int {
	panic("TODO: реализуй Len")
}

// BuildHeap строит кучу из готового среза за O(n) (heapify снизу вверх).
// Исходный срез не изменяется.
func BuildHeap(data []int) *Heap {
	// TODO: скопируй data в новую кучу и просей вниз (siftDown) каждый узел
	// от последнего внутреннего (len/2-1) к корню. Это O(n), а не O(n log n)
	// от n поэлементных Push: нижняя половина — листья, их сеять не нужно.
	panic("TODO: реализуй BuildHeap")
}
