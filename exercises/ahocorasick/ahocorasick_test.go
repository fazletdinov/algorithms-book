package ahocorasick

import (
	"slices"
	"testing"
)

func TestAutomatonFindAll(t *testing.T) {
	tests := []struct {
		name     string
		patterns []string
		text     string
		want     []Match
	}{
		{
			// Пример из статьи Ахо и Корасик (1975): «he» спрятано внутри «she»,
			// а «hers» начинается там же, где «he». Без словарных ссылок теряется «he».
			name:     "классика: ushers",
			patterns: []string{"he", "she", "his", "hers"},
			text:     "ushers",
			want:     []Match{{1, 1}, {0, 2}, {3, 2}},
		},
		{
			name:     "перекрывающиеся вхождения",
			patterns: []string{"aa"},
			text:     "aaaa",
			want:     []Match{{0, 0}, {0, 1}, {0, 2}},
		},
		{
			name:     "шаблон — префикс и суффикс другого",
			patterns: []string{"a", "ab", "bab"},
			text:     "abab",
			want:     []Match{{0, 0}, {1, 0}, {2, 1}, {0, 2}, {1, 2}},
		},
		{
			// Прочитано «ab», ждём «c», приходит «d». Автомат обязан откатиться по
			// fail из «ab» в «b» и найти «bd», начавшееся внутри уже прочитанного.
			name:     "откат по ссылке неудачи",
			patterns: []string{"abc", "bd"},
			text:     "abd",
			want:     []Match{{1, 1}},
		},
		{
			// Автомат стоит в узле «abc» — своего шаблона там нет, «abcd» не
			// дочитан. «bc» виден ТОЛЬКО по словарной ссылке abc → bc.
			name:     "вхождение видно только по словарной ссылке",
			patterns: []string{"abcd", "bc"},
			text:     "abcx",
			want:     []Match{{1, 1}},
		},
		{name: "нет вхождений", patterns: []string{"xyz"}, text: "abc", want: nil},
		{name: "пустой текст", patterns: []string{"a"}, text: "", want: nil},
		{name: "нет шаблонов", patterns: nil, text: "abc", want: nil},
		{name: "одинаковые шаблоны — оба номера", patterns: []string{"x", "x"}, text: "x", want: []Match{{0, 0}, {1, 0}}},
		{name: "пустой шаблон пропускается", patterns: []string{"", "b"}, text: "ab", want: []Match{{1, 1}}},
		{
			// Смещения байтовые: «здравствуй, » — 10 кириллических букв по 2 байта + 2 байта.
			name:     "кириллица: байтовое смещение",
			patterns: []string{"мир"},
			text:     "здравствуй, мир",
			want:     []Match{{0, 22}},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := NewAutomaton(tt.patterns).FindAll(tt.text)
			if len(got) != len(tt.want) || (len(got) > 0 && !slices.Equal(got, tt.want)) {
				t.Errorf("FindAll(%q) по шаблонам %q = %v, ожидалось %v", tt.text, tt.patterns, got, tt.want)
			}
		})
	}
}

func TestAutomatonContainsAny(t *testing.T) {
	tests := []struct {
		name     string
		patterns []string
		text     string
		want     bool
	}{
		{"есть вхождение", []string{"spam", "scam"}, "this is a scam offer", true},
		{"нет вхождений", []string{"spam", "scam"}, "hello world", false},
		{"вложенное вхождение", []string{"she", "he"}, "they", true},
		{"только по словарной ссылке", []string{"abcd", "bc"}, "abcx", true},
		{"пустой текст", []string{"a"}, "", false},
		{"только пустой шаблон", []string{""}, "abc", false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := NewAutomaton(tt.patterns).ContainsAny(tt.text); got != tt.want {
				t.Errorf("ContainsAny(%q) = %v, ожидалось %v", tt.text, got, tt.want)
			}
		})
	}
}

func TestCensor(t *testing.T) {
	tests := []struct {
		name   string
		text   string
		banned []string
		want   string
	}{
		{"одно слово", "you are a fool", []string{"fool"}, "you are a ****"},
		{"перекрывающиеся слова закрывают всё", "abcd", []string{"abc", "bcd"}, "****"},
		// Кириллица: звёздочка на СИМВОЛ, а не на байт.
		{"кириллица — по символам", "ты дурак", []string{"дурак"}, "ты *****"},
		// Scunthorpe problem: подстрока внутри невинного слова тоже закрывается.
		// Это свойство поиска подстрок, а не ошибка реализации, — глава об этом.
		{"слово внутри слова", "classic", []string{"ass"}, "cl***ic"},
		{"запретов нет", "hello", nil, "hello"},
		{"ничего не нашлось", "hello", []string{"bye"}, "hello"},
		{"невалидный UTF-8 вне вхождений остаётся байт в байт", "a\xffb", []string{"b"}, "a\xff*"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := Censor(tt.text, tt.banned); got != tt.want {
				t.Errorf("Censor(%q, %q) = %q, ожидалось %q", tt.text, tt.banned, got, tt.want)
			}
		})
	}
}
