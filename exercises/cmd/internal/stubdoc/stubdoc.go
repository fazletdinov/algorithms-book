// Package stubdoc читает заготовки тренажёра (<pkg>/<pkg>.go): условие и подсказки
// из док-комментариев, какому тесту какая функция принадлежит, заготовку без
// подсказок и эталон одной функции.
//
// Зачем отдельный пакет. Эти правила нужны двум командам: генератору банка задач
// (cmd/problembank) и локальному серверу (cmd/runner). Если бы у каждого была своя
// копия, «чей это тест» и «что считать подсказкой» разошлись бы на первой же правке,
// и тест, который банк отдаёт функции, сервер бы отдал другой.
//
// Абзацы док-комментария функции делятся на три рода. Условие — всё, что не ниже.
// Подсказки (IsHint) называют приём или сужают его до одного. Служебные (IsService) —
// «Шаблон: <слаг>», «Также решается: <слаг>[, <слаг>]», «Признак: <текст>» — говорят
// смешанной тренировке, какая глава верна на самом деле: ни условием, ни подсказкой
// они не показываются.
package stubdoc

import (
	"bytes"
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"path/filepath"
	"sort"
	"strings"
)

// hintPrefix — абзацы, которые в смешанной тренировке нельзя показывать сразу:
// они называют приём («Подсказка: используйте A*…») или сужают его до одного
// («Ожидаемая сложность: O(log n)» на отсортированном массиве — это и есть
// «возьми бинарный поиск»). В обычном тренажёре они остаются на месте: там
// глава уже названа, и скрывать нечего.
var hintPrefix = []string{
	"Подсказка", "Ожидаемая сложность", "Не забудьте", "Ограничение-отсечение",
	"Внимание", "Совет", "Требование:",
}

const (
	prefixTemplate   = "Шаблон:"
	prefixAlso       = "Также решается:"
	prefixSign       = "Признак:"
	prefixComplexity = "Ожидаемая сложность:"
)

// IsHint — абзац условия, который называет приём и потому показывается позже.
func IsHint(para string) bool {
	for _, pref := range hintPrefix {
		if strings.HasPrefix(para, pref) {
			return true
		}
	}
	return false
}

// IsService — служебный абзац: метка для банка задач, а не текст для читателя.
func IsService(para string) bool {
	return strings.HasPrefix(para, prefixTemplate) ||
		strings.HasPrefix(para, prefixAlso) ||
		strings.HasPrefix(para, prefixSign)
}

// paragraphs режет док-комментарий на абзацы, схлопывая переносы строк внутри.
func paragraphs(doc string) []string {
	var out []string
	for _, p := range strings.Split(strings.TrimSpace(doc), "\n\n") {
		if p = strings.Join(strings.Fields(p), " "); p != "" {
			out = append(out, p)
		}
	}
	return out
}

// Statement делит док-комментарий на условие и подсказки, схлопывая переносы
// строк внутри абзацев (в JS это одна строка). Служебные абзацы не попадают ни
// туда, ни туда.
func Statement(doc string) (text, hint string) {
	var body, hints []string
	for _, p := range paragraphs(doc) {
		switch {
		case IsService(p):
		case IsHint(p):
			hints = append(hints, p)
		default:
			body = append(body, p)
		}
	}
	return strings.Join(body, "\n"), strings.Join(hints, "\n")
}

// Complexity — абзац «Ожидаемая сложность:» без префикса и точки в конце, либо "".
// Берётся только абзац, начинающийся с префикса: фраза посреди абзаца («…таблица
// не меняется. Ожидаемая сложность: …») — часть условия.
func Complexity(doc string) string {
	for _, p := range paragraphs(doc) {
		if rest, ok := strings.CutPrefix(p, prefixComplexity); ok {
			return strings.TrimSuffix(strings.TrimSpace(rest), ".")
		}
	}
	return ""
}

// Marks — служебные абзацы док-комментария функции.
type Marks struct {
	Template string   // «Шаблон: <слаг>» — глава, которая верна вместо главы пакета
	Also     []string // «Также решается: <слаг>[, <слаг>]» — главы, чей приём тоже подходит
	Sign     string   // «Признак: <текст>» — по чему в условии узнаётся приём (без префикса)
}

