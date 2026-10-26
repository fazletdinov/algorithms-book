package stubdoc

import (
	"go/ast"
	"go/parser"
	"go/scanner"
	"go/token"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"testing"
)

// midParagraphMentions — сколько раз «Ожидаемая сложность» остаётся в Plain заготовки
// не началом абзаца, а продолжением строки (док-комментарии не переписываются: это
// условие функции, а не подсказка, и Plain убирает абзацы целиком). Это число
// вхождений, а не разрешение на пакет: лишнее вхождение роняет тест.
// hashtable — Get, Delete и Put.
var midParagraphMentions = map[string]int{
	"hashtable": 3,
}

// stubPackages — пакеты модуля, у которых есть заготовка с panic("TODO.
func stubPackages(t *testing.T) []string {
	t.Helper()
	entries, err := os.ReadDir(moduleRoot)
	if err != nil {
		t.Fatal(err)
	}
	var pkgs []string
	for _, e := range entries {
		if !e.IsDir() || e.Name() == "cmd" || strings.HasPrefix(e.Name(), ".") {
			continue
		}
		src, err := os.ReadFile(filepath.Join(moduleRoot, e.Name(), e.Name()+".go"))
		if err != nil || !strings.Contains(string(src), `panic("TODO`) {
			continue
		}
		pkgs = append(pkgs, e.Name())
	}
	if len(pkgs) < 60 {
		t.Fatalf("нашлось %d заготовок с panic(\"TODO — путь к модулю неверен?", len(pkgs))
	}
	return pkgs
}

// readSolution — эталон пакета либо nil.
func readSolution(pkg string) []byte {
	src, err := os.ReadFile(filepath.Join(moduleRoot, pkg, pkg+"_solution.go"))
	if err != nil {
		return nil
	}
	return src
}

// exercisesOf — упражнения пакета так, как их видит сервер.
func exercisesOf(t *testing.T, pkg string) []Func {
	t.Helper()
	fs, err := Exercises(readStub(t, pkg), readSolution(pkg))
	if err != nil {
		t.Fatalf("%s: %v", pkg, err)
	}
	return fs
}

// Свойства Plain на настоящих заготовках (только разбор, без запуска кода).
func TestPlainKeepsEveryRealStubCompilableShape(t *testing.T) {
	for _, pkg := range stubPackages(t) {
		t.Run(pkg, func(t *testing.T) {
			src := readStub(t, pkg)
			plain, err := Plain(src)
			if err != nil {
				t.Fatal(err)
			}
			if got, want := funcSignatures(t, plain), funcSignatures(t, src); !slices.Equal(got, want) {
				t.Errorf("функции и сигнатуры изменились:\n%v\nбыло:\n%v", got, want)
			}
			if got, want := strings.Count(string(plain), `panic("TODO`), strings.Count(string(src), `panic("TODO`); got != want {
				t.Errorf("panic(\"TODO: %d, было %d", got, want)
			}
			if !strings.HasPrefix(string(plain), "//go:build !solution\n") {
				t.Errorf("тег сборки должен остаться первой строкой")
			}
			p := string(plain)
			if got := strings.Count(p, "Ожидаемая сложность"); got != midParagraphMentions[pkg] {
				t.Errorf("«Ожидаемая сложность» в Plain: %d вхождений, ожидалось %d", got, midParagraphMentions[pkg])
			}
			if strings.Contains(p, "Подсказка") {
				t.Errorf("в Plain осталась «Подсказка»")
			}
			// Единственный «// TODO», который Plain оставляет, — нейтральная метка в теле структуры.
			if got, label := strings.Count(p, "// TODO"), strings.Count(p, "// "+typeBodyLabel+"\n"); got != label {
				t.Errorf("в Plain остались блоки «// TODO» (всего %d, меток %d)", got, label)
			}
			for _, bad := range []string{"\n// Шаблон:", "\n// Также решается:", "\n// Признак:"} {
				if strings.Contains(p, bad) {
					t.Errorf("в Plain остался служебный абзац %q", strings.TrimSpace(bad))
				}
			}
			// Plain не должен ничего убирать у кода, кроме комментариев: без комментариев
			// исходник и результат совпадают по токенам.
			if got, want := codeTokens(t, plain), codeTokens(t, src); !slices.Equal(got, want) {
				t.Errorf("Plain изменил код, а не только комментарии")
			}
			if !onlyDeletesLines(p, string(src)) {
				t.Errorf("Plain не только убирает строки: остальное должно остаться байт в байт")
			}
			// Убрать все комментарии тоже сохранило бы токены; условие каждого упражнения,
			// однако, обязано остаться как было.
			if got, want := statements(t, plain), statements(t, src); !mapsEqual(got, want) {
				t.Errorf("условия функций изменились:\n%v\nбыло:\n%v", got, want)
			}
			again, err := Plain(plain)
			if err != nil || string(again) != p {
				t.Errorf("повторный Plain меняет результат: %v", err)
			}
		})
	}
}

