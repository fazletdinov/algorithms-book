// Package traceinstr инструментирует функцию читателя вызовами снимков
// переменных через go/ast, чтобы потом прогнать её один раз на курируемом
// входе и получить трассу реального выполнения (не канонического примера).
//
// Поддерживаются функции с циклами for И range (в т.ч. вложенными —
// «сжимающееся окно», где внутри for живёт ещё один for, или range внутри
// for и наоборот) и if/else (в т.ч. вложенными) — снимок ставится после
// каждого оператора на любом уровне вложенности, включая нутро сработавшей
// ветки if. Это безопасно: имена, объявленные внутри цикла/ветки, включая
// ключ/значение range, используются только там же и никогда не
// просачиваются наружу (см. instrumentBlock/instrumentIf). НЕ поддерживаются:
// горутины, замыкания, рекурсия и switch/select (цикл внутри них не
// инструментируется — см. reachableLoop) — такие функции отклоняются с
// понятной причиной (*UnsupportedShapeError), а не дают кривую или неполную
// трассу.
package traceinstr

import (
	"bytes"
	"fmt"
	"go/ast"
	"go/format"
	"go/parser"
	"go/token"
	"strconv"
)

// FuncNotFoundError — в исходнике нет функции с таким именем на верхнем уровне.
type FuncNotFoundError struct{ Name string }

func (e *FuncNotFoundError) Error() string {
	return fmt.Sprintf("функция %s не найдена", e.Name)
}

// UnsupportedShapeError — форма функции не входит в поддерживаемое v1
// подмножество. Reason — готовое сообщение на русском для читателя.
type UnsupportedShapeError struct{ Reason string }

func (e *UnsupportedShapeError) Error() string { return e.Reason }

// Instrument парсит src, находит функцию funcName и возвращает исходник пакета
// с вставленными вызовами __traceEmit после каждой итерации каждого цикла
// верхнего уровня, перед каждым top-level return и в начале функции.
// __traceEmit не объявляется здесь — см. TraceHelperSource.
func Instrument(src []byte, funcName string) ([]byte, error) {
	fset := token.NewFileSet()
	file, err := parser.ParseFile(fset, funcName+".go", src, parser.ParseComments)
	if err != nil {
		return nil, fmt.Errorf("разбор исходника: %w", err)
	}

	var fn *ast.FuncDecl
	for _, d := range file.Decls {
		if f, ok := d.(*ast.FuncDecl); ok && f.Name.Name == funcName {
			fn = f
			break
		}
	}
	if fn == nil {
		return nil, &FuncNotFoundError{Name: funcName}
	}
	if fn.Recv != nil {
		return nil, &UnsupportedShapeError{Reason: "это должна быть функция верхнего уровня, а не метод"}
	}
	if fn.Body == nil {
		return nil, &UnsupportedShapeError{Reason: "у функции нет тела"}
	}
	if err := checkNoTraceCollision(file); err != nil {
		return nil, err
	}

	if err := checkShape(fn); err != nil {
		return nil, err
	}

	instrumentFunc(fset, fn, paramNames(fn))

	var buf bytes.Buffer
	if err := format.Node(&buf, fset, file); err != nil {
		return nil, fmt.Errorf("печать инструментированного файла: %w", err)
	}
	return buf.Bytes(), nil
}

// ---- проверка формы ----

// checkShape отклоняет функции вне поддерживаемого подмножества: горутины,
// замыкания, рекурсию и отсутствие достижимого цикла. Вложенные циклы (в
// т.ч. паттерн «сжимающееся окно» — for с for внутри) и range-циклы
// РАЗРЕШЕНЫ: instrumentBlock/instrumentIf рекурсируют в тела циклов (for И
// range) и if/else уже сами по себе, любой глубины, безопасно (см.
// doc-комментарий пакета), так что единственное, что здесь нужно проверить,
// — что цикл вообще ДОСТИЖИМ той же рекурсией, а не спрятан там, куда она не
// заходит (switch/select/замыкания).
func checkShape(fn *ast.FuncDecl) error {
	var hasGo, hasFuncLit, hasRecursion bool
	ast.Inspect(fn.Body, func(n ast.Node) bool {
		switch v := n.(type) {
		case *ast.GoStmt:
			hasGo = true
		case *ast.FuncLit:
			hasFuncLit = true
		case *ast.CallExpr:
			if id, ok := v.Fun.(*ast.Ident); ok && id.Name == fn.Name.Name {
				hasRecursion = true
			}
		}
		return true
	})
	switch {
	case hasGo:
		return &UnsupportedShapeError{Reason: "горутины пока не поддерживаются"}
	case hasFuncLit:
		return &UnsupportedShapeError{Reason: "замыкания пока не поддерживаются"}
	case hasRecursion:
		return &UnsupportedShapeError{Reason: "рекурсия пока не поддерживается"}
	case !reachableLoop(fn.Body.List):
		return &UnsupportedShapeError{Reason: "нужен хотя бы один цикл (for или range) в теле функции или внутри if/else (switch/select пока не поддерживаются)"}
	}
	return nil
}

