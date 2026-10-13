package stubdoc

import (
	"go/ast"
	"go/parser"
	"go/token"
	"slices"
	"strings"
	"testing"
)

func TestPlainSlidingWindow(t *testing.T) {
	plain, err := Plain(readStub(t, "slidingwindow"))
	if err != nil {
		t.Fatal(err)
	}
	// Ожидаемая сложность и «// TODO» убраны, а условие и пример остались: за примером
	// сразу идёт объявление, без пустой строки-разделителя от убранного абзаца.
	const want = "// Пример: arr=[2,1,5,1,3,2], k=3 -> 9 (подмассив [5,1,3]).\nfunc MaxSumSubarray("
	if !strings.Contains(string(plain), want) {
		t.Errorf("в Plain нет %q:\n%s", want, plain)
	}
	const body = "func MaxSumSubarray(arr []int, k int) int {\n\tpanic(\"TODO: реализуй MaxSumSubarray\")\n}\n"
	if !strings.Contains(string(plain), body) {
		t.Errorf("тело заготовки должно остаться одним panic(\"TODO…\"):\n%s", plain)
	}
}

func TestPlain(t *testing.T) {
	tests := []struct {
		name, src, want string
	}{
		{
			name: "подсказка в конце: уходит вместе с разделителем перед ней",
			src:  "package p\n\n// F делает дело.\n//\n// Подсказка: так.\nfunc F() {}\n",
			want: "package p\n\n// F делает дело.\nfunc F() {}\n",
		},
		{
			name: "подсказка в середине: разделитель остаётся один",
			src:  "package p\n\n// F делает дело.\n//\n// Подсказка: так.\n//\n// Пример: F().\nfunc F() {}\n",
			want: "package p\n\n// F делает дело.\n//\n// Пример: F().\nfunc F() {}\n",
		},
		{
			name: "две подсказки подряд и условие после",
			src: "package p\n\n// F делает дело.\n//\n// Подсказка: так.\n//\n// Ожидаемая сложность: O(1).\n//\n" +
				"// Пример: F().\nfunc F() {}\n",
			want: "package p\n\n// F делает дело.\n//\n// Пример: F().\nfunc F() {}\n",
		},
		{
			name: "подсказка первым абзацем",
			src:  "package p\n\n// Подсказка: так.\n//\n// F делает дело.\nfunc F() {}\n",
			want: "package p\n\n// F делает дело.\nfunc F() {}\n",
		},
		{
			name: "служебные абзацы: шаблон, также решается, признак",
			src: "package p\n\n// F делает дело.\n//\n// Шаблон: greedy\n//\n// Также решается: a, b\n//\n" +
				"// Признак: так видно\n// на две строки.\n//\n// Пример: F().\nfunc F() {}\n",
			want: "package p\n\n// F делает дело.\n//\n// Пример: F().\nfunc F() {}\n",
		},
		{
			name: "весь комментарий из подсказок исчезает целиком",
			src:  "package p\n\n// Подсказка: так.\nfunc F() {}\n",
			want: "package p\n\nfunc F() {}\n",
		},
		{
			name: "абзац из нескольких строк уходит целиком",
			src:  "package p\n\n// F.\n//\n// Подсказка: длинная\n// подсказка на две строки.\nfunc F() {}\n",
			want: "package p\n\n// F.\nfunc F() {}\n",
		},
		{
			name: "док-комментарий метода и типа",
			src: "package p\n\n// T — тип.\n//\n// Совет: поле.\ntype T struct{}\n\n" +
				"// M делает.\n//\n// Внимание: порядок.\nfunc (T) M() {}\n",
			want: "package p\n\n// T — тип.\ntype T struct{}\n\n// M делает.\nfunc (T) M() {}\n",
		},
		{
			name: "блок TODO со строками-продолжениями; код вокруг на месте",
			src: "package p\n\nfunc F() int {\n\t// TODO: сделайте раз,\n\t// сделайте два.\n\t//\n\t// Три.\n" +
				"\tpanic(\"TODO: реализуйте F\")\n}\n",
			want: "package p\n\nfunc F() int {\n\tpanic(\"TODO: реализуйте F\")\n}\n",
		},
		{
			name: "комментарий перед TODO в той же группе остаётся",
			src:  "package p\n\nfunc F() {\n\t// Что здесь происходит.\n\t// TODO: сделайте.\n\tpanic(\"TODO: x\")\n}\n",
			want: "package p\n\nfunc F() {\n\t// Что здесь происходит.\n\tpanic(\"TODO: x\")\n}\n",
		},
		{
			name: "TODO в теле структуры: остаётся нейтральная метка, подсказки нет",
			src:  "package p\n\ntype T struct {\n\t// TODO: ваши поля.\n\t// Подсказка: срез.\n}\n",
			want: "package p\n\ntype T struct {\n\t// TODO: поля\n}\n",
		},
		{
			name: "метка в теле структуры не меняется при повторном проходе",
			src:  "package p\n\ntype T struct {\n\t// TODO: поля\n\tx int\n}\n",
			want: "package p\n\ntype T struct {\n\t// TODO: поля\n\tx int\n}\n",
		},
		{
			name: "TODO в теле не структуры просто убирается",
			src:  "package p\n\ntype I interface {\n\t// TODO: методы.\n}\n",
			want: "package p\n\ntype I interface {\n}\n",
		},
		{
			name: "два блока TODO в одной функции",
			src: "package p\n\nfunc F() {\n\t// TODO: раз.\n\tx := 1\n\t// TODO: два.\n\t_ = x\n" +
				"\tpanic(\"TODO: x\")\n}\n",
			want: "package p\n\nfunc F() {\n\tx := 1\n\t_ = x\n\tpanic(\"TODO: x\")\n}\n",
		},
		{
			name: "обычные комментарии, тег сборки и panic остаются байт в байт",
			src: "//go:build !solution\n\n// Package p — пакет.\n//\n// Реализуйте функции ниже.\npackage p\n\n" +
				"// F делает дело.\n//\n// Пример: F() = 1.\nfunc F() int {\n\t// просто комментарий\n\tpanic(\"TODO: реализуйте F\")\n}\n",
			want: "//go:build !solution\n\n// Package p — пакет.\n//\n// Реализуйте функции ниже.\npackage p\n\n" +
				"// F делает дело.\n//\n// Пример: F() = 1.\nfunc F() int {\n\t// просто комментарий\n\tpanic(\"TODO: реализуйте F\")\n}\n",
		},
		{
			name: "код с отступами в комментарии не трогается, даже если после пустой // идёт его текст",
			src:  "package p\n\n// F.\n//\n//\tgo test ./p/\n//\n//\tgo vet ./p/\n//\n// Подсказка: x.\nfunc F() {}\n",
			want: "package p\n\n// F.\n//\n//\tgo test ./p/\n//\n//\tgo vet ./p/\nfunc F() {}\n",
		},
		{
			name: "слово «Подсказка» в середине абзаца — не подсказка",
			src:  "package p\n\n// F делает дело. Подсказка: в середине абзаца не считается.\nfunc F() {}\n",
			want: "package p\n\n// F делает дело. Подсказка: в середине абзаца не считается.\nfunc F() {}\n",
		},
		{
			name: "нет \\n в конце файла",
			src:  "package p\n\n// F.\n//\n// Совет: x.\nfunc F() {}",
			want: "package p\n\n// F.\nfunc F() {}",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Plain([]byte(tt.src))
			if err != nil {
				t.Fatal(err)
			}
			if string(got) != tt.want {
				t.Errorf("Plain:\n%q\nожидалось:\n%q", got, tt.want)
			}
			again, err := Plain(got)
			if err != nil || string(again) != string(got) {
				t.Errorf("повторный Plain меняет результат: %q, %v", again, err)
			}
		})
	}
}