// statements — условие (Statement) каждой функции с док-комментарием.
func statements(t *testing.T, src []byte) map[string]string {
	t.Helper()
	file, err := parser.ParseFile(token.NewFileSet(), "x.go", src, parser.ParseComments|parser.SkipObjectResolution)
	if err != nil {
		t.Fatal(err)
	}
	out := map[string]string{}
	for _, decl := range file.Decls {
		if fn, ok := decl.(*ast.FuncDecl); ok && fn.Doc != nil {
			text, _ := Statement(fn.Doc.Text())
			out[funcKey(fn)] = text
		}
	}
	if len(out) == 0 {
		t.Fatal("ни у одной функции нет док-комментария — разбор сломан")
	}
	return out
}

func mapsEqual(a, b map[string]string) bool {
	if len(a) != len(b) {
		return false
	}
	for k, v := range a {
		if w, ok := b[k]; !ok || v != w {
			return false
		}
	}
	return true
}

// Всё, что Plain убирает, читатель может получить: подсказка и рецепт упражнения или
// заметка. Служебные абзацы («Шаблон», «Также решается») нарочно не показываются.
func TestEverythingPlainRemovesIsReachable(t *testing.T) {
	removedTotal := 0
	for _, pkg := range stubPackages(t) {
		src := readStub(t, pkg)
		plain, err := Plain(src)
		if err != nil {
			t.Fatal(err)
		}
		fs := exercisesOf(t, pkg)
		notes, err := Notes(src, fs)
		if err != nil {
			t.Fatal(err)
		}
		var reachable []string
		for _, f := range fs {
			reachable = append(reachable, f.Hint, f.Recipe)
		}
		for _, n := range notes {
			reachable = append(reachable, n.Text)
		}
		haystack := " " + normalize(strings.Join(reachable, " ")) + " "
		for _, line := range removedLines(string(plain), string(src)) {
			text := normalize(strings.TrimPrefix(strings.TrimSpace(strings.TrimPrefix(strings.TrimSpace(line), "//")), "TODO:"))
			if text == "" || IsService(text) {
				continue
			}
			removedTotal++
			if !strings.Contains(haystack, " "+text+" ") {
				t.Errorf("%s: убранная строка %q не вошла ни в hint, ни в recipe, ни в notes", pkg, strings.TrimSpace(line))
			}
		}
	}
	if removedTotal < 800 {
		t.Errorf("проверено %d убранных строк — меньше ожидаемого, сравнение строк сломано?", removedTotal)
	}
}

func normalize(s string) string { return strings.Join(strings.Fields(s), " ") }

// removedLines — строки src, которых нет в plain (plain получен из src удалением строк и
// заменой блоков TODO в телах структур меткой).
func removedLines(plain, src string) []string {
	plainLines := strings.SplitAfter(plain, "\n")
	var removed []string
	j := 0
	for _, s := range strings.SplitAfter(src, "\n") {
		for j < len(plainLines) && strings.TrimSpace(plainLines[j]) == "// "+typeBodyLabel && plainLines[j] != s {
			j++ // метка вставлена Plain, в src её нет
		}
		if j < len(plainLines) && plainLines[j] == s {
			j++
			continue
		}
		removed = append(removed, s)
	}
	return removed
}

// codeTokens — токены файла без комментариев (сканер пропускает их сам).
func codeTokens(t *testing.T, src []byte) []string {
	t.Helper()
	var sc scanner.Scanner
	fset := token.NewFileSet()
	sc.Init(fset.AddFile("x.go", fset.Base(), len(src)), src, func(pos token.Position, msg string) {
		t.Errorf("сканер: %v: %s", pos, msg)
	}, 0)
	var toks []string
	for {
		_, tok, lit := sc.Scan()
		if tok == token.EOF {
			return toks
		}
		toks = append(toks, tok.String()+" "+lit)
	}
}

