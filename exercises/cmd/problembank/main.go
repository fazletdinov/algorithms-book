// Command problembank собирает банк задач тренажёра для «смешанной тренировки»
// (assets/mixed.js): условие каждой задачи, её пакет и глава-тема.
//
//	cd exercises && go run ./cmd/problembank            # перегенерировать assets/problems.js
//	cd exercises && go run ./cmd/problembank -check     # проверить, что файл актуален (CI)
//
// Зачем генератор, а не файл руками. Условия задач уже написаны — это
// док-комментарии функций в заготовках (<pkg>/<pkg>.go). Дублировать их в
// JSON означало бы завести второй источник правды, который разойдётся с первым
// на второй же правке. Поэтому банк собирается из исходников, а CI следит,
// что сгенерированное совпадает с закоммиченным.
//
// Тема задачи (глава) берётся из шапки пакета: строка вида
// «../../src/<глава>.md» есть у каждой заготовки — по ней смешанная тренировка
// и знает правильный ответ на вопрос «каким шаблоном это решается».
//
// В банк попадают только НАСТОЯЩИЕ упражнения: экспортированные функции
// верхнего уровня с док-комментарием, тело которых — panic("TODO...").
// Готовая инфраструктура (типы ListNode, хелперы) в банк не идёт.
//
// Отдельно отсеиваются задачи с однострочным условием (короче minStatement):
// «NewBST создаёт пустое дерево» — законное упражнение в своей главе, но в
// смешанной тренировке над ним нечего думать, а вопрос «каким шаблоном это
// решается» вырождается. Сколько таких отброшено, команда печатает — молча
// урезать банк нельзя, иначе непонятно, почему задач меньше, чем TODO.
package main

import (
	"bytes"
	"flag"
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
)

var chapterRe = regexp.MustCompile(`src/([\w-]+)\.md`)

// minStatement — порог «есть о чём подумать». Подобран по факту: короче него в
// тренажёре только конструкторы вида «создаёт пустое дерево».
const minStatement = 120

type problem struct {
	Pkg     string
	Fn      string
	Chapter string
	Text    string // условие: то, что видно ДО выбора шаблона
	Hint    string // подсказки: показываются ПОСЛЕ выбора
}

func main() {
	root := flag.String("root", ".", "корень модуля exercises")
	out := flag.String("out", "../assets/problems.js", "куда писать банк задач")
	check := flag.Bool("check", false, "не писать, а проверить, что файл на диске актуален")
	flag.Parse()

	problems, skipped, err := collect(*root)
	if err != nil {
		fmt.Fprintln(os.Stderr, "❌ problembank:", err)
		os.Exit(1)
	}
	if len(problems) == 0 {
		fmt.Fprintln(os.Stderr, "❌ problembank: не найдено ни одной задачи — проверь -root")
		os.Exit(1)
	}

	generated := render(problems)
	path := filepath.Join(*root, *out)

	if *check {
		onDisk, err := os.ReadFile(path)
		if err != nil {
			fmt.Fprintf(os.Stderr, "❌ problembank: %v — запусти `go run ./cmd/problembank`\n", err)
			os.Exit(1)
		}
		if !bytes.Equal(onDisk, generated) {
			fmt.Fprintf(os.Stderr,
				"❌ problembank: assets/problems.js устарел (в исходниках %d задач).\n"+
					"   Перегенерируй: cd exercises && go run ./cmd/problembank\n", len(problems))
			os.Exit(1)
		}
		fmt.Printf("✅ problembank: банк задач актуален (%d задач в %d пакетах, отброшено %d коротких)\n",
			len(problems), countPkgs(problems), skipped)
		return
	}

	if err := os.WriteFile(path, generated, 0o644); err != nil {
		fmt.Fprintln(os.Stderr, "❌ problembank:", err)
		os.Exit(1)
	}
	fmt.Printf("✅ problembank: %s — %d задач в %d пакетах (отброшено %d с однострочным условием)\n",
		path, len(problems), countPkgs(problems), skipped)
}

func countPkgs(ps []problem) int {
	seen := map[string]bool{}
	for _, p := range ps {
		seen[p.Pkg] = true
	}
	return len(seen)
}

