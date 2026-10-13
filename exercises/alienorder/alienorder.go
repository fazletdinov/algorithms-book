//go:build !solution

// Package alienorder — Alien Dictionary: граф из строк + топологическая сортировка.
// Разбор — в книге: ../../src/pattern-combinations.md (раздел «Alien Dictionary»).
//
//	go test ./alienorder/                 # твои решения
//	go test -tags solution ./alienorder/  # эталон
//
// Реализуй AlienOrder: по списку слов, отсортированному по правилам неизвестного
// алфавита, восстанови порядок букв. Если порядок невозможен (цикл или
// префиксный конфликт вида "abc" перед "ab") — верни "".
package alienorder

// AlienOrder восстанавливает порядок букв алфавита или "" при противоречии.
func AlienOrder(words []string) string {
	// TODO: 1) собери все буквы как вершины; 2) для каждой пары соседних слов
	// найди первую различающуюся букву a[j]!=b[j] — это ребро a[j]->b[j]
	// (учти префиксный конфликт); 3) топосорт Кана; если вышли не все буквы — "".
	panic("TODO: реализуй AlienOrder")
}
