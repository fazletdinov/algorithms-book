//go:build solution

package ahocorasick

import (
	"slices"
	"strings"
	"unicode/utf8"
)

type node struct {
	next map[byte]int // переходы Trie
	fail int          // самый длинный собственный суффикс пути, который тоже есть в Trie
	out  int          // ближайший по цепочке fail узел, где кончается шаблон (-1 — нет)
	pats []int        // шаблоны, которые кончаются ровно здесь
}

// Automaton — Trie шаблонов со ссылками неудачи.
type Automaton struct {
	nodes []node
	lens  []int // длины шаблонов по номерам
}

func NewAutomaton(patterns []string) *Automaton {
	a := &Automaton{nodes: []node{{next: map[byte]int{}, out: -1}}, lens: make([]int, len(patterns))}
	// 1. Обычный Trie.
	for p, pat := range patterns {
		a.lens[p] = len(pat)
		if pat == "" {
			continue
		}
		cur := 0
		for i := 0; i < len(pat); i++ {
			c := pat[i]
			nx, ok := a.nodes[cur].next[c]
			if !ok {
				nx = len(a.nodes)
				a.nodes = append(a.nodes, node{next: map[byte]int{}, out: -1})
				a.nodes[cur].next[c] = nx
			}
			cur = nx
		}
		a.nodes[cur].pats = append(a.nodes[cur].pats, p)
	}
	// 2. Ссылки неудачи — обходом в ширину: fail узла глубины d опирается на
	// fail родителя, а он глубже d-1 не бывает и к этому моменту уже посчитан.
	// Это та же идея, что префикс-функция KMP, только на дереве.
	queue := []int{}
	for _, child := range a.nodes[0].next {
		a.nodes[child].fail = 0
		queue = append(queue, child)
	}
	for len(queue) > 0 {
		u := queue[0]
		queue = queue[1:]
		for c, v := range a.nodes[u].next {
			f := a.nodes[u].fail
			for f != 0 {
				if _, ok := a.nodes[f].next[c]; ok {
					break
				}
				f = a.nodes[f].fail
			}
			if nx, ok := a.nodes[f].next[c]; ok && nx != v {
				a.nodes[v].fail = nx
			} else {
				a.nodes[v].fail = 0
			}
			fv := a.nodes[v].fail
			if len(a.nodes[fv].pats) > 0 {
				a.nodes[v].out = fv
			} else {
				a.nodes[v].out = a.nodes[fv].out
			}
			queue = append(queue, v)
		}
	}
	return a
}

// step — переход по символу с откатами по fail, как в KMP.
func (a *Automaton) step(cur int, c byte) int {
	for {
		if nx, ok := a.nodes[cur].next[c]; ok {
			return nx
		}
		if cur == 0 {
			return 0
		}
		cur = a.nodes[cur].fail
	}
}

func (a *Automaton) FindAll(text string) []Match {
	var out []Match
	cur := 0
	for i := 0; i < len(text); i++ {
		cur = a.step(cur, text[i])
		// Шаблоны, кончающиеся здесь: свои и по цепочке словарных ссылок.
		for v := cur; v != -1; v = a.nodes[v].out {
			for _, p := range a.nodes[v].pats {
				out = append(out, Match{Pattern: p, Start: i - a.lens[p] + 1})
			}
		}
	}
	SortMatches(out)
	return out
}

func (a *Automaton) ContainsAny(text string) bool {
	cur := 0
	for i := 0; i < len(text); i++ {
		cur = a.step(cur, text[i])
		if len(a.nodes[cur].pats) > 0 || a.nodes[cur].out != -1 {
			return true
		}
	}
	return false
}

func Censor(text string, banned []string) string {
	covered := make([]bool, len(text))
	lens := make([]int, len(banned))
	for i, b := range banned {
		lens[i] = len(b)
	}
	for _, m := range NewAutomaton(banned).FindAll(text) {
		for j := m.Start; j < m.Start+lens[m.Pattern]; j++ {
			covered[j] = true
		}
	}
	var b strings.Builder
	b.Grow(len(text))
	for i := 0; i < len(text); {
		_, size := utf8.DecodeRuneInString(text[i:])
		if slices.Contains(covered[i:i+size], true) {
			b.WriteByte('*')
		} else {
			b.WriteString(text[i : i+size]) // байты как есть — даже невалидный UTF-8
		}
		i += size
	}
	return b.String()
}
