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

// Delete удаляет слово из дерева и возвращает true, если оно там было
// (иначе false и дерево не меняется). После удаления Search(word) вернёт
// false, но другие слова и общие префиксы сохраняются.
//
// Пример: вставить "app" и "apple"; Delete("app") -> true, после чего
// Search("app") -> false, Search("apple") -> true, StartsWith("app") -> true.
//
// Ожидаемая сложность: O(L) по времени, где L — длина слова.
func (t *Trie) Delete(word string) bool {
	// TODO: пройдите путь слова; если конца нет — верните false. Снимите isEnd
	// и обрежьте узлы, у которых не осталось детей и которые не являются концом
	// другого слова (не трогая узлы, нужные другим словам).
	panic("TODO: реализуйте Delete")
}

// WordsWithPrefix возвращает все вставленные слова с данным префиксом,
// отсортированные по возрастанию. Если таких слов нет, возвращает пустой
// (не nil) срез.
//
// Пример: вставить "app", "apple", "apricot", "banana";
// WordsWithPrefix("ap") -> ["app", "apple", "apricot"];
// WordsWithPrefix("z") -> []string{}.
//
// Ожидаемая сложность: O(P + K) по времени, где P — длина префикса, а K —
// суммарная длина символов в найденных словах (порядок обхода даёт сортировку).
func (t *Trie) WordsWithPrefix(prefix string) []string {
	// TODO: дойдите до узла префикса; если его нет — верните []string{}.
	// Затем DFS, перебирая детей в порядке 'a'..'z' (это даёт лексикографический
	// порядок), накапливая слово в буфере и собирая его при isEnd.
	panic("TODO: реализуйте WordsWithPrefix")
}