// reachableLoop сообщает, есть ли *ast.ForStmt/*ast.RangeStmt на пути,
// которым реально идёт instrumentBlock/instrumentIf: тело функции, тела
// циклов (рекурсивно, любой глубины), тела if/else (рекурсивно). НЕ заходит
// в switch/select — если единственный цикл спрятан там, его никто не
// проинструментирует, и функция честно отклоняется как «нет цикла», а не
// молча даёт неполную трассу.
func reachableLoop(list []ast.Stmt) bool {
	for _, stmt := range list {
		switch s := stmt.(type) {
		case *ast.ForStmt, *ast.RangeStmt:
			return true
		case *ast.IfStmt:
			if reachableLoop(s.Body.List) {
				return true
			}
			switch e := s.Else.(type) {
			case *ast.BlockStmt:
				if reachableLoop(e.List) {
					return true
				}
			case *ast.IfStmt:
				if reachableLoop([]ast.Stmt{e}) {
					return true
				}
			}
		}
	}
	return false
}

// checkNoTraceCollision защищает от (маловероятной) коллизии имён с уже
// существующими в файле читателя — молчаливая коллизия хуже явной ошибки.
func checkNoTraceCollision(file *ast.File) error {
	for _, d := range file.Decls {
		switch decl := d.(type) {
		case *ast.FuncDecl:
			if decl.Name != nil && decl.Name.Name == traceEmitFunc {
				return fmt.Errorf("внутренняя ошибка: имя %s уже занято в исходнике читателя", traceEmitFunc)
			}
		case *ast.GenDecl:
			for _, spec := range decl.Specs {
				vs, ok := spec.(*ast.ValueSpec)
				if !ok {
					continue
				}
				for _, n := range vs.Names {
					if n.Name == traceSeqVar {
						return fmt.Errorf("внутренняя ошибка: имя %s уже занято в исходнике читателя", traceSeqVar)
					}
				}
			}
		}
	}
	return nil
}

// ---- сбор имён в области видимости ----

// paramNames — имена параметров и именованных результатов: известны в любой
// точке тела функции.
func paramNames(fn *ast.FuncDecl) []string {
	var names []string
	names = append(names, fieldListNames(fn.Type.Params)...)
	if fn.Type.Results != nil {
		names = append(names, fieldListNames(fn.Type.Results)...)
	}
	return names
}

func fieldListNames(fl *ast.FieldList) []string {
	if fl == nil {
		return nil
	}
	var names []string
	for _, f := range fl.List {
		for _, n := range f.Names {
			if n.Name != "_" {
				names = append(names, n.Name)
			}
		}
	}
	return names
}

// namesDeclaredBy возвращает имена, ВПЕРВЫЕ связанные оператором stmt через
// `:=` или `var` — то есть новые для текущей области видимости. Специально
// НЕ рекурсирует внутрь if/switch/вложенных блоков: имя, объявленное там,
// не видно снаружи, и его нельзя безопасно включить в снимок за пределами
// этого блока — это то, что держит эвристику консервативной и компилируемой.
func namesDeclaredBy(stmt ast.Stmt) []string {
	switch s := stmt.(type) {
	case *ast.AssignStmt:
		if s.Tok != token.DEFINE {
			return nil
		}
		var names []string
		for _, lhs := range s.Lhs {
			if id, ok := lhs.(*ast.Ident); ok && id.Name != "_" {
				names = append(names, id.Name)
			}
		}
		return names
	case *ast.DeclStmt:
		gd, ok := s.Decl.(*ast.GenDecl)
		if !ok || gd.Tok != token.VAR {
			return nil
		}
		var names []string
		for _, spec := range gd.Specs {
			vs, ok := spec.(*ast.ValueSpec)
			if !ok {
				continue
			}
			for _, id := range vs.Names {
				if id.Name != "_" {
					names = append(names, id.Name)
				}
			}
		}
		return names
	}
	return nil
}