// MarksOf читает служебные абзацы. Один род метки — один абзац: два «Шаблона» не
// скажут, какой верный, поэтому это ошибка. Пустой слаг тоже: опечатка в метке не
// должна тихо превратиться в «метки нет».
func MarksOf(doc string) (Marks, error) {
	var m Marks
	seen := map[string]bool{}
	for _, p := range paragraphs(doc) {
		for _, prefix := range []string{prefixTemplate, prefixAlso, prefixSign} {
			rest, ok := strings.CutPrefix(p, prefix)
			if !ok {
				continue
			}
			if seen[prefix] {
				return Marks{}, fmt.Errorf("два абзаца %q", prefix)
			}
			seen[prefix] = true
			rest = strings.TrimSpace(rest)
			switch prefix {
			case prefixTemplate:
				m.Template = strings.TrimSpace(strings.TrimSuffix(rest, "."))
				if m.Template == "" {
					return Marks{}, fmt.Errorf("пустой %q", prefix)
				}
			case prefixAlso:
				for _, s := range strings.Split(strings.TrimSuffix(rest, "."), ",") {
					if s = strings.TrimSpace(s); s == "" {
						return Marks{}, fmt.Errorf("пустой слаг в %q", prefix)
					}
					m.Also = append(m.Also, s)
				}
			case prefixSign:
				m.Sign = rest
				if m.Sign == "" {
					return Marks{}, fmt.Errorf("пустой %q", prefix)
				}
			}
		}
	}
	return m, nil
}

// Func — упражнение заготовки: функция или метод с panic("TODO…") в теле.
type Func struct {
	Name   string   // «Sum» или «Тип.Метод»
	Tests  []string // заполняет вызывающий (AssignTests), и только у функций верхнего уровня
	Hint   string   // «Признак: …» и абзацы-подсказки через \n; подсказок нет — ""
	Recipe string   // блок «// TODO:» из тела одной строкой, без «//» и «TODO:»
}

// Funcs перечисляет упражнения заготовки в порядке файла: экспортированные функции
// и методы экспортированных типов, у которых в теле panic("TODO…").
func Funcs(src []byte) ([]Func, error) {
	fset, file, err := parseSource(src)
	if err != nil {
		return nil, err
	}
	var out []Func
	for _, decl := range file.Decls {
		fn, ok := decl.(*ast.FuncDecl)
		if !ok || !HasTODO(fn, src, fset) {
			continue
		}
		name, ok := exportedName(fn)
		if !ok {
			continue
		}
		f := Func{Name: name, Recipe: recipeOf(file, fn)}
		if fn.Doc != nil {
			if f.Hint, err = hintOf(fn.Doc.Text()); err != nil {
				return nil, fmt.Errorf("%s: %w", name, err)
			}
		}
		out = append(out, f)
	}
	return out, nil
}

// hintOf — то, что читатель увидит за кнопкой подсказки: признак приёма, затем
// абзацы-подсказки в порядке документа.
func hintOf(doc string) (string, error) {
	marks, err := MarksOf(doc)
	if err != nil {
		return "", err
	}
	_, hints := Statement(doc)
	var parts []string
	if marks.Sign != "" {
		parts = append(parts, prefixSign+" "+marks.Sign)
	}
	if hints != "" {
		parts = append(parts, hints)
	}
	return strings.Join(parts, "\n"), nil
}

// recipeOf собирает блоки «// TODO:» из тела функции в одну строку.
func recipeOf(file *ast.File, fn *ast.FuncDecl) string {
	var words []string
	for _, group := range file.Comments {
		if group.Pos() < fn.Body.Lbrace || group.End() > fn.Body.Rbrace {
			continue
		}
		i := todoIndex(group)
		if i < 0 {
			continue
		}
		for j := i; j < len(group.List); j++ {
			text := commentText(group.List[j])
			if j == i {
				text, _ = todoRest(text)
			}
			words = append(words, strings.Fields(text)...)
		}
	}
	return strings.Join(words, " ")
}

// HasTODO отличает упражнение от готовой инфраструктуры: у задачи тело —
// panic("TODO...").
func HasTODO(fn *ast.FuncDecl, src []byte, fset *token.FileSet) bool {
	if fn.Body == nil {
		return false
	}
	start := fset.Position(fn.Body.Pos()).Offset
	end := fset.Position(fn.Body.End()).Offset
	if start < 0 || end > len(src) || start >= end {
		return false
	}
	return bytes.Contains(src[start:end], []byte(`panic("TODO`))
}

// TopLevelFuncs — имена ВСЕХ экспортированных функций верхнего уровня заготовки,
// не только упражнений: тест делится между функциями по самому длинному имени,
// и конкурентом может оказаться функция, которую упражнением не считают.
func TopLevelFuncs(src []byte) ([]string, error) {
	_, file, err := parseSource(src)
	if err != nil {
		return nil, err
	}
	var names []string
	for _, decl := range file.Decls {
		if fn, ok := decl.(*ast.FuncDecl); ok && fn.Recv == nil && ast.IsExported(fn.Name.Name) {
			names = append(names, fn.Name.Name)
		}
	}
	return names, nil
}

