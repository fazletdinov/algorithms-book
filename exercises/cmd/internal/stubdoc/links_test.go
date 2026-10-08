package stubdoc

import (
	"slices"
	"testing"
)

const linksStub = `package p

type Stack struct{}

type hidden struct{}

func NewStack() *Stack {
	panic("TODO: реализуйте NewStack")
}

func (s *Stack) Push(v int) {
	panic("TODO: реализуйте Push")
}

func Sum(xs []int) int {
	panic("TODO: реализуйте Sum")
}

func SumConc(xs []int) int {
	panic("TODO: реализуйте SumConc")
}

func Push(v int) {
	panic("TODO: реализуйте Push")
}

func newHidden() *hidden {
	panic("TODO: реализуйте newHidden")
}

func Count() int {
	panic("TODO: реализуйте Count")
}

func Ready() int { return 1 }
`

const linksTests = `package p

import "testing"

func TestSum(t *testing.T) { _ = Sum(nil) }

// Сверка с последовательной версией: без Sum этот тест упадёт с panic("TODO").
func TestSumConcMatchesSum(t *testing.T) { check(t, SumConc(nil)) }

// Count здесь — метод значения, а не упражнение Count верхнего уровня.
func TestSumConcRandom(t *testing.T) {
	var st Stack
	_ = st.Count()
	_ = SumConc(nil)
}

func check(t *testing.T, got int) { oracle(got) }

func oracle(got int) int { return Sum(nil) + got }

func TestStack(t *testing.T) {
	s := NewStack()
	s.Push(1) // метод Push не должен считаться упражнением Push верхнего уровня
}

func TestStackRandom(t *testing.T) { _ = NewStack() }

func TestMain(m *testing.M) {}

func TestReady(t *testing.T) { _ = Ready() }
`

func TestLinkTests(t *testing.T) {
	dir := t.TempDir()
	writeFiles(t, dir, map[string]string{"p_test.go": linksTests})
	fs, err := Funcs([]byte(linksStub))
	if err != nil {
		t.Fatal(err)
	}
	links, err := LinkTests(dir, []byte(linksStub), nil, fs)
	if err != nil {
		t.Fatal(err)
	}
	want := map[string]Links{
		"Sum": {Tests: []string{"TestSum"}},
		// Сверка идёт через помощников check и oracle: Sum нужен, хотя в теле теста его нет.
		"SumConc": {Tests: []string{"TestSumConcMatchesSum", "TestSumConcRandom"}, Needs: []string{"Sum"}},
		// Конструктор и метод входят в группу типа и ничего не владеют сами.
		"NewStack":   {Group: "Stack", GroupTests: []string{"TestStack", "TestStackRandom"}},
		"Stack.Push": {Group: "Stack", GroupTests: []string{"TestStack", "TestStackRandom"}},
		// Push верхнего уровня — другая функция: вызов s.Push в TestStack ей не засчитывается.
		"Push":      {},
		"Count":     {},
		"newHidden": {Group: "hidden"},
	}
	for name, w := range want {
		g := links[name]
		if !slices.Equal(g.Tests, w.Tests) || !slices.Equal(g.Needs, w.Needs) || g.Group != w.Group || !slices.Equal(g.GroupTests, w.GroupTests) {
			t.Errorf("%s: %+v, ожидалось %+v", name, g, w)
		}
	}
	if _, ok := links["Ready"]; ok {
		t.Errorf("Ready — не упражнение")
	}
}

const needsStub = `package p

type Heap struct{}

type Box struct{}

func NewHeap() *Heap { panic("TODO: реализуйте NewHeap") }

func (h *Heap) Len() int { panic("TODO: реализуйте Len") }

func (h *Heap) Pop() int { panic("TODO: реализуйте Pop") }

func (b *Box) Len() int { panic("TODO: реализуйте Len") }

func GCD(a, b int) int { panic("TODO: реализуйте GCD") }

func LCM(a, b int) int { panic("TODO: реализуйте LCM") }

func Build(xs []int) *Heap { panic("TODO: реализуйте Build") }

func Wrap(b *Box) int { panic("TODO: реализуйте Wrap") }
`

