package stubdoc

import (
	"os"
	"path/filepath"
	"slices"
	"strings"
	"testing"
)

// moduleRoot — каталог модуля exercises, если смотреть из этого пакета.
const moduleRoot = "../../.."

func readStub(t *testing.T, pkg string) []byte {
	t.Helper()
	src, err := os.ReadFile(filepath.Join(moduleRoot, pkg, pkg+".go"))
	if err != nil {
		t.Fatal(err)
	}
	return src
}

func funcNames(fs []Func) []string {
	var names []string
	for _, f := range fs {
		names = append(names, f.Name)
	}
	return names
}

func TestFuncsSlidingWindow(t *testing.T) {
	fs, err := Funcs(readStub(t, "slidingwindow"))
	if err != nil {
		t.Fatal(err)
	}
	want := []string{"MaxSumSubarray", "LongestSubstringKDistinct", "SmallestSubarrayWithSum",
		"LongestSubstringNoRepeat", "MaxSlidingWindow", "CharacterReplacement", "CheckInclusion",
		"LongestOnes", "NumSubarrayProductLessThanK", "SubarraysWithKDistinct", "FindAnagrams"}
	if got := funcNames(fs); !slices.Equal(got, want) {
		t.Fatalf("функции = %v, ожидалось %v (в порядке файла)", got, want)
	}
	first := fs[0]
	if first.Hint != "Ожидаемая сложность: O(n) по времени, O(1) по памяти." {
		t.Errorf("Hint = %q", first.Hint)
	}
	wantRecipe := "реализуй инкрементальное окно: посчитай сумму первых k элементов, " +
		"затем двигай окно, добавляя arr[i] и вычитая arr[i-k]."
	if first.Recipe != wantRecipe {
		t.Errorf("Recipe = %q, ожидалось %q", first.Recipe, wantRecipe)
	}
}

func TestFuncs(t *testing.T) {
	const src = `//go:build !solution

package p

// Stack — стек.
type Stack[T any] struct {
	// TODO: ваши поля.
}

// Push кладёт значение.
//
// Признак: нужен доступ только к последнему элементу.
//
// Подсказка: срез.
//
// Шаблон: monotonic-stack
//
// Ожидаемая сложность: O(1).
func (s *Stack[T]) Push(v T) {
	// TODO: append.
	panic("TODO: реализуйте Push")
}

func (s *Stack[T]) Len() int {
	panic("TODO: реализуйте Len")
}

// Sum считает сумму.
func Sum(xs []int) int {
	// TODO: пройдите по срезу,
	// копите сумму.
	//
	// Второй абзац рецепта.
	panic("TODO: реализуйте Sum")
}

// Ready — готовая функция, не задача.
func Ready() int { return 1 }

// helper неэкспортирована, но задана читателю так же.
func helper() {
	// TODO: сделайте помощника.
	panic("TODO: x")
}

type hidden struct{}

// Exported — метод неэкспортированного типа.
func (h *hidden) Exported() { panic("TODO: y") }

func Bare() {
	panic("TODO: реализуйте Bare")
}
`
	fs, err := Funcs([]byte(src))
	if err != nil {
		t.Fatal(err)
	}
	if got, want := funcNames(fs), []string{"Stack.Push", "Stack.Len", "Sum", "helper", "hidden.Exported", "Bare"}; !slices.Equal(got, want) {
		t.Fatalf("функции = %v, ожидалось %v", got, want)
	}
	byName := map[string]Func{}
	for _, f := range fs {
		byName[f.Name] = f
	}
	// Признак идёт первым, дальше подсказки в порядке документа; служебные «Шаблон»
	// в подсказки не попадают.
	wantHint := "Признак: нужен доступ только к последнему элементу.\n" +
		"Подсказка: срез.\nОжидаемая сложность: O(1)."
	if got := byName["Stack.Push"].Hint; got != wantHint {
		t.Errorf("Stack.Push: Hint = %q, ожидалось %q", got, wantHint)
	}
	if got := byName["Stack.Push"].Recipe; got != "append." {
		t.Errorf("Stack.Push: Recipe = %q", got)
	}
	if got := byName["Sum"].Recipe; got != "пройдите по срезу, копите сумму. Второй абзац рецепта." {
		t.Errorf("Sum: Recipe = %q", got)
	}
	if got := byName["helper"].Recipe; got != "сделайте помощника." {
		t.Errorf("helper: Recipe = %q", got)
	}
	for _, name := range []string{"Stack.Len", "Bare", "hidden.Exported"} {
		if f := byName[name]; f.Hint != "" || f.Recipe != "" {
			t.Errorf("%s без подсказок и рецепта: %+v", name, f)
		}
	}
}

