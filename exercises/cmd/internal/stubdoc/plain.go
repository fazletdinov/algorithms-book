package stubdoc

import (
	"fmt"
	"go/ast"
	"go/token"
	"strings"
)

// Plain — заготовка без подсказок: из док-комментариев убраны абзацы-подсказки и
// служебные абзацы (вместе с пустой строкой-разделителем), а блоки «// TODO…»
// (строка и идущие за ней строки-комментарии) убраны везде, включая тела типов.
// Остальное — условие, пример, тег сборки, panic("TODO…") — байт в байт.
//
// Правка идёт по строкам исходника, а не печатью дерева: go/printer переформатировал
// бы файл, и читатель увидел бы заготовку не такой, какая она в репозитории.
func Plain(src []byte) ([]byte, error) {
	fset, file, err := parseSource(src)
	if err != nil {
		return nil, err
	}
	lines := strings.SplitAfter(string(src), "\n")
	drop := make([]bool, len(lines)+2) // по номеру строки, с 1
	for _, group := range docGroups(file) {
		dropHintParagraphs(fset, group, drop)
	}
	for _, group := range file.Comments {
		if err := dropTODOBlock(fset, src, group, drop); err != nil {
			return nil, err
		}
	}
	var out strings.Builder
	for i, line := range lines {
		if !drop[i+1] {
			out.WriteString(line)
		}
	}
	return []byte(out.String()), nil
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
}

// dropHintParagraphs помечает к удалению строки абзацев-подсказок и служебных
// абзацев. Пустая строка-разделитель остаётся перед каждым оставшимся абзацем,
// кроме первого: оставшиеся абзацы разделены ровно одним разрывом, а перед первым
// и после последнего разрыва нет.
func dropHintParagraphs(fset *token.FileSet, group *ast.CommentGroup, drop []bool) {
	var paras []paragraph
	var words []string
	flush := func(first, last int) {
		para := strings.Join(words, " ")
		paras = append(paras, paragraph{first, last, IsHint(para) || IsService(para)})
		words = nil
	}
	first := -1
	for i, c := range group.List {
		if !strings.HasPrefix(c.Text, "//") {
			return // блочный комментарий — не наш случай, оставляем как есть
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
	keptBefore := 0
	for k, p := range paras {
		if p.hidden {
			for i := p.first; i <= p.last; i++ {
				drop[line(i)] = true
			}
		}
		// Разрыв перед абзацем k нужен, только если абзац остаётся и перед ним уже
		// что-то осталось.
		if k > 0 && (p.hidden || keptBefore == 0) {
			for i := paras[k-1].last + 1; i < p.first; i++ {
				drop[line(i)] = true
			}
		}
		if !p.hidden {
			keptBefore++
		}
	}
	if keptBefore == 0 {
		for i := range group.List {
			drop[line(i)] = true
		}
	}
}

// dropTODOBlock помечает к удалению блок «// TODO…» — строку и идущие за ней
// строки той же группы комментариев. TODO после кода в строке удалить построчно
// нельзя, и это ошибка, а не тихо оставленная подсказка.
func dropTODOBlock(fset *token.FileSet, src []byte, group *ast.CommentGroup, drop []bool) error {
	i := todoIndex(group)
	if i < 0 {
		return nil
	}
	start := group.List[i].Slash
	lineStart := fset.Position(start).Offset
	for lineStart > 0 && src[lineStart-1] != '\n' {
		lineStart--
	}
	if strings.TrimSpace(string(src[lineStart:fset.Position(start).Offset])) != "" {
		return fmt.Errorf("строка %d: TODO после кода — Plain убирает только строки-комментарии", fset.Position(start).Line)
	}
	for _, c := range group.List[i:] {
		drop[fset.Position(c.Slash).Line] = true
	}
	return nil
}
