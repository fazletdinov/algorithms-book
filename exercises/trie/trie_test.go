package trie

import (
	"reflect"
	"testing"
)

func TestTrie(t *testing.T) {
	tr := NewTrie()
	tr.Insert("apple")

	checks := []struct {
		op   string
		arg  string
		want bool
	}{
		{"search", "apple", true},
		{"search", "app", false}, // "app" не вставляли как слово
		{"prefix", "app", true},  // но это префикс "apple"
		{"prefix", "appl", true},
		{"search", "banana", false},
		{"prefix", "b", false},
	}
	run := func(op, arg string) bool {
		switch op {
		case "search":
			return tr.Search(arg)
		default:
			return tr.StartsWith(arg)
		}
	}
	for _, c := range checks {
		if got := run(c.op, c.arg); got != c.want {
			t.Errorf("%s(%q) = %v, ожидалось %v", c.op, c.arg, got, c.want)
		}
	}

	// после вставки "app" оно становится полноценным словом
	tr.Insert("app")
	if !tr.Search("app") {
		t.Errorf("после Insert(\"app\") Search(\"app\") должно быть true")
	}
	if !tr.Search("apple") {
		t.Errorf("Search(\"apple\") всё ещё должно быть true")
	}
}

func TestTrieDelete(t *testing.T) {
	tr := NewTrie()
	tr.Insert("app")
	tr.Insert("apple")

	if !tr.Delete("app") {
		t.Fatalf("Delete(\"app\") = false, ожидалось true (слово было вставлено)")
	}
	if tr.Search("app") {
		t.Errorf("после Delete(\"app\") Search(\"app\") должно быть false")
	}
	if !tr.Search("apple") {
		t.Errorf("после Delete(\"app\") Search(\"apple\") должно остаться true")
	}
	if !tr.StartsWith("app") {
		t.Errorf("после Delete(\"app\") StartsWith(\"app\") должно остаться true")
	}

	if tr.Delete("app") {
		t.Errorf("повторный Delete(\"app\") = true, ожидалось false (слова уже нет)")
	}
	if tr.Delete("banana") {
		t.Errorf("Delete(\"banana\") = true, ожидалось false (слова не было)")
	}

	// Удаление слова без общих хвостов чистит висячие узлы.
	tr.Insert("dog")
	if !tr.Delete("dog") {
		t.Fatalf("Delete(\"dog\") = false, ожидалось true")
	}
	if tr.StartsWith("d") {
		t.Errorf("после Delete(\"dog\") StartsWith(\"d\") должно быть false")
	}
}

func TestTrieWordsWithPrefix(t *testing.T) {
	tr := NewTrie()
	for _, w := range []string{"app", "apple", "apricot", "banana"} {
		tr.Insert(w)
	}

	cases := []struct {
		prefix string
		want   []string
	}{
		{"ap", []string{"app", "apple", "apricot"}},
		{"app", []string{"app", "apple"}},
		{"b", []string{"banana"}},
		{"z", []string{}},
		{"", []string{"app", "apple", "apricot", "banana"}},
	}
	for _, c := range cases {
		got := tr.WordsWithPrefix(c.prefix)
		if !reflect.DeepEqual(got, c.want) {
			t.Errorf("WordsWithPrefix(%q) = %v, ожидалось %v", c.prefix, got, c.want)
		}
	}
}
