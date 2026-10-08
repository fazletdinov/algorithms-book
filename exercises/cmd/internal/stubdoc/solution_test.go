package stubdoc

import (
	"errors"
	"strings"
	"testing"
)

const fakeSolution = `//go:build solution

package p

import "sort"

const limit = 10

var errBad = errors.New("bad")

// Sum — сумма с проверкой.
func Sum(xs []int) int {
	total := 0
	for _, x := range xs {
		total = add(total, x)
	}
	return total
}

func add(a, b int) int { return a + b + offset(limit) }

func offset(n int) int { return n * 0 }

func Other() int { return unrelated() }

func unrelated() int { return 42 }

type node struct{ next *node }

// Stack — стек.
type Stack struct {
	items []int
	head  *node
}

func NewStack() *Stack { return &Stack{} }

func (s *Stack) Push(v int) {
	s.items = append(s.items, v)
	s.grow()
}

func (s *Stack) Pop() int { return s.items[0] }

func (s *Stack) grow() { sort.Ints(s.items) }

func (n *node) unusedMethod() {}

func Fails() error { return errBad }
`

func TestSolution(t *testing.T) {
	tests := []struct {
		name    string
		want    []string // подстроки, которые обязаны быть
		notWant []string // и которых быть не должно
	}{
		{
			name:    "Sum",
			want:    []string{"func Sum(", "func add(", "func offset(", "const limit = 10", "// Sum — сумма с проверкой."},
			notWant: []string{"Other", "unrelated", "//go:build", "package p", "import", "Stack"},
		},
		{
			name:    "Other",
			want:    []string{"func Other()", "func unrelated()"},
			notWant: []string{"func Sum", "func add"},
		},
		{
			// Метод не читается без типа: поля и вложенный тип приходят с ним; чужие
			// методы — нет.
			name:    "Stack.Push",
			want:    []string{"func (s *Stack) Push(", "type Stack struct", "items []int", "type node struct", "func (s *Stack) grow()", "// Stack — стек.", "func (n *node) unusedMethod()"},
			notWant: []string{"Pop", "NewStack", "func Sum"},
		},
		{
			name:    "NewStack",
			want:    []string{"func NewStack()", "type Stack struct", "type node struct"},
			notWant: []string{"Push", "Pop"},
		},
		{
			name:    "Fails",
			want:    []string{"func Fails()", `var errBad = errors.New("bad")`},
			notWant: []string{"Sum"},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Solution([]byte(fakeSolution), tt.name)
			if err != nil {
				t.Fatal(err)
			}
			for _, w := range tt.want {
				if !strings.Contains(got, w) {
					t.Errorf("в эталоне нет %q:\n%s", w, got)
				}
			}
			for _, w := range tt.notWant {
				if strings.Contains(got, w) {
					t.Errorf("в эталоне лишнее %q:\n%s", w, got)
				}
			}
		})
	}
}

const heapSolution = `//go:build solution

package p

import "container/heap"

type minHeap []int

func (h minHeap) Len() int           { return len(h) }
func (h minHeap) Less(i, j int) bool { return h[i] < h[j] }
func (h minHeap) Swap(i, j int)      { h[i], h[j] = h[j], h[i] }
func (h *minHeap) Push(x any)        { *h = append(*h, x.(int)) }
func (h *minHeap) Pop() any {
	old := *h
	x := old[len(old)-1]
	*h = old[:len(old)-1]
	return x
}

func Smallest(xs []int) int {
	h := minHeap(xs)
	heap.Init(&h)
	return h[0]
}

type Box struct{ items []int }

func (b *Box) Add(v int) { b.items = append(b.items, v) }

func (b *Box) Total() int { return sum(b.items) }

func sum(xs []int) int { return len(xs) }

func Other() int { return 1 }
`

// Куча без Less не компилируется и прячет, какая это куча: неэкспортированный тип
// приходит со всеми методами. Методы экспортированного типа — нет: у каждого своя кнопка.
func TestSolutionBringsAllMethodsOfUnexportedType(t *testing.T) {
	got, err := Solution([]byte(heapSolution), "Smallest")
	if err != nil {
		t.Fatal(err)
	}
	for _, want := range []string{"type minHeap []int", ") Len() int", ") Less(i, j int) bool", ") Swap(", ") Push(x any)", ") Pop() any", "func Smallest("} {
		if !strings.Contains(got, want) {
			t.Errorf("в эталоне нет %q:\n%s", want, got)
		}
	}
	if strings.Contains(got, "Box") || strings.Contains(got, "Other") {
		t.Errorf("чужое попало в эталон:\n%s", got)
	}

	box, err := Solution([]byte(heapSolution), "Box.Add")
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(box, "Total") || strings.Contains(box, "sum") {
		t.Errorf("метод экспортированного типа Box.Total — другое упражнение, а не часть Box.Add:\n%s", box)
	}
}

func TestSolutionRootMayBeUnexported(t *testing.T) {
	got, err := Solution([]byte(heapSolution), "sum")
	if err != nil || !strings.Contains(got, "func sum(") {
		t.Fatalf("Solution(sum) = %q, %v", got, err)
	}
	if got, err := Solution([]byte(heapSolution), "minHeap.Less"); err != nil || !strings.Contains(got, "type minHeap") {
		t.Errorf("Solution(minHeap.Less) = %q, %v", got, err)
	}
}

func TestSolutionKeepsFileOrder(t *testing.T) {
	got, err := Solution([]byte(fakeSolution), "Sum")
	if err != nil {
		t.Fatal(err)
	}
	last := -1
	for _, w := range []string{"const limit", "func Sum(", "func add(", "func offset("} {
		i := strings.Index(got, w)
		if i < last {
			t.Fatalf("%q стоит раньше предыдущего: порядок не как в файле:\n%s", w, got)
		}
		last = i
	}
}

func TestSolutionUnknownName(t *testing.T) {
	for _, name := range []string{"Nope", "Stack.Nope", "Nope.Push", "Stack", "limit", "node.next", ""} {
		_, err := Solution([]byte(fakeSolution), name)
		if !errors.Is(err, ErrNotFound) {
			t.Errorf("Solution(%q): ожидалась ErrNotFound, получено %v", name, err)
		}
	}
}

func TestSolutionBrokenSourceIsNotNotFound(t *testing.T) {
	_, err := Solution([]byte("package p\nfunc ("), "Sum")
	if err == nil || errors.Is(err, ErrNotFound) {
		t.Fatalf("сломанный исходник — не «функции нет»: %v", err)
	}
}

func TestSolutionTerminatesOnMutualRecursion(t *testing.T) {
	const src = "package p\n\nfunc A() { b() }\n\nfunc b() { c() }\n\nfunc c() { b() }\n"
	got, err := Solution([]byte(src), "A")
	if err != nil {
		t.Fatal(err)
	}
	if strings.Count(got, "func b()") != 1 || strings.Count(got, "func c()") != 1 {
		t.Errorf("каждая вспомогательная функция — один раз:\n%s", got)
	}
}
