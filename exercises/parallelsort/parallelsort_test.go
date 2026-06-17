package parallelsort

import (
	"reflect"
	"testing"
)

func TestMergeSortSeq(t *testing.T) {
	in := []int{5, 2, 9, 1, 5, 6, 0, -3}
	want := []int{-3, 0, 1, 2, 5, 5, 6, 9}
	got := MergeSortSeq(in)
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("Seq = %v, want %v", got, want)
	}
	// вход не должен меняться
	if !reflect.DeepEqual(in, []int{5, 2, 9, 1, 5, 6, 0, -3}) {
		t.Errorf("Seq изменил входной срез: %v", in)
	}
}

func TestMergeSortConcMatchesSeq(t *testing.T) {
	// длиннее cutoff, чтобы реально включилась конкурентная ветка
	in := make([]int, 5000)
	for i := range in {
		in[i] = (i*7919 + 13) % 1000 // псевдослучайно, но детерминированно
	}
	want := MergeSortSeq(in)
	got := MergeSortConc(in)
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("Conc != Seq (len=%d)", len(in))
	}
}

func TestMergeSortEdge(t *testing.T) {
	for _, in := range [][]int{nil, {}, {42}, {2, 1}} {
		got := MergeSortConc(in)
		want := MergeSortSeq(in)
		if !reflect.DeepEqual(got, want) {
			t.Errorf("Conc(%v) = %v, want %v", in, got, want)
		}
	}
}
