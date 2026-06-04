//go:build solution

package trie

type Trie struct {
	children [26]*Trie
	isEnd    bool
}

func NewTrie() *Trie { return &Trie{} }

func (t *Trie) Insert(word string) {
	node := t
	for i := 0; i < len(word); i++ {
		c := word[i] - 'a'
		if node.children[c] == nil {
			node.children[c] = &Trie{}
		}
		node = node.children[c]
	}
	node.isEnd = true
}

func (t *Trie) find(s string) *Trie {
	node := t
	for i := 0; i < len(s); i++ {
		c := s[i] - 'a'
		if node.children[c] == nil {
			return nil
		}
		node = node.children[c]
	}
	return node
}

func (t *Trie) Search(word string) bool {
	node := t.find(word)
	return node != nil && node.isEnd
}

func (t *Trie) StartsWith(prefix string) bool {
	return t.find(prefix) != nil
}

func (t *Trie) Delete(word string) bool {
	node := t.find(word)
	if node == nil || !node.isEnd {
		return false
	}
	node.isEnd = false
	t.prune(word)
	return true
}

// prune обрезает висячие узлы на пути слова: идя от конца к началу, удаляет
// ссылку на ребёнка, если тот не является концом слова и не имеет детей.
func (t *Trie) prune(word string) {
	// Запоминаем путь от корня до конца слова.
	path := make([]*Trie, len(word)+1)
	node := t
	path[0] = node
	for i := 0; i < len(word); i++ {
		node = node.children[word[i]-'a']
		path[i+1] = node
	}
	for i := len(word) - 1; i >= 0; i-- {
		child := path[i+1]
		if child.isEnd || child.hasChildren() {
			break
		}
		path[i].children[word[i]-'a'] = nil
	}
}

func (t *Trie) hasChildren() bool {
	for _, c := range t.children {
		if c != nil {
			return true
		}
	}
	return false
}

func (t *Trie) WordsWithPrefix(prefix string) []string {
	words := []string{}
	node := t.find(prefix)
	if node == nil {
		return words
	}
	buf := []byte(prefix)
	node.collect(&buf, &words)
	return words
}

// collect выполняет DFS, перебирая детей в порядке 'a'..'z', и добавляет
// каждое завершённое слово в words. buf хранит текущий путь от корня.
func (t *Trie) collect(buf *[]byte, words *[]string) {
	if t.isEnd {
		*words = append(*words, string(*buf))
	}
	for i := 0; i < 26; i++ {
		child := t.children[i]
		if child == nil {
			continue
		}
		*buf = append(*buf, byte('a'+i))
		child.collect(buf, words)
		*buf = (*buf)[:len(*buf)-1]
	}
}
