package trie

import "testing"

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
