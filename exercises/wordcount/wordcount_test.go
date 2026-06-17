package wordcount

import (
	"reflect"
	"testing"
)

func TestFreqSeq(t *testing.T) {
	items := []int{1, 2, 2, 3, 3, 3, 1}
	want := map[int]int{1: 2, 2: 2, 3: 3}
	if got := FreqSeq(items); !reflect.DeepEqual(got, want) {
		t.Fatalf("Seq = %v, want %v", got, want)
	}
}

// Конкурентная версия обязана дать ту же карту, что последовательная.
func TestFreqConcMatchesSeq(t *testing.T) {
	items := make([]int, 1000)
	for i := range items {
		items[i] = i % 17 // повторяющиеся значения по всем чанкам
	}
	want := FreqSeq(items)
	if got := FreqConc(items); !reflect.DeepEqual(got, want) {
		t.Fatalf("Conc != Seq")
	}
}

func TestFreqEmpty(t *testing.T) {
	if got := FreqConc(nil); len(got) != 0 {
		t.Errorf("Conc(nil) = %v, ожидалось пустую карту", got)
	}
}
