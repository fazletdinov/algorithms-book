package traceinstr

import (
	"go/ast"
	"go/importer"
	"go/parser"
	"go/token"
	"go/types"
	"os"
	"strings"
	"testing"
)

// typeCheck парсит и типизирует sources как один пакет pkgName — самый
// дешёвый способ узнать «этот код реально компилируется», без запуска
// go build/exec: go/types резолвит stdlib-импорты через importer.Default()
// и не требует ни модуля, ни временных файлов на диске.
func typeCheck(t *testing.T, pkgName string, sources map[string]string) {
	t.Helper()
	fset := token.NewFileSet()
	var files []*ast.File
	for name, src := range sources {
		f, err := parser.ParseFile(fset, name, src, 0)
		if err != nil {
			t.Fatalf("парсинг %s: %v\n--- исходник ---\n%s", name, err, src)
		}
		files = append(files, f)
	}
	conf := types.Config{Importer: importer.Default()}
	if _, err := conf.Check(pkgName, fset, files, nil); err != nil {
		t.Fatalf("типизация не прошла: %v", err)
	}
}

// TestInstrumentRealSolution — главный тест: инструментирует РЕАЛЬНЫЙ эталон
// MaxSumSubarray (читается с диска, не копия в строке — не расходится с
// книгой) и проверяет, что результат вместе с __traceEmit/__traceSeq
// типизируется как целостный пакет. Заодно ловит будущий дрейф формы
// эталона (если решение перестанет быть «плоским», тест укажет на это).
func TestInstrumentRealSolution(t *testing.T) {
	src, err := os.ReadFile("../../../slidingwindow/slidingwindow_solution.go")
	if err != nil {
		t.Fatalf("чтение эталона: %v", err)
	}
	out, err := Instrument(src, "MaxSumSubarray")
	if err != nil {
		t.Fatalf("Instrument: %v", err)
	}

	// Санити: в трассе действительно должны появиться ключевые переменные
	// паттерна, а не только "arr"/"k" — иначе эвристика молча ничего не поймала.
	for _, want := range []string{`"windowSum"`, `"maxSum"`, `"i"`, `"start"`, `"loop1"`, `"loop2"`, `"return"`} {
		if !strings.Contains(string(out), want) {
			t.Errorf("в инструментированном коде нет %s:\n%s", want, out)
		}
	}

	// Номера строк должны указывать на реальные строки эталона (см.
	// slidingwindow_solution.go): 5 — заголовок функции; 7 — ранний return
	// внутри guard-if (теперь инструментируется, раньше не был); 11 — тело
	// loop1 (единственный оператор внутри); 15/16/17 — ТРИ разных снимка
	// внутри loop2 за одну итерацию: присваивание, строка `if`, и (когда
	// сработало) строка ВНУТРИ if — то, ради чего вообще была эта правка:
	// видно, что произошло на конкретной итерации, а не только «после if»;
	// 20 — return в конце. Ловит регрессию, если привязка к fset сломается.
	for _, want := range []string{
		`__traceEmit(5, "start"`,
		`__traceEmit(7, "return"`,
		`__traceEmit(11, "loop1"`,
		`__traceEmit(15, "loop2"`,
		`__traceEmit(16, "loop2"`,
		`__traceEmit(17, "loop2"`,
		`__traceEmit(20, "return"`,
	} {
		if !strings.Contains(string(out), want) {
			t.Errorf("нет ожидаемой привязки к строке %s:\n%s", want, out)
		}
	}

	typeCheck(t, "slidingwindow", map[string]string{
		"slidingwindow.go":              string(out),
		"slidingwindow_trace_helper.go": string(TraceHelperSource("slidingwindow")),
	})
}

// TestInstrumentMultiAssignAndVar проверяет, что многозначные `:=` (не
// только первое имя слева) и `var`-объявления тоже попадают в снимок.
func TestInstrumentMultiAssignAndVar(t *testing.T) {
	const src = `package demo

func Sum(nums []int) int {
	var total int
	for i, ok := 0, true; i < len(nums); i++ {
		_ = ok
		total += nums[i]
	}
	return total
}
`
	out, err := Instrument([]byte(src), "Sum")
	if err != nil {
		t.Fatalf("Instrument: %v", err)
	}
	for _, want := range []string{`"total"`, `"i"`, `"ok"`} {
		if !strings.Contains(string(out), want) {
			t.Errorf("нет захваченного имени %s:\n%s", want, out)
		}
	}
	typeCheck(t, "demo", map[string]string{
		"demo.go":              string(out),
		"demo_trace_helper.go": string(TraceHelperSource("demo")),
	})
}

