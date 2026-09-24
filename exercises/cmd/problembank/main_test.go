package main

import "testing"

func TestOwnerOf(t *testing.T) {
	tests := []struct {
		test  string
		funcs []string
		want  string
	}{
		{"TestCoinChange", []string{"CoinChange", "ClimbStairs"}, "CoinChange"},
		{"TestCoinChangeRandom", []string{"CoinChange"}, "CoinChange"},
		{"TestSum_Empty", []string{"Sum"}, "Sum"},
		{"TestLIS2", []string{"LIS"}, "LIS"},
		// Четыре реальные коллизии банка: спорный тест уходит самому длинному имени.
		{"TestSubsetsWithDup", []string{"Subsets", "SubsetsWithDup"}, "SubsetsWithDup"},
		{"TestSubsetsWithDupRandom", []string{"Subsets", "SubsetsWithDup"}, "SubsetsWithDup"},
		{"TestShortestPathWithAtMostKEdges", []string{"ShortestPath", "ShortestPathWithAtMostKEdges"}, "ShortestPathWithAtMostKEdges"},
		{"TestMSTWeightPrim", []string{"MSTWeight", "MSTWeightPrim"}, "MSTWeightPrim"},
		{"TestBFSLevelsConcLocalMatchesSeq", []string{"BFSLevelsConc", "BFSLevelsConcLocal"}, "BFSLevelsConcLocal"},
		// Продолжение со строчной буквы — это другое слово, а не вариант функции.
		{"TestFoo", []string{"Fo"}, ""},
		{"TestSortedness", []string{"Sort"}, ""},
		// Тест, не похожий ни на одну функцию, не достаётся никому.
		{"TestRandomAgainstNaive", []string{"CoinChange"}, ""},
	}
	for _, tt := range tests {
		if got := ownerOf(tt.test, tt.funcs); got != tt.want {
			t.Errorf("ownerOf(%q, %v) = %q, ожидалось %q", tt.test, tt.funcs, got, tt.want)
		}
	}
}
