package stubdoc

import (
	"fmt"
	"go/ast"
	"go/token"
	"sort"
	"strings"
)

// typeBodyLabel — что остаётся от блока «// TODO…» в теле типа: задача («добавьте
// поля») видна, подсказки («основной стек и стек минимумов») — нет. Исходный текст
// блока уходит в Notes.
const typeBodyLabel = "TODO: поля"

// Plain — заготовка без подсказок: из док-комментариев убраны абзацы-подсказки и
// служебные абзацы (вместе с пустой строкой-разделителем), блоки «// TODO…» (строка и
// идущие за ней строки-комментарии) убраны везде, кроме тел структур: там блок
// заменён нейтральной строкой «// TODO: поля». Остальное — условие, пример, тег
// сборки, panic("TODO…") — байт в байт.
//
// Правка идёт по строкам исходника, а не печатью дерева: go/printer переформатировал
// бы файл, и читатель увидел бы заготовку не такой, какая она в репозитории.
// Убранный текст не пропадает: подсказки и рецепты упражнений — в Func.Hint и
// Func.Recipe, остальное — в Notes.
func Plain(src []byte) ([]byte, error) {
	s, err := strip(src)
	if err != nil {
		return nil, err
	}
	return s.plain, nil
}

// Note — убранный из заготовки текст, который не принадлежит подсказке или рецепту
// какого-либо упражнения.
type Note struct {
	At   string // «package», «type Имя» или «func Имя»
	Text string // абзац или блок TODO без «TODO:», одной строкой
}

// Notes — то, что Plain убрал и что не вошло в Hint или Recipe упражнений exercises: подсказка
// уровня пакета, подсказки к типам, рецепты полей типа. Служебные абзацы «Шаблон:» и
// «Также решается:» не показываются никому, поэтому сюда не попадают; «Признак:» у функции
// уходит в её Hint, а у типа (задача на проектирование класса) — сюда. Порядок — как в файле.
func Notes(src []byte, exercises []Func) ([]Note, error) {
	s, err := strip(src)
	if err != nil {
		return nil, err
	}
	covered := map[string]bool{}
	for _, f := range exercises {
		covered[f.Name] = true
	}
	var notes []Note
	for _, r := range s.removed {
		if (r.service && !strings.HasPrefix(r.text, prefixSign)) || covered[r.key] {
			continue
		}
		notes = append(notes, Note{At: r.at, Text: r.text})
	}
	return notes, nil
}

// removal — один убранный кусок текста.
type removal struct {
	pos     token.Pos
	at      string // см. Note.At
	key     string // имя функции, если убрано из её комментария или тела, иначе ""
	text    string
	service bool // служебный абзац: метка для банка, читателю не показывается
}

type stripped struct {
	plain   []byte
	removed []removal // в порядке файла
}

func strip(src []byte) (*stripped, error) {
	fset, file, err := parseSource(src)
	if err != nil {
		return nil, err
	}
	lines := strings.SplitAfter(string(src), "\n")
	edit := &lineEdit{drop: make([]bool, len(lines)+2), label: map[int]string{}}
	var removed []removal
	where := func(pos token.Pos) removal {
		at, key := whereIs(file, pos)
		return removal{pos: pos, at: at, key: key}
	}
	for _, group := range docGroups(file) {
		for _, p := range dropHintParagraphs(fset, group, edit) {
			r := where(p.pos)
			r.text, r.service = p.text, p.service
			removed = append(removed, r)
		}
	}
	for _, group := range file.Comments {
		r, ok, err := dropTODOBlock(fset, file, src, lines, group, edit)
		if err != nil {
			return nil, err
		}
		if ok {
			w := where(r.pos)
			r.at, r.key = w.at, w.key
			removed = append(removed, r)
		}
	}
	sort.SliceStable(removed, func(i, j int) bool { return removed[i].pos < removed[j].pos })

	var out strings.Builder
	for i, line := range lines {
		switch label, ok := edit.label[i+1]; {
		case ok:
			out.WriteString(label)
		case !edit.drop[i+1]:
			out.WriteString(line)
		}
	}
	return &stripped{plain: []byte(out.String()), removed: removed}, nil
}

// lineEdit — что сделать со строками исходника: убрать (по номеру, с 1) или заменить.
type lineEdit struct {
	drop  []bool
	label map[int]string
}

// whereIs — где в файле стоит позиция: комментарий пакета и объявления без имени
// типа или функции — «package».
func whereIs(file *ast.File, pos token.Pos) (at, key string) {
	for _, decl := range file.Decls {
		start, end := declSpan(decl)
		if pos < start || pos >= end {
			continue
		}
		switch d := decl.(type) {
		case *ast.FuncDecl:
			return "func " + funcKey(d), funcKey(d)
		case *ast.GenDecl:
			if name := typeAt(d, pos); name != "" {
				return "type " + name, ""
			}
		}
		break
	}
	return "package", ""
}

// typeAt — имя типа, внутри объявления которого стоит pos ("" — не тип).
func typeAt(d *ast.GenDecl, pos token.Pos) string {
	if d.Tok != token.TYPE {
		return ""
	}
	name := ""
	for _, spec := range d.Specs {
		ts := spec.(*ast.TypeSpec)
		start := ts.Pos()
		if ts.Doc != nil {
			start = ts.Doc.Pos()
		}
		if name == "" || start <= pos {
			name = ts.Name.Name
		}
	}
	return name
}

