package dsu

import "testing"

func TestUnionFindBasic(t *testing.T) {
	uf := NewUnionFind(6)
	if uf.Count() != 6 {
		t.Fatalf("Count() = %d, ожидалось 6", uf.Count())
	}
	if uf.Connected(0, 1) {
		t.Errorf("0 и 1 не должны быть связаны изначально")
	}

	if !uf.Union(0, 1) {
		t.Errorf("Union(0,1) = false, ожидалось true")
	}
	if !uf.Union(1, 2) {
		t.Errorf("Union(1,2) = false, ожидалось true")
	}
	if uf.Union(0, 2) {
		t.Errorf("Union(0,2) = true, ожидалось false (уже в одном множестве)")
	}
	if !uf.Connected(0, 2) {
		t.Errorf("0 и 2 должны быть связаны через 1")
	}
	if uf.Connected(0, 3) {
		t.Errorf("0 и 3 не должны быть связаны")
	}
	if uf.Count() != 4 {
		t.Errorf("Count() = %d, ожидалось 4 ({0,1,2},{3},{4},{5})", uf.Count())
	}

	uf.Union(3, 4)
	uf.Union(4, 5)
	uf.Union(2, 5)
	if uf.Count() != 1 {
		t.Errorf("Count() = %d, ожидалось 1 (всё связано)", uf.Count())
	}
	if !uf.Connected(0, 5) {
		t.Errorf("после слияния всех 0 и 5 должны быть связаны")
	}
}
