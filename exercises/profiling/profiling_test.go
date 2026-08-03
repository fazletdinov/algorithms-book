package profiling

import "testing"

func TestFormatScoresCorrectness(t *testing.T) {
	tests := []struct {
		name string
		nums []int
		want string
	}{
		{"пусто", nil, ""},
		{"один элемент", []int{7}, "7, "},
		{"несколько", []int{1, 4, 9}, "1, 4, 9, "},
		{"отрицательные", []int{-1, 0, 1}, "-1, 0, 1, "},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := FormatScores(tt.nums); got != tt.want {
				t.Errorf("FormatScores(%v) = %q, want %q", tt.nums, got, tt.want)
			}
		})
	}
}

// TestFormatScoresAllocs — не сравнение ответа (он и так верный), а бюджет
// аллокаций на вызов через testing.AllocsPerRun: ровно то число, которое
// профилировщик показал бы через -memprofile/allocs, но без парсинга pprof
// в тесте. 1000 элементов — заготовка (result += fmt.Sprintf(...)) аллоцирует
// в среднем ~2745 раз за вызов, эталон (strconv.AppendInt в переиспользуемый
// буфер + предварительный strings.Builder.Grow) — ~2 раза. Числа измерены на
// этой машине; margin на порядки в обе стороны от бюджета ниже.
func TestFormatScoresAllocs(t *testing.T) {
	nums := make([]int, 1000)
	for i := range nums {
		nums[i] = i
	}
	const budget = 20 // ~2745 у заготовки, ~2 у эталона — запас на порядки в обе стороны
	avg := testing.AllocsPerRun(20, func() {
		FormatScores(nums)
	})
	if avg > budget {
		t.Fatalf("FormatScores аллоцирует в среднем %.0f раз за вызов на n=%d — бюджет %d."+
			" Профилируй (go test -memprofile=mem.prof -bench=. ./profiling/, затем"+
			" go tool pprof -alloc_objects mem.prof), найди источник и почини.", avg, len(nums), budget)
	}
}

func BenchmarkFormatScores(b *testing.B) {
	nums := make([]int, 2000)
	for i := range nums {
		nums[i] = i
	}
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		FormatScores(nums)
	}
}