// onlyDeletesLines — строки got идут в src по порядку, каждая без изменений; исключение —
// метка в теле структуры, которой в src нет.
func onlyDeletesLines(got, src string) bool {
	rest := strings.SplitAfter(src, "\n")
	for _, line := range strings.SplitAfter(got, "\n") {
		i := slices.Index(rest, line)
		if i < 0 {
			if strings.TrimSpace(line) == "// "+typeBodyLabel {
				continue
			}
			return false
		}
		rest = rest[i+1:]
	}
	return true
}

func TestSolutionOfEveryRealExercise(t *testing.T) {
	checked := 0
	for _, pkg := range allPackages(t) {
		sol := readSolution(pkg)
		if sol == nil {
			t.Errorf("%s: нет эталона", pkg)
			continue
		}
		for _, f := range exercisesOf(t, pkg) {
			code, err := Solution(sol, f.Name)
			if err != nil {
				t.Errorf("%s.%s: %v", pkg, f.Name, err)
				continue
			}
			if strings.TrimSpace(code) == "" {
				t.Errorf("%s.%s: пустой эталон", pkg, f.Name)
				continue
			}
			if strings.Contains(code, "//go:build") {
				t.Errorf("%s.%s: в эталоне остался тег сборки", pkg, f.Name)
			}
			if _, err := parser.ParseFile(token.NewFileSet(), "sol.go", "package "+pkg+"\n\n"+code, parser.SkipObjectResolution); err != nil {
				t.Errorf("%s.%s: эталон не разбирается: %v\n%s", pkg, f.Name, err, code)
			}
			checked++
		}
	}
	if checked < 300 {
		t.Errorf("проверено %d эталонов — меньше ожидаемого, список заготовок не тот?", checked)
	}
}

// Эталон не обрывается посреди вспомогательного типа и не уносит чужие решения:
// у каждого неэкспортированного типа в ответе есть все его методы из файла эталона,
// а объявлений других упражнений пакета в ответе нет.
func TestSolutionHelperTypesAreWholeAndNeighboursDoNotLeak(t *testing.T) {
	helperTypes := 0
	for _, pkg := range allPackages(t) {
		sol := readSolution(pkg)
		if sol == nil {
			continue
		}
		methods := map[string][]string{} // неэкспортированный тип -> его методы в эталоне
		for _, name := range Declared(sol) {
			if typ, _, ok := strings.Cut(name, "."); ok && !ast.IsExported(typ) {
				methods[typ] = append(methods[typ], name)
			}
		}
		fs := exercisesOf(t, pkg)
		for _, f := range fs {
			code, err := Solution(sol, f.Name)
			if err != nil {
				t.Fatalf("%s.%s: %v", pkg, f.Name, err)
			}
			src := []byte("package " + pkg + "\n\n" + code)
			have := Declared(src)
			for _, other := range fs {
				if other.Name != f.Name && slices.Contains(have, other.Name) {
					t.Errorf("%s.%s: в эталоне лежит решение другого упражнения %s", pkg, f.Name, other.Name)
				}
			}
			file, err := parser.ParseFile(token.NewFileSet(), "sol.go", src, parser.SkipObjectResolution)
			if err != nil {
				t.Fatalf("%s.%s: %v", pkg, f.Name, err)
			}
			for _, decl := range file.Decls {
				gen, ok := decl.(*ast.GenDecl)
				if !ok || gen.Tok != token.TYPE {
					continue
				}
				for _, spec := range gen.Specs {
					typ := spec.(*ast.TypeSpec).Name.Name
					if ast.IsExported(typ) || len(methods[typ]) == 0 {
						continue
					}
					helperTypes++
					for _, m := range methods[typ] {
						if !slices.Contains(have, m) {
							t.Errorf("%s.%s: у типа %s в эталоне нет метода %s", pkg, f.Name, typ, m)
						}
					}
				}
			}
		}
	}
	if helperTypes < 20 {
		t.Errorf("вспомогательных типов с методами в ответах нашлось %d — свойство проверяет слишком мало", helperTypes)
	}
}

// allPackages — пакеты с упражнениями, включая те, где в заготовке нет panic("TODO").
func allPackages(t *testing.T) []string {
	pkgs := stubPackages(t)
	for _, extra := range []string{"codereview", "profiling"} {
		if !slices.Contains(pkgs, extra) { // «panic("TODO» бывает и в тексте шапки пакета
			pkgs = append(pkgs, extra)
		}
	}
	return pkgs
}

