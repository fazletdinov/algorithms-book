//go:build solution

package bigo

type MinStack struct {
	data []int
	mins []int // префиксные минимумы, mins[i] = min(data[0..i])
}

func NewMinStack() *MinStack {
	return &MinStack{}
}

func (s *MinStack) Push(val int) {
	s.data = append(s.data, val)
	if len(s.mins) == 0 || val < s.mins[len(s.mins)-1] {
		s.mins = append(s.mins, val)
	} else {
		s.mins = append(s.mins, s.mins[len(s.mins)-1])
	}
}

func (s *MinStack) Pop() {
	s.data = s.data[:len(s.data)-1]
	s.mins = s.mins[:len(s.mins)-1]
}

func (s *MinStack) Top() int {
	return s.data[len(s.data)-1]
}

func (s *MinStack) GetMin() int {
	return s.mins[len(s.mins)-1]
}

func NextGreaterElement(nums []int) []int {
	res := make([]int, len(nums))
	for i := range res {
		res[i] = -1
	}
	stack := []int{} // индексы, значения убывают
	for i, v := range nums {
		for len(stack) > 0 && nums[stack[len(stack)-1]] < v {
			res[stack[len(stack)-1]] = v
			stack = stack[:len(stack)-1]
		}
		stack = append(stack, i)
	}
	return res
}

func DailyTemperatures(temperatures []int) []int {
	res := make([]int, len(temperatures))
	stack := []int{} // индексы, температуры убывают
	for i, t := range temperatures {
		for len(stack) > 0 && temperatures[stack[len(stack)-1]] < t {
			j := stack[len(stack)-1]
			stack = stack[:len(stack)-1]
			res[j] = i - j
		}
		stack = append(stack, i)
	}
	return res
}

func CountCopies(n int) int {
	if n <= 0 {
		return 0
	}
	copies, length, capacity := 0, 0, 1
	for i := 0; i < n; i++ {
		if length == capacity {
			copies += length // копируем все элементы в новый массив
			capacity *= 2
		}
		length++
	}
	return copies
}

type MyQueue struct {
	in, out []int // in принимает, out отдаёт: вершина out — первый в очереди
}

func NewMyQueue() *MyQueue {
	return &MyQueue{}
}

func (q *MyQueue) Push(x int) {
	q.in = append(q.in, x)
}

// refill переливает in в out, только когда out пуст: каждый элемент переливается
// один раз за всю жизнь, отсюда амортизированное O(1).
func (q *MyQueue) refill() {
	if len(q.out) > 0 {
		return
	}
	for len(q.in) > 0 {
		last := len(q.in) - 1
		q.out = append(q.out, q.in[last])
		q.in = q.in[:last]
	}
}

func (q *MyQueue) Pop() int {
	q.refill()
	last := len(q.out) - 1
	x := q.out[last]
	q.out = q.out[:last]
	return x
}

func (q *MyQueue) Peek() int {
	q.refill()
	return q.out[len(q.out)-1]
}

func (q *MyQueue) Empty() bool {
	return len(q.in) == 0 && len(q.out) == 0
}
