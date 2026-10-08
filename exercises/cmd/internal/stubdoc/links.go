package stubdoc

import (
	"errors"
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"path"
	"path/filepath"
	"slices"
	"sort"
	"strconv"
	"strings"
)

// Links — как упражнение связано с тестами пакета и с другими упражнениями.
type Links struct {
	// Tests — тесты, которыми владеет сама функция (правило OwnerOf среди экспортированных
	// функций верхнего уровня). У метода и у конструктора их обычно нет: такие тесты названы по типу.
	Tests []string
	// Needs — другие упражнения пакета, без которых единица прогона не пройдёт: на заготовке, где
	// решена только эта функция (у метода и конструктора — только их тип), красный прогон даст
	// panic("TODO") соседа. Имена — как Func.Name: «GCD», «Heap.Len». Сюда входит всё, до чего
	// доходят тесты единицы, и всё, что зовёт эталон единицы, транзитивно (см. LinkTests).
	Needs []string
	// Group — тип, чей это метод или конструктор (функция верхнего уровня, возвращающая тип,
	// объявленный в заготовке); "" — функция сама по себе.
	Group string
	// GroupTests — тесты типа Group: те же правила владения, но среди типов и функций.
	// Единица прогона для метода и конструктора — тип, а не отдельная функция.
	GroupTests []string
}

