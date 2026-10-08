package stubdoc

import "go/ast"

// typer угадывает тип получателя в «x.M()» по тому, что видно в AST: параметры, «x := NewT()»,
// «x := &T{}», «var x T», поля структур (s.inner.Allow). Это не проверка типов: go/types потребовал бы
// собрать пакет с зависимостями на каждый запрос. Не вывелось — тип неизвестен ("") и вызывающий
// считает зависимостью метод у каждого подходящего типа (см. LinkTests).
type typer struct {
	results    map[string]string            // функция «F» или метод «T.M» -> тип первого результата
	fields     map[string]map[string]string // тип -> поле -> тип поля
	types      map[string]bool              // объявленные типы
	interfaces map[string]bool              // объявленные интерфейсы: у них получатель неизвестен
}

func newTyper(files ...*ast.File) *typer {
	ty := &typer{
		results: map[string]string{}, fields: map[string]map[string]string{},
		types: map[string]bool{}, interfaces: map[string]bool{},
	}
	for _, file := range files {
		for _, decl := range file.Decls {
			switch d := decl.(type) {
			case *ast.FuncDecl:
				if d.Type.Results != nil && len(d.Type.Results.List) > 0 {
					ty.results[funcKey(d)] = baseTypeName(d.Type.Results.List[0].Type)
				}
			case *ast.GenDecl:
				for _, spec := range d.Specs {
					if ts, ok := spec.(*ast.TypeSpec); ok {
						ty.addType(ts)
					}
				}
			}
		}
	}
	return ty
}

func (ty *typer) addType(ts *ast.TypeSpec) {
	ty.types[ts.Name.Name] = true
	switch t := ts.Type.(type) {
	case *ast.InterfaceType:
		ty.interfaces[ts.Name.Name] = true
	case *ast.StructType:
		if ty.fields[ts.Name.Name] == nil {
			ty.fields[ts.Name.Name] = map[string]string{}
		}
		for _, field := range t.Fields.List {
			for _, name := range field.Names {
				ty.fields[ts.Name.Name][name.Name] = baseTypeName(field.Type)
			}
		}
	}
}

// scopeOf — имя переменной -> тип для параметров и локальных переменных функции (одна плоская
// область на всё тело, вместе с вложенными литералами функций).
func (ty *typer) scopeOf(fn *ast.FuncDecl) map[string]string {
	scope := map[string]string{}
	params := func(list *ast.FieldList) {
		if list == nil {
			return
		}
		for _, field := range list.List {
			for _, name := range field.Names {
				scope[name.Name] = baseTypeName(field.Type)
			}
		}
	}
	params(fn.Recv)
	params(fn.Type.Params)
	if fn.Body == nil {
		return scope
	}
	ast.Inspect(fn.Body, func(n ast.Node) bool {
		switch s := n.(type) {
		case *ast.FuncLit:
			params(s.Type.Params)
		case *ast.AssignStmt:
			for i, lhs := range s.Lhs {
				id, ok := lhs.(*ast.Ident)
				if !ok {
					continue
				}
				switch {
				case len(s.Rhs) == len(s.Lhs):
					if t := ty.typeOf(s.Rhs[i], scope); t != "" {
						scope[id.Name] = t
					}
				case i == 0 && len(s.Rhs) == 1: // x, err := NewT()
					if t := ty.typeOf(s.Rhs[0], scope); t != "" {
						scope[id.Name] = t
					}
				}
			}
		case *ast.ValueSpec:
			for i, id := range s.Names {
				switch {
				case s.Type != nil:
					scope[id.Name] = baseTypeName(s.Type)
				case len(s.Values) == len(s.Names):
					if t := ty.typeOf(s.Values[i], scope); t != "" {
						scope[id.Name] = t
					}
				}
			}
		}
		return true
	})
	return scope
}

// typeOf — имя типа выражения или "" (не вывелось).
func (ty *typer) typeOf(e ast.Expr, scope map[string]string) string {
	switch e := e.(type) {
	case *ast.Ident:
		return scope[e.Name]
	case *ast.ParenExpr:
		return ty.typeOf(e.X, scope)
	case *ast.StarExpr:
		return ty.typeOf(e.X, scope)
	case *ast.UnaryExpr:
		return ty.typeOf(e.X, scope)
	case *ast.CompositeLit:
		return baseTypeName(e.Type)
	case *ast.CallExpr:
		switch fn := e.Fun.(type) {
		case *ast.Ident:
			if ty.types[fn.Name] {
				return fn.Name // преобразование T(x)
			}
			return ty.results[fn.Name]
		case *ast.SelectorExpr:
			return ty.results[ty.typeOf(fn.X, scope)+"."+fn.Sel.Name]
		}
	case *ast.SelectorExpr:
		return ty.fields[ty.typeOf(e.X, scope)][e.Sel.Name]
	}
	return ""
}
