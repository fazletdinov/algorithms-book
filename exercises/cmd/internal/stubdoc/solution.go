package stubdoc

import (
	"errors"
	"fmt"
	"go/ast"
	"go/token"
	"sort"
	"strings"
)

// ErrNotFound — в эталоне нет запрошенной функции. Отличается от ошибки разбора:
// сервер отвечает на первую 404, на вторую — 500.
var ErrNotFound = errors.New("функции нет в эталоне")

// Solution — текст эталона одной функции из <pkg>_solution.go: её объявление (с
// док-комментарием, без тега сборки и import) и всё, без чего она не читается —
// объявления того же файла, на которые она ссылается, транзитивно, в порядке файла.
// name — «Sum» либо «Тип.Метод»; брать можно только экспортированные.
//
// Что считается «без чего не читается»: неэкспортированные функции и методы, а
// также любые типы, переменные и константы файла — метод не прочесть без полей его
// типа, а конструктор без вложенного узла. Экспортированные функции и методы чужими
// решениями не приходят: у каждой своя кнопка. Ссылку ищем по имени идентификатора,
// без типов: локальная переменная с именем чужой функции даёт лишнее объявление, а
// не пропущенное нужное.
func Solution(src []byte, name string) (string, error) {
	fset, file, err := parseSource(src)
	if err != nil {
		return "", err
	}
	root := -1
	for i, decl := range file.Decls {
		if fn, ok := decl.(*ast.FuncDecl); ok && matchesName(fn, name) {
			root = i
			break
		}
	}
	if root < 0 {
		return "", fmt.Errorf("%w: %q", ErrNotFound, name)
	}

	byName := map[string][]int{}
	for i, decl := range file.Decls {
		for _, n := range implicitNames(decl) {
			byName[n] = append(byName[n], i)
		}
	}
	included := map[int]bool{root: true}
	queue := []int{root}
	for len(queue) > 0 {
		i := queue[0]
		queue = queue[1:]
		ast.Inspect(file.Decls[i], func(n ast.Node) bool {
			if id, ok := n.(*ast.Ident); ok {
				for _, j := range byName[id.Name] {
					if !included[j] {
						included[j] = true
						queue = append(queue, j)
					}
				}
			}
			return true
		})
	}

	order := make([]int, 0, len(included))
	for i := range included {
		order = append(order, i)
	}
	sort.Ints(order)
	parts := make([]string, 0, len(order))
	for _, i := range order {
		start, end := declSpan(file.Decls[i])
		parts = append(parts, string(src[fset.Position(start).Offset:fset.Position(end).Offset]))
	}
	return strings.Join(parts, "\n\n") + "\n", nil
}

// matchesName — это объявление запрошенной экспортированной функции или метода.
func matchesName(fn *ast.FuncDecl, name string) bool {
	got, ok := exportedName(fn)
	return ok && got == name
}

// implicitNames — под какими именами объявление приходит вместе с функцией,
// которая на него ссылается (см. Solution).
func implicitNames(decl ast.Decl) []string {
	switch d := decl.(type) {
	case *ast.FuncDecl:
		if ast.IsExported(d.Name.Name) {
			return nil
		}
		return []string{d.Name.Name}
	case *ast.GenDecl:
		if d.Tok == token.IMPORT {
			return nil
		}
		var names []string
		for _, spec := range d.Specs {
			switch s := spec.(type) {
			case *ast.TypeSpec:
				names = append(names, s.Name.Name)
			case *ast.ValueSpec:
				for _, id := range s.Names {
					names = append(names, id.Name)
				}
			}
		}
		return names
	}
	return nil
}

// declSpan — границы объявления вместе с док-комментарием.
func declSpan(decl ast.Decl) (token.Pos, token.Pos) {
	var doc *ast.CommentGroup
	switch d := decl.(type) {
	case *ast.FuncDecl:
		doc = d.Doc
	case *ast.GenDecl:
		doc = d.Doc
	}
	if doc != nil {
		return doc.Pos(), decl.End()
	}
	return decl.Pos(), decl.End()
}
