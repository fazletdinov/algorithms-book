//go:build !solution

// Package meetingrooms — Meeting Rooms II: сортировка + мин-куча (комбинация).
// Разбор — в книге: ../../src/pattern-combinations.md (раздел «Meeting Rooms II»).
//
//	go test ./meetingrooms/                 # твои решения
//	go test -tags solution ./meetingrooms/  # эталон
//
// Реализуй MinMeetingRooms: минимум переговорок, чтобы встречи [начало, конец]
// не пересеклись по времени. Идея — отсортировать по началу и держать в мин-куче
// времена окончаний занятых комнат; если самое раннее окончание <= начала текущей
// встречи, комната освободилась — переиспользуем её.
package meetingrooms

// MinMeetingRooms возвращает минимальное число одновременно нужных комнат.
func MinMeetingRooms(intervals [][]int) int {
	// TODO: сортировка по intervals[i][0]; мин-куча концов (container/heap);
	// для каждой встречи: если вершина кучи <= начала — Pop; затем Push(конец).
	// Ответ — размер кучи в конце (пиковое число одновременных встреч).
	panic("TODO: реализуй MinMeetingRooms")
}