func parseSource(src []byte) (*token.FileSet, *ast.File, error) {
	fset := token.NewFileSet()
	file, err := parser.ParseFile(fset, "stub.go", src, parser.ParseComments|parser.SkipObjectResolution)
	if err != nil {
		return nil, nil, err
	}
	return fset, file, nil
}

// exportedName — имя вида «Sum» либо «Тип.Метод»; false, если функция (или тип
// метода) не экспортирована и читателю она не задана.
func exportedName(fn *ast.FuncDecl) (string, bool) {
	if !ast.IsExported(fn.Name.Name) {
		return "", false
	}
	if fn.Recv == nil {
		return fn.Name.Name, true
	}
	recv := recvTypeName(fn)
	if !ast.IsExported(recv) {
		return "", false
	}
	return recv + "." + fn.Name.Name, true
}

// recvTypeName — имя типа получателя: T для (t T), (t *T), (t *T[K, V]).
func recvTypeName(fn *ast.FuncDecl) string {
	if fn.Recv == nil || len(fn.Recv.List) == 0 {
		return ""
	}
	expr := fn.Recv.List[0].Type
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

// commentText — текст строчного комментария без «//» и обрамляющих пробелов;
// у блочного комментария «/* */» — "": такими заготовки не пользуются.
func commentText(c *ast.Comment) string {
	text, ok := strings.CutPrefix(c.Text, "//")
	if !ok {
		return ""
	}
	return strings.TrimSpace(text)
}

// todoRest отрезает от строки «TODO: рецепт» слово TODO и двоеточие. false — строка
// не начинается с TODO (и «TODOS» — тоже не TODO).
func todoRest(text string) (string, bool) {
	rest, ok := strings.CutPrefix(text, "TODO")
	if !ok {
		return text, false
	}
	if rest != "" && isIdentByte(rest[0]) {
		return text, false
	}
	rest = strings.TrimPrefix(rest, ":")
	return strings.TrimSpace(rest), true
}

func isIdentByte(c byte) bool {
	return c == '_' || c >= '0' && c <= '9' || c >= 'a' && c <= 'z' || c >= 'A' && c <= 'Z'
}

// todoIndex — номер первого комментария группы, начинающегося с TODO, либо -1.
func todoIndex(group *ast.CommentGroup) int {
	for i, c := range group.List {
		if _, ok := todoRest(commentText(c)); ok {
			return i
		}
	}
	return -1
}

// AssignTests раздаёт тесты пакета функциям по соглашению об именах:
// TestF, TestFRandom, TestF_Edge принадлежат F. Спорный тест уходит функции с
// САМЫМ ДЛИННЫМ совпавшим именем: TestSubsetsWithDup начинается и на «Subsets»,
// но принадлежит SubsetsWithDup — иначе мок-интервью по Subsets гоняло бы чужой
// тест, а Subsets без SubsetsWithDup его не пройдёт никогда.
// Тесты, которые не совпали ни с одной функцией, не достаются никому.
func AssignTests(dir string, funcs []string) (map[string][]string, error) {
	files, err := filepath.Glob(filepath.Join(dir, "*_test.go"))
	if err != nil {
		return nil, err
	}
	out := map[string][]string{}
	for _, f := range files {
		file, err := parser.ParseFile(token.NewFileSet(), f, nil, parser.SkipObjectResolution)
		if err != nil {
			return nil, fmt.Errorf("%s: %w", f, err)
		}
		for _, decl := range file.Decls {
			fn, ok := decl.(*ast.FuncDecl)
			if !ok || fn.Recv != nil || !strings.HasPrefix(fn.Name.Name, "Test") || fn.Name.Name == "TestMain" {
				continue
			}
			if owner := OwnerOf(fn.Name.Name, funcs); owner != "" {
				out[owner] = append(out[owner], fn.Name.Name)
			}
		}
	}
	for k := range out {
		sort.Strings(out[k])
	}
	return out, nil
}

// OwnerOf — функция, которой принадлежит тест: имя после «Test» совпадает с ней
// целиком или продолжается с заглавной буквы, цифры или «_» (TestFoo не
// принадлежит Fo — «o» строчная, это другое слово).
func OwnerOf(test string, funcs []string) string {
	rest := strings.TrimPrefix(test, "Test")
	best := ""
	for _, f := range funcs {
		if !strings.HasPrefix(rest, f) || len(f) <= len(best) {
			continue
		}
		if tail := rest[len(f):]; tail == "" || !isLowerStart(tail) {
			best = f
		}
	}
	return best
}

func isLowerStart(s string) bool {
	c := s[0]
	return c >= 'a' && c <= 'z'
}
