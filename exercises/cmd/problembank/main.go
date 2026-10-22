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
// Когда глава пакета — не тот приём, которым решается именно эта функция, док-комментарий
// функции говорит об этом служебными абзацами (их читает stubdoc.MarksOf):
// «Шаблон: <слаг>» заменяет главу-ответ, «Также решается: <слаг>[, <слаг>]» называет
// главы, чей ответ тоже верен, «Признак: <текст>» — по чему приём виден в условии.
// Слаги обязаны быть настоящими главами (../src/<слаг>.md): опечатка в метке — ошибка
// генератора, а не задача с невозможным верным ответом.
//
// В банк попадают только НАСТОЯЩИЕ упражнения: экспортированные функции
// верхнего уровня с док-комментарием, тело которых — panic("TODO..."), и задачи
// на проектирование класса — типы, у чьих методов или конструктора тело
// panic("TODO..."), а в док-комментарии есть абзац «Шаблон:». Метка обязательна
// намеренно: «реализуй AVL» или «реализуй Фенвика» спрашивают о структуре, которую
// называет само имя типа, и вопрос «каким шаблоном» на них вырождается; «Шаблон:»
// ставится только там, где спроектировать класс и есть задача (MinStack, LRU,
// лента подписок). Условие такой задачи — док-комментарий типа, тесты — тесты типа.
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

	"github.com/fazletdinov/algorithms-book/exercises/cmd/internal/stubdoc"
)

var chapterRe = regexp.MustCompile(`src/([\w-]+)\.md`)

// minStatement — порог «есть о чём подумать». Подобран по факту: короче него в
// тренажёре только конструкторы вида «создаёт пустое дерево».
const minStatement = 120

type problem struct {
	Pkg        string
	Fn         string
	Chapter    string
	Text       string   // условие: то, что видно ДО выбора шаблона
	Hint       string   // подсказки: показываются ПОСЛЕ выбора
	Tests      []string // тесты именно этой функции — мок-интервью гоняет только их
	Complexity string   // эталон сложности: абзац «Ожидаемая сложность:» без префикса и точки
	Also       []string // главы, чей ответ тоже верен («Также решается:»); Chapter среди них нет
	Sign       string   // по чему приём виден в условии («Признак:»), без префикса
	Needs      []string // другие упражнения пакета, без которых Tests не пройдут
	Members    []string // у задачи на проектирование класса — упражнения типа; у функции пусто
}

// slugRe — имя главы: имя файла src/<слаг>.md. Узкое на всякий случай: слаг идёт в
// путь файла, и «../README» им не должен оказаться.
var slugRe = regexp.MustCompile(`^[a-z0-9][a-z0-9-]*$`)

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
	problems, dups := dedupe(problems)
	for _, d := range dups {
		fmt.Println("ℹ️  problembank:", d)
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

// withoutLimits — условие без строк «Ограничения: …».
func withoutLimits(text string) string {
	var keep []string
	for _, line := range strings.Split(text, "\n") {
		if !strings.HasPrefix(line, "Ограничения:") {
			keep = append(keep, line)
		}
	}
	return strings.Join(keep, "\n")
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
		// internal — служебные пакеты тестов (scaletest), не пакеты тренажёра
		if !e.IsDir() || e.Name() == "cmd" || e.Name() == "internal" || strings.HasPrefix(e.Name(), ".") {
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

		solution, _ := os.ReadFile(filepath.Join(root, pkg, pkg+"_solution.go"))
		exercises, err := stubdoc.Exercises(src, solution)
		if err != nil {
			return nil, 0, fmt.Errorf("%s: %w", stub, err)
		}
		links, err := stubdoc.LinkTests(filepath.Join(root, pkg), src, solution, exercises)
		if err != nil {
			return nil, 0, err
		}

		for _, decl := range file.Decls {
			fn, ok := decl.(*ast.FuncDecl)
			if !ok || fn.Recv != nil || fn.Doc == nil || !ast.IsExported(fn.Name.Name) {
				continue
			}
			if !stubdoc.HasTODO(fn, src, fset) {
				continue
			}
			// Метки проверяем до порога длины: опечатка в метке короткой задачи не
			// должна дожидаться, пока условие дорастёт до банка.
			answer, marks, err := answerOf(root, pkg+"."+fn.Name.Name, chapter, fn.Doc.Text())
			if err != nil {
				return nil, 0, err
			}
			text, hint := stubdoc.Statement(fn.Doc.Text())
			// Порог — по исходному условию: он отсекает однострочные конструкторы, и
			// замена длинного имени на «Функция» не должна выбрасывать LCS или Fib.
			// «Ограничения:» в длину не идут: строка размеров не делает однострочное
			// «отсортируй массив» задачей, над которой есть о чём подумать.
			if len([]rune(withoutLimits(text))) < minStatement {
				skipped++
				continue
			}
			text = neutral(text, fn.Name.Name)
			out = append(out, problem{
				Pkg:        pkg,
				Fn:         fn.Name.Name,
				Chapter:    answer,
				Text:       text,
				Hint:       hint,
				Tests:      links[fn.Name.Name].Tests,
				Needs:      links[fn.Name.Name].Needs,
				Complexity: stubdoc.Complexity(fn.Doc.Text()),
				Also:       marks.Also,
				Sign:       marks.Sign,
			})
		}
		types, err := typeProblems(root, pkg, chapter, file, exercises, links)
		if err != nil {
			return nil, 0, err
		}
		out = append(out, types...)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Pkg != out[j].Pkg {
			return out[i].Pkg < out[j].Pkg
		}
		return out[i].Fn < out[j].Fn
	})
	return out, skipped, nil
}

