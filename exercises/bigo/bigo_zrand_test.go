package bigo

import (
	"math/rand"
	"slices"
	"testing"
)

// Дифференциальные тесты против наивных O(n²) эталонов. Сид фиксирован →
// падение воспроизводимо.

func bruteNextGreater(nums []int) []int {
	res := make([]int, len(nums))
	for i := range nums {
		res[i] = -1
		for j := i + 1; j < len(nums); j++ {
			if nums[j] > nums[i] {
				res[i] = nums[j]
				break
			}
		}
	}
	return res
}

func bruteDailyTemps(t []int) []int {
	res := make([]int, len(t))
	for i := range t {
		for j := i + 1; j < len(t); j++ {
			if t[j] > t[i] {
				res[i] = j - i
				break
			}
		}
	}
	return res
}

func TestNextGreaterElementRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(1))
	for range 2000 {
		n := rng.Intn(40)
		nums := make([]int, n)
		for i := range nums {
			nums[i] = rng.Intn(15) - 7 // дубликаты и отрицательные
		}
		if got, want := NextGreaterElement(nums), bruteNextGreater(nums); !slices.Equal(got, want) {
			t.Fatalf("NextGreaterElement(%v) = %v, want %v", nums, got, want)
		}
	}
}

func TestDailyTemperaturesRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(2))
	for range 2000 {
		n := rng.Intn(40)
		temps := make([]int, n)
		for i := range temps {
			temps[i] = rng.Intn(10)
		}
		if got, want := DailyTemperatures(temps), bruteDailyTemps(temps); !slices.Equal(got, want) {
			t.Fatalf("DailyTemperatures(%v) = %v, want %v", temps, got, want)
		}
	}
}

// CountCopies: суммарные копии при n добавлениях ВСЕГДА < 2n — это и есть
// амортизированная стоимость append = O(1).
func TestCountCopiesAmortized(t *testing.T) {
	for n := 0; n <= 100000; n += 137 {
		if c := CountCopies(n); c >= 2*n && n > 0 {
			t.Fatalf("CountCopies(%d) = %d, амортизация нарушена (ожидалось < 2n = %d)", n, c, 2*n)
		}
	}
}

// MinStack против наивной модели (минимум перебором по всему стеку).
func TestMinStackRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(3))
	s := NewMinStack()
	var model []int
	for range 5000 {
		if len(model) == 0 || rng.Intn(3) != 0 {
			v := rng.Intn(100) - 50
			s.Push(v)
			model = append(model, v)
			if s.Top() != model[len(model)-1] {
				t.Fatalf("Top = %d, model = %d", s.Top(), model[len(model)-1])
			}
		} else {
			s.Pop()
			model = model[:len(model)-1]
		}
		if len(model) > 0 {
			if s.GetMin() != slices.Min(model) {
				t.Fatalf("GetMin = %d, want %d (stack %v)", s.GetMin(), slices.Min(model), model)
			}
		}
	}
}

// MyQueue против модели — среза, с которого снимают первый элемент.
func TestMyQueueRandom(t *testing.T) {
	rng := rand.New(rand.NewSource(232))
	q := NewMyQueue()
	var model []int
	for range 5000 {
		switch op := rng.Intn(4); {
		case len(model) == 0 || op <= 1:
			v := rng.Intn(100) - 50
			q.Push(v)
			model = append(model, v)
		case op == 2:
			if got := q.Pop(); got != model[0] {
				t.Fatalf("Pop = %d, ожидалось %d (очередь %v)", got, model[0], model)
			}
			model = model[1:]
		default:
			if got := q.Peek(); got != model[0] {
				t.Fatalf("Peek = %d, ожидалось %d (очередь %v)", got, model[0], model)
			}
		}
		if got := q.Empty(); got != (len(model) == 0) {
			t.Fatalf("Empty = %v, ожидалось %v (очередь %v)", got, len(model) == 0, model)
		}
	}
}
