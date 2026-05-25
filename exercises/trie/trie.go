//go:build !solution

// Package trie — префиксное дерево (Trie).
//
//	go test ./trie/                 # ваши решения
//	go test -tags solution ./trie/  # эталон
//
// Реализуйте методы Insert, Search и StartsWith. Считайте, что слова состоят
// только из строчных латинских букв 'a'..'z'.
package trie

// Trie — узел префиксного дерева.
type Trie struct {
	children [26]*Trie
	isEnd    bool
}

// NewTrie создаёт пустое дерево (корень).
func NewTrie() *Trie { return &Trie{} }

// Insert добавляет слово в дерево.
func (t *Trie) Insert(word string) {
	// TODO: идите по символам, создавая недостающие узлы; в конце пометьте isEnd.
	panic("TODO: реализуйте Insert")
}

// Search сообщает, было ли вставлено ровно это слово.
func (t *Trie) Search(word string) bool {
	// TODO: пройдите путь слова; верните true, только если путь есть И в конце isEnd.
	panic("TODO: реализуйте Search")
}

// StartsWith сообщает, есть ли в дереве хотя бы одно слово с таким префиксом.
func (t *Trie) StartsWith(prefix string) bool {
	// TODO: достаточно, чтобы существовал путь префикса.
	panic("TODO: реализуйте StartsWith")
}