// typeProblems — задачи на проектирование класса в заготовке: экспортированные типы
// с «Шаблон:» в док-комментарии, у которых есть упражнения (методы или конструктор).
// Тесты задачи — тесты типа, соседи — то, что нужно упражнениям типа вне самого типа.
func typeProblems(root, pkg, chapter string, file *ast.File, exercises []stubdoc.Func,
	links map[string]stubdoc.Links) ([]problem, error) {
	var out []problem
	for _, decl := range file.Decls {
		gen, ok := decl.(*ast.GenDecl)
		if !ok || gen.Tok != token.TYPE {
			continue
		}
		for _, spec := range gen.Specs {
			ts := spec.(*ast.TypeSpec)
			doc := ts.Doc
			if doc == nil && len(gen.Specs) == 1 {
				doc = gen.Doc
			}
			if doc == nil || !ast.IsExported(ts.Name.Name) {
				continue
			}
			marks, err := stubdoc.MarksOf(doc.Text())
			if err != nil {
				return nil, fmt.Errorf("%s.%s: %w", pkg, ts.Name.Name, err)
			}
			if marks.Template == "" {
				continue
			}
			name := ts.Name.Name
			var members, tests []string
			needs := map[string]bool{}
			for _, f := range exercises {
				l := links[f.Name]
				if l.Group != name {
					continue
				}
				members = append(members, f.Name)
				tests = l.GroupTests
				for _, n := range l.Needs {
					needs[n] = true
				}
			}
			if len(members) == 0 {
				return nil, fmt.Errorf("%s.%s: «Шаблон:» у типа без упражнений — задачи на проектирование нет", pkg, name)
			}
			answer, marks, err := answerOf(root, pkg+"."+name, chapter, doc.Text())
			if err != nil {
				return nil, err
			}
			text, hint := stubdoc.Statement(doc.Text())
			if len([]rune(withoutLimits(text))) < minStatement {
				return nil, fmt.Errorf("%s.%s: условие задачи на проектирование короче %d символов", pkg, name, minStatement)
			}
			for _, m := range members {
				delete(needs, m)
			}
			out = append(out, problem{
				Pkg:        pkg,
				Fn:         name,
				Chapter:    answer,
				Text:       neutralType(text, name),
				Hint:       hint,
				Tests:      tests,
				Needs:      sortedKeys(needs),
				Complexity: stubdoc.Complexity(doc.Text()),
				Also:       marks.Also,
				Sign:       marks.Sign,
				Members:    members,
			})
		}
	}
	return out, nil
}

func sortedKeys(set map[string]bool) []string {
	var out []string
	for k := range set {
		out = append(out, k)
	}
	sort.Strings(out)
	return out
}

// answerOf — глава-ответ функции и её служебные метки. «Шаблон:» заменяет главу
// пакета; все слаги меток — настоящие главы, а «Также решается:» не повторяет
// главу-ответ: иначе один и тот же вариант был бы и «верным», и «альтернативой».
// id — «пакет.Функция» для сообщения об ошибке.
func answerOf(root, id, pkgChapter, doc string) (string, stubdoc.Marks, error) {
	marks, err := stubdoc.MarksOf(doc)
	if err != nil {
		return "", marks, fmt.Errorf("%s: %w", id, err)
	}
	answer := pkgChapter
	if marks.Template != "" {
		answer = marks.Template
		if err := chapterExists(root, answer); err != nil {
			return "", marks, fmt.Errorf("%s: «Шаблон: %s»: %w", id, answer, err)
		}
	}
	for _, slug := range marks.Also {
		if err := chapterExists(root, slug); err != nil {
			return "", marks, fmt.Errorf("%s: «Также решается: %s»: %w", id, slug, err)
		}
		if slug == answer {
			return "", marks, fmt.Errorf("%s: «Также решается» называет главу-ответ %s", id, slug)
		}
	}
	return answer, marks, nil
}

