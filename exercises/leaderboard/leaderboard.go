//go:build !solution

// Package leaderboard — боевой мини-проект: топ-K и лидерборд.
// Теория паттерна — в книге: ../../src/top-k-elements.md
//
//	go test ./leaderboard/                 # твоя реализация
//	go test -tags solution ./leaderboard/  # эталон
//
// Реализуй ДВА подхода и сравни:
//  1. TopK — min-куча размера K (паттерн главы): топ-K значений из потока;
//  2. Leaderboard — то, что реально в проде (модель Redis Sorted Set):
//     именованные участники, обновляемые очки, топ-N и ранг.
package leaderboard

// TopK получает числа потока по одному и в любой момент отдаёт k наибольших из
// полученных. Методы: NewTopK(k) создаёт пустой; Add(x) добавляет число; Top()
// возвращает k наибольших по убыванию (меньше k, если чисел пришло меньше; пусто при
// k ≤ 0). Хранить весь поток нельзя: он длиннее памяти.
//
// Пример: k = 2; Add(5); Add(1); Add(8); Top() = [8 5].
//
// Ограничения: k ≤ 10⁴, до 10⁶ вызовов Add.
//
// Ожидаемая сложность: O(log k) на Add и O(k) памяти — min-куча размера k, корень —
// наименьшее в топе, новое число больше корня заменяет его.
//
// Шаблон: top-k-elements
//
// Признак: нужны k лучших из потока, а помнить разрешено только их самих.
type TopK struct {
	k int
	// TODO: min-куча (например, container/heap) с не более чем k элементами.
}

func NewTopK(k int) *TopK { return &TopK{k: k} }

// Add добавляет значение потока: если в куче меньше k — кладём; иначе, если x
// больше корня (наименьшего в топе), заменяем корень и просеиваем.
func (t *TopK) Add(x int) {
	panic("TODO: реализуй Add")
}

// Top возвращает текущие K наибольших значений по убыванию.
func (t *TopK) Top() []int {
	panic("TODO: реализуй Top")
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
	panic("TODO: реализуй Set")
}

// Incr прибавляет delta к очкам участника (ZINCRBY) и возвращает новое значение.
func (l *Leaderboard) Incr(member string, delta int) int {
	panic("TODO: реализуй Incr")
}

// Score возвращает очки участника (ZSCORE); ok=false, если его нет.
func (l *Leaderboard) Score(member string) (int, bool) {
	panic("TODO: реализуй Score")
}

// TopN возвращает первых n участников по убыванию очков (ZREVRANGE).
// Тай-брейк: при равных очках — по имени лексикографически по возрастанию.
func (l *Leaderboard) TopN(n int) []string {
	panic("TODO: реализуй TopN")
}

// Rank возвращает 0-based позицию участника сверху (ZREVRANK); -1, если его нет.
func (l *Leaderboard) Rank(member string) int {
	panic("TODO: реализуй Rank")
}
