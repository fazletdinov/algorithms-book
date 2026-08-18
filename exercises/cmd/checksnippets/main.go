// Command checksnippets проверяет, что каждый Go-листинг книги — валидный Go,
// а не текст, который «выглядит как код».
//
//	cd exercises && go run ./cmd/checksnippets -src ../src
//
// Зачем отдельный инструмент. Листингов в src/*.md почти три сотни, они правятся
// руками, и до сих пор их не проверял НИКТО: `mdbook build` про Go ничего не знает,
// а тренажёр (exercises/) — отдельный код, который живёт своей жизнью. Оборванная
// на середине функция, лишняя скобка после правки, потерянная строка при
// копировании — всё это доезжает до читателя как есть.
//
// Почему только синтаксис, а не компиляция. Листинг книги намеренно НЕ
// самодостаточен: показывается метод, а не весь тип рядом с ним; вызывается
// хелпер, разобранный абзацем выше. Полная типизация даёт под две сотни
// «undefined: X» на ровном месте — она требовала бы дописать в каждый листинг то,
// что автор сознательно опустил, то есть ухудшить подачу ради зелёного CI.
// Разбор (go/parser) же ловит ровно то, что всегда является ошибкой, и не
// срабатывает ложно ни разу.
//
// Листинги бывают трёх форм, и все три законны:
//
//	декларации  — `func f() {...}`, `type T struct{...}` (разбирается как файл);
//	фрагмент    — тело цикла или пара строк (разбирается как тело функции);
//	смешанный   — import + функции + пара строк «а в stdlib это одна строка»
//	              (разбирается посегментно: см. splitTopLevel).
//
// Псевдокод (`for ... {`, «...» вместо кода) законен тоже, но его нужно ПОМЕТИТЬ —
// строкой <!-- snippet:pseudo --> прямо перед открывающим ```go. Метка невидима в
// собранной книге и делает намерение явным: непомеченный нерабочий листинг падает,
// а метка на листинге, который на самом деле разбирается, — тоже падает (иначе
// метки расползутся и перестанут что-либо значить).
package main

import (
	"flag"
	"fmt"
	"go/parser"
	"go/scanner"
	"go/token"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

const pseudoMarker = "<!-- snippet:pseudo -->"

type block struct {
	file   string
	line   int // номер строки открывающего ```go в .md
	code   string
	pseudo bool
}

func main() {
	srcDir := flag.String("src", "../src", "каталог с главами книги (*.md)")
	flag.Parse()

	entries, err := os.ReadDir(*srcDir)
	if err != nil {
		fmt.Fprintf(os.Stderr, "❌ checksnippets: не читается %s: %v\n", *srcDir, err)
		os.Exit(1)
	}
	names := make([]string, 0, len(entries))
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(e.Name(), ".md") {
			names = append(names, e.Name())
		}
	}
	sort.Strings(names)

	var blocks []block
	for _, name := range names {
		data, err := os.ReadFile(filepath.Join(*srcDir, name))
		if err != nil {
			fmt.Fprintf(os.Stderr, "❌ checksnippets: %s: %v\n", name, err)
			os.Exit(1)
		}
		blocks = append(blocks, extract(name, string(data))...)
	}

	var problems []string
	var pseudo, ok int
	for _, b := range blocks {
		err := parseAnyForm(b.code)
		switch {
		case b.pseudo && err == nil:
			problems = append(problems, fmt.Sprintf(
				"%s:%d: листинг помечен %s, но разбирается как настоящий Go — снимите метку",
				b.file, b.line, pseudoMarker))
		case b.pseudo:
			pseudo++
		case err != nil:
			problems = append(problems, fmt.Sprintf(
				"%s:%d: листинг не разбирается как Go: %v\n      (если это псевдокод — поставьте перед ```go строку %s)",
				b.file, b.line, err, pseudoMarker))
		default:
			ok++
		}
	}

	if len(problems) > 0 {
		fmt.Fprintf(os.Stderr, "❌ checksnippets: %d проблем(ы) из %d листингов:\n", len(problems), len(blocks))
		for _, p := range problems {
			fmt.Fprintln(os.Stderr, "  - "+p)
		}
		os.Exit(1)
	}
	fmt.Printf("✅ checksnippets: все %d Go-листингов книги разбираются (%d кодом, %d помечены псевдокодом)\n",
		len(blocks), ok, pseudo)
}

// extract вынимает из главы блоки ```go ... ``` вместе с номером строки и
// пометкой псевдокода. Инфо-строка сравнивается точно с "go": блоки вида ```text
// или ```bash нас не касаются.
func extract(file, text string) []block {
	var out []block
	lines := strings.Split(text, "\n")
	for i := 0; i < len(lines); i++ {
		if strings.TrimSpace(lines[i]) != "```go" {
			continue
		}
		start := i
		i++
		var body []string
		for i < len(lines) && strings.TrimSpace(lines[i]) != "```" {
			body = append(body, lines[i])
			i++
		}
		pseudo := start > 0 && strings.TrimSpace(lines[start-1]) == pseudoMarker
		out = append(out, block{
			file:   file,
			line:   start + 1,
			code:   strings.Join(body, "\n") + "\n",
			pseudo: pseudo,
		})
	}
	return out
}