// namesFromRange возвращает имена ключа/значения range-цикла, если они
// объявлены через `:=` (не `=` — переиспользование существующих переменных
// ничего нового не вводит). "_" пропускается, как и везде.
func namesFromRange(s *ast.RangeStmt) []string {
	if s.Tok != token.DEFINE {
		return nil
	}
	var names []string
	if id, ok := s.Key.(*ast.Ident); ok && id.Name != "_" {
		names = append(names, id.Name)
	}
	if id, ok := s.Value.(*ast.Ident); ok && id.Name != "_" {
		names = append(names, id.Name)
	}
	return names
}

// ---- вставка снимков ----

// instrumentFunc переписывает fn.Body.List на месте, вставляя:
//   - снимок "start" самым первым оператором (только параметры/результаты),
//     привязанный к строке заголовка функции;
//   - снимок ПОСЛЕ КАЖДОГО оператора — не только в конце итерации цикла, но и
//     внутри if/else (в т.ч. вложенных) — это то, что даёт настоящее
//     построчное прохождение, как в дебаггере IDE: видно каждую строку,
//     которая реально исполнилась, включая ту ветку if, что сработала на
//     этой конкретной итерации. Внутри цикла верхнего уровня снимки помечены
//     тегом "loopN" (N — порядковый номер цикла), вне цикла — "body". Заходить
//     внутрь if/else безопасно: имена, объявленные там, используются только
//     ВНУТРИ того же блока (никогда не просачиваются наружу — см.
//     instrumentBlock), поэтому risка сослаться на переменную не в её области
//     видимости нет;
//   - снимок "return" перед каждым return (в т.ч. внутри if/else — теперь
//     инструментируются и ранние return, чего v1 сознательно избегал),
//     привязанный к строке самого return.
func instrumentFunc(fset *token.FileSet, fn *ast.FuncDecl, base []string) {
	loopIdx := 0
	fn.Body.List = instrumentBlock(fset, fn.Body.List, base, "body", &loopIdx)
	fn.Body.List = append(
		[]ast.Stmt{emitStmt(fset.Position(fn.Pos()).Line, "start", base)},
		fn.Body.List...,
	)
}

// instrumentBlock переписывает список операторов ОДНОГО блока (тело функции,
// тело цикла верхнего уровня или тело/ветка if — рекурсирует в if/else и в
// циклы верхнего уровня, но НЕ в switch/select, см. ограничения главы),
// вставляя снимок после каждого оператора с накопленным на этот момент
// набором известных имён. known копируется в cur ЛОКАЛЬНО для этого блока:
// имена, объявленные внутри (через :=/var, включая if-инициализатор), растят
// только cur и никогда не возвращаются наружу — после блока область
// видимости вызывающего кода не меняется.
func instrumentBlock(fset *token.FileSet, list []ast.Stmt, known []string, tag string, loopIdx *int) []ast.Stmt {
	line := func(pos token.Pos) int { return fset.Position(pos).Line }
	cur := append([]string{}, known...)
	out := make([]ast.Stmt, 0, len(list)*2)
	for _, stmt := range list {
		switch s := stmt.(type) {
		case *ast.ForStmt:
			*loopIdx++
			loopTag := fmt.Sprintf("loop%d", *loopIdx)
			loopKnown := append(append([]string{}, cur...), namesDeclaredBy(s.Init)...)
			s.Body.List = instrumentBlock(fset, s.Body.List, loopKnown, loopTag, loopIdx)
			out = append(out, s)
		case *ast.RangeStmt:
			*loopIdx++
			loopTag := fmt.Sprintf("loop%d", *loopIdx)
			loopKnown := append(append([]string{}, cur...), namesFromRange(s)...)
			s.Body.List = instrumentBlock(fset, s.Body.List, loopKnown, loopTag, loopIdx)
			out = append(out, s)
		case *ast.ReturnStmt:
			// снимок ДО return — после него код недостижим.
			out = append(out, emitStmt(line(s.Pos()), "return", cur))
			out = append(out, s)
		case *ast.IfStmt:
			instrumentIf(fset, s, cur, tag, loopIdx)
			out = append(out, s)
			cur = append(cur, namesDeclaredBy(stmt)...) // если if сам объявляет что-то через Init — крайне редкий случай, но не роняем на пол
			out = append(out, emitStmt(line(stmt.Pos()), tag, cur))
		default:
			out = append(out, s)
			cur = append(cur, namesDeclaredBy(stmt)...)
			out = append(out, emitStmt(line(stmt.Pos()), tag, cur))
		}
	}
	return out
}

