//go:build solution

package deque

type Deque struct {
	data []int
	head int
	size int
}

const dequeInitCap = 4

func NewDeque() *Deque {
	return &Deque{data: make([]int, dequeInitCap)}
}

func (d *Deque) Len() int { return d.size }

// grow удваивает ёмкость, перекладывая элементы в начало нового буфера
// (после этого head == 0, обёртки нет). У нулевого Deque буфера нет вовсе —
// тогда заводим начальный.
func (d *Deque) grow() {
	bigger := make([]int, max(len(d.data)*2, dequeInitCap))
	for i := range d.size {
		bigger[i] = d.data[(d.head+i)%len(d.data)]
	}
	d.data = bigger
	d.head = 0
}

func (d *Deque) PushBack(x int) {
	if d.size == len(d.data) {
		d.grow()
	}
	tail := (d.head + d.size) % len(d.data)
	d.data[tail] = x
	d.size++
}

func (d *Deque) PushFront(x int) {
	if d.size == len(d.data) {
		d.grow()
	}
	d.head = (d.head - 1 + len(d.data)) % len(d.data)
	d.data[d.head] = x
	d.size++
}

func (d *Deque) PopFront() (int, bool) {
	if d.size == 0 {
		return 0, false
	}
	x := d.data[d.head]
	d.head = (d.head + 1) % len(d.data)
	d.size--
	return x, true
}

func (d *Deque) PopBack() (int, bool) {
	if d.size == 0 {
		return 0, false
	}
	x := d.data[(d.head+d.size-1)%len(d.data)]
	d.size--
	return x, true
}

func (d *Deque) Front() (int, bool) {
	if d.size == 0 {
		return 0, false
	}
	return d.data[d.head], true
}

func (d *Deque) Back() (int, bool) {
	if d.size == 0 {
		return 0, false
	}
	return d.data[(d.head+d.size-1)%len(d.data)], true
}
