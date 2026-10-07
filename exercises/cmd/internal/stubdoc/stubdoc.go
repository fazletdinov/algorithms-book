// Package stubdoc читает заготовки тренажёра (<pkg>/<pkg>.go): условие и подсказки
// из док-комментариев, какому тесту какая функция принадлежит.
//
// Зачем отдельный пакет. Эти правила нужны двум командам: генератору банка задач
// (cmd/problembank) и локальному серверу (cmd/runner). Если бы у каждого была своя
// копия, «чей это тест» и «что считать подсказкой» разошлись бы на первой же правке,
// и тест, который банк отдаёт функции, сервер бы отдал другой.
package stubdoc

import (
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

// IsHint — абзац условия, который называет приём и потому показывается позже.
func IsHint(para string) bool {
	for _, pref := range hintPrefix {
		if strings.HasPrefix(para, pref) {
			return true
		}
	}
	return false
}

// Statement делит док-комментарий на условие и подсказки, схлопывая переносы
// строк внутри абзацев (в JS это одна строка).
func Statement(doc string) (text, hint string) {
	var body, hints []string
	for _, p := range strings.Split(strings.TrimSpace(doc), "\n\n") {
		p = strings.Join(strings.Fields(p), " ")
		if p == "" {
			continue
		}
		if IsHint(p) {
			hints = append(hints, p)
		} else {
			body = append(body, p)
		}
	}
	return strings.Join(body, "\n"), strings.Join(hints, "\n")
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
