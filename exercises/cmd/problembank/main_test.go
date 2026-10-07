package main

import "testing"

func TestNeutral(t *testing.T) {
	tests := []struct {
		name, text, fn, want string
	}{
		{"имя в начале становится словом", "SieveOfEratosthenes возвращает простые до n.", "SieveOfEratosthenes",
			"Функция возвращает простые до n."},
		{"имя в примере становится f", "Binomial возвращает C(n, k).\nПример: Binomial(5, 2) = 10; Binomial(5, 7) = 0.", "Binomial",
			"Функция возвращает C(n, k).\nПример: f(5, 2) = 10; f(5, 7) = 0."},
		// Имя внутри другого идентификатора — не имя функции: ShortestPath не трогает
		// ShortestPathWithAtMostKEdges.
		{"чужой идентификатор не трогаем", "ShortestPath ищет путь, как ShortestPathWithAtMostKEdges.", "ShortestPath",
			"Функция ищет путь, как ShortestPathWithAtMostKEdges."},
		{"без имени в начале", "Возвращает n-е число: Fib(1)=1.", "Fib", "Возвращает n-е число: f(1)=1."},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := neutral(tt.text, tt.fn); got != tt.want {
				t.Errorf("neutral() = %q, ожидалось %q", got, tt.want)
			}
		})
	}
}

func TestDedupe(t *testing.T) {
	ps := []problem{
		{Pkg: "cryptography", Fn: "ModExp", Text: "Функция возвращает base^exp mod m."},
		{Pkg: "graphs", Fn: "BFS", Text: "Функция обходит граф."},
		{Pkg: "numbertheory", Fn: "PowMod", Text: "Функция возвращает base^exp mod m."},
	}
	got, dups := dedupe(ps)
	if len(got) != 2 || got[0].Fn != "ModExp" || got[1].Fn != "BFS" {
		t.Fatalf("dedupe оставил %+v, ожидались ModExp и BFS в исходном порядке", got)
	}
	if len(dups) != 1 {
		t.Fatalf("dedupe сообщил о %d дублях, ожидался 1: %v", len(dups), dups)
	}
}
