package codereview

import (
	"testing"
)

// ── SumSquaresConcurrent ─────────────────────────────────────────────────

func TestSumSquaresConcurrent(t *testing.T) {
	// 101 — простое число: ни при каком workers > 1 не делится нацело, поэтому
	// целочисленное усечение chunk := len(nums)/workers ВСЕГДА теряет хвост в
	// заготовке — это не гонка, воспроизводится каждый раз без -race.
	nums := make([]int, 101)
	var want int64
	for i := range nums {
		nums[i] = i + 1
		want += int64(nums[i]) * int64(nums[i])
	}
	for _, workers := range []int{1, 2, 3, 4, 7} {
		got := SumSquaresConcurrent(nums, workers)
		if got != want {
			t.Errorf("workers=%d: SumSquaresConcurrent() = %d, want %d", workers, got, want)
		}
	}
}

// TestSumSquaresConcurrentRace не проверяет ответ — только то, что доступ к
// разделяемому состоянию безопасен. Гонка не всегда портит результат (это и
// есть коварство гонок), поэтому её ищет не сравнение чисел, а
//
//	go test -race ./codereview/
func TestSumSquaresConcurrentRace(t *testing.T) {
	nums := make([]int, 500)
	for i := range nums {
		nums[i] = i
	}
	for range 20 {
		SumSquaresConcurrent(nums, 8)
	}
}

// ── HasDuplicate ─────────────────────────────────────────────────────────

func TestHasDuplicateCorrectness(t *testing.T) {
	tests := []struct {
		name string
		nums []int
		want bool
	}{
		{"пусто", nil, false},
		{"один элемент", []int{1}, false},
		{"без повторов", []int{1, 2, 3, 4}, false},
		{"повтор в конце", []int{1, 2, 3, 1}, true},
		{"повтор соседних", []int{5, 5}, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := HasDuplicate(tt.nums); got != tt.want {
				t.Errorf("HasDuplicate(%v) = %v, want %v", tt.nums, got, tt.want)
			}
		})
	}
}

// ── ParseAndSum ──────────────────────────────────────────────────────────

func TestParseAndSum(t *testing.T) {
	t.Run("все валидны", func(t *testing.T) {
		sum, err := ParseAndSum([]string{"1", "2", "3"})
		if err != nil {
			t.Fatalf("ParseAndSum() error = %v, want nil", err)
		}
		if sum != 6 {
			t.Fatalf("ParseAndSum() = %d, want 6", sum)
		}
	})
	t.Run("одна строка не парсится — обязана вернуть ошибку", func(t *testing.T) {
		_, err := ParseAndSum([]string{"1", "abc", "3"})
		if err == nil {
			t.Fatal("ParseAndSum() error = nil, want non-nil — некорректный вход не должен молча пропадать")
		}
	})
	t.Run("пустой срез — не ошибка, сумма 0", func(t *testing.T) {
		sum, err := ParseAndSum(nil)
		if err != nil || sum != 0 {
			t.Fatalf("ParseAndSum(nil) = %d, %v, want 0, nil", sum, err)
		}
	})
}
