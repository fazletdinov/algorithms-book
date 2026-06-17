package parallelbfs

import (
	"reflect"
	"testing"
)

// 0-1, 0-2, 1-3, 2-3, 3-4
func sample() [][]int {
	return [][]int{
		{1, 2},
		{0, 3},
		{0, 3},
		{1, 2, 4},
		{3},
	}
}

func TestBFSLevelsSeq(t *testing.T) {
	want := [][]int{{0}, {1, 2}, {3}, {4}}
	if got := BFSLevelsSeq(sample(), 0); !reflect.DeepEqual(got, want) {
		t.Fatalf("Seq = %v, want %v", got, want)
	}
}

// Конкурентная версия обязана дать ровно тот же результат, что последовательная.
func TestBFSLevelsConcMatchesSeq(t *testing.T) {
	g := sample()
	want := BFSLevelsSeq(g, 0)
	if got := BFSLevelsConc(g, 0); !reflect.DeepEqual(got, want) {
		t.Fatalf("Conc = %v, want (== Seq) %v", got, want)
	}
}

// Масштабируемая версия (atomic + локальные фронты) тоже обязана совпасть с Seq.
func TestBFSLevelsConcLocalMatchesSeq(t *testing.T) {
	g := sample()
	want := BFSLevelsSeq(g, 0)
	if got := BFSLevelsConcLocal(g, 0); !reflect.DeepEqual(got, want) {
		t.Fatalf("ConcLocal = %v, want (== Seq) %v", got, want)
	}
}

func TestBFSEmptyAndBounds(t *testing.T) {
	if got := BFSLevelsSeq(nil, 0); len(got) != 0 {
		t.Errorf("пустой граф Seq = %v, ожидалось []", got)
	}
	if got := BFSLevelsConc([][]int{{}}, 5); len(got) != 0 {
		t.Errorf("старт вне диапазона Conc = %v, ожидалось []", got)
	}
}