// parseAnyForm пробует разобрать листинг в каждой из трёх законных форм и
// возвращает ошибку последней (самой общей) попытки, если не подошла ни одна.
func parseAnyForm(code string) error {
	if err := parseGo("package p\n" + code); err == nil {
		return nil
	}
	if err := parseGo("package p\nfunc _() {\n" + code + "\n}\n"); err == nil {
		return nil
	}
	return parseGo(assemble(code))
}

func parseGo(src string) error {
	fset := token.NewFileSet()
	_, err := parser.ParseFile(fset, "snippet.go", src, parser.SkipObjectResolution)
	if err == nil {
		return nil
	}
	// в go/parser ошибок может быть много — читателю нужна первая
	if list, isList := err.(scanner.ErrorList); isList && len(list) > 0 {
		return fmt.Errorf("%s", list[0].Msg)
	}
	return err
}

// assemble собирает из смешанного листинга (import + декларации + отдельные
// операторы вперемешку) синтетический файл: импорты наверх, декларации как есть,
// каждый непрерывный кусок операторов — в свою функцию-обёртку.
func assemble(code string) string {
	var imports, decls, stmts []string
	for _, seg := range splitTopLevel(code) {
		switch classify(seg) {
		case token.IMPORT:
			imports = append(imports, seg)
		case token.FUNC, token.TYPE, token.VAR, token.CONST:
			decls = append(decls, seg)
		default:
			stmts = append(stmts, seg)
		}
	}
	var b strings.Builder
	b.WriteString("package p\n")
	for _, s := range imports {
		b.WriteString(s)
		b.WriteString("\n")
	}
	for _, s := range decls {
		b.WriteString(s)
		b.WriteString("\n")
	}
	if len(stmts) > 0 {
		b.WriteString("func _() {\n")
		b.WriteString(strings.Join(stmts, "\n"))
		b.WriteString("\n}\n")
	}
	return b.String()
}

// splitTopLevel режет листинг на сегменты верхнего уровня: строка начинает новый
// сегмент, если к её началу все скобки закрыты И она не начинается с закрывающей
// скобки (иначе `)` многострочного import и `}` конца функции отрывались бы от
// своего сегмента). Глубина считается токенами go/scanner, а не подсчётом
// символов, — иначе скобка внутри строки или комментария («// закрываем }»)
// сдвинула бы разбиение.
func splitTopLevel(code string) []string {
	lines := strings.Split(strings.TrimRight(code, "\n"), "\n")
	depth, closer := scanLines(code, len(lines))

	var segs []string
	var cur []string
	for i, ln := range lines {
		if depth[i] == 0 && !closer[i] && strings.TrimSpace(ln) != "" && len(cur) > 0 {
			segs = append(segs, strings.Join(cur, "\n"))
			cur = nil
		}
		cur = append(cur, ln)
	}
	if len(cur) > 0 {
		segs = append(segs, strings.Join(cur, "\n"))
	}
	return segs
}

// scanLines возвращает для каждой строки глубину вложенности скобок на её начало
// и признак «строка начинается с закрывающей скобки». Строки без токенов
// (пустые, только с комментарием) наследуют глубину предыдущей.
func scanLines(code string, nLines int) (depth []int, closer []bool) {
	depth = make([]int, nLines)
	closer = make([]bool, nLines)
	for i := range depth {
		depth[i] = -1
	}

	fset := token.NewFileSet()
	f := fset.AddFile("snippet.go", fset.Base(), len(code))
	var s scanner.Scanner
	s.Init(f, []byte(code), nil, 0) // nil-обработчик: синтаксический мусор здесь не важен

	cur := 0
	for {
		pos, tok, _ := s.Scan()
		if tok == token.EOF {
			break
		}
		isOpen := tok == token.LPAREN || tok == token.LBRACE || tok == token.LBRACK
		isClose := tok == token.RPAREN || tok == token.RBRACE || tok == token.RBRACK

		if line := fset.Position(pos).Line; line >= 1 && line <= nLines && depth[line-1] == -1 {
			d := cur
			if isClose && d > 0 {
				d-- // закрывающая скобка стоит на уровне СНАРУЖИ своего блока
			}
			depth[line-1] = d
			closer[line-1] = isClose
		}
		switch {
		case isOpen:
			cur++
		case isClose && cur > 0:
			cur--
		}
	}
	for i := range depth {
		if depth[i] == -1 {
			if i > 0 {
				depth[i] = depth[i-1]
			} else {
				depth[i] = 0
			}
		}
	}
	return depth, closer
}

// classify говорит, чем начинается сегмент: объявлением (и каким) или оператором.
func classify(seg string) token.Token {
	fset := token.NewFileSet()
	f := fset.AddFile("seg.go", fset.Base(), len(seg))
	var s scanner.Scanner
	s.Init(f, []byte(seg), nil, 0)
	for {
		_, tok, _ := s.Scan()
		switch tok {
		case token.EOF:
			return token.ILLEGAL
		case token.SEMICOLON, token.COMMENT:
			continue // авто-точки с запятой от переводов строк и комментарии пропускаем
		default:
			return tok
		}
	}
}
