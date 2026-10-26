package slidingwindow

import (
	"reflect"
	"testing"
)

func TestMaxSumSubarray(t *testing.T) {
	tests := []struct {
		name string
		arr  []int
		k    int
		want int
	}{
		{"обычный случай", []int{2, 1, 5, 1, 3, 2}, 3, 9},
		{"растущий массив", []int{1, 2, 3, 4, 5, 6}, 3, 15},
		{"k равно длине", []int{1, 2, 3}, 3, 6},
		{"k больше длины", []int{1, 2}, 5, 0},
		{"k нулевой", []int{1, 2, 3}, 0, 0},
		{"отрицательные числа", []int{-1, -2, -3, -4}, 2, -3},
		{"пустой массив", []int{}, 3, 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := MaxSumSubarray(tt.arr, tt.k); got != tt.want {
				t.Errorf("MaxSumSubarray(%v, %d) = %d, ожидалось %d", tt.arr, tt.k, got, tt.want)
			}
		})
	}
}

func TestLongestSubstringKDistinct(t *testing.T) {
	tests := []struct {
		name string
		s    string
		k    int
		want int
	}{
		{"два различных", "araaci", 2, 4},
		{"один различный", "araaci", 1, 2},
		{"три различных", "cbbebi", 3, 5},
		{"вся строка подходит", "abc", 5, 3},
		{"пустая строка", "", 2, 0},
		{"k нулевой", "abc", 0, 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := LongestSubstringKDistinct(tt.s, tt.k); got != tt.want {
				t.Errorf("LongestSubstringKDistinct(%q, %d) = %d, ожидалось %d", tt.s, tt.k, got, tt.want)
			}
		})
	}
}

func TestSmallestSubarrayWithSum(t *testing.T) {
	tests := []struct {
		name   string
		arr    []int
		target int
		want   int
	}{
		{"окно из двух элементов", []int{2, 1, 5, 2, 3, 2}, 7, 2},
		{"окно из трёх элементов", []int{2, 1, 5, 2, 3, 2}, 8, 3},
		{"вся сумма не достигает target", []int{1, 1, 1}, 10, 0},
		{"одного элемента достаточно", []int{1, 4, 4}, 4, 1},
		{"вся строка ровно равна target", []int{1, 2, 3, 4}, 10, 4},
		{"пустой массив", []int{}, 5, 0},
		{"последний элемент покрывает", []int{1, 1, 1, 100}, 100, 1},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := SmallestSubarrayWithSum(tt.arr, tt.target); got != tt.want {
				t.Errorf("SmallestSubarrayWithSum(%v, %d) = %d, ожидалось %d", tt.arr, tt.target, got, tt.want)
			}
		})
	}
}

func TestLongestSubstringNoRepeat(t *testing.T) {
	tests := []struct {
		name string
		s    string
		want int
	}{
		{"abcabcbb", "abcabcbb", 3},
		{"все одинаковые", "bbbbb", 1},
		{"пустая строка", "", 0},
		{"pwwkew", "pwwkew", 3},
		{"один символ", "a", 1},
		{"вся строка уникальна", "abcdef", 6},
		{"повтор через окно", "abba", 2},
		{"пробелы и цифры", "a1 a1 ", 3},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := LongestSubstringNoRepeat(tt.s); got != tt.want {
				t.Errorf("LongestSubstringNoRepeat(%q) = %d, ожидалось %d", tt.s, got, tt.want)
			}
		})
	}
}

func TestMaxSlidingWindow(t *testing.T) {
	tests := []struct {
		name string
		arr  []int
		k    int
		want []int
	}{
		{"обычный случай", []int{1, 3, -1, -3, 5, 3, 6, 7}, 3, []int{3, 3, 5, 5, 6, 7}},
		{"окно равно длине", []int{2, 1, 5}, 3, []int{5}},
		{"окно из одного элемента", []int{4, 2, 12, 11}, 1, []int{4, 2, 12, 11}},
		{"убывающий массив", []int{5, 4, 3, 2, 1}, 2, []int{5, 4, 3, 2}},
		{"растущий массив", []int{1, 2, 3, 4}, 2, []int{2, 3, 4}},
		{"k больше длины", []int{1, 2}, 5, []int{}},
		{"k нулевой", []int{1, 2, 3}, 0, []int{}},
		{"пустой массив", []int{}, 3, []int{}},
		{"одинаковые элементы", []int{7, 7, 7}, 2, []int{7, 7}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := MaxSlidingWindow(tt.arr, tt.k); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("MaxSlidingWindow(%v, %d) = %v, ожидалось %v", tt.arr, tt.k, got, tt.want)
			}
		})
	}
}

func TestCharacterReplacement(t *testing.T) {
	tests := []struct {
		name string
		s    string
		k    int
		want int
	}{
		{"пример: одна замена", "AABABBA", 1, 4},
		{"замен хватает на всю строку", "ABAB", 2, 4},
		{"без замен — самый длинный повтор", "AABBBA", 0, 3},
		{"одна буква", "A", 0, 1},
		{"пустая строка", "", 3, 0},
		{"все разные", "ABCDE", 1, 2},
		{"k больше нужного", "ABC", 3, 3},
		{"самая частая буква окна меняется", "BAAAB", 2, 5},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := CharacterReplacement(tt.s, tt.k); got != tt.want {
				t.Errorf("CharacterReplacement(%q, %d) = %d, ожидалось %d", tt.s, tt.k, got, tt.want)
			}
		})
	}
}