// docGroups — док-комментарии файла: пакета, функций, типов, переменных, констант
// и полей. Подсказка бывает и в комментарии пакета («Подсказка: k позиций удобно
// получить из двух хешей…»).
func docGroups(file *ast.File) []*ast.CommentGroup {
	seen := map[*ast.CommentGroup]bool{}
	var groups []*ast.CommentGroup
	add := func(g *ast.CommentGroup) {
		if g != nil && !seen[g] {
			seen[g] = true
			groups = append(groups, g)
		}
	}
	ast.Inspect(file, func(n ast.Node) bool {
		switch n := n.(type) {
		case *ast.File:
			add(n.Doc)
		case *ast.FuncDecl:
			add(n.Doc)
		case *ast.GenDecl:
			add(n.Doc)
		case *ast.TypeSpec:
			add(n.Doc)
		case *ast.ValueSpec:
			add(n.Doc)
		case *ast.Field:
			add(n.Doc)
		}
		return true
	})
	return groups
}

// paragraph — непрерывный участок непустых строк док-комментария: номера
// комментариев группы от first до last включительно; hidden — подсказка или
// служебный абзац, читателю не показывается.
type paragraph struct {
	first, last int
	hidden      bool
	service     bool
	text        string // слова абзаца через пробел
}

// hiddenText — убранный абзац для Notes и проверок.
type hiddenText struct {
	pos     token.Pos
	text    string
	service bool
}

// dropHintParagraphs помечает к удалению строки абзацев-подсказок и служебных
// абзацев и возвращает их тексты. Пустая строка-разделитель остаётся перед каждым
// оставшимся абзацем, кроме первого: оставшиеся абзацы разделены ровно одним
// разрывом, а перед первым и после последнего разрыва нет.
func dropHintParagraphs(fset *token.FileSet, group *ast.CommentGroup, edit *lineEdit) []hiddenText {
	var paras []paragraph
	var words []string
	flush := func(first, last int) {
		para := strings.Join(words, " ")
		service := IsService(para)
		paras = append(paras, paragraph{first, last, IsHint(para) || service, service, para})
		words = nil
	}
	first := -1
	for i, c := range group.List {
		if !strings.HasPrefix(c.Text, "//") {
			return nil // блочный комментарий — не наш случай, оставляем как есть
		}
		text := commentText(c)
		if text == "" {
			if first >= 0 {
				flush(first, i-1)
				first = -1
			}
			continue
		}
		if first < 0 {
			first = i
		}
		words = append(words, strings.Fields(text)...)
	}
	if first >= 0 {
		flush(first, len(group.List)-1)
	}

	line := func(i int) int { return fset.Position(group.List[i].Slash).Line }
	var hidden []hiddenText
	keptBefore := 0
	for k, p := range paras {
		if p.hidden {
			for i := p.first; i <= p.last; i++ {
				edit.drop[line(i)] = true
			}
			hidden = append(hidden, hiddenText{group.List[p.first].Slash, p.text, p.service})
		}
		// Разрыв перед абзацем k нужен, только если абзац остаётся и перед ним уже
		// что-то осталось.
		if k > 0 && (p.hidden || keptBefore == 0) {
			for i := paras[k-1].last + 1; i < p.first; i++ {
				edit.drop[line(i)] = true
			}
		}
		if !p.hidden {
			keptBefore++
		}
	}
	if keptBefore == 0 {
		for i := range group.List {
			edit.drop[line(i)] = true
		}
	}
	return hidden
}

// dropTODOBlock помечает к удалению блок «// TODO…» — строку и идущие за ней
// строки той же группы комментариев; в теле структуры первая строка заменяется
// на typeBodyLabel. TODO после кода в строке удалить построчно нельзя, и это
// ошибка, а не тихо оставленная подсказка.
func dropTODOBlock(fset *token.FileSet, file *ast.File, src []byte, lines []string, group *ast.CommentGroup, edit *lineEdit) (removal, bool, error) {
	i := todoIndex(group)
	if i < 0 {
		return removal{}, false, nil
	}
	first := group.List[i]
	offset := fset.Position(first.Slash).Offset
	lineStart := offset
	for lineStart > 0 && src[lineStart-1] != '\n' {
		lineStart--
	}
	indent := string(src[lineStart:offset])
	if strings.TrimSpace(indent) != "" {
		return removal{}, false, fmt.Errorf("строка %d: TODO после кода — Plain убирает только строки-комментарии", fset.Position(first.Slash).Line)
	}
	inStruct := inStructBody(file, first.Slash)
	if inStruct && i == len(group.List)-1 && commentText(first) == typeBodyLabel {
		return removal{}, false, nil // метка от прошлого Plain: повторный проход ничего не меняет
	}
	var words []string
	for j, c := range group.List[i:] {
		text := commentText(c)
		if j == 0 {
			text, _ = todoRest(text)
		}
		words = append(words, strings.Fields(text)...)
		edit.drop[fset.Position(c.Slash).Line] = true
	}
	if inStruct {
		line := fset.Position(first.Slash).Line
		edit.drop[line] = false
		edit.label[line] = indent + "// " + typeBodyLabel + lineEnd(lines[line-1])
	}
	return removal{pos: first.Slash, text: strings.Join(words, " ")}, true, nil
}

func lineEnd(line string) string {
	if strings.HasSuffix(line, "\n") {
		return "\n"
	}
	return ""
}

// inStructBody — pos стоит между скобками структуры, объявленной на верхнем уровне.
func inStructBody(file *ast.File, pos token.Pos) bool {
	for _, decl := range file.Decls {
		gen, ok := decl.(*ast.GenDecl)
		if !ok || gen.Tok != token.TYPE {
			continue
		}
		for _, spec := range gen.Specs {
			if st, ok := spec.(*ast.TypeSpec).Type.(*ast.StructType); ok && st.Fields != nil &&
				st.Fields.Opening < pos && pos < st.Fields.Closing {
				return true
			}
		}
	}
	return false
}
