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
	links, err := LinkTests(dir, []byte(linksStub), fs)
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

func TestLinkTestsReportsBrokenTestFile(t *testing.T) {
	dir := t.TempDir()
	writeFiles(t, dir, map[string]string{"p_test.go": "package p\nfunc ("})
	if _, err := LinkTests(dir, []byte(linksStub), nil); err == nil {
		t.Fatal("ожидалась ошибка разбора тестового файла")
	}
}