func TestPlainRefusesTrailingTODO(t *testing.T) {
	// Строку с кодом удалять нельзя, а вырезать хвост-комментарий Plain не умеет:
	// тихо оставить подсказку хуже, чем сказать об этом при первой же проверке.
	_, err := Plain([]byte("package p\n\nfunc F() {\n\tx := 1 // TODO: подсказка\n\t_ = x\n}\n"))
	if err == nil || !strings.Contains(err.Error(), "TODO") {
		t.Fatalf("ожидалась ошибка про TODO после кода, получено %v", err)
	}
}

func TestPlainRejectsBrokenSource(t *testing.T) {
	if _, err := Plain([]byte("package p\nfunc (")); err == nil {
		t.Fatal("ожидалась ошибка разбора")
	}
}

func TestNotes(t *testing.T) {
	const src = `//go:build !solution

// Package p — пакет.
//
// Подсказка: идея пакета.
package p

// T — тип.
//
// Совет: поле.
type T struct {
	// TODO: добавьте поля — основной стек.
	// Подсказка: срез.
}

// F делает дело.
//
// Шаблон: greedy
//
// Ожидаемая сложность: O(n).
func F() int {
	// TODO: сделайте раз.
	panic("TODO: реализуйте F")
}

// R — готовая функция.
//
// Внимание: порядок.
func R() int {
	// TODO: когда-нибудь переписать.
	return 1
}

// Limit — константа.
//
// Подсказка: про константу.
const Limit = 1
`
	fs, err := Funcs([]byte(src))
	if err != nil {
		t.Fatal(err)
	}
	got, err := Notes([]byte(src), fs)
	if err != nil {
		t.Fatal(err)
	}
	want := []Note{
		{"package", "Подсказка: идея пакета."},
		{"type T", "Совет: поле."},
		{"type T", "добавьте поля — основной стек. Подсказка: срез."},
		{"func R", "Внимание: порядок."},
		{"func R", "когда-нибудь переписать."},
		{"package", "Подсказка: про константу."},
	}
	if !slices.Equal(got, want) {
		t.Errorf("Notes:\n%v\nожидалось:\n%v", got, want)
	}
}

// funcSignatures — «получатель имя(параметры) результат» каждой функции файла, как
// они написаны в исходнике.
func funcSignatures(t *testing.T, src []byte) []string {
	t.Helper()
	fset := token.NewFileSet()
	file, err := parser.ParseFile(fset, "x.go", src, parser.SkipObjectResolution)
	if err != nil {
		t.Fatalf("Plain отдал неразбираемый код: %v", err)
	}
	var sigs []string
	for _, decl := range file.Decls {
		fn, ok := decl.(*ast.FuncDecl)
		if !ok {
			continue
		}
		end := fn.End()
		if fn.Body != nil {
			end = fn.Body.Lbrace
		}
		sig := string(src[fset.Position(fn.Pos()).Offset:fset.Position(end).Offset])
		sigs = append(sigs, strings.Join(strings.Fields(sig), " "))
	}
	return sigs
}
