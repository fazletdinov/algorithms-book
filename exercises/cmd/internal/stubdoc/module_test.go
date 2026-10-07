package stubdoc

import (
	"go/parser"
	"go/scanner"
	"go/token"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"testing"
)

// midParagraphMentions — заготовки, в которых «Ожидаемая сложность» стоит не
// началом абзаца, а продолжением строки (док-комментарии не переписываются: это
// условие функции, а не подсказка). Plain убирает абзацы целиком, поэтому такие
// фразы остаются. Запись здесь — «прочитано человеком»: новое вхождение роняет тест.
var midParagraphMentions = map[string][]string{
	"hashtable": {"Ожидаемая сложность"},
}

// stubPackages — пакеты модуля, у которых есть заготовка с panic("TODO.
func stubPackages(t *testing.T) []string {
	t.Helper()
	entries, err := os.ReadDir(moduleRoot)
	if err != nil {
		t.Fatal(err)
	}
	var pkgs []string
	for _, e := range entries {
		if !e.IsDir() || e.Name() == "cmd" || strings.HasPrefix(e.Name(), ".") {
			continue
		}
		src, err := os.ReadFile(filepath.Join(moduleRoot, e.Name(), e.Name()+".go"))
		if err != nil || !strings.Contains(string(src), `panic("TODO`) {
			continue
		}
		pkgs = append(pkgs, e.Name())
	}
	if len(pkgs) < 60 {
		t.Fatalf("нашлось %d заготовок с panic(\"TODO — путь к модулю неверен?", len(pkgs))
	}
	return pkgs
}

// Свойства Plain на настоящих заготовках (только разбор, без запуска кода).
func TestPlainKeepsEveryRealStubCompilableShape(t *testing.T) {
	for _, pkg := range stubPackages(t) {
		t.Run(pkg, func(t *testing.T) {
			src := readStub(t, pkg)
			plain, err := Plain(src)
			if err != nil {
				t.Fatal(err)
			}
			if got, want := funcSignatures(t, plain), funcSignatures(t, src); !slices.Equal(got, want) {
				t.Errorf("функции и сигнатуры изменились:\n%v\nбыло:\n%v", got, want)
			}
			if got, want := strings.Count(string(plain), `panic("TODO`), strings.Count(string(src), `panic("TODO`); got != want {
				t.Errorf("panic(\"TODO: %d, было %d", got, want)
			}
			if !strings.HasPrefix(string(plain), "//go:build !solution\n") {
				t.Errorf("тег сборки должен остаться первой строкой")
			}
			for _, bad := range []string{"Ожидаемая сложность", "Подсказка", "// TODO"} {
				if strings.Contains(string(plain), bad) && !slices.Contains(midParagraphMentions[pkg], bad) {
					t.Errorf("в Plain осталось %q", bad)
				}
			}
			for _, bad := range []string{"\n// Шаблон:", "\n// Также решается:", "\n// Признак:"} {
				if strings.Contains(string(plain), bad) {
					t.Errorf("в Plain остался служебный абзац %q", strings.TrimSpace(bad))
				}
			}
			// Plain не должен ничего убирать у кода, кроме комментариев: без комментариев
			// исходник и результат совпадают по токенам.
			if got, want := codeTokens(t, plain), codeTokens(t, src); !slices.Equal(got, want) {
				t.Errorf("Plain изменил код, а не только комментарии")
			}
			if !onlyDeletesLines(string(plain), string(src)) {
				t.Errorf("Plain не только убирает строки: остальное должно остаться байт в байт")
			}
		})
	}
}

// onlyDeletesLines — строки got идут в src по порядку, каждая без изменений.
func onlyDeletesLines(got, src string) bool {
	rest := strings.SplitAfter(src, "\n")
	for _, line := range strings.SplitAfter(got, "\n") {
		i := slices.Index(rest, line)
		if i < 0 {
			return false
		}
		rest = rest[i+1:]
	}
	return true
}

// codeTokens — токены файла без комментариев (сканер пропускает их сам).
func codeTokens(t *testing.T, src []byte) []string {
	t.Helper()
	var sc scanner.Scanner
	fset := token.NewFileSet()
	sc.Init(fset.AddFile("x.go", fset.Base(), len(src)), src, func(pos token.Position, msg string) {
		t.Errorf("сканер: %v: %s", pos, msg)
	}, 0)
	var toks []string
	for {
		_, tok, lit := sc.Scan()
		if tok == token.EOF {
			return toks
		}
		toks = append(toks, tok.String()+" "+lit)
	}
}

func TestSolutionOfEveryRealStubFunc(t *testing.T) {
	checked := 0
	for _, pkg := range stubPackages(t) {
		solPath := filepath.Join(moduleRoot, pkg, pkg+"_solution.go")
		solSrc, err := os.ReadFile(solPath)
		if err != nil {
			continue // эталона нет (miniredis-подобные пакеты) — проверять нечего
		}
		fs, err := Funcs(readStub(t, pkg))
		if err != nil {
			t.Fatalf("%s: %v", pkg, err)
		}
		for _, f := range fs {
			code, err := Solution(solSrc, f.Name)
			if err != nil {
				t.Errorf("%s.%s: %v", pkg, f.Name, err)
				continue
			}
			if strings.TrimSpace(code) == "" {
				t.Errorf("%s.%s: пустой эталон", pkg, f.Name)
				continue
			}
			if strings.Contains(code, "//go:build") {
				t.Errorf("%s.%s: в эталоне остался тег сборки", pkg, f.Name)
			}
			if _, err := parser.ParseFile(token.NewFileSet(), "sol.go", "package "+pkg+"\n\n"+code, parser.SkipObjectResolution); err != nil {
				t.Errorf("%s.%s: эталон не разбирается: %v\n%s", pkg, f.Name, err, code)
			}
			checked++
		}
	}
	if checked < 250 {
		t.Errorf("проверено %d эталонов — меньше ожидаемого, список заготовок не тот?", checked)
	}
}

func TestFuncsOfBigOIncludeMethods(t *testing.T) {
	fs, err := Funcs(readStub(t, "bigo"))
	if err != nil {
		t.Fatal(err)
	}
	if !slices.Contains(funcNames(fs), "MinStack.Top") {
		t.Errorf("в bigo нет MinStack.Top: %v", funcNames(fs))
	}
}