func TestExercisesAddsFunctionsDeclaredInBothFilesOnlyWhenStubHasNoTODO(t *testing.T) {
	const solution = `package p

func Flawed() int { return 10 }

func Plain() int { return 20 }

func unexported() int { return 40 }

func Todo() int { return 5 }

func SolutionOnly() int { return 6 }
`
	// В заготовке нет panic("TODO"): упражнение — всё экспортированное, что есть и в эталоне.
	const flawed = `package p

// Flawed — рабочая, но с изъяном; читателю задана.
func Flawed() int { return 1 }

func Plain() int { return 2 }

func ReaderOnly() int { return 3 }

func unexported() int { return 4 }
`
	fs, err := Exercises([]byte(flawed), []byte(solution))
	if err != nil {
		t.Fatal(err)
	}
	if got, want := funcNames(fs), []string{"Flawed", "Plain"}; !slices.Equal(got, want) {
		t.Errorf("Exercises = %v, ожидалось %v", got, want)
	}
	if only, _ := Exercises([]byte(flawed), nil); len(only) != 0 {
		t.Errorf("без эталона — как Funcs: %v", funcNames(only))
	}
	// Есть panic("TODO"): готовые функции, оказавшиеся и в эталоне (конструкторы), не в счёт.
	const withTodo = flawed + `
func Todo() int {
	panic("TODO: реализуйте Todo")
}
`
	if got, _ := Exercises([]byte(withTodo), []byte(solution)); !slices.Equal(funcNames(got), []string{"Todo"}) {
		t.Errorf("при наличии panic(\"TODO\") упражнения только они: %v", funcNames(got))
	}
}

func TestDeclaredReadsBrokenSourceAsFarAsItGoes(t *testing.T) {
	got := Declared([]byte("package p\n\nfunc A() {}\n\nfunc (s *S) B() {}\n\nfunc (\n"))
	if !slices.Equal(got, []string{"A", "S.B"}) {
		t.Errorf("Declared = %v", got)
	}
	if got := Declared([]byte("не go")); len(got) != 0 {
		t.Errorf("Declared(мусор) = %v", got)
	}
}

func TestFuncsRejectsBrokenSource(t *testing.T) {
	if _, err := Funcs([]byte("package p\nfunc (")); err == nil {
		t.Fatal("ожидалась ошибка разбора")
	}
}

func TestTopLevelFuncs(t *testing.T) {
	const src = `package p

func A() {}
func b() {}
func (s *S) C() {}
func D() {}
`
	got, err := TopLevelFuncs([]byte(src))
	if err != nil {
		t.Fatal(err)
	}
	if want := []string{"A", "D"}; !slices.Equal(got, want) {
		t.Errorf("TopLevelFuncs = %v, ожидалось %v (без методов и неэкспортированных)", got, want)
	}
}

func TestMarksOf(t *testing.T) {
	tests := []struct {
		name    string
		doc     string
		want    Marks
		wantErr string
	}{
		{name: "нет меток", doc: "Условие.\n\nПодсказка: x.\n"},
		{
			name: "все три",
			doc: "Условие.\n\nШаблон: monotonic-stack.\n\nТакже решается: two-pointers, sliding-window\n\n" +
				"Признак: ответ зависит от ближайшего большего\nсправа.\n",
			want: Marks{
				Template: "monotonic-stack",
				Also:     []string{"two-pointers", "sliding-window"},
				Sign:     "ответ зависит от ближайшего большего справа.",
			},
		},
		{name: "два шаблона", doc: "Шаблон: a\n\nШаблон: b\n", wantErr: "Шаблон"},
		{name: "две меты решается", doc: "Также решается: a\n\nТакже решается: b\n", wantErr: "Также решается"},
		{name: "два признака", doc: "Признак: a\n\nПризнак: b\n", wantErr: "Признак"},
		{name: "пустой шаблон", doc: "Шаблон:\n", wantErr: "Шаблон"},
		{name: "пустой слаг в списке", doc: "Также решается: a, , b\n", wantErr: "Также решается"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := MarksOf(tt.doc)
			if tt.wantErr != "" {
				if err == nil || !strings.Contains(err.Error(), tt.wantErr) {
					t.Fatalf("ожидалась ошибка с %q, получено %v", tt.wantErr, err)
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			if got.Template != tt.want.Template || got.Sign != tt.want.Sign || !slices.Equal(got.Also, tt.want.Also) {
				t.Errorf("MarksOf = %+v, ожидалось %+v", got, tt.want)
			}
		})
	}
}

func TestStatementDropsServiceParagraphs(t *testing.T) {
	doc := "Условие.\n\nШаблон: greedy\n\nТакже решается: dynamic-programming\n\n" +
		"Признак: локальный выбор не портит остальное.\n\nПодсказка: сортировка.\n"
	text, hint := Statement(doc)
	if text != "Условие." || hint != "Подсказка: сортировка." {
		t.Errorf("Statement() = (%q, %q): служебные абзацы не должны попасть ни в условие, ни в подсказки", text, hint)
	}
}

func TestComplexity(t *testing.T) {
	tests := []struct{ name, doc, want string }{
		{"без префикса и точки", "Условие.\n\nОжидаемая сложность: O(amount · len(coins)).\n", "O(amount · len(coins))"},
		{"абзац на нескольких строках", "У.\n\nОжидаемая сложность: O(n) по времени,\nO(1) по памяти.\n", "O(n) по времени, O(1) по памяти"},
		{"нет абзаца", "Условие.\n\nПодсказка: x.\n", ""},
		{"в середине абзаца не считается", "Get возвращает значение.\nОжидаемая сложность: O(1).\n", ""},
		{"первый из двух", "Ожидаемая сложность: O(n).\n\nОжидаемая сложность: O(n²).\n", "O(n)"},
		{"точка внутри остаётся", "Ожидаемая сложность: O(n log n) в среднем; в худшем — O(n.).\n", "O(n log n) в среднем; в худшем — O(n.)"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := Complexity(tt.doc); got != tt.want {
				t.Errorf("Complexity() = %q, ожидалось %q", got, tt.want)
			}
		})
	}
}