// LinkTests связывает упражнения заготовки с тестами пакета из dir и друг с другом. Ключ результата —
// Func.Name. solution — файл эталона (nil — без него).
//
// Единица прогона упражнения — его Tests; у метода и конструктора без собственных тестов — GroupTests
// их типа, и тогда единица — весь тип (все упражнения с тем же Group). Needs единицы — упражнения
// пакета, достижимые
//   - из тел её тестов, включая помощников из *_test.go (функции, методы, var, type) — тест сверяется
//     с соседом (BFSLevelsConc с BFSLevelsSeq) или собирает объект через методы типа (BuildHeap зовёт Heap.Len);
//   - из эталонов упражнений единицы: написав функцию по рецепту или по эталону из «сдаюсь», читатель
//     получит красный прогон, пока не решён сосед (LCM зовёт GCD, Censor — NewAutomaton и Automaton.FindAll);
//   - транзитивно, по эталонам найденных соседей.
//
// Ссылка на функцию верхнего уровня — идентификатор с её именем. Ссылка на метод — «x.M» там, где x не
// имя импортированного пакета; тип получателя из AST не вывести, поэтому «x.M» считается ссылкой на
// «T.M» для КАЖДОГО типа T пакета, у которого M — упражнение (чаще всего такой тип один). Лишняя
// зависимость безопаснее пропущенной: она просит решить соседа, а пропуск даёт красный прогон верному решению.
func LinkTests(dir string, stub, solution []byte, exercises []Func) (map[string]Links, error) {
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
	groupOf := constructors(file, types)

	out := map[string]Links{}
	members := map[string][]string{} // тип -> его упражнения
	for _, f := range exercises {
		l := Links{}
		if typ, _, isMethod := strings.Cut(f.Name, "."); isMethod {
			l.Group = typ
		} else {
			l.Group = groupOf[f.Name]
			l.Tests = own[f.Name]
		}
		if l.Group != "" {
			l.GroupTests = byType[l.Group]
			members[l.Group] = append(members[l.Group], f.Name)
		}
		out[f.Name] = l
	}

	nb, err := newNeighbours(file, solution, tests, exercises)
	if err != nil {
		return nil, err
	}
	for _, f := range exercises {
		l := out[f.Name]
		unit, unitTests := []string{f.Name}, l.Tests
		if len(l.Tests) == 0 && l.Group != "" {
			unit, unitTests = members[l.Group], l.GroupTests
		}
		if l.Needs, err = nb.needs(unit, unitTests); err != nil {
			return nil, err
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

// refs — на что ссылается код: идентификаторы и имена после точки («x.M») с типами получателя.
type refs struct {
	idents map[string]bool
	sels   map[string]map[string]bool // M -> типы получателя x в «x.M»; "" — тип не вывелся
}

func newRefs() *refs { return &refs{idents: map[string]bool{}, sels: map[string]map[string]bool{}} }

// collector собирает ссылки; pkgNames — импортированные пакеты, ty угадывает типы получателей.
type collector struct {
	pkgNames map[string]bool
	ty       *typer
}

// collect дописывает в r ссылки из узлов. Имя пакета перед точкой (sort.Ints) ссылкой не считается,
// как и имя самого объявления функции.
func (c *collector) collect(r *refs, nodes ...ast.Node) {
	var scope map[string]string
	var visit func(n ast.Node) bool
	visit = func(n ast.Node) bool {
		switch e := n.(type) {
		case *ast.SelectorExpr:
			if x, ok := e.X.(*ast.Ident); ok && c.pkgNames[x.Name] {
				return false
			}
			recv := c.ty.typeOf(e.X, scope)
			if c.ty.interfaces[recv] {
				recv = ""
			}
			if r.sels[e.Sel.Name] == nil {
				r.sels[e.Sel.Name] = map[string]bool{}
			}
			r.sels[e.Sel.Name][recv] = true
			ast.Inspect(e.X, visit)
			return false
		case *ast.FuncDecl:
			saved := scope
			scope = c.ty.scopeOf(e)
			for _, part := range []ast.Node{e.Recv, e.Type, e.Body} {
				if !isNilNode(part) {
					ast.Inspect(part, visit)
				}
			}
			scope = saved
			return false
		case *ast.Ident:
			r.idents[e.Name] = true
		}
		return true
	}
	for _, n := range nodes {
		ast.Inspect(n, visit)
	}
}

// isNilNode: ast.Inspect не любит nil-узлы, завёрнутые в интерфейс.
func isNilNode(n ast.Node) bool {
	switch v := n.(type) {
	case *ast.FieldList:
		return v == nil
	case *ast.FuncType:
		return v == nil
	case *ast.BlockStmt:
		return v == nil
	}
	return n == nil
}

// importNames — имена, под которыми файл видит импортированные пакеты.
func importNames(file *ast.File) map[string]bool {
	out := map[string]bool{}
	for _, imp := range file.Imports {
		if imp.Name != nil {
			out[imp.Name.Name] = true
			continue
		}
		p, err := strconv.Unquote(imp.Path.Value)
		if err == nil {
			out[path.Base(p)] = true
		}
	}
	return out
}

// testFiles — разобранные *_test.go пакета: тесты верхнего уровня и всё, на что они могут ссылаться.
type testFiles struct {
	tests   map[string]*ast.FuncDecl // TestXxx (кроме TestMain)
	decls   map[string][]ast.Node    // имя -> помощники: функции без получателя, var, const, type
	methods map[string][]ast.Node    // имя метода -> его объявления в тестовых файлах
	imports map[string]bool
}

func readTests(dir string) (*testFiles, error) {
	files, err := filepath.Glob(filepath.Join(dir, "*_test.go"))
	if err != nil {
		return nil, err
	}
	tf := &testFiles{
		tests: map[string]*ast.FuncDecl{}, decls: map[string][]ast.Node{},
		methods: map[string][]ast.Node{}, imports: map[string]bool{},
	}
	for _, f := range files {
		file, err := parser.ParseFile(token.NewFileSet(), f, nil, parser.SkipObjectResolution)
		if err != nil {
			return nil, fmt.Errorf("%s: %w", f, err)
		}
		for name := range importNames(file) {
			tf.imports[name] = true
		}
		for _, decl := range file.Decls {
			switch d := decl.(type) {
			case *ast.FuncDecl:
				switch {
				case d.Body == nil:
				case d.Recv != nil:
					tf.methods[d.Name.Name] = append(tf.methods[d.Name.Name], d)
				case strings.HasPrefix(d.Name.Name, "Test") && d.Name.Name != "TestMain":
					tf.tests[d.Name.Name] = d
				default:
					tf.decls[d.Name.Name] = append(tf.decls[d.Name.Name], d)
				}
			case *ast.GenDecl:
				for _, spec := range d.Specs {
					switch s := spec.(type) {
					case *ast.ValueSpec:
						for _, id := range s.Names {
							tf.decls[id.Name] = append(tf.decls[id.Name], s)
						}
					case *ast.TypeSpec:
						tf.decls[s.Name.Name] = append(tf.decls[s.Name.Name], s)
					}
				}
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

// reach — на что ссылаются тесты: напрямую и через помощников тестов (функции, методы, var, type
// из *_test.go), с множеством посещённых.
func (tf *testFiles) reach(ty *typer, tests []string) *refs {
	c := &collector{pkgNames: tf.imports, ty: ty}
	r := newRefs()
	for _, name := range tests {
		c.collect(r, tf.tests[name])
	}
	doneDecl, doneMethod := map[string]bool{}, map[string]bool{}
	for changed := true; changed; {
		changed = false
		var more []ast.Node
		for name := range r.idents {
			if !doneDecl[name] && len(tf.decls[name]) > 0 {
				doneDecl[name] = true
				more = append(more, tf.decls[name]...)
			}
		}
		for name := range r.sels {
			if !doneMethod[name] && len(tf.methods[name]) > 0 {
				doneMethod[name] = true
				more = append(more, tf.methods[name]...)
			}
		}
		if len(more) > 0 {
			c.collect(r, more...)
			changed = true
		}
	}
	return r
}

// neighbours умеет сказать, какие упражнения пакета нужны единице прогона.
type neighbours struct {
	tests    *testFiles
	solution []byte
	ty       *typer
	imports  map[string]bool
	order    []string            // упражнения в порядке файла
	topLevel map[string]bool     // упражнения без получателя
	owners   map[string][]string // имя метода -> типы, у которых оно упражнение
	cache    map[string][]string // эталон упражнения -> соседи, на которых он ссылается
}

func newNeighbours(stub *ast.File, solution []byte, tests *testFiles, exercises []Func) (*neighbours, error) {
	nb := &neighbours{
		tests: tests, solution: solution, ty: newTyper(stub), imports: map[string]bool{},
		topLevel: map[string]bool{}, owners: map[string][]string{}, cache: map[string][]string{},
	}
	if solution != nil {
		_, file, err := parseSource(solution)
		if err != nil {
			return nil, fmt.Errorf("эталон: %w", err)
		}
		nb.imports = importNames(file)
		nb.ty = newTyper(stub, file)
	}
	for _, f := range exercises {
		nb.order = append(nb.order, f.Name)
		if typ, method, isMethod := strings.Cut(f.Name, "."); isMethod {
			nb.owners[method] = append(nb.owners[method], typ)
		} else {
			nb.topLevel[f.Name] = true
		}
	}
	return nb, nil
}

// resolve переводит ссылки в имена упражнений.
func (nb *neighbours) resolve(r *refs) []string {
	var out []string
	for name := range r.idents {
		if nb.topLevel[name] {
			out = append(out, name)
		}
	}
	for method, recvs := range r.sels {
		owners := nb.owners[method]
		for recv := range recvs {
			switch {
			case recv == "": // тип не вывелся — метод у каждого подходящего типа
				for _, typ := range owners {
					out = append(out, typ+"."+method)
				}
			case slices.Contains(owners, recv):
				out = append(out, recv+"."+method)
			}
		}
	}
	return out
}

// bySolution — упражнения, на которые ссылается эталон name (вместе с его помощниками).
func (nb *neighbours) bySolution(name string) ([]string, error) {
	if got, ok := nb.cache[name]; ok {
		return got, nil
	}
	var deps []string
	if nb.solution != nil {
		code, err := Solution(nb.solution, name)
		switch {
		case err != nil && !errors.Is(err, ErrNotFound):
			return nil, err
		case err == nil:
			file, err := parser.ParseFile(token.NewFileSet(), "sol.go", "package p\n\n"+code, parser.SkipObjectResolution)
			if err != nil {
				return nil, fmt.Errorf("%s: эталон: %w", name, err)
			}
			r := newRefs()
			(&collector{pkgNames: nb.imports, ty: nb.ty}).collect(r, file)
			deps = nb.resolve(r)
		}
	}
	nb.cache[name] = deps
	return deps, nil
}

// needs — упражнения вне unit, нужные единице: из тестов unitTests и из эталонов членов unit, транзитивно.
func (nb *neighbours) needs(unit, unitTests []string) ([]string, error) {
	in := map[string]bool{}
	for _, name := range unit {
		in[name] = true
	}
	seen := map[string]bool{}
	var queue []string
	add := func(names []string) {
		for _, name := range names {
			if !in[name] && !seen[name] {
				seen[name] = true
				queue = append(queue, name)
			}
		}
	}
	if len(unitTests) > 0 {
		add(nb.resolve(nb.tests.reach(nb.ty, unitTests)))
	}
	for _, name := range unit {
		deps, err := nb.bySolution(name)
		if err != nil {
			return nil, err
		}
		add(deps)
	}
	for len(queue) > 0 {
		name := queue[0]
		queue = queue[1:]
		deps, err := nb.bySolution(name)
		if err != nil {
			return nil, err
		}
		add(deps)
	}
	var out []string
	for _, name := range nb.order {
		if seen[name] {
			out = append(out, name)
		}
	}
	return out, nil
}
