//go:build solution

package binheap

type Heap struct {
	data []int
}

func NewHeap() *Heap { return &Heap{} }

func (h *Heap) Len() int { return len(h.data) }

func (h *Heap) Peek() (int, bool) {
	if len(h.data) == 0 {
		return 0, false
	}
	return h.data[0], true
}

func (h *Heap) Push(val int) {
	h.data = append(h.data, val)
	h.siftUp(len(h.data) - 1)
}

func (h *Heap) Pop() (int, bool) {
	n := len(h.data)
	if n == 0 {
		return 0, false
	}
	top := h.data[0]
	h.data[0] = h.data[n-1]
	h.data = h.data[:n-1]
	if len(h.data) > 0 {
		h.siftDown(0)
	}
	return top, true
}

// siftUp поднимает элемент i, пока он меньше своего родителя.
func (h *Heap) siftUp(i int) {
	for i > 0 {
		p := (i - 1) / 2
		if h.data[p] <= h.data[i] {
			break
		}
		h.data[p], h.data[i] = h.data[i], h.data[p]
		i = p
	}
}

// siftDown опускает элемент i, меняя его с меньшим из детей, пока нарушено
// свойство кучи.
func (h *Heap) siftDown(i int) {
	n := len(h.data)
	for {
		smallest := i
		l, r := 2*i+1, 2*i+2
		if l < n && h.data[l] < h.data[smallest] {
			smallest = l
		}
		if r < n && h.data[r] < h.data[smallest] {
			smallest = r
		}
		if smallest == i {
			break
		}
		h.data[i], h.data[smallest] = h.data[smallest], h.data[i]
		i = smallest
	}
}
