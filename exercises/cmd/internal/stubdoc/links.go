package stubdoc

import (
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"path/filepath"
	"sort"
	"strings"
)

// Links — как упражнение связано с тестами пакета.
type Links struct {
	// Tests — тесты, которыми владеет сама функция (правило OwnerOf среди экспортированных
	// функций верхнего уровня). У метода и у конструктора их обычно нет: такие тесты названы по типу.
	Tests []string
	// Needs — другие упражнения пакета, без которых Tests не пройдут: тест зовёт их
	// сам или через помощники тестов. На заготовке с одной решённой функцией такой тест
	// падает с panic("TODO") соседа. Считаются только функции верхнего уровня.
	Needs []string
	// Group — тип, чей это метод или конструктор (функция верхнего уровня, возвращающая тип,
	// объявленный в заготовке); "" — функция сама по себе.
	Group string
	// GroupTests — тесты типа Group: те же правила владения, но среди типов и функций.
	// Единица прогона для метода и конструктора — тип, а не отдельная функция.
	GroupTests []string
}

// LinkTests связывает упражнения заготовки с тестами пакета из dir. Ключ результата — Func.Name.
func LinkTests(dir string, stub []byte, exercises []Func) (map[string]Links, error) {
	_, file, err := parseSource(stub)
	if err != nil {
		return nil, err
	}
	tests, err := readTests(dir)
	if err != nil {
		return nil, err
	}
	var funcs, types []string
	for _, decl := range file.Decls {
		switch d := decl.(type) {
		case *ast.FuncDecl:
			if d.Recv == nil && ast.IsExported(d.Name.Name) {
				funcs = append(funcs, d.Name.Name)
			}
		case *ast.GenDecl:
			if d.Tok == token.TYPE {
				for _, spec := range d.Specs {
					types = append(types, spec.(*ast.TypeSpec).Name.Name)
				}
			}
		}
	}
	own := tests.assign(funcs)
	byType := tests.assign(append(slicesClone(funcs), types...))

	topLevel := map[string]bool{}
	for _, f := range exercises {
		if !strings.Contains(f.Name, ".") {
			topLevel[f.Name] = true
		}
	}
	groupOf := constructors(file, types)

	out := map[string]Links{}
	for _, f := range exercises {
		l := Links{}
		if typ, _, isMethod := strings.Cut(f.Name, "."); isMethod {
			l.Group = typ
		} else {
			l.Group = groupOf[f.Name]
			l.Tests = own[f.Name]
			l.Needs = tests.needs(l.Tests, f.Name, exercises, topLevel)
		}
		if l.Group != "" {
			l.GroupTests = byType[l.Group]
		}
		out[f.Name] = l
	}
	return out, nil
}

func slicesClone(s []string) []string { return append([]string(nil), s...) }

// constructors — функции верхнего уровня, чей первый результат — тип, объявленный в
// заготовке (T, *T, T[K], *T[K]): имя функции -> имя типа.
func constructors(file *ast.File, types []string) map[string]string {
	declared := map[string]bool{}
	for _, t := range types {
		declared[t] = true
	}
	out := map[string]string{}
	for _, decl := range file.Decls {
		fn, ok := decl.(*ast.FuncDecl)
		if !ok || fn.Recv != nil || fn.Type.Results == nil || len(fn.Type.Results.List) == 0 {
			continue
		}
		if typ := baseTypeName(fn.Type.Results.List[0].Type); declared[typ] {
			out[fn.Name.Name] = typ
		}
	}
	return out
}

// baseTypeName — имя типа без указателей и параметров.
func baseTypeName(expr ast.Expr) string {
	for {
		switch e := expr.(type) {
		case *ast.StarExpr:
			expr = e.X
		case *ast.ParenExpr:
			expr = e.X
		case *ast.IndexExpr:
			expr = e.X
		case *ast.IndexListExpr:
			expr = e.X
		case *ast.Ident:
			return e.Name
		default:
			return ""
		}
	}
}

// testFiles — разобранные *_test.go пакета: тесты верхнего уровня и помощники.
type testFiles struct {
	tests   map[string]*ast.FuncDecl // TestXxx (кроме TestMain)
	helpers map[string]*ast.FuncDecl // остальные функции без получателя
}

func readTests(dir string) (*testFiles, error) {
	files, err := filepath.Glob(filepath.Join(dir, "*_test.go"))
	if err != nil {
		return nil, err
	}
	tf := &testFiles{tests: map[string]*ast.FuncDecl{}, helpers: map[string]*ast.FuncDecl{}}
	for _, f := range files {
		file, err := parser.ParseFile(token.NewFileSet(), f, nil, parser.SkipObjectResolution)
		if err != nil {
			return nil, fmt.Errorf("%s: %w", f, err)
		}
		for _, decl := range file.Decls {
			fn, ok := decl.(*ast.FuncDecl)
			if !ok || fn.Recv != nil || fn.Body == nil {
				continue
			}
			if strings.HasPrefix(fn.Name.Name, "Test") && fn.Name.Name != "TestMain" {
				tf.tests[fn.Name.Name] = fn
			} else {
				tf.helpers[fn.Name.Name] = fn
			}
		}
	}
	return tf, nil
}

// assign раздаёт тесты именам из owners по правилу OwnerOf; результат отсортирован.
func (tf *testFiles) assign(owners []string) map[string][]string {
	out := map[string][]string{}
	for name := range tf.tests {
		if owner := OwnerOf(name, owners); owner != "" {
			out[owner] = append(out[owner], name)
		}
	}
	for k := range out {
		sort.Strings(out[k])
	}
	return out
}

// reach — имена, к которым обращаются тесты: напрямую или через помощников тестов.
func (tf *testFiles) reach(tests []string) map[string]bool {
	seen := map[string]bool{}
	var walk func(fn *ast.FuncDecl)
	walk = func(fn *ast.FuncDecl) {
		var visit func(n ast.Node) bool
		visit = func(n ast.Node) bool {
			switch e := n.(type) {
			case *ast.SelectorExpr:
				ast.Inspect(e.X, visit) // e.Sel — поле или метод, а не функция пакета
				return false
			case *ast.Ident:
				if helper, ok := tf.helpers[e.Name]; ok && !seen[e.Name] {
					seen[e.Name] = true
					walk(helper)
				}
				seen[e.Name] = true
			}
			return true
		}
		ast.Inspect(fn.Body, visit)
	}
	for _, name := range tests {
		walk(tf.tests[name])
	}
	return seen
}

// needs — упражнения верхнего уровня (кроме self), к которым обращаются тесты. Порядок —
// как в exercises.
func (tf *testFiles) needs(tests []string, self string, exercises []Func, topLevel map[string]bool) []string {
	seen := tf.reach(tests)
	var out []string
	for _, f := range exercises {
		if f.Name != self && topLevel[f.Name] && seen[f.Name] {
			out = append(out, f.Name)
		}
	}
	return out
}