// instrumentIf инструментирует ветки if И (рекурсивно) else-if/else тем же
// правилом, что и обычный блок. Мутирует s на месте.
func instrumentIf(fset *token.FileSet, s *ast.IfStmt, known []string, tag string, loopIdx *int) {
	ifKnown := append(append([]string{}, known...), namesDeclaredBy(s.Init)...)
	s.Body.List = instrumentBlock(fset, s.Body.List, ifKnown, tag, loopIdx)
	switch e := s.Else.(type) {
	case *ast.BlockStmt:
		e.List = instrumentBlock(fset, e.List, ifKnown, tag, loopIdx)
	case *ast.IfStmt:
		instrumentIf(fset, e, ifKnown, tag, loopIdx)
	}
}

// emitStmt строит `__traceEmit(строка, "tag", "имя1", имя1, "имя2", имя2, ...)`.
// Дубликаты имён (например, "err" из двух разных ":="-строк) отбрасываются —
// безвредны в рантайме (карта просто перезаписалась бы), но код чище без них.
func emitStmt(sourceLine int, tag string, names []string) ast.Stmt {
	args := []ast.Expr{
		&ast.BasicLit{Kind: token.INT, Value: strconv.Itoa(sourceLine)},
		&ast.BasicLit{Kind: token.STRING, Value: strconv.Quote(tag)},
	}
	seen := make(map[string]bool, len(names))
	for _, n := range names {
		if seen[n] {
			continue
		}
		seen[n] = true
		args = append(args,
			&ast.BasicLit{Kind: token.STRING, Value: strconv.Quote(n)},
			ast.NewIdent(n),
		)
	}
	return &ast.ExprStmt{X: &ast.CallExpr{Fun: ast.NewIdent(traceEmitFunc), Args: args}}
}

// ---- файл-помощник ----

const (
	traceEmitFunc = "__traceEmit"
	traceSeqVar   = "__traceSeq"
)

const traceHelperTemplate = `package %s

import (
	"encoding/json"
	"fmt"
)

var __traceSeq int

// __traceEmit печатает снимок переменных JSON-строкой в stdout. line — номер
// строки исходника читателя, к которой привязан снимок (подсветка «текущей
// строки» на фронтенде). Кап на 2000 вызовов — вторичная защита от
// зависшего цикла; основная — таймаут процесса-харнеса на стороне раннера.
func __traceEmit(line int, tag string, kv ...any) {
	__traceSeq++
	if __traceSeq > 2000 {
		return
	}
	vars := make(map[string]any, len(kv)/2)
	for i := 0; i+1 < len(kv); i += 2 {
		if name, ok := kv[i].(string); ok {
			vars[name] = kv[i+1]
		}
	}
	b, err := json.Marshal(map[string]any{"step": __traceSeq, "line": line, "tag": tag, "vars": vars})
	if err != nil {
		b, _ = json.Marshal(map[string]any{"step": __traceSeq, "line": line, "tag": tag, "error": err.Error()})
	}
	fmt.Println("__TRACE__ " + string(b))
}
`

// TraceHelperSource возвращает исходник файла-помощника <pkg>_trace_helper.go
// для пакета pkgName — объявляет __traceEmit/__traceSeq, которые вызывает
// код, вставленный Instrument. Не зависит от конкретной инструментированной
// функции, поэтому не часть Instrument — вызывается один раз на пакет.
func TraceHelperSource(pkgName string) []byte {
	return fmt.Appendf(nil, traceHelperTemplate, pkgName)
}