// linksOf — связи упражнений пакета с тестами: pkg.Имя -> Links.
func linksOf(t *testing.T, pkg string) (map[string]Links, []Func) {
	t.Helper()
	fs := exercisesOf(t, pkg)
	links, err := LinkTests(filepath.Join(moduleRoot, pkg), readStub(t, pkg), readSolution(pkg), fs)
	if err != nil {
		t.Fatalf("%s: %v", pkg, err)
	}
	return links, fs
}

// expectedNeeds — упражнения, которым нужны другие упражнения пакета: тест единицы зовёт соседа (тесты
// «Conc» сверяются с «Seq», BuildHeap собирает кучу через Heap.Len/Peek/Pop) или соседа зовёт эталон
// единицы (LCM зовёт GCD, рецепт и эталон написаны через него) — транзитивно. На заготовке, где решена
// только сама единица, прогон падает с panic("TODO") соседа. Список поимённый: новая зависимость должна
// быть замечена, а не появиться молча; в части «методы» ссылка выбирается по типу получателя (см. LinkTests).
var expectedNeeds = map[string][]string{
	// тесты зовут соседа
	"intervals.InsertInterval":            {"MergeIntervals"},
	"parallelbfs.BFSLevelsConc":           {"BFSLevelsSeq"},
	"parallelbfs.BFSLevelsConcLocal":      {"BFSLevelsSeq"},
	"parallelnqueens.CountNQueensConc":    {"CountNQueensSeq"},
	"wordcount.FreqConc":                  {"FreqSeq"},
	"parallelsearch.CountOccurrencesConc": {"CountOccurrencesSeq"},
	"parallelsort.MergeSortConc":          {"MergeSortSeq"},
	"combinatorics.Permutations":          {"Binomial"},
	"sampling.BirthdayThreshold":          {"ExpectedCollisions"},
	"serializetree.Serialize":             {"Deserialize"},
	"cryptography.RSAPrivateExponent":     {"ExtendedGCD", "ModInverse", "ModExp", "RSAEncrypt", "RSADecrypt"},
	// тесты зовут методы-упражнения типа
	"binheap.BuildHeap": {"Heap.Pop", "Heap.Peek", "Heap.Len"},
	// рецепт и эталон строятся на соседе
	"numbertheory.LCM":                  {"GCD"},
	"numbertheory.ModInversePrime":      {"PowMod"},
	"numbertheory.BinomialMod":          {"PowMod", "ModInversePrime"},
	"cryptography.ModInverse":           {"ExtendedGCD"},
	"cryptography.IsProbablePrime":      {"ModExp"},
	"cryptography.RSAEncrypt":           {"ModExp"},
	"cryptography.RSADecrypt":           {"ModExp"},
	"toposort.CanFinish":                {"TopologicalSort"},
	"ahocorasick.Censor":                {"NewAutomaton", "Automaton.FindAll"},
	"ratelimiter.SafeTokenBucket.Allow": {"TokenBucket.Allow"}, // эталон: b.inner.Allow, поле inner — *TokenBucket
}

func TestNeedsAreExactlyTheKnownPairs(t *testing.T) {
	got := map[string][]string{}
	for _, pkg := range allPackages(t) {
		links, fs := linksOf(t, pkg)
		for _, f := range fs {
			if n := links[f.Name].Needs; len(n) > 0 {
				got[pkg+"."+f.Name] = n
			}
		}
	}
	for name, want := range expectedNeeds {
		if !slices.Equal(got[name], want) {
			t.Errorf("%s: needs = %v, ожидалось %v", name, got[name], want)
		}
	}
	for name, n := range got {
		if _, ok := expectedNeeds[name]; !ok {
			t.Errorf("%s: неожиданные needs %v — у остальных функций они пусты", name, n)
		}
	}
}

// noOwnTestsAllowed — упражнения, у которых нет ни собственных тестов, ни тестов типа. Храповик:
// запись, которая больше не нужна, роняет тест. Причина обязательна.
var noOwnTestsAllowed = map[string]string{
	"cryptography.RSAEncrypt":   "проверяется круговым TestRSAPrivateExponentRoundTrip, который принадлежит первой функции цикла",
	"cryptography.RSADecrypt":   "см. RSAEncrypt",
	"serializetree.Deserialize": "проверяется круговым TestSerializeRoundTrip, который принадлежит Serialize",
}