// chapterExists проверяет слаг по файлам книги: ../src/<слаг>.md от корня модуля.
func chapterExists(root, slug string) error {
	if !slugRe.MatchString(slug) {
		return fmt.Errorf("%q — не имя главы", slug)
	}
	if _, err := os.Stat(filepath.Join(root, "..", "src", slug+".md")); err != nil {
		return fmt.Errorf("нет главы src/%s.md", slug)
	}
	return nil
}

// neutral прячет имя функции в условии: «SieveOfEratosthenes возвращает…» или
// «TopKFrequent…» называют приём раньше, чем читатель его выбрал, а сигнатуру
// смешанная тренировка показывает только ПОСЛЕ ответа. В начале условия имя
// становится словом «Функция», в примерах — f: «Пример: f(5, 2) = 10».
func neutral(text, fn string) string {
	if rest, ok := strings.CutPrefix(text, fn+" "); ok {
		text = "Функция " + rest
	}
	return regexp.MustCompile(`\b`+regexp.QuoteMeta(fn)+`\b`).ReplaceAllString(text, "f")
}

// neutralType — neutral для типа: «LRUCache хранит…» становится «Тип хранит…»,
// остальные упоминания имени — T, конструктор NewLRUCache — NewT.
func neutralType(text, typ string) string {
	if rest, ok := strings.CutPrefix(text, typ+" "); ok {
		text = "Тип " + rest
	}
	text = regexp.MustCompile(`\bNew`+regexp.QuoteMeta(typ)+`\b`).ReplaceAllString(text, "NewT")
	return regexp.MustCompile(`\b`+regexp.QuoteMeta(typ)+`\b`).ReplaceAllString(text, "T")
}

// dedupe оставляет одну задачу из тех, чьи условия после neutral совпали.
// Такие задачи различало только имя (ModExp в криптографии и PowMod в теории
// чисел), и у одного и того же условия оказалось бы два «правильных» шаблона.
// Остаётся первая по порядку банка; что выброшено, команда печатает.
// Строки «Ограничения:» не сравниваются: разные пределы у одного условия
// не делают из него две задачи с разными шаблонами.
func dedupe(ps []problem) ([]problem, []string) {
	first := map[string]problem{}
	var out []problem
	var dups []string
	for _, p := range ps {
		key := withoutLimits(p.Text)
		if kept, ok := first[key]; ok {
			dups = append(dups, fmt.Sprintf("условия %s.%s и %s.%s совпали — в банке остаётся первое",
				kept.Pkg, kept.Fn, p.Pkg, p.Fn))
			continue
		}
		first[key] = p
		out = append(out, p)
	}
	return out, dups
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
 * ответа («Подсказка: используйте A*…», «Ожидаемая сложность: O(log n)»),
 * t — тесты именно этой функции (мок-интервью гоняет только их: panic("TODO")
 * в соседней функции иначе роняет весь тестовый бинарник). Пустой t значит
 * «своих тестов у функции нет» — такую задачу мок-интервью не выдаёт.
 * x — эталон сложности: абзац «Ожидаемая сложность:» без префикса и точки в конце
 * (пустой — абзаца у функции нет). a — слаги глав, чей приём тоже решает задачу
 * («Также решается:» в док-комментарии; главы c среди них нет), g — признак: по чему
 * приём виден в условии («Признак:», без префикса); у задач без разметки a пуст, g — "".
 * n — другие упражнения пакета, без которых тесты t не пройдут: тест зовёт их сам или
 * через помощников (BFSLevelsConc сверяется с BFSLevelsSeq, и на заготовке с одной
 * решённой функцией он упадёт с panic("TODO") соседа).
 * m — только у задачи на проектирование класса: f у неё — имя типа, m — его упражнения
 * (конструктор и методы), t — тесты типа; у функции поля m нет.
 */
window.ALGO_PROBLEMS = [
`)
	for _, p := range ps {
		tests := make([]string, len(p.Tests))
		for i, t := range p.Tests {
			tests[i] = jsString(t)
		}
		also := make([]string, len(p.Also))
		for i, a := range p.Also {
			also[i] = jsString(a)
		}
		needs := make([]string, len(p.Needs))
		for i, n := range p.Needs {
			needs[i] = jsString(n)
		}
		members := ""
		if len(p.Members) > 0 {
			ms := make([]string, len(p.Members))
			for i, m := range p.Members {
				ms[i] = jsString(m)
			}
			members = ", m: [" + strings.Join(ms, ", ") + "]"
		}
		fmt.Fprintf(&b, "  { p: %s, f: %s, c: %s, s: %s, h: %s, t: [%s], x: %s, a: [%s], g: %s, n: [%s]%s },\n",
			jsString(p.Pkg), jsString(p.Fn), jsString(p.Chapter), jsString(p.Text), jsString(p.Hint),
			strings.Join(tests, ", "), jsString(p.Complexity), strings.Join(also, ", "), jsString(p.Sign),
			strings.Join(needs, ", "), members)
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