const needsSolution = `//go:build solution

package p

import "sort"

type Heap struct{ n int }

type Box struct{ inner *Heap }

func NewHeap() *Heap { return &Heap{} }

func (h *Heap) Len() int { return h.n }

func (h *Heap) Pop() int { return h.Len() }

func (b *Box) Len() int { return b.inner.Len() }

func GCD(a, b int) int { return a }

func LCM(a, b int) int {
	sort.Ints(nil) // sort.Ints — пакет, а не метод Ints
	return a * b / GCD(a, b)
}

func Build(xs []int) *Heap {
	h := NewHeap()
	_ = h.Len()
	return h
}

func Wrap(b *Box) int { return b.Len() }
`

const needsTests = `package p

import "testing"

func TestLCM(t *testing.T) { _ = LCM(1, 2) }

// Build собирает кучу и зовёт её методы: Heap.Len и Heap.Pop — упражнения, но не Box.Len.
func TestBuild(t *testing.T) {
	h := Build(nil)
	_ = h.Len()
	_ = h.Pop()
}

func TestWrap(t *testing.T) {
	b := &Box{}
	_ = b.Len()
	_ = Wrap(b)
}

// Таблица реализаций уровня пакета и метод-помощник: зависимость видна только через них.
var impls = []func(int, int) int{LCM}

type rig struct{}

func (rig) check() int { return LCM(3, 4) }

func TestGCDViaTable(t *testing.T) {
	for _, f := range impls {
		_ = f(1, 2)
	}
}

func TestWrapViaRig(t *testing.T) { _ = rig{}.check() }

func TestHeapBasic(t *testing.T) {
	h := NewHeap()
	_ = h.Len()
	_ = h.Pop()
}
`

func TestLinkTestsNeeds(t *testing.T) {
	dir := t.TempDir()
	writeFiles(t, dir, map[string]string{"p_test.go": needsTests})
	fs, err := Funcs([]byte(needsStub))
	if err != nil {
		t.Fatal(err)
	}
	links, err := LinkTests(dir, []byte(needsStub), []byte(needsSolution), fs)
	if err != nil {
		t.Fatal(err)
	}
	want := map[string][]string{
		// Эталон LCM зовёт GCD, хотя в тесте GCD нет; sort.Ints — пакет и соседом не считается.
		"LCM": {"GCD"},
		// Тип получателя выводится: h := Build(...) — *Heap, поэтому Box.Len не нужен;
		// NewHeap и Heap.Len — из эталона.
		"Build": {"NewHeap", "Heap.Len", "Heap.Pop"},
		// Тест зовёт Box.Len, через метод-помощник rig.check — LCM; эталон Box.Len зовёт Heap.Len
		// (поле inner), эталон LCM — GCD: транзитивно.
		"Wrap": {"Heap.Len", "Box.Len", "GCD", "LCM"},
		// Таблица impls — переменная уровня пакета; через неё виден LCM.
		"GCD": {"LCM"},
		// Единица прогона — весь тип Heap, его методы друг другу не «нужны».
		"NewHeap":  nil,
		"Heap.Len": nil,
		"Heap.Pop": nil,
		// b.inner.Len(): тип поля inner виден из struct эталона, поэтому это Heap.Len, а не Box.Len.
		"Box.Len": {"Heap.Len"},
	}
	for name, w := range want {
		if got := links[name].Needs; !slices.Equal(got, w) {
			t.Errorf("%s: needs = %v, ожидалось %v", name, got, w)
		}
	}
}

func TestLinkTestsReportsBrokenTestFile(t *testing.T) {
	dir := t.TempDir()
	writeFiles(t, dir, map[string]string{"p_test.go": "package p\nfunc ("})
	if _, err := LinkTests(dir, []byte(linksStub), nil, nil); err == nil {
		t.Fatal("ожидалась ошибка разбора тестового файла")
	}
}