func TestEveryExerciseHasTestsOrTypeTests(t *testing.T) {
	stillNeeded := map[string]bool{}
	for _, pkg := range allPackages(t) {
		links, fs := linksOf(t, pkg)
		for _, f := range fs {
			name := pkg + "." + f.Name
			l := links[f.Name]
			if len(l.Tests) > 0 || len(l.GroupTests) > 0 {
				continue
			}
			if _, ok := noOwnTestsAllowed[name]; !ok {
				t.Errorf("%s: нет ни tests, ни groupTests — переименуй тест по имени функции или типа либо внеси в noOwnTestsAllowed с причиной", name)
			}
			stillNeeded[name] = true
		}
	}
	for name := range noOwnTestsAllowed {
		if !stillNeeded[name] {
			t.Errorf("%s: у упражнения теперь есть тесты — запись в noOwnTestsAllowed лишняя", name)
		}
	}
}

// ownershipExceptions — тесты, которые зовут ровно одно упражнение, но не входят ни в его tests, ни
// в groupTests. Храповик, как выше.
var ownershipExceptions = map[string]string{}

// Тест, тело которого (с помощниками) зовёт ровно одну функцию пакета, обязан быть в её
// tests или groupTests: иначе «прогнать только её тесты» пропускает проверку, написанную именно про неё.
func TestSingleExerciseTestsBelongToIt(t *testing.T) {
	seen := map[string]bool{}
	for _, pkg := range allPackages(t) {
		links, fs := linksOf(t, pkg)
		tf, err := readTests(filepath.Join(moduleRoot, pkg))
		if err != nil {
			t.Fatal(err)
		}
		for name := range tf.tests {
			reach := tf.reach(newTyper(), []string{name})
			var called []string
			for _, f := range fs {
				if reach.idents[f.Name] {
					called = append(called, f.Name)
				}
			}
			if len(called) != 1 {
				continue
			}
			l := links[called[0]]
			if slices.Contains(l.Tests, name) || slices.Contains(l.GroupTests, name) {
				continue
			}
			key := pkg + "." + name
			seen[key] = true
			if _, ok := ownershipExceptions[key]; !ok {
				t.Errorf("%s зовёт только %s, но не входит в её tests и groupTests", key, called[0])
			}
		}
	}
	for key := range ownershipExceptions {
		if !seen[key] {
			t.Errorf("%s: исключение больше не нужно", key)
		}
	}
}

// Тесты функции и тесты её типа не пересекаются, а у метода и конструктора группа заполнена.
func TestGroupsAreWellFormed(t *testing.T) {
	groups := map[string]bool{}
	methods := 0
	for _, pkg := range allPackages(t) {
		links, fs := linksOf(t, pkg)
		for _, f := range fs {
			l := links[f.Name]
			if typ, _, isMethod := strings.Cut(f.Name, "."); isMethod {
				methods++
				if l.Group != typ {
					t.Errorf("%s.%s: group = %q, ожидался %q", pkg, f.Name, l.Group, typ)
				}
				if len(l.Tests) != 0 {
					t.Errorf("%s.%s: у метода нет собственных tests: %+v", pkg, f.Name, l)
				}
			}
			if l.Group != "" && len(l.GroupTests) > 0 {
				groups[pkg+"."+l.Group] = true
			}
			for _, x := range l.Tests {
				if slices.Contains(l.GroupTests, x) {
					t.Errorf("%s.%s: тест %s и в tests, и в groupTests", pkg, f.Name, x)
				}
			}
			if l.Group == "" && len(l.GroupTests) != 0 {
				t.Errorf("%s.%s: groupTests без group", pkg, f.Name)
			}
		}
	}
	if methods < 80 || len(groups) < 25 {
		t.Errorf("методов %d, групп с тестами %d — меньше ожидаемого", methods, len(groups))
	}
}

func TestFuncsOfBigOIncludeMethods(t *testing.T) {
	fs, err := Funcs(readStub(t, "bigo"))
	if err != nil {
		t.Fatal(err)
	}
	if !slices.Contains(funcNames(fs), "MinStack.Top") {
		t.Errorf("в bigo нет MinStack.Top: %v", funcNames(fs))
	}
}

// codereview и profiling: заготовка — рабочий код с изъяном, panic("TODO") нет; упражнение —
// функция, объявленная и в заготовке, и в эталоне.
func TestExercisesOfPackagesWithoutTODO(t *testing.T) {
	for pkg, want := range map[string][]string{
		"codereview": {"SumSquaresConcurrent", "HasDuplicate", "ParseAndSum"},
		"profiling":  {"FormatScores"},
	} {
		got := funcNames(exercisesOf(t, pkg))
		for _, name := range want {
			if !slices.Contains(got, name) {
				t.Errorf("%s: в упражнениях нет %s: %v", pkg, name, got)
			}
		}
	}
}