// TestInstrumentDescendsIntoIf — самый частый практический случай: один
// цикл с if/else внутри (а не два последовательных цикла, как в эталоне
// MaxSumSubarray). Снимок обязан появиться ВНУТРИ каждой ветки, а не только
// на строке самого if — иначе трасса выглядит так, будто читатель никогда
// не заходит внутрь условия, хотя код это условие реально исполняет.
func TestInstrumentDescendsIntoIf(t *testing.T) {
	const src = `package demo

func ClipMax(nums []int, limit int) int {
	best := 0
	for i := 0; i < len(nums); i++ {
		if nums[i] > limit {
			best = limit
		} else {
			best = nums[i]
		}
	}
	return best
}
`
	out, err := Instrument([]byte(src), "ClipMax")
	if err != nil {
		t.Fatalf("Instrument: %v", err)
	}
	typeCheck(t, "demo", map[string]string{
		"demo.go":              string(out),
		"demo_trace_helper.go": string(TraceHelperSource("demo")),
	})

	// Строки: 6 — заголовок if, 7 — внутри if-ветки (best = limit), 9 —
	// внутри else-ветки (best = nums[i]). Обе ДОЛЖНЫ получить свой снимок.
	for _, want := range []string{
		`__traceEmit(7, "loop1"`,
		`__traceEmit(9, "loop1"`,
	} {
		if !strings.Contains(string(out), want) {
			t.Errorf("нет снимка внутри ветки if/else %s:\n%s", want, out)
		}
	}
}

// TestInstrumentSequentialLoops — два цикла подряд (форма самого
// MaxSumSubarray) должны приниматься, а не отвергаться как «больше одного
// цикла». Это прямая регрессия на поправку из плана.
func TestInstrumentSequentialLoops(t *testing.T) {
	const src = `package demo

func TwoLoops(arr []int) int {
	sum := 0
	for i := 0; i < len(arr); i++ {
		sum += arr[i]
	}
	max := 0
	for i := 0; i < len(arr); i++ {
		if arr[i] > max {
			max = arr[i]
		}
	}
	return sum + max
}
`
	if _, err := Instrument([]byte(src), "TwoLoops"); err != nil {
		t.Fatalf("два последовательных цикла должны поддерживаться: %v", err)
	}
}

// TestInstrumentAcceptsNestedLoops — прямая регрессия на паттерн
// «сжимающееся окно» (SmallestSubarrayWithSum и похожие): for с for внутри
// должен приниматься, и снимки обязаны появиться на строках ОБОИХ уровней —
// иначе трасса просто перепрыгивает содержимое внутреннего цикла.
func TestInstrumentAcceptsNestedLoops(t *testing.T) {
	const src = `package demo

func ShrinkingWindow(nums []int, target int) int {
	left, sum := 0, 0
	best := 0
	for right := 0; right < len(nums); right++ {
		sum += nums[right]
		for sum >= target {
			if best == 0 || right-left+1 < best {
				best = right - left + 1
			}
			sum -= nums[left]
			left++
		}
	}
	return best
}
`
	out, err := Instrument([]byte(src), "ShrinkingWindow")
	if err != nil {
		t.Fatalf("вложенный цикл (сжимающееся окно) должен поддерживаться: %v", err)
	}
	typeCheck(t, "demo", map[string]string{
		"demo.go":              string(out),
		"demo_trace_helper.go": string(TraceHelperSource("demo")),
	})

	// Строки: 7 — sum += nums[right] (внешний цикл, тег loop1); 9 — снимок
	// ПОСЛЕ if внутреннего цикла (тег loop2); 10 — снимок ВНУТРИ ветки if
	// (тег loop2, best = right-left+1) — это и есть то, ради чего вообще
	// была вся правка: видно, что произошло на конкретной итерации
	// внутреннего цикла, а не только «после if». Оба уровня вложенности
	// обязаны получить свои снимки.
	for _, want := range []string{
		`__traceEmit(7, "loop1"`,
		`__traceEmit(9, "loop2"`,
		`__traceEmit(10, "loop2"`,
	} {
		if !strings.Contains(string(out), want) {
			t.Errorf("нет ожидаемого снимка %s:\n%s", want, out)
		}
	}
}

// TestInstrumentAcceptsLoopInsideIf — цикл не обязан быть прямым элементом
// тела функции: reachableFor должен найти for, спрятанный на уровень глубже,
// внутри top-level if (в отличие от switch — см. TestInstrumentRejectsUnsupportedShapes).
func TestInstrumentAcceptsLoopInsideIf(t *testing.T) {
	const src = `package demo

func SumIfPositive(nums []int) int {
	sum := 0
	if len(nums) > 0 {
		for i := 0; i < len(nums); i++ {
			sum += nums[i]
		}
	}
	return sum
}
`
	if _, err := Instrument([]byte(src), "SumIfPositive"); err != nil {
		t.Fatalf("цикл внутри if должен поддерживаться: %v", err)
	}
}

