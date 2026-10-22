//go:build !solution

// Package deque — двусторонняя очередь (дек) на кольцевом буфере.
// Теория структуры — в книге: ../../src/deque-structure.md
//
//	go test ./deque/                 # твои решения
//	go test -tags solution ./deque/  # эталон
//
// Реализуй PushFront/PushBack/PopFront/PopBack/Front/Back/Len. Все операции —
// амортизированно O(1): держи данные в кольцевом буфере (срез + индекс головы
// + размер), при заполнении удваивай ёмкость и перекладывай элементы.
package deque

// Deque — кольцевой буфер: data — хранилище, head — индекс первого элемента,
// size — число элементов. Хвост вычисляется как (head+size) mod cap.
//
// Ограничения: до 2·10⁶ операций, до 10⁶ элементов в деке одновременно.
type Deque struct {
	data []int
	head int
	size int
}

// NewDeque создаёт пустой дек.
func NewDeque() *Deque {
	// TODO: верни дек с небольшим непустым буфером, например make([]int, 4).
	panic("TODO: реализуй NewDeque")
}

// PushBack добавляет элемент в конец. Амортизированно O(1).
func (d *Deque) PushBack(x int) {
	// TODO: если буфер полон — grow(); затем data[(head+size) mod cap] = x; size++.
	panic("TODO: реализуй PushBack")
}

// PushFront добавляет элемент в начало. Амортизированно O(1).
func (d *Deque) PushFront(x int) {
	// TODO: если полон — grow(); сдвинь head на 1 назад по кольцу; data[head]=x; size++.
	panic("TODO: реализуй PushFront")
}

// PopFront удаляет и возвращает первый элемент; ok=false, если дек пуст.
func (d *Deque) PopFront() (int, bool) {
	// TODO: возьми data[head], сдвинь head вперёд по кольцу, size--.
	panic("TODO: реализуй PopFront")
}

// PopBack удаляет и возвращает последний элемент; ok=false, если дек пуст.
func (d *Deque) PopBack() (int, bool) {
	// TODO: возьми data[(head+size-1) mod cap], size--.
	panic("TODO: реализуй PopBack")
}

// Front возвращает первый элемент без удаления; ok=false, если дек пуст.
func (d *Deque) Front() (int, bool) {
	panic("TODO: реализуй Front")
}

// Back возвращает последний элемент без удаления; ok=false, если дек пуст.
func (d *Deque) Back() (int, bool) {
	panic("TODO: реализуй Back")
}

// Len возвращает число элементов.
func (d *Deque) Len() int {
	panic("TODO: реализуй Len")
}
