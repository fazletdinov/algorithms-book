//go:build !solution

// Package deque — двусторонняя очередь (дек) на кольцевом буфере.
// Теория структуры — в книге: ../../src/deque-structure.md
//
//	go test ./deque/                 # ваши решения
//	go test -tags solution ./deque/  # эталон
//
// Реализуйте PushFront/PushBack/PopFront/PopBack/Front/Back/Len. Все операции —
// амортизированно O(1): держите данные в кольцевом буфере (срез + индекс головы
// + размер), при заполнении удваивайте ёмкость и перекладывайте элементы.
package deque

// Deque — кольцевой буфер: data — хранилище, head — индекс первого элемента,
// size — число элементов. Хвост вычисляется как (head+size) mod cap.
type Deque struct {
	data []int
	head int
	size int
}

// NewDeque создаёт пустой дек.
func NewDeque() *Deque {
	// TODO: верните дек с небольшим непустым буфером, например make([]int, 4).
	panic("TODO: реализуйте NewDeque")
}

// PushBack добавляет элемент в конец. Амортизированно O(1).
func (d *Deque) PushBack(x int) {
	// TODO: если буфер полон — grow(); затем data[(head+size) mod cap] = x; size++.
	panic("TODO: реализуйте PushBack")
}

// PushFront добавляет элемент в начало. Амортизированно O(1).
func (d *Deque) PushFront(x int) {
	// TODO: если полон — grow(); сдвиньте head на 1 назад по кольцу; data[head]=x; size++.
	panic("TODO: реализуйте PushFront")
}

// PopFront удаляет и возвращает первый элемент; ok=false, если дек пуст.
func (d *Deque) PopFront() (int, bool) {
	// TODO: возьмите data[head], сдвиньте head вперёд по кольцу, size--.
	panic("TODO: реализуйте PopFront")
}

// PopBack удаляет и возвращает последний элемент; ok=false, если дек пуст.
func (d *Deque) PopBack() (int, bool) {
	// TODO: возьмите data[(head+size-1) mod cap], size--.
	panic("TODO: реализуйте PopBack")
}

// Front возвращает первый элемент без удаления; ok=false, если дек пуст.
func (d *Deque) Front() (int, bool) {
	panic("TODO: реализуйте Front")
}

// Back возвращает последний элемент без удаления; ok=false, если дек пуст.
func (d *Deque) Back() (int, bool) {
	panic("TODO: реализуйте Back")
}

// Len возвращает число элементов.
func (d *Deque) Len() int {
	panic("TODO: реализуйте Len")
}
