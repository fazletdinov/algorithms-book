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
