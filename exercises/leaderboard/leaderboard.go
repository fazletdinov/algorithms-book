//go:build !solution

// Package leaderboard — боевой мини-проект: топ-K и лидерборд.
// Теория паттерна — в книге: ../../src/top-k-elements.md
//
//	go test ./leaderboard/                 # ваша реализация
//	go test -tags solution ./leaderboard/  # эталон
//
// Реализуйте ДВА подхода и сравните:
//  1. TopK — min-куча размера K (паттерн главы): топ-K значений из потока;
//  2. Leaderboard — то, что реально в проде (модель Redis Sorted Set):
//     именованные участники, обновляемые очки, топ-N и ранг.
package leaderboard

// TopK держит K наибольших значений потока (min-куча размера K).
type TopK struct {
	k int
	// TODO: min-куча (например, container/heap) с не более чем k элементами.
}

func NewTopK(k int) *TopK { return &TopK{k: k} }

// Add добавляет значение потока: если в куче меньше k — кладём; иначе, если x
// больше корня (наименьшего в топе), заменяем корень и просеиваем.
func (t *TopK) Add(x int) {
	panic("TODO: реализуйте Add")
}

// Top возвращает текущие K наибольших значений по убыванию.
func (t *TopK) Top() []int {
	panic("TODO: реализуйте Top")
}

// Leaderboard — упорядоченный набор участников с очками (модель Redis ZSET).
type Leaderboard struct {
	score map[string]int
	// TODO: при желании — вспомогательная упорядоченная структура для быстрого
	// топ-N/ранга; в учебной версии порядок можно считать при запросе.
}

func NewLeaderboard() *Leaderboard { return &Leaderboard{score: make(map[string]int)} }

// Set задаёт очки участнику (ZADD).
func (l *Leaderboard) Set(member string, score int) {
	panic("TODO: реализуйте Set")
}

// Incr прибавляет delta к очкам участника (ZINCRBY) и возвращает новое значение.
func (l *Leaderboard) Incr(member string, delta int) int {
	panic("TODO: реализуйте Incr")
}

// Score возвращает очки участника (ZSCORE); ok=false, если его нет.
func (l *Leaderboard) Score(member string) (int, bool) {
	panic("TODO: реализуйте Score")
}

// TopN возвращает первых n участников по убыванию очков (ZREVRANGE).
// Тай-брейк: при равных очках — по имени лексикографически по возрастанию.
func (l *Leaderboard) TopN(n int) []string {
	panic("TODO: реализуйте TopN")
}

// Rank возвращает 0-based позицию участника сверху (ZREVRANK); -1, если его нет.
func (l *Leaderboard) Rank(member string) int {
	panic("TODO: реализуйте Rank")
}
