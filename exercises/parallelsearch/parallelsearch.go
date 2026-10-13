//go:build !solution

// Package parallelsearch — подсчёт вхождений подстроки: синхронно и конкурентно.
// Теория — в книге: ../../src/string-algorithms.md (раздел «Конкурентный поиск»).
//
//	go test ./parallelsearch/                        # твои решения (красные)
//	go test -tags solution ./parallelsearch/         # эталон (зелёные)
//	go test -tags solution -race ./parallelsearch/   # проверка на гонки
//
// Считаем число позиций i, где text[i:i+len(pat)] == pat (перекрытия
// разрешены: в "aaaa" подстрока "aa" встречается 3 раза). Конкурентная версия
// делит работу между воркерами ПО НАЧАЛЬНЫМ ПОЗИЦИЯМ — тогда каждое окно
// целиком лежит в text и матч на стыке чанков не теряется и не дублируется.
package parallelsearch

// CountOccurrencesSeq считает вхождения pat в text (с перекрытиями).
func CountOccurrencesSeq(text, pat string) int {
	// TODO: для каждого i от 0 до len(text)-len(pat) сравни text[i:i+m] с pat.
	// Пустой pat или pat длиннее text → 0.
	panic("TODO: реализуй CountOccurrencesSeq")
}

// CountOccurrencesConc — то же, но диапазон начальных позиций делится между
// воркерами; каждый считает свой кусок, результаты суммируются. Обязан совпасть
// с CountOccurrencesSeq и проходить -race.
func CountOccurrencesConc(text, pat string) int {
	// TODO: раздели [0, len(text)-len(pat)] на чанки между горутинами; каждая
	// считает вхождения в своём диапазоне начал и пишет в свою ячейку; в конце
	// просуммируй. Делить ПО НАЧАЛАМ, а не по байтам текста — иначе потеряешь
	// совпадения на границе чанков.
	panic("TODO: реализуй CountOccurrencesConc")
}
