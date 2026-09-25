// Готовая инфраструктура пакета — не задача. Лежит без build-тега: нужна и
// заготовке, и эталону, и тестам как модель для сверки.

package ahocorasick

import (
	"slices"
	"strings"
)

// Match — одно вхождение: номер шаблона в исходном списке и байтовое смещение
// начала вхождения в тексте.
type Match struct {
	Pattern int
	Start   int
}

// NaiveFindAll — все вхождения всех шаблонов тупым способом: для каждого шаблона
// отдельный проход strings.Index, O(n) на шаблон, то есть O(n·k) на k шаблонов.
// Контракт тот же, что у Automaton.FindAll: вхождения перекрываются, пустые
// шаблоны пропускаются, результат упорядочен по Start, а при равном Start — по
// номеру шаблона. Дан готовым как точка отсчёта и как модель для тестов.
func NaiveFindAll(text string, patterns []string) []Match {
	var out []Match
	for p, pat := range patterns {
		if pat == "" {
			continue
		}
		for from := 0; ; {
			i := strings.Index(text[from:], pat)
			if i < 0 {
				break
			}
			out = append(out, Match{Pattern: p, Start: from + i})
			from += i + 1 // +1, а не +len(pat): вхождения могут перекрываться
		}
	}
	SortMatches(out)
	return out
}

// SortMatches упорядочивает вхождения по контракту пакета: по Start, затем по
// номеру шаблона.
func SortMatches(ms []Match) {
	slices.SortFunc(ms, func(a, b Match) int {
		if a.Start != b.Start {
			return a.Start - b.Start
		}
		return a.Pattern - b.Pattern
	})
}