func collect(root string) ([]problem, int, error) {
	skipped := 0
	entries, err := os.ReadDir(root)
	if err != nil {
		return nil, 0, err
	}
	var out []problem
	for _, e := range entries {
		if !e.IsDir() || e.Name() == "cmd" || strings.HasPrefix(e.Name(), ".") {
			continue
		}
		pkg := e.Name()
		stub := filepath.Join(root, pkg, pkg+".go")
		src, err := os.ReadFile(stub)
		if err != nil {
			continue // у пакета нет канонической заготовки — не упражнение
		}

		fset := token.NewFileSet()
		file, err := parser.ParseFile(fset, stub, src, parser.ParseComments|parser.SkipObjectResolution)
		if err != nil {
			return nil, 0, fmt.Errorf("%s: %w", stub, err)
		}

		chapter := ""
		if file.Doc != nil {
			if m := chapterRe.FindStringSubmatch(file.Doc.Text()); m != nil {
				chapter = m[1]
			}
		}
		if chapter == "" {
			return nil, 0, fmt.Errorf("%s: в шапке пакета нет ссылки на главу («../../src/<глава>.md») —"+
				" без неё смешанная тренировка не знает темы задачи", stub)
		}

		for _, decl := range file.Decls {
			fn, ok := decl.(*ast.FuncDecl)
			if !ok || fn.Recv != nil || fn.Doc == nil || !ast.IsExported(fn.Name.Name) {
				continue
			}
			if !hasTODO(fn, src, fset) {
				continue
			}
			text, hint := statement(fn.Doc.Text())
			if len([]rune(text)) < minStatement {
				skipped++
				continue
			}
			out = append(out, problem{
				Pkg:     pkg,
				Fn:      fn.Name.Name,
				Chapter: chapter,
				Text:    text,
				Hint:    hint,
			})
		}
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Pkg != out[j].Pkg {
			return out[i].Pkg < out[j].Pkg
		}
		return out[i].Fn < out[j].Fn
	})
	return out, skipped, nil
}

// hasTODO отличает упражнение от готовой инфраструктуры: у задачи тело —
// panic("TODO...").
func hasTODO(fn *ast.FuncDecl, src []byte, fset *token.FileSet) bool {
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

// hintPrefix — абзацы, которые в смешанной тренировке нельзя показывать сразу:
// они называют приём («Подсказка: используйте A*…») или сужают его до одного
// («Ожидаемая сложность: O(log n)» на отсортированном массиве — это и есть
// «возьми бинарный поиск»). В обычном тренажёре они остаются на месте: там
// глава уже названа, и скрывать нечего.
var hintPrefix = []string{
	"Подсказка", "Ожидаемая сложность", "Не забудьте", "Ограничение-отсечение",
	"Внимание", "Совет", "Требование:",
}

// statement делит док-комментарий на условие и подсказки, схлопывая переносы
// строк внутри абзацев (в JS это одна строка). Имя функции в начале
// («Search возвращает…») остаётся частью условия: оно видно и в сигнатуре,
// прятать его — самообман.
func statement(doc string) (text, hint string) {
	var body, hints []string
	for _, p := range strings.Split(strings.TrimSpace(doc), "\n\n") {
		p = strings.Join(strings.Fields(p), " ")
		if p == "" {
			continue
		}
		if isHint(p) {
			hints = append(hints, p)
		} else {
			body = append(body, p)
		}
	}
	return strings.Join(body, "\n"), strings.Join(hints, "\n")
}

func isHint(para string) bool {
	for _, pref := range hintPrefix {
		if strings.HasPrefix(para, pref) {
			return true
		}
	}
	return false
}

func render(ps []problem) []byte {
	var b bytes.Buffer
	b.WriteString(`/*
 * problems.js — банк задач тренажёра для смешанной тренировки (mixed.js).
 *
 * СГЕНЕРИРОВАНО: cd exercises && go run ./cmd/problembank
 * Руками не редактировать — источник правды это док-комментарии заготовок
 * (exercises/<pkg>/<pkg>.go). CI проверяет актуальность (` + "`-check`" + `).
 *
 * Поля: p — пакет тренажёра, f — функция, c — глава-тема (правильный ответ на
 * вопрос «каким шаблоном это решается»), s — условие задачи, h — подсказки из
 * док-комментария, которые называют приём и потому показываются только ПОСЛЕ
 * ответа («Подсказка: используйте A*…», «Ожидаемая сложность: O(log n)»).
 */
window.ALGO_PROBLEMS = [
`)
	for _, p := range ps {
		fmt.Fprintf(&b, "  { p: %s, f: %s, c: %s, s: %s, h: %s },\n",
			jsString(p.Pkg), jsString(p.Fn), jsString(p.Chapter), jsString(p.Text), jsString(p.Hint))
	}
	b.WriteString("];\n")
	return b.Bytes()
}

// jsString — строковый литерал JS. json.Marshal не подходит: он экранирует
// кириллицу в \uXXXX, и файл становится нечитаемым в diff'ах.
func jsString(s string) string {
	var b strings.Builder
	b.WriteByte('"')
	for _, r := range s {
		switch r {
		case '"':
			b.WriteString(`\"`)
		case '\\':
			b.WriteString(`\\`)
		case '\n':
			b.WriteString(`\n`)
		case '\r':
			b.WriteString(`\r`)
		case '\t':
			b.WriteString(`\t`)
		case ' ':
			b.WriteString(` `)
		case ' ':
			b.WriteString(` `)
		default:
			b.WriteRune(r)
		}
	}
	b.WriteByte('"')
	return b.String()
}