// TestInstrumentAcceptsRangeLoop — range теперь такой же полноправный цикл,
// как classic for: ключ и значение (когда объявлены через :=) захватываются
// в снимок так же, как индукционная переменная for.
func TestInstrumentAcceptsRangeLoop(t *testing.T) {
	const src = `package demo

func RangeSum(nums []int) int {
	sum := 0
	for i, x := range nums {
		sum += x + i
	}
	return sum
}
`
	out, err := Instrument([]byte(src), "RangeSum")
	if err != nil {
		t.Fatalf("range-цикл должен поддерживаться: %v", err)
	}
	typeCheck(t, "demo", map[string]string{
		"demo.go":              string(out),
		"demo_trace_helper.go": string(TraceHelperSource("demo")),
	})
	// Строка 6 — "sum += x + i" внутри range; должны попасть и i, и x.
	for _, want := range []string{`"i", i`, `"x", x`, `__traceEmit(6, "loop1"`} {
		if !strings.Contains(string(out), want) {
			t.Errorf("нет ожидаемого %s:\n%s", want, out)
		}
	}
}

// TestInstrumentAcceptsMixedForAndRangeNesting — for снаружи, range внутри
// (и наоборот — вложенность работает в обе стороны, поскольку instrumentBlock
// обрабатывает ForStmt/RangeStmt одинаково рекурсивно).
func TestInstrumentAcceptsMixedForAndRangeNesting(t *testing.T) {
	const src = `package demo

func Flatten(matrix [][]int) []int {
	out := []int{}
	for i := 0; i < len(matrix); i++ {
		for _, v := range matrix[i] {
			out = append(out, v)
		}
	}
	return out
}
`
	if _, err := Instrument([]byte(src), "Flatten"); err != nil {
		t.Fatalf("for снаружи + range внутри должны поддерживаться: %v", err)
	}

	const src2 = `package demo

func FlattenR(matrix [][]int) []int {
	out := []int{}
	for _, row := range matrix {
		for j := 0; j < len(row); j++ {
			out = append(out, row[j])
		}
	}
	return out
}
`
	if _, err := Instrument([]byte(src2), "FlattenR"); err != nil {
		t.Fatalf("range снаружи + for внутри должны поддерживаться: %v", err)
	}
}

func TestInstrumentRejectsUnsupportedShapes(t *testing.T) {
	tests := []struct {
		name string
		src  string
		fn   string
	}{
		{
			name: "нет цикла",
			fn:   "NoLoop",
			src: `package demo
func NoLoop(x int) int { return x + 1 }`,
		},
		{
			// Единственный for спрятан внутри switch — instrumentBlock туда не
			// заходит (см. doc-комментарий), поэтому reachableFor обязан не
			// найти его и честно отклонить, а не дать пустую/неполную трассу.
			name: "цикл только внутри switch",
			fn:   "OnlyInSwitch",
			src: `package demo
func OnlyInSwitch(mode int, nums []int) int {
	switch mode {
	case 1:
		sum := 0
		for i := 0; i < len(nums); i++ {
			sum += nums[i]
		}
		return sum
	}
	return 0
}`,
		},
		{
			name: "горутина",
			fn:   "WithGo",
			src: `package demo
func WithGo(nums []int) int {
	sum := 0
	for i := 0; i < len(nums); i++ {
		go func() {}()
		sum += nums[i]
	}
	return sum
}`,
		},
		{
			name: "замыкание",
			fn:   "WithClosure",
			src: `package demo
func WithClosure(nums []int) int {
	sum := 0
	add := func(x int) { sum += x }
	for i := 0; i < len(nums); i++ {
		add(nums[i])
	}
	return sum
}`,
		},
		{
			name: "рекурсия",
			fn:   "Recur",
			src: `package demo
func Recur(n int) int {
	total := 0
	for i := 0; i < n; i++ {
		total += Recur(i)
	}
	return total
}`,
		},
		{
			name: "метод, а не функция",
			fn:   "Method",
			src: `package demo
type T struct{}
func (t T) Method(n int) int {
	total := 0
	for i := 0; i < n; i++ {
		total += i
	}
	return total
}`,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := Instrument([]byte(tt.src), tt.fn)
			var shapeErr *UnsupportedShapeError
			if err == nil {
				t.Fatalf("ожидалась UnsupportedShapeError, получили nil")
			}
			if !asUnsupportedShape(err, &shapeErr) {
				t.Fatalf("ожидалась *UnsupportedShapeError, получили %T: %v", err, err)
			}
			if shapeErr.Reason == "" {
				t.Error("Reason пустой — читателю нечего показать")
			}
		})
	}
}

func TestInstrumentFuncNotFound(t *testing.T) {
	const src = `package demo
func Other(n int) int { return n }`
	_, err := Instrument([]byte(src), "Missing")
	if _, ok := err.(*FuncNotFoundError); !ok {
		t.Fatalf("ожидалась *FuncNotFoundError, получили %T: %v", err, err)
	}
}

// asUnsupportedShape — маленький type-assert хелпер, чтобы не тащить errors.As
// ради одного места (ошибки здесь не оборачиваются через %w, это листовые типы).
func asUnsupportedShape(err error, target **UnsupportedShapeError) bool {
	se, ok := err.(*UnsupportedShapeError)
	if ok {
		*target = se
	}
	return ok
}
