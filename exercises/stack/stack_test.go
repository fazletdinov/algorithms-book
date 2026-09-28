package stack

import (
	"reflect"
	"testing"
)

func TestIsValidBrackets(t *testing.T) {
	tests := []struct {
		name string
		s    string
		want bool
	}{
		{"вложенные трёх видов", "{[()]}", true},
		{"подряд", "()[]{}", true},
		{"перекрёст", "([)]", false},
		{"лишняя закрывающая", "())", false},
		{"незакрытая в конце", "f(a[1]) {", false},
		{"закрывающая первой", ")(", false},
		{"другие символы игнорируются", "if (x[i] > 0) { y() }", true},
		{"вид не совпал", "(]", false},
		{"пустая строка", "", true},
		{"без скобок", "abc", true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := IsValidBrackets(tt.s); got != tt.want {
				t.Errorf("IsValidBrackets(%q) = %v, ожидалось %v", tt.s, got, tt.want)
			}
		})
	}
}

func TestDecodeString(t *testing.T) {
	tests := []struct {
		name string
		s    string
		want string
	}{
		{"два блока подряд", "3[a]2[bc]", "aaabcbc"},
		{"вложенность", "3[a2[c]]", "accaccacc"},
		{"буквы вне скобок", "2[ab]cd", "ababcd"},
		{"многозначное число", "10[x]", "xxxxxxxxxx"},
		{"префикс перед вложенными", "ab2[c3[d]]e", "abcdddcddde"},
		{"повтор 1", "1[abc]", "abc"},
		{"без скобок", "plain", "plain"},
		{"пустая строка", "", ""},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := DecodeString(tt.s); got != tt.want {
				t.Errorf("DecodeString(%q) = %q, ожидалось %q", tt.s, got, tt.want)
			}
		})
	}
}

func TestNextGreaterCircular(t *testing.T) {
	tests := []struct {
		name string
		nums []int
		want []int
	}{
		{"пример из условия", []int{1, 2, 1}, []int{2, -1, 2}},
		{"убывающий — ответ через конец", []int{5, 4, 3, 2, 1}, []int{-1, 5, 5, 5, 5}},
		{"возрастающий", []int{1, 2, 3, 4}, []int{2, 3, 4, -1}},
		{"равные — строго больший не найден", []int{3, 3, 3}, []int{-1, -1, -1}},
		{"максимум в середине", []int{1, 5, 3, 4}, []int{5, -1, 4, 5}},
		{"один элемент", []int{7}, []int{-1}},
		{"пустой вход", []int{}, []int{}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := NextGreaterCircular(tt.nums); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("NextGreaterCircular(%v) = %v, ожидалось %v", tt.nums, got, tt.want)
			}
		})
	}
}

func TestStockSpans(t *testing.T) {
	tests := []struct {
		name   string
		prices []int
		want   []int
	}{
		{"пример из условия", []int{100, 80, 60, 70, 60, 75, 85}, []int{1, 1, 1, 2, 1, 4, 6}},
		{"равные цены входят в span", []int{5, 5, 5}, []int{1, 2, 3}},
		{"растущие", []int{1, 2, 3}, []int{1, 2, 3}},
		{"падающие", []int{3, 2, 1}, []int{1, 1, 1}},
		{"один день", []int{42}, []int{1}},
		{"пустой вход", []int{}, []int{}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := StockSpans(tt.prices); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("StockSpans(%v) = %v, ожидалось %v", tt.prices, got, tt.want)
			}
		})
	}
}

func TestLargestRectangle(t *testing.T) {
	tests := []struct {
		name    string
		heights []int
		want    int
	}{
		{"пример из условия", []int{2, 1, 5, 6, 2, 3}, 10},
		{"два столбика", []int{2, 4}, 4},
		{"низкий, но широкий", []int{2, 1, 2}, 3},
		{"равные высоты", []int{3, 3, 3, 3}, 12},
		{"возрастающие — выталкивает только конец", []int{1, 2, 3, 4, 5}, 9},
		{"убывающие", []int{5, 4, 3, 2, 1}, 9},
		{"нулевой столбик разрывает", []int{4, 0, 4}, 4},
		{"пустая гистограмма", []int{}, 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := LargestRectangle(tt.heights); got != tt.want {
				t.Errorf("LargestRectangle(%v) = %d, ожидалось %d", tt.heights, got, tt.want)
			}
		})
	}
}

func TestSumSubarrayMins(t *testing.T) {
	tests := []struct {
		name string
		arr  []int
		want int
	}{
		{"пример из условия", []int{3, 1, 2, 4}, 17},
		// Ловит симметричное правило ничьей в решении с двумя проходами (границы
		// слева и справа — отдельно): «строго меньший» с обеих сторон считает
		// подмассив [1,1] дважды, «меньший или равный» с обеих — ни разу.
		{"равные минимумы", []int{1, 1}, 3},
		{"все равны", []int{2, 2, 2}, 12},
		{"классика LeetCode 907", []int{11, 81, 94, 43, 3}, 444},
		{"один элемент", []int{5}, 5},
		{"пустой вход", []int{}, 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := SumSubarrayMins(tt.arr); got != tt.want {
				t.Errorf("SumSubarrayMins(%v) = %d, ожидалось %d", tt.arr, got, tt.want)
			}
		})
	}
}

func TestRemoveKDigits(t *testing.T) {
	tests := []struct {
		name string
		num  string
		k    int
		want string
	}{
		{"пример из условия", "1432219", 3, "1219"},
		{"ведущие нули убираются", "10200", 1, "200"},
		{"удалить всё", "10", 2, "0"},
		{"неубывающее — режем хвост", "12345", 2, "123"},
		{"невозрастающее — режем голову", "54321", 2, "321"},
		{"k = 0", "9", 0, "9"},
		{"равные цифры", "1111", 2, "11"},
		{"одни нули после удаления", "100", 1, "0"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := RemoveKDigits(tt.num, tt.k); got != tt.want {
				t.Errorf("RemoveKDigits(%q, %d) = %q, ожидалось %q", tt.num, tt.k, got, tt.want)
			}
		})
	}
}
