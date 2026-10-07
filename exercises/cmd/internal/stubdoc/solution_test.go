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
			want:    []string{"func (s *Stack) Push(", "type Stack struct", "items []int", "type node struct", "func (s *Stack) grow()", "// Stack — стек."},
			notWant: []string{"Pop", "NewStack", "unusedMethod", "func Sum"},
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
	for _, name := range []string{"Nope", "Stack.Nope", "Nope.Push", "add", "Stack", "limit", ""} {
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