func TestCheckInclusion(t *testing.T) {
	tests := []struct {
		name   string
		s1, s2 string
		want   bool
	}{
		{"перестановка в середине", "ab", "eidbaooo", true},
		{"буквы есть, но не подряд", "ab", "eidboaoo", false},
		{"в самом начале", "abc", "cbaxyz", true},
		{"в самом конце", "abc", "xyzbca", true},
		{"образец длиннее строки", "abcd", "abc", false},
		{"кратность букв важна", "aab", "abbab", false},
		{"кратность совпала", "aab", "xaba", true},
		{"строки равны", "abc", "abc", true},
		{"пустой образец", "", "abc", true},
		{"пустая строка", "a", "", false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := CheckInclusion(tt.s1, tt.s2); got != tt.want {
				t.Errorf("CheckInclusion(%q, %q) = %v, ожидалось %v", tt.s1, tt.s2, got, tt.want)
			}
		})
	}
}

func TestLongestOnes(t *testing.T) {
	tests := []struct {
		name string
		nums []int
		k    int
		want int
	}{
		{"пример", []int{1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0}, 2, 6},
		{"пример побольше", []int{0, 0, 1, 1, 0, 0, 1, 1, 1, 0, 1, 1, 0, 0, 0, 1, 1, 1, 1}, 3, 10},
		{"одни нули, k=0", []int{0, 0, 0}, 0, 0},
		{"одни нули, k=2", []int{0, 0, 0}, 2, 2},
		{"одни единицы", []int{1, 1, 1, 1}, 0, 4},
		{"k покрывает все нули", []int{0, 1, 0, 1}, 2, 4},
		{"пустой массив", []int{}, 1, 0},
		{"один ноль", []int{0}, 1, 1},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := LongestOnes(tt.nums, tt.k); got != tt.want {
				t.Errorf("LongestOnes(%v, %d) = %d, ожидалось %d", tt.nums, tt.k, got, tt.want)
			}
		})
	}
}

func TestNumSubarrayProductLessThanK(t *testing.T) {
	tests := []struct {
		name string
		nums []int
		k    int
		want int
	}{
		{"пример", []int{10, 5, 2, 6}, 100, 8},
		{"k=0 — ни одного", []int{1, 2, 3}, 0, 0},
		{"k=1 — ни одного: произведение ≥ 1", []int{1, 1, 1}, 1, 0},
		{"одни единицы, k=2 — все подмассивы", []int{1, 1, 1}, 2, 6},
		{"ни один элемент не меньше k", []int{5, 6, 7}, 5, 0},
		{"произведение равно k не считается", []int{2, 5}, 10, 2},
		{"пустой массив", []int{}, 10, 0},
		{"один элемент", []int{3}, 4, 1},
		{"большой элемент посередине", []int{1, 2, 1000, 1, 2}, 10, 6},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := NumSubarrayProductLessThanK(tt.nums, tt.k); got != tt.want {
				t.Errorf("NumSubarrayProductLessThanK(%v, %d) = %d, ожидалось %d", tt.nums, tt.k, got, tt.want)
			}
		})
	}
}

func TestSubarraysWithKDistinct(t *testing.T) {
	tests := []struct {
		name string
		nums []int
		k    int
		want int
	}{
		{"пример", []int{1, 2, 1, 2, 3}, 2, 7},
		{"пример с k=3", []int{1, 2, 1, 3, 4}, 3, 3},
		{"k=1 — куски из одинаковых", []int{1, 1, 2, 2, 2}, 1, 9},
		{"все одинаковые, k=2 — ни одного", []int{3, 3, 3}, 2, 0},
		{"k больше числа различных", []int{1, 2, 3}, 4, 0},
		{"k равно числу различных", []int{1, 2, 3}, 3, 1},
		{"один элемент", []int{5}, 1, 1},
		{"пустой массив", []int{}, 1, 0},
		{"повторы внутри куска", []int{1, 2, 1, 1, 2}, 2, 9},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := SubarraysWithKDistinct(tt.nums, tt.k); got != tt.want {
				t.Errorf("SubarraysWithKDistinct(%v, %d) = %d, ожидалось %d", tt.nums, tt.k, got, tt.want)
			}
		})
	}
}

func TestFindAnagrams(t *testing.T) {
	tests := []struct {
		name string
		s, p string
		want []int
	}{
		{"пример", "cbaebabacd", "abc", []int{0, 6}},
		{"перекрываются", "abab", "ab", []int{0, 1, 2}},
		{"нет ни одной", "abcdef", "xy", nil},
		{"образец длиннее строки", "ab", "abc", nil},
		{"кратность букв важна", "abbab", "aab", nil},
		{"кратность совпала", "aabaa", "aab", []int{0, 1, 2}},
		{"строки равны", "abc", "bca", []int{0}},
		{"в самом конце", "xxxcab", "abc", []int{3}},
		{"одна буква", "aaa", "a", []int{0, 1, 2}},
		{"пустая строка", "", "a", nil},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := FindAnagrams(tt.s, tt.p)
			if len(got) != len(tt.want) || (len(got) > 0 && !reflect.DeepEqual(got, tt.want)) {
				t.Errorf("FindAnagrams(%q, %q) = %v, ожидалось %v", tt.s, tt.p, got, tt.want)
			}
		})
	}
}
